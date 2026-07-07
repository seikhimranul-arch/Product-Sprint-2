-- ============================================================
-- FintLer — Complete Database Schema v3
-- Run in: Supabase Dashboard → SQL Editor → Run All
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT,
  full_name            TEXT,
  avatar_url           TEXT,
  spending_personality TEXT,
  gmail_sync_enabled   BOOLEAN DEFAULT false,
  gmail_history_id     TEXT,
  gmail_access_token   TEXT,
  gmail_refresh_token  TEXT,
  gmail_token_expiry   TIMESTAMPTZ,
  budget_goal          NUMERIC(12,2),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on Google sign-in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. TRANSACTIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_email_id  TEXT,                          -- Gmail message ID (for dedup)
  bank_name        TEXT DEFAULT 'unknown',
  account_last4    TEXT,
  amount           NUMERIC(12,2) NOT NULL,
  type             TEXT CHECK (type IN ('credit','debit')) NOT NULL,
  merchant         TEXT,
  category         TEXT DEFAULT 'Uncategorized',
  description      TEXT,
  transaction_date TIMESTAMPTZ DEFAULT now(),
  day_of_week      TEXT,
  hour_of_day      INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Dedup index: one row per email per user
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_email_dedup
  ON public.transactions (user_id, source_email_id)
  WHERE source_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS transactions_user_category_idx
  ON public.transactions (user_id, category);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_read" ON public.transactions;
DROP POLICY IF EXISTS "transactions_write" ON public.transactions;
CREATE POLICY "transactions_read" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_write" ON public.transactions
  FOR INSERT WITH CHECK (true);  -- service role inserts
CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ── 3. INSIGHTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.insights (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spending_personality      TEXT,
  personality_description   TEXT,
  summary                   TEXT,
  category_alert_title      TEXT,
  category_alert_amount     NUMERIC(12,2),
  category_alert_category   TEXT,
  behavioral_trigger        TEXT,
  behavioral_trigger_detail TEXT,
  micro_goal                TEXT,
  raw_ai_response           JSONB,
  generated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insights_user_recent_idx
  ON public.insights (user_id, generated_at DESC);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insights_read" ON public.insights;
DROP POLICY IF EXISTS "insights_write" ON public.insights;
CREATE POLICY "insights_read" ON public.insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insights_write" ON public.insights
  FOR INSERT WITH CHECK (true);
CREATE POLICY "insights_delete" ON public.insights
  FOR DELETE USING (true);

-- ── 4. WAITLIST ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  source     TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_insert" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_read" ON public.waitlist;
CREATE POLICY "waitlist_insert" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "waitlist_read"   ON public.waitlist FOR SELECT USING (true);

-- ── 5. REALTIME ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.insights;
