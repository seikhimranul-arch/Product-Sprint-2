import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import useDashboardData from "../hooks/useDashboardData";
import TransactionsTable from "../components/TransactionsTable";
import SparklineChart from "../components/SparklineChart";
import Footer from "../components/Footer";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

export default function Dashboard() {
  const { signOut } = useAuth();
  const {
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
  } = useDashboardData();

  if (loading) {
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

        {/* Gmail Status Bar */}
        {gmailConnected && (
          <div className="flex items-center gap-4 mb-6 text-body-sm">
            <span className="flex items-center gap-2 text-tertiary">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              Gmail Connected — Real-Time
            </span>
            <button onClick={disconnectGmail} className="text-error hover:underline bg-transparent border-none cursor-pointer text-body-sm">
              Disconnect
            </button>
            <button
              onClick={refreshInsights}
              disabled={refreshingInsights}
              className="text-tertiary hover:underline bg-transparent border-none cursor-pointer text-body-sm disabled:opacity-50"
            >
              {refreshingInsights ? "⏳ Refreshing..." : "↻ Refresh Insights"}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!hasData && !gmailConnected && (
          <div className="bg-surface-container/30 border border-white/10 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">mail</span>
            </div>
            <h2 className="text-headline-md mb-2">Connect Gmail to get started</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              FintLer reads your bank transaction emails to build your financial dashboard.
            </p>
            <Link
              to="/syncing"
              className="inline-block bg-primary text-on-primary px-8 py-3 rounded-lg text-body-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sync Gmail Now
            </Link>
          </div>
        )}

        {/* Bento Grid */}
        {(hasData || gmailConnected) && (
          <div className="grid grid-cols-12 gap-4">

            {/* 1. Spending Personality */}
            <motion.div
              className="md:col-span-12 lg:col-span-8 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8"
              custom={0}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <span className="text-label-caps text-on-surface-variant block mb-4">Spending Personality</span>
              <h2 className="text-display mb-2">{insights?.personality?.title || "Analyzing..."}</h2>
              <p className="text-body-md text-on-surface-variant mt-4">
                {insights?.personality?.description || "Sync more data to unlock deeper personality insights."}
              </p>
              <button className="mt-6 flex items-center gap-2 text-body-sm bg-primary/10 text-primary px-5 py-2.5 rounded-lg hover:bg-primary/20 transition-colors border-none cursor-pointer">
                <span className="material-symbols-outlined text-sm">share</span>
                Share My Personality
              </button>
            </motion.div>

            {/* 2. Behavioral Insight */}
            <motion.div
              className="md:col-span-12 lg:col-span-4 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8"
              custom={1}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-tertiary text-xl">bolt</span>
                <span className="text-label-caps text-tertiary">Insight</span>
              </div>
              <h3 className="text-headline-md mb-2">{insights?.behavioral?.title || "Spending Pattern"}</h3>
              <p className="text-body-sm text-on-surface-variant mt-4">
                {insights?.behavioral?.description || "Processing recent activity..."}
              </p>
            </motion.div>

            {/* 3. Recent Activity Summary */}
            <motion.div
              className="md:col-span-12 lg:col-span-4 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8"
              custom={2}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <span className="text-label-caps text-on-surface-variant block mb-4">Recent Activity Summary</span>
              <p className="text-body-sm text-on-surface-variant">{insights?.summary?.subtitle || "Monitoring your spending..."}</p>
              {txs && txs.length > 0 && (
                <div className="mt-6">
                  <SparklineChart
                    data={txs.map((t) => t.rawAmount).reverse()}
                    width={250}
                    height={60}
                    color="var(--color-tertiary)"
                  />
                </div>
              )}
            </motion.div>

            {/* 4. AI Alert */}
            <motion.div
              className="md:col-span-12 lg:col-span-4 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8"
              custom={3}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-error text-xl">warning</span>
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
              <button
                onClick={setGoal}
                className="bg-transparent border border-white/10 text-on-surface px-6 py-3 rounded-lg hover:bg-white/5 hover:border-white/30 transition-all text-body-sm font-medium cursor-pointer"
              >
                {budgetGoal ? `₹${budgetGoal.toLocaleString("en-IN")} / week` : "Set Goal"}
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
