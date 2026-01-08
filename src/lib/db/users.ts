import { getSupabaseClient } from '../supabase';
import { TeamMember } from '@/types/pipeline';

export const getUser = async (userId: string): Promise<TeamMember | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

  if (error) {
    // Only log if it's not a "no rows" error
    if (error.code !== 'PGRST116') {
      console.error('Error fetching user:', error);
    }
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=b6e3f4`,
    role: data.role as 'manager' | 'staff',
    email: data.email || undefined,
  };
};

export const getUsers = async (): Promise<TeamMember[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data || []).map(user => ({
    id: user.id,
    name: user.name,
    avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=b6e3f4`,
    role: user.role as 'manager' | 'staff',
    email: user.email || undefined,
  }));
};

export const updateUser = async (userId: string, updates: {
  name?: string;
  email?: string;
  avatar?: string;
  role?: 'manager' | 'staff';
}): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
};

export const getPipelineMembers = async (pipelineId: string | number): Promise<TeamMember[]> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  const { data, error } = await supabase
    .from('pipeline_members')
    .select(`
      user_id,
      role,
      invitation_status,
      invitation_sent_at,
      users (*)
    `)
    .eq('pipeline_id', numericId)
    .eq('invitation_status', 'accepted');

  if (error) {
    console.error('Error fetching pipeline members:', error);
    return [];
  }

  return (data || [])
    .map((member: any) => {
      const user = member.users;
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=b6e3f4`,
        role: member.role as 'manager' | 'staff',
        email: user.email || undefined,
      };
    })
    .filter(Boolean) as TeamMember[];
};

export const addPipelineMember = async (
  pipelineId: string | number,
  userId: string,
  role: 'manager' | 'staff',
  invitationStatus: 'pending' | 'sent' | 'accepted' | 'declined' = 'sent'
): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Try using the SECURITY DEFINER function first (bypasses RLS)
  const { error: rpcError, data: rpcData } = await supabase.rpc('add_pipeline_member', {
    p_pipeline_id: numericId,
    p_user_id: userId,
    p_role: role,
    p_invitation_status: invitationStatus,
  });
  
  if (!rpcError) {
    // RPC function succeeded
    return;
  }
  
  // Fallback to direct insert (will respect RLS)
  const { data, error } = await supabase
    .from('pipeline_members')
    .insert({
      pipeline_id: numericId,
      user_id: userId,
      role,
      invitation_status: invitationStatus,
      invitation_sent_at: invitationStatus === 'sent' ? new Date().toISOString() : null,
    })
    .select();

  if (error) {
    throw error;
  }
};

export const updatePipelineMember = async (
  pipelineId: string | number,
  userId: string,
  updates: {
    role?: 'manager' | 'staff';
    invitation_status?: 'pending' | 'sent' | 'accepted' | 'declined';
  }
): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  const updateData: any = { ...updates };
  if (updates.invitation_status === 'sent' && !updateData.invitation_sent_at) {
    updateData.invitation_sent_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('pipeline_members')
    .update(updateData)
    .eq('pipeline_id', numericId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const removePipelineMember = async (pipelineId: string | number, userId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  const { error } = await supabase
    .from('pipeline_members')
    .delete()
    .eq('pipeline_id', numericId)
    .eq('user_id', userId);

  if (error) throw error;
};
