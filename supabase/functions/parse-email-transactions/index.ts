/*
  FintLer — parse-email-transactions Edge Function (v3 — production grade)

  Parsing strategy built from real Indian bank email analysis:
  
  HDFC:  "Rs.27.00 is debited from your account ending 7971 towards VPA 
          gpay-12190483287@okbizaxis (AKSHAY PROVISION STORE) on 01-06-26."
  ICICI: "Your a/c XX1234 is debited with Rs.500.00 on 01-Jun-26. 
          Info: UPI/ref/Swiggy/swiggy@icici"
  SBI:   "Your SBI a/c is debited by Rs.500 on 01/06/26 by transfer to 
          VPA merchant@upi (MERCHANT NAME)"
  Axis:  "INR 500.00 debited from A/c XX1234 on 01-Jun-26 trf to 
          VPA/merchant@upi/MERCHANT NAME/REF"
  Kotak: "Rs.500.00 has been debited from Kotak Bank a/c XX1234 on 01-Jun-26
          towards VPA merchant@upi (MERCHANT)"
  
  KEY INSIGHT: Every UPI transaction puts the human-readable merchant name
  in PARENTHESES after the VPA address. This is the canonical pattern.
  
  Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const PARSE_SYSTEM_PROMPT = `You are a financial data extraction AI for Indian bank transaction alert emails.
Extract the transaction details and return STRICT JSON with these exact keys:
{
  "amount": number (just the number, no currency symbol, no commas. e.g. 27.00),
  "type": "debit" or "credit",
  "merchant": "Clean business name only. If UPI, extract name from parentheses e.g. (AKSHAY PROVISION STORE) → AKSHAY PROVISION STORE. Strip VPA/UPI IDs.",
  "description": "Full original transaction description as-is from the email",
  "category": one of ["Food", "Travel", "Shopping", "Utilities", "Transfer", "EMI", "Salary", "Uncategorized"],
  "transaction_date": "ISO 8601 format if date found, else null"
}
Rules:
- For UPI: merchant name is usually in parentheses AFTER the VPA address
- For NEFT/IMPS: merchant is the beneficiary name  
- For credit card: merchant is the shop/service name
- If merchant is just a UPI ID like abc@upi, use the part before @ and title-case it
- Return ONLY valid JSON, no markdown fences, no explanation.`;

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface ParsedData {
  amount: number;
  merchant: string | null;
  description: string | null;
  type: "debit" | "credit";
  category: string;
  transaction_date: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AMOUNT EXTRACTOR — handles Rs.27.00, Rs 27.00, INR 27.00, INR27.00
// ─────────────────────────────────────────────────────────────────────────────
function extractAmount(text: string): number | null {
  const m = text.match(/(?:Rs\.?|INR\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (!m) return null;
  const val = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(val) ? null : val;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXTRACTOR — debit or credit
// ─────────────────────────────────────────────────────────────────────────────
function extractType(text: string): "debit" | "credit" | null {
  const lower = text.toLowerCase();
  if (lower.includes("debited") || lower.includes("debit")) return "debit";
  if (lower.includes("credited") || lower.includes("credit")) return "credit";
  if (lower.includes("withdrawn") || lower.includes("spent") || lower.includes("paid")) return "debit";
  if (lower.includes("received") || lower.includes("deposited") || lower.includes("salary")) return "credit";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MERCHANT EXTRACTOR — layered extraction
// Handles the 4 real-world patterns found in Indian bank emails
// ─────────────────────────────────────────────────────────────────────────────
function extractMerchant(text: string): string | null {
  // PATTERN 1 (Most common — UPI): Merchant name in parentheses after VPA
  // "towards VPA gpay-12190483287@okbizaxis (AKSHAY PROVISION STORE)"
  // "from VPA abc@upi (JOHN DOE)"
  const parenthesesAfterVpa = text.match(/(?:VPA|UPI)[:\s]+[^\s(,]+\s+\(([^)]{3,60})\)/i);
  if (parenthesesAfterVpa) return parenthesesAfterVpa[1].trim();

  // PATTERN 2: Any parenthesized name that looks like a merchant (ALL CAPS or Title Case)
  // "transferred to (AMAZON SELLER SERVICES)"
  const anyParentheses = text.match(/\(([A-Z][A-Z\s&'.-]{3,50})\)/);
  if (anyParentheses) return anyParentheses[1].trim();

  // PATTERN 3: After "Info:" — ICICI/Axis format
  // "Info: UPI/216678350643/AKSHAY PROVISION STORE/gpay@upi"
  // Extract the name segment (3rd part when split by /)
  const infoMatch = text.match(/Info[:\s]+(?:UPI\/[^/]+\/([^/\n\r]{3,60})|([^\n\r,]{3,50}))/i);
  if (infoMatch) {
    const name = (infoMatch[1] || infoMatch[2] || "").trim();
    // Filter out if it's just a UPI ID
    if (name && !name.includes("@") && name.length > 3) return name;
  }

  // PATTERN 4: "towards/for/to" followed by merchant (non-VPA)
  // "towards HDFC CREDITCARD AUTOPAY" or "for Netflix subscription"
  const towardsMatch = text.match(/(?:towards|for|trf to|transfer to)\s+(?!VPA|UPI|A\/c|account)([A-Za-z][^\n\r,@]{3,50})/i);
  if (towardsMatch) {
    const candidate = towardsMatch[1].trim();
    // Don't return if it looks like an account number or VPA
    if (!candidate.match(/\d{4,}/) && !candidate.includes("@")) return candidate;
  }

  // PATTERN 5: VPA with no parentheses — extract readable part from UPI handle
  // "gpay-12190483287@okbizaxis" → "Okbizaxis"
  // "swiggy@ybl" → "Swiggy"
  const vpaMatch = text.match(/(?:VPA|UPI)[:\s]+([a-zA-Z0-9.\-_]+)@([a-zA-Z0-9]+)/i);
  if (vpaMatch) {
    const handle = vpaMatch[2]; // The part after @
    const prefix = vpaMatch[1].replace(/[0-9\-_]/g, ""); // Letters only before @
    const readable = prefix.length > 2 ? prefix : handle;
    return readable.charAt(0).toUpperCase() + readable.slice(1).toLowerCase();
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────
function extractDate(text: string): string | null {
  const patterns = [
    // DD-MM-YY or DD-MM-YYYY (HDFC format: "01-06-26")
    /(\d{2})-(\d{2})-(\d{2,4})/,
    // DD/MM/YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
    // DD-MMM-YY or DD-MMM-YYYY (ICICI: "01-Jun-26")
    /(\d{1,2})[\s-]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s-]+(\d{2,4})/i,
    // YYYY-MM-DD
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      try {
        const raw = m[0];
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
          return d.toISOString();
        }
        // Handle 2-digit year (26 → 2026)
        if (m[3] && m[3].length === 2) {
          const fullYear = parseInt(m[3]) + 2000;
          // DD-MM-YYYY
          if (m[1] && m[2]) {
            const constructed = new Date(`${fullYear}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
            if (!isNaN(constructed.getTime())) return constructed.toISOString();
          }
        }
      } catch (_) {}
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY INFERENCE
// ─────────────────────────────────────────────────────────────────────────────
function inferCategory(merchant: string | null, text: string): string {
  const s = (merchant || text).toLowerCase();

  if (s.match(/swiggy|zomato|domino|mcdonald|kfc|blinkit|grofer|bigbasket|dunzo|zepto|instamart|restaurant|food|cafe|dhaba|pizza|burger/)) return "Food";
  if (s.match(/uber|ola|rapido|irctc|makemytrip|goibibo|indigo|spicejet|yatra|redbus|metro|railway|flight|cab|taxi|bus/)) return "Travel";
  if (s.match(/amazon|flipkart|myntra|nykaa|meesho|ajio|snapdeal|shopping|mart|store|shop|bazaar/)) return "Shopping";
  if (s.match(/netflix|spotify|youtube|hotstar|jiocinema|prime|zee5|airtel|vodafone|jio|bsnl|vi|recharge|electricity|gas|water|bill|utility|broadband/)) return "Utilities";
  if (s.match(/emi|loan|equated|hdfc bank|axis bank|icici bank|sbi|kotak|mortgage|insurance|premium/)) return "EMI";
  if (s.match(/salary|payroll|wages|neft credit|stipend/)) return "Salary";
  if (s.match(/neft|imps|rtgs|transfer|upi|sent|payment to/)) return "Transfer";

  return "Uncategorized";
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZE MERCHANT — clean up and recognize known brands
// ─────────────────────────────────────────────────────────────────────────────
function normalizeMerchant(raw: string): string {
  const s = raw.toLowerCase();
  const known: Record<string, string> = {
    swiggy: "Swiggy", zomato: "Zomato", blinkit: "Blinkit",
    bigbasket: "BigBasket", dunzo: "Dunzo", zepto: "Zepto",
    uber: "Uber", ola: "Ola", rapido: "Rapido",
    amazon: "Amazon", flipkart: "Flipkart", myntra: "Myntra",
    nykaa: "Nykaa", meesho: "Meesho", ajio: "Ajio",
    netflix: "Netflix", spotify: "Spotify", hotstar: "Hotstar",
    youtube: "YouTube Premium", jiocinema: "JioCinema",
    irctc: "IRCTC", makemytrip: "MakeMyTrip", goibibo: "Goibibo",
    paytm: "Paytm", phonepe: "PhonePe",
  };

  for (const [key, value] of Object.entries(known)) {
    if (s.includes(key)) return value;
  }

  // Title case fallback
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN REGEX PARSER — uses modular extractors above
// ─────────────────────────────────────────────────────────────────────────────
function regexParse(body: string): ParsedData | null {
  const amount = extractAmount(body);
  const type = extractType(body);

  // Both required fields must be present
  if (!amount || !type) return null;

  const rawMerchant = extractMerchant(body);
  const merchant = rawMerchant ? normalizeMerchant(rawMerchant) : null;
  const category = inferCategory(merchant || rawMerchant, body);
  const transaction_date = extractDate(body);

  return {
    amount,
    type,
    merchant,
    description: rawMerchant || null,
    category,
    transaction_date,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI AI FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
async function aiParse(body: string, geminiKey: string): Promise<ParsedData | null> {
  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: PARSE_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: body.substring(0, 8000) }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      console.error("Gemini error:", await res.text());
      return null;
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(rawText);

    if (!parsed.amount || !parsed.type) return null;

    return {
      amount: parseFloat(String(parsed.amount)),
      type: parsed.type === "credit" ? "credit" : "debit",
      merchant: parsed.merchant || null,
      description: parsed.description || null,
      category: parsed.category || "Uncategorized",
      transaction_date: parsed.transaction_date || null,
    };
  } catch (e) {
    console.error("AI parse error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Not authenticated." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return jsonRes({ error: "Invalid session." }, 401);

    const { raw_email_body, bank_domain, source_email_id, user_id } = await req.json();
    if (!raw_email_body) return jsonRes({ error: "Missing email body." }, 400);

    const targetUserId = user_id || user.id;

    // Dedup
    if (source_email_id) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("source_email_id", source_email_id)
        .single();
      if (existing) return jsonRes({ success: true, skipped: true, reason: "already_parsed" });
    }

    // Layer 1: Regex
    let parsedData = regexParse(raw_email_body);
    let method = "regex";

    console.log(`Parsing email from ${bank_domain}. Regex result:`, parsedData ? `amount=${parsedData.amount} type=${parsedData.type} merchant=${parsedData.merchant}` : "null");

    // Layer 2: Gemini AI fallback
    if (!parsedData) {
      method = "ai";
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        parsedData = await aiParse(raw_email_body, geminiKey);
        console.log("AI parse result:", parsedData ? `amount=${parsedData.amount} merchant=${parsedData.merchant}` : "null");
      }
    }

    if (!parsedData || !parsedData.amount || !parsedData.type) {
      console.log("Could not parse email — skipping");
      return jsonRes({ success: false, skipped: true, reason: "unparseable" });
    }

    // Use extracted date or now
    let txDate: Date;
    if (parsedData.transaction_date) {
      txDate = new Date(parsedData.transaction_date);
      if (isNaN(txDate.getTime())) txDate = new Date();
    } else {
      txDate = new Date();
    }

    const { error: insertErr } = await supabase
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
      });

    if (insertErr) {
      if (insertErr.code === "23505") return jsonRes({ success: true, skipped: true, reason: "duplicate" });
      console.error("DB insert error:", insertErr);
      return jsonRes({ error: "DB insert failed.", detail: insertErr.message }, 500);
    }

    return jsonRes({ success: true, method, amount: parsedData.amount, merchant: parsedData.merchant });

  } catch (err) {
    console.error("parse-email-transactions error:", err);
    return jsonRes({ error: "Internal server error.", detail: String(err) }, 500);
  }
});

function jsonRes(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
