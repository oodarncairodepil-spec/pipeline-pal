-- Migration: Force Fix pipeline INSERT policy
-- This migration uses a more aggressive approach to fix the INSERT policy
-- It creates a SECURITY DEFINER function as a workaround if direct policy doesn't work

-- Step 1: Drop ALL existing policies on pipelines table (not just INSERT)
-- This ensures we start with a clean slate
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'pipelines'
        AND cmd = 'INSERT'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.pipelines';
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a SECURITY DEFINER function that bypasses RLS for INSERT
-- This function will be used to insert pipelines
CREATE OR REPLACE FUNCTION public.create_pipeline(p_name TEXT)
RETURNS TABLE(id BIGINT, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_pipeline_id BIGINT;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create pipelines';
    END IF;
    
    -- Insert the pipeline
    INSERT INTO public.pipelines (name)
    VALUES (p_name)
    RETURNING public.pipelines.id, public.pipelines.name INTO v_pipeline_id, p_name;
    
    -- Automatically add creator as manager
    INSERT INTO public.pipeline_members (pipeline_id, user_id, role, invitation_status)
    VALUES (v_pipeline_id, v_user_id, 'manager', 'accepted')
    ON CONFLICT DO NOTHING;
    
    -- Return the created pipeline
    RETURN QUERY SELECT v_pipeline_id, p_name::TEXT;
END;
$$;

-- Step 4: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_pipeline(TEXT) TO authenticated;

-- Step 5: Also create a direct policy as backup (in case function approach doesn't work)
CREATE POLICY "Authenticated users can create pipelines"
    ON public.pipelines FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Step 6: Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'pipelines'
AND cmd = 'INSERT';

