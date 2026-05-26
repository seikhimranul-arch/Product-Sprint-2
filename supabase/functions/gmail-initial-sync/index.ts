/*
  FintLer — gmail-initial-sync Edge Function
  
  Fetches the last 90 days of bank alert emails from Gmail using the user's
  stored OAuth access token, then parses each one via parse-email-transactions.
  
  Triggered by: Syncing.jsx after a successful Google OAuth login.
  
  Env vars required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    GEMINI_API_KEY
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

// Build Gmail search query — last 90 days from known bank senders
function buildGmailQuery(): string {
  const senderQuery = BANK_SENDER_FILTERS.map((s) => `from:${s}`).join(" OR ");
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
  return `(${senderQuery}) after:${ninetyDaysAgo}`;
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

    // ----- GET STORED GMAIL TOKEN -----
    const { data: emailConn, error: connErr } = await supabase
      .from("email_connections")
      .select("access_token, refresh_token, token_expiry")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .single();

    if (connErr || !emailConn) {
      return jsonRes({ error: "Gmail not connected. Please re-authenticate." }, 400);
    }

    let accessToken = emailConn.access_token;

    // Refresh token if expired
    if (emailConn.token_expiry && new Date(emailConn.token_expiry) < new Date()) {
      const refreshed = await refreshAccessToken(emailConn.refresh_token);
      if (refreshed.access_token) {
        accessToken = refreshed.access_token;
        await supabase
          .from("email_connections")
          .update({
            access_token: refreshed.access_token,
            token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq("user_id", user.id);
      }
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
      return jsonRes({ error: "Failed to fetch emails from Gmail." }, 502);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return jsonRes({ success: true, parsed: 0, message: "No bank emails found in the last 90 days." });
    }

    // ----- FETCH & PARSE EACH EMAIL -----
    let parsed = 0;
    let skipped = 0;
    let errors = 0;

    for (const msg of messages) {
      try {
        // Check dedup — skip if already parsed
        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("email_message_id", msg.id)
          .single();

        if (existing) { skipped++; continue; }

        // Fetch full email
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!msgRes.ok) { errors++; continue; }

        const msgData = await msgRes.json();

        // Extract sender domain and plain-text body
        const headers = msgData.payload?.headers || [];
        const from = headers.find((h: any) => h.name === "From")?.value || "";
        const senderDomain = extractDomain(from);
        const bodyText = extractEmailBody(msgData.payload);

        if (!bodyText) { skipped++; continue; }

        // Invoke parse-email-transactions for this email
        const { error: invokeErr } = await supabase.functions.invoke(
          "parse-email-transactions",
          {
            body: {
              raw_email_body: bodyText,
              bank_domain: senderDomain,
              email_message_id: msg.id,
            },
          }
        );

        if (invokeErr) { errors++; } else { parsed++; }

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 50));
      } catch (e) {
        console.error("Email parse error:", e);
        errors++;
      }
    }

    // Store Gmail history ID for future push notifications
    const { data: profileData } = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ).then((r) => r.json());

    const historyId = profileData?.historyId || listData.nextPageToken;
    if (historyId) {
      await supabase
        .from("email_connections")
        .update({ gmail_history_id: String(historyId) })
        .eq("user_id", user.id);
    }

    return jsonRes({ success: true, total: messages.length, parsed, skipped, errors });

  } catch (err) {
    console.error("gmail-initial-sync error:", err);
    return jsonRes({ error: "Internal server error." }, 500);
  }
});

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

  // Direct body
  if (payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }

  // Multi-part — prefer text/plain
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      }
    }
    // Fallback to text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
    // Nested multi-part
    for (const part of payload.parts) {
      const nested = extractEmailBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}
