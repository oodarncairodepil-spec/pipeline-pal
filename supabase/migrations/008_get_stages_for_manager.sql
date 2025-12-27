-- Migration: Get stages for manager
-- This migration creates a function that allows managers to see all stages
-- regardless of their membership status, similar to get_all_pipelines_for_manager

-- Create a function to get all stages for a pipeline (for managers)
CREATE OR REPLACE FUNCTION public.get_pipeline_stages_for_manager(p_pipeline_id BIGINT)
RETURNS TABLE(stage_id TEXT, stage_name TEXT, stage_color TEXT, stage_order INTEGER)
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
        RAISE EXCEPTION 'User must be authenticated to view stages';
    END IF;
    
    -- Check if user is a manager (check both users.role and if they're manager in any pipeline)
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_user_id;
    
    -- Also check if user is a manager in any pipeline (as a fallback)
    IF v_user_role IS NULL OR v_user_role != 'manager' THEN
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
    
    -- If user is a manager, return all stages for the pipeline
    -- Otherwise, return only stages for pipelines they are members of
    IF v_user_role = 'manager' THEN
        RETURN QUERY
        SELECT 
            ps.id AS stage_id,
            ps.name AS stage_name,
            ps.color AS stage_color,
            ps.order AS stage_order
        FROM public.pipeline_stages ps
        WHERE ps.pipeline_id = p_pipeline_id
        ORDER BY ps.order ASC;
    ELSE
        -- For non-managers, use the standard RLS policy (they can only see stages of pipelines they're members of)
        RETURN QUERY
        SELECT 
            ps.id AS stage_id,
            ps.name AS stage_name,
            ps.color AS stage_color,
            ps.order AS stage_order
        FROM public.pipeline_stages ps
        WHERE ps.pipeline_id = p_pipeline_id
        AND public.is_pipeline_member(ps.pipeline_id, v_user_id)
        ORDER BY ps.order ASC;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pipeline_stages_for_manager(BIGINT) TO authenticated;

