-- =============================================
-- FintLer: Robust Sync Migration
-- Run this in Supabase SQL Editor ONCE
-- Safe to re-run (uses IF NOT EXISTS)
-- =============================================

-- 1. Ensure Gmail token storage columns exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='gmail_access_token') THEN
    ALTER TABLE public.profiles ADD COLUMN gmail_access_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='gmail_refresh_token') THEN
    ALTER TABLE public.profiles ADD COLUMN gmail_refresh_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='gmail_token_expiry') THEN
    ALTER TABLE public.profiles ADD COLUMN gmail_token_expiry TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='budget_goal') THEN
    ALTER TABLE public.profiles ADD COLUMN budget_goal NUMERIC(12,2);
  END IF;
END $$;

-- 2. Add unique constraint on source_email_id to prevent duplicates at DB level
CREATE UNIQUE INDEX IF NOT EXISTS transactions_source_email_unique
  ON public.transactions (source_email_id)
  WHERE source_email_id IS NOT NULL;
