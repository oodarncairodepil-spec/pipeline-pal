-- Migration: Fix pipeline_members primary key
-- This migration recreates the PRIMARY KEY constraint on pipeline_members
-- which was dropped during migration 002 but never recreated

-- Drop existing primary key if it exists (shouldn't exist, but safe to check)
ALTER TABLE public.pipeline_members DROP CONSTRAINT IF EXISTS pipeline_members_pkey;

-- Recreate the PRIMARY KEY constraint on (pipeline_id, user_id)
ALTER TABLE public.pipeline_members ADD PRIMARY KEY (pipeline_id, user_id);

-- This will allow the ON CONFLICT clause in add_pipeline_member function to work correctly

