-- FintLer Schema — Migration v2
-- Run this AFTER the base schema.sql

-- Add full_name to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update handle_new_user trigger to capture name from Google OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for fast insight lookup per user
CREATE INDEX IF NOT EXISTS insights_user_created_idx
  ON public.insights (user_id, created_at DESC);

-- Index for email_connections active check
CREATE INDEX IF NOT EXISTS email_connections_active_idx
  ON public.email_connections (user_id)
  WHERE revoked_at IS NULL;

-- Realtime: enable publication on transactions table for live dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.insights;
