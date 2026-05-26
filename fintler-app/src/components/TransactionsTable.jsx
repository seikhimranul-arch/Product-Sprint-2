import { transactions as mockTransactions } from "../lib/mockData";

export default function TransactionsTable({ transactions = mockTransactions }) {
  return (
    <div className="md:col-span-12 bg-surface-container/30 backdrop-blur-xl rounded-xl border border-white/10 p-8 overflow-x-auto">
      <span className="text-label-caps text-on-surface-variant mb-6 block">
        Recent Minimalist Transactions
      </span>
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-white/5">
            <th className="py-4 text-label-caps text-on-surface-variant font-normal">
              Date
            </th>
            <th className="py-4 text-label-caps text-on-surface-variant font-normal">
              Merchant
            </th>
            <th className="py-4 text-label-caps text-on-surface-variant font-normal">
              Category
            </th>
            <th className="py-4 text-label-caps text-on-surface-variant font-normal text-right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="text-body-sm text-on-surface">
          {transactions.map((tx, i) => (
            <tr
              key={tx.id}
              className={`hover:bg-white/5 transition-colors ${
                i < transactions.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <td className="py-4 text-on-surface-variant text-data-mono">
                {tx.date}
              </td>
              <td className="py-4 flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full ${tx.iconBg} flex items-center justify-center ${tx.iconColor}`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tx.icon}
                  </span>
                </div>
                {tx.merchant}
              </td>
              <td className="py-4 text-on-surface-variant">{tx.category}</td>
              <td className="py-4 text-right text-data-mono">{tx.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
