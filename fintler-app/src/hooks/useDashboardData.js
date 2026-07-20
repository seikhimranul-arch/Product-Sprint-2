import { useState, useEffect, useCallback, useRef } from "react";
import { demoTransactions, demoInsights, demoInsightsAlt, demoProfile } from "../lib/mockData";

// ── Category → icon/color maps ──
const CAT_EMOJI = { food: "🍔", transport: "🚗", shopping: "🛒", groceries: "🛒", subscriptions: "📱", utilities: "⚡", emi: "🏦", health: "💊", transfer: "💸", entertainment: "🎬", salary: "💼" };
const CAT_BG = { food: "bg-error/20", transport: "bg-secondary-container/20", shopping: "bg-tertiary/20", groceries: "bg-tertiary-fixed/20", subscriptions: "bg-secondary/20", utilities: "bg-secondary-fixed/20", emi: "bg-surface-bright/20", health: "bg-error/10", transfer: "bg-secondary-container/10", entertainment: "bg-tertiary-fixed/20", salary: "bg-tertiary/20" };
const CAT_COLOR = { food: "text-error", transport: "text-secondary-container", shopping: "text-tertiary", groceries: "text-tertiary-fixed", subscriptions: "text-secondary", utilities: "text-secondary-fixed", emi: "text-on-surface", health: "text-error", transfer: "text-secondary-container", entertainment: "text-tertiary-fixed", salary: "text-tertiary" };

const mapTx = (t) => ({
  id: t.id,
  date: new Date(t.transacted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  merchant: t.merchant,
  category: t.category,
  amount: t.type === "credit" ? `+₹${t.amount.toLocaleString("en-IN")}` : `-₹${t.amount.toLocaleString("en-IN")}`,
  icon: CAT_EMOJI[t.category] || "📄",
  iconBg: CAT_BG[t.category] || "bg-surface-container/20",
  iconColor: CAT_COLOR[t.category] || "text-on-surface",
  rawAmount: t.amount,
  type: t.type,
  transacted_at: t.transacted_at,
});

const mapImportedTx = (t) => ({
  id: t.id,
  date: new Date(t.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  merchant: t.merchant,
  category: t.category,
  amount: t.type === "credit" ? `+₹${t.amount.toLocaleString("en-IN")}` : `-₹${t.amount.toLocaleString("en-IN")}`,
  icon: CAT_EMOJI[t.category] || "📄",
  iconBg: CAT_BG[t.category] || "bg-surface-container/20",
  iconColor: CAT_COLOR[t.category] || "text-on-surface",
  rawAmount: t.amount,
  type: t.type,
  transacted_at: t.date,
});

export default function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [budgetGoal, setBudgetGoal] = useState(null);
  const [importedTxs, setImportedTxs] = useState([]);
  const useAlt = useRef(false);
  const [insights, setInsights] = useState(demoInsights);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const refreshInsights = useCallback(() => {
    setRefreshingInsights(true);
    setTimeout(() => {
      useAlt.current = !useAlt.current;
      setInsights(useAlt.current ? demoInsightsAlt : demoInsights);
      setRefreshingInsights(false);
    }, 1500);
  }, []);

  const disconnectGmail = useCallback(() => setGmailConnected(false), []);

  const setGoal = useCallback((amount) => {
    setBudgetGoal(Number.isFinite(amount) && amount > 0 ? amount : null);
  }, []);

  const importTransactions = useCallback((txs) => {
    setImportedTxs((prev) => [...prev, ...txs.map(mapImportedTx)]);
  }, []);

  const demoTxs = demoTransactions.filter((t) => t.type === "debit").slice(0, 10).map(mapTx);
  const allTxs = [...importedTxs, ...demoTxs];

  // Today's spend (from imported + demo)
  const todayStr = new Date().toDateString();
  const todaySpend = allTxs
    .filter((t) => {
      try { return new Date(t.transacted_at).toDateString() === todayStr && t.type === "debit"; }
      catch { return false; }
    })
    .reduce((sum, t) => sum + t.rawAmount, 0);

  return {
    profile: { name: demoProfile.name },
    insights,
    txs: allTxs,
    todaySpend,
    gmailConnected,
    loading,
    refreshingInsights,
    budgetGoal,
    disconnectGmail,
    refreshInsights,
    setGoal,
    importTransactions,
  };
}
