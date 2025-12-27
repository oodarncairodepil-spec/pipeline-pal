import { getSupabaseClient } from '../supabase';

// Subscription Tiers
export const getSubscriptionTierObjects = async (): Promise<{ name: string; active: boolean }[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('name, active')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching subscription tiers:', error);
    return [
      { name: 'Basic', active: true },
      { name: 'Pro', active: true },
      { name: 'Enterprise', active: true },
    ];
  }

  return (data || []).map(t => ({ name: t.name, active: t.active }));
};

export const getSubscriptionTiers = async (): Promise<string[]> => {
  const tiers = await getSubscriptionTierObjects();
  return tiers.filter(t => t.active).map(t => t.name);
};

export const setSubscriptionTierObjects = async (tiers: { name: string; active: boolean }[]): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Delete all existing tiers
  await supabase.from('subscription_tiers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Insert new tiers
  if (tiers.length > 0) {
    const { error } = await supabase
      .from('subscription_tiers')
      .insert(tiers.map(t => ({ name: t.name, active: t.active })));
    
    if (error) throw error;
  }
};

// Tags
export const getTags = async (): Promise<string[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tags')
    .select('name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching tags:', error);
    return ['VIP', 'Priority', 'Coffee', 'Ecommerce'];
  }

  return (data || []).map(t => t.name);
};

export const setTags = async (tags: string[]): Promise<void> => {
  const supabase = getSupabaseClient();
  
  // Get existing tags
  const { data: existingTags } = await supabase.from('tags').select('name');
  const existingNames = new Set((existingTags || []).map(t => t.name));
  
  // Add new tags
  const newTags = tags.filter(t => !existingNames.has(t));
  if (newTags.length > 0) {
    const { error } = await supabase
      .from('tags')
      .insert(newTags.map(name => ({ name })));
    if (error) throw error;
  }
  
  // Note: We don't delete tags that are no longer in the list
  // because they might be used by cards
};

// Activity Phases
export const getPipelineActivityPhases = async (pipelineId: string | number): Promise<string[]> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  const { data, error } = await supabase
    .from('activity_phases')
    .select('name')
    .eq('pipeline_id', numericId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching activity phases:', error);
    return [];
  }

  return (data || []).map(p => p.name);
};

export const setPipelineActivityPhases = async (pipelineId: string | number, phases: string[]): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Delete existing phases for this pipeline
  await supabase.from('activity_phases').delete().eq('pipeline_id', numericId);
  
  // Insert new phases
  if (phases.length > 0) {
    const { error } = await supabase
      .from('activity_phases')
      .insert(phases.map(name => ({ pipeline_id: numericId, name })));
    
    if (error) throw error;
  }
};

