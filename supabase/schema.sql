-- FintLer Supabase Schema

-- Set up Row Level Security (RLS)
-- We want users to only be able to see their own data.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  spending_personality text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Statements Table (to track uploads and processing status)
CREATE TABLE IF NOT EXISTS public.statements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  original_filename text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'error')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own statements" ON public.statements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own statements" ON public.statements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own statements" ON public.statements FOR UPDATE USING (auth.uid() = user_id);

-- Insights Table (stores the parsed AI output)
CREATE TABLE IF NOT EXISTS public.insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  statement_id uuid REFERENCES public.statements ON DELETE CASCADE,
  summary_text text NOT NULL,
  category_alert_text text NOT NULL,
  behavioral_trigger_text text NOT NULL,
  recommendation_text text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own insights" ON public.insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON public.insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON public.insights FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- EMAIL TRANSACTION CAPTURE FEATURE
-- Stores encrypted Gmail OAuth tokens for continuous, real-time sync.
-- Raw email bodies are NEVER stored — only structured extracted fields.
-- ─────────────────────────────────────────────────────────────────────────

-- Gmail OAuth connection per user
CREATE TABLE IF NOT EXISTS public.email_connections (
  user_id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  provider         text NOT NULL DEFAULT 'gmail',
  access_token     text NOT NULL,      -- encrypted at rest via Supabase Vault
  refresh_token    text NOT NULL,      -- encrypted at rest via Supabase Vault
  token_expiry     timestamp with time zone,
  gmail_history_id text,               -- sync cursor for Gmail Push Notifications (Pub/Sub)
  connected_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  revoked_at       timestamp with time zone  -- set when user disconnects
);

ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own email connection" ON public.email_connections
  FOR ALL USING (auth.uid() = user_id);

-- Parsed transactions extracted from bank alert emails
CREATE TABLE IF NOT EXISTS public.transactions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  -- Source tracking
  source           text NOT NULL DEFAULT 'email', -- 'email' | 'pdf' | 'csv' | 'aa'
  email_message_id text UNIQUE,        -- Gmail message ID for deduplication (not the email body)
  bank_name        text NOT NULL,      -- 'hdfc' | 'icici' | 'sbi' | 'axis' | 'kotak' | 'yes' | 'other'
  account_last4    text,               -- last 4 digits of account or card
  -- Transaction core fields
  amount_inr       integer NOT NULL,   -- amount in INR (no paise/decimals)
  type             text NOT NULL CHECK (type IN ('debit', 'credit')),
  merchant         text,               -- AI-normalized merchant name (e.g. "Swiggy")
  raw_merchant     text,               -- original string from email (e.g. "SWIGGYIT*ORDER123")
  category         text,               -- 'food' | 'travel' | 'shopping' | 'utilities' | 'transfer' | 'emi' | 'salary' | 'other'
  -- Temporal fields (pre-computed for Moment-of-Impact feature)
  transacted_at    timestamp with time zone NOT NULL,
  day_of_week      text,               -- 'monday'..'sunday'
  hour_of_day      integer CHECK (hour_of_day BETWEEN 0 AND 23),
  -- Metadata
  created_at       timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast per-user queries sorted by time
CREATE INDEX IF NOT EXISTS transactions_user_time_idx
  ON public.transactions (user_id, transacted_at DESC);

-- Index to support Moment-of-Impact analytics (hour/day heatmap)
CREATE INDEX IF NOT EXISTS transactions_user_heatmap_idx
  ON public.transactions (user_id, day_of_week, hour_of_day);
