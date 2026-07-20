-- ============================================================
-- FintLer — Consolidated Schema Migration
-- Security/schema cleanup for Gmail OAuth, RLS, statements, and realtime.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_goal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS gmail_history_id,
  DROP COLUMN IF EXISTS gmail_access_token,
  DROP COLUMN IF EXISTS gmail_refresh_token,
  DROP COLUMN IF EXISTS gmail_token_expiry;

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

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS raw_merchant TEXT;

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

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_insert" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_read" ON public.waitlist;
CREATE POLICY "waitlist_insert" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "waitlist_read" ON public.waitlist FOR SELECT USING (false);

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
