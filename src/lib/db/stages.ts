import { getSupabaseClient } from '../supabase';
import { Stage } from '@/types/pipeline';

export const getPipelineStages = async (pipelineId: string | number): Promise<Stage[]> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Try RPC function first (for managers to see all stages)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_pipeline_stages_for_manager', { p_pipeline_id: numericId });
  
  if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
    // RPC function succeeded, return the data
    return rpcData.map(stage => ({
      id: stage.stage_id ?? stage.id,
      name: stage.stage_name ?? stage.name,
      color: stage.stage_color ?? stage.color,
      order: stage.stage_order ?? stage.order ?? 0,
    }));
  }
  
  // Fallback to direct query (will respect RLS - only stages of pipelines user is member of)
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id, name, color, order')
    .eq('pipeline_id', numericId)
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching pipeline stages:', error);
    return [];
  }

  return (data || []).map(stage => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    order: stage.order || 0,
  }));
};

export const createPipelineStage = async (
  pipelineId: string | number,
  stage: { id: string; name: string; color: string; order: number }
): Promise<Stage> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Try using the SECURITY DEFINER function first (bypasses RLS)
  const { error: rpcError } = await supabase.rpc('create_pipeline_stage', {
    p_pipeline_id: numericId,
    p_stage_id: stage.id,
    p_stage_name: stage.name,
    p_stage_color: stage.color,
    p_stage_order: stage.order,
  });
  
  if (!rpcError) {
    // RPC function succeeded, return the stage
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      order: stage.order,
    };
  }
  
  // Fallback to direct insert (will respect RLS)
  const { data, error } = await supabase
    .from('pipeline_stages')
    .insert({
      id: stage.id,
      pipeline_id: numericId,
      name: stage.name,
      color: stage.color,
      order: stage.order,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    color: data.color,
    order: data.order || 0,
  };
};

export const updatePipelineStage = async (
  pipelineId: string | number,
  stageId: string,
  updates: { name?: string; color?: string; order?: number }
): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Try using the SECURITY DEFINER function first (bypasses RLS)
  const { error: rpcError } = await supabase.rpc('update_pipeline_stage', {
    p_pipeline_id: numericId,
    p_stage_id: stageId,
    p_stage_name: updates.name || null,
    p_stage_color: updates.color || null,
    p_stage_order: updates.order !== undefined ? updates.order : null,
  });
  
  if (!rpcError) {
    // RPC function succeeded
    return;
  }
  
  // Fallback to direct update (will respect RLS)
  const { error } = await supabase
    .from('pipeline_stages')
    .update(updates)
    .eq('id', stageId)
    .eq('pipeline_id', numericId);

  if (error) throw error;
};

export const deletePipelineStage = async (pipelineId: string | number, stageId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Try using the SECURITY DEFINER function first (bypasses RLS)
  const { error: rpcError } = await supabase.rpc('delete_pipeline_stage', {
    p_pipeline_id: numericId,
    p_stage_id: stageId,
  });
  
  if (!rpcError) {
    // RPC function succeeded
    return;
  }
  
  // Fallback to direct delete (will respect RLS)
  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', stageId)
    .eq('pipeline_id', numericId);

  if (error) throw error;
};

// Pipeline sections
export const getPipelineSections = async (
  pipelineId: string | number,
  stageId: string
): Promise<{ id: string; name: string; color: string; cardIds: string[] }[]> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  const { data, error } = await supabase
    .from('pipeline_sections')
    .select('id, name, color, order')
    .eq('pipeline_id', numericId)
    .eq('stage_id', stageId)
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching pipeline sections:', error);
    return [];
  }

  // Get card IDs for each section
  const sectionsWithCards = await Promise.all(
    (data || []).map(async (section) => {
      const { data: cards } = await supabase
        .from('cards')
        .select('id')
        .eq('pipeline_id', numericId)
        .eq('stage_id', stageId)
        .eq('section_id', section.id);

      return {
        id: section.id,
        name: section.name,
        color: section.color,
        cardIds: (cards || []).map(c => c.id),
      };
    })
  );

  return sectionsWithCards;
};

export const createPipelineSection = async (
  pipelineId: string | number,
  stageId: string,
  section: { id: string; name: string; color: string; order: number }
): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Check if user is authenticated and get their ID
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    throw new Error('Must be authenticated to create sections');
  }
  
  // Check if user is a member of the pipeline
  const { data: members, error: memberCheckError } = await supabase
    .from('pipeline_members')
    .select('user_id')
    .eq('pipeline_id', pipelineId)
    .eq('user_id', authUser.id)
    .eq('invitation_status', 'accepted');
  
  if (!members || members.length === 0) {
    throw new Error(`User is not a member of pipeline ${pipelineId}`);
  }
  
  const { error } = await supabase
    .from('pipeline_sections')
    .insert({
      id: section.id,
      pipeline_id: numericId,
      stage_id: stageId,
      name: section.name,
      color: section.color,
      order: section.order,
    });

  if (error) throw error;
};

export const deletePipelineSection = async (
  pipelineId: string | number,
  stageId: string,
  sectionId: string
): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  const { error } = await supabase
    .from('pipeline_sections')
    .delete()
    .eq('id', sectionId)
    .eq('pipeline_id', numericId)
    .eq('stage_id', stageId);

  if (error) throw error;
};

