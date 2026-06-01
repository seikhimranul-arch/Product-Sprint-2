-- =============================================
-- FintLer: Migration — Token Storage + Waitlist
-- Run this in Supabase SQL Editor ONCE
-- =============================================

-- Add Gmail token columns to profiles (safe: IF NOT EXISTS equivalent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gmail_access_token') THEN
    ALTER TABLE public.profiles ADD COLUMN gmail_access_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gmail_refresh_token') THEN
    ALTER TABLE public.profiles ADD COLUMN gmail_refresh_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gmail_token_expiry') THEN
    ALTER TABLE public.profiles ADD COLUMN gmail_token_expiry TIMESTAMPTZ;
  END IF;
END $$;

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Drop policies first if they exist (avoid errors on re-run)
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Service role can read waitlist" ON public.waitlist;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read waitlist"
  ON public.waitlist FOR SELECT
  USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS insights_user_type_idx
  ON public.insights (user_id, type);
