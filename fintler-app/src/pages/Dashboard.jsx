import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import Footer from "../components/Footer";
import TransactionsTable from "../components/TransactionsTable";
import SparklineChart from "../components/SparklineChart";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [txs, setTxs] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  // Fetch data
  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  // Realtime subscription
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
          const t = payload.new;
          setTxs((prev) => {
            if (!prev) return [];
            return [
              {
                id: t.id,
                date: new Date(t.transaction_date || t.created_at).toLocaleDateString("en-IN"),
                merchant: t.merchant || "Unknown",
                category: t.category || "other",
                amount: `₹${parseFloat(t.amount || 0).toLocaleString("en-IN")}`,
                icon: categoryIcon(t.category),
                iconBg: categoryBg(t.category),
                iconColor: categoryColor(t.category),
                rawAmount: parseFloat(t.amount || 0),
              },
              ...prev.slice(0, 9),
            ];
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  async function fetchAll() {
    setLoadingData(true);
    if (!supabase) return setLoadingData(false);

    try {
      // Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const userName = user?.user_metadata?.full_name || profileData?.full_name || user?.email?.split("@")[0] || "User";

      setProfile({
        name: userName,
      });

      // Gmail connection status from profiles table
      setGmailConnected(!!profileData?.gmail_sync_enabled);

      // Fetch recent insights (type, title, body, severity)
      const { data: insightsData } = await supabase
        .from("insights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (insightsData && insightsData.length > 0) {
        // Group insights by type for dashboard cards
        const byType = {};
        insightsData.forEach((ins) => {
          if (!byType[ins.type]) byType[ins.type] = ins;
        });

        const personalityIns = byType["personality"] || byType["spending_personality"];
        const summaryIns = byType["summary"] || byType["monthly_summary"];
        const alertIns = byType["alert"] || byType["spending_alert"];
        const behavioralIns = byType["behavioral"] || byType["pattern"];
        const goalIns = byType["goal"] || byType["recommendation"];

        setInsights({
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
        });
      }

      // Transactions
      const { data: txsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .limit(10);

      if (txsData && txsData.length > 0) {
        setTxs(
          txsData.map((t) => ({
            id: t.id,
            date: new Date(t.transaction_date || t.created_at).toLocaleDateString("en-IN"),
            merchant: t.merchant || "Unknown",
            category: t.category || "other",
            amount: `₹${parseFloat(t.amount || 0).toLocaleString("en-IN")}`,
            icon: categoryIcon(t.category),
            iconBg: categoryBg(t.category),
            iconColor: categoryColor(t.category),
            rawAmount: parseFloat(t.amount || 0),
          }))
        );
      } else {
        setTxs([]); // Empty array means loaded but empty
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
    setLoadingData(false);
  }

  async function handleDisconnectGmail() {
    if (!supabase || !user) return;
    try {
      await supabase.from("profiles").update({ gmail_sync_enabled: false }).eq("id", user.id);
    } catch (e) {}
    setGmailConnected(false);
  }

  async function handleRefreshInsights() {
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

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-tertiary border-t-transparent animate-spin" />
      </div>
    );
  }

  const hasData = txs && txs.length > 0;

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <main className="flex-grow w-full max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] py-8 pt-24">
        {/* Dashboard Header */}
        <motion.header
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-display mb-2">Welcome back, {profile?.name}.</h1>
          <p className="text-headline-md text-on-surface-variant mb-4">
            {hasData ? "Here is your financial clarity." : "Let's set up your financial clarity."}
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gmailConnected ? "bg-tertiary shadow-[0_0_8px_rgba(0,223,193,0.6)] animate-pulse" : "bg-error"}`} />
              <span className="text-label-caps text-on-surface-variant">
                {gmailConnected ? "Gmail Connected — Real-time" : "Not Connected"}
              </span>
            </div>
            {gmailConnected && (
              <button
                onClick={handleDisconnectGmail}
                className="text-label-caps text-error/70 hover:text-error transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
            {hasData && (
              <button
                onClick={handleRefreshInsights}
                disabled={refreshingInsights}
                className="text-label-caps text-tertiary/70 hover:text-tertiary transition-colors cursor-pointer disabled:opacity-40"
              >
                {refreshingInsights ? "Refreshing..." : "↻ Refresh Insights"}
              </button>
            )}
          </div>
        </motion.header>

        {!hasData ? (
          /* Empty State */
          <motion.div
            className="bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 border border-primary/30">
              <span className="material-symbols-outlined text-primary text-4xl">insights</span>
            </div>
            <h2 className="text-headline-lg mb-4">No transactions found</h2>
            <p className="text-body-lg text-on-surface-variant mb-8 max-w-md mx-auto">
              We couldn't find any recent transactions. Connect your Gmail to securely sync bank alerts and generate AI insights.
            </p>
            <Link
              to="/sync"
              className="bg-primary text-on-primary px-8 py-3 rounded-full hover:bg-primary/90 transition-colors text-label-caps"
            >
              Sync Gmail Now
            </Link>
          </motion.div>
        ) : (
          /* Bento Grid */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* 1. Spending Personality */}
            <motion.div
              className="md:col-span-8 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8 relative overflow-hidden group hover:border-primary/30 transition-colors"
              custom={0}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary-container/20 via-surface to-tertiary-container/20 opacity-50 z-0" />
              <div className="relative z-10">
                <span className="text-label-caps text-on-surface-variant mb-4 block">
                  {insights?.personality?.label || "Spending Personality"}
                </span>
                <h2 className="text-headline-lg md:text-display mb-4">
                  {insights?.personality?.title || "Analyzing..."}
                </h2>
                <p className="text-body-lg text-on-surface-variant max-w-2xl">
                  {insights?.personality?.description || "Sync more data to unlock deeper personality insights."}
                </p>
                <button className="mt-6 inline-flex items-center gap-2 text-label-caps text-tertiary border border-tertiary/30 px-4 py-2 rounded-full hover:bg-tertiary/10 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">share</span>
                  Share My Personality
                </button>
              </div>
            </motion.div>

            {/* 2. Behavioral Insight */}
            <motion.div
              className="md:col-span-4 bg-surface-container/30 backdrop-blur-xl rounded-xl p-8 relative overflow-hidden group"
              custom={1}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-secondary-container to-tertiary opacity-10 blur-xl group-hover:opacity-20 transition-opacity" />
              <div className="absolute inset-0 rounded-xl border border-white/5 ai-border-pulse transition-colors" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {insights?.behavioral?.icon || "bolt"}
                    </span>
                    <span className="text-label-caps text-tertiary">{insights?.behavioral?.label || "Insight"}</span>
                  </div>
                  <h3 className="text-headline-md mb-2">{insights?.behavioral?.title || "Spending Pattern"}</h3>
                  <p className="text-body-lg text-on-surface-variant">
                    {insights?.behavioral?.description || "Processing recent activity..."}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 3. Monthly Summary */}
            <motion.div
              className="md:col-span-6 lg:col-span-4 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8 flex flex-col justify-between"
              custom={2}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div>
                <span className="text-label-caps text-on-surface-variant mb-4 block">Recent Activity Summary</span>
                <p className="text-headline-sm mb-2 text-on-surface">
                  {insights?.summary?.title || "Monitoring your spending..."}
                </p>
                <p className="text-body-lg text-on-surface-variant">
                  {insights?.summary?.subtitle}
                </p>
              </div>
              <SparklineChart data={txs.map(t => t.rawAmount).reverse()} />
            </motion.div>

            {/* 4. Spending Alert */}
            <motion.div
              className="md:col-span-6 lg:col-span-4 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-error/30 p-8"
              custom={3}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                  warning
                </span>
                <span className="text-label-caps text-error">AI Alert</span>
              </div>
              <h3 className="text-headline-md mb-2">{insights?.alert?.title || "No critical alerts"}</h3>
              <p className="text-body-sm text-on-surface-variant mt-4">Keep spending mindfully.</p>
            </motion.div>

            {/* 5. Actionable Micro-Goal */}
            <motion.div
              className="md:col-span-12 lg:col-span-4 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8 flex flex-col justify-between items-start"
              custom={4}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div>
                <span className="text-label-caps text-on-surface-variant mb-4 block">Suggested Goal</span>
                <p className="text-headline-md mb-6">
                  {insights?.goal?.title || "Try setting a budget this week."}
                </p>
              </div>
              <button className="bg-transparent border border-white/10 text-on-surface px-6 py-3 rounded-lg hover:bg-white/5 hover:border-white/30 transition-all text-body-sm font-medium cursor-pointer">
                Set Goal
              </button>
            </motion.div>

            {/* Transactions Table */}
            <motion.div
              className="contents"
              custom={5}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <TransactionsTable transactions={txs} />
            </motion.div>
          </div>
        )}
      </main>

      <Footer />
    </motion.div>
  );
}

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
