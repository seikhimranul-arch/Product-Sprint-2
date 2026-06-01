import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <motion.div
      className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-error/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        <h1 className="text-[120px] font-bold text-on-surface/10 leading-none mb-0">404</h1>
        <h2 className="text-headline-lg text-on-surface -mt-4 mb-4">Page not found</h2>
        <p className="text-body-lg text-on-surface-variant mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block bg-surface-container-high text-on-surface px-6 py-3 rounded-lg hover:bg-surface-container-highest transition-colors text-body-sm"
        >
          ← Back to Home
        </Link>
      </div>
    </motion.div>
  );
}
