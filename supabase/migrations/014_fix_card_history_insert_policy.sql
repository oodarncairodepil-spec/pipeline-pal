-- Fix card_history INSERT policy
-- The current policy allows anyone to insert (WITH CHECK (true)), but we should restrict it to pipeline members

-- Drop existing policy
DROP POLICY IF EXISTS "System can create history entries" ON public.card_history;

-- Create policy for pipeline members to insert history
CREATE POLICY "Pipeline members can create history entries"
    ON public.card_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_history.card_id
            AND public.is_pipeline_member(cards.pipeline_id, auth.uid())
        )
    );

