-- Migration: Manage pipeline stages function
-- This migration creates SECURITY DEFINER functions to manage pipeline stages
-- This bypasses RLS for managers to create/update/delete stages

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.create_pipeline_stage(BIGINT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.update_pipeline_stage(BIGINT, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.delete_pipeline_stage(BIGINT, TEXT);

-- Create a SECURITY DEFINER function to create pipeline stages
CREATE OR REPLACE FUNCTION public.create_pipeline_stage(
    p_pipeline_id BIGINT,
    p_stage_id TEXT,
    p_stage_name TEXT,
    p_stage_color TEXT,
    p_stage_order INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the current user ID
    v_current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create pipeline stages';
    END IF;
    
    -- Check if current user is a manager (check both users.role and if they're manager in any pipeline)
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_current_user_id;
    
    -- Also check if user is a manager in any pipeline (as a fallback)
    IF v_user_role IS NULL OR v_user_role != 'manager' THEN
        IF EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE user_id = v_current_user_id
            AND role = 'manager'
            AND invitation_status = 'accepted'
            LIMIT 1
        ) THEN
            v_user_role := 'manager';
        END IF;
    END IF;
    
    -- Check if current user is a manager of the target pipeline
    IF v_user_role != 'manager' AND NOT public.is_pipeline_manager(p_pipeline_id, v_current_user_id) THEN
        RAISE EXCEPTION 'Only managers can create pipeline stages';
    END IF;
    
    -- Insert the pipeline stage
    INSERT INTO public.pipeline_stages (
        id,
        pipeline_id,
        name,
        color,
        "order"
    )
    VALUES (
        p_stage_id,
        p_pipeline_id,
        p_stage_name,
        p_stage_color,
        p_stage_order
    )
    ON CONFLICT (id, pipeline_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        "order" = EXCLUDED."order";
END;
$$;

-- Create a SECURITY DEFINER function to update pipeline stages
CREATE OR REPLACE FUNCTION public.update_pipeline_stage(
    p_pipeline_id BIGINT,
    p_stage_id TEXT,
    p_stage_name TEXT DEFAULT NULL,
    p_stage_color TEXT DEFAULT NULL,
    p_stage_order INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_user_role TEXT;
    v_updates JSONB := '{}'::JSONB;
BEGIN
    -- Get the current user ID
    v_current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to update pipeline stages';
    END IF;
    
    -- Check if current user is a manager (check both users.role and if they're manager in any pipeline)
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_current_user_id;
    
    -- Also check if user is a manager in any pipeline (as a fallback)
    IF v_user_role IS NULL OR v_user_role != 'manager' THEN
        IF EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE user_id = v_current_user_id
            AND role = 'manager'
            AND invitation_status = 'accepted'
            LIMIT 1
        ) THEN
            v_user_role := 'manager';
        END IF;
    END IF;
    
    -- Check if current user is a manager of the target pipeline
    IF v_user_role != 'manager' AND NOT public.is_pipeline_manager(p_pipeline_id, v_current_user_id) THEN
        RAISE EXCEPTION 'Only managers can update pipeline stages';
    END IF;
    
    -- Build update object
    IF p_stage_name IS NOT NULL THEN
        v_updates := v_updates || jsonb_build_object('name', p_stage_name);
    END IF;
    IF p_stage_color IS NOT NULL THEN
        v_updates := v_updates || jsonb_build_object('color', p_stage_color);
    END IF;
    IF p_stage_order IS NOT NULL THEN
        v_updates := v_updates || jsonb_build_object('order', p_stage_order);
    END IF;
    
    -- Update the pipeline stage
    UPDATE public.pipeline_stages
    SET
        name = COALESCE(p_stage_name, name),
        color = COALESCE(p_stage_color, color),
        "order" = COALESCE(p_stage_order, "order")
    WHERE id = p_stage_id
    AND pipeline_id = p_pipeline_id;
END;
$$;

-- Create a SECURITY DEFINER function to delete pipeline stages
CREATE OR REPLACE FUNCTION public.delete_pipeline_stage(
    p_pipeline_id BIGINT,
    p_stage_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the current user ID
    v_current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to delete pipeline stages';
    END IF;
    
    -- Check if current user is a manager (check both users.role and if they're manager in any pipeline)
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_current_user_id;
    
    -- Also check if user is a manager in any pipeline (as a fallback)
    IF v_user_role IS NULL OR v_user_role != 'manager' THEN
        IF EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE user_id = v_current_user_id
            AND role = 'manager'
            AND invitation_status = 'accepted'
            LIMIT 1
        ) THEN
            v_user_role := 'manager';
        END IF;
    END IF;
    
    -- Check if current user is a manager of the target pipeline
    IF v_user_role != 'manager' AND NOT public.is_pipeline_manager(p_pipeline_id, v_current_user_id) THEN
        RAISE EXCEPTION 'Only managers can delete pipeline stages';
    END IF;
    
    -- Delete the pipeline stage
    DELETE FROM public.pipeline_stages
    WHERE id = p_stage_id
    AND pipeline_id = p_pipeline_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_pipeline_stage(BIGINT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pipeline_stage(BIGINT, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pipeline_stage(BIGINT, TEXT) TO authenticated;

