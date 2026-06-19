/*
  FintLer — gmail-initial-sync Edge Function (v5 — robust)
  
  Pipeline: Fetch bank emails from Gmail → call parse-email-transactions for each
  
  Key improvements in v5:
  - Smarter HTML-to-text that preserves amounts in table cells
  - Tighter Gmail query to reduce noise
  - Robust token refresh with stored credentials
  - Detailed per-email logging for debugging
  
  Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
            GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── GMAIL SEARCH STRATEGY ──
// Focused on actual bank transaction alerts — not generic "your account" emails

const BANK_SENDERS = [
  // Major Indian banks
  "alerts@hdfcbank.net", "notify@hdfcbank.net",
  "alerts@icicibank.com", "notify@icicibank.com",
  "sbmops@sbi.co.in", "donotreply@sbi.co.in",
  "alerts@axisbank.com", "notify@axisbank.com",
  "noreply@kotak.com", "alerts@kotak.com",
  "donotreply@yesbank.in", "alerts@yesbank.in",
  "noreply@indusind.com", "alerts@indusind.com",
  "alerts@federalbank.co.in",
  "alerts@pnb.co.in", "noreply@pnb.co.in",
  "alerts@bobmail.in", "donotreply@unionbankofindia.co.in",
  "alerts@canarabank.in", "noreply@idfcfirstbank.com",
  "alerts@rblbank.com", "noreply@bandhanbank.com",
  "alerts@sc.com",
  // Credit cards
  "alerts@citibank.com", "noreply@amex.com",
  "alerts@hsbcbank.co.in",
  // UPI / Wallets
  "noreply@phonepe.com", "noreply@paytm.com",
  "noreply@googleusercontent.com",
  "noreply@amazonpay.in",
];

function buildGmailQuery(): string {
  const sixtyDaysAgo = Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000);

  const senderQuery = BANK_SENDERS.map((s) => `from:${s}`).join(" OR ");

  // Tight keyword-based search — must include a money indicator
  const keywords = [
    '"debited from"',
    '"credited to"',
    '"debited by"',
    '"credited by"',
    '"is debited"',
    '"is credited"',
    '"amt debited"',
    '"has been debited"',
    '"has been credited"',
    '"transaction of Rs"',
    '"transaction of INR"',
    '"UPI transaction"',
    '"spent on your"',
    '"payment of Rs"',
    '"withdrawn from"',
    '"deposited in"',
    '"Rs. debited"',
    '"INR debited"',
  ];
  const keywordQuery = keywords.join(" OR ");

  return `(${senderQuery} OR ${keywordQuery}) after:${sixtyDaysAgo}`;
}

// ── TOKEN REFRESH ──
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Token refresh: missing credentials", { hasClientId: !!clientId, hasSecret: !!clientSecret, hasRefresh: !!refreshToken });
    return null;
  }

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
      const errText = await res.text();
      console.error("Token refresh HTTP error:", res.status, errText);
      return null;
    }
    const data = await res.json();
    return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
  } catch (e) {
    console.error("Token refresh exception:", e);
    return null;
  }
}

// ── HTML TO TEXT — preserves amounts in table cells ──
function htmlToText(html: string): string {
  // Replace <br>, <p>, <div>, <tr>, <li> with newlines to preserve structure
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<td[^>]*>/gi, " ")     // Table cells become spaces (keeps amounts readable)
    .replace(/<\/td>/gi, " | ")      // Cell boundaries
    .replace(/<th[^>]*>/gi, " ")
    .replace(/<\/th>/gi, " | ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")  // Remove CSS
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove JS
    .replace(/<!--[\s\S]*?-->/g, "")                   // Remove comments
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&#8377;/gi, "₹")       // Rupee symbol entity
    .replace(/&rupee;/gi, "₹");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Normalize whitespace (but preserve newlines)
  text = text
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(line => line.length > 0)
    .join("\n");

  return text;
}

// ── EMAIL BODY EXTRACTION — recursive, handles all MIME structures ──
function extractEmailBody(payload: any): string {
  if (!payload) return "";

  // Direct body
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") {
      return htmlToText(decoded);
    }
    return decoded;
  }

  if (payload.parts) {
    // Prefer text/plain first — it's cleaner for parsing
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    // Fall back to text/html with smart conversion
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return htmlToText(decodeBase64Url(part.body.data));
      }
    }

    // Recurse into multipart/* parts
    for (const part of payload.parts) {
      if (part.mimeType?.startsWith("multipart/") || part.parts) {
        const nested = extractEmailBody(part);
        if (nested) return nested;
      }
    }

    // Last resort: try ANY part with body data
    for (const part of payload.parts) {
      const nested = extractEmailBody(part);
      if (nested) return nested;
    }
  }

  return "";
}

function decodeBase64Url(data: string): string {
  try {
    return atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return "";
  }
}

function extractDomain(from: string): string {
  const match = from.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : "";
}

// ── QUICK CHECK: does this email body look like a bank transaction? ──
function looksLikeBankEmail(text: string): boolean {
  const lower = text.toLowerCase();
  // Must contain a money indicator
  const hasMoney = /(?:rs\.?|inr\.?|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?/i.test(text);
  // Must contain a transaction indicator
  const hasTxn = /(debit|credit|withdraw|spent|paid|received|deposit|transfer|payment|transact)/i.test(text);
  // Must contain an account reference
  const hasAccount = /(a\/c|account|acct|card|upi|neft|imps|rtgs|vpa|wallet)/i.test(text);

  return hasMoney && (hasTxn || hasAccount);
}

// ── MAIN HANDLER ──
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

    console.log(`[SYNC] Starting for user ${user.id} (${user.email})`);

    // ── RESOLVE GMAIL TOKEN ──
    const body = await req.json();
    const providerToken = body?.provider_token;
    const providerRefreshToken = body?.provider_refresh_token;

    let accessToken = providerToken;
    let refreshToken = providerRefreshToken;

    console.log(`[SYNC] Token state: provider_token=${!!providerToken}, refresh_token=${!!providerRefreshToken}`);

    // Fallback: try stored tokens from profiles table
    if (!accessToken) {
      console.log("[SYNC] No provider_token — trying stored tokens...");
      try {
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("gmail_access_token, gmail_refresh_token, gmail_token_expiry")
          .eq("id", user.id)
          .single();

        if (profileErr) {
          console.error("[SYNC] Profile fetch error:", profileErr.message);
        } else if (profile?.gmail_refresh_token) {
          refreshToken = profile.gmail_refresh_token;
          const expiry = profile.gmail_token_expiry ? new Date(profile.gmail_token_expiry) : new Date(0);
          
          if (profile.gmail_access_token && expiry > new Date()) {
            console.log("[SYNC] Using stored access token (not expired)");
            accessToken = profile.gmail_access_token;
          } else {
            console.log("[SYNC] Stored token expired — refreshing...");
            const refreshed = await refreshAccessToken(profile.gmail_refresh_token);
            if (refreshed) {
              accessToken = refreshed.access_token;
              await supabase.from("profiles").update({
                gmail_access_token: refreshed.access_token,
                gmail_token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
              }).eq("id", user.id);
              console.log("[SYNC] Token refreshed successfully");
            } else {
              console.error("[SYNC] Token refresh failed");
            }
          }
        } else {
          console.log("[SYNC] No stored tokens found in profile");
        }
      } catch (e) {
        console.error("[SYNC] Stored token lookup error:", e);
      }
    }

    if (!accessToken) {
      console.error("[SYNC] FATAL: No Gmail access token available");
      return jsonRes({
        error: "No Gmail token available. Please sign out and sign in again to re-authorize.",
        action: "reauth",
      }, 400);
    }

    // ── PERSIST TOKENS for future syncs ──
    if (providerToken) {
      const tokenUpdate: Record<string, any> = {
        gmail_access_token: providerToken,
        gmail_sync_enabled: true,
        gmail_token_expiry: new Date(Date.now() + 3500 * 1000).toISOString(),
      };
      if (providerRefreshToken) {
        tokenUpdate.gmail_refresh_token = providerRefreshToken;
      }
      const { error: updateErr } = await supabase.from("profiles").update(tokenUpdate).eq("id", user.id);
      if (updateErr) {
        console.warn("[SYNC] Failed to persist tokens:", updateErr.message);
      } else {
        console.log("[SYNC] Tokens persisted to profile");
      }
    }

    // ── FETCH EMAILS ──
    const query = buildGmailQuery();
    console.log("[SYNC] Gmail query length:", query.length, "chars");

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=200`;
    let listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Auto-retry on 401 with token refresh
    if (listRes.status === 401 && refreshToken) {
      console.log("[SYNC] Gmail 401 — refreshing token...");
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
      console.error("[SYNC] Gmail list error:", listRes.status, errBody.substring(0, 500));
      return jsonRes({
        error: "Failed to fetch emails from Gmail.",
        status: listRes.status,
        detail: listRes.status === 401 ? "Gmail authorization expired. Please sign out and sign in again." : errBody.substring(0, 200),
      }, 502);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];
    console.log(`[SYNC] Gmail returned ${messages.length} candidate messages`);

    if (messages.length === 0) {
      // Mark as synced even with 0 results — user may genuinely have no bank emails
      await supabase.from("profiles").update({ gmail_sync_enabled: true }).eq("id", user.id);
      return jsonRes({ success: true, parsed: 0, skipped: 0, errors: 0, total: 0, message: "No bank transaction emails found in the last 60 days." });
    }

    // ── PROCESS EMAILS ──
    let parsed = 0;
    let skipped = 0;
    let dupes = 0;
    let notBank = 0;
    let errors = 0;

    for (const msg of messages) {
      try {
        // Dedup check — fast path
        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("source_email_id", msg.id)
          .maybeSingle();
        if (existing) { dupes++; continue; }

        // Fetch full email
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!msgRes.ok) {
          console.warn(`[SYNC] Failed to fetch message ${msg.id}: ${msgRes.status}`);
          errors++;
          continue;
        }

        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        const from = headers.find((h: any) => h.name?.toLowerCase() === "from")?.value || "";
        const subject = headers.find((h: any) => h.name?.toLowerCase() === "subject")?.value || "";
        const senderDomain = extractDomain(from);
        const bodyText = extractEmailBody(msgData.payload);

        if (!bodyText || bodyText.length < 20) {
          skipped++;
          continue;
        }

        // Pre-filter: does this look like a bank transaction email?
        if (!looksLikeBankEmail(bodyText)) {
          notBank++;
          continue;
        }

        console.log(`[SYNC] Parsing: from=${senderDomain} subject="${subject.substring(0, 50)}" bodyLen=${bodyText.length}`);

        // Call parse-email-transactions
        const parseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/parse-email-transactions`;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        const parseRes = await fetch(parseUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw_email_body: bodyText.substring(0, 10000),
            bank_domain: senderDomain,
            source_email_id: msg.id,
            user_id: user.id,
          }),
        });

        if (parseRes.ok) {
          const result = await parseRes.json();
          if (result.success && !result.skipped) {
            parsed++;
          } else if (result.skipped) {
            if (result.reason === "already_parsed" || result.reason === "duplicate") dupes++;
            else skipped++;
          } else {
            skipped++;
          }
        } else {
          const errText = await parseRes.text();
          console.warn(`[SYNC] Parse function error for ${msg.id}: ${parseRes.status} ${errText.substring(0, 200)}`);
          errors++;
        }

        // Rate limiting — 100ms between Gmail API calls
        await new Promise((r) => setTimeout(r, 100));
      } catch (e) {
        console.error(`[SYNC] Email ${msg.id} error:`, e);
        errors++;
      }
    }

    // Store Gmail history ID for incremental sync later
    try {
      const profileRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData?.historyId) {
          await supabase.from("profiles").update({
            gmail_history_id: String(profileData.historyId),
          }).eq("id", user.id);
        }
      }
    } catch (e) {
      console.warn("[SYNC] Failed to store history ID:", e);
    }

    const summary = `Sync complete: ${parsed} parsed, ${dupes} dupes, ${notBank} non-bank, ${skipped} skipped, ${errors} errors out of ${messages.length} total`;
    console.log(`[SYNC] ${summary}`);

    return jsonRes({
      success: true,
      total: messages.length,
      parsed,
      dupes,
      not_bank: notBank,
      skipped,
      errors,
      message: summary,
    });

  } catch (err) {
    console.error("[SYNC] Fatal error:", err);
    return jsonRes({ error: "Internal server error.", detail: String(err) }, 500);
  }
});

function jsonRes(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
