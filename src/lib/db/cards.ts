import { getSupabaseClient } from '../supabase';
import { LeadCard, Note, HistoryEvent, FileAttachment, TeamMember } from '@/types/pipeline';

const IN_CHUNK = 100;

function chunkIds<T extends string>(ids: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    chunks.push(ids.slice(i, i + IN_CHUNK));
  }
  return chunks;
}

/** PostgREST `.in()` with very large arrays hurts URL size and DB plans; chunk fetches. */
async function selectInChunks(
  table: string,
  columns: string,
  fkColumn: string,
  ids: string[]
): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabaseClient();
  const out: Record<string, unknown>[] = [];
  for (const chunk of chunkIds(ids)) {
    const { data, error } = await supabase.from(table).select(columns).in(fkColumn, chunk);
    if (error) {
      console.error(`Error fetching ${table} (chunk):`, error);
      continue;
    }
    if (data?.length) out.push(...data);
  }
  return out;
}

function bucketByCardId<T extends { card_id: string }>(rows: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const row of rows) {
    const list = m.get(row.card_id);
    if (list) list.push(row);
    else m.set(row.card_id, [row]);
  }
  return m;
}

const CARD_COLUMNS =
  'id, pipeline_id, stage_id, section_id, client_name, phone, instagram, tiktok, tokopedia, shopee, subscription_tier, deal_value, live_url, instagram_followers, tiktok_followers, tokopedia_followers, shopee_followers, activity_phase, assigned_to, start_date, live_date_target, created_at';

function rowToTeamMember(u: {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
  email?: string | null;
}): TeamMember {
  return {
    id: u.id,
    name: u.name,
    avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}&backgroundColor=b6e3f4`,
    role: u.role as TeamMember['role'],
    email: u.email || undefined,
  };
}

export const getCards = async (pipelineId: string | number): Promise<Record<string, LeadCard>> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);

  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select(CARD_COLUMNS)
    .eq('pipeline_id', numericId)
    .order('created_at', { ascending: false });

  if (cardsError) {
    console.error('Error fetching cards:', cardsError);
    return {};
  }

  if (!cardsData || cardsData.length === 0) {
    return {};
  }

  const cardIds = cardsData.map(c => c.id as string);

  const [notesRows, historyRows, filesRows, watchersRows, collaboratorsRows, tagsJunctionRows] = await Promise.all([
    selectInChunks('card_notes', 'id, card_id, content, created_at, created_by', 'card_id', cardIds),
    selectInChunks('card_history', 'id, card_id, event_type, timestamp, user_id, details', 'card_id', cardIds),
    selectInChunks('card_files', 'id, card_id, name, url, type, size, uploaded_at, uploaded_by', 'card_id', cardIds),
    selectInChunks('card_watchers', 'card_id, user_id', 'card_id', cardIds),
    selectInChunks('card_collaborators', 'card_id, user_id', 'card_id', cardIds),
    selectInChunks('card_tags', 'card_id, tag_id', 'card_id', cardIds),
  ]);

  const notesByCard = bucketByCardId(notesRows as { card_id: string; id: string; content: string; created_at: string; created_by: string }[]);
  const historyByCard = bucketByCardId(historyRows as { card_id: string; id: string; event_type: string; timestamp: string; user_id: string; details: Record<string, unknown> }[]);
  const filesByCard = bucketByCardId(filesRows as { card_id: string; id: string; name: string; url: string; type: string; size: number; uploaded_at: string; uploaded_by: string }[]);
  const watchersByCard = bucketByCardId(watchersRows as { card_id: string; user_id: string }[]);
  const collaboratorsByCard = bucketByCardId(collaboratorsRows as { card_id: string; user_id: string }[]);

  const userIds = new Set<string>();
  for (const c of cardsData) {
    if (c.assigned_to) userIds.add(c.assigned_to as string);
  }
  for (const n of notesRows) userIds.add((n as { created_by: string }).created_by);
  for (const h of historyRows) userIds.add((h as { user_id: string }).user_id);
  for (const f of filesRows) userIds.add((f as { uploaded_by: string }).uploaded_by);
  for (const w of watchersRows) userIds.add((w as { user_id: string }).user_id);
  for (const co of collaboratorsRows) userIds.add((co as { user_id: string }).user_id);

  const usersMap = new Map<string, TeamMember>();
  const uidList = Array.from(userIds);
  for (const chunk of chunkIds(uidList)) {
    if (chunk.length === 0) continue;
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, avatar, role, email')
      .in('id', chunk);
    if (usersError) {
      console.error('Error fetching users (chunk):', usersError);
      continue;
    }
    for (const u of usersData || []) {
      usersMap.set(u.id, rowToTeamMember(u));
    }
  }

  const tagIds = new Set((tagsJunctionRows as { tag_id: string }[]).map(t => t.tag_id));
  const tagsMap = new Map<string, string>();
  const tagIdList = Array.from(tagIds);
  for (const chunk of chunkIds(tagIdList)) {
    if (chunk.length === 0) continue;
    const { data: tagsDataFull, error: tagsErr } = await supabase.from('tags').select('id, name').in('id', chunk);
    if (tagsErr) {
      console.error('Error fetching tags (chunk):', tagsErr);
      continue;
    }
    for (const t of tagsDataFull || []) {
      tagsMap.set(t.id, t.name);
    }
  }

  const cardTagsMap = new Map<string, string[]>();
  for (const ct of tagsJunctionRows as { card_id: string; tag_id: string }[]) {
    const tagName = tagsMap.get(ct.tag_id);
    if (!tagName) continue;
    const list = cardTagsMap.get(ct.card_id);
    if (list) list.push(tagName);
    else cardTagsMap.set(ct.card_id, [tagName]);
  }

  const cards: Record<string, LeadCard> = {};

  for (const card of cardsData) {
    const id = card.id as string;

    const notes: Note[] = (notesByCard.get(id) || [])
      .filter(n => usersMap.has(n.created_by))
      .map(n => ({
        id: n.id,
        content: n.content,
        createdAt: new Date(n.created_at),
        createdBy: usersMap.get(n.created_by)!,
      }));

    const history: HistoryEvent[] = (historyByCard.get(id) || [])
      .filter(h => usersMap.has(h.user_id))
      .map(h => ({
        id: h.id,
        type: h.event_type as HistoryEvent['type'],
        timestamp: new Date(h.timestamp),
        user: usersMap.get(h.user_id)!,
        details: (h.details || {}) as HistoryEvent['details'],
      }));

    const files: FileAttachment[] = (filesByCard.get(id) || [])
      .filter(f => usersMap.has(f.uploaded_by))
      .map(f => ({
        id: f.id,
        name: f.name,
        url: f.url,
        type: f.type as FileAttachment['type'],
        size: f.size,
        uploadedAt: new Date(f.uploaded_at),
        uploadedBy: usersMap.get(f.uploaded_by)!,
      }));

    const watchers = (watchersByCard.get(id) || []).map(w => w.user_id);

    const collaborators = (collaboratorsByCard.get(id) || [])
      .map(c => usersMap.get(c.user_id))
      .filter((m): m is TeamMember => !!m);

    cards[id] = {
      id,
      clientName: card.client_name as string,
      phone: (card.phone as string) || undefined,
      instagram: (card.instagram as string) || undefined,
      tiktok: (card.tiktok as string) || undefined,
      tokopedia: (card.tokopedia as string) || undefined,
      shopee: (card.shopee as string) || undefined,
      subscriptionTier: (card.subscription_tier as string) || 'Basic',
      dealValue: Number(card.deal_value) || 0,
      liveUrl: (card.live_url as string) || undefined,
      instagramFollowers: (card.instagram_followers as number) || undefined,
      tiktokFollowers: (card.tiktok_followers as number) || undefined,
      tokopediaFollowers: (card.tokopedia_followers as number) || undefined,
      shopeeFollowers: (card.shopee_followers as number) || undefined,
      startDate: new Date(card.start_date as string),
      liveDateTarget: card.live_date_target ? new Date(card.live_date_target as string) : undefined,
      stageId: card.stage_id as string,
      sectionId: (card.section_id as string) || undefined,
      assignedTo: card.assigned_to ? usersMap.get(card.assigned_to as string) : undefined,
      collaborators,
      activityPhase: (card.activity_phase as string) || undefined,
      tags: cardTagsMap.get(id) || [],
      notes,
      history,
      files,
      watchers: watchers.length > 0 ? watchers : undefined,
    };
  }

  return cards;
};

export const createCard = async (card: LeadCard, pipelineId: string | number): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Insert card
  const { error: cardError } = await supabase
    .from('cards')
    .insert({
      id: card.id,
      pipeline_id: numericId,
      stage_id: card.stageId,
      section_id: card.sectionId || null,
      client_name: card.clientName,
      phone: card.phone || null,
      instagram: card.instagram || null,
      tiktok: card.tiktok || null,
      tokopedia: card.tokopedia || null,
      shopee: card.shopee || null,
      subscription_tier: card.subscriptionTier,
      deal_value: card.dealValue || 0,
      live_url: card.liveUrl || null,
      instagram_followers: card.instagramFollowers || null,
      tiktok_followers: card.tiktokFollowers || null,
      tokopedia_followers: card.tokopediaFollowers || null,
      shopee_followers: card.shopeeFollowers || null,
      activity_phase: card.activityPhase || null,
      assigned_to: card.assignedTo?.id || null,
      start_date: card.startDate.toISOString().split('T')[0],
      live_date_target: card.liveDateTarget ? card.liveDateTarget.toISOString().split('T')[0] : null,
    });

  if (cardError) throw cardError;

  // Insert notes
  if (card.notes && card.notes.length > 0) {
    const { error: notesError } = await supabase
      .from('card_notes')
      .insert(
        card.notes.map(note => ({
          id: note.id,
          card_id: card.id,
          content: note.content,
          created_by: note.createdBy.id,
        }))
      );
    if (notesError) throw notesError;
  }

  // Insert history
  if (card.history && card.history.length > 0) {
    const { error: historyError } = await supabase
      .from('card_history')
      .insert(
        card.history.map(hist => ({
          id: hist.id,
          card_id: card.id,
          event_type: hist.type,
          user_id: hist.user.id,
          details: hist.details,
          timestamp: hist.timestamp.toISOString(),
        }))
      );
    if (historyError) throw historyError;
  }

  // Insert files
  if (card.files && card.files.length > 0) {
    const { error: filesError } = await supabase
      .from('card_files')
      .insert(
        card.files.map(file => ({
          id: file.id,
          card_id: card.id,
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size,
          uploaded_by: file.uploadedBy.id,
        }))
      );
    if (filesError) throw filesError;
  }

  // Insert watchers
  if (card.watchers && card.watchers.length > 0) {
    const { error: watchersError } = await supabase
      .from('card_watchers')
      .insert(
        card.watchers.map(userId => ({
          card_id: card.id,
          user_id: userId,
        }))
      );
    if (watchersError) throw watchersError;
  }

  // Insert collaborators
  if (card.collaborators && card.collaborators.length > 0) {
    const { error: collaboratorsError } = await supabase
      .from('card_collaborators')
      .insert(
        card.collaborators.map(collab => ({
          card_id: card.id,
          user_id: collab.id,
        }))
      );
    if (collaboratorsError) throw collaboratorsError;
  }

  // Insert tags
  if (card.tags && card.tags.length > 0) {
    // First, get or create tags
    const tagIds: string[] = [];
    for (const tagName of card.tags) {
      // Check if tag exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .single();

      let tagId: string;
      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create tag
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select('id')
          .single();
        if (createError) throw createError;
        tagId = newTag.id;
      }
      tagIds.push(tagId);
    }

    // Insert card_tags
    const { error: cardTagsError } = await supabase
      .from('card_tags')
      .insert(
        tagIds.map(tagId => ({
          card_id: card.id,
          tag_id: tagId,
        }))
      );
    if (cardTagsError) throw cardTagsError;
  }
};

export const updateCard = async (
  cardId: string,
  updates: Partial<LeadCard>,
  pipelineId: string | number
): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);

  // Build update object
  const cardUpdates: any = {};
  if (updates.clientName !== undefined) cardUpdates.client_name = updates.clientName;
  if (updates.phone !== undefined) cardUpdates.phone = updates.phone || null;
  if (updates.instagram !== undefined) cardUpdates.instagram = updates.instagram || null;
  if (updates.tiktok !== undefined) cardUpdates.tiktok = updates.tiktok || null;
  if (updates.tokopedia !== undefined) cardUpdates.tokopedia = updates.tokopedia || null;
  if (updates.shopee !== undefined) cardUpdates.shopee = updates.shopee || null;
  if (updates.subscriptionTier !== undefined) cardUpdates.subscription_tier = updates.subscriptionTier;
  if (updates.dealValue !== undefined) cardUpdates.deal_value = updates.dealValue;
  if (updates.liveUrl !== undefined) cardUpdates.live_url = updates.liveUrl || null;
  if (updates.instagramFollowers !== undefined) cardUpdates.instagram_followers = updates.instagramFollowers || null;
  if (updates.tiktokFollowers !== undefined) cardUpdates.tiktok_followers = updates.tiktokFollowers || null;
  if (updates.tokopediaFollowers !== undefined) cardUpdates.tokopedia_followers = updates.tokopediaFollowers || null;
  if (updates.shopeeFollowers !== undefined) cardUpdates.shopee_followers = updates.shopeeFollowers || null;
  if (updates.activityPhase !== undefined) cardUpdates.activity_phase = updates.activityPhase || null;
  if (updates.stageId !== undefined) cardUpdates.stage_id = updates.stageId;
  if (updates.sectionId !== undefined) cardUpdates.section_id = updates.sectionId || null;
  if (updates.assignedTo !== undefined) cardUpdates.assigned_to = updates.assignedTo?.id || null;
  if (updates.startDate !== undefined) cardUpdates.start_date = updates.startDate.toISOString().split('T')[0];
  if (updates.liveDateTarget !== undefined) cardUpdates.live_date_target = updates.liveDateTarget ? updates.liveDateTarget.toISOString().split('T')[0] : null;

  if (Object.keys(cardUpdates).length > 0) {
    const { error } = await supabase
      .from('cards')
      .update(cardUpdates)
      .eq('id', cardId)
      .eq('pipeline_id', numericId);

    if (error) throw error;
  }

  // Handle watchers update
  if (updates.watchers !== undefined) {
    // Delete existing watchers
    await supabase.from('card_watchers').delete().eq('card_id', cardId);
    
    // Insert new watchers
    if (updates.watchers.length > 0) {
      const { error } = await supabase
        .from('card_watchers')
        .insert(updates.watchers.map(userId => ({ card_id: cardId, user_id: userId })));
      if (error) throw error;
    }
  }

  // Handle tags update
  if (updates.tags !== undefined) {
    // Delete existing tags
    await supabase.from('card_tags').delete().eq('card_id', cardId);
    
    // Insert new tags
    if (updates.tags.length > 0) {
      // Get or create tags
      const tagIds: string[] = [];
      for (const tagName of updates.tags) {
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();

        let tagId: string;
        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag, error: createError } = await supabase
            .from('tags')
            .insert({ name: tagName })
            .select('id')
            .single();
          if (createError) throw createError;
          tagId = newTag.id;
        }
        tagIds.push(tagId);
      }

      const { error } = await supabase
        .from('card_tags')
        .insert(tagIds.map(tagId => ({ card_id: cardId, tag_id: tagId })));
      if (error) throw error;
    }
  }

  // Handle notes update - append new notes only
  if (updates.notes !== undefined) {
    // Get existing notes
    const { data: existingNotes } = await supabase
      .from('card_notes')
      .select('id')
      .eq('card_id', cardId);

    const existingNoteIds = new Set((existingNotes || []).map(n => n.id));
    
    // Insert only new notes
    const newNotes = updates.notes.filter(note => !existingNoteIds.has(note.id));
    if (newNotes.length > 0) {
      const { error } = await supabase
        .from('card_notes')
        .insert(
          newNotes.map(note => ({
            id: note.id,
            card_id: cardId,
            content: note.content,
            created_by: note.createdBy.id,
          }))
        );
      if (error) throw error;
    }
  }

  // Handle files update - append new files only
  if (updates.files !== undefined) {
    // Get existing files
    const { data: existingFiles } = await supabase
      .from('card_files')
      .select('id')
      .eq('card_id', cardId);

    const existingFileIds = new Set((existingFiles || []).map(f => f.id));
    
    // Insert only new files
    const newFiles = updates.files.filter(file => !existingFileIds.has(file.id));
    if (newFiles.length > 0) {
      const { error } = await supabase
        .from('card_files')
        .insert(
          newFiles.map(file => ({
            id: file.id,
            card_id: cardId,
            name: file.name,
            url: file.url,
            type: file.type,
            size: file.size,
            uploaded_by: file.uploadedBy.id,
          }))
        );
      if (error) throw error;
    }
  }

  // Handle history update - append new history events only
  if (updates.history !== undefined) {
    // Get existing history
    const { data: existingHistory, error: fetchError } = await supabase
      .from('card_history')
      .select('id')
      .eq('card_id', cardId);

    if (fetchError) {
      console.error('Error fetching existing history:', fetchError);
      // Continue anyway - might be RLS issue
    }

    const existingHistoryIds = new Set((existingHistory || []).map(h => h.id));
    
    // Check for duplicate IDs in the incoming history array
    const incomingHistoryIds = updates.history.map(h => h.id);
    
    // Remove duplicates from incoming history (keep first occurrence)
    const uniqueHistory = updates.history.filter((hist, index) => {
      return incomingHistoryIds.indexOf(hist.id) === index;
    });
    
    // Insert only new history events (not in database and not duplicates)
    const newHistory = uniqueHistory.filter(hist => !existingHistoryIds.has(hist.id));
    
    if (newHistory.length > 0) {
      // Try using the SECURITY DEFINER function first (bypasses RLS)
      try {
        for (const hist of newHistory) {
          const { error: rpcError } = await supabase.rpc('insert_card_history', {
            p_id: hist.id,
            p_card_id: cardId,
            p_event_type: hist.type,
            p_user_id: hist.user.id,
            p_details: hist.details || {},
            p_timestamp: hist.timestamp.toISOString(),
          });
          
          if (rpcError) {
            // If RPC fails, fall back to direct insert
            throw rpcError;
          }
        }
      } catch (rpcError: any) {
        // Fallback to direct insert (will respect RLS)
        const { error } = await supabase
          .from('card_history')
          .insert(
            newHistory.map(hist => ({
              id: hist.id,
              card_id: cardId,
              event_type: hist.type,
              user_id: hist.user.id,
              details: hist.details,
              timestamp: hist.timestamp.toISOString(),
            }))
          );
        
        if (error) throw error;
      }
    }
  }

  // Handle collaborators update
  if (updates.collaborators !== undefined) {
    // Delete existing collaborators
    const { error: deleteError } = await supabase.from('card_collaborators').delete().eq('card_id', cardId);
    
    if (deleteError) {
      console.error('Error deleting existing collaborators:', deleteError);
      // Continue anyway - might be RLS issue or no existing collaborators
    }
    
    // Insert new collaborators
    if (updates.collaborators.length > 0) {
      const { error } = await supabase
        .from('card_collaborators')
        .insert(updates.collaborators.map(collab => ({ card_id: cardId, user_id: collab.id })));
      if (error) throw error;
    }
  }
};

export const addCardNote = async (
  cardId: string,
  note: { id: string; content: string; createdBy: { id: string } }
): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('card_notes')
    .insert({
      id: note.id,
      card_id: cardId,
      content: note.content,
      created_by: note.createdBy.id,
    });

  if (error) throw error;
};

export const addCardHistory = async (
  cardId: string,
  history: {
    id: string;
    type: HistoryEvent['type'];
    userId: string;
    details: Record<string, any>;
    timestamp: Date;
  }
): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('card_history')
    .insert({
      id: history.id,
      card_id: cardId,
      event_type: history.type,
      user_id: history.userId,
      details: history.details,
      timestamp: history.timestamp.toISOString(),
    });

  if (error) throw error;
};

export const addCardFile = async (
  cardId: string,
  file: {
    id: string;
    name: string;
    url: string;
    type: FileAttachment['type'];
    size: number;
    uploadedBy: { id: string };
  }
): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('card_files')
    .insert({
      id: file.id,
      card_id: cardId,
      name: file.name,
      url: file.url,
      type: file.type,
      size: file.size,
      uploaded_by: file.uploadedBy.id,
    });

  if (error) throw error;
};

/** Client names for autocomplete scoped to one pipeline (smaller payload than all pipelines). */
export const getClientNamesForPipeline = async (pipelineId: string | number): Promise<string[]> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  const { data, error } = await supabase
    .from('cards')
    .select('client_name')
    .eq('pipeline_id', numericId)
    .not('client_name', 'is', null)
    .neq('client_name', '')
    .order('client_name', { ascending: true })
    .limit(8000);

  if (error) {
    console.error('Error fetching client names for pipeline:', error);
    return [];
  }

  const uniqueNames = Array.from(new Set((data || []).map(c => c.client_name).filter(Boolean)));
  return uniqueNames.sort();
};

/** All accessible client names (capped) — prefer getClientNamesForPipeline on board load. */
export const getAllClientNames = async (): Promise<string[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('cards')
    .select('client_name')
    .not('client_name', 'is', null)
    .neq('client_name', '')
    .order('client_name', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('Error fetching client names:', error);
    return [];
  }

  const uniqueNames = Array.from(new Set((data || []).map(c => c.client_name).filter(Boolean)));
  return uniqueNames.sort();
};

export const getCardByClientName = async (clientName: string): Promise<Partial<LeadCard> | null> => {
  const supabase = getSupabaseClient();
  
  // Fetch the most recent card for this client name
  const { data: cardsData, error } = await supabase
    .from('cards')
    .select('*')
    .eq('client_name', clientName)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching card by client name:', error);
    return null;
  }

  if (!cardsData) {
    return null;
  }

  // Return partial card data (excluding id, stageId, sectionId, notes, history, files, etc.)
  // Only return the fields that should be copied when selecting an existing client
  return {
    phone: cardsData.phone || undefined,
    instagram: cardsData.instagram || undefined,
    tiktok: cardsData.tiktok || undefined,
    tokopedia: cardsData.tokopedia || undefined,
    shopee: cardsData.shopee || undefined,
    subscriptionTier: cardsData.subscription_tier || 'Basic',
    dealValue: Number(cardsData.deal_value) || undefined,
    liveUrl: cardsData.live_url || undefined,
    instagramFollowers: cardsData.instagram_followers || undefined,
    tiktokFollowers: cardsData.tiktok_followers || undefined,
    tokopediaFollowers: cardsData.tokopedia_followers || undefined,
    shopeeFollowers: cardsData.shopee_followers || undefined,
    liveDateTarget: cardsData.live_date_target ? new Date(cardsData.live_date_target) : undefined,
  };
};

export const deleteCard = async (cardId: string, pipelineId: string | number): Promise<void> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);

  // Delete all related data first (due to foreign key constraints)
  // Delete in order: card_tags, card_watchers, card_collaborators, card_notes, card_history, card_files, then card
  
  // Delete card_tags
  const { error: tagsError } = await supabase
    .from('card_tags')
    .delete()
    .eq('card_id', cardId);
  if (tagsError) {
    console.error('Error deleting card_tags:', tagsError);
    throw tagsError;
  }

  // Delete card_watchers
  const { error: watchersError } = await supabase
    .from('card_watchers')
    .delete()
    .eq('card_id', cardId);
  if (watchersError) {
    console.error('Error deleting card_watchers:', watchersError);
    throw watchersError;
  }

  // Delete card_collaborators
  const { error: collaboratorsError } = await supabase
    .from('card_collaborators')
    .delete()
    .eq('card_id', cardId);
  if (collaboratorsError) {
    console.error('Error deleting card_collaborators:', collaboratorsError);
    throw collaboratorsError;
  }

  // Delete card_notes
  const { error: notesError } = await supabase
    .from('card_notes')
    .delete()
    .eq('card_id', cardId);
  if (notesError) {
    console.error('Error deleting card_notes:', notesError);
    throw notesError;
  }

  // Delete card_history
  const { error: historyError } = await supabase
    .from('card_history')
    .delete()
    .eq('card_id', cardId);
  if (historyError) {
    console.error('Error deleting card_history:', historyError);
    throw historyError;
  }

  // Delete card_files
  const { error: filesError } = await supabase
    .from('card_files')
    .delete()
    .eq('card_id', cardId);
  if (filesError) {
    console.error('Error deleting card_files:', filesError);
    throw filesError;
  }

  // Finally, delete the card itself
  const { error: cardError } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
    .eq('pipeline_id', numericId);
  
  if (cardError) {
    console.error('Error deleting card:', cardError);
    throw cardError;
  }
};

