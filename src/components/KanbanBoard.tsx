import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, DropResult, Draggable, Droppable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Search, Filter, Columns, Plus } from 'lucide-react';
import { BoardState, LeadCard, StageId } from '@/types/pipeline';
import { loadInitialBoardState } from '@/data/mockData';
import { setPipelineStages, getPipelines, setPipelines, pushNotificationForUser, getCurrentUser, getUnreadNotificationCount } from '@/lib/settings';
import { KanbanLane } from './KanbanLane';
import { CardDetailPanel } from './CardDetailPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MemberAvatar } from './MemberAvatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { getNotificationsForUser } from '@/lib/settings';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStageColorClasses } from '@/lib/pipeline-utils';
import { cn } from '@/lib/utils';
import * as dbCards from '@/lib/db/cards';
import * as dbStages from '@/lib/db/stages';
import * as dbUsers from '@/lib/db/users';
import * as dbPipelines from '@/lib/db/pipelines';
import { signOut } from '@/lib/auth';

export function KanbanBoard() {
  const { pipelineId = 'default' } = useParams();
  const location = useLocation();
  const [boardState, setBoardState] = useState<BoardState>({
    lanes: [],
    cards: {},
    stages: [],
    teamMembers: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<LeadCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState<'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost' | 'stage-purple' | 'stage-teal' | 'stage-indigo' | 'stage-pink' | 'stage-orange'>('stage-new');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pipelineIdNum, setPipelineIdNum] = useState<number | null>(null);
  const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const navigate = useNavigate();
  const pipelineTitle = `${(pipelines.find(p => p.name === pipelineId)?.name || 'Sales')} Pipeline`;
  const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `stage-${Math.random().toString(36).slice(2, 6)}`;
  const makeUniqueStageId = (base: string) => {
    let id = base;
    const existing = new Set(boardState.stages.map(s => s.id));
    let i = 2;
    while (existing.has(id)) {
      id = `${base}-${i++}`;
    }
    return id;
  };

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId, type } = result;

    if (!destination || !currentUser) return;

    // Handle column (stage) reordering
    if (type === 'COLUMN') {
      if (source.index === destination.index) return;

      const newLanes = Array.from(boardState.lanes);
      const [removed] = newLanes.splice(source.index, 1);
      newLanes.splice(destination.index, 0, removed);

      // Update order for all stages
      const updatedStages = newLanes.map((lane, index) => {
        const stage = boardState.stages.find(s => s.id === lane.stage.id);
        if (!stage) return lane.stage;
        return { ...stage, order: index };
      });

      // Update local state
      setBoardState(prev => ({
        ...prev,
        lanes: newLanes,
        stages: updatedStages,
      }));

      // Save to Supabase
      try {
        const { getCurrentAuthUser } = await import('@/lib/auth');
        const authUser = await getCurrentAuthUser();
        if (authUser) {
          const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId) || 0;
          if (numericId) {
            // Update order for all stages
            for (const stage of updatedStages) {
              await dbStages.updatePipelineStage(numericId, stage.id, { order: stage.order });
            }
            console.log('✅ Column order updated in Supabase successfully');
          }
        }
      } catch (error) {
        console.error('Error updating column order in Supabase:', error);
        // Continue even if Supabase update fails - local state is already updated
      }
      return;
    }

    // Handle section reordering within a stage
    if (type === 'SECTION') {
      if (source.index === destination.index) return;
      
      // Extract stageId from droppableId (format: "sections-{stageId}")
      const stageId = source.droppableId.replace('sections-', '');
      const lane = boardState.lanes.find(l => l.id === stageId);
      if (!lane || !lane.sections) return;

      const newSections = Array.from(lane.sections);
      const [removed] = newSections.splice(source.index, 1);
      newSections.splice(destination.index, 0, removed);

      // Update local state
      setBoardState(prev => ({
        ...prev,
        lanes: prev.lanes.map(l => 
          l.id === stageId 
            ? { ...l, sections: newSections }
            : l
        )
      }));

      // Save to Supabase
      try {
        const { getCurrentAuthUser } = await import('@/lib/auth');
        const authUser = await getCurrentAuthUser();
        if (authUser) {
          const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId) || 0;
          if (numericId) {
            const sectionOrders = newSections.map((s, index) => ({
              sectionId: s.id,
              order: index,
            }));
            // Update order for all sections
            for (const { sectionId, order } of sectionOrders) {
              await dbStages.updatePipelineSection(numericId, stageId, sectionId, { order });
            }
            console.log('✅ Section order updated in Supabase successfully');
          }
        }
      } catch (error) {
        console.error('Error updating section order in Supabase:', error);
        // Continue even if Supabase update fails - local state is already updated
      }
      return;
    }

    // Handle card drag-and-drop (existing logic)
    const destinationId = destination.droppableId;
    const isSectionDrop = destinationId.startsWith('section:') || destinationId.startsWith('section-header:');

    let newLanes = [...boardState.lanes];
    const card = boardState.cards[draggableId];

    // Branch: dropping onto the general lane area (unsectioned)
    if (!isSectionDrop) {
      const srcIsSection = source.droppableId.startsWith('section:') || source.droppableId.startsWith('section-header:');
      const normalizedSrcId = srcIsSection && source.droppableId.startsWith('section-header:') ? source.droppableId.replace('section-header:', 'section:') : source.droppableId;
      const srcLaneId = srcIsSection ? normalizedSrcId.split(':')[1] : source.droppableId;
      const sourceIndex = newLanes.findIndex(l => l.id === srcLaneId);
      const destIndex = newLanes.findIndex(l => l.id === destinationId);
      if (sourceIndex === -1 || destIndex === -1) return;
      if (srcLaneId === destinationId && source.index === destination.index) return;
      newLanes[sourceIndex].cardIds = newLanes[sourceIndex].cardIds.filter(id => id !== draggableId);
      const destIds = [...newLanes[destIndex].cardIds].filter(id => id !== draggableId); // Remove duplicates first
      const insertAt = Math.min(Math.max(destination.index, 0), destIds.length);
      destIds.splice(insertAt, 0, draggableId);
      newLanes[destIndex].cardIds = destIds;

      // If dragged from a section, remove from that section
      if (srcIsSection) {
        const normalizedSrcId = source.droppableId.startsWith('section-header:') ? source.droppableId.replace('section-header:', 'section:') : source.droppableId;
        const [, , srcSectionId] = normalizedSrcId.split(':');
        newLanes = newLanes.map(lane => {
          if (lane.id !== srcLaneId) return lane;
          const sections = (lane.sections || []).map(sec => sec.id === srcSectionId ? { ...sec, cardIds: sec.cardIds.filter(id => id !== draggableId) } : sec);
          return { ...lane, sections };
        });
      }

      const oldStageName = boardState.stages.find(s => s.id === card.stageId)?.name || '';
      const newStageId = destinationId as StageId;
      const newStageName = boardState.stages.find(s => s.id === newStageId)?.name || '';
      const stageChanged = card.stageId !== newStageId;
      const updatedCard = {
        ...card,
        stageId: newStageId,
        sectionId: undefined,
        history: [
          ...card.history,
          ...(stageChanged ? [{
            id: uid(),
            type: 'stage_change' as const,
            timestamp: new Date(),
            user: currentUser,
            details: { from: oldStageName, to: newStageName },
          }] : []),
        ],
      };

      // Update in Supabase
      try {
        const { getCurrentAuthUser } = await import('@/lib/auth');
        const authUser = await getCurrentAuthUser();
        if (authUser) {
          // Get numeric pipeline ID
          const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId) || 0;
          if (numericId) {
            await dbCards.updateCard(draggableId, { stageId: newStageId, sectionId: undefined }, numericId);
            
            // Add history if stage changed
            if (stageChanged && currentUser) {
              await dbCards.addCardHistory(draggableId, {
                id: uid(),
                type: 'stage_change',
                userId: currentUser.id,
                details: { from: oldStageName, to: newStageName },
                timestamp: new Date(),
              });
            }
          }
        }
      } catch (error) {
        console.error('Error updating card in Supabase:', error);
        // Continue even if Supabase update fails - local state is already updated
      }

      const updatedCards = {
        ...boardState.cards,
        [draggableId]: updatedCard,
      };
      setBoardState({ ...boardState, lanes: newLanes, cards: updatedCards });
      return;
    }

    // Handle both section: and section-header: formats
    const isSectionHeader = destinationId.startsWith('section-header:');
    const normalizedDestId = isSectionHeader ? destinationId.replace('section-header:', 'section:') : destinationId;
    const [, laneId, sectionId] = normalizedDestId.split(':');
    const srcIsSection = source.droppableId.startsWith('section:') || source.droppableId.startsWith('section-header:');
    const normalizedSrcId = srcIsSection && source.droppableId.startsWith('section-header:') ? source.droppableId.replace('section-header:', 'section:') : source.droppableId;
    const srcLaneId = srcIsSection ? normalizedSrcId.split(':')[1] : source.droppableId;
    const fromLaneIndex = newLanes.findIndex(l => l.id === srcLaneId);
    const toLaneIndex = newLanes.findIndex(l => l.id === laneId);
    if (fromLaneIndex === -1 || toLaneIndex === -1) return;

    newLanes[fromLaneIndex].cardIds = newLanes[fromLaneIndex].cardIds.filter(id => id !== draggableId);
    if (!newLanes[toLaneIndex].cardIds.includes(draggableId)) newLanes[toLaneIndex].cardIds.push(draggableId);

    // Remove from previous section in the destination lane and add to target section
    newLanes = newLanes.map(lane => {
      if (lane.id !== laneId) return lane;
      const sections = (lane.sections || []).map(sec => {
        const has = sec.cardIds.includes(draggableId);
        if (has && sec.id !== sectionId) return { ...sec, cardIds: sec.cardIds.filter(id => id !== draggableId) };
        if (!has && sec.id === sectionId) return { ...sec, cardIds: [...sec.cardIds, draggableId] };
        return sec;
      });
      return { ...lane, sections };
    });

    // If source was a section in same lane, ensure removal from the source section
    if (srcIsSection && srcLaneId === laneId) {
      const normalizedSrcId = source.droppableId.startsWith('section-header:') ? source.droppableId.replace('section-header:', 'section:') : source.droppableId;
      const [, , srcSectionId] = normalizedSrcId.split(':');
      newLanes = newLanes.map(lane => {
        if (lane.id !== laneId) return lane;
        const sections = (lane.sections || []).map(sec => sec.id === srcSectionId && srcSectionId !== sectionId ? { ...sec, cardIds: sec.cardIds.filter(id => id !== draggableId) } : sec);
        return { ...lane, sections };
      });
    }

    const oldStageName = boardState.stages.find(s => s.id === card.stageId)?.name || '';
    const newStageId = laneId as StageId;
    const newStageName = boardState.stages.find(s => s.id === newStageId)?.name || '';
    const updatedCard = {
        ...card,
        stageId: newStageId,
        sectionId,
        history: [
          ...card.history,
          ...(card.stageId !== newStageId && currentUser ? [{
            id: uid(),
            type: 'stage_change' as const,
            timestamp: new Date(),
            user: currentUser,
            details: { from: oldStageName, to: newStageName },
          }] : []),
        ],
    };

    // Update in Supabase
    try {
      // Get numeric pipeline ID
      const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId) || 0;
      if (numericId) {
        await dbCards.updateCard(draggableId, { stageId: newStageId, sectionId }, numericId);
      }
      if (card.stageId !== newStageId) {
        if (currentUser) {
          await dbCards.addCardHistory(draggableId, {
            id: uid(),
            type: 'stage_change',
            userId: currentUser?.id || '',
            details: { from: oldStageName, to: newStageName },
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error updating card in Supabase:', error);
    }

    const updatedCards = {
      ...boardState.cards,
      [draggableId]: updatedCard,
    };

    setBoardState({ ...boardState, lanes: newLanes, cards: updatedCards });
  }, [boardState, currentUser, pipelineId, pipelineIdNum]);

  const deleteSection = useCallback(async (stageId: string, sectionId: string) => {
    const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
    if (!numericId) {
      console.error('Pipeline ID not found');
      return;
    }

    // Find the lane and section
    const lane = boardState.lanes.find(l => l.id === stageId);
    const section = lane?.sections?.find(s => s.id === sectionId);
    if (!section) {
      console.error('Section not found');
      return;
    }

    // Get cards in this section
    const cardsInSection = Object.values(boardState.cards).filter(c => c.sectionId === sectionId);

    // Update local state: remove section and move cards to unsectioned
    setBoardState(prev => {
      const updatedCards = { ...prev.cards };
      // Move cards from section to unsectioned
      cardsInSection.forEach(card => {
        updatedCards[card.id] = {
          ...card,
          sectionId: undefined,
        };
      });

      // Remove section from lane
      const updatedLanes = prev.lanes.map(l => 
        l.id === stageId 
          ? { 
              ...l, 
              sections: (l.sections || []).filter(s => s.id !== sectionId)
            } 
          : l
      );

      return {
        ...prev,
        lanes: updatedLanes,
        cards: updatedCards,
      };
    });

    // Update cards in Supabase to remove sectionId
    try {
      const { getCurrentAuthUser } = await import('@/lib/auth');
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        // Update all cards in this section to remove sectionId
        for (const card of cardsInSection) {
          await dbCards.updateCard(card.id, { sectionId: undefined }, numericId);
        }

        // Delete section from Supabase
        await dbStages.deletePipelineSection(numericId, stageId, sectionId);
        console.log('✅ Section deleted from Supabase successfully');
      } else {
        console.warn('User not authenticated, section deleted locally only');
      }
    } catch (error: any) {
      console.error('❌ Error deleting section from Supabase:', error);
      alert(`Error deleting section: ${error.message || 'Unknown error'}`);
      // Section is already removed from local state
    }
  }, [boardState, pipelineId, pipelineIdNum]);

  const handleCardClick = useCallback((card: LeadCard) => {
    setSelectedCard(card);
  }, []);

  const handleCardUpdate = useCallback(async (cardId: string, updates: Partial<LeadCard>) => {
    if (!currentUser) return;
    
    setBoardState(prev => {
      const exists = Boolean(prev.cards[cardId]);
      if (!exists) return prev;
      const updatedCard = { ...prev.cards[cardId], ...updates };
      let newLanes = prev.lanes;
      if (updates.stageId && updates.stageId !== prev.cards[cardId].stageId) {
        newLanes = prev.lanes.map(lane => {
          if (lane.id === prev.cards[cardId].stageId) {
            return { ...lane, cardIds: lane.cardIds.filter(id => id !== cardId) };
          }
          if (lane.id === updates.stageId) {
            return { ...lane, cardIds: [...lane.cardIds, cardId] };
          }
          return lane;
        });
      }
      if (typeof updates.sectionId !== 'undefined') {
        const stageId = updatedCard.stageId;
        newLanes = newLanes.map(lane => {
          if (lane.id !== stageId) return lane;
          const sections = (lane.sections || []).map(sec => {
            const has = sec.cardIds.includes(cardId);
            if (has && sec.id !== updates.sectionId) {
              return { ...sec, cardIds: sec.cardIds.filter(id => id !== cardId) };
            }
            if (!has && sec.id === updates.sectionId) {
              return { ...sec, cardIds: [...sec.cardIds, cardId] };
            }
            return sec;
          });
          return { ...lane, sections };
        });
      }
      if (Array.isArray(updatedCard.watchers) && updatedCard.watchers.length > 0) {
        // Get numeric pipeline ID for notifications (async, but we'll handle it separately)
        const numericId = pipelineIdNum || 0;
        updatedCard.watchers.forEach(uid => {
          if (currentUser && uid !== currentUser.id) {
            if (numericId) {
              pushNotificationForUser(uid, { id: uid(), cardId, clientName: updatedCard.clientName || '', note: 'Card updated', timestamp: new Date().toISOString(), pipelineId: numericId });
            }
          }
        });
      }
      return { ...prev, lanes: newLanes, cards: { ...prev.cards, [cardId]: updatedCard } };
    });
    setSelectedCard(prev => (prev?.id === cardId ? { ...prev, ...updates } : prev));

    // Update in Supabase (only if authenticated)
    (async () => {
      try {
        const { getCurrentAuthUser } = await import('@/lib/auth');
        const authUser = await getCurrentAuthUser();
        if (authUser) {
          // Get numeric pipeline ID
          const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId) || 0;
          if (numericId) {
            await dbCards.updateCard(cardId, updates, numericId);
            
            // Send notifications to watchers
            const card = boardState.cards[cardId];
            if (card && Array.isArray(card.watchers) && card.watchers.length > 0 && currentUser) {
              card.watchers.forEach(uid => {
                if (uid !== currentUser.id) {
                  pushNotificationForUser(uid, { 
                    id: uid(), 
                    cardId, 
                    clientName: card.clientName || '', 
                    note: 'Card updated', 
                    timestamp: new Date().toISOString(), 
                    pipelineId: numericId 
                  });
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error updating card in Supabase:', error);
        // Continue even if Supabase update fails - local state is already updated
      }
    })();
  }, [boardState.cards, currentUser, pipelineId, pipelineIdNum]);

  const handleCardDelete = useCallback(async (cardId: string) => {
    if (!currentUser) return;

    // Remove card from state
    setBoardState(prev => {
      const newCards = { ...prev.cards };
      delete newCards[cardId];

      // Remove card from all lanes
      const newLanes = prev.lanes.map(lane => {
        const updatedCardIds = lane.cardIds.filter(id => id !== cardId);
        const updatedSections = (lane.sections || []).map(section => ({
          ...section,
          cardIds: section.cardIds.filter(id => id !== cardId),
        }));
        return {
          ...lane,
          cardIds: updatedCardIds,
          sections: updatedSections,
        };
      });

      return {
        ...prev,
        cards: newCards,
        lanes: newLanes,
      };
    });

    // Close detail panel if this card is selected
    setSelectedCard(prev => (prev?.id === cardId ? null : prev));

    // Delete from Supabase (only if authenticated)
    try {
      const { getCurrentAuthUser } = await import('@/lib/auth');
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        // Get numeric pipeline ID
        const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId) || 0;
        if (numericId) {
          await dbCards.deleteCard(cardId, numericId);
        }
      }
    } catch (error) {
      console.error('Error deleting card from Supabase:', error);
      // Continue even if Supabase delete fails - local state is already updated
    }
  }, [currentUser, pipelineId, pipelineIdNum]);

  const handleAddCard = useCallback((stageId: string) => {
    const id = uid();
    const draft: LeadCard = {
      id,
      clientName: '',
      phone: undefined,
      instagram: undefined,
      instagramFollowers: undefined,
      tiktok: undefined,
      tiktokFollowers: undefined,
      tokopedia: undefined,
      tokopediaFollowers: undefined,
      shopee: undefined,
      shopeeFollowers: undefined,
      subscriptionTier: 'Basic',
      dealValue: 0,
      startDate: new Date(),
      stageId: stageId as StageId,
      notes: [],
      collaborators: [],
      tags: [],
      history: [],
      files: [],
      watchers: [],
    };
    setSelectedCard(draft);
  }, []);

  const saveDraftCard = useCallback(async (card: LeadCard) => {
    console.log('saveDraftCard called with card:', card.id, card.clientName);
    
    // Validate client name is required
    if (!card.clientName || !card.clientName.trim()) {
      console.warn('Cannot save card: client name is required');
      alert('Please enter a client name before saving');
      return;
    }

    // Check authentication first
    let authUser = null;
    try {
      const { getCurrentAuthUser } = await import('@/lib/auth');
      authUser = await getCurrentAuthUser();
      console.log('Auth user:', authUser ? authUser.id : 'null');
    } catch (error) {
      console.error('Error checking authentication:', error);
    }

    // Use currentUser for history, or fallback
    const userForHistory = currentUser || (authUser ? { id: authUser.id, name: authUser.email?.split('@')[0] || 'User', email: authUser.email } : null);
    
    if (!userForHistory) {
      console.warn('Cannot save card: no user available');
      alert('Please log in to save cards');
      return;
    }

    // Check if this is a new card or an existing one
    const isNewCard = !boardState.cards[card.id];
    console.log('Is new card:', isNewCard);
    
    const cardWithHistory = {
      ...card,
      history: isNewCard ? [
        ...card.history,
        {
          id: uid(),
          type: 'card_created' as const,
          timestamp: new Date(),
          user: userForHistory,
          details: {},
        },
      ] : card.history,
    };

    // Update local state first
    setBoardState(prev => ({
      ...prev,
      cards: { ...prev.cards, [card.id]: cardWithHistory },
      lanes: prev.lanes.map(lane => 
        lane.id === card.stageId 
          ? { ...lane, cardIds: lane.cardIds.includes(card.id) ? lane.cardIds : [...lane.cardIds, card.id] }
          : lane
      ),
    }));

    // Save to Supabase (only if authenticated)
    if (authUser) {
      try {
        console.log('Attempting to save to Supabase...', { cardId: card.id, pipelineId, authUserId: authUser.id });
        
        // Ensure user profile exists in public.users (use upsert)
        try {
          const { getSupabaseClient } = await import('@/lib/supabase');
          const supabase = getSupabaseClient();
          const userProfile = await dbUsers.getUser(authUser.id);
          if (!userProfile) {
            console.log('Creating user profile...');
            // Use upsert to create or update
            const { error: upsertError } = await supabase
              .from('users')
              .upsert({
                id: authUser.id,
                name: authUser.email?.split('@')[0] || 'User',
                email: authUser.email,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser.email || 'User')}&backgroundColor=b6e3f4`,
                role: 'staff',
              }, { onConflict: 'id' });
            if (upsertError) {
              console.warn('Error creating user profile:', upsertError);
            }
          }
          
          // Ensure user is a member of the pipeline (required for RLS)
          // Get numeric pipeline ID from name (slug)
          let numericPipelineId: number | null = pipelineIdNum;
          if (!numericPipelineId) {
            const pipeline = await dbPipelines.getPipelineByName(pipelineId);
            if (pipeline) {
              numericPipelineId = pipeline.id;
              setPipelineIdNum(pipeline.id);
            } else {
              // Pipeline doesn't exist - redirect to settings or first available pipeline
              console.warn(`Pipeline "${pipelineId}" not found. Redirecting...`);
              try {
                const { getPipelines } = await import('@/lib/settings');
                const pipelines = await getPipelines();
                if (pipelines.length > 0) {
                  // Redirect to first available pipeline
                  navigate(`/pipeline/${pipelines[0].name}`, { replace: true });
                } else {
                  // No pipelines, redirect to settings
                  navigate('/settings', { replace: true });
                }
                return;
              } catch (redirectError: any) {
                console.error('Error redirecting:', redirectError);
                // Fallback: redirect to settings
                navigate('/settings', { replace: true });
                return;
              }
            }
          }
          
          // Ensure user is a member
          if (numericPipelineId) {
            try {
              const members = await dbUsers.getPipelineMembers(numericPipelineId);
              const isMember = members.some(m => m.id === authUser.id);
              if (!isMember) {
                console.log('Adding user as pipeline member...');
                await dbUsers.addPipelineMember(numericPipelineId, authUser.id, 'manager', 'accepted');
                console.log('✅ User added as pipeline member');
              }
            } catch (memberError: any) {
              console.warn('Error ensuring pipeline membership:', memberError);
              // If it's an RLS error, the user might not have permission to add themselves
              // Try to continue anyway - the card save might still work if they're already a member
              if (memberError?.code === '42501') {
                console.warn('RLS policy blocked membership addition, but continuing with save attempt');
              }
            }
          } else {
            throw new Error('Pipeline ID not found');
          }
        } catch (userError) {
          console.warn('Error ensuring user profile exists:', userError);
          // Continue anyway
        }
        
        // Get numeric pipeline ID (should be set by now)
        const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
        if (!numericId) {
          throw new Error('Pipeline ID not found');
        }
        
        if (isNewCard) {
          // Create new card
          console.log('Creating new card in Supabase...');
          await dbCards.createCard(cardWithHistory, numericId);
          console.log('✅ Card created in Supabase successfully');
        } else {
          // Update existing card
          console.log('Updating existing card in Supabase...');
          
          // Only pass fields that have changed, not the entire card object
          const existingCard = boardState.cards[card.id];
          const updates: Partial<LeadCard> = {};
          
          // Check each field and only include if changed
          if (cardWithHistory.clientName !== existingCard?.clientName) updates.clientName = cardWithHistory.clientName;
          if (cardWithHistory.phone !== existingCard?.phone) updates.phone = cardWithHistory.phone;
          if (cardWithHistory.instagram !== existingCard?.instagram) updates.instagram = cardWithHistory.instagram;
          if (cardWithHistory.tiktok !== existingCard?.tiktok) updates.tiktok = cardWithHistory.tiktok;
          if (cardWithHistory.tokopedia !== existingCard?.tokopedia) updates.tokopedia = cardWithHistory.tokopedia;
          if (cardWithHistory.shopee !== existingCard?.shopee) updates.shopee = cardWithHistory.shopee;
          if (cardWithHistory.subscriptionTier !== existingCard?.subscriptionTier) updates.subscriptionTier = cardWithHistory.subscriptionTier;
          if (cardWithHistory.dealValue !== existingCard?.dealValue) updates.dealValue = cardWithHistory.dealValue;
          if (cardWithHistory.liveUrl !== existingCard?.liveUrl) updates.liveUrl = cardWithHistory.liveUrl;
          if (cardWithHistory.instagramFollowers !== existingCard?.instagramFollowers) updates.instagramFollowers = cardWithHistory.instagramFollowers;
          if (cardWithHistory.tiktokFollowers !== existingCard?.tiktokFollowers) updates.tiktokFollowers = cardWithHistory.tiktokFollowers;
          if (cardWithHistory.tokopediaFollowers !== existingCard?.tokopediaFollowers) updates.tokopediaFollowers = cardWithHistory.tokopediaFollowers;
          if (cardWithHistory.shopeeFollowers !== existingCard?.shopeeFollowers) updates.shopeeFollowers = cardWithHistory.shopeeFollowers;
          if (cardWithHistory.activityPhase !== existingCard?.activityPhase) updates.activityPhase = cardWithHistory.activityPhase;
          if (cardWithHistory.stageId !== existingCard?.stageId) updates.stageId = cardWithHistory.stageId;
          if (cardWithHistory.sectionId !== existingCard?.sectionId) updates.sectionId = cardWithHistory.sectionId;
          if (cardWithHistory.assignedTo?.id !== existingCard?.assignedTo?.id) updates.assignedTo = cardWithHistory.assignedTo;
          if (cardWithHistory.startDate?.getTime() !== existingCard?.startDate?.getTime()) updates.startDate = cardWithHistory.startDate;
          
          // Only update history if there are new entries (check if history array has changed)
          const existingHistoryIds = new Set(existingCard?.history?.map(h => h.id) || []);
          const newHistoryEntries = cardWithHistory.history?.filter(h => !existingHistoryIds.has(h.id)) || [];
          if (newHistoryEntries.length > 0) {
            // Only include new history entries, not the entire history array
            updates.history = newHistoryEntries;
          }
          
          // Always update collaborators if they're provided (they're managed separately)
          if (cardWithHistory.collaborators !== undefined) {
            updates.collaborators = cardWithHistory.collaborators;
          }
          
          // Only update tags if they've changed
          const existingTags = existingCard?.tags || [];
          const newTags = cardWithHistory.tags || [];
          if (JSON.stringify(existingTags.sort()) !== JSON.stringify(newTags.sort())) {
            updates.tags = newTags;
          }
          
          await dbCards.updateCard(card.id, updates, numericId);
          console.log('✅ Card updated in Supabase successfully');
        }
      } catch (error: any) {
        console.error('❌ Error saving card to Supabase:', error);
        const errorMessage = error?.message || error?.code || 'Unknown error';
        console.error('Full error details:', error);
        alert(`Failed to save card: ${errorMessage}`);
        // Card is already in local state, so it will work offline
      }
    } else {
      console.warn('⚠️ User not authenticated, card saved locally only');
      alert('Not logged in. Card saved locally but will not sync to server.');
    }

    setBoardState(prev => ({
      ...prev,
      cards: { ...prev.cards, [card.id]: cardWithHistory },
      lanes: prev.lanes.map(lane =>
        lane.id === card.stageId ? { ...lane, cardIds: [...lane.cardIds, card.id] } : lane
      ),
    }));
    setSelectedCard(null);
  }, [currentUser, pipelineId, boardState.cards]);

  // Load initial board state
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Get numeric pipeline ID from name (slug)
        let numericId: number | null = null;
        try {
          const pipeline = await dbPipelines.getPipelineByName(pipelineId);
          if (pipeline) {
            numericId = pipeline.id;
            setPipelineIdNum(pipeline.id);
          }
        } catch (error) {
          console.error('Error getting pipeline ID:', error);
        }

        const [boardData, user, pipelineList] = await Promise.all([
          loadInitialBoardState(pipelineId),
          getCurrentUser(),
          getPipelines(),
        ]);
        setBoardState(boardData);
        setCurrentUser(user);
        setPipelines(pipelineList);
        
        // Update numeric ID if we got it from boardData
        if (!numericId && pipelineList.length > 0) {
          const found = pipelineList.find(p => p.name === pipelineId);
          if (found) {
            numericId = found.id;
            setPipelineIdNum(found.id);
          }
        }
        
        // Load unread count
        if (user.id) {
          try {
            const count = await getUnreadNotificationCount(user.id);
            setUnreadCount(count);
          } catch (error) {
            console.error('Error loading unread count:', error);
          }
        }
      } catch (error) {
        console.error('Error loading board data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [pipelineId]);

  // Update unread count periodically
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      try {
        const count = await getUnreadNotificationCount(currentUser.id);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error updating unread count:', error);
      }
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = params.get('card');
    if (openId && boardState.cards[openId]) {
      setSelectedCard(boardState.cards[openId]);
    }
    try { localStorage.setItem('lastPipelineId', pipelineId); } catch {}
  }, [location.search, boardState.cards, pipelineId]);

  const handleCreateColumn = useCallback(async () => {
    const name = newColumnName.trim();
    if (!name) return;
    const base = slugify(name);
    const id = makeUniqueStageId(base);
    const order = Math.max(0, ...boardState.stages.map(s => s.order || 0)) + 1;
    const stage = { id, name, color: newColumnColor, order } as any;
    setBoardState(prev => ({
      ...prev,
      stages: [...prev.stages, stage],
      lanes: [...prev.lanes, { id, stage, cardIds: [] }],
    }));
    
    // Get numeric pipeline ID and save stage
    try {
      const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
      if (numericId) {
        await setPipelineStages(numericId, [...boardState.stages, stage].map((s: any) => ({ id: s.id, name: s.name, color: s.color })));
      } else {
        // Fallback to using name (will be converted in setPipelineStages)
        await setPipelineStages(pipelineId, [...boardState.stages, stage].map((s: any) => ({ id: s.id, name: s.name, color: s.color })));
      }
    } catch (error) {
      console.error('Error saving stage:', error);
    }
    
    setAddColumnOpen(false);
    setNewColumnName('');
    setNewColumnColor('stage-new');
  }, [boardState, newColumnName, newColumnColor, pipelineIdNum, pipelineId]);

  const editStageName = async (stageId: string, newName: string, newColor?: string) => {
    // Update in Supabase
    try {
      const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
      if (numericId) {
        const updates: { name: string; color?: string } = { name: newName };
        if (newColor) {
          updates.color = newColor;
        }
        await dbStages.updatePipelineStage(numericId, stageId, updates);
      }
    } catch (error) {
      console.error('Error updating stage in Supabase:', error);
    }

    setBoardState(prev => {
      const newStages = prev.stages.map(s => 
        s.id === stageId 
          ? { ...s, name: newName, ...(newColor && { color: newColor }) }
          : s
      );
      const newLanes = prev.lanes.map(l => 
        l.stage.id === stageId 
          ? { ...l, stage: { ...l.stage, name: newName, ...(newColor && { color: newColor }) } }
          : l
      );
      return { ...prev, stages: newStages, lanes: newLanes };
    });
  };

  const deleteStage = useCallback(async (stageId: string) => {
    const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
    if (!numericId) {
      console.error('Pipeline ID not found');
      return;
    }

    // Find the lane
    const lane = boardState.lanes.find(l => l.id === stageId);
    if (!lane) {
      console.error('Stage not found');
      return;
    }

    // Get all cards in this stage
    const cardsInStage = Object.values(boardState.cards).filter(c => c.stageId === stageId);

    // Update local state: remove stage and move cards to first available stage (or remove them)
    setBoardState(prev => {
      // Find first available stage (not the one being deleted)
      const firstAvailableStage = prev.lanes.find(l => l.id !== stageId);
      
      const updatedCards = { ...prev.cards };
      // Move cards to first available stage, or remove if no other stage exists
      if (firstAvailableStage) {
        cardsInStage.forEach(card => {
          updatedCards[card.id] = {
            ...card,
            stageId: firstAvailableStage.id,
            sectionId: undefined, // Remove section assignment when moving
          };
        });
      } else {
        // No other stage, remove cards
        cardsInStage.forEach(card => {
          delete updatedCards[card.id];
        });
      }

      // Remove stage from lanes and stages
      const updatedLanes = prev.lanes.filter(l => l.id !== stageId);
      const updatedStages = prev.stages.filter(s => s.id !== stageId);

      return {
        ...prev,
        lanes: updatedLanes,
        stages: updatedStages,
        cards: updatedCards,
      };
    });

    // Update cards in Supabase and delete stage
    try {
      const { getCurrentAuthUser } = await import('@/lib/auth');
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        // Find first available stage
        const firstAvailableStage = boardState.lanes.find(l => l.id !== stageId);
        
        // Move cards to first available stage
        if (firstAvailableStage) {
          for (const card of cardsInStage) {
            await dbCards.updateCard(card.id, { 
              stageId: firstAvailableStage.id, 
              sectionId: undefined 
            }, numericId);
          }
        }

        // Delete stage from Supabase
        await dbStages.deletePipelineStage(numericId, stageId);
        console.log('✅ Stage deleted from Supabase successfully');
      } else {
        console.warn('User not authenticated, stage deleted locally only');
      }
    } catch (error: any) {
      console.error('❌ Error deleting stage from Supabase:', error);
      alert(`Error deleting stage: ${error.message || 'Unknown error'}`);
      // Stage is already removed from local state
    }
  }, [boardState, pipelineId, pipelineIdNum]);

  const toggleWatch = useCallback((cardId: string, userId: string) => {
    setBoardState(prev => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const watchers = Array.isArray(card.watchers) ? card.watchers : [];
      const nextWatchers = watchers.includes(userId) ? watchers.filter(id => id !== userId) : [...watchers, userId];
      const nextCard = { ...card, watchers: nextWatchers };
      return { ...prev, cards: { ...prev.cards, [cardId]: nextCard } };
    });
  }, []);

  const addSection = useCallback(async (stageId: string, name: string, color: string) => {
    const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
    if (!numericId) {
      console.error('Pipeline ID not found');
      return;
    }
    const sectionId = `section-${Math.random().toString(36).slice(2,8)}`;
    
    // Find the lane to get existing sections for order calculation
    const lane = boardState.lanes.find(l => l.id === stageId);
    const existingSections = lane?.sections || [];
    const order = existingSections.length;
    
    
    // Update local state immediately for responsiveness
    setBoardState(prev => ({
      ...prev,
      lanes: prev.lanes.map(l => 
        l.id === stageId 
          ? { 
              ...l, 
              sections: [ 
                ...(l.sections || []), 
                { id: sectionId, name, color, cardIds: [] } 
              ] 
            } 
          : l
      )
    }));
    
    // Save to Supabase
    try {
      const { getCurrentAuthUser } = await import('@/lib/auth');
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        await dbStages.createPipelineSection(numericId, stageId, {
          id: sectionId,
          name,
          color,
          order,
        });
        console.log('✅ Section created in Supabase successfully');
      } else {
        console.warn('User not authenticated, section saved locally only');
      }
    } catch (error: any) {
      console.error('❌ Error saving section to Supabase:', error);
      alert(`Error saving section: ${error.message || 'Unknown error'}`);
      // Section is already in local state, so it will work offline
    }
  }, [boardState.lanes, pipelineId, pipelineIdNum]);

  const editSection = useCallback(async (stageId: string, sectionId: string, name: string, color: string) => {
    const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
    if (!numericId) {
      console.error('Pipeline ID not found');
      return;
    }

    // Update local state
    setBoardState(prev => ({
      ...prev,
      lanes: prev.lanes.map(l => 
        l.id === stageId 
          ? { 
              ...l, 
              sections: (l.sections || []).map(s => 
                s.id === sectionId 
                  ? { ...s, name, color }
                  : s
              )
            } 
          : l
      )
    }));

    // Save to Supabase
    try {
      const { getCurrentAuthUser } = await import('@/lib/auth');
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        await dbStages.updatePipelineSection(numericId, stageId, sectionId, { name, color });
        console.log('✅ Section updated in Supabase successfully');
      } else {
        console.warn('User not authenticated, section updated locally only');
      }
    } catch (error: any) {
      console.error('❌ Error updating section in Supabase:', error);
      alert(`Error updating section: ${error.message || 'Unknown error'}`);
    }
  }, [pipelineId, pipelineIdNum]);

  const reorderSections = useCallback(async (stageId: string, sectionOrders: { sectionId: string; order: number }[]) => {
    const numericId = pipelineIdNum || await dbPipelines.getPipelineIdByName(pipelineId);
    if (!numericId) {
      console.error('Pipeline ID not found');
      return;
    }

    // Update local state
    setBoardState(prev => ({
      ...prev,
      lanes: prev.lanes.map(l => 
        l.id === stageId 
          ? { 
              ...l, 
              sections: (l.sections || []).map(s => {
                const newOrder = sectionOrders.find(so => so.sectionId === s.id)?.order;
                return newOrder !== undefined ? { ...s } : s;
              }).sort((a, b) => {
                const orderA = sectionOrders.find(so => so.sectionId === a.id)?.order ?? 999;
                const orderB = sectionOrders.find(so => so.sectionId === b.id)?.order ?? 999;
                return orderA - orderB;
              })
            } 
          : l
      )
    }));

    // Save to Supabase
    try {
      const { getCurrentAuthUser } = await import('@/lib/auth');
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        for (const { sectionId, order } of sectionOrders) {
          await dbStages.updatePipelineSection(numericId, stageId, sectionId, { order });
        }
        console.log('✅ Section order updated in Supabase successfully');
      } else {
        console.warn('User not authenticated, section order updated locally only');
      }
    } catch (error: any) {
      console.error('❌ Error updating section order in Supabase:', error);
      alert(`Error updating section order: ${error.message || 'Unknown error'}`);
    }
  }, [pipelineId, pipelineIdNum]);

  // Filter cards based on search
  const filteredLanes = boardState.lanes.map(lane => ({
    ...lane,
    cardIds: lane.cardIds.filter(cardId => {
      const card = boardState.cards[cardId];
      if (!card) return false;
      return card.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    }),
  }));

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{pipelineTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Manage your leads and track progress
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            {/* Filter */}
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>

            {/* Pipeline Switcher */}
            <div className="flex items-center gap-2">
              <Select value={pipelineId} onValueChange={(name) => { try { localStorage.setItem('lastPipelineName', name); } catch {}; navigate(`/pipeline/${name}`); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.filter(p => p.name && p.name.trim() !== '').map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full relative">
                    <MemberAvatar member={currentUser} size="md" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold text-white bg-red-500 rounded-full border-2 border-background">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/pipeline/${pipelineId}/settings`)}>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/profile`)}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/notifications`)}>
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    try {
                      await signOut();
                    } catch (error) {
                      console.error('Error signing out:', error);
                    }
                    // Clear legacy token as fallback
                    try {
                      localStorage.removeItem('sb:token');
                    } catch {}
                    navigate('/login');
                  }}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading pipeline...</div>
        </div>
      ) : filteredLanes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Columns className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">No stages yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by creating your first stage or column to organize your leads and opportunities.
            </p>
            <Button
              onClick={() => setAddColumnOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Stage
            </Button>
          </div>
        </div>
      ) : (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <Droppable droppableId="columns" type="COLUMN" direction="horizontal">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex gap-5 h-full",
                  snapshot.isDraggingOver && "bg-accent/10"
                )}
              >
                {filteredLanes.map((lane, index) => (
                  <Draggable key={lane.id} draggableId={`column-${lane.id}`} index={index} type="COLUMN">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "flex-shrink-0",
                          snapshot.isDragging && "opacity-50"
                        )}
                        style={provided.draggableProps.style}
                      >
                        <KanbanLane
                          lane={lane}
                          cards={lane.cardIds.map(id => boardState.cards[id])}
                          onCardClick={handleCardClick}
                          onAddCard={handleAddCard}
                          onEditStage={editStageName}
                          onDeleteStage={deleteStage}
                          currentUser={currentUser}
                          onToggleWatch={toggleWatch}
                          onAddSection={addSection}
                          onEditSection={editSection}
                          onDeleteSection={deleteSection}
                          onReorderSections={reorderSections}
                          dragHandleProps={provided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
      )}

      {/* Card Detail Panel */}
      {selectedCard && currentUser && (
        <CardDetailPanel
          card={selectedCard}
          stages={boardState.stages}
          teamMembers={boardState.teamMembers}
          currentUser={currentUser}
          sectionsByStage={Object.fromEntries(boardState.lanes.map(l => [l.id, (l.sections || []).map(s => ({ id: s.id, name: s.name, color: s.color }))]))}
          existingClientNames={Array.from(new Set(Object.values(boardState.cards).map(c => c.clientName).filter(Boolean)))}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onSave={saveDraftCard}
          onDelete={handleCardDelete}
          isDraft={!boardState.cards[selectedCard.id]}
        />
      )}

      <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Column title name</label>
              <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Column header color</label>
              <Select value={newColumnColor} onValueChange={(v) => setNewColumnColor(v as any)}>
                <SelectTrigger className="w-full">
                  <span style={{ pointerEvents: 'none' }}>
                    {(() => {
                      const colors = getStageColorClasses('new', newColumnColor);
                      return (
                        <div className={cn('flex items-center gap-2 rounded-md px-2 py-1', colors.bgLight, colors.text)}>
                          <div className={cn('w-4 h-4 rounded-full', colors.bg)} />
                          <div className="h-3 w-12 rounded-sm bg-background/30" />
                        </div>
                      );
                    })()}
                  </span>
                  <SelectValue placeholder="Select color" className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">{''}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(['stage-new','stage-called','stage-onboard','stage-live','stage-lost','stage-purple','stage-teal','stage-indigo','stage-pink','stage-orange'] as const).map((variant) => {
                    const colors = getStageColorClasses('new', variant);
                    return (
                      <SelectItem key={variant} value={variant}>
                        <div className={cn('flex items-center gap-2 rounded-md px-2 py-1', colors.bgLight, colors.text)}>
                          <div className={cn('w-4 h-4 rounded-full', colors.bg)} />
                          <div className="h-3 w-12 rounded-sm bg-background/30" />
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddColumnOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateColumn}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
