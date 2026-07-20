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

export default function TransactionsTable({ transactions = [] }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="halo-card text-center">
        <span className="text-label-caps mb-3 block">Recent Transactions</span>
        <p className="text-body-sm" style={{ color: "var(--color-halo-text2)" }}>No transactions yet. Connect Gmail to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="halo-card">
      <span className="text-label-caps mb-4 block">Recent Transactions</span>
      <div>
        {transactions.map((tx) => (
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
            <div className="text-sm font-bold font-mono"
                 style={{ color: tx.type === "credit" ? "var(--color-halo-lime)" : "var(--color-halo-text)" }}>
              {tx.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
