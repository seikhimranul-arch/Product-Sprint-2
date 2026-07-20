import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url) => {
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
};

export const supabase = 
  supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase && import.meta.env.VITE_ENABLE_DEMO_MODE === "true" && import.meta.env.PROD !== true) {
  console.warn(
    "Valid Supabase credentials not found. Running in explicit local demo mode."
  );
}
