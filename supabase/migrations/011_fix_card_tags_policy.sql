-- Migration: Fix card_tags RLS policy
-- This migration fixes the RLS policy for card_tags to properly handle INSERT operations
-- and creates SECURITY DEFINER functions for managing card_tags

-- Drop existing policy
DROP POLICY IF EXISTS "Pipeline members can manage card tags" ON public.card_tags;

-- Recreate policy with separate clauses for different operations
-- SELECT, UPDATE, DELETE use USING
-- Use is_pipeline_member function for better performance and consistency
CREATE POLICY "Pipeline members can view card tags"
    ON public.card_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_tags.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

-- INSERT uses WITH CHECK
-- Use is_pipeline_member function for better performance and consistency
CREATE POLICY "Pipeline members can insert card tags"
    ON public.card_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_tags.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

-- UPDATE uses USING and WITH CHECK
-- Use is_pipeline_member function for better performance and consistency
CREATE POLICY "Pipeline members can update card tags"
    ON public.card_tags FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_tags.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_tags.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

-- DELETE uses USING
-- Use is_pipeline_member function for better performance and consistency
CREATE POLICY "Pipeline members can delete card tags"
    ON public.card_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_tags.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

-- Also fix tags policy to allow authenticated users to create tags
DROP POLICY IF EXISTS "Managers can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Users can view all tags" ON public.tags;

CREATE POLICY "Users can view all tags"
    ON public.tags FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create tags"
    ON public.tags FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update tags"
    ON public.tags FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'manager'
        )
        OR EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE user_id = auth.uid()
            AND role = 'manager'
            AND invitation_status = 'accepted'
            LIMIT 1
        )
    );

CREATE POLICY "Managers can delete tags"
    ON public.tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'manager'
        )
        OR EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE user_id = auth.uid()
            AND role = 'manager'
            AND invitation_status = 'accepted'
            LIMIT 1
        )
    );

