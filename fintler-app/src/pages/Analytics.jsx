import { motion } from "framer-motion";
import useAnalyticsData from "../hooks/useAnalyticsData";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08 },
  }),
};

const CAT_COLORS = {
  food: "var(--color-halo-magenta)",
  transport: "var(--color-halo-cyan)",
  shopping: "var(--color-halo-amber)",
  groceries: "var(--color-halo-lime)",
  subscriptions: "var(--color-halo-indigo)",
  utilities: "var(--color-halo-indigo-hover)",
  emi: "var(--color-halo-text2)",
  health: "var(--color-halo-magenta)",
  transfer: "var(--color-halo-cyan)",
  entertainment: "var(--color-halo-amber)",
  salary: "var(--color-halo-lime)",
};

export default function Analytics() {
  const { txs, loading, totalSpend, sortedCategories, dayMap, maxDaySpend, topMerchants } = useAnalyticsData();
  const safeTxs = txs || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const dayEntries = Object.entries(dayMap);

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
        <div className="p-4 lg:p-10 max-w-[1200px] mx-auto">

          <header className="mb-8">
            <h1 className="text-display mb-1">Analytics</h1>
            <p className="text-body-sm" style={{ color: "var(--color-halo-text2)" }}>A deeper dive into your spending habits.</p>
          </header>

          {safeTxs.length === 0 ? (
            <div className="halo-card p-12 text-center">
              <p className="text-body-lg" style={{ color: "var(--color-halo-text2)" }}>
                Not enough data yet. Connect Gmail in Dashboard to start tracking.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <motion.div className="halo-card" custom={0} initial="hidden" animate="visible" variants={cardVariants}>
                  <div className="halo-card-accent" style={{ background: "var(--color-halo-indigo)" }} />
                  <div className="text-label-caps mb-2">Total Debits</div>
                  <div className="text-2xl lg:text-3xl font-extrabold tracking-tight font-mono" style={{ color: "var(--color-halo-indigo)" }}>
                    ₹{totalSpend.toLocaleString("en-IN")}
                  </div>
                </motion.div>
                <motion.div className="halo-card" custom={1} initial="hidden" animate="visible" variants={cardVariants}>
                  <div className="halo-card-accent" style={{ background: "var(--color-halo-amber)" }} />
                  <div className="text-label-caps mb-2">Transactions</div>
                  <div className="text-2xl lg:text-3xl font-extrabold tracking-tight font-mono">{safeTxs.length}</div>
                </motion.div>
                <motion.div className="halo-card col-span-2 lg:col-span-1" custom={2} initial="hidden" animate="visible" variants={cardVariants}>
                  <div className="halo-card-accent" style={{ background: "var(--color-halo-lime)" }} />
                  <div className="text-label-caps mb-2">Avg per Txn</div>
                  <div className="text-2xl lg:text-3xl font-extrabold tracking-tight font-mono" style={{ color: "var(--color-halo-lime)" }}>
                    ₹{safeTxs.length > 0 ? Math.round(totalSpend / safeTxs.length).toLocaleString("en-IN") : 0}
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Spend by Category */}
                <motion.div className="halo-card" custom={3} initial="hidden" animate="visible" variants={cardVariants}>
                  <div className="text-label-caps mb-4">Spend by Category</div>
                  <div className="space-y-4">
                    {sortedCategories.map(([cat, amt]) => {
                      const pct = Math.round((amt / totalSpend) * 100) || 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="capitalize font-semibold">{cat}</span>
                            <span className="font-mono" style={{ color: "var(--color-halo-text2)" }}>
                              ₹{amt.toLocaleString("en-IN")} · {pct}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--color-elevated)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: CAT_COLORS[cat] || "var(--color-halo-indigo)" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Spending by Day of Week */}
                <motion.div className="halo-card" custom={4} initial="hidden" animate="visible" variants={cardVariants}>
                  <div className="text-label-caps mb-4">Spending by Day</div>
                  <div className="flex items-end justify-between gap-2 mt-4" style={{ height: "200px" }}>
                    {dayEntries.map(([day, amt]) => {
                      const heightPct = maxDaySpend > 0 ? Math.max((amt / maxDaySpend) * 100, 4) : 4;
                      const color = day === "friday" || day === "saturday" || day === "sunday"
                        ? "var(--color-halo-amber)"
                        : "var(--color-halo-indigo)";
                      return (
                        <div key={day} className="flex flex-col items-center flex-1 group h-full">
                          <div className="w-full flex-1 flex flex-col justify-end relative">
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10"
                                 style={{ background: "var(--color-elevated)", color: "var(--color-halo-text)", border: "1px solid var(--color-border)" }}>
                              ₹{amt.toLocaleString("en-IN")}
                            </div>
                            <motion.div
                              className="w-full rounded-t-sm transition-colors"
                              style={{ background: color }}
                              initial={{ height: 0 }}
                              animate={{ height: `${heightPct}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                            />
                          </div>
                          <span className="text-[10px] uppercase mt-2 font-semibold tracking-wider"
                                style={{ color: "var(--color-halo-text3)" }}>
                            {day.slice(0, 3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Top Merchants */}
                <motion.div className="lg:col-span-2 halo-card" custom={5} initial="hidden" animate="visible" variants={cardVariants}>
                  <div className="text-label-caps mb-4">Top Merchants</div>
                  {topMerchants.length === 0 ? (
                    <p className="text-body-sm" style={{ color: "var(--color-halo-text2)" }}>No merchant data available.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {topMerchants.map(([name, amt], i) => (
                        <div key={name} className="rounded-xl p-4 transition-colors"
                             style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold font-mono" style={{ color: "var(--color-halo-text3)" }}>#{i + 1}</span>
                            <span className="text-xs font-semibold truncate">{name}</span>
                          </div>
                          <span className="text-sm font-bold font-mono" style={{ color: "var(--color-halo-indigo)" }}>
                            ₹{amt.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </div>
      </main>
    </motion.div>
  );
}
