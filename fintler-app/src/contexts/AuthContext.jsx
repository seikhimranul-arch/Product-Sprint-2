import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Provider tokens are only available on the INITIAL auth event.
  // Supabase fires multiple events (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED)
  // and later events DON'T include provider_token, which overwrites it to null.
  // We preserve them in a ref so they survive across re-renders and events.
  const providerTokenRef = useRef(null);
  const providerRefreshTokenRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Capture provider tokens ONLY when they exist (first auth event)
      if (newSession?.provider_token) {
        providerTokenRef.current = newSession.provider_token;
      }
      if (newSession?.provider_refresh_token) {
        providerRefreshTokenRef.current = newSession.provider_refresh_token;
      }

      // Build session with preserved provider tokens
      const enrichedSession = newSession
        ? {
            ...newSession,
            provider_token: newSession.provider_token || providerTokenRef.current,
            provider_refresh_token: newSession.provider_refresh_token || providerRefreshTokenRef.current,
          }
        : null;

      setSession(enrichedSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setUser({ email: "demo@fintler.app", user_metadata: { full_name: "Demo User" } });
      setLoading(false);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/gmail.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
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
    // Clear stored provider tokens
    providerTokenRef.current = null;
    providerRefreshTokenRef.current = null;
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
