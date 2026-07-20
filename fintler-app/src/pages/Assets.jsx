import { motion } from "framer-motion";

export default function Assets() {
  return (
    <motion.div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-halo-text)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <main className="flex-1 lg:ml-[var(--spacing-sidebar)] pb-20 lg:pb-0 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
             style={{ background: "var(--color-halo-indigo-soft)", border: "1px solid rgba(91,107,255,0.2)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-halo-indigo)" strokeWidth="2" className="w-10 h-10">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </div>
        <h1 className="text-display mb-4">Assets & Wealth</h1>
        <p className="text-body-lg max-w-md" style={{ color: "var(--color-halo-text2)" }}>
          We are currently building the wealth tracking engine. Soon, you'll be able to link your demat accounts, mutual funds, and fixed deposits for a complete net worth view.
        </p>
        <div className="mt-8 px-6 py-2 rounded-full text-label-caps"
             style={{ border: "1px solid var(--color-border)", color: "var(--color-halo-text3)" }}>
          Coming Soon
        </div>
      </main>
    </motion.div>
  );
}
