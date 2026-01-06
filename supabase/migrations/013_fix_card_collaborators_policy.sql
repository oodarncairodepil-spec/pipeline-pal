-- Fix card_collaborators RLS policy
-- This migration fixes the RLS policy for card_collaborators to properly handle INSERT operations

-- Drop existing policy
DROP POLICY IF EXISTS "Pipeline members can manage collaborators" ON public.card_collaborators;

-- Recreate policy with separate clauses for different operations
-- SELECT uses USING
CREATE POLICY "Pipeline members can view card collaborators"
    ON public.card_collaborators FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_collaborators.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

-- INSERT uses WITH CHECK
CREATE POLICY "Pipeline members can insert card collaborators"
    ON public.card_collaborators FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_collaborators.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

-- UPDATE uses USING and WITH CHECK
CREATE POLICY "Pipeline members can update card collaborators"
    ON public.card_collaborators FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_collaborators.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_collaborators.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

-- DELETE uses USING
CREATE POLICY "Pipeline members can delete card collaborators"
    ON public.card_collaborators FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_collaborators.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

