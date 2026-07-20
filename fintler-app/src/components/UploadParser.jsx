import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { parseTransactions, detectFormat, EXAMPLE_FORMATS } from "../lib/parser";

const CAT_EMOJI = {
  food: "🍔", transport: "🚗", shopping: "🛒", groceries: "🛒",
  subscriptions: "📱", utilities: "⚡", emi: "🏦", health: "💊",
  transfer: "💸", entertainment: "🎬", salary: "💼", misc: "📄",
};

export default function UploadParser({ onImport, onClose }) {
  const [input, setInput] = useState("");
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [step, setStep] = useState("input"); // input | preview | done
  const [format, setFormat] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const fileRef = useRef(null);

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setInput(text);
        const fmt = detectFormat(file.name, text);
        setFormat(fmt);
        const txs = parseTransactions(text, file.name);
        setParsed(txs);
        setSelected(new Set(txs.map((_, i) => i)));
        if (txs.length > 0) setStep("preview");
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePaste = useCallback(() => {
    if (!input.trim()) return;
    const fn = filename || "pasted.txt";
    const fmt = detectFormat(fn, input);
    setFormat(fmt);
    const txs = parseTransactions(input, fn);
    setParsed(txs);
    setSelected(new Set(txs.map((_, i) => i)));
    if (txs.length > 0) setStep("preview");
  }, [input, filename]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          setInput(text);
          const fmt = detectFormat(file.name, text);
          setFormat(fmt);
          const txs = parseTransactions(text, file.name);
          setParsed(txs);
          setSelected(new Set(txs.map((_, i) => i)));
          if (txs.length > 0) setStep("preview");
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const toggleSelect = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(parsed.map((_, i) => i)));
  const selectNone = () => setSelected(new Set());

  const handleImport = () => {
    const txs = parsed.filter((_, i) => selected.has(i));
    onImport?.(txs);
    setStep("done");
  };

  const totalSelected = parsed.filter((_, i) => selected.has(i)).reduce((s, t) => s + t.amount, 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h2 className="text-base font-bold">Import Transactions</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-halo-text3)" }}>
              Upload files or paste text from notes, Notion, CSV, or any source
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center border-none cursor-pointer"
                  style={{ background: "var(--color-elevated)", color: "var(--color-halo-text2)" }}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "input" && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
                style={{ borderColor: "var(--color-border)", background: "var(--color-elevated)" }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <div className="text-3xl mb-2">📁</div>
                <div className="text-sm font-semibold mb-1">Drop a file here or click to browse</div>
                <div className="text-[11px]" style={{ color: "var(--color-halo-text3)" }}>
                  Supports .txt, .csv, .json, .md — or any text file
                </div>
                <input ref={fileRef} type="file" accept=".txt,.csv,.json,.md,.text,.markdown" className="hidden" onChange={handleFile} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
                <span className="text-[10px] font-semibold" style={{ color: "var(--color-halo-text3)" }}>OR PASTE TEXT</span>
                <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
              </div>

              {/* Text input */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Paste your spending notes here...\n\nExample:\nSwiggy order ₹780\nUber ride ₹320 yesterday\nNetflix subscription ₹649\nSalary credited ₹85,000`}
                className="w-full h-40 p-3 rounded-xl text-sm font-mono resize-none outline-none"
                style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)", color: "var(--color-halo-text)" }}
              />

              {/* Examples toggle */}
              <button onClick={() => setShowExamples(!showExamples)}
                      className="text-[11px] font-semibold cursor-pointer border-none bg-transparent"
                      style={{ color: "var(--color-halo-indigo)" }}>
                {showExamples ? "Hide" : "Show"} supported formats
              </button>

              {showExamples && (
                <div className="grid grid-cols-2 gap-2">
                  {EXAMPLE_FORMATS.map((ex) => (
                    <div key={ex.label} className="p-3 rounded-lg" style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)" }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: "var(--color-halo-indigo)" }}>{ex.label}</div>
                      <pre className="text-[10px] whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-halo-text3)" }}>{ex.example}</pre>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handlePaste} disabled={!input.trim()}
                      className="btn-primary w-full py-3 text-sm disabled:opacity-40">
                Parse Text
              </button>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--color-halo-indigo-soft)", color: "var(--color-halo-indigo)" }}>
                    {format}
                  </span>
                  <span className="text-xs ml-2" style={{ color: "var(--color-halo-text2)" }}>
                    {parsed.length} transactions found
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-[10px] font-semibold cursor-pointer border-none bg-transparent" style={{ color: "var(--color-halo-indigo)" }}>Select All</button>
                  <button onClick={selectNone} className="text-[10px] font-semibold cursor-pointer border-none bg-transparent" style={{ color: "var(--color-halo-text3)" }}>None</button>
                </div>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {parsed.map((tx, i) => (
                  <div key={tx.id}
                       className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selected.has(i) ? "ring-1" : "opacity-50"}`}
                       style={{
                         background: "var(--color-elevated)",
                         borderColor: selected.has(i) ? "var(--color-halo-indigo)" : "transparent",
                         ringColor: "var(--color-halo-indigo)",
                       }}
                       onClick={() => toggleSelect(i)}>
                    <input type="checkbox" checked={selected.has(i)} readOnly
                           className="consent-checkbox" />
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                         style={{ background: "var(--color-surface)" }}>
                      {CAT_EMOJI[tx.category] || "📄"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{tx.merchant}</div>
                      <div className="text-[10px]" style={{ color: "var(--color-halo-text3)" }}>{tx.category} · {tx.type}</div>
                    </div>
                    <div className="text-sm font-bold font-mono"
                         style={{ color: tx.type === "credit" ? "var(--color-halo-lime)" : "var(--color-halo-text)" }}>
                      {tx.type === "credit" ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                <button onClick={() => { setStep("input"); setParsed([]); setSelected(new Set()); }}
                        className="btn-ghost flex-1 py-3 text-sm">
                  Back
                </button>
                <button onClick={handleImport} disabled={selected.size === 0}
                        className="btn-primary flex-1 py-3 text-sm disabled:opacity-40">
                  Import {selected.size} Transactions (₹{totalSelected.toLocaleString("en-IN")})
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-base font-bold mb-1">Imported Successfully</div>
              <div className="text-xs mb-4" style={{ color: "var(--color-halo-text2)" }}>
                {selected.size} transactions added to your dashboard
              </div>
              <button onClick={onClose} className="btn-primary px-8 py-2.5 text-sm">Done</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
