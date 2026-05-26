/*
  FintLer — gmail-pubsub-webhook Edge Function
  
  Receives Google Pub/Sub push notifications when a new email arrives in a
  connected user's Gmail inbox. Fetches only the new message (using historyId
  delta), checks if it is a bank alert, and parses it.
  
  Setup (one-time in Google Cloud Console):
    1. Create a Pub/Sub topic: projects/{PROJECT_ID}/topics/fintler-gmail-push
    2. Create a push subscription pointing to this Edge Function URL
    3. Grant the Gmail API service account Pub/Sub Publisher role
    4. For each user, call Gmail API: users.watch({ topicName, labelIds: ['INBOX'] })
  
  Env vars required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    GEMINI_API_KEY
    GOOGLE_PUBSUB_TOKEN   (shared secret for verifying push requests)
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BANK_DOMAINS = new Set([
  "hdfcbank.net",
  "icicibank.com",
  "sbi.co.in",
  "axisbank.com",
  "kotak.com",
  "yesbank.in",
  "indusind.com",
  "federalbank.co.in",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    // Google Pub/Sub wraps the message in { message: { data, attributes }, subscription }
    const encoded = body?.message?.data;
    if (!encoded) return jsonRes({ error: "No Pub/Sub message data." }, 400);

    // Decode base64 payload
    const decoded = atob(encoded);
    const notification = JSON.parse(decoded);

    // Gmail push notifications contain { emailAddress, historyId }
    const { emailAddress, historyId } = notification;
    if (!emailAddress || !historyId) {
      return jsonRes({ error: "Invalid Gmail push notification payload." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find the user by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const matchedUser = authUsers?.users?.find(
      (u: any) => u.email === emailAddress || u.user_metadata?.email === emailAddress
    );

    if (!matchedUser) {
      return jsonRes({ error: "User not found for this email." }, 404);
    }

    // Get stored Gmail connection + last historyId
    const { data: emailConn } = await supabase
      .from("email_connections")
      .select("access_token, refresh_token, gmail_history_id, token_expiry")
      .eq("user_id", matchedUser.id)
      .is("revoked_at", null)
      .single();

    if (!emailConn) {
      return jsonRes({ message: "User has disconnected Gmail. Ignoring." });
    }

    const accessToken = emailConn.access_token;
    const startHistoryId = emailConn.gmail_history_id || String(Number(historyId) - 1);

    // Fetch Gmail history delta (new messages since last sync)
    const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`;
    const histRes = await fetch(historyUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!histRes.ok) {
      console.error("Gmail history fetch failed:", await histRes.text());
      return jsonRes({ error: "Failed to fetch Gmail history." }, 502);
    }

    const histData = await histRes.json();
    const historyItems = histData.history || [];

    let parsed = 0;

    for (const item of historyItems) {
      const addedMessages = item.messagesAdded || [];
      for (const { message } of addedMessages) {
        try {
          // Fetch full message
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!msgRes.ok) continue;
          const msgData = await msgRes.json();

          // Check sender is a known bank
          const headers = msgData.payload?.headers || [];
          const from = headers.find((h: any) => h.name === "From")?.value || "";
          const domain = extractDomain(from);

          if (!isBankDomain(domain)) continue;

          // Check dedup
          const { data: existing } = await supabase
            .from("transactions")
            .select("id")
            .eq("email_message_id", message.id)
            .single();
          if (existing) continue;

          // Extract body
          const bodyText = extractEmailBody(msgData.payload);
          if (!bodyText) continue;

          // Parse it
          const { error: parseErr } = await supabase.functions.invoke(
            "parse-email-transactions",
            {
              body: {
                raw_email_body: bodyText,
                bank_domain: domain,
                email_message_id: message.id,
                user_id: matchedUser.id,
              },
            }
          );

          if (!parseErr) parsed++;

        } catch (e) {
          console.error("Pub/Sub message processing error:", e);
        }
      }
    }

    // Update historyId cursor
    await supabase
      .from("email_connections")
      .update({ gmail_history_id: String(historyId) })
      .eq("user_id", matchedUser.id);

    // Trigger insight regeneration if we parsed anything new
    if (parsed > 0) {
      await supabase.functions.invoke("generate-insights", {
        body: { user_id: matchedUser.id },
      });
    }

    return jsonRes({ success: true, parsed });

  } catch (err) {
    console.error("gmail-pubsub-webhook error:", err);
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

function isBankDomain(domain: string): boolean {
  for (const bankDomain of BANK_DOMAINS) {
    if (domain.endsWith(bankDomain)) return true;
  }
  return false;
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
