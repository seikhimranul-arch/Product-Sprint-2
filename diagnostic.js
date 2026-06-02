// FINTLER DIAGNOSTIC — paste this in browser console at fintlerai.netlify.app/dashboard
// It tests each step of the sync pipeline and reports where it breaks.

(async function diagnose() {
  console.log("=== FINTLER SYNC DIAGNOSTIC ===\n");

  // Step 1: Check Supabase session
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(
    "https://qfgrmwvqykpgkncigjnt.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZ3Jtd3ZxeWtwZ2tuY2lnam50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTg5NTksImV4cCI6MjA2Mzc3NDk1OX0.yOBqMPwxyz5dnJBdHjZIRMVRvlkba9t6_YdN8JIRJCQ"
  );

  const { data: { session } } = await supabase.auth.getSession();
  
  console.log("STEP 1 — Session:");
  console.log("  user:", session?.user?.email || "NO USER");
  console.log("  provider_token:", session?.provider_token ? `YES (${session.provider_token.substring(0,20)}...)` : "NULL");
  console.log("  provider_refresh_token:", session?.provider_refresh_token ? "YES" : "NULL");
  console.log("  access_token (JWT):", session?.access_token ? `YES (${session.access_token.substring(0,20)}...)` : "NULL");

  if (!session) { console.error("FAIL: No session. Sign in first."); return; }

  // Step 2: Check stored tokens in profiles
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  console.log("\nSTEP 2 — Stored profile:");
  console.log("  gmail_sync_enabled:", profile?.gmail_sync_enabled);
  console.log("  gmail_access_token:", profile?.gmail_access_token ? `YES (${profile.gmail_access_token.substring(0,20)}...)` : "NULL");
  console.log("  gmail_refresh_token:", profile?.gmail_refresh_token ? "YES" : "NULL");
  console.log("  gmail_token_expiry:", profile?.gmail_token_expiry);

  // Step 3: Test Gmail API directly with whatever token we have
  const gmailToken = session.provider_token || profile?.gmail_access_token;
  console.log("\nSTEP 3 — Gmail API test:");
  console.log("  Using token:", gmailToken ? `YES (${gmailToken.substring(0,20)}...)` : "NO TOKEN AVAILABLE");

  if (!gmailToken) {
    console.error("FAIL: No Gmail token anywhere. Need to re-sign-in with Google.");
    return;
  }

  // Test with a simple query first
  const simpleQuery = '"debited" OR "credited" OR "transaction"';
  const simpleUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(simpleQuery)}&maxResults=5`;
  
  const gmailRes = await fetch(simpleUrl, {
    headers: { Authorization: `Bearer ${gmailToken}` }
  });

  console.log("  Gmail API status:", gmailRes.status);

  if (gmailRes.status === 401) {
    console.error("FAIL: Gmail token expired/invalid. Need fresh sign-in.");
    return;
  }

  if (!gmailRes.ok) {
    console.error("FAIL: Gmail API error:", await gmailRes.text());
    return;
  }

  const gmailData = await gmailRes.json();
  const messages = gmailData.messages || [];
  console.log("  Messages found:", messages.length);

  if (messages.length === 0) {
    console.warn("Gmail found 0 messages with basic query. Trying broader search...");
    const broadUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("from:hdfcbank")}&maxResults=5`;
    const broadRes = await fetch(broadUrl, { headers: { Authorization: `Bearer ${gmailToken}` } });
    const broadData = await broadRes.json();
    console.log("  Messages from HDFC:", (broadData.messages || []).length);
  }

  // Step 4: Fetch first email and show content
  if (messages.length > 0) {
    console.log("\nSTEP 4 — First email content:");
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messages[0].id}?format=full`,
      { headers: { Authorization: `Bearer ${gmailToken}` } }
    );
    const msgData = await msgRes.json();
    const headers = msgData.payload?.headers || [];
    const from = headers.find(h => h.name === "From")?.value || "";
    const subject = headers.find(h => h.name === "Subject")?.value || "";
    console.log("  From:", from);
    console.log("  Subject:", subject);

    // Extract body
    const body = extractBody(msgData.payload);
    console.log("  Body preview:", body?.substring(0, 200) || "EMPTY");
  }

  // Step 5: Test the edge function
  console.log("\nSTEP 5 — Calling gmail-initial-sync edge function:");
  const { data: syncData, error: syncErr } = await supabase.functions.invoke("gmail-initial-sync", {
    body: {
      user_id: session.user.id,
      provider_token: gmailToken,
      provider_refresh_token: session.provider_refresh_token || "",
    }
  });
  
  console.log("  Error:", syncErr ? syncErr.message : "none");
  console.log("  Response:", JSON.stringify(syncData, null, 2));

  console.log("\n=== DIAGNOSTIC COMPLETE ===");

  function extractBody(payload) {
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
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
    return "";
  }
})();
