/*
  FintLer — gmail-initial-sync Edge Function (v3 — token storage)
  
  Fetches bank alert emails from Gmail. On first call, receives the
  provider_token and provider_refresh_token from the frontend and
  stores them in the profiles table. On subsequent calls (re-sync),
  uses the stored refresh_token to obtain a fresh access_token.
  
  Schema: profiles (gmail_sync_enabled, gmail_history_id,
          gmail_access_token, gmail_refresh_token, gmail_token_expiry)
  
  Env vars required:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported Indian bank sender domains
const BANK_SENDER_FILTERS = [
  "alerts@hdfcbank.net",
  "notify@icicibank.com",
  "sbmops@sbi.co.in",
  "alerts@axisbank.com",
  "noreply@kotak.com",
  "donotreply@yesbank.in",
  "noreply@indusind.com",
  "alerts@federalbank.co.in",
];

function buildGmailQuery(): string {
  const senderQuery = BANK_SENDER_FILTERS.map((s) => `from:${s}`).join(" OR ");
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
  return `(${senderQuery}) after:${ninetyDaysAgo}`;
}

// Refresh an expired access token using a refresh token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.error("Token refresh failed:", await res.text());
      return null;
    }

    const data = await res.json();
    return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
  } catch (e) {
    console.error("Token refresh error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ----- AUTH -----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Not authenticated." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return jsonRes({ error: "Invalid session." }, 401);

    // ----- RESOLVE GMAIL ACCESS TOKEN -----
    const body = await req.json();
    const providerToken = body?.provider_token;
    const providerRefreshToken = body?.provider_refresh_token;

    let accessToken = providerToken;
    let refreshToken = providerRefreshToken;

    // If no fresh token from frontend, try stored tokens
    if (!accessToken) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("gmail_access_token, gmail_refresh_token, gmail_token_expiry")
        .eq("id", user.id)
        .single();

      if (profile?.gmail_refresh_token) {
        refreshToken = profile.gmail_refresh_token;

        // Check if stored access token is still valid
        const expiry = profile.gmail_token_expiry ? new Date(profile.gmail_token_expiry) : new Date(0);
        if (profile.gmail_access_token && expiry > new Date()) {
          accessToken = profile.gmail_access_token;
        } else {
          // Refresh it
          const refreshed = await refreshAccessToken(profile.gmail_refresh_token);
          if (refreshed) {
            accessToken = refreshed.access_token;
            // Store the new access token
            await supabase.from("profiles").update({
              gmail_access_token: refreshed.access_token,
              gmail_token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            }).eq("id", user.id);
          }
        }
      }
    }

    if (!accessToken) {
      return jsonRes({ error: "No Gmail token available. Please sign out and sign in again to re-authorize." }, 400);
    }

    // ----- STORE TOKENS -----
    // Always persist tokens when we receive fresh ones from the frontend
    if (providerToken) {
      const tokenUpdate: Record<string, any> = {
        gmail_access_token: providerToken,
        gmail_sync_enabled: true,
        gmail_token_expiry: new Date(Date.now() + 3500 * 1000).toISOString(), // ~1 hour
      };
      if (providerRefreshToken) {
        tokenUpdate.gmail_refresh_token = providerRefreshToken;
      }
      await supabase.from("profiles").update(tokenUpdate).eq("id", user.id);
    }

    // ----- FETCH EMAIL LIST FROM GMAIL -----
    const query = buildGmailQuery();
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=200`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errBody = await listRes.text();
      console.error("Gmail list error:", errBody);

      // If 401, the token is invalid — try refresh
      if (listRes.status === 401 && refreshToken) {
        const refreshed = await refreshAccessToken(refreshToken);
        if (refreshed) {
          accessToken = refreshed.access_token;
          await supabase.from("profiles").update({
            gmail_access_token: refreshed.access_token,
            gmail_token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          }).eq("id", user.id);

          // Retry the request
          const retryRes = await fetch(listUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!retryRes.ok) {
            return jsonRes({ error: "Gmail access failed after token refresh.", detail: await retryRes.text() }, 502);
          }
          const retryData = await retryRes.json();
          return await processMessages(supabase, retryData.messages || [], accessToken, user.id);
        }
      }

      return jsonRes({ error: "Failed to fetch emails from Gmail.", detail: errBody }, 502);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    return await processMessages(supabase, messages, accessToken, user.id);

  } catch (err) {
    console.error("gmail-initial-sync error:", err);
    return jsonRes({ error: "Internal server error." }, 500);
  }
});

// Process fetched Gmail messages
async function processMessages(supabase: any, messages: any[], accessToken: string, userId: string) {
  if (messages.length === 0) {
    return jsonRes({ success: true, parsed: 0, message: "No bank emails found in the last 90 days." });
  }

  let parsed = 0;
  let skipped = 0;
  let errors = 0;

  for (const msg of messages) {
    try {
      // Dedup check
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("source_email_id", msg.id)
        .single();

      if (existing) { skipped++; continue; }

      // Fetch full email
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) { errors++; continue; }

      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const senderDomain = extractDomain(from);
      const bodyText = extractEmailBody(msgData.payload);

      if (!bodyText) { skipped++; continue; }

      // Invoke parse-email-transactions
      const { error: invokeErr } = await supabase.functions.invoke(
        "parse-email-transactions",
        {
          body: {
            raw_email_body: bodyText,
            bank_domain: senderDomain,
            source_email_id: msg.id,
            user_id: userId,
          },
        }
      );

      if (invokeErr) { errors++; } else { parsed++; }

      await new Promise((r) => setTimeout(r, 50));
    } catch (e) {
      console.error("Email parse error:", e);
      errors++;
    }
  }

  // Store Gmail history ID for future push notifications
  try {
    const profileRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const profileData = await profileRes.json();
    if (profileData?.historyId) {
      await supabase.from("profiles").update({
        gmail_history_id: String(profileData.historyId),
      }).eq("id", userId);
    }
  } catch (e) {
    console.warn("Failed to store history ID:", e);
  }

  return jsonRes({ success: true, total: messages.length, parsed, skipped, errors });
}

// ----- HELPERS -----

function jsonRes(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractDomain(from: string): string {
  const match = from.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : "";
}

function extractEmailBody(payload: any): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
    for (const part of payload.parts) {
      const nested = extractEmailBody(part);
      if (nested) return nested;
    }
  }

  return "";
}
