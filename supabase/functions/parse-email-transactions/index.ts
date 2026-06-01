/*
  FintLer — parse-email-transactions Edge Function (v2 — schema aligned)
  Two-Layer Parsing Pipeline: Regex Fast-Path → Gemini AI Fallback.
  Full coverage for HDFC, ICICI, SBI, Axis, Kotak, YES Bank.

  Schema: transactions (amount NUMERIC, type, category, merchant, description, source_email_id, transaction_date)
  
  Deploy: supabase functions deploy parse-email-transactions
  Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const PARSE_SYSTEM_PROMPT = `You are a financial parsing AI for Indian bank alert emails.
Extract transaction details into STRICT JSON with these exact keys:
{
  "amount": number (pure number, no commas, no paise. e.g. 540.00),
  "merchant": "Cleaned merchant name (e.g. Swiggy, Uber, Amazon)",
  "description": "The exact original string from the email",
  "type": "debit" or "credit",
  "category": "Food" | "Travel" | "Shopping" | "Utilities" | "Transfer" | "EMI" | "Salary" | "Uncategorized",
  "transaction_date": "ISO 8601 datetime if found in email, else null"
}
If a field is missing, return null. Return ONLY valid JSON, no markdown, no explanation.`;

// ─────────────────────────────────────────
// BANK REGEX PATTERNS (covers ~85% volume)
// ─────────────────────────────────────────
interface ParsedData {
  amount: number;
  merchant: string | null;
  description: string | null;
  type: "debit" | "credit";
  category: string;
  transaction_date: string | null;
}

function regexParse(body: string, bankDomain: string): ParsedData | null {
  const b = body.replace(/\r\n/g, "\n");

  // ── HDFC Bank ──
  if (bankDomain.includes("hdfc")) {
    const m = b.match(/(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?[\s\S]{0,60}?(debited|credited)[\s\S]{0,80}?(?:to|from|Info:?|VPA:?)\s*([^\n\r,]{3,50}))/i);
    if (m) return buildResult(m[1], m[2], m[3], b);
  }

  // ── ICICI Bank ──
  if (bankDomain.includes("icici")) {
    const m = b.match(/(?:debited with|credited with)\s*(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,60}?(?:Info:|Ref\s*No|to)\s*([^\n\r,]{3,50})/i);
    const typeM = b.match(/(debited|credited)/i);
    if (m && typeM) return buildResult(m[1], typeM[1], m[2], b);
  }

  // ── SBI ──
  if (bankDomain.includes("sbi")) {
    const m = b.match(/(?:debited by|credited by|debited with|credited with)\s*Rs[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const typeM = b.match(/(debited|credited)/i);
    const merchantM = b.match(/(?:transfer to|to UPI|VPA|payee)\s*([^\n\r,]{3,50})/i);
    if (m && typeM) return buildResult(m[1], typeM[1], merchantM?.[1] || null, b);
  }

  // ── Axis Bank ──
  if (bankDomain.includes("axis")) {
    const m = b.match(/(?:INR|Rs)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,50}?(debited|credited)[\s\S]{0,80}?(?:for|to|at)\s*([^\n\r,]{3,50})/i);
    if (m) return buildResult(m[1], m[2], m[3], b);
  }

  // ── Kotak ──
  if (bankDomain.includes("kotak")) {
    const m = b.match(/(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,50}?(debited|credited)[\s\S]{0,80}?(?:towards|to|for)\s*([^\n\r,]{3,50})/i);
    if (m) return buildResult(m[1], m[2], m[3], b);
  }

  // ── YES Bank ──
  if (bankDomain.includes("yesbank") || bankDomain.includes("yes")) {
    const m = b.match(/(?:debited with|credited with)\s*(?:INR|Rs)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,60}?(?:for|towards|to)\s*([^\n\r,]{3,50})/i);
    const typeM = b.match(/(debited|credited)/i);
    if (m && typeM) return buildResult(m[1], typeM[1], m[2], b);
  }

  // ── Generic UPI fallback ──
  const upiM = b.match(/(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,80}?(debited|credited)[\s\S]{0,100}?(?:VPA|UPI ID|to|Info)[:\s]+([a-zA-Z0-9@.\-_]+)/i);
  if (upiM) return buildResult(upiM[1], upiM[2], upiM[3], b);

  // ── UNIVERSAL FALLBACK — catches any bank we don't have specific regex for ──
  // Pattern 1: "Rs.XXX debited/credited ... to/from MERCHANT"
  const uni1 = b.match(/(?:Rs\.?|INR\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:has been\s+)?(debited|credited)[\s\S]{0,120}?(?:to|from|at|for|Info:?|VPA:?|towards)\s+([^\n\r,]{3,60})/i);
  if (uni1) return buildResult(uni1[1], uni1[2], uni1[3], b);

  // Pattern 2: "debited/credited ... Rs.XXX"  (type first, then amount)
  const uni2 = b.match(/(debited|credited)\s+(?:with\s+)?(?:Rs\.?|INR\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,120}?(?:to|from|at|for|Info:?|VPA:?|towards)\s+([^\n\r,]{3,60})/i);
  if (uni2) return buildResult(uni2[2], uni2[1], uni2[3], b);

  // Pattern 3: Amount + type only (no merchant — still useful)
  const uni3 = b.match(/(?:Rs\.?|INR\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:has been\s+)?(debited|credited)/i);
  if (uni3) return buildResult(uni3[1], uni3[2], null, b);

  // Pattern 4: "spent Rs.XXX on your card" (credit card alerts)
  const cc = b.match(/(?:spent|charged|payment of)\s+(?:Rs\.?|INR\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:on|at|for)\s+([^\n\r,]{3,60})/i);
  if (cc) return buildResult(cc[1], "debit", cc[2], b);

  return null;
}

function buildResult(amountStr: string, typeStr: string, rawMerchant: string | null, body: string): ParsedData {
  const amount = parseFloat(amountStr.replace(/,/g, ""));
  const type = typeStr.toLowerCase().includes("debit") ? "debit" : "credit";
  const merchant = rawMerchant ? normalizeMerchant(rawMerchant.trim()) : null;
  const category = merchant ? categorizeMerchant(rawMerchant!.trim()) : "Uncategorized";

  // Try to extract date/time from email body
  const dateM = body.match(/(\d{1,2}[\/\-]\w{2,3}[\/\-]\d{2,4}[\s,]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i);
  let transaction_date: string | null = null;
  if (dateM) {
    try { transaction_date = new Date(dateM[1]).toISOString(); } catch {}
  }

  return { amount, merchant, description: rawMerchant?.trim() || null, type, category, transaction_date };
}

// ─────────────────────────────────────────
// MERCHANT NORMALIZATION
// ─────────────────────────────────────────
function normalizeMerchant(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("swiggy")) return "Swiggy";
  if (s.includes("zomato")) return "Zomato";
  if (s.includes("uber")) return "Uber";
  if (s.includes("ola")) return "Ola";
  if (s.includes("amazon")) return "Amazon";
  if (s.includes("flipkart")) return "Flipkart";
  if (s.includes("netflix")) return "Netflix";
  if (s.includes("spotify")) return "Spotify";
  if (s.includes("youtube")) return "YouTube Premium";
  if (s.includes("paytm")) return "Paytm";
  if (s.includes("phonepe")) return "PhonePe";
  if (s.includes("gpay") || s.includes("google pay")) return "Google Pay";
  if (s.includes("blinkit") || s.includes("grofer")) return "Blinkit";
  if (s.includes("bigbasket")) return "BigBasket";
  if (s.includes("nykaa")) return "Nykaa";
  if (s.includes("myntra")) return "Myntra";
  if (s.includes("emi") || s.includes("equated")) return "EMI Payment";
  if (s.includes("salary") || s.includes("payroll")) return "Salary Credit";
  const upiClean = raw.split("@")[0].replace(/[0-9_\-]/g, "").trim();
  return upiClean.length > 2 ? upiClean.charAt(0).toUpperCase() + upiClean.slice(1) : raw;
}

function categorizeMerchant(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("swiggy") || s.includes("zomato") || s.includes("dominos") || s.includes("mcdonald") || s.includes("restaurant") || s.includes("bigbasket") || s.includes("blinkit")) return "Food";
  if (s.includes("uber") || s.includes("ola") || s.includes("rapido") || s.includes("irctc") || s.includes("makemytrip") || s.includes("goibibo") || s.includes("indigo")) return "Travel";
  if (s.includes("amazon") || s.includes("flipkart") || s.includes("myntra") || s.includes("nykaa") || s.includes("meesho")) return "Shopping";
  if (s.includes("netflix") || s.includes("spotify") || s.includes("youtube") || s.includes("hotstar") || s.includes("jiocinema") || s.includes("airtel") || s.includes("vodafone") || s.includes("jio")) return "Utilities";
  if (s.includes("emi") || s.includes("loan") || s.includes("equated")) return "EMI";
  if (s.includes("salary") || s.includes("payroll") || s.includes("neft credit")) return "Salary";
  if (s.includes("neft") || s.includes("imps") || s.includes("rtgs") || s.includes("transfer") || s.includes("upi")) return "Transfer";
  return "Uncategorized";
}

// ─────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Not authenticated." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return jsonRes({ error: "Invalid session." }, 401);

    // Input
    const { raw_email_body, bank_domain, source_email_id, user_id } = await req.json();
    if (!raw_email_body || !bank_domain) {
      return jsonRes({ error: "Missing email body or bank domain." }, 400);
    }

    const targetUserId = user_id || user.id;

    // Dedup check using source_email_id
    if (source_email_id) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("source_email_id", source_email_id)
        .single();
      if (existing) return jsonRes({ success: true, skipped: true, reason: "already_parsed" });
    }

    // Layer 1 — Regex fast path
    let parsedData = regexParse(raw_email_body, bank_domain);
    let method = "regex_fastpath";

    // Layer 2 — Gemini AI fallback
    if (!parsedData) {
      method = "ai_fallback";
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) return jsonRes({ error: "AI fallback not configured." }, 500);

      const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: PARSE_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: raw_email_body.substring(0, 8000) }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      });

      if (!geminiRes.ok) return jsonRes({ error: "AI parsing failed." }, 500);
      const geminiJson = await geminiRes.json();
      const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      try { parsedData = JSON.parse(rawText); } catch { return jsonRes({ error: "Failed to parse AI output." }, 500); }
    }

    if (!parsedData || !parsedData.amount || !parsedData.type) {
      return jsonRes({ error: "Could not extract transaction data from this email.", skipped: true }, 200);
    }

    // Insert into transactions table (matching actual schema)
    const txDate = parsedData.transaction_date ? new Date(parsedData.transaction_date) : new Date();

    const { data: inserted, error: insertErr } = await supabase
      .from("transactions")
      .insert({
        user_id: targetUserId,
        amount: parsedData.amount,
        type: parsedData.type,
        category: parsedData.category || "Uncategorized",
        merchant: parsedData.merchant,
        description: parsedData.description || "",
        source_email_id: source_email_id || null,
        transaction_date: txDate.toISOString(),
      })
      .select("*")
      .single();

    if (insertErr) {
      // Unique constraint violation = already parsed
      if (insertErr.code === "23505") return jsonRes({ success: true, skipped: true, reason: "duplicate" });
      return jsonRes({ error: "DB insert failed.", detail: insertErr.message }, 500);
    }

    return jsonRes({ success: true, method, transaction: inserted });

  } catch (err) {
    console.error("parse-email-transactions error:", err);
    return jsonRes({ error: "Internal server error." }, 500);
  }
});

function jsonRes(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
