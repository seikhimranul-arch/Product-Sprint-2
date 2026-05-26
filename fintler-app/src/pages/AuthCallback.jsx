import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * AuthCallback — handles the OAuth redirect from Supabase/Google.
 *
 * After Google auth, Supabase redirects here with tokens in the URL hash.
 * onAuthStateChange in AuthContext picks up the tokens and sets the session.
 * This page simply waits for that to happen, then routes to /sync.
 *
 * If something goes wrong (no session after 10s), it falls back to landing.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Still resolving session from URL hash

    if (user) {
      // Session resolved — proceed to sync
      navigate("/sync", { replace: true });
    } else {
      // No session after loading finished — auth failed or was cancelled
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Timeout fallback: if auth takes too long, redirect to landing
  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/", { replace: true });
    }, 10000);
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="bg-black text-on-background flex flex-col justify-center items-center h-screen">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-[120px] z-0 pointer-events-none mix-blend-screen" />
      <div className="grain-overlay z-0" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-10 h-10 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-body-sm text-on-surface-variant font-mono">
          Completing sign-in...
        </p>
      </div>
    </div>
  );
}
