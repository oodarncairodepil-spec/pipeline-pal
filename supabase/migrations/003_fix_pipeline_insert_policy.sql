-- Migration: Fix pipeline INSERT policy
-- This migration ensures the INSERT policy for pipelines is correctly set
-- Run this if migration 002 was already executed but policy still blocks INSERT

-- Drop ALL existing INSERT policies on pipelines to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can create pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can create pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Pipeline creators can create pipelines" ON public.pipelines;

-- Ensure RLS is enabled
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Create policy that allows any authenticated user to create pipelines
-- This is necessary for initial setup when no pipeline members exist yet
-- Using the simplest condition that should work: auth.uid() IS NOT NULL
CREATE POLICY "Authenticated users can create pipelines"
    ON public.pipelines FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policy was created
-- You can check this in Supabase dashboard: Authentication > Policies > pipelines
-- The policy should allow INSERT for any authenticated user

