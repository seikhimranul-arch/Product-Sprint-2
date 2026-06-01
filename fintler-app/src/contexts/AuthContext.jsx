import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // onAuthStateChange handles EVERYTHING in Supabase v2:
    // - INITIAL_SESSION: resolves session from localStorage or OAuth callback URL
    // - SIGNED_IN / SIGNED_OUT: subsequent auth changes
    // DO NOT call getSession() separately — it races with the URL token exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      // Demo mode — simulate a fake user for testing
      setUser({ email: "demo@fintler.app", user_metadata: { full_name: "Demo User" } });
      setLoading(false);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        // Request offline access so Google returns a refresh_token.
        // This lets us re-sync Gmail later without re-authenticating.
        // "consent" forces the consent screen every time so we always get the refresh token.
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        // Redirect to /auth/callback — a dedicated route that waits for
        // the session to resolve before navigating to /sync.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
