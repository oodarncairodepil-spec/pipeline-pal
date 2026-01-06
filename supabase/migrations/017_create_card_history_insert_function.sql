-- Migration: Create SECURITY DEFINER function for inserting card history
-- This function allows pipeline members to insert history entries bypassing RLS

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.insert_card_history(TEXT, TEXT, UUID, JSONB, TIMESTAMPTZ);

-- Create a SECURITY DEFINER function to insert card history
CREATE OR REPLACE FUNCTION public.insert_card_history(
    p_id TEXT,
    p_card_id TEXT,
    p_event_type TEXT,
    p_user_id UUID,
    p_details JSONB DEFAULT '{}'::JSONB,
    p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
    v_pipeline_id BIGINT;
BEGIN
    -- Get the current user ID
    v_current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create history entries';
    END IF;
    
    -- Get the pipeline_id for the card
    SELECT pipeline_id INTO v_pipeline_id
    FROM public.cards
    WHERE id = p_card_id;
    
    IF v_pipeline_id IS NULL THEN
        RAISE EXCEPTION 'Card not found';
    END IF;
    
    -- Check if current user is a member of the pipeline
    IF NOT public.is_pipeline_member(v_pipeline_id, v_current_user_id) THEN
        RAISE EXCEPTION 'Only pipeline members can create history entries';
    END IF;
    
    -- Insert the history entry
    INSERT INTO public.card_history (
        id,
        card_id,
        event_type,
        user_id,
        details,
        timestamp
    )
    VALUES (
        p_id,
        p_card_id,
        p_event_type,
        p_user_id,
        p_details,
        COALESCE(p_timestamp, NOW())
    )
    ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_card_history(TEXT, TEXT, TEXT, UUID, JSONB, TIMESTAMPTZ) TO authenticated;

