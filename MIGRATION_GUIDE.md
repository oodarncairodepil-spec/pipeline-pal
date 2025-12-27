# Migration Guide: Pipeline ID from TEXT to Number

## Summary
This migration changes `pipelines.id` from TEXT to BIGINT (numeric), and uses `pipelines.name` as the slug for URL routing.

## Migration Steps

1. **Run the SQL migration**: `supabase/migrations/002_change_pipeline_id_to_number.sql`
   - This will convert all existing pipeline IDs from TEXT to numeric
   - Updates all foreign key references
   - Adds unique constraint on `pipelines.name`

2. **Code Changes Required**:
   - All functions that accept `pipelineId: string` need to be updated to:
     - Accept `pipelineId: number` for database operations
     - Accept `pipelineName: string` for URL/routing (convert to ID internally)
   - Update routing to use `name` instead of `id`
   - Update all components to use name as slug

## Files That Need Updates

1. `src/lib/db/pipelines.ts` - ✅ Updated
2. `src/lib/settings.ts` - Needs update (functions accept string, need to convert name→ID)
3. `src/lib/db/stages.ts` - Needs update (pipelineId parameter)
4. `src/lib/db/cards.ts` - Needs update (pipelineId parameter)
5. `src/lib/db/users.ts` - Needs update (pipelineId parameter)
6. `src/lib/db/settings.ts` - Needs update (pipelineId parameter)
7. `src/lib/db/notifications.ts` - Needs update (pipelineId parameter)
8. `src/pages/Settings.tsx` - Partially updated, needs more work
9. `src/components/KanbanBoard.tsx` - Needs update
10. `src/components/AppHeader.tsx` - Needs update
11. `src/data/mockData.ts` - Needs update
12. `src/App.tsx` - Routing uses name as slug (no change needed)

## Helper Functions Needed

Add to `src/lib/db/pipelines.ts`:
- `getPipelineIdByName(name: string): Promise<number | null>` - ✅ Added
- `getPipelineByName(name: string): Promise<PipelineRef | null>` - ✅ Added

## Pattern for Updates

For functions that currently accept `pipelineId: string`:
1. If it's a URL parameter (name/slug), convert to ID first: `const id = await getPipelineIdByName(pipelineId)`
2. Use numeric ID for all database operations
3. Use name for routing/URLs

