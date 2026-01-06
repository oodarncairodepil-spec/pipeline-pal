-- Migration: Add live_date_target column to cards table
-- This migration adds a live_date_target column to store the target date for going live

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS live_date_target DATE;

COMMENT ON COLUMN public.cards.live_date_target IS 'Target date for going live';

