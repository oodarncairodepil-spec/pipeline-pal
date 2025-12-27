-- Migration: Change pipelines.id from TEXT to SERIAL/BIGINT
-- This migration changes the pipeline ID structure to use numeric IDs
-- and uses pipeline.name as the slug for URL routing

-- ============================================================================
-- STEP 1: Add new numeric ID column
-- ============================================================================
-- First, create a sequence for the new ID
CREATE SEQUENCE IF NOT EXISTS pipelines_id_seq;

-- Add new numeric ID column (not serial, we'll populate it manually)
ALTER TABLE public.pipelines 
ADD COLUMN IF NOT EXISTS id_new BIGINT;

-- Create a temporary mapping table to track old ID -> new ID
CREATE TEMP TABLE IF NOT EXISTS pipeline_id_mapping (
    old_id TEXT,
    new_id BIGINT
);

-- Populate new IDs using sequence
UPDATE public.pipelines
SET id_new = nextval('pipelines_id_seq')
WHERE id_new IS NULL;

-- Populate mapping with existing pipelines
INSERT INTO pipeline_id_mapping (old_id, new_id)
SELECT id, id_new FROM public.pipelines;

-- ============================================================================
-- STEP 2: Update all foreign key references
-- ============================================================================

-- Update pipeline_stages
ALTER TABLE public.pipeline_stages
ADD COLUMN IF NOT EXISTS pipeline_id_new BIGINT;

UPDATE public.pipeline_stages ps
SET pipeline_id_new = pm.new_id
FROM pipeline_id_mapping pm
WHERE ps.pipeline_id::TEXT = pm.old_id;

-- Update pipeline_sections
ALTER TABLE public.pipeline_sections
ADD COLUMN IF NOT EXISTS pipeline_id_new BIGINT;

UPDATE public.pipeline_sections ps
SET pipeline_id_new = pm.new_id
FROM pipeline_id_mapping pm
WHERE ps.pipeline_id::TEXT = pm.old_id;

-- Update cards
ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS pipeline_id_new BIGINT;

UPDATE public.cards c
SET pipeline_id_new = pm.new_id
FROM pipeline_id_mapping pm
WHERE c.pipeline_id::TEXT = pm.old_id;

-- Update activity_phases
ALTER TABLE public.activity_phases
ADD COLUMN IF NOT EXISTS pipeline_id_new BIGINT;

UPDATE public.activity_phases ap
SET pipeline_id_new = pm.new_id
FROM pipeline_id_mapping pm
WHERE ap.pipeline_id::TEXT = pm.old_id;

-- Update pipeline_members
ALTER TABLE public.pipeline_members
ADD COLUMN IF NOT EXISTS pipeline_id_new BIGINT;

UPDATE public.pipeline_members pm
SET pipeline_id_new = pm2.new_id
FROM pipeline_id_mapping pm2
WHERE pm.pipeline_id::TEXT = pm2.old_id;

-- Update notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS pipeline_id_new BIGINT;

UPDATE public.notifications n
SET pipeline_id_new = pm.new_id
FROM pipeline_id_mapping pm
WHERE n.pipeline_id::TEXT = pm.old_id;

-- ============================================================================
-- STEP 3: Drop old foreign key constraints, policies, and columns
-- ============================================================================

-- Drop RLS policies first (they depend on columns)
-- Drop pipelines policies first (must be dropped before we can drop columns)
DROP POLICY IF EXISTS "Users can view pipelines they are members of" ON public.pipelines;
DROP POLICY IF EXISTS "Authenticated users can create pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Managers can update pipelines they manage" ON public.pipelines;
DROP POLICY IF EXISTS "Managers can delete pipelines they manage" ON public.pipelines;

-- Drop pipeline_stages policies
DROP POLICY IF EXISTS "Users can view stages of pipelines they are members of" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Authenticated users can create stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Managers can update stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Managers can delete stages" ON public.pipeline_stages;

DROP POLICY IF EXISTS "Users can view sections of pipelines they are members of" ON public.pipeline_sections;
DROP POLICY IF EXISTS "Pipeline members can create sections" ON public.pipeline_sections;
DROP POLICY IF EXISTS "Pipeline members can update sections" ON public.pipeline_sections;
DROP POLICY IF EXISTS "Pipeline members can delete sections" ON public.pipeline_sections;

DROP POLICY IF EXISTS "Users can view cards in pipelines they are members of" ON public.cards;
DROP POLICY IF EXISTS "Pipeline members can create cards" ON public.cards;
DROP POLICY IF EXISTS "Pipeline members can update cards" ON public.cards;
DROP POLICY IF EXISTS "Managers can delete cards" ON public.cards;

DROP POLICY IF EXISTS "Managers can manage activity phases" ON public.activity_phases;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.pipeline_members;
DROP POLICY IF EXISTS "Users can view members of their pipelines" ON public.pipeline_members;
DROP POLICY IF EXISTS "Users can add themselves as first member" ON public.pipeline_members;
DROP POLICY IF EXISTS "Managers can insert pipeline members" ON public.pipeline_members;
DROP POLICY IF EXISTS "Managers can update pipeline members" ON public.pipeline_members;
DROP POLICY IF EXISTS "Managers can delete pipeline members" ON public.pipeline_members;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Drop composite foreign key constraints FIRST (they depend on composite primary keys)
-- These must be dropped before we can drop the primary keys they reference
ALTER TABLE public.pipeline_sections DROP CONSTRAINT IF EXISTS pipeline_sections_stage_id_fkey CASCADE;
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_stage_id_fkey CASCADE;
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_section_id_fkey CASCADE;

-- Drop composite primary keys (they include pipeline_id)
-- These can now be dropped since foreign keys are gone
ALTER TABLE public.pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_pkey CASCADE;
ALTER TABLE public.pipeline_sections DROP CONSTRAINT IF EXISTS pipeline_sections_pkey CASCADE;

-- Drop simple foreign key constraints
ALTER TABLE public.pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_pipeline_id_fkey;
ALTER TABLE public.pipeline_sections DROP CONSTRAINT IF EXISTS pipeline_sections_pipeline_id_fkey;
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_pipeline_id_fkey;
ALTER TABLE public.activity_phases DROP CONSTRAINT IF EXISTS activity_phases_pipeline_id_fkey;
ALTER TABLE public.pipeline_members DROP CONSTRAINT IF EXISTS pipeline_members_pipeline_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_pipeline_id_fkey;

-- Drop old TEXT columns (CASCADE will handle any remaining dependencies)
ALTER TABLE public.pipeline_stages DROP COLUMN IF EXISTS pipeline_id CASCADE;
ALTER TABLE public.pipeline_sections DROP COLUMN IF EXISTS pipeline_id CASCADE;
ALTER TABLE public.cards DROP COLUMN IF EXISTS pipeline_id CASCADE;
ALTER TABLE public.activity_phases DROP COLUMN IF EXISTS pipeline_id CASCADE;
ALTER TABLE public.pipeline_members DROP COLUMN IF EXISTS pipeline_id CASCADE;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS pipeline_id CASCADE;

-- Drop old primary key and column from pipelines
-- Use CASCADE to drop dependent policies
ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_pkey CASCADE;
ALTER TABLE public.pipelines DROP COLUMN IF EXISTS id CASCADE;

-- ============================================================================
-- STEP 4: Rename new columns and recreate constraints
-- ============================================================================

-- Rename new columns to original names
ALTER TABLE public.pipelines RENAME COLUMN id_new TO id;

-- Set the sequence to continue from max ID
SELECT setval('pipelines_id_seq', COALESCE((SELECT MAX(id) FROM public.pipelines), 1), true);

-- Make the column use the sequence as default
ALTER TABLE public.pipelines ALTER COLUMN id SET DEFAULT nextval('pipelines_id_seq');
ALTER TABLE public.pipeline_stages RENAME COLUMN pipeline_id_new TO pipeline_id;
ALTER TABLE public.pipeline_sections RENAME COLUMN pipeline_id_new TO pipeline_id;
ALTER TABLE public.cards RENAME COLUMN pipeline_id_new TO pipeline_id;
ALTER TABLE public.activity_phases RENAME COLUMN pipeline_id_new TO pipeline_id;
ALTER TABLE public.pipeline_members RENAME COLUMN pipeline_id_new TO pipeline_id;
ALTER TABLE public.notifications RENAME COLUMN pipeline_id_new TO pipeline_id;

-- Set NOT NULL constraints
ALTER TABLE public.pipelines ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.pipeline_stages ALTER COLUMN pipeline_id SET NOT NULL;
ALTER TABLE public.pipeline_sections ALTER COLUMN pipeline_id SET NOT NULL;
ALTER TABLE public.cards ALTER COLUMN pipeline_id SET NOT NULL;
ALTER TABLE public.activity_phases ALTER COLUMN pipeline_id SET NOT NULL;
ALTER TABLE public.pipeline_members ALTER COLUMN pipeline_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN pipeline_id SET NOT NULL;

-- Recreate primary key
ALTER TABLE public.pipelines ADD PRIMARY KEY (id);

-- Recreate foreign key constraints
ALTER TABLE public.pipeline_stages
ADD CONSTRAINT pipeline_stages_pipeline_id_fkey
FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.pipeline_sections
ADD CONSTRAINT pipeline_sections_pipeline_id_fkey
FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.cards
ADD CONSTRAINT cards_pipeline_id_fkey
FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.activity_phases
ADD CONSTRAINT activity_phases_pipeline_id_fkey
FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.pipeline_members
ADD CONSTRAINT pipeline_members_pipeline_id_fkey
FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_pipeline_id_fkey
FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: Handle duplicate names and add unique constraint on pipeline name (for slug usage)
-- ============================================================================
-- First, handle any duplicate names by appending a suffix
-- Update all duplicates except the first one (ordered by created_at)
WITH ranked_pipelines AS (
    SELECT 
        id,
        name,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
    FROM public.pipelines
)
UPDATE public.pipelines p
SET name = p.name || '-' || (rp.rn - 1)
FROM ranked_pipelines rp
WHERE p.id = rp.id
AND rp.rn > 1;

-- Now add unique constraint (drop first if exists)
ALTER TABLE public.pipelines
DROP CONSTRAINT IF EXISTS pipelines_name_unique;

ALTER TABLE public.pipelines
ADD CONSTRAINT pipelines_name_unique UNIQUE (name);

-- ============================================================================
-- STEP 6: Update indexes
-- ============================================================================
-- Drop old indexes that reference pipeline_id
DROP INDEX IF EXISTS idx_cards_pipeline_id;
DROP INDEX IF EXISTS idx_pipeline_stages_pipeline_id;
DROP INDEX IF EXISTS idx_pipeline_stages_order;
DROP INDEX IF EXISTS idx_pipeline_sections_stage;

-- Recreate indexes with new column type
CREATE INDEX IF NOT EXISTS idx_cards_pipeline_id ON public.cards(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON public.pipeline_stages(pipeline_id, "order");
CREATE INDEX IF NOT EXISTS idx_pipeline_sections_stage ON public.pipeline_sections(pipeline_id, stage_id);

-- ============================================================================
-- STEP 7: Update composite primary keys and foreign keys
-- ============================================================================

-- pipeline_stages has composite primary key (id, pipeline_id)
ALTER TABLE public.pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_pkey;
ALTER TABLE public.pipeline_stages ADD PRIMARY KEY (id, pipeline_id);

-- pipeline_sections has composite primary key (id, pipeline_id, stage_id)
ALTER TABLE public.pipeline_sections DROP CONSTRAINT IF EXISTS pipeline_sections_pkey;
ALTER TABLE public.pipeline_sections ADD PRIMARY KEY (id, pipeline_id, stage_id);

-- pipeline_sections foreign key to pipeline_stages
ALTER TABLE public.pipeline_sections DROP CONSTRAINT IF EXISTS pipeline_sections_stage_id_fkey;
ALTER TABLE public.pipeline_sections
ADD CONSTRAINT pipeline_sections_stage_id_fkey
FOREIGN KEY (stage_id, pipeline_id) REFERENCES public.pipeline_stages(id, pipeline_id) ON DELETE CASCADE;

-- cards foreign key to pipeline_stages
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_stage_id_fkey;
ALTER TABLE public.cards
ADD CONSTRAINT cards_stage_id_fkey
FOREIGN KEY (stage_id, pipeline_id) REFERENCES public.pipeline_stages(id, pipeline_id) ON DELETE RESTRICT;

-- cards foreign key to pipeline_sections
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_section_id_fkey;
ALTER TABLE public.cards
ADD CONSTRAINT cards_section_id_fkey
FOREIGN KEY (section_id, pipeline_id, stage_id) REFERENCES public.pipeline_sections(id, pipeline_id, stage_id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 8: Recreate RLS Policies (with numeric pipeline_id)
-- ============================================================================

-- Update helper functions to accept BIGINT instead of TEXT
CREATE OR REPLACE FUNCTION public.is_pipeline_member(p_pipeline_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pipeline_members
        WHERE pipeline_id = p_pipeline_id
        AND user_id = p_user_id
        AND invitation_status = 'accepted'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_pipeline_manager(p_pipeline_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.pipeline_members
        WHERE pipeline_id = p_pipeline_id
        AND user_id = p_user_id
        AND role = 'manager'
        AND invitation_status = 'accepted'
    );
$$;

-- Recreate pipelines policies
-- Drop policies first to ensure clean recreation
DROP POLICY IF EXISTS "Users can view pipelines they are members of" ON public.pipelines;
DROP POLICY IF EXISTS "Authenticated users can create pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Managers can update pipelines they manage" ON public.pipelines;
DROP POLICY IF EXISTS "Managers can delete pipelines they manage" ON public.pipelines;

CREATE POLICY "Users can view pipelines they are members of"
    ON public.pipelines FOR SELECT
    USING (public.is_pipeline_member(pipelines.id, auth.uid()));

-- Allow authenticated users to create pipelines (for initial setup)
-- This policy allows any authenticated user to create a pipeline
-- Using auth.role() as fallback in case auth.uid() evaluation has issues
CREATE POLICY "Authenticated users can create pipelines"
    ON public.pipelines FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Managers can update pipelines they manage"
    ON public.pipelines FOR UPDATE
    USING (public.is_pipeline_manager(pipelines.id, auth.uid()));

CREATE POLICY "Managers can delete pipelines they manage"
    ON public.pipelines FOR DELETE
    USING (public.is_pipeline_manager(pipelines.id, auth.uid()));

-- Recreate pipeline_stages policies
CREATE POLICY "Users can view stages of pipelines they are members of"
    ON public.pipeline_stages FOR SELECT
    USING (
        public.is_pipeline_member(pipeline_stages.pipeline_id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE pipeline_id = pipeline_stages.pipeline_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create stages"
    ON public.pipeline_stages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update stages"
    ON public.pipeline_stages FOR UPDATE
    USING (public.is_pipeline_manager(pipeline_stages.pipeline_id, auth.uid()));

CREATE POLICY "Managers can delete stages"
    ON public.pipeline_stages FOR DELETE
    USING (public.is_pipeline_manager(pipeline_stages.pipeline_id, auth.uid()));

-- Recreate pipeline_sections policies
CREATE POLICY "Users can view sections of pipelines they are members of"
    ON public.pipeline_sections FOR SELECT
    USING (public.is_pipeline_member(pipeline_sections.pipeline_id, auth.uid()));

CREATE POLICY "Pipeline members can create sections"
    ON public.pipeline_sections FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.pipeline_members
            WHERE pipeline_id = pipeline_sections.pipeline_id
            AND user_id = auth.uid()
            AND invitation_status = 'accepted'
        )
    );

CREATE POLICY "Pipeline members can update sections"
    ON public.pipeline_sections FOR UPDATE
    USING (public.is_pipeline_member(pipeline_sections.pipeline_id, auth.uid()));

CREATE POLICY "Pipeline members can delete sections"
    ON public.pipeline_sections FOR DELETE
    USING (public.is_pipeline_member(pipeline_sections.pipeline_id, auth.uid()));

-- Recreate cards policies
CREATE POLICY "Users can view cards in pipelines they are members of"
    ON public.cards FOR SELECT
    USING (public.is_pipeline_member(cards.pipeline_id, auth.uid()));

CREATE POLICY "Pipeline members can create cards"
    ON public.cards FOR INSERT
    WITH CHECK (public.is_pipeline_member(cards.pipeline_id, auth.uid()));

CREATE POLICY "Pipeline members can update cards"
    ON public.cards FOR UPDATE
    USING (public.is_pipeline_member(cards.pipeline_id, auth.uid()));

CREATE POLICY "Managers can delete cards"
    ON public.cards FOR DELETE
    USING (public.is_pipeline_manager(cards.pipeline_id, auth.uid()));

-- Recreate activity_phases policies
CREATE POLICY "Users can view phases of pipelines they are members of"
    ON public.activity_phases FOR SELECT
    USING (public.is_pipeline_member(activity_phases.pipeline_id, auth.uid()));

CREATE POLICY "Managers can manage activity phases"
    ON public.activity_phases FOR ALL
    USING (public.is_pipeline_manager(activity_phases.pipeline_id, auth.uid()));

-- Recreate pipeline_members policies
CREATE POLICY "Users can view their own memberships"
    ON public.pipeline_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view members of their pipelines"
    ON public.pipeline_members FOR SELECT
    USING (public.is_pipeline_member(pipeline_id, auth.uid()));

CREATE POLICY "Users can add themselves as first member"
    ON public.pipeline_members FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = user_id
        AND NOT EXISTS (
            SELECT 1 FROM public.pipeline_members pm
            WHERE pm.pipeline_id = pipeline_members.pipeline_id
        )
    );

CREATE POLICY "Managers can insert pipeline members"
    ON public.pipeline_members FOR INSERT
    WITH CHECK (public.is_pipeline_manager(pipeline_id, auth.uid()));

CREATE POLICY "Managers can update pipeline members"
    ON public.pipeline_members FOR UPDATE
    USING (public.is_pipeline_manager(pipeline_id, auth.uid()));

CREATE POLICY "Managers can delete pipeline members"
    ON public.pipeline_members FOR DELETE
    USING (public.is_pipeline_manager(pipeline_id, auth.uid()));

-- Recreate notifications policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================================
-- STEP 10: Cleanup
-- ============================================================================
DROP TABLE IF EXISTS pipeline_id_mapping;

