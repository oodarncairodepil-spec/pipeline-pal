-- Migration: Add pipeline member function
-- This migration creates a SECURITY DEFINER function to add pipeline members
-- This bypasses RLS for managers to add members to pipelines

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.add_pipeline_member(BIGINT, UUID, TEXT, TEXT);

-- Create a SECURITY DEFINER function to add pipeline members
-- This function allows managers to add members to pipelines without RLS restrictions
CREATE OR REPLACE FUNCTION public.add_pipeline_member(
    p_pipeline_id BIGINT,
    p_user_id UUID,
    p_role TEXT,
    p_invitation_status TEXT DEFAULT 'accepted'
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
        RAISE EXCEPTION 'User must be authenticated to add pipeline members';
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
        RAISE EXCEPTION 'Only managers can add pipeline members';
    END IF;
    
    -- Insert or update the pipeline member
    INSERT INTO public.pipeline_members (
        pipeline_id,
        user_id,
        role,
        invitation_status,
        invitation_sent_at
    )
    VALUES (
        p_pipeline_id,
        p_user_id,
        p_role::TEXT,
        p_invitation_status::TEXT,
        CASE WHEN p_invitation_status = 'sent' THEN NOW() ELSE NULL END
    )
    ON CONFLICT (pipeline_id, user_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        invitation_status = EXCLUDED.invitation_status,
        invitation_sent_at = CASE 
            WHEN EXCLUDED.invitation_status = 'sent' AND pipeline_members.invitation_sent_at IS NULL 
            THEN NOW() 
            ELSE pipeline_members.invitation_sent_at 
        END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_pipeline_member(BIGINT, UUID, TEXT, TEXT) TO authenticated;

