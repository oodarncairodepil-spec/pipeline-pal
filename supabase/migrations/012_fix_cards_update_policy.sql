-- Fix cards UPDATE policy to include WITH CHECK clause
-- This ensures users can update cards (including stage changes) within pipelines they are members of

DROP POLICY IF EXISTS "Pipeline members can update cards" ON public.cards;

CREATE POLICY "Pipeline members can update cards"
    ON public.cards FOR UPDATE
    USING (public.is_pipeline_member(cards.pipeline_id, auth.uid()))
    WITH CHECK (public.is_pipeline_member(cards.pipeline_id, auth.uid()));

