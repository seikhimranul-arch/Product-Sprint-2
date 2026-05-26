/*
  FintLer — generate-insights Edge Function
  
  Reads the authenticated user's last 90 days of parsed transactions from the
  `transactions` table, sends them to Gemini AI for behavioral analysis, and
  writes the structured output into the `insights` table. Also assigns/updates
  the user's Spending Personality in the `profiles` table.
  
  Triggered by:
    - Syncing.jsx (after initial email sync)
    - gmail-pubsub-webhook (after each new transaction is parsed)
    - Dashboard.jsx "Refresh Insights" button
  
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

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SPENDING_PERSONALITIES = [
  "The Weekend Warrior",
  "The Midnight Snacker",
  "The Subscription Hoarder",
  "The Stress Spender",
  "The Mindful Spender",
  "The Impulse Buyer",
  "The Social Splurger",
  "The Serial Foodie",
];

const INSIGHT_SYSTEM_PROMPT = `You are FintLer's behavioral finance AI for Indian millennials.
Analyze the provided transaction data and generate empathetic, non-judgmental insights.
Output STRICT JSON with these exact keys:

{
  "spending_personality": "one of the personality names provided",
  "summary_text": "One sentence summarizing total spend and biggest category. Use ₹ symbol.",
  "category_alert_text": "One sentence flagging the highest-spend or fastest-growing category. Include amount.",
  "behavioral_trigger_text": "One sentence identifying WHEN the user spends most (day/time pattern). Be specific.",
  "recommendation_text": "One actionable, specific, non-judgmental recommendation. Include a rupee target."
}

Personality options: ${SPENDING_PERSONALITIES.join(", ")}

Rules:
- Never use words like "bad", "problem", "issue", "stop"
- Always use ₹ for Indian Rupees
- Be specific with numbers from the data
- Keep each field under 120 characters
- Return ONLY valid JSON, no markdown`;

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

    // Also support passing user_id in body (for internal function-to-function calls)
    let targetUserId = user.id;
    try {
      const bodyText = await req.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        if (body?.user_id) targetUserId = body.user_id;
      }
    } catch {}

    // ----- FETCH TRANSACTIONS (last 90 days) -----
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: transactions, error: txErr } = await supabase
      .from("transactions")
      .select("amount_inr, type, merchant, category, transacted_at, day_of_week, hour_of_day, bank_name")
      .eq("user_id", targetUserId)
      .gte("transacted_at", ninetyDaysAgo)
      .order("transacted_at", { ascending: false })
      .limit(300);

    if (txErr || !transactions || transactions.length === 0) {
      return jsonRes({
        error: "No transactions found. Please sync your Gmail first.",
        hint: "Run gmail-initial-sync first.",
      }, 400);
    }

    // ----- BUILD ANALYTICS SUMMARY FOR GEMINI -----
    const debits = transactions.filter((t) => t.type === "debit");
    const totalSpend = debits.reduce((s, t) => s + t.amount_inr, 0);

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    for (const t of debits) {
      const cat = t.category || "other";
      categoryMap[cat] = (categoryMap[cat] || 0) + t.amount_inr;
    }

    // Day-of-week breakdown
    const dayMap: Record<string, number> = {};
    for (const t of debits) {
      if (t.day_of_week) dayMap[t.day_of_week] = (dayMap[t.day_of_week] || 0) + t.amount_inr;
    }

    // Hour-of-day breakdown
    const hourMap: Record<number, number> = {};
    for (const t of debits) {
      if (t.hour_of_day !== null) hourMap[t.hour_of_day] = (hourMap[t.hour_of_day] || 0) + t.amount_inr;
    }

    // Top merchants
    const merchantMap: Record<string, number> = {};
    for (const t of debits) {
      if (t.merchant) merchantMap[t.merchant] = (merchantMap[t.merchant] || 0) + t.amount_inr;
    }
    const topMerchants = Object.entries(merchantMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => `${name}: ₹${amount}`);

    const analysisSummary = {
      total_spend_inr: totalSpend,
      transaction_count: debits.length,
      period_days: 90,
      top_categories: Object.entries(categoryMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ₹${amt}`),
      spending_by_day: Object.entries(dayMap).sort(([, a], [, b]) => b - a),
      peak_hours: Object.entries(hourMap).sort(([, a], [, b]) => b - a).slice(0, 3),
      top_merchants: topMerchants,
      sample_recent_transactions: debits.slice(0, 20).map((t) => ({
        merchant: t.merchant,
        amount: `₹${t.amount_inr}`,
        category: t.category,
        when: t.transacted_at,
      })),
    };

    // ----- CALL GEMINI -----
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return jsonRes({ error: "GEMINI_API_KEY not configured." }, 500);

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: INSIGHT_SYSTEM_PROMPT }] },
        contents: [{
          role: "user",
          parts: [{ text: JSON.stringify(analysisSummary, null, 2) }],
        }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return jsonRes({ error: "Gemini AI failed." }, 500);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let aiOutput: any;
    try {
      aiOutput = JSON.parse(rawText);
    } catch {
      return jsonRes({ error: "Failed to parse Gemini output as JSON.", raw: rawText }, 500);
    }

    // ----- WRITE TO DATABASE -----
    // Update spending personality in profiles
    await supabase
      .from("profiles")
      .update({ spending_personality: aiOutput.spending_personality })
      .eq("id", targetUserId);

    // Insert new insight record
    const { data: newInsight, error: insightErr } = await supabase
      .from("insights")
      .insert({
        user_id: targetUserId,
        summary_text: aiOutput.summary_text,
        category_alert_text: aiOutput.category_alert_text,
        behavioral_trigger_text: aiOutput.behavioral_trigger_text,
        recommendation_text: aiOutput.recommendation_text,
      })
      .select("*")
      .single();

    if (insightErr) {
      console.error("Insight insert error:", insightErr);
      return jsonRes({ error: "Failed to save insight." }, 500);
    }

    return jsonRes({
      success: true,
      insight: newInsight,
      spending_personality: aiOutput.spending_personality,
      transactions_analyzed: debits.length,
    });

  } catch (err) {
    console.error("generate-insights error:", err);
    return jsonRes({ error: "Internal server error." }, 500);
  }
});

function jsonRes(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
