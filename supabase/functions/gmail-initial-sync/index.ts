/*
  FintLer — gmail-initial-sync Edge Function (v4 — broadened search)
  
  Fetches bank/UPI/wallet transaction alert emails from Gmail using
  BOTH sender filters AND keyword matching for maximum coverage.
  Stores Gmail tokens for re-sync capability.
  
  Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
            GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── GMAIL SEARCH STRATEGY ──
// Two-pronged: sender filter + keyword filter. Union of both.
// This ensures we catch bank alerts even from uncommon senders.

const BANK_SENDERS = [
  // Major banks
  "alerts@hdfcbank.net", "notify@hdfcbank.net",
  "alerts@icicibank.com", "notify@icicibank.com",
  "sbmops@sbi.co.in", "donotreply@sbi.co.in",
  "alerts@axisbank.com", "notify@axisbank.com",
  "noreply@kotak.com", "alerts@kotak.com",
  "donotreply@yesbank.in", "alerts@yesbank.in",
  "noreply@indusind.com", "alerts@indusind.com",
  "alerts@federalbank.co.in",
  // More banks
  "alerts@pnb.co.in", "noreply@pnb.co.in",
  "alerts@bobmail.in", "donotreply@unionbankofindia.co.in",
  "alerts@canarabank.in", "noreply@idfcfirstbank.com",
  "alerts@rblbank.com", "noreply@bandhanbank.com",
  "alerts@sc.com",
  // Credit cards
  "alerts@citibank.com", "noreply@amex.com",
  "alerts@hsbcbank.co.in",
  // UPI / Wallets / Payment apps
  "noreply@phonepe.com", "noreply@paytm.com",
  "noreply@googleusercontent.com",
  "noreply@amazonpay.in",
];

function buildGmailQuery(): string {
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);

  // Strategy 1: Known bank senders
  const senderQuery = BANK_SENDERS.map((s) => `from:${s}`).join(" OR ");

  // Strategy 2: Keyword-based (catches ALL banks including unknown ones)
  const keywords = [
    '"debited from"',
    '"credited to"',
    '"your a/c"',
    '"your account"',
    '"transaction of Rs"',
    '"transaction of INR"',
    '"UPI transaction"',
    '"spent on your"',
    '"payment of Rs"',
    '"withdrawn from"',
    '"deposited in"',
    '"amt debited"',
  ];
  const keywordQuery = keywords.join(" OR ");

  // Union: emails from known senders OR containing transaction keywords
  return `(${senderQuery} OR ${keywordQuery}) after:${ninetyDaysAgo}`;
}

// Refresh expired access token
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
    // ── AUTH ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Not authenticated." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return jsonRes({ error: "Invalid session." }, 401);

    // ── RESOLVE GMAIL TOKEN ──
    const body = await req.json();
    const providerToken = body?.provider_token;
    const providerRefreshToken = body?.provider_refresh_token;

    let accessToken = providerToken;
    let refreshToken = providerRefreshToken;

    // Fallback to stored tokens
    if (!accessToken) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("gmail_access_token, gmail_refresh_token, gmail_token_expiry")
        .eq("id", user.id)
        .single();

      if (profile?.gmail_refresh_token) {
        refreshToken = profile.gmail_refresh_token;
        const expiry = profile.gmail_token_expiry ? new Date(profile.gmail_token_expiry) : new Date(0);
        if (profile.gmail_access_token && expiry > new Date()) {
          accessToken = profile.gmail_access_token;
        } else {
          const refreshed = await refreshAccessToken(profile.gmail_refresh_token);
          if (refreshed) {
            accessToken = refreshed.access_token;
            await supabase.from("profiles").update({
              gmail_access_token: refreshed.access_token,
              gmail_token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            }).eq("id", user.id);
          }
        }
      }
    }

    if (!accessToken) {
      return jsonRes({ error: "No Gmail token available. Please sign out and sign in again." }, 400);
    }

    // ── PERSIST TOKENS ──
    if (providerToken) {
      const tokenUpdate: Record<string, any> = {
        gmail_access_token: providerToken,
        gmail_sync_enabled: true,
        gmail_token_expiry: new Date(Date.now() + 3500 * 1000).toISOString(),
      };
      if (providerRefreshToken) {
        tokenUpdate.gmail_refresh_token = providerRefreshToken;
      }
      await supabase.from("profiles").update(tokenUpdate).eq("id", user.id);
    }

    // ── FETCH EMAILS ──
    const query = buildGmailQuery();
    console.log("Gmail search query:", query.substring(0, 200) + "...");

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=200`;
    let listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Auto-retry on 401
    if (listRes.status === 401 && refreshToken) {
      console.log("Gmail 401 — refreshing token...");
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed) {
        accessToken = refreshed.access_token;
        await supabase.from("profiles").update({
          gmail_access_token: refreshed.access_token,
          gmail_token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        }).eq("id", user.id);
        listRes = await fetch(listUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    }

    if (!listRes.ok) {
      const errBody = await listRes.text();
      console.error("Gmail list error:", listRes.status, errBody);
      return jsonRes({ error: "Failed to fetch emails from Gmail.", status: listRes.status, detail: errBody }, 502);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];
    console.log(`Gmail returned ${messages.length} messages matching query.`);

    if (messages.length === 0) {
      return jsonRes({ success: true, parsed: 0, total: 0, message: "No transaction emails found in the last 90 days." });
    }

    // ── PROCESS EMAILS ──
    let parsed = 0;
    let skipped = 0;
    let errors = 0;

    for (const msg of messages) {
      try {
        // Dedup
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
        const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
        const senderDomain = extractDomain(from);
        const bodyText = extractEmailBody(msgData.payload);

        if (!bodyText) { skipped++; continue; }

        console.log(`Processing email from ${senderDomain}: "${subject.substring(0, 60)}"`);

        // Call parse-email-transactions
        const { error: invokeErr } = await supabase.functions.invoke(
          "parse-email-transactions",
          {
            body: {
              raw_email_body: bodyText.substring(0, 10000),
              bank_domain: senderDomain,
              source_email_id: msg.id,
              user_id: user.id,
            },
          }
        );

        if (invokeErr) {
          console.warn(`Parse error for ${msg.id}:`, invokeErr.message);
          errors++;
        } else {
          parsed++;
        }

        // Rate limiting — don't hammer Gmail API
        await new Promise((r) => setTimeout(r, 100));
      } catch (e) {
        console.error("Email process error:", e);
        errors++;
      }
    }

    // Store Gmail history ID
    try {
      const profileRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const profileData = await profileRes.json();
      if (profileData?.historyId) {
        await supabase.from("profiles").update({
          gmail_history_id: String(profileData.historyId),
        }).eq("id", user.id);
      }
    } catch (e) {
      console.warn("Failed to store history ID:", e);
    }

    console.log(`Sync complete: ${parsed} parsed, ${skipped} skipped, ${errors} errors out of ${messages.length} total`);
    return jsonRes({ success: true, total: messages.length, parsed, skipped, errors });

  } catch (err) {
    console.error("gmail-initial-sync error:", err);
    return jsonRes({ error: "Internal server error.", detail: String(err) }, 500);
  }
});

// ── HELPERS ──

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
