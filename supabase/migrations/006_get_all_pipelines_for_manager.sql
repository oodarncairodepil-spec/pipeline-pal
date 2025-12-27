-- Migration: Get all pipelines for manager
-- This migration creates a function that allows managers to see all pipelines
-- regardless of their membership status, for Settings page access

-- Drop existing function if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS public.get_all_pipelines_for_manager();

-- Create a function to get all pipelines for managers
-- This function bypasses RLS for managers to see all pipelines in the system
CREATE FUNCTION public.get_all_pipelines_for_manager()
RETURNS TABLE(pipeline_id BIGINT, pipeline_name TEXT, pipeline_created_at TIMESTAMPTZ, pipeline_updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to view pipelines';
    END IF;
    
    -- Check if user is a manager (check both users.role and if they're manager in any pipeline)
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_user_id;
    
    -- Also check if user is a manager in any pipeline (as a fallback)
    -- This handles cases where user.role might not be set but they're managers in pipelines
    -- IMPORTANT: If user is manager in ANY pipeline OR users.role is 'manager', they can see ALL pipelines (for Settings page)
    -- Priority: users.role = 'manager' takes precedence
    IF v_user_role = 'manager' THEN
        -- User is manager in users table, they can see all pipelines
        NULL; -- Do nothing, v_user_role is already 'manager'
    ELSIF v_user_role IS NULL OR v_user_role != 'manager' THEN
        -- Check if user is manager in any pipeline
        IF EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE user_id = v_user_id
            AND role = 'manager'
            AND invitation_status = 'accepted'
            LIMIT 1
        ) THEN
            v_user_role := 'manager';
        END IF;
    END IF;
    
    -- If user is a manager, return all pipelines
    -- Otherwise, return only pipelines they are members of
    IF v_user_role = 'manager' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.created_at,
            p.updated_at
        FROM public.pipelines p
        ORDER BY p.created_at ASC;
    ELSE
        -- For non-managers, use the standard RLS policy (they can only see pipelines they're members of)
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.created_at,
            p.updated_at
        FROM public.pipelines p
        WHERE public.is_pipeline_member(p.id, v_user_id)
        ORDER BY p.created_at ASC;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_pipelines_for_manager() TO authenticated;

