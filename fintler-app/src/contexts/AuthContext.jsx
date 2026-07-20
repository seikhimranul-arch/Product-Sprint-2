/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const DEMO_USER = { id: 'demo-user-001', email: 'arjun.kumar@gmail.com', user_metadata: { full_name: 'Arjun Kumar' } };
const demoModeEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === "true" && import.meta.env.PROD !== true;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const providerTokenRef = useRef(null);
  const providerRefreshTokenRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.provider_token) providerTokenRef.current = newSession.provider_token;
      if (newSession?.provider_refresh_token) providerRefreshTokenRef.current = newSession.provider_refresh_token;

      setSession(newSession ? {
        ...newSession,
        provider_token: newSession.provider_token || providerTokenRef.current,
        provider_refresh_token: newSession.provider_refresh_token || providerRefreshTokenRef.current,
      } : null);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      if (!demoModeEnabled) {
        return { error: new Error("Supabase is not configured. Set VITE_ENABLE_DEMO_MODE=true for local demos only.") };
      }
      setUser(DEMO_USER);
      setSession({ access_token: 'demo', user: DEMO_USER });
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
    providerTokenRef.current = null;
    providerRefreshTokenRef.current = null;
    if (supabase) await supabase.auth.signOut();
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
