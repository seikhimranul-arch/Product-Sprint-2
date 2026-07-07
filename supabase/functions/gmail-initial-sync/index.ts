/*
  FintLer — gmail-initial-sync v6 (complete, self-contained)

  Does everything in one function:
  1. Accepts provider_token from frontend
  2. Searches Gmail for ALL bank/fintech transaction emails (90 days)
  3. Parses each with 2-layer system: Regex first, Gemini fallback
  4. Deduplicates via source_email_id
  5. Stores transactions
  6. Generates AI insights
  7. Returns summary

  Env vars required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    GEMINI_API_KEY
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────────────────────────────────────────────────────────────────
// BANK / FINTECH SENDERS
// Comprehensive list including BNPL, wallets, and third-party payment platforms
// ─────────────────────────────────────────────────────────────────────────────
const SENDER_TO_BANK: Record<string, string> = {
  // HDFC
  "alerts@hdfcbank.net": "HDFC Bank",
  "notify@hdfcbank.net": "HDFC Bank",
  "alerts@hdfcbank.com": "HDFC Bank",
  // ICICI
  "alerts@icicibank.com": "ICICI Bank",
  "notify@icicibank.com": "ICICI Bank",
  // SBI
  "sbmops@sbi.co.in": "SBI",
  "donotreply@sbi.co.in": "SBI",
  "alerts@sbi.co.in": "SBI",
  // Axis
  "alerts@axisbank.com": "Axis Bank",
  "notify@axisbank.com": "Axis Bank",
  "alerts@axisbank.co.in": "Axis Bank",
  // Kotak
  "noreply@kotak.com": "Kotak",
  "alerts@kotak.com": "Kotak",
  // Yes Bank
  "donotreply@yesbank.in": "Yes Bank",
  "alerts@yesbank.in": "Yes Bank",
  // IndusInd
  "noreply@indusind.com": "IndusInd Bank",
  "alerts@indusind.com": "IndusInd Bank",
  // IDFC
  "noreply@idfcfirstbank.com": "IDFC First Bank",
  "alerts@idfcfirstbank.com": "IDFC First Bank",
  // PNB
  "alerts@pnb.co.in": "PNB",
  // BOB
  "alerts@bobmail.in": "Bank of Baroda",
  // Canara
  "alerts@canarabank.in": "Canara Bank",
  // RBL
  "alerts@rblbank.com": "RBL Bank",
  // Federal
  "alerts@federalbank.co.in": "Federal Bank",
  // Standard Chartered
  "alerts@sc.com": "Standard Chartered",
  // Citi
  "alerts@citibank.com": "Citibank",
  // HSBC
  "alerts@hsbcbank.co.in": "HSBC",
  // Amex
  "noreply@amex.com": "American Express",
  // UPI / Wallets
  "noreply@phonepe.com": "PhonePe",
  "noreply@paytm.com": "Paytm",
  "noreply@amazonpay.in": "Amazon Pay",
  "support@amazonpay.in": "Amazon Pay",
  // BNPL / Third-party
  "noreply@lazypay.in": "LazyPay",
  "support@lazypay.in": "LazyPay",
  "notifications@lazypay.in": "LazyPay",
  "noreply@simpl.credit": "Simpl",
  "hello@simpl.credit": "Simpl",
  "noreply@sliceit.com": "Slice",
  "support@sliceit.com": "Slice",
  "noreply@uni.cards": "Uni Cards",
  "alerts@onecard.app": "OneCard",
  "noreply@zestmoney.in": "ZestMoney",
  "noreply@kreditbee.in": "KreditBee",
  "noreply@moneyview.in": "MoneyView",
  "noreply@fibe.in": "Fibe",
  "alerts@jupiter.money": "Jupiter",
  "noreply@fi.money": "Fi Money",
  "noreply@niyo.co": "Niyo",
  "alerts@freoapp.com": "Freo",
  "noreply@bharatpe.com": "BharatPe",
  "alerts@mobikwik.com": "MobiKwik",
  "noreply@freecharge.in": "Freecharge",
  "noreply@airtelbank.com": "Airtel Payments Bank",
  "alerts@airtelbank.com": "Airtel Payments Bank",
  "noreply@jiopay.in": "Jio Payments Bank",
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY KEYWORDS
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES: Record<string, string[]> = {
  Food:          ["swiggy","zomato","dominos","pizza","kfc","mcdonald","burger","restaurant","cafe","biryani","food","blinkit","zepto","instamart","bigbasket","dunzo","grofer","haldiram"],
  Travel:        ["uber","ola","rapido","irctc","makemytrip","goibibo","indigo","spicejet","yatra","redbus","metro","railway","flight","cab","taxi","bus","fastag","petrol","fuel"],
  Shopping:      ["amazon","flipkart","myntra","nykaa","meesho","ajio","snapdeal","tatacliq","lifestyle","westside","h&m","zara","jabong","shop","store","mart","bazaar"],
  Entertainment: ["netflix","spotify","youtube","hotstar","jiocinema","prime","zee5","bookmyshow","pvr","inox","cinema","gaana","jiosaavn","apple music"],
  Utilities:     ["electricity","water","gas","broadband","wifi","airtel","jio","bsnl","vi ","tata play","dish tv","bescom","msedcl","tneb","recharge","bill pay"],
  EMI:           ["emi","loan","equated","mortgage","bajaj finserv","hdfc credila"],
  Salary:        ["salary","payroll","wages","stipend","neft credit","credited by employer"],
  Transfer:      ["neft","imps","rtgs","upi","sent to","payment to","transfer"],
  Health:        ["apollo","medplus","pharmacy","doctor","hospital","clinic","1mg","pharmeasy","practo","thyrocare","lenskart"],
  Investment:    ["mutual fund","mf ","sip","zerodha","groww","kuvera","coin","stocks","fd ","fixed deposit"],
  BNPL:          ["lazypay","simpl","slice","zestmoney","kreditbee","moneyview","fibe","uni card","onecard"],
};

function categorize(merchant: string, body: string): string {
  const s = (merchant + " " + body).toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(k => s.includes(k))) return cat;
  }
  // Person name detection (P2P UPI)
  if (merchant && /^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/.test(merchant.trim())) {
    if (!/store|shop|mart|pvt|ltd|enterprise|service/i.test(merchant)) return "Transfer";
  }
  if (merchant && /^[A-Z\s]{4,40}$/.test(merchant.trim())) {
    const words = merchant.trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      if (!/STORE|SHOP|MART|BANK|LTD|PVT/i.test(merchant)) return "Transfer";
    }
  }
  if (s.includes("upi") || s.includes("vpa") || s.includes("@")) return "Transfer";
  return "Uncategorized";
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BODY EXTRACTION — handles plain text, HTML, multipart
// ─────────────────────────────────────────────────────────────────────────────
function extractBody(payload: any): string {
  if (!payload) return "";

  const decode = (data: string) => {
    try {
      return atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    } catch { return ""; }
  };

  if (payload.body?.data) return decode(payload.body.data);

  if (payload.parts && Array.isArray(payload.parts)) {
    // Prefer plain text
    for (const p of payload.parts) {
      if (p.mimeType === "text/plain" && p.body?.data) return decode(p.body.data);
    }
    // Fall back to HTML
    for (const p of payload.parts) {
      if (p.mimeType === "text/html" && p.body?.data) {
        return htmlToText(decode(p.body.data));
      }
    }
    // Recurse multipart
    for (const p of payload.parts) {
      const r = extractBody(p);
      if (r) return r;
    }
  }
  return "";
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    // Preserve table cell content with spaces
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&rupee;|&#8377;/g, "₹")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — REGEX PARSER
// ─────────────────────────────────────────────────────────────────────────────
interface ParsedTx {
  amount: number;
  type: "debit" | "credit";
  merchant: string;
  bank_name: string;
  account_last4: string;
  transaction_date: string;
  category: string;
  source_email_id: string;
  day_of_week: string;
  hour_of_day: number;
}

function parseWithRegex(body: string, fromEmail: string, msgId: string): ParsedTx | null {
  const bank_name = SENDER_TO_BANK[fromEmail] || "Unknown Bank";

  // ── Amount ──
  const amountPatterns = [
    /(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*\.?[0-9]{0,2})/i,
    /([0-9][0-9,]+\.?[0-9]{0,2})\s*(?:Rs\.?|INR|₹)/i,
    /(?:amount|amt|sum)\s*(?:of\s*)?(?:Rs\.?|INR|₹)?\s*([0-9][0-9,]*\.?[0-9]{0,2})/i,
  ];
  let amount = 0;
  for (const pat of amountPatterns) {
    const m = body.match(pat);
    if (m) {
      amount = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(amount) && amount > 0) break;
    }
  }
  if (!amount) return null;

  // ── Type ──
  const lower = body.toLowerCase();
  const type: "debit" | "credit" =
    lower.match(/\b(credited|credit of|received|deposited|refund|cashback|reversed)\b/) ? "credit" : "debit";

  // ── Account last 4 ──
  let account_last4 = "";
  const acMatch = body.match(/(?:a\/c|account|card|acct)(?:\s+no\.?)?(?:\s+ending)?(?:\s+in)?\s*[*Xx]+(\d{4})/i)
    || body.match(/[xX*]{2,}(\d{4})/);
  if (acMatch) account_last4 = acMatch[1];

  // ── Merchant — multi-pattern extraction ──
  let rawMerchant = "";

  // Pattern 1: "to VPA@upi" or "to NAME@bank"
  const vpaMatch = body.match(/\b(?:to|at)\s+([A-Za-z0-9][A-Za-z0-9._-]{2,}@[A-Za-z0-9]+)/i);
  if (vpaMatch) rawMerchant = vpaMatch[1].split("@")[0];

  // Pattern 2: "Info: MERCHANT NAME"
  if (!rawMerchant) {
    const infoMatch = body.match(/(?:Info|Remarks|Narration|Description)\s*[:\-]\s*([^\n\r.;,]{3,60})/i);
    if (infoMatch) rawMerchant = infoMatch[1].trim();
  }

  // Pattern 3: "at MERCHANT on DD-Mon"
  if (!rawMerchant) {
    const atMatch = body.match(/\bat\s+([A-Z][A-Za-z0-9\s&'-]{2,40}?)(?:\s+on\s+\d|\s+for\s+|\s+via\s+|\.)/);
    if (atMatch) rawMerchant = atMatch[1].trim();
  }

  // Pattern 4: "to NAME" (capitalized proper noun)
  if (!rawMerchant) {
    const toMatch = body.match(/\bto\s+([A-Z][A-Za-z0-9\s&'-]{2,40}?)(?:\s+on\s+|\s+for\s+|\s+via\s+|\.|\n)/);
    if (toMatch) rawMerchant = toMatch[1].trim();
  }

  // Pattern 5: "by MERCHANT" (debit card swipe)
  if (!rawMerchant) {
    const byMatch = body.match(/\bby\s+([A-Z][A-Z0-9\s&]{3,40}?)(?:\s+on\s+|\.|,|\n)/);
    if (byMatch) rawMerchant = byMatch[1].trim();
  }

  // Pattern 6: UPI ref in body
  if (!rawMerchant) {
    const upiMatch = body.match(/(?:UPI|VPA)\s*[-:]?\s*([a-z0-9._-]+@[a-z]+)/i);
    if (upiMatch) rawMerchant = upiMatch[1].split("@")[0];
  }

  if (!rawMerchant || rawMerchant.length < 2) return null;

  // ── Date ──
  let txDate = new Date();
  const months: Record<string, number> = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
  };

  // DD-Mon-YYYY HH:MM
  const dmy = body.match(/(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm))?)?/);
  if (dmy) {
    const dd = parseInt(dmy[1], 10);
    const mm = months[dmy[2].toLowerCase().substring(0, 3)];
    let yr = parseInt(dmy[3], 10);
    if (yr < 100) yr += 2000;
    let hh = dmy[4] ? parseInt(dmy[4], 10) : 0;
    const min = dmy[5] ? parseInt(dmy[5], 10) : 0;
    if (dmy[7]?.toLowerCase() === "pm" && hh < 12) hh += 12;
    if (dmy[7]?.toLowerCase() === "am" && hh === 12) hh = 0;
    const d = new Date(yr, mm ?? 0, dd, hh, min);
    if (!isNaN(d.getTime())) txDate = d;
  }

  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const merchant = rawMerchant.trim();

  return {
    amount,
    type,
    merchant,
    bank_name,
    account_last4,
    transaction_date: txDate.toISOString(),
    category: categorize(merchant, body),
    source_email_id: msgId,
    day_of_week: days[txDate.getDay()],
    hour_of_day: txDate.getHours(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — GEMINI FALLBACK PARSER
// ─────────────────────────────────────────────────────────────────────────────
async function parseWithGemini(
  body: string,
  fromEmail: string,
  msgId: string,
  apiKey: string
): Promise<ParsedTx | null> {
  const snippet = body.substring(0, 2500);
  const prompt = `You are an expert parser for Indian bank and fintech transaction alert emails.

Email sender: ${fromEmail}
Email body:
"""
${snippet}
"""

Extract the transaction. Return ONLY a JSON object, no markdown:
{
  "amount": <number without symbols or commas>,
  "type": "debit" or "credit",
  "merchant": "<clean lowercase name, e.g. swiggy, lazypay, amazon>",
  "account_last4": "<4 digits or empty string>",
  "date_iso": "<ISO datetime e.g. 2026-07-01T14:30:00>",
  "category": "<one of: Food, Travel, Shopping, Entertainment, Utilities, EMI, Salary, Transfer, Health, Investment, BNPL, Uncategorized>"
}

If this is NOT a transaction alert, return: {"error":"not_a_transaction"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const p = JSON.parse(match[0]);
    if (p.error || !p.amount) return null;

    const txDate = p.date_iso ? new Date(p.date_iso) : new Date();
    const validDate = isNaN(txDate.getTime()) ? new Date() : txDate;
    const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

    return {
      amount: Number(p.amount),
      type: p.type === "credit" ? "credit" : "debit",
      merchant: (p.merchant || "unknown").toLowerCase(),
      bank_name: SENDER_TO_BANK[fromEmail] || "Unknown Bank",
      account_last4: p.account_last4 || "",
      transaction_date: validDate.toISOString(),
      category: p.category || "Uncategorized",
      source_email_id: msgId,
      day_of_week: days[validDate.getDay()],
      hour_of_day: validDate.getHours(),
    };
  } catch (e) {
    console.error("[GEMINI] Parse error:", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI INSIGHT GENERATION
// ─────────────────────────────────────────────────────────────────────────────
async function generateInsights(txs: ParsedTx[], apiKey: string) {
  const debits = txs.filter(t => t.type === "debit");
  const total = debits.reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  const byMerchant: Record<string, number> = {};

  for (const t of debits) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    byDay[t.day_of_week] = (byDay[t.day_of_week] || 0) + t.amount;
    byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount;
  }

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const topMerchants = Object.entries(byMerchant).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const fallback = {
    spending_personality: "Steady Spender",
    personality_description: "You have consistent spending habits.",
    summary: `You spent ₹${Math.round(total).toLocaleString("en-IN")} across ${debits.length} transactions.`,
    category_alert_title: topCategory ? `${topCategory[0]} takes a big chunk` : "Review your spending",
    category_alert_amount: topCategory ? Math.round(topCategory[1]) : 0,
    category_alert_category: topCategory?.[0] || "Uncategorized",
    behavioral_trigger: "Pattern Detected",
    behavioral_trigger_detail: "Check your dashboard for detailed patterns.",
    micro_goal: "Try a no-spend day this week.",
  };

  try {
    const prompt = `You are FintLer — a warm, non-judgmental AI financial clarity engine for Indian millennials. NEVER shame the user. Use empowering, curious language.

Transaction data (last 90 days):
- Total spent: ₹${Math.round(total).toLocaleString("en-IN")}
- Transactions: ${debits.length}
- By category: ${JSON.stringify(byCategory)}
- By day: ${JSON.stringify(byDay)}
- Top merchants: ${JSON.stringify(topMerchants)}

Return ONLY valid JSON (no markdown fences):
{
  "spending_personality": "<2-3 word persona e.g. Weekend Warrior, Foodie Explorer, Midnight Snacker, Subscription Hoarder, BNPL Navigator>",
  "personality_description": "<one warm sentence>",
  "summary": "<one sentence with rupee amount and insight>",
  "category_alert_title": "<short non-judgmental title>",
  "category_alert_amount": <number>,
  "category_alert_category": "<category name>",
  "behavioral_trigger": "<label like Moment of Impact or Pattern Detected>",
  "behavioral_trigger_detail": "<specific day/time pattern observation>",
  "micro_goal": "<ONE small specific actionable tip>"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return { ...fallback, ...parsed };
    }
  } catch (e) {
    console.error("[GEMINI] Insights error:", e);
  }
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[SYNC] Start:", new Date().toISOString());

  try {
    const body = await req.json();
    const { user_id, provider_token, provider_refresh_token } = body;

    if (!user_id) throw new Error("Missing user_id");
    if (!provider_token) {
      return new Response(
        JSON.stringify({ success: false, error: "No Gmail token. Please sign out and sign in again.", action: "reauth" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured in Edge Function secrets");

    // ── Store tokens ──
    await supabase.from("profiles").update({
      gmail_sync_enabled: true,
      gmail_access_token: provider_token,
      gmail_refresh_token: provider_refresh_token || "",
      gmail_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", user_id);

    // ── Build Gmail search query ──
    const senders = Object.keys(SENDER_TO_BANK);
    const fromQuery = senders.map(s => `from:${s}`).join(" OR ");
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const after = Math.floor(ninetyDaysAgo.getTime() / 1000);
    const query = `(${fromQuery}) after:${after}`;

    console.log(`[SYNC] Searching Gmail with ${senders.length} known senders`);

    // ── Search Gmail ──
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=500`,
      { headers: { Authorization: `Bearer ${provider_token}` } }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("[SYNC] Gmail search failed:", searchRes.status, errText);
      if (searchRes.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: "Gmail token expired. Sign out and sign in again.", action: "reauth" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gmail API error ${searchRes.status}: ${errText.substring(0, 300)}`);
    }

    const searchData = await searchRes.json();
    const messages: { id: string }[] = searchData.messages || [];
    console.log(`[SYNC] Found ${messages.length} emails`);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total: 0,
          parsed: 0,
          message: "No bank transaction emails found in last 90 days. Make sure you have bank alert emails in your inbox.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch messages already processed (for dedup) ──
    const { data: existingRows } = await supabase
      .from("transactions")
      .select("source_email_id")
      .eq("user_id", user_id)
      .not("source_email_id", "is", null);

    const processedIds = new Set((existingRows || []).map((r: any) => r.source_email_id));
    const newMessages = messages.filter(m => !processedIds.has(m.id));
    console.log(`[SYNC] ${newMessages.length} new emails to process (${messages.length - newMessages.length} already in DB)`);

    // ── Process emails ──
    const transactions: ParsedTx[] = [];
    let regexCount = 0, geminiCount = 0, skipCount = 0;

    for (const msg of newMessages) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${provider_token}` } }
        );
        if (!msgRes.ok) { skipCount++; continue; }

        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        const fromRaw = headers.find((h: any) => h.name === "From")?.value || "";
        const fromEmail = (fromRaw.match(/<([^>]+)>/) || ["", fromRaw])[1].toLowerCase().trim();

        const emailBody = extractBody(msgData.payload);
        if (!emailBody || emailBody.length < 20) { skipCount++; continue; }

        // Layer 1: Regex
        let parsed = parseWithRegex(emailBody, fromEmail, msg.id);
        if (parsed) {
          regexCount++;
        } else {
          // Layer 2: Gemini
          parsed = await parseWithGemini(emailBody, fromEmail, msg.id, geminiKey);
          if (parsed) geminiCount++;
          else { skipCount++; continue; }
        }

        transactions.push(parsed);
      } catch (e) {
        console.error(`[SYNC] Error processing ${msg.id}:`, e);
        skipCount++;
      }
    }

    console.log(`[SYNC] Parsed: ${regexCount} regex + ${geminiCount} gemini = ${transactions.length} total, ${skipCount} skipped`);

    // ── Insert transactions ──
    let inserted = 0;
    if (transactions.length > 0) {
      const rows = transactions.map(t => ({
        user_id,
        source_email_id: t.source_email_id,
        bank_name: t.bank_name,
        account_last4: t.account_last4,
        amount: t.amount,
        type: t.type,
        merchant: t.merchant,
        category: t.category,
        description: t.merchant,
        transaction_date: t.transaction_date,
        day_of_week: t.day_of_week,
        hour_of_day: t.hour_of_day,
      }));

      const { error: insertErr, count } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "user_id,source_email_id", ignoreDuplicates: true, count: "exact" });

      if (insertErr) {
        console.error("[SYNC] Insert error:", insertErr);
        throw insertErr;
      }
      inserted = count || transactions.length;
      console.log(`[SYNC] Inserted ${inserted} transactions`);
    }

    // ── Generate insights (only if we have transactions) ──
    let insights = null;
    try {
      // Get ALL user transactions for richer insights
      const { data: allTxs } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user_id)
        .eq("type", "debit")
        .order("transaction_date", { ascending: false })
        .limit(300);

      if (allTxs && allTxs.length > 0) {
        const txsForInsights = allTxs.map((t: any) => ({
          amount: parseFloat(t.amount),
          type: t.type,
          merchant: t.merchant || "",
          bank_name: t.bank_name || "",
          account_last4: t.account_last4 || "",
          transaction_date: t.transaction_date,
          category: t.category || "Uncategorized",
          source_email_id: t.source_email_id || "",
          day_of_week: t.day_of_week || "monday",
          hour_of_day: t.hour_of_day || 12,
        }));

        insights = await generateInsights(txsForInsights, geminiKey);

        // Delete old insights for this user, insert fresh
        await supabase.from("insights").delete().eq("user_id", user_id);
        await supabase.from("insights").insert({
          user_id,
          spending_personality: insights.spending_personality,
          personality_description: insights.personality_description,
          summary: insights.summary,
          category_alert_title: insights.category_alert_title,
          category_alert_amount: insights.category_alert_amount,
          category_alert_category: insights.category_alert_category,
          behavioral_trigger: insights.behavioral_trigger,
          behavioral_trigger_detail: insights.behavioral_trigger_detail,
          micro_goal: insights.micro_goal,
          raw_ai_response: insights,
        });

        // Update spending_personality on profile
        await supabase.from("profiles").update({
          spending_personality: insights.spending_personality,
        }).eq("id", user_id);
      }
    } catch (insightErr) {
      console.error("[SYNC] Insights generation failed (non-fatal):", insightErr);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[SYNC] Done in ${elapsed}s`);

    return new Response(
      JSON.stringify({
        success: true,
        total: messages.length,
        new_emails: newMessages.length,
        parsed: transactions.length,
        inserted,
        regex: regexCount,
        gemini: geminiCount,
        skipped: skipCount,
        insights,
        elapsed_seconds: parseFloat(elapsed),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[SYNC] Fatal error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
