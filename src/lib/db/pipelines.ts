import { getSupabaseClient } from '../supabase';
import { PipelineRef } from '../settings';

export const getPipelines = async (): Promise<PipelineRef[]> => {
  const supabase = getSupabaseClient();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pipelines.ts:4',message:'getPipelines entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Check auth state
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pipelines.ts:7',message:'getPipelines auth check',data:{hasUser:!!authUser,userId:authUser?.id,authError:authError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Check user role
  let userRole = null;
  if (authUser) {
    const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', authUser.id).maybeSingle();
    userRole = userData?.role;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pipelines.ts:14',message:'getPipelines user role check',data:{userId:authUser.id,userRole:userRole,userError:userError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }
  
  // Try to use the RPC function first (for managers to see all pipelines)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_all_pipelines_for_manager');
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pipelines.ts:22',message:'getPipelines RPC result',data:{hasError:!!rpcError,errorCode:rpcError?.code,errorMessage:rpcError?.message,hasData:!!rpcData,dataIsArray:Array.isArray(rpcData),dataLength:Array.isArray(rpcData)?rpcData.length:null,rpcDataSample:Array.isArray(rpcData)&&rpcData.length>0?rpcData[0]:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
    // RPC function succeeded, return the data
    // Handle both old format (id, name) and new format (pipeline_id, pipeline_name)
    const result = rpcData.map(p => ({ 
      id: (p.pipeline_id ?? p.id) as number, 
      name: (p.pipeline_name ?? p.name) as string 
    }));
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pipelines.ts:18',message:'getPipelines returning RPC result',data:{resultLength:result.length,resultSample:result[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
  }
  
  // Fallback to direct query (will respect RLS - only pipelines user is member of)
  const { data, error } = await supabase
    .from('pipelines')
    .select('id, name')
    .order('created_at', { ascending: true });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pipelines.ts:28',message:'getPipelines direct query result',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,hasData:!!data,dataIsArray:Array.isArray(data),dataLength:Array.isArray(data)?data.length:null,dataSample:Array.isArray(data)&&data.length>0?data[0]:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (error) {
    console.error('Error fetching pipelines:', error);
    // Return empty array if error (no defaults with numeric IDs)
    return [];
  }

  const result = (data || []).map(p => ({ id: p.id as number, name: p.name }));
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/3adc1b18-20d3-429f-bd83-86eb44ac7e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pipelines.ts:36',message:'getPipelines returning direct query result',data:{resultLength:result.length,resultSample:result[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return result;
};

export const createPipeline = async (name: string): Promise<PipelineRef> => {
  const supabase = getSupabaseClient();
  
  // Get current user - try both getUser() and getSession()
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Log authentication state for debugging
  console.log('createPipeline - Auth check:', {
    hasUser: !!authUser,
    userId: authUser?.id,
    hasSession: !!session,
    sessionUserId: session?.user?.id,
    userError: userError?.message,
    sessionError: sessionError?.message,
  });
  
  if (!authUser && !session?.user) {
    const errorMsg = 'Must be authenticated to create pipelines. Please log in first.';
    console.error(errorMsg, { userError, sessionError });
    throw new Error(errorMsg);
  }

  const effectiveUser = authUser || session?.user;
  if (!effectiveUser) {
    throw new Error('Unable to determine authenticated user');
  }

  // Create pipeline - ID will be auto-generated (BIGSERIAL)
  // Name must be unique (used as slug)
  console.log('createPipeline - Attempting to insert pipeline:', { name, userId: effectiveUser.id });
  
  // Try direct INSERT first
  let inserted: any = null;
  let insertError: any = null;
  
  const { data: directInsert, error: directError } = await supabase
    .from('pipelines')
    .insert({ name })
    .select()
    .single();
  
  inserted = directInsert;
  insertError = directError;
  
  // If direct INSERT fails with RLS error, try using SECURITY DEFINER function as fallback
  if (insertError?.code === '42501') {
    console.log('createPipeline - Direct INSERT failed with RLS error, trying SECURITY DEFINER function...');
    
    const { data: functionResult, error: functionError } = await supabase
      .rpc('create_pipeline', { p_name: name });
    
    if (functionError) {
      console.error('createPipeline - Function also failed:', functionError);
      insertError = functionError;
    } else if (functionResult) {
      // Function returns array or single object
      if (Array.isArray(functionResult) && functionResult.length > 0) {
        inserted = { id: functionResult[0].id, name: functionResult[0].name };
        insertError = null;
        console.log('createPipeline - Function succeeded (array):', inserted);
      } else if (typeof functionResult === 'object' && functionResult.id) {
        // Single object
        inserted = { id: functionResult.id, name: functionResult.name };
        insertError = null;
        console.log('createPipeline - Function succeeded (object):', inserted);
      } else {
        console.error('createPipeline - Function returned unexpected format:', functionResult);
        insertError = new Error('Function returned unexpected format');
      }
    } else {
      console.error('createPipeline - Function returned null/undefined');
      insertError = new Error('Function returned no data');
    }
  }

  if (insertError || !inserted) {
    console.error('createPipeline - Insert failed:', {
      error: insertError,
      code: insertError?.code,
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint,
    });
    
    // Provide more helpful error message
    if (insertError?.code === '42501') {
      throw new Error(
        'Row-level security policy violation. ' +
        'Please ensure you are logged in and that migration 005 has been run in Supabase. ' +
        `Original error: ${insertError.message}`
      );
    }
    
    throw insertError || new Error('Failed to create pipeline');
  }

  const pipelineId = inserted.id as number;
  console.log('createPipeline - Pipeline created successfully:', { pipelineId, name: inserted.name });

  // Automatically add creator as manager member (must be done before SELECT to satisfy SELECT policy)
  try {
    console.log('createPipeline - Adding creator as pipeline member:', { pipelineId, userId: effectiveUser.id });
    const { error: memberError } = await supabase
      .from('pipeline_members')
      .insert({
        pipeline_id: pipelineId,
        user_id: effectiveUser.id,
        role: 'manager',
        invitation_status: 'accepted',
      });
    
    if (memberError) {
      console.error('createPipeline - Error adding creator as pipeline member:', {
        error: memberError,
        code: memberError.code,
        message: memberError.message,
      });
      // Continue even if member creation fails
    } else {
      console.log('createPipeline - Creator added as pipeline member successfully');
    }
  } catch (memberError: any) {
    console.error('createPipeline - Exception adding creator as pipeline member:', memberError);
  }

  return { id: pipelineId, name: inserted.name };
};

export const updatePipeline = async (id: number, name: string): Promise<void> => {
  const supabase = getSupabaseClient();
  
  console.log('updatePipeline called:', { id, name });
  
  // Get current pipeline to check if name is actually changing
  const { data: currentPipeline, error: fetchError } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('id', id)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully
  
  // If pipeline not found (RLS or doesn't exist), skip update silently
  if (fetchError || !currentPipeline) {
    console.log('Pipeline not found or not accessible, skipping update:', { id, error: fetchError?.message });
    return;
  }
  
  console.log('Current pipeline:', currentPipeline);
  
  // If name hasn't changed, no need to update
  if (currentPipeline.name === name) {
    console.log('Pipeline name unchanged, skipping update');
    return;
  }
  
  // Check if name already exists (name must be unique for slug usage)
  const { data: existing, error: checkError } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('name', name)
    .neq('id', id)
    .maybeSingle();
  
  console.log('Existing pipeline check:', { existing, checkError });
  
  if (checkError) {
    console.error('Error checking existing pipeline name:', checkError);
    throw checkError;
  }
  
  if (existing) {
    const errorMsg = `Pipeline with name "${name}" already exists. Please choose a different name.`;
    console.error(errorMsg, { existing });
    throw new Error(errorMsg);
  }
  
  // Just update the name (ID stays the same, name is used as slug)
  console.log('Attempting to update pipeline:', { id, oldName: currentPipeline?.name, newName: name });
  const { error } = await supabase
    .from('pipelines')
    .update({ name })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating pipeline:', { error, code: error.code, message: error.message, details: error.details, hint: error.hint });
    // Handle 409 Conflict error (unique constraint violation)
    if (error.code === '23505' || error.code === 'P0001' || error.message?.includes('unique') || error.message?.includes('duplicate') || error.message?.includes('409')) {
      throw new Error(`Pipeline with name "${name}" already exists. Please choose a different name.`);
    }
    throw error;
  }
  
  console.log('Pipeline updated successfully');
};

export const deletePipeline = async (id: number): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('pipelines')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Helper function to get pipeline by name (slug)
export const getPipelineByName = async (name: string): Promise<PipelineRef | null> => {
  const supabase = getSupabaseClient();
  
  // Try direct query first
  const { data, error } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('name', name)
    .maybeSingle();
  
  // If direct query fails, try using RPC function (for managers)
  if (!data && !error) {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_all_pipelines_for_manager');
    
    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      const found = rpcData.find(p => (p.pipeline_name ?? p.name) === name);
      if (found) {
        return { id: (found.pipeline_id ?? found.id) as number, name: (found.pipeline_name ?? found.name) as string };
      }
    }
  }
  
  if (error) {
    console.error('Error fetching pipeline by name:', error);
    return null;
  }
  
  if (!data) return null;
  
  return { id: data.id as number, name: data.name };
};

// Helper function to get pipeline ID by name (for internal use)
export const getPipelineIdByName = async (name: string): Promise<number | null> => {
  const pipeline = await getPipelineByName(name);
  return pipeline?.id ?? null;
};

