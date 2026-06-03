import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

// Helpers for icon/color mapping by category
function categoryIcon(cat) {
  const map = { food: "restaurant", travel: "directions_car", shopping: "shopping_bag", utilities: "bolt", emi: "account_balance", salary: "savings", transfer: "swap_horiz" };
  return map[cat?.toLowerCase()] || "receipt_long";
}
function categoryBg(cat) {
  const map = { food: "bg-error/20", travel: "bg-secondary/20", shopping: "bg-tertiary/20", salary: "bg-tertiary/20" };
  return map[cat?.toLowerCase()] || "bg-surface-container-high";
}
function categoryColor(cat) {
  const map = { food: "text-error", travel: "text-secondary", shopping: "text-tertiary", salary: "text-tertiary" };
  return map[cat?.toLowerCase()] || "text-on-surface-variant";
}

function mapTransaction(t) {
  return {
    id: t.id,
    date: new Date(t.transaction_date || t.created_at).toLocaleDateString("en-IN"),
    merchant: t.merchant || "Unknown",
    category: t.category || "other",
    amount: `₹${parseFloat(t.amount || 0).toLocaleString("en-IN")}`,
    icon: categoryIcon(t.category),
    iconBg: categoryBg(t.category),
    iconColor: categoryColor(t.category),
    rawAmount: parseFloat(t.amount || 0),
  };
}

function mapInsights(insightsData) {
  if (!insightsData || insightsData.length === 0) return null;

  const byType = {};
  insightsData.forEach((ins) => {
    if (!byType[ins.type]) byType[ins.type] = ins;
  });

  const personalityIns = byType["personality"] || byType["spending_personality"];
  const summaryIns = byType["summary"] || byType["monthly_summary"];
  const alertIns = byType["alert"] || byType["spending_alert"];
  const behavioralIns = byType["behavioral"] || byType["pattern"];
  const goalIns = byType["goal"] || byType["recommendation"];

  return {
    personality: {
      label: "Spending Personality",
      title: personalityIns?.title || "Analyzing...",
      description: personalityIns?.body || "Based on your recent transaction patterns.",
    },
    summary: {
      label: "Monthly Summary",
      title: summaryIns?.title || "Monitoring your spending...",
      subtitle: summaryIns?.body || "Insights generated from your latest sync.",
    },
    alert: {
      label: "Spending Alert",
      title: alertIns?.title || "No critical alerts",
      severity: alertIns?.severity || "low",
      subtitle: alertIns?.body || "Keep spending mindfully.",
      icon: "warning",
    },
    behavioral: {
      label: "Behavioral Insight",
      title: behavioralIns?.title || "Spending Pattern",
      description: behavioralIns?.body || "Sync more data to see deeper insights.",
      icon: "bolt",
    },
    goal: {
      label: "Suggested Goal",
      title: goalIns?.title || "Try saving 10% more this month.",
      description: goalIns?.body || "",
      buttonText: "Set Goal",
    },
  };
}

export default function useDashboardData() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [txs, setTxs] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [budgetGoal, setBudgetGoal] = useState(null);

  // Fetch all dashboard data
  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  // Realtime subscription for new transactions
  useEffect(() => {
    if (!user || !supabase) return;

    const channel = supabase
      .channel("realtime-transactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setTxs((prev) => {
            if (!prev) return [];
            return [mapTransaction(payload.new), ...prev.slice(0, 9)];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    if (!supabase) return setLoading(false);

    try {
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileErr) console.error("Profile fetch error:", profileErr);

      const userName = user?.user_metadata?.full_name || profileData?.full_name || user?.email?.split("@")[0] || "User";
      setProfile({ name: userName });
      setGmailConnected(!!profileData?.gmail_sync_enabled);
      if (profileData?.budget_goal) setBudgetGoal(profileData.budget_goal);

      const { data: insightsData, error: insightsErr } = await supabase
        .from("insights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (insightsErr) console.error("Insights fetch error:", insightsErr);
      setInsights(mapInsights(insightsData));

      const { data: txsData, error: txsErr } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .limit(10);

      if (txsErr) console.error("Transactions fetch error:", txsErr);
      setTxs(txsData && txsData.length > 0 ? txsData.map(mapTransaction) : []);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
    setLoading(false);
  }

  async function disconnectGmail() {
    if (!supabase || !user) return;
    try {
      await supabase.from("profiles").update({ gmail_sync_enabled: false }).eq("id", user.id);
    } catch (e) {}
    setGmailConnected(false);
  }

  async function refreshInsights() {
    if (!supabase || !user) return;
    setRefreshingInsights(true);
    try {
      await supabase.functions.invoke("generate-insights", { body: { user_id: user.id } });
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
    setRefreshingInsights(false);
  }

  async function setGoal() {
    const input = prompt("Set your weekly spending budget (₹):", budgetGoal || "");
    if (input === null) return;
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (supabase && user) {
      await supabase.from("profiles").update({ budget_goal: amount }).eq("id", user.id);
    }
    setBudgetGoal(amount);
  }

  return {
    profile,
    insights,
    txs,
    gmailConnected,
    loading,
    refreshingInsights,
    budgetGoal,
    disconnectGmail,
    refreshInsights,
    setGoal,
  };
}
