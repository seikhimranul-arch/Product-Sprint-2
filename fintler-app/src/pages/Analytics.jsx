import { motion } from "framer-motion";
import useAnalyticsData from "../hooks/useAnalyticsData";
import Footer from "../components/Footer";

export default function Analytics() {
  const { txs, loading, totalSpend, sortedCategories, dayMap, maxDaySpend, topMerchants } = useAnalyticsData();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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

        <header className="mb-12">
          <h1 className="text-display mb-2">Analytics</h1>
          <p className="text-headline-md text-on-surface-variant">
            A deeper dive into your spending habits.
          </p>
        </header>

        {txs.length === 0 ? (
          <div className="bg-surface-container/30 border border-white/10 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">bar_chart</span>
            </div>
            <p className="text-body-lg text-on-surface-variant">
              Not enough data yet. Connect Gmail in Dashboard to start tracking.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-surface-container/30 border border-white/10 rounded-xl p-6">
                <span className="text-label-caps text-on-surface-variant block mb-2">Total Debits</span>
                <span className="text-headline-lg text-data-mono">₹{totalSpend.toLocaleString("en-IN")}</span>
              </div>
              <div className="bg-surface-container/30 border border-white/10 rounded-xl p-6">
                <span className="text-label-caps text-on-surface-variant block mb-2">Transactions</span>
                <span className="text-headline-lg text-data-mono">{txs.length}</span>
              </div>
              <div className="bg-surface-container/30 border border-white/10 rounded-xl p-6">
                <span className="text-label-caps text-on-surface-variant block mb-2">Avg per Txn</span>
                <span className="text-headline-lg text-data-mono">
                  ₹{txs.length > 0 ? Math.round(totalSpend / txs.length).toLocaleString("en-IN") : 0}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Spend by Category */}
              <div className="bg-surface-container/30 border border-white/10 rounded-xl p-8">
                <h2 className="text-label-caps text-on-surface-variant mb-6">Spend by Category</h2>
                <div className="space-y-5">
                  {sortedCategories.map(([cat, amt]) => {
                    const pct = Math.round((amt / totalSpend) * 100) || 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-body-sm mb-2">
                          <span className="capitalize">{cat}</span>
                          <span className="text-data-mono text-on-surface-variant">
                            ₹{amt.toLocaleString("en-IN")} · {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spending by Day of Week */}
              <div className="bg-surface-container/30 border border-white/10 rounded-xl p-8">
                <h2 className="text-label-caps text-on-surface-variant mb-6">Spending by Day</h2>
                <div className="flex items-end justify-between h-48 mt-4 gap-2">
                  {Object.entries(dayMap).map(([day, amt]) => {
                    const heightPct = (amt / maxDaySpend) * 100;
                    return (
                      <div key={day} className="flex flex-col items-center flex-1 group">
                        <div className="w-full relative h-full flex flex-col justify-end">
                          <motion.div
                            className="w-full bg-tertiary rounded-t-sm group-hover:bg-tertiary-fixed relative"
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPct}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            style={{ minHeight: "4px" }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-data-mono text-[10px] bg-surface-container-high px-2 py-1 rounded whitespace-nowrap">
                              ₹{amt.toLocaleString("en-IN")}
                            </div>
                          </motion.div>
                        </div>
                        <span className="text-[10px] text-on-surface-variant uppercase mt-2">
                          {day.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Merchants */}
              <div className="bg-surface-container/30 border border-white/10 rounded-xl p-8 md:col-span-2">
                <h2 className="text-label-caps text-on-surface-variant mb-6">Top Merchants</h2>
                {topMerchants.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">No merchant data available.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {topMerchants.map(([name, amt], i) => (
                      <div
                        key={name}
                        className="bg-surface/30 border border-white/5 rounded-lg p-4 hover:border-white/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-label-caps text-on-surface-variant">#{i + 1}</span>
                          <span className="text-body-sm font-medium truncate">{name}</span>
                        </div>
                        <span className="text-data-mono text-primary">
                          ₹{amt.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}
