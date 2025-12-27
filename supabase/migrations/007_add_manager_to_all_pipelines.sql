-- Migration: Add manager to all pipelines
-- This migration creates a function that adds a user as manager to all existing pipelines
-- This is useful when a user's role is 'manager' in users table but they're not yet members of any pipeline

-- Create a function to add user as manager to all pipelines
CREATE OR REPLACE FUNCTION public.add_manager_to_all_pipelines(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pipeline RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Check if user is authenticated
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be NULL';
    END IF;
    
    -- Check if user exists and is a manager
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_user_id
        AND role = 'manager'
    ) THEN
        -- User is not a manager, return 0
        RETURN 0;
    END IF;
    
    -- Add user as manager to all existing pipelines
    FOR v_pipeline IN
        SELECT id FROM public.pipelines
    LOOP
        -- Check if user is already a member of this pipeline
        IF NOT EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE pipeline_id = v_pipeline.id
            AND user_id = p_user_id
        ) THEN
            -- Insert new membership
            INSERT INTO public.pipeline_members (pipeline_id, user_id, role, invitation_status)
            VALUES (v_pipeline.id, p_user_id, 'manager', 'accepted');
            v_count := v_count + 1;
        ELSE
            -- Update existing membership to ensure role is manager
            UPDATE public.pipeline_members
            SET role = 'manager',
                invitation_status = 'accepted'
            WHERE pipeline_id = v_pipeline.id
            AND user_id = p_user_id;
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_manager_to_all_pipelines(UUID) TO authenticated;

