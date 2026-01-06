import { getSupabaseClient } from '../supabase';
import { LeadCard, Note, HistoryEvent, FileAttachment } from '@/types/pipeline';

export const getCards = async (pipelineId: string | number): Promise<Record<string, LeadCard>> => {
  const supabase = getSupabaseClient();
  const numericId = typeof pipelineId === 'number' ? pipelineId : Number(pipelineId);
  
  // Fetch cards
  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('pipeline_id', numericId)
    .order('created_at', { ascending: false });

  if (cardsError) {
    console.error('Error fetching cards:', cardsError);
    return {};
  }

  if (!cardsData || cardsData.length === 0) {
    return {};
  }

  // Fetch related data in parallel
  const cardIds = cardsData.map(c => c.id);
  
  const [notesData, historyData, filesData, watchersData, collaboratorsData, tagsData] = await Promise.all([
    supabase.from('card_notes').select('*').in('card_id', cardIds),
    supabase.from('card_history').select('*').in('card_id', cardIds),
    supabase.from('card_files').select('*').in('card_id', cardIds),
    supabase.from('card_watchers').select('*').in('card_id', cardIds),
    supabase.from('card_collaborators').select('*').in('card_id', cardIds),
    supabase.from('card_tags').select('card_id, tag_id').in('card_id', cardIds),
  ]);

  // Fetch users for assigned_to, notes, history, files
  const userIds = new Set<string>();
  cardsData.forEach(c => c.assigned_to && userIds.add(c.assigned_to));
  notesData.data?.forEach(n => userIds.add(n.created_by));
  historyData.data?.forEach(h => userIds.add(h.user_id));
  filesData.data?.forEach(f => userIds.add(f.uploaded_by));
  watchersData.data?.forEach(w => userIds.add(w.user_id));
  collaboratorsData.data?.forEach(c => userIds.add(c.user_id));

  const { data: usersData } = await supabase
    .from('users')
    .select('*')
    .in('id', Array.from(userIds));

  const usersMap = new Map((usersData || []).map(u => [u.id, u]));

  // Fetch tags
  const tagIds = new Set((tagsData.data || []).map(t => t.tag_id));
  const { data: tagsDataFull } = await supabase
    .from('tags')
    .select('*')
    .in('id', Array.from(tagIds));

  const tagsMap = new Map((tagsDataFull || []).map(t => [t.id, t.name]));
  const cardTagsMap = new Map<string, string[]>();
  (tagsData.data || []).forEach(ct => {
    const tagName = tagsMap.get(ct.tag_id);
    if (tagName) {
      if (!cardTagsMap.has(ct.card_id)) {
        cardTagsMap.set(ct.card_id, []);
      }
      cardTagsMap.get(ct.card_id)!.push(tagName);
    }
  });

  // Build cards object
  const cards: Record<string, LeadCard> = {};

  for (const card of cardsData) {
    const notes: Note[] = (notesData.data || [])
      .filter(n => n.card_id === card.id)
      .map(n => ({
        id: n.id,
        content: n.content,
        createdAt: new Date(n.created_at),
        createdBy: usersMap.get(n.created_by)!,
      }));

    const history: HistoryEvent[] = (historyData.data || [])
      .filter(h => h.card_id === card.id)
      .map(h => ({
        id: h.id,
        type: h.event_type as HistoryEvent['type'],
        timestamp: new Date(h.timestamp),
        user: usersMap.get(h.user_id)!,
        details: h.details || {},
      }));

    const files: FileAttachment[] = (filesData.data || [])
      .filter(f => f.card_id === card.id)
      .map(f => ({
        id: f.id,
        name: f.name,
        url: f.url,
        type: f.type as FileAttachment['type'],
        size: f.size,
        uploadedAt: new Date(f.uploaded_at),
        uploadedBy: usersMap.get(f.uploaded_by)!,
      }));

    const watchers = (watchersData.data || [])
      .filter(w => w.card_id === card.id)
      .map(w => w.user_id);

    const collaborators = (collaboratorsData.data || [])
      .filter(c => c.card_id === card.id)
      .map(c => usersMap.get(c.user_id)!)
      .filter(Boolean);

    cards[card.id] = {
      id: card.id,
      clientName: card.client_name,
      phone: card.phone || undefined,
      instagram: card.instagram || undefined,
      tiktok: card.tiktok || undefined,
      tokopedia: card.tokopedia || undefined,
      shopee: card.shopee || undefined,
      subscriptionTier: card.subscription_tier || 'Basic',
      dealValue: Number(card.deal_value) || 0,
      liveUrl: card.live_url || undefined,
      instagramFollowers: card.instagram_followers || undefined,
      tiktokFollowers: card.tiktok_followers || undefined,
      tokopediaFollowers: card.tokopedia_followers || undefined,
      shopeeFollowers: card.shopee_followers || undefined,
      startDate: new Date(card.start_date),
      liveDateTarget: card.live_date_target ? new Date(card.live_date_target) : undefined,
      stageId: card.stage_id,
      sectionId: card.section_id || undefined,
      assignedTo: card.assigned_to ? usersMap.get(card.assigned_to) : undefined,
      collaborators,
      activityPhase: card.activity_phase || undefined,
      tags: cardTagsMap.get(card.id) || [],
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

export const getAllClientNames = async (): Promise<string[]> => {
  const supabase = getSupabaseClient();
  
  // Fetch all unique client names from all pipelines the user has access to
  // Using DISTINCT ON to get unique client names
  const { data, error } = await supabase
    .from('cards')
    .select('client_name')
    .not('client_name', 'is', null)
    .neq('client_name', '')
    .order('client_name', { ascending: true });

  if (error) {
    console.error('Error fetching client names:', error);
    return [];
  }

  // Extract unique client names
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

