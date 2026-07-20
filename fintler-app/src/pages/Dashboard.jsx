import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import useDashboardData from "../hooks/useDashboardData";
import SparklineChart from "../components/SparklineChart";
import LoadingSpinner from "../components/LoadingSpinner";
import GoalModal from "../components/GoalModal";
import DailyGoals from "../components/DailyGoals";
import UploadParser from "../components/UploadParser";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08 },
  }),
};

const CAT_EMOJI = {
  food: "🍔", transport: "🚗", shopping: "🛒", groceries: "🛒",
  subscriptions: "📱", utilities: "⚡", emi: "🏦", health: "💊",
  transfer: "💸", entertainment: "🎬", salary: "💼",
};

const CAT_BG = {
  food: "var(--color-halo-magenta-soft)",
  transport: "var(--color-halo-cyan-soft)",
  shopping: "var(--color-halo-amber-soft)",
  groceries: "var(--color-elevated)",
  subscriptions: "var(--color-halo-indigo-soft)",
  utilities: "var(--color-halo-indigo-soft)",
  emi: "var(--color-elevated)",
  health: "var(--color-halo-magenta-soft)",
  transfer: "var(--color-halo-cyan-soft)",
  entertainment: "var(--color-halo-amber-soft)",
  salary: "var(--color-halo-lime-soft)",
};

export default function Dashboard() {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const {
    profile,
    insights,
    txs,
    todaySpend,
    gmailConnected,
    loading,
    refreshingInsights,
    budgetGoal,
    disconnectGmail,
    refreshInsights,
    setGoal,
    importTransactions,
  } = useDashboardData();

  const handleRefresh = useCallback(() => {
    setShowSpinner(true);
    refreshInsights();
    setTimeout(() => setShowSpinner(false), 2000);
  }, [refreshInsights]);

  const handleImport = useCallback((txs) => {
    importTransactions(txs);
    setShowUpload(false);
  }, [importTransactions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const hasData = txs && txs.length > 0;
  const totalDebit = txs?.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.rawAmount, 0) || 0;
  const topCategory = (() => {
    const cats = {};
    txs?.filter((t) => t.type === "debit").forEach((t) => { cats[t.category] = (cats[t.category] || 0) + t.rawAmount; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], amount: sorted[0][1], pct: ((sorted[0][1] / (totalDebit || 1)) * 100).toFixed(1) } : null;
  })();

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <main className="flex-1 lg:ml-[var(--spacing-sidebar)] pb-20 lg:pb-0">
        {/* Topbar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:px-10 lg:h-16 lg:border-b"
             style={{ background: "rgba(10,11,15,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                 style={{ background: "var(--color-elevated)", color: "var(--color-halo-indigo)" }}>
              {profile?.name?.substring(0, 2) || "U"}
            </div>
            <div>
              <div className="text-sm font-semibold">Hi, <span style={{ color: "var(--color-halo-indigo)" }}>{profile?.name || "User"}</span></div>
              {gmailConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "var(--color-halo-indigo-soft)", color: "var(--color-halo-indigo)", border: "1px solid rgba(91,107,255,0.2)" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-halo-indigo)" }} />
                  Gmail Live
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUpload(true)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all active:scale-95 cursor-pointer"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-halo-text2)", background: "transparent" }}
                    title="Import Transactions">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            <Link to="/sync" className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all active:scale-95"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-halo-text2)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>
            </Link>
          </div>
        </div>

        <div className="p-4 lg:p-10 max-w-[1200px] mx-auto">

          {/* Header */}
          <header className="mb-6 lg:mb-8">
            <h1 className="text-display mb-1">Good evening, <span style={{ color: "var(--color-halo-indigo)" }}>{profile?.name || "User"}</span></h1>
            <p className="text-body-sm" style={{ color: "var(--color-halo-text2)" }}>Here's where your money went this week.</p>
          </header>

          {/* Row 0: Daily Goal + Personality + Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            {/* Daily Goal */}
            <motion.div className="lg:col-span-4" custom={0} initial="hidden" animate="visible" variants={cardVariants}>
              <DailyGoals todaySpend={todaySpend} />
            </motion.div>

            {/* Personality */}
            <motion.div className="lg:col-span-4 halo-card" custom={1} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="text-label-caps mb-3">Spending Personality</div>
              <div className="flex gap-3 items-start">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                     style={{ background: "var(--color-halo-indigo-soft)", border: "1px solid rgba(91,107,255,0.18)" }}>
                  🎯
                </div>
                <div>
                  <div className="text-sm font-bold mb-1">{insights?.personality?.title || "Analyzing..."}</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--color-halo-text2)" }}>
                    {insights?.personality?.description || "Sync more data to unlock deeper personality insights."}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* AI Alert */}
            <motion.div className="lg:col-span-4 halo-card relative overflow-hidden alert-pulse"
                        style={{ borderColor: "var(--color-halo-magenta)", background: "var(--color-halo-magenta-soft)" }}
                        custom={2} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 90% 20%, rgba(255,58,92,0.06), transparent 60%)" }} />
              <div className="flex items-center gap-1.5 mb-2 relative">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-halo-magenta)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--color-halo-magenta)" }}>AI Alert</span>
              </div>
              <div className="text-sm font-bold mb-1 relative" style={{ color: "var(--color-halo-magenta)" }}>
                {insights?.alert?.title || "No critical alerts"}
              </div>
              <div className="text-[11px] relative" style={{ color: "var(--color-halo-text2)" }}>
                {insights?.alert?.amount && `${insights.alert.amount} ${insights.alert.subtitle || ""}`}
                {!insights?.alert?.amount && "Keep spending mindfully."}
              </div>
              <div className="flex gap-2 mt-3 relative">
                <Link to="/analytics" className="btn-primary btn-sm text-[11px]">View Details →</Link>
                <button className="btn-ghost btn-sm text-[11px]">Dismiss</button>
              </div>
            </motion.div>
          </div>

          {/* Row 1: Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <motion.div className="halo-card" custom={3} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="halo-card-accent" style={{ background: "var(--color-halo-indigo)" }} />
              <div className="text-label-caps mb-2">Total Debits</div>
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-halo-indigo)" }}>
                ₹{totalDebit.toLocaleString("en-IN")}
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--color-halo-text2)" }}>{txs?.length || 0} txs · 30 days</div>
            </motion.div>

            <motion.div className="halo-card" custom={4} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="halo-card-accent" style={{ background: "var(--color-halo-amber)" }} />
              <div className="text-label-caps mb-2">Top Category</div>
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight capitalize">{topCategory?.name || "—"}</div>
              <div className="text-xs mt-1 font-mono" style={{ color: "var(--color-halo-text2)" }}>
                {topCategory ? `₹${topCategory.amount.toLocaleString("en-IN")} · ${topCategory.pct}%` : "—"}
              </div>
            </motion.div>

            <motion.div className="halo-card" custom={5} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="halo-card-accent" style={{ background: "var(--color-halo-lime)" }} />
              <div className="text-label-caps mb-2">Weekly Goal</div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 relative flex-shrink-0">
                  <svg viewBox="0 0 64 64" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-elevated)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-halo-indigo)" strokeWidth="5" strokeLinecap="round" strokeDasharray="176" strokeDashoffset="67" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono" style={{ color: "var(--color-halo-indigo)" }}>62%</div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono" style={{ color: "var(--color-halo-indigo)" }}>
                    ₹{budgetGoal?.toLocaleString("en-IN") || "5,000"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--color-halo-text2)" }}>4 days left</div>
                </div>
              </div>
              <div className="goal-bar mt-3"><div className="goal-bar-fill" /></div>
              <div className="flex justify-between text-[11px]" style={{ color: "var(--color-halo-text3)" }}>
                <span>₹{((budgetGoal || 5000) * 0.62).toLocaleString("en-IN")} spent</span>
                <span>₹{((budgetGoal || 5000) * 0.38).toLocaleString("en-IN")} left</span>
              </div>
            </motion.div>

            <motion.div className="halo-card" custom={6} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="halo-card-accent" style={{ background: "var(--color-halo-cyan)" }} />
              <div className="text-label-caps mb-2">Gmail Sync</div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: gmailConnected ? "var(--color-halo-lime)" : "var(--color-halo-magenta)" }} />
                <span className="text-sm font-semibold" style={{ color: gmailConnected ? "var(--color-halo-lime)" : "var(--color-halo-magenta)" }}>
                  {gmailConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="text-xs" style={{ color: "var(--color-halo-text2)" }}>Last sync: 2 min ago</div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleRefresh} disabled={refreshingInsights} className="btn-primary btn-sm text-[11px] disabled:opacity-50">
                  {refreshingInsights ? "Refreshing..." : "Refresh"}
                </button>
                <button onClick={disconnectGmail} className="btn-ghost btn-sm text-[11px]">Disconnect</button>
              </div>
            </motion.div>
          </div>

          {/* Row 2: Chart + Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
            <motion.div className="lg:col-span-8 halo-card" custom={7} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="flex justify-between items-center mb-3">
                <div className="text-label-caps">Spending Trend</div>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm text-[11px]">7D</button>
                  <button className="btn-primary btn-sm text-[11px]">30D</button>
                  <button className="btn-ghost btn-sm text-[11px]">90D</button>
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-1" style={{ color: "var(--color-halo-indigo)" }}>
                ₹{totalDebit.toLocaleString("en-IN")}
              </div>
              <div className="text-xs mb-2" style={{ color: "var(--color-halo-text2)" }}>Down 8.2% from last month</div>

              {showSpinner && <LoadingSpinner />}

              {txs && txs.length > 0 && (
                <div className="h-32 lg:h-40 mt-2">
                  <SparklineChart data={txs.filter((t) => t.type === "debit").map((t) => t.rawAmount).reverse()} />
                </div>
              )}

              <div className="flex justify-between mt-1">
                <span className="text-[10px] font-mono" style={{ color: "var(--color-halo-text3)" }}>Jul 1</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--color-halo-text3)" }}>Jul 10</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--color-halo-text3)" }}>Jul 20</span>
              </div>
            </motion.div>

            <motion.div className="lg:col-span-4 halo-card" custom={8} initial="hidden" animate="visible" variants={cardVariants}>
              <div className="text-label-caps mb-3">Insights</div>
              <div className="space-y-4">
                <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--color-halo-indigo)" }}>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: "var(--color-halo-indigo)" }}>Weekend Surge</h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-halo-text2)" }}>Fri–Sun spend is 3.2× weekdays. Late-night food = ₹4,200/mo.</p>
                </div>
                <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--color-halo-amber)" }}>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: "var(--color-halo-amber)" }}>Subscription Bleed</h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-halo-text2)" }}>4 streaming services = ₹1,216/mo. Consider pausing one.</p>
                </div>
                <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--color-halo-lime)" }}>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: "var(--color-halo-lime)" }}>Grocery Win</h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-halo-text2)" }}>₹6,500/mo — consistent and well-controlled.</p>
                </div>
                <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--color-halo-magenta)" }}>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: "var(--color-halo-magenta)" }}>EMI Warning</h4>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-halo-text2)" }}>20% of take-home. Target &lt;15%.</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Row 3: Transactions */}
          <motion.div className="halo-card" custom={9} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-label-caps">Recent Transactions</div>
              <div className="flex gap-2">
                <button onClick={() => setShowUpload(true)} className="btn-ghost btn-sm text-[11px]">+ Import</button>
                <button className="btn-ghost btn-sm text-[11px]">Export</button>
                <Link to="/analytics" className="btn-primary btn-sm text-[11px]">View All →</Link>
              </div>
            </div>
            <div>
              {txs?.slice(0, 7).map((tx) => (
                <div key={tx.id} className="tx-row">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                       style={{ background: CAT_BG[tx.category] || "var(--color-elevated)" }}>
                    {CAT_EMOJI[tx.category] || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{tx.merchant}</div>
                    <div className="text-[11px]" style={{ color: "var(--color-halo-text3)" }}>{tx.category}</div>
                  </div>
                  <div className="hidden sm:block text-[11px] font-semibold px-2 py-0.5 rounded-full"
                       style={{ background: "var(--color-elevated)", color: "var(--color-halo-text2)" }}>
                    {tx.category}
                  </div>
                  <div className="hidden sm:block text-[10px] font-semibold tracking-wider w-12 text-center flex-shrink-0"
                       style={{ color: tx.type === "credit" ? "var(--color-halo-lime)" : "var(--color-halo-text3)" }}>
                    {tx.type === "credit" ? "CREDIT" : "DEBIT"}
                  </div>
                  <div className="text-sm font-bold font-mono transition-all hover:scale-105"
                       style={{ color: tx.type === "credit" ? "var(--color-halo-lime)" : "var(--color-halo-text)" }}>
                    {tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {showGoalModal && <GoalModal onClose={() => setShowGoalModal(false)} onSave={setGoal} />}
      {showUpload && <UploadParser onImport={handleImport} onClose={() => setShowUpload(false)} />}
    </motion.div>
  );
}
