-- ============================================================
-- FintLer — Complete Database Schema v4
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
  raw_merchant     TEXT,
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
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;
CREATE POLICY "transactions_read" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_write" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
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
DROP POLICY IF EXISTS "insights_delete" ON public.insights;
CREATE POLICY "insights_read" ON public.insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insights_write" ON public.insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_delete" ON public.insights
  FOR DELETE USING (auth.uid() = user_id);

-- ── 4. EMAIL CONNECTIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_connections (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         TEXT DEFAULT 'gmail' NOT NULL,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT,
  token_expiry     TIMESTAMPTZ,
  gmail_history_id TEXT,
  connected_at     TIMESTAMPTZ DEFAULT now(),
  revoked_at       TIMESTAMPTZ
);

ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_connections_own" ON public.email_connections;
CREATE POLICY "email_connections_own" ON public.email_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS email_connections_active_idx
  ON public.email_connections (user_id)
  WHERE revoked_at IS NULL;

-- ── 5. STATEMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.statements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name   TEXT,
  status      TEXT DEFAULT 'uploaded',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "statements_own" ON public.statements;
CREATE POLICY "statements_own" ON public.statements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 6. WAITLIST ───────────────────────────────────────────────
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
CREATE POLICY "waitlist_read"   ON public.waitlist FOR SELECT USING (false);

-- ── 7. REALTIME ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'insights'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.insights;
  END IF;
END $$;
