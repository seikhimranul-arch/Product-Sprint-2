import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import UploadParser from "../components/UploadParser";
import { parseTransactions, detectFormat, EXAMPLE_FORMATS } from "../lib/parser";

const CAT_EMOJI = {
  food: "🍔", transport: "🚗", shopping: "🛒", groceries: "🛒",
  subscriptions: "📱", utilities: "⚡", emi: "🏦", health: "💊",
  transfer: "💸", entertainment: "🎬", salary: "💼", misc: "📄",
};

export default function ImportPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [importHistory, setImportHistory] = useState([]);

  const handleImport = useCallback((txs) => {
    setImportHistory((prev) => [...txs, ...prev]);
    setShowUpload(false);
  }, []);

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
            <h1 className="text-display mb-1">Import Transactions</h1>
            <p className="text-body-sm" style={{ color: "var(--color-halo-text2)" }}>
              Upload your spending data from any source — notes, Notion, CSV, or plain text.
            </p>
          </header>

          {/* Upload CTA */}
          <div className="halo-card p-8 mb-6">
            <div className="text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: "var(--color-halo-indigo-soft)", border: "1px solid rgba(91,107,255,0.2)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-halo-indigo)" strokeWidth="2" className="w-8 h-8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold mb-2">Upload Your Spending Data</h2>
              <p className="text-xs mb-6" style={{ color: "var(--color-halo-text2)" }}>
                Drag & drop a file or paste text from your notes, Notion page, spreadsheet, or any source where you track spending.
              </p>
              <button onClick={() => setShowUpload(true)} className="btn-primary px-8 py-3 text-sm">
                Open Importer
              </button>
            </div>
          </div>

          {/* Supported Formats */}
          <div className="mb-6">
            <h3 className="text-label-caps mb-4">Supported Formats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {EXAMPLE_FORMATS.map((ex) => (
                <div key={ex.label} className="halo-card p-4">
                  <div className="text-[10px] font-bold mb-2" style={{ color: "var(--color-halo-indigo)" }}>{ex.label}</div>
                  <pre className="text-[10px] whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-halo-text3)" }}>{ex.example}</pre>
                </div>
              ))}
            </div>
          </div>

          {/* Import History */}
          {importHistory.length > 0 && (
            <div>
              <h3 className="text-label-caps mb-4">Recently Imported ({importHistory.length} transactions)</h3>
              <div className="space-y-2">
                {importHistory.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl"
                       style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                         style={{ background: "var(--color-surface)" }}>
                      {CAT_EMOJI[tx.category] || "📄"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{tx.merchant}</div>
                      <div className="text-[10px]" style={{ color: "var(--color-halo-text3)" }}>{tx.category}</div>
                    </div>
                    <div className="text-sm font-bold font-mono"
                         style={{ color: tx.type === "credit" ? "var(--color-halo-lime)" : "var(--color-halo-text)" }}>
                      {tx.type === "credit" ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {showUpload && <UploadParser onImport={handleImport} onClose={() => setShowUpload(false)} />}
    </motion.div>
  );
}
