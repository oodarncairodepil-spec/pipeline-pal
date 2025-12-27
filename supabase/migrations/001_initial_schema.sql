-- Pipeline Pal - Initial Database Schema
-- This migration creates all tables, relationships, indexes, and RLS policies
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING TABLES (if they exist) in reverse dependency order
-- ============================================================================
-- This ensures a clean slate if running the migration multiple times
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.pipeline_members CASCADE;
DROP TABLE IF EXISTS public.activity_phases CASCADE;
DROP TABLE IF EXISTS public.card_tags CASCADE;
DROP TABLE IF EXISTS public.card_collaborators CASCADE;
DROP TABLE IF EXISTS public.card_watchers CASCADE;
DROP TABLE IF EXISTS public.card_files CASCADE;
DROP TABLE IF EXISTS public.card_history CASCADE;
DROP TABLE IF EXISTS public.card_notes CASCADE;
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.pipeline_sections CASCADE;
DROP TABLE IF EXISTS public.pipeline_stages CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.subscription_tiers CASCADE;
DROP TABLE IF EXISTS public.pipelines CASCADE;
-- Note: users table is kept as it references auth.users
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- ============================================================================
-- USERS TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    role TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';

-- ============================================================================
-- PIPELINES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.pipelines IS 'Sales pipelines/boards';

-- ============================================================================
-- PIPELINE STAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id TEXT NOT NULL,
    pipeline_id TEXT NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, pipeline_id)
);

COMMENT ON TABLE public.pipeline_stages IS 'Stages/columns within a pipeline (e.g., New, Called, Onboard)';

-- ============================================================================
-- PIPELINE SECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_sections (
    id TEXT NOT NULL,
    pipeline_id TEXT NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, pipeline_id, stage_id),
    FOREIGN KEY (stage_id, pipeline_id) REFERENCES public.pipeline_stages(id, pipeline_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.pipeline_sections IS 'Sections within a stage for organizing cards';

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.tags IS 'Global tags for categorizing cards';

-- ============================================================================
-- SUBSCRIPTION TIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_tiers IS 'Available subscription tiers (Basic, Pro, Enterprise)';

-- ============================================================================
-- CARDS TABLE (Lead Cards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cards (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL,
    section_id TEXT,
    client_name TEXT NOT NULL,
    phone TEXT,
    instagram TEXT,
    tiktok TEXT,
    tokopedia TEXT,
    shopee TEXT,
    instagram_followers INTEGER,
    tiktok_followers INTEGER,
    tokopedia_followers INTEGER,
    shopee_followers INTEGER,
    subscription_tier TEXT,
    deal_value NUMERIC(15, 2) DEFAULT 0,
    live_url TEXT,
    activity_phase TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stage_id, pipeline_id) REFERENCES public.pipeline_stages(id, pipeline_id) ON DELETE RESTRICT,
    FOREIGN KEY (section_id, pipeline_id, stage_id) REFERENCES public.pipeline_sections(id, pipeline_id, stage_id) ON DELETE SET NULL
);

COMMENT ON TABLE public.cards IS 'Lead/opportunity cards in the pipeline';

-- ============================================================================
-- CARD NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_notes (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.card_notes IS 'Notes/comments on cards';

-- ============================================================================
-- CARD HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_history (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('stage_change', 'assignment_change', 'note_added', 'file_added', 'card_created', 'tier_change', 'activity_phase_change')),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.card_history IS 'Audit trail of card changes';

-- ============================================================================
-- CARD FILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_files (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'document', 'other')),
    size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.card_files IS 'File attachments on cards';

-- ============================================================================
-- CARD WATCHERS TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_watchers (
    card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (card_id, user_id)
);

COMMENT ON TABLE public.card_watchers IS 'Users watching cards for notifications';

-- ============================================================================
-- CARD COLLABORATORS TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_collaborators (
    card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (card_id, user_id)
);

COMMENT ON TABLE public.card_collaborators IS 'Users collaborating on cards';

-- ============================================================================
-- CARD TAGS TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_tags (
    card_id TEXT NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (card_id, tag_id)
);

COMMENT ON TABLE public.card_tags IS 'Tags assigned to cards';

-- ============================================================================
-- ACTIVITY PHASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id TEXT NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pipeline_id, name)
);

COMMENT ON TABLE public.activity_phases IS 'Activity phases for a pipeline';

-- ============================================================================
-- PIPELINE MEMBERS TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pipeline_members (
    pipeline_id TEXT NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
    invitation_status TEXT DEFAULT 'accepted' CHECK (invitation_status IN ('pending', 'sent', 'accepted', 'declined')),
    invitation_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pipeline_id, user_id)
);

COMMENT ON TABLE public.pipeline_members IS 'Users who are members of pipelines';

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    note TEXT NOT NULL,
    pipeline_id TEXT NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'User notifications for card activities';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Cards indexes
CREATE INDEX IF NOT EXISTS idx_cards_pipeline_id ON public.cards(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cards_stage_id ON public.cards(stage_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_cards_section_id ON public.cards(section_id, pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_cards_assigned_to ON public.cards(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cards_client_name ON public.cards(client_name);

-- Card notes indexes
CREATE INDEX IF NOT EXISTS idx_card_notes_card_id ON public.card_notes(card_id);
CREATE INDEX IF NOT EXISTS idx_card_notes_created_by ON public.card_notes(created_by);

-- Card history indexes
CREATE INDEX IF NOT EXISTS idx_card_history_card_id ON public.card_history(card_id);
CREATE INDEX IF NOT EXISTS idx_card_history_user_id ON public.card_history(user_id);
CREATE INDEX IF NOT EXISTS idx_card_history_timestamp ON public.card_history(timestamp DESC);

-- Card files indexes
CREATE INDEX IF NOT EXISTS idx_card_files_card_id ON public.card_files(card_id);

-- Pipeline stages indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON public.pipeline_stages(pipeline_id, "order");

-- Pipeline sections indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_sections_stage ON public.pipeline_sections(pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_sections_order ON public.pipeline_sections(pipeline_id, stage_id, "order");

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(user_id, created_at DESC);

-- Pipeline members indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_members_user_id ON public.pipeline_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_members_pipeline_id ON public.pipeline_members(pipeline_id);

-- Activity phases indexes
CREATE INDEX IF NOT EXISTS idx_activity_phases_pipeline_id ON public.activity_phases(pipeline_id);

-- ============================================================================
-- FUNCTIONS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pipelines
    BEFORE UPDATE ON public.pipelines
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pipeline_stages
    BEFORE UPDATE ON public.pipeline_stages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pipeline_sections
    BEFORE UPDATE ON public.pipeline_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_cards
    BEFORE UPDATE ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_subscription_tiers
    BEFORE UPDATE ON public.subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_pipeline_members
    BEFORE UPDATE ON public.pipeline_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS (to avoid infinite recursion)
-- ============================================================================

-- Helper function to check pipeline membership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_pipeline_member(p_pipeline_id TEXT, p_user_id UUID)
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

-- Helper function to check if user is a manager of a pipeline
CREATE OR REPLACE FUNCTION public.is_pipeline_manager(p_pipeline_id TEXT, p_user_id UUID)
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Pipelines policies
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view pipelines they are members of" ON public.pipelines;
DROP POLICY IF EXISTS "Authenticated users can create pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Managers can update pipelines they manage" ON public.pipelines;
DROP POLICY IF EXISTS "Managers can delete pipelines they manage" ON public.pipelines;

-- Allow viewing pipelines you're a member of
CREATE POLICY "Users can view pipelines they are members of"
    ON public.pipelines FOR SELECT
    USING (public.is_pipeline_member(pipelines.id, auth.uid()));

-- Allow authenticated users to create pipelines (they'll be added as members)
CREATE POLICY "Authenticated users can create pipelines"
    ON public.pipelines FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update pipelines they manage"
    ON public.pipelines FOR UPDATE
    USING (public.is_pipeline_manager(pipelines.id, auth.uid()));

-- Pipeline stages policies
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

-- Allow authenticated users to create stages (for initial setup)
CREATE POLICY "Authenticated users can create stages"
    ON public.pipeline_stages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update stages"
    ON public.pipeline_stages FOR UPDATE
    USING (public.is_pipeline_manager(pipeline_stages.pipeline_id, auth.uid()));

CREATE POLICY "Managers can delete stages"
    ON public.pipeline_stages FOR DELETE
    USING (public.is_pipeline_manager(pipeline_stages.pipeline_id, auth.uid()));

-- Pipeline sections policies
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view sections of pipelines they are members of" ON public.pipeline_sections;
DROP POLICY IF EXISTS "Pipeline members can manage sections" ON public.pipeline_sections;
DROP POLICY IF EXISTS "Pipeline members can create sections" ON public.pipeline_sections;
DROP POLICY IF EXISTS "Pipeline members can update sections" ON public.pipeline_sections;
DROP POLICY IF EXISTS "Pipeline members can delete sections" ON public.pipeline_sections;

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

-- Cards policies
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

-- Card notes policies
CREATE POLICY "Users can view notes on cards they have access to"
    ON public.card_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_notes.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Pipeline members can create notes"
    ON public.card_notes FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_notes.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

-- Card history policies
CREATE POLICY "Users can view history of cards they have access to"
    ON public.card_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_history.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

CREATE POLICY "System can create history entries"
    ON public.card_history FOR INSERT
    WITH CHECK (true); -- History is created by triggers/system

-- Card files policies
CREATE POLICY "Users can view files on cards they have access to"
    ON public.card_files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_files.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Pipeline members can upload files"
    ON public.card_files FOR INSERT
    WITH CHECK (
        auth.uid() = uploaded_by
        AND EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_files.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

-- Card watchers policies
CREATE POLICY "Users can view watchers on cards they have access to"
    ON public.card_watchers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_watchers.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own watchers"
    ON public.card_watchers FOR ALL
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_watchers.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

-- Card collaborators policies
CREATE POLICY "Users can view collaborators on cards they have access to"
    ON public.card_collaborators FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_collaborators.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Pipeline members can manage collaborators"
    ON public.card_collaborators FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_collaborators.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

-- Card tags policies
CREATE POLICY "Users can view tags on cards they have access to"
    ON public.card_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_tags.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Pipeline members can manage card tags"
    ON public.card_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.pipeline_members ON pipeline_members.pipeline_id = cards.pipeline_id
            WHERE cards.id = card_tags.card_id
            AND pipeline_members.user_id = auth.uid()
        )
    );

-- Tags policies
CREATE POLICY "Users can view all tags"
    ON public.tags FOR SELECT
    USING (true);

CREATE POLICY "Managers can manage tags"
    ON public.tags FOR ALL
    USING (true); -- Tags are global, managers can manage

-- Subscription tiers policies
CREATE POLICY "Users can view subscription tiers"
    ON public.subscription_tiers FOR SELECT
    USING (true);

CREATE POLICY "Managers can manage subscription tiers"
    ON public.subscription_tiers FOR ALL
    USING (true); -- Tiers are global, managers can manage

-- Activity phases policies
CREATE POLICY "Users can view phases of pipelines they are members of"
    ON public.activity_phases FOR SELECT
    USING (public.is_pipeline_member(activity_phases.pipeline_id, auth.uid()));

CREATE POLICY "Managers can manage activity phases"
    ON public.activity_phases FOR ALL
    USING (public.is_pipeline_manager(activity_phases.pipeline_id, auth.uid()));

-- Pipeline members policies
-- Users can view their own memberships (no recursion)
CREATE POLICY "Users can view their own memberships"
    ON public.pipeline_members FOR SELECT
    USING (user_id = auth.uid());

-- Allow viewing members of pipelines where user is a member (uses function to avoid recursion)
CREATE POLICY "Users can view members of their pipelines"
    ON public.pipeline_members FOR SELECT
    USING (public.is_pipeline_member(pipeline_id, auth.uid()));

-- Helper function to check if user is a manager of a pipeline
CREATE OR REPLACE FUNCTION public.is_pipeline_manager(p_pipeline_id TEXT, p_user_id UUID)
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

-- Allow authenticated users to add themselves as the first member when creating a pipeline
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

-- Managers can manage pipeline members (uses function to avoid recursion)
CREATE POLICY "Managers can insert pipeline members"
    ON public.pipeline_members FOR INSERT
    WITH CHECK (public.is_pipeline_manager(pipeline_id, auth.uid()));

CREATE POLICY "Managers can update pipeline members"
    ON public.pipeline_members FOR UPDATE
    USING (public.is_pipeline_manager(pipeline_id, auth.uid()));

CREATE POLICY "Managers can delete pipeline members"
    ON public.pipeline_members FOR DELETE
    USING (public.is_pipeline_manager(pipeline_id, auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true); -- Notifications created by system/triggers

-- ============================================================================
-- FUNCTION TO CREATE USER PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

