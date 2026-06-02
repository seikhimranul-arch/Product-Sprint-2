import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * AuthCallback — handles the OAuth redirect from Supabase/Google.
 *
 * Supabase PKCE flow: after Google auth, we land here with a code in the URL.
 * We explicitly call exchangeCodeForSession(), then navigate to /sync.
 * 
 * DO NOT rely solely on onAuthStateChange here — on first load it may fire
 * before the code exchange completes, giving us a null session and
 * incorrectly redirecting to landing.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const handleCallback = async () => {
      if (!supabase) {
        navigate("/sync", { replace: true });
        return;
      }

      // Supabase handles the code/hash exchange automatically via onAuthStateChange.
      // We just need to wait for it to complete with a real session.
      // Poll for up to 15 seconds in 500ms intervals.
      let attempts = 0;
      const maxAttempts = 30; // 15 seconds

      const poll = async () => {
        attempts++;
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Got a valid session — go to sync
          navigate("/sync", { replace: true });
          return;
        }

        if (attempts >= maxAttempts) {
          // Timed out — something went wrong
          navigate("/", { replace: true });
          return;
        }

        // Keep waiting
        setTimeout(poll, 500);
      };

      poll();
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="bg-black text-on-background flex flex-col justify-center items-center h-screen">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-[120px] z-0 pointer-events-none mix-blend-screen" />
      <div className="grain-overlay z-0" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-body-sm text-on-surface-variant font-mono">
          Completing sign-in...
        </p>
      </div>
    </div>
  );
}
