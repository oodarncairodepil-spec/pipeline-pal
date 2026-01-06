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
  
  // #region agent log
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:102',message:'addPipelineMember entry',data:{pipelineId:numericId,userId:userId,role:role,invitationStatus:invitationStatus,currentUserId:currentUser?.id,isNumeric:!isNaN(numericId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // #region agent log
  const { data: userRoleData } = await supabase.from('users').select('role').eq('id', currentUser?.id).single();
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:108',message:'addPipelineMember current user role check',data:{currentUserId:currentUser?.id,userRole:userRoleData?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // #region agent log
  const { data: managerCheck } = await supabase.rpc('is_pipeline_manager', { p_pipeline_id: numericId, p_user_id: currentUser?.id });
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:111',message:'addPipelineMember is_pipeline_manager check',data:{pipelineId:numericId,currentUserId:currentUser?.id,isManager:managerCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Try using the SECURITY DEFINER function first (bypasses RLS)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:115',message:'addPipelineMember calling RPC',data:{p_pipeline_id:numericId,p_user_id:userId,p_role:role,p_invitation_status:invitationStatus},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const { error: rpcError, data: rpcData } = await supabase.rpc('add_pipeline_member', {
    p_pipeline_id: numericId,
    p_user_id: userId,
    p_role: role,
    p_invitation_status: invitationStatus,
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:123',message:'addPipelineMember RPC result',data:{hasError:!!rpcError,errorCode:rpcError?.code,errorMessage:rpcError?.message,errorDetails:rpcError?.details,errorHint:rpcError?.hint,rpcData:rpcData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
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

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:130',message:'addPipelineMember direct insert result',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,hasData:!!data,dataLength:data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  if (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users.ts:137',message:'addPipelineMember error',data:{errorCode:error.code,errorMessage:error.message,errorDetails:error.details,errorHint:error.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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

