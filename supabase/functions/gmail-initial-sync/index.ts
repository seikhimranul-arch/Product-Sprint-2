/*
  FintLer — gmail-initial-sync Edge Function (v2 — schema aligned)
  
  Fetches the last 90 days of bank alert emails from Gmail using the
  provider_token passed from the frontend session, then parses each
  one via parse-email-transactions.
  
  Schema: profiles (gmail_sync_enabled, gmail_history_id)
  No email_connections table — tokens come from the frontend session.
  
  Env vars required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
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

    // ----- GET GMAIL TOKEN FROM REQUEST BODY -----
    const body = await req.json();
    const providerToken = body?.provider_token;

    if (!providerToken) {
      return jsonRes({ error: "No Gmail token provided. Please re-authenticate." }, 400);
    }

    const accessToken = providerToken;

    // ----- FETCH EMAIL LIST FROM GMAIL -----
    const query = buildGmailQuery();
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=200`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errBody = await listRes.text();
      console.error("Gmail list error:", errBody);
      return jsonRes({ error: "Failed to fetch emails from Gmail.", detail: errBody }, 502);
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
        // Check dedup — skip if already parsed (source_email_id is the Gmail message ID)
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
              source_email_id: msg.id,
              user_id: user.id,
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

    // Store Gmail history ID in profiles for future push notifications
    try {
      const profileRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const profileData = await profileRes.json();
      const historyId = profileData?.historyId;

      if (historyId) {
        await supabase
          .from("profiles")
          .update({ gmail_history_id: String(historyId), gmail_sync_enabled: true })
          .eq("id", user.id);
      }
    } catch (e) {
      console.warn("Failed to store history ID:", e);
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
