import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const SYNC_STAGES = [
  { msg: "Connecting securely to Gmail...", pct: 10 },
  { msg: "Fetching last 90 days of bank alert emails...", pct: 35 },
  { msg: "Running regex fast-path on transactions...", pct: 55 },
  { msg: "AI fallback parsing edge cases...", pct: 70 },
  { msg: "Analyzing your spending personality...", pct: 88 },
  { msg: "Your insights are ready.", pct: 100 },
];

export default function Syncing() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [syncError, setSyncError] = useState(null);
  const [syncComplete, setSyncComplete] = useState(false);
  const progressBarRef = useRef(null);
  const hasSynced = useRef(false);

  // Animate progress bar smoothly to a target value
  const animateTo = (pct) => {
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${pct}%`;
    }
    setProgress(pct);
  };

  useEffect(() => {
    // Wait until Supabase has finished resolving the OAuth session
    if (authLoading) return;
    // If auth resolved but no user, redirect to landing
    if (!user) {
      navigate("/");
      return;
    }
    if (hasSynced.current) return;
    hasSynced.current = true;

    const run = async () => {
      // Stage 0 → 1: Connecting
      animateTo(SYNC_STAGES[0].pct);
      setStageIndex(0);
      await delay(1500);

      // Stage 1: Trigger gmail-initial-sync if we have a real session
      animateTo(SYNC_STAGES[1].pct);
      setStageIndex(1);

      if (supabase && session?.access_token) {
        try {
          // Save the Gmail OAuth tokens into email_connections table
          // The access_token from the OAuth session IS the Gmail token
          const { error: upsertErr } = await supabase
            .from("email_connections")
            .upsert({
              user_id: user.id,
              provider: "gmail",
              access_token: session.provider_token || session.access_token,
              refresh_token: session.provider_refresh_token || "",
              token_expiry: session.expires_at
                ? new Date(session.expires_at * 1000).toISOString()
                : null,
              connected_at: new Date().toISOString(),
            });

          if (upsertErr) console.warn("email_connections upsert:", upsertErr.message);

          await delay(1200);
          animateTo(SYNC_STAGES[2].pct);
          setStageIndex(2);

          // Call the gmail-initial-sync edge function
          const { data: syncData, error: syncErr } = await supabase.functions.invoke(
            "gmail-initial-sync",
            { body: { user_id: user.id } }
          );

          if (syncErr) {
            console.warn("gmail-initial-sync:", syncErr.message);
          }

          await delay(1200);
          animateTo(SYNC_STAGES[3].pct);
          setStageIndex(3);
          await delay(1200);

          // Trigger insight generation
          animateTo(SYNC_STAGES[4].pct);
          setStageIndex(4);

          await supabase.functions.invoke("generate-insights", {
            body: { user_id: user.id },
          });

        } catch (e) {
          console.warn("Sync step failed (non-fatal):", e);
        }
      } else {
        // Demo mode: simulate progress
        await delay(1200);
        animateTo(SYNC_STAGES[2].pct);
        setStageIndex(2);
        await delay(1200);
        animateTo(SYNC_STAGES[3].pct);
        setStageIndex(3);
        await delay(1200);
        animateTo(SYNC_STAGES[4].pct);
        setStageIndex(4);
      }

      await delay(1500);
      animateTo(SYNC_STAGES[5].pct);
      setStageIndex(5);
      setSyncComplete(true);

      // Navigate to dashboard after brief pause showing "ready"
      await delay(1800);
      navigate("/dashboard");
    };

    run();
  }, [authLoading, navigate, session, user]);

  const currentMsg = SYNC_STAGES[stageIndex]?.msg;

  return (
    <motion.div
      className="bg-black text-on-background flex flex-col justify-center items-center h-screen overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-[120px] z-0 pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-tertiary/10 rounded-full blur-[100px] z-0 pointer-events-none mix-blend-screen" />
      <div className="grain-overlay z-0" />
      <div className="absolute inset-0 bg-grid-pattern z-0" />

      {/* Top Label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 px-4 py-2 rounded-full bg-surface-container/50 border border-white/5 backdrop-blur-md">
        <div className={`w-2 h-2 rounded-full ${syncComplete ? "bg-tertiary shadow-[0_0_8px_#00dfc1]" : "bg-secondary-container shadow-[0_0_8px_#0043eb] status-dot"}`} />
        <span className="text-label-caps tracking-widest text-secondary-fixed">
          {syncComplete ? "SYNC COMPLETE" : "SYSTEM SYNC"}
        </span>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center w-full px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] max-w-[var(--spacing-container-max)] mx-auto h-full text-center">
        {/* Animated Core */}
        <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
          <div className="ring-base ring-1" />
          <div className="ring-base ring-2" />
          <div className="ring-base ring-3" />
          <div className="absolute w-32 h-32">
            <div className="scan-ring" />
          </div>
          <div
            className="absolute w-36 h-36 border border-dashed border-secondary-container/40 rounded-full"
            style={{ animation: "spin-slow 8s linear infinite reverse" }}
          />
          <div className="relative z-10 w-28 h-28 rounded-full bg-surface-container-low/60 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(0,67,235,0.15)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary-container/20 to-transparent" />
            <span
              className={`material-symbols-outlined text-5xl relative z-10 transition-colors duration-500 ${syncComplete ? "text-tertiary" : "text-secondary-fixed"}`}
              style={{ filter: `drop-shadow(0 0 10px ${syncComplete ? "var(--color-tertiary)" : "var(--color-secondary-fixed)"})` }}
            >
              {syncComplete ? "check_circle" : "all_inclusive"}
            </span>
          </div>
        </div>

        {/* Dynamic Text Area */}
        <div className="h-24 flex flex-col items-center justify-center overflow-hidden w-full max-w-lg relative">
          {SYNC_STAGES.map((stage, i) => (
            <p
              key={i}
              className={`text-body-lg font-mono text-on-surface text-center absolute transition-all duration-700 ease-in-out w-full ${
                i === stageIndex
                  ? "opacity-100 translate-y-0"
                  : i < stageIndex || (stageIndex === 0 && i === SYNC_STAGES.length - 1)
                  ? "opacity-0 -translate-y-8"
                  : "opacity-0 translate-y-8"
              }`}
            >
              {stage.msg}
            </p>
          ))}
        </div>

        {/* Progress percentage */}
        <p className="text-data-mono text-on-surface-variant mt-4">{progress}%</p>
      </main>

      {/* Progress Bar */}
      <div className="fixed bottom-0 left-0 w-full h-1.5 bg-surface-container-lowest z-20">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-secondary-container via-tertiary to-secondary-fixed w-0 transition-all duration-[1200ms] ease-in-out"
        />
      </div>
    </motion.div>
  );
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
