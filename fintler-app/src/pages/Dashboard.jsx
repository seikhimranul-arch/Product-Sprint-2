import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import Footer from "../components/Footer";
import TransactionsTable from "../components/TransactionsTable";
import SparklineChart from "../components/SparklineChart";
import {
  userProfile as mockUserProfile,
  insightCards as mockInsightCards,
  transactions as mockTransactions,
} from "../lib/mockData";

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

  const [profile, setProfile] = useState(mockUserProfile);
  const [insights, setInsights] = useState(mockInsightCards);
  const [txs, setTxs] = useState(mockTransactions);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);

  // Auth guard — redirect to landing if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Fetch all data when user is ready
  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  // Realtime subscription — listen for new transactions
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
          setTxs((prev) => [
            {
              id: t.id,
              date: new Date(t.transacted_at).toLocaleDateString("en-IN"),
              merchant: t.merchant || t.raw_merchant || "Unknown",
              category: t.category || "other",
              amount: `₹${t.amount_inr.toLocaleString("en-IN")}`,
              icon: categoryIcon(t.category),
              iconBg: categoryBg(t.category),
              iconColor: categoryColor(t.category),
            },
            ...prev.slice(0, 9),
          ]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  async function fetchAll() {
    setLoadingData(true);
    if (!supabase) {
      setLoadingData(false);
      return;
    }

    try {
      // Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const userName =
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        mockUserProfile.name;

      setProfile({
        ...mockUserProfile,
        name: userName,
        personality: profileData?.spending_personality || null,
      });

      // Gmail connection status
      const { data: emailConn } = await supabase
        .from("email_connections")
        .select("user_id, revoked_at")
        .eq("user_id", user.id)
        .single();
      setGmailConnected(!!(emailConn && !emailConn.revoked_at));

      // Latest insight
      const { data: insightsData } = await supabase
        .from("insights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (insightsData) {
        setInsights((prev) => ({
          ...prev,
          personality: {
            ...prev.personality,
            title: profileData?.spending_personality || prev.personality.title,
          },
          summary: {
            ...prev.summary,
            subtitle: insightsData.summary_text || prev.summary.subtitle,
          },
          alert: {
            ...prev.alert,
            subtitle: insightsData.category_alert_text || prev.alert.subtitle,
          },
          behavioral: {
            ...prev.behavioral,
            description: insightsData.behavioral_trigger_text || prev.behavioral.description,
            highlight: "",
            descriptionEnd: "",
          },
          goal: {
            ...prev.goal,
            title: insightsData.recommendation_text || prev.goal.title,
            amount: "",
            titleEnd: "",
          },
        }));
      }

      // Transactions
      const { data: txsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transacted_at", { ascending: false })
        .limit(10);

      if (txsData && txsData.length > 0) {
        setTxs(
          txsData.map((t) => ({
            id: t.id,
            date: new Date(t.transacted_at).toLocaleDateString("en-IN"),
            merchant: t.merchant || t.raw_merchant || "Unknown",
            category: t.category || "other",
            amount: `₹${t.amount_inr.toLocaleString("en-IN")}`,
            icon: categoryIcon(t.category),
            iconBg: categoryBg(t.category),
            iconColor: categoryColor(t.category),
          }))
        );
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
    setLoadingData(false);
  }

  async function handleDisconnectGmail() {
    if (!supabase || !user) return;
    await supabase
      .from("email_connections")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setGmailConnected(false);
  }

  async function handleRefreshInsights() {
    if (!supabase || !user) return;
    setRefreshingInsights(true);
    await supabase.functions.invoke("generate-insights", {
      body: { user_id: user.id },
    });
    await fetchAll();
    setRefreshingInsights(false);
  }

  const { personality, behavioral, summary, alert, goal } = insights;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-tertiary border-t-transparent animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-display mb-2">
            Welcome back, {profile.name}.
          </h1>
          <p className="text-headline-md text-on-surface-variant mb-4">
            Here is your financial clarity.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gmailConnected ? "bg-tertiary shadow-[0_0_8px_rgba(0,223,193,0.6)]" : "bg-on-surface-variant"} ${gmailConnected ? "animate-pulse" : ""}`} />
              <span className="text-label-caps text-on-surface-variant">
                {gmailConnected ? "Gmail Connected — Real-time" : "Demo Mode"}
              </span>
            </div>
            {gmailConnected && (
              <button
                onClick={handleDisconnectGmail}
                className="text-label-caps text-error/70 hover:text-error transition-colors cursor-pointer"
              >
                Disconnect Gmail
              </button>
            )}
            <button
              onClick={handleRefreshInsights}
              disabled={refreshingInsights}
              className="text-label-caps text-tertiary/70 hover:text-tertiary transition-colors cursor-pointer disabled:opacity-40"
            >
              {refreshingInsights ? "Refreshing..." : "↻ Refresh Insights"}
            </button>
          </div>
        </motion.header>

        {/* Bento Grid */}
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
                {personality.label}
              </span>
              <h2 className="text-headline-lg md:text-display mb-4">
                {profile.personality || personality.title}
              </h2>
              <p className="text-body-lg text-on-surface-variant">
                {personality.description}
              </p>
              {/* Share badge button */}
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
                    {behavioral.icon}
                  </span>
                  <span className="text-label-caps text-tertiary">{behavioral.label}</span>
                </div>
                <h3 className="text-headline-md mb-2">{behavioral.title}</h3>
                <p className="text-body-lg text-on-surface-variant">
                  {behavioral.description}
                  <span className="text-on-surface font-semibold">{behavioral.highlight}</span>
                  {behavioral.descriptionEnd}
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
              <span className="text-label-caps text-on-surface-variant mb-4 block">{summary.label}</span>
              <p className="text-headline-md mb-2">
                {summary.title}
                <span className="text-data-mono text-primary">{summary.amount}</span>
                {summary.titleEnd}
              </p>
              <p className="text-body-lg text-on-surface-variant">
                <span className="text-on-surface font-semibold">{summary.subtitle}</span>
                {summary.subtitleEnd}
              </p>
            </div>
            <SparklineChart />
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
                {alert.icon}
              </span>
              <span className="text-label-caps text-error">{alert.label}</span>
            </div>
            <h3 className="text-headline-md mb-2">{alert.title}</h3>
            <p className="text-display text-on-surface mt-4">
              <span className="text-data-mono">{alert.amount}</span>
            </p>
            <p className="text-body-sm text-on-surface-variant mt-2">{alert.subtitle}</p>
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
              <span className="text-label-caps text-on-surface-variant mb-4 block">{goal.label}</span>
              <p className="text-headline-md mb-6">
                {goal.title}
                <span className="text-data-mono text-primary">{goal.amount}</span>
                {goal.titleEnd}
              </p>
            </div>
            <button className="bg-transparent border border-white/10 text-on-surface px-6 py-3 rounded-lg hover:bg-white/5 hover:border-white/30 transition-all text-body-sm font-medium cursor-pointer">
              {goal.buttonText}
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
      </main>

      <Footer />
    </motion.div>
  );
}

// Helpers for icon/color mapping by category
function categoryIcon(cat) {
  const map = { food: "restaurant", travel: "directions_car", shopping: "shopping_bag", utilities: "bolt", emi: "account_balance", salary: "savings", transfer: "swap_horiz" };
  return map[cat] || "receipt_long";
}
function categoryBg(cat) {
  const map = { food: "bg-error/20", travel: "bg-secondary/20", shopping: "bg-tertiary/20", salary: "bg-tertiary/20" };
  return map[cat] || "bg-surface-container-high";
}
function categoryColor(cat) {
  const map = { food: "text-error", travel: "text-secondary", shopping: "text-tertiary", salary: "text-tertiary" };
  return map[cat] || "text-on-surface-variant";
}
