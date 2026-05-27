import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Assets() {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-black text-on-surface"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center pt-24">
        <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mb-6 border border-secondary/20">
          <span className="material-symbols-outlined text-secondary text-4xl">account_balance</span>
        </div>
        <h1 className="text-display mb-4">Assets & Wealth</h1>
        <p className="text-body-lg text-on-surface-variant max-w-md">
          We are currently building the wealth tracking engine. Soon, you'll be able to link your demat accounts, mutual funds, and fixed deposits for a complete net worth view.
        </p>
        <div className="mt-8 px-6 py-2 border border-white/10 rounded-full text-label-caps text-on-surface-variant">
          Coming Soon
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}
