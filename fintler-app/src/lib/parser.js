/**
 * FintLer — Multi-format Transaction Parser
 * Parses user-uploaded text, CSV, Notion pages, markdown, and notes
 * into structured transaction objects.
 */

// ── Category detection keywords ──
const CAT_KEYWORDS = {
  food: ["swiggy", "zomato", "food", "restaurant", "cafe", "coffee", "starbucks", "chai", "pizza", "burger", "lunch", "dinner", "breakfast", "meal", "eatery", "domino", "pizza hut", "mcd", "kfc", "subway", "biryani", "order"],
  transport: ["uber", "ola", "rapido", "metro", "bus", "auto", "cab", "taxi", "ride", "fuel", "petrol", "diesel", "parking", "toll", "flight", "train"],
  shopping: ["amazon", "flipkart", "myntra", "nykaa", "ajio", "meesho", "decathlon", "shopping", "clothes", "shoes", "electronics", "furniture"],
  groceries: ["bigbasket", "dmart", "zepto", "blinkit", "instamart", "grocery", "vegetables", "fruits", "supermarket", "kirana"],
  subscriptions: ["netflix", "spotify", "hotstar", "prime", "youtube", "disney", "sony liv", "zee5", "jio cinema", "subscription", "membership"],
  utilities: ["electricity", "water", "gas", "broadband", "wifi", "recharge", "jio", "airtel", "vi", "bsnl", "bescom", "bill"],
  emi: ["emi", "loan", "hdfc", "icici", "sbi", "auto debit", "installment", "repayment"],
  health: ["pharmacy", "medicine", "doctor", "hospital", "apollo", "practo", "medical", "health", "gym", "fitness"],
  entertainment: ["movie", "pvr", "inox", "bookmyshow", "concert", "event", "game", "play"],
  transfer: ["upi", "phonepe", "gpay", "google pay", "paytm", "transfer", "sent to", "paid to"],
  salary: ["salary", "credit", "income", "wages", "stipend"],
};

// ── Amount patterns ──
const AMOUNT_PATTERNS = [
  /₹\s?([\d,]+(?:\.\d{1,2})?)/g,                    // ₹1,234 or ₹ 1234.50
  /rs\.?\s?([\d,]+(?:\.\d{1,2})?)/gi,                 // Rs. 1234 or RS 1234
  /inr\s?([\d,]+(?:\.\d{1,2})?)/gi,                   // INR 1234
  /([\d,]+(?:\.\d{1,2})?)\s?(?:rs|inr|rupees)/gi,    // 1234 Rs
  /\b([\d,]+(?:\.\d{1,2})?)\s?(?:\/-|\/-)/g,         // 1234/-
];

// ── Date patterns ──
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g,     // DD/MM/YYYY
  /(\d{1,2})\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s?(\d{2,4})?/gi, // 15 Jan 2025
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s?(\d{1,2})(?:st|nd|rd|th)?,?\s?(\d{2,4})?/gi, // Jan 15, 2025
  /(today|yesterday|last\s?(?:friday|saturday|sunday|monday|tuesday|wednesday|thursday))/gi,
  /(\d{1,2})\s?(days?\s?ago)/gi,
];

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// ── Helpers ──
function extractAmount(line) {
  for (const pattern of AMOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0 && num < 10000000) return num;
    }
  }
  // Fallback: standalone large numbers (>= 10)
  const fallback = line.match(/\b([\d,]{2,}(?:\.\d{1,2})?)\b/);
  if (fallback) {
    const num = parseFloat(fallback[1].replace(/,/g, ""));
    if (!isNaN(num) && num >= 10 && num < 10000000) return num;
  }
  return null;
}

function detectCategory(line) {
  const lower = line.toLowerCase();
  let bestCat = "misc";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const score = kw.length;
        if (score > bestScore) { bestScore = score; bestCat = cat; }
      }
    }
  }
  return bestCat;
}

function extractDate(line) {
  // Try explicit date patterns
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (match) {
      const full = match[0].toLowerCase();
      if (full.includes("today")) return new Date().toISOString();
      if (full.includes("yesterday")) {
        const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString();
      }
      if (full.match(/\d+\s*days?\s*ago/)) {
        const days = parseInt(match[1]);
        const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
      }
      // Month name pattern
      const monthMatch = full.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
      if (monthMatch) {
        const month = MONTH_MAP[monthMatch[1].slice(0, 3)];
        const day = parseInt(match[2]) || 1;
        const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
        return new Date(year, month, day).toISOString();
      }
      // Numeric DD/MM/YYYY
      const numMatch = match[0].match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
      if (numMatch) {
        const day = parseInt(numMatch[1]);
        const month = parseInt(numMatch[2]) - 1;
        const year = numMatch[3].length === 2 ? 2000 + parseInt(numMatch[3]) : parseInt(numMatch[3]);
        return new Date(year, month, day).toISOString();
      }
    }
  }
  return new Date().toISOString();
}

function extractMerchant(line, amount, category) {
  // Remove amount and date portions, clean up
  let cleaned = line
    .replace(/₹\s?[\d,]+(?:\.\d{1,2})?/g, "")
    .replace(/rs\.?\s?[\d,]+(?:\.\d{1,2})?/gi, "")
    .replace(/inr\s?[\d,]+(?:\.\d{1,2})?/gi, "")
    .replace(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/g, "")
    .replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s?\d{1,2}(?:st|nd|rd|th)?,?\s?\d{0,4}/gi, "")
    .replace(/today|yesterday|\d+\s*days?\s*ago/gi, "")
    .replace(/[-–—|/,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove common prefixes
  cleaned = cleaned.replace(/^(spent|paid|bought|ordered|booked|purchase|txn|transaction|trans|entry)\s*/gi, "");

  if (cleaned.length < 2) {
    // Fallback: use category as merchant
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function classifyType(line) {
  const lower = line.toLowerCase();
  if (/\b(credit|received|salary|income|credited|inflow|earned)\b/.test(lower)) return "credit";
  if (/\b(debit|spent|paid|bought|ordered|booked|purchase|outflow)\b/.test(lower)) return "debit";
  return "debit"; // default
}

// ── Main Parser ──
export function parseTransactions(text, filename = "") {
  if (!text || typeof text !== "string") return [];

  const ext = filename.split(".").pop().toLowerCase();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // CSV parsing
  if (ext === "csv" || (lines[0] && lines[0].includes(","))) {
    return parseCSV(lines);
  }

  // JSON parsing
  if (ext === "json" || text.trim().startsWith("[")) {
    return parseJSON(text);
  }

  // Line-by-line text parsing (works for Notion, markdown, plain text, notes)
  return parseTextLines(lines);
}

function parseCSV(lines) {
  const transactions = [];
  // Skip header if it looks like one
  const startIdx = /date|merchant|amount|category|desc/i.test(lines[0]) ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    if (cols.length < 2) continue;

    // Try to find amount in any column
    let amount = null;
    let amountIdx = -1;
    for (let j = 0; j < cols.length; j++) {
      const num = parseFloat(cols[j].replace(/[₹,Rs.INR\s]/g, ""));
      if (!isNaN(num) && num > 0 && num < 10000000) { amount = num; amountIdx = j; break; }
    }
    if (!amount) continue;

    // Date is usually first column
    const dateStr = cols[0];
    const date = dateStr.match(/\d/) ? extractDate(dateStr) : new Date().toISOString();

    // Merchant is usually the column after amount or the longest text column
    let merchant = "";
    for (let j = 0; j < cols.length; j++) {
      if (j !== amountIdx && cols[j].length > merchant.length && !cols[j].match(/^\d/)) {
        merchant = cols[j];
      }
    }
    if (!merchant) merchant = "Unknown";

    const line = cols.join(" ");
    const category = detectCategory(line);
    const type = classifyType(line);

    transactions.push({
      id: `upload-${Date.now()}-${i}`,
      amount,
      merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
      category,
      type,
      date,
      raw: lines[i],
    });
  }
  return transactions;
}

function parseJSON(text) {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    return arr.filter(Boolean).map((item, i) => ({
      id: `upload-${Date.now()}-${i}`,
      amount: parseFloat(item.amount) || extractAmount(JSON.stringify(item)) || 0,
      merchant: item.merchant || item.name || item.description || "Unknown",
      category: item.category || detectCategory(JSON.stringify(item)),
      type: item.type || classifyType(JSON.stringify(item)),
      date: item.date || item.transacted_at || new Date().toISOString(),
      raw: JSON.stringify(item),
    })).filter((t) => t.amount > 0);
  } catch { return []; }
}

function parseTextLines(lines) {
  const transactions = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
      .replace(/^[-*•✅❌➡→]\s*/, "")  // bullet points
      .replace(/^\d+[.)]\s*/, "")       // numbered lists
      .replace(/^#+\s*/, "")            // markdown headers
      .replace(/\*\*|__/g, "")          // bold markers
      .trim();

    if (line.length < 3) continue;

    const amount = extractAmount(line);
    if (!amount) continue;

    const category = detectCategory(line);
    const type = classifyType(line);
    const date = extractDate(line);
    const merchant = extractMerchant(line, amount, category);

    transactions.push({
      id: `upload-${Date.now()}-${i}`,
      amount,
      merchant,
      category,
      type,
      date,
      raw: lines[i],
    });
  }
  return transactions;
}

// ── Format detection ──
export function detectFormat(filename, content) {
  const ext = filename.split(".").pop().toLowerCase();
  if (ext === "csv") return "CSV";
  if (ext === "json") return "JSON";
  if (ext === "md" || ext === "markdown") return "Markdown";
  if (ext === "txt" || ext === "text") return "Plain Text";
  if (content.trim().startsWith("[")) return "JSON";
  if (content.includes(",") && /date|amount|merchant/i.test(content.split("\n")[0] || "")) return "CSV";
  return "Text";
}

// ── Example formats for help text ──
export const EXAMPLE_FORMATS = [
  {
    label: "Simple text lines",
    example: `Swiggy order ₹780
Uber ride ₹320 yesterday
Netflix subscription ₹649
Salary credited ₹85,000
BigBasket groceries ₹1,850 3 days ago`,
  },
  {
    label: "CSV format",
    example: `date,merchant,amount,category
2025-07-20,Swiggy,780,food
2025-07-19,Uber,320,transport
2025-07-18,Netflix,649,subscriptions`,
  },
  {
    label: "Notion / markdown",
    example: `- Spent ₹780 on Swiggy food order
- Paid ₹320 for Uber ride
- **Netflix** ₹649 monthly
- ✅ Salary ₹85,000 credited
- 🛒 BigBasket ₹1,850 groceries`,
  },
  {
    label: "Natural notes",
    example: `I ordered food from Swiggy for 780 rupees
Took an Uber to office, cost 320
Paid 649 for Netflix this month
Got salary of 85000 today
Bought groceries from BigBasket for 1850`,
  },
];
