/*
  FintLer — parse-statement Edge Function
  Uses Google Gemini API (Free Tier) to analyze bank statements and generate behavioral insights.
  
  Deploy: supabase functions deploy parse-statement
  Env vars required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

const SYSTEM_PROMPT = `You are FintLer, an AI Financial Clarity Engine designed for Indian Salaried Millennials.
Your goal is to analyze raw bank statement text and provide instant, non-judgmental behavioral insights into spending habits to reduce "Salary Day Spending Anxiety".

You will receive raw text extracted from a bank statement.

Analyze the transactions and provide EXACTLY 5 outputs in strict JSON format:
1. "summary": A brief 1-2 sentence summary of their overall financial health this month.
2. "category_alert": Identify one category where they spent unusually high or frequently (e.g., Swiggy/Zomato late at night). Keep it to 1 sentence.
3. "behavioral_trigger": A deeper psychological insight into *why* or *when* they are spending (e.g., "You tend to make impulse UPI payments on Friday evenings"). 1 sentence.
4. "recommendation": ONE highly actionable, realistic micro-goal to fix the leak without shaming them. (e.g., "Try keeping your food delivery to just weekends"). 1 sentence.
5. "spending_personality": Assign a catchy persona based on their data (e.g., "Weekend Warrior", "Stress Spender", "UPI Ninja"). Max 3 words.

STRICT RULES:
- Output ONLY valid JSON.
- No markdown, no preamble, no code fences.
- All 5 keys MUST be present in the JSON root object.

JSON FORMAT:
{
  "summary": "...",
  "category_alert": "...",
  "behavioral_trigger": "...",
  "recommendation": "...",
  "spending_personality": "..."
}`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ----- AUTH -----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Not authenticated." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return jsonResponse({ error: "Invalid session." }, 401);
    }

    // ----- INPUT -----
    const { statement_text, statement_id } = await req.json();
    if (!statement_text || typeof statement_text !== "string" || statement_text.trim().length === 0) {
      return jsonResponse({ error: "No statement data provided." }, 400);
    }

    // ----- CALL GEMINI API -----
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse({ error: "AI service is not configured on the server." }, 500);
    }

    const userMessage = `STATEMENT TEXT:\n${statement_text.substring(0, 30000)}`; // limit size to prevent context overflow

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      if (geminiRes.status === 429) {
        return jsonResponse({ error: "AI is rate-limited — try again in a moment." }, 429);
      }
      const errText = await geminiRes.text();
      console.error("Gemini error:", geminiRes.status, errText);
      return jsonResponse({ error: "AI service is temporarily unavailable." }, 500);
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("Failed to parse Gemini output:", rawText);
      return jsonResponse({ error: "AI returned an unexpected response. Please ensure the statement is readable." }, 500);
    }

    // Validate expected fields
    if (!parsed.summary || !parsed.category_alert || !parsed.behavioral_trigger || !parsed.recommendation || !parsed.spending_personality) {
      return jsonResponse({ error: "AI failed to generate all required insights." }, 500);
    }

    // ----- SAVE INSIGHTS TO DATABASE -----
    const { data: newInsight, error: insertErr } = await supabase
      .from("insights")
      .insert({
        user_id: user.id,
        statement_id: statement_id || null,
        summary_text: parsed.summary,
        category_alert_text: parsed.category_alert,
        behavioral_trigger_text: parsed.behavioral_trigger,
        recommendation_text: parsed.recommendation
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Failed to save insights:", insertErr);
      // We can still return the insights even if saving failed, but it's better to log it.
    }

    // Update user profile with personality
    await supabase
      .from("profiles")
      .update({ spending_personality: parsed.spending_personality })
      .eq("id", user.id);

    // Update statement status if provided
    if (statement_id) {
       await supabase
        .from("statements")
        .update({ status: 'parsed' })
        .eq("id", statement_id);
    }

    // ----- RETURN SUCCESS -----
    return jsonResponse({ 
      success: true, 
      insights: newInsight || parsed, 
      personality: parsed.spending_personality 
    });

  } catch (err) {
    console.error("parse-statement error:", err);
    return jsonResponse({ error: "Something went wrong. Please try again." }, 500);
  }
});

// Helper: consistent JSON response with CORS
function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
