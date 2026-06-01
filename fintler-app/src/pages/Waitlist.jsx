import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import Footer from "../components/Footer";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      if (supabase) {
        const { error: insertErr } = await supabase
          .from("waitlist")
          .insert({ email: email.trim().toLowerCase(), name: name.trim() || null, source: "waitlist_page" });

        if (insertErr) {
          if (insertErr.code === "23505") {
            // Duplicate — already on waitlist
            setSubmitted(true);
          } else {
            setError("Something went wrong. Please try again.");
            console.error(insertErr);
          }
        } else {
          setSubmitted(true);
        }
      } else {
        // Demo mode fallback
        setSubmitted(true);
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <main className="flex-grow flex flex-col items-center justify-center px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] max-w-[var(--spacing-container-max)] mx-auto pt-24 pb-20 text-center">

        {/* Gradient orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-secondary-container rounded-full mix-blend-screen filter blur-[120px] opacity-15 pointer-events-none" />

        {!submitted ? (
          <motion.div
            className="relative z-10 max-w-lg w-full"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="early-access-badge">
                <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                Limited Beta Access
              </span>
            </div>

            <h1 className="text-display mb-4">Join the Waitlist</h1>
            <p className="text-headline-md text-on-surface-variant mb-10 font-light max-w-md mx-auto">
              FintLer is currently in private beta. Drop your Gmail and we'll reach out when your spot opens up.
            </p>

            <form onSubmit={handleSubmit} className="glass-card rounded-xl p-8 text-left space-y-5">
              <div>
                <label htmlFor="waitlist-name" className="text-label-caps text-on-surface-variant block mb-2">
                  Name <span className="text-on-surface-variant/50">(optional)</span>
                </label>
                <input
                  id="waitlist-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-surface-container/50 border border-white/10 rounded-lg px-4 py-3 text-body-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="waitlist-email" className="text-label-caps text-on-surface-variant block mb-2">
                  Gmail Address <span className="text-error/70">*</span>
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full bg-surface-container/50 border border-white/10 rounded-lg px-4 py-3 text-body-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {error && (
                <p className="text-body-sm text-error flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-primary text-on-primary py-3 rounded-lg hover:bg-primary/90 transition-colors text-label-caps disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Request Access"}
              </button>

              <p className="text-[11px] text-on-surface-variant/50 text-center">
                We'll only use your email to send you an invite. No spam, ever.
              </p>
            </form>
          </motion.div>
        ) : (
          /* Success State */
          <motion.div
            className="relative z-10 max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <div className="w-20 h-20 bg-tertiary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-tertiary/20">
              <span className="material-symbols-outlined text-tertiary text-4xl">check_circle</span>
            </div>
            <h2 className="text-display mb-4">You're on the list.</h2>
            <p className="text-body-lg text-on-surface-variant mb-8">
              We'll reach out to <strong className="text-on-surface">{email}</strong> when your spot opens up. Early users get priority access to all features.
            </p>
            <Link
              to="/"
              className="inline-block border border-white/10 text-on-surface px-6 py-3 rounded-lg hover:border-white/20 transition-colors text-body-sm"
            >
              ← Back to Home
            </Link>
          </motion.div>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}
