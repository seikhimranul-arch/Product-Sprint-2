/*
  FintLer — parse-email-transactions Edge Function (v2)
  Two-Layer Parsing Pipeline: Regex Fast-Path → Gemini AI Fallback.
  Full coverage for HDFC, ICICI, SBI, Axis, Kotak, YES Bank.

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
  "amount_inr": integer (pure number, no commas, no paise. e.g. 540),
  "merchant": "Cleaned merchant name (e.g. Swiggy, Uber, Amazon)",
  "raw_merchant": "The exact string from the email",
  "type": "debit" or "credit",
  "category": "food" | "travel" | "shopping" | "utilities" | "transfer" | "emi" | "salary" | "other",
  "account_last4": "4 digit string or null",
  "transacted_at": "ISO 8601 datetime if found in email, else null"
}
If a field is missing, return null. Return ONLY valid JSON, no markdown, no explanation.`;

// ─────────────────────────────────────────
// BANK REGEX PATTERNS (covers ~85% volume)
// ─────────────────────────────────────────
interface ParsedData {
  amount_inr: number;
  merchant: string | null;
  raw_merchant: string | null;
  type: "debit" | "credit";
  category: string;
  account_last4: string | null;
  transacted_at: string | null;
}

function regexParse(body: string, bankDomain: string): ParsedData | null {
  const b = body.replace(/\r\n/g, "\n");

  // ── HDFC Bank ──
  // "Rs.2,500.00 debited from A/c ...1234 on 25-05-26 to SWIGGY IT"
  // "INR 500.00 credited to A/c XX1234"
  if (bankDomain.includes("hdfc")) {
    const m = b.match(/(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,60}?(debited|credited)[\s\S]{0,80}?(?:to|from|Info:?|VPA:?)\s*([^\n\r,]{3,50})/i);
    if (m) return buildResult(m[1], m[2], m[3], b);
  }

  // ── ICICI Bank ──
  // "Your A/c XX1234 is debited with Rs 1,200.00 on 25-May-26; Info: ZOMATO"
  if (bankDomain.includes("icici")) {
    const m = b.match(/(?:debited with|credited with)\s*(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,60}?(?:Info:|Ref\s*No|to)\s*([^\n\r,]{3,50})/i);
    const typeM = b.match(/(debited|credited)/i);
    if (m && typeM) return buildResult(m[1], typeM[1], m[2], b);
  }

  // ── SBI ──
  // "Your SBI Ac XXXX1234 has been debited by Rs.500.00 on 25/05/26"
  if (bankDomain.includes("sbi")) {
    const m = b.match(/(?:debited by|credited by|debited with|credited with)\s*Rs[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    const typeM = b.match(/(debited|credited)/i);
    const merchantM = b.match(/(?:transfer to|to UPI|VPA|payee)\s*([^\n\r,]{3,50})/i);
    if (m && typeM) return buildResult(m[1], typeM[1], merchantM?.[1] || null, b);
  }

  // ── Axis Bank ──
  // "INR 3,000.00 has been debited from your Axis Bank Account XX1234 for UBER"
  if (bankDomain.includes("axis")) {
    const m = b.match(/(?:INR|Rs)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,50}?(debited|credited)[\s\S]{0,80}?(?:for|to|at)\s*([^\n\r,]{3,50})/i);
    if (m) return buildResult(m[1], m[2], m[3], b);
  }

  // ── Kotak ──
  // "Rs.999 has been debited from a/c XX1234 towards NETFLIX"
  if (bankDomain.includes("kotak")) {
    const m = b.match(/(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,50}?(debited|credited)[\s\S]{0,80}?(?:towards|to|for)\s*([^\n\r,]{3,50})/i);
    if (m) return buildResult(m[1], m[2], m[3], b);
  }

  // ── YES Bank ──
  // "Your YES Bank account XX1234 has been debited with INR 750.00 on 25/05/26 for SWIGGY"
  if (bankDomain.includes("yesbank") || bankDomain.includes("yes")) {
    const m = b.match(/(?:debited with|credited with)\s*(?:INR|Rs)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,60}?(?:for|towards|to)\s*([^\n\r,]{3,50})/i);
    const typeM = b.match(/(debited|credited)/i);
    if (m && typeM) return buildResult(m[1], typeM[1], m[2], b);
  }

  // ── Generic UPI fallback (works across banks) ──
  const upiM = b.match(/(?:Rs|INR)[.\s]*([0-9,]+(?:\.[0-9]{1,2})?)[\s\S]{0,80}?(debited|credited)[\s\S]{0,100}?(?:VPA|UPI ID|to|Info)[:\s]+([a-zA-Z0-9@.\-_]+)/i);
  if (upiM) return buildResult(upiM[1], upiM[2], upiM[3], b);

  return null;
}

function buildResult(amountStr: string, typeStr: string, rawMerchant: string | null, body: string): ParsedData {
  const amount = Math.floor(parseFloat(amountStr.replace(/,/g, "")));
  const type = typeStr.toLowerCase().includes("debit") ? "debit" : "credit";
  const merchant = rawMerchant ? normalizeMerchant(rawMerchant.trim()) : null;
  const category = merchant ? categorizeMerchant(rawMerchant!.trim()) : "other";
  const account4M = body.match(/(?:A\/c|Acc(?:ount)?|Card|a\/c)[^0-9]{0,10}[xX*]{0,8}([0-9]{4})/i);
  const account_last4 = account4M?.[1] || null;

  // Try to extract date/time from email body
  const dateM = body.match(/(\d{1,2}[\/\-]\w{2,3}[\/\-]\d{2,4}[\s,]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i);
  let transacted_at: string | null = null;
  if (dateM) {
    try { transacted_at = new Date(dateM[1]).toISOString(); } catch {}
  }

  return { amount_inr: amount, merchant, raw_merchant: rawMerchant?.trim() || null, type, category, account_last4, transacted_at };
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
  // Clean UPI IDs: "swiggyit@icici" → "Swiggy"
  const upiClean = raw.split("@")[0].replace(/[0-9_\-]/g, "").trim();
  return upiClean.length > 2 ? upiClean.charAt(0).toUpperCase() + upiClean.slice(1) : raw;
}

function categorizeMerchant(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("swiggy") || s.includes("zomato") || s.includes("dominos") || s.includes("mcdonald") || s.includes("restaurant") || s.includes("bigbasket") || s.includes("blinkit")) return "food";
  if (s.includes("uber") || s.includes("ola") || s.includes("rapido") || s.includes("irctc") || s.includes("makemytrip") || s.includes("goibibo") || s.includes("indigo")) return "travel";
  if (s.includes("amazon") || s.includes("flipkart") || s.includes("myntra") || s.includes("nykaa") || s.includes("meesho")) return "shopping";
  if (s.includes("netflix") || s.includes("spotify") || s.includes("youtube") || s.includes("hotstar") || s.includes("jiocinema") || s.includes("airtel") || s.includes("vodafone") || s.includes("jio")) return "utilities";
  if (s.includes("emi") || s.includes("loan") || s.includes("equated")) return "emi";
  if (s.includes("salary") || s.includes("payroll") || s.includes("neft credit")) return "salary";
  if (s.includes("neft") || s.includes("imps") || s.includes("rtgs") || s.includes("transfer") || s.includes("upi")) return "transfer";
  return "other";
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
    const { raw_email_body, bank_domain, email_message_id, user_id } = await req.json();
    if (!raw_email_body || !bank_domain) {
      return jsonRes({ error: "Missing email body or bank domain." }, 400);
    }

    const targetUserId = user_id || user.id;

    // Dedup check
    if (email_message_id) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("email_message_id", email_message_id)
        .single();
      if (existing) return jsonRes({ success: true, skipped: true, reason: "already_parsed" });
    }

    // Determine bank name
    let bank_name = "other";
    if (bank_domain.includes("hdfc")) bank_name = "hdfc";
    else if (bank_domain.includes("icici")) bank_name = "icici";
    else if (bank_domain.includes("sbi")) bank_name = "sbi";
    else if (bank_domain.includes("axis")) bank_name = "axis";
    else if (bank_domain.includes("kotak")) bank_name = "kotak";
    else if (bank_domain.includes("yes")) bank_name = "yes";
    else if (bank_domain.includes("indusind")) bank_name = "indusind";
    else if (bank_domain.includes("federal")) bank_name = "federal";

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

    if (!parsedData || !parsedData.amount_inr || !parsedData.type) {
      return jsonRes({ error: "Could not extract transaction data from this email.", skipped: true }, 200);
    }

    // Temporal computations
    const txDate = parsedData.transacted_at ? new Date(parsedData.transacted_at) : new Date();
    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

    // Insert
    const { data: inserted, error: insertErr } = await supabase
      .from("transactions")
      .insert({
        user_id: targetUserId,
        source: "email",
        email_message_id: email_message_id || null,
        bank_name,
        account_last4: parsedData.account_last4,
        amount_inr: parsedData.amount_inr,
        type: parsedData.type,
        merchant: parsedData.merchant,
        raw_merchant: parsedData.raw_merchant,
        category: parsedData.category,
        transacted_at: txDate.toISOString(),
        day_of_week: dayNames[txDate.getDay()],
        hour_of_day: txDate.getHours(),
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
