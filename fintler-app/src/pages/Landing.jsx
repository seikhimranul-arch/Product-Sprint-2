import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import {
  features,
  cashFlowAmount,
  landingInsights,
} from "../lib/mockData";

export default function Landing() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const orbsRef = useRef([]);

  // Consent state
  const [consentLegal, setConsentLegal] = useState(false);
  const [consentGmail, setConsentGmail] = useState(false);
  const [consentEarlyAccess, setConsentEarlyAccess] = useState(false);
  const [showConsentWarning, setShowConsentWarning] = useState(false);

  const allConsented = consentLegal && consentGmail && consentEarlyAccess;

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Clear warning when all boxes are checked
  useEffect(() => {
    if (allConsented) {
      queueMicrotask(() => setShowConsentWarning(false));
    }
  }, [allConsented]);

  // Parallax orbs on mouse move
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      orbsRef.current.forEach((orb, index) => {
        if (orb) {
          const speed = (index + 1) * 20;
          orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        }
      });
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleGoogleAuth = async () => {
    if (!allConsented) {
      setShowConsentWarning(true);
      return;
    }
    const { error } = await signInWithGoogle();
    if (!error) {
      navigate("/sync");
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <main className="flex-grow pt-24 pb-20 px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] max-w-[var(--spacing-container-max)] mx-auto w-full flex flex-col items-center justify-center relative">
        {/* Background Orbs */}
        <div
          ref={(el) => (orbsRef.current[0] = el)}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-secondary-container rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"
        />
        <div
          ref={(el) => (orbsRef.current[1] = el)}
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-tertiary-fixed rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"
        />

        {/* Hero */}
        <motion.div
          className="text-center max-w-3xl mb-16 relative z-10 pt-12"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Early Access Badge */}
          <div className="flex justify-center mb-6">
            <span className="early-access-badge">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Early Access — Limited Users
            </span>
          </div>

          <h1 className="text-display text-on-surface mb-6 drop-shadow-2xl">
            Cure Salary Day Anxiety.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-tertiary to-secondary">
              See exactly where your money vanishes.
            </span>
          </h1>

          <p className="text-headline-md text-on-surface-variant mb-10 max-w-2xl mx-auto font-light">
            Precision clarity for your finances. Zero manual data entry.
          </p>

          {/* Consent Card */}
          <motion.div
            className="max-w-md mx-auto mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className={`glass-card rounded-xl p-6 text-left space-y-4 transition-all duration-300 ${showConsentWarning ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : ""}`}>
              <div className="text-label-caps text-on-surface-variant/60 mb-1">
                Before you continue
              </div>

              {/* Consent 1: Legal */}
              <label className="flex items-start gap-3 cursor-pointer group" id="consent-legal">
                <input
                  type="checkbox"
                  className="consent-checkbox mt-0.5"
                  checked={consentLegal}
                  onChange={(e) => setConsentLegal(e.target.checked)}
                />
                <span className="text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  I agree to the{" "}
                  <Link to="/privacy" className="text-tertiary underline underline-offset-2 hover:opacity-80">Privacy Policy</Link>
                  {" "}and{" "}
                  <Link to="/terms" className="text-tertiary underline underline-offset-2 hover:opacity-80">Terms of Service</Link>
                </span>
              </label>

              {/* Consent 2: Gmail Access */}
              <label className="flex items-start gap-3 cursor-pointer group" id="consent-gmail">
                <input
                  type="checkbox"
                  className="consent-checkbox mt-0.5"
                  checked={consentGmail}
                  onChange={(e) => setConsentGmail(e.target.checked)}
                />
                <span className="text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  I consent to FintLer accessing my Gmail <strong className="text-on-surface">(read-only)</strong> to parse bank transaction alerts
                </span>
              </label>

              {/* Consent 3: Early Access */}
              <label className="flex items-start gap-3 cursor-pointer group" id="consent-early-access">
                <input
                  type="checkbox"
                  className="consent-checkbox mt-0.5"
                  checked={consentEarlyAccess}
                  onChange={(e) => setConsentEarlyAccess(e.target.checked)}
                />
                <span className="text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  I understand this is an early-access product and my feedback helps improve FintLer
                </span>
              </label>

              {/* Warning message */}
              {showConsentWarning && (
                <motion.div
                  className="flex items-center gap-2 text-red-400 text-body-sm pt-1"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  Please agree to all terms before continuing
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* CTA Button */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={handleGoogleAuth}
              id="google-auth-button"
              disabled={!allConsented}
              className={`flex items-center space-x-3 px-8 py-4 rounded-xl w-full max-w-md justify-center group relative overflow-hidden transition-all duration-300 ${
                allConsented
                  ? "btn-ghost text-on-surface bg-surface-container-high/50 hover:bg-surface-container-high cursor-pointer"
                  : "text-on-surface-variant/40 bg-surface-container/30 border border-white/5 cursor-not-allowed"
              }`}
            >
              {allConsented && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              )}
              <svg
                className={`w-5 h-5 transition-opacity ${allConsented ? "opacity-100" : "opacity-30"}`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="font-medium">Continue with Google</span>
            </button>

            <div className="text-label-caps text-on-surface-variant/70 flex items-center space-x-2">
              <span className="material-symbols-outlined text-[14px]">
                lock
              </span>
              <span>We only read bank alert emails. Read-only access.</span>
            </div>

            <div className="mt-2">
              <Link
                to="/waitlist"
                className="text-body-sm text-on-surface-variant/60 hover:text-tertiary transition-colors"
              >
                Don't have access yet? <span className="underline underline-offset-2">Join the waitlist →</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Dashboard Preview Bento */}
        <motion.div
          className="w-full max-w-5xl mb-24 relative z-10 ai-border-anim rounded-2xl"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="glass-card rounded-2xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 relative overflow-hidden bg-black/80">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

            {/* Main Chart */}
            <div className="col-span-1 md:col-span-8 bg-surface-container-low/40 rounded-xl p-6 border border-white/5 flex flex-col justify-between min-h-[300px]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-label-caps text-on-surface-variant mb-1">
                    CASH FLOW
                  </div>
                  <div className="text-headline-lg text-on-surface">
                    {cashFlowAmount}
                  </div>
                </div>
                <span className="material-symbols-outlined text-tertiary">
                  trending_up
                </span>
              </div>

              <div className="w-full h-32 relative mt-auto">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 400 100"
                  preserveAspectRatio="none"
                >
                  <path
                    className="chart-glow"
                    d="M0,80 C50,80 100,40 150,50 C200,60 250,20 300,30 C350,40 380,10 400,5"
                    fill="none"
                    stroke="#00dfc1"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M0,80 C50,80 100,40 150,50 C200,60 250,20 300,30 C350,40 380,10 400,5 L400,100 L0,100 Z"
                    fill="url(#chartGradient)"
                    opacity="0.2"
                  />
                  <defs>
                    <linearGradient
                      id="chartGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#00dfc1"
                        stopOpacity="0.5"
                      />
                      <stop
                        offset="100%"
                        stopColor="#00dfc1"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 border-b border-white/5 flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-white/5 w-full h-px" />
                  <div className="border-t border-white/5 w-full h-px" />
                  <div className="border-t border-white/5 w-full h-px" />
                </div>
              </div>
            </div>

            {/* Insights Preview */}
            <div className="col-span-1 md:col-span-4 bg-surface-container-low/40 rounded-xl p-6 border border-white/5 flex flex-col space-y-4">
              <div className="text-label-caps text-on-surface-variant">
                AI INSIGHTS
              </div>
              {landingInsights.map((insight, i) => (
                <div
                  key={i}
                  className={`bg-surface/50 p-4 rounded-lg border-l-2 ${insight.borderColor} flex items-start space-x-3`}
                >
                  <span
                    className={`material-symbols-outlined ${insight.iconColor} text-sm mt-0.5`}
                  >
                    {insight.icon}
                  </span>
                  <div>
                    <div className="text-body-sm text-on-surface mb-1">
                      {insight.title}
                    </div>
                    <div className="text-data-mono text-on-surface-variant text-xs">
                      {insight.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          {features.map((feature, i) => (
            <div
              key={i}
              className="glass-card p-8 rounded-xl flex flex-col items-start hover:-translate-y-1 transition-transform duration-300"
            >
              <div
                className={`w-12 h-12 rounded-full ${feature.iconBg} flex items-center justify-center mb-6 border ${feature.iconBorder}`}
              >
                <span
                  className={`material-symbols-outlined ${feature.iconColor}`}
                >
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-headline-md text-on-surface mb-3">
                {feature.title}
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.div>
      </main>

      <Footer />
    </motion.div>
  );
}
