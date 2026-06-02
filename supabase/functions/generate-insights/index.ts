/*
  FintLer — generate-insights Edge Function (v2 — schema aligned)
  
  Reads the authenticated user's recent transactions, sends them to Gemini AI
  for behavioral analysis, and writes structured insights into the `insights` table.
  
  Schema:
    transactions: amount (NUMERIC), type, category, merchant, transaction_date
    insights: type (text), title (text), body (text), severity (text)
    profiles: full_name (no spending_personality column)
  
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
  "summary_title": "Short title for the monthly summary (e.g. 'You spent ₹42,500 via UPI this month')",
  "summary_body": "One sentence elaborating on the top category or trend",
  "alert_title": "Short title flagging highest-spend or fastest-growing category",
  "alert_body": "One sentence with the amount and category context",
  "alert_severity": "low" | "medium" | "high",
  "behavioral_title": "Short title for a behavioral pattern (e.g. 'Moment of Impact')",
  "behavioral_body": "One sentence identifying WHEN the user spends most (day/time pattern). Be specific.",
  "recommendation_title": "Short actionable goal title",
  "recommendation_body": "One specific, non-judgmental recommendation with a rupee target"
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

    // Read body first (can only be consumed once)
    let body: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) body = JSON.parse(bodyText);
    } catch {}

    const token = authHeader.replace("Bearer ", "");
    let targetUserId: string | null = null;

    // Try JWT auth first
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      targetUserId = body?.user_id || user.id;
    } else if (body?.user_id) {
      // Anon-key or service-role call with user_id in body — trust it
      targetUserId = body.user_id;
    }

    if (!targetUserId) return jsonRes({ error: "Invalid session. No user_id." }, 401);

    // ----- FETCH TRANSACTIONS (last 90 days) -----
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: transactions, error: txErr } = await supabase
      .from("transactions")
      .select("id, amount, type, merchant, category, transaction_date")
      .eq("user_id", targetUserId)
      .gte("transaction_date", ninetyDaysAgo)
      .order("transaction_date", { ascending: false })
      .limit(300);

    if (txErr || !transactions || transactions.length === 0) {
      return jsonRes({
        error: "No transactions found. Please sync your Gmail first.",
        hint: "Run gmail-initial-sync first.",
      }, 400);
    }

    // ----- RE-CATEGORIZE UNCATEGORIZED TRANSACTIONS VIA GEMINI -----
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const uncategorized = transactions.filter(t => !t.category || t.category === "Uncategorized");

    if (uncategorized.length > 0 && geminiKey) {
      console.log(`Re-categorizing ${uncategorized.length} uncategorized transactions...`);

      const merchantList = uncategorized.map(t => ({
        id: t.id,
        merchant: t.merchant || "Unknown",
        amount: t.amount,
        type: t.type,
      }));

      try {
        const catRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: `Categorize these Indian UPI/bank transactions. Return a JSON array where each element has "id" and "category".
Categories: Food, Travel, Shopping, Utilities, Transfer, EMI, Entertainment, Salary, Investment, Uncategorized.
Rules:
- Person names (first+last name) = "Transfer" (P2P UPI payment)
- Swiggy/Zomato/restaurants = "Food"
- Amazon/Flipkart/Myntra = "Shopping"
- Uber/Ola/IRCTC/MakeMyTrip = "Travel"
- Netflix/Spotify/Hotstar/YouTube = "Entertainment"
- Electricity/Gas/Water/Recharge/Broadband = "Utilities"
- EMI/Loan/Insurance = "EMI"
- Salary/Payroll = "Salary"
- Mutual Fund/SIP/Stock = "Investment"
Return ONLY valid JSON array, no markdown.` }] },
            contents: [{ role: "user", parts: [{ text: JSON.stringify(merchantList) }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
          }),
        });

        if (catRes.ok) {
          const catData = await catRes.json();
          const catText = catData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const categories = JSON.parse(catText);

          if (Array.isArray(categories)) {
            let updated = 0;
            for (const item of categories) {
              if (item.id && item.category && item.category !== "Uncategorized") {
                await supabase.from("transactions").update({ category: item.category }).eq("id", item.id);
                // Also update local copy
                const tx = transactions.find(t => t.id === item.id);
                if (tx) tx.category = item.category;
                updated++;
              }
            }
            console.log(`Re-categorized ${updated} transactions via Gemini.`);
          }
        }
      } catch (e) {
        console.error("Re-categorization error (non-fatal):", e);
      }
    }


    // ----- BUILD ANALYTICS SUMMARY FOR GEMINI -----
    const debits = transactions.filter((t) => t.type === "debit");
    const totalSpend = debits.reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    for (const t of debits) {
      const cat = t.category || "Uncategorized";
      categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(t.amount || 0);
    }

    // Day-of-week breakdown (computed from transaction_date)
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayMap: Record<string, number> = {};
    for (const t of debits) {
      if (t.transaction_date) {
        const d = new Date(t.transaction_date);
        const dayName = dayNames[d.getDay()];
        dayMap[dayName] = (dayMap[dayName] || 0) + parseFloat(t.amount || 0);
      }
    }

    // Hour-of-day breakdown (computed from transaction_date)
    const hourMap: Record<number, number> = {};
    for (const t of debits) {
      if (t.transaction_date) {
        const hour = new Date(t.transaction_date).getHours();
        hourMap[hour] = (hourMap[hour] || 0) + parseFloat(t.amount || 0);
      }
    }

    // Top merchants
    const merchantMap: Record<string, number> = {};
    for (const t of debits) {
      if (t.merchant) merchantMap[t.merchant] = (merchantMap[t.merchant] || 0) + parseFloat(t.amount || 0);
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
        amount: `₹${t.amount}`,
        category: t.category,
        when: t.transaction_date,
      })),
    };


    // ----- CALL GEMINI FOR INSIGHTS -----
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
    // Delete old insights for this user to avoid stale data
    await supabase.from("insights").delete().eq("user_id", targetUserId);

    // Insert multiple insight rows by type (matches the schema: type, title, body, severity)
    const insightRows = [
      {
        user_id: targetUserId,
        type: "personality",
        title: aiOutput.spending_personality || "The Mindful Spender",
        body: `Based on analysis of ${debits.length} transactions over the last 90 days.`,
        severity: "info",
      },
      {
        user_id: targetUserId,
        type: "summary",
        title: aiOutput.summary_title || `You spent ₹${Math.round(totalSpend).toLocaleString("en-IN")} recently`,
        body: aiOutput.summary_body || "Insights generated from your latest sync.",
        severity: "info",
      },
      {
        user_id: targetUserId,
        type: "alert",
        title: aiOutput.alert_title || "No critical alerts",
        body: aiOutput.alert_body || "Your spending looks healthy.",
        severity: aiOutput.alert_severity || "low",
      },
      {
        user_id: targetUserId,
        type: "behavioral",
        title: aiOutput.behavioral_title || "Spending Pattern",
        body: aiOutput.behavioral_body || "Need more data to identify patterns.",
        severity: "info",
      },
      {
        user_id: targetUserId,
        type: "goal",
        title: aiOutput.recommendation_title || "Set a savings goal",
        body: aiOutput.recommendation_body || "Try saving 10% of your monthly spending.",
        severity: "info",
      },
    ];

    const { error: insightErr } = await supabase
      .from("insights")
      .insert(insightRows);

    if (insightErr) {
      console.error("Insight insert error:", insightErr);
      return jsonRes({ error: "Failed to save insights.", detail: insightErr.message }, 500);
    }

    return jsonRes({
      success: true,
      spending_personality: aiOutput.spending_personality,
      insights_created: insightRows.length,
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
