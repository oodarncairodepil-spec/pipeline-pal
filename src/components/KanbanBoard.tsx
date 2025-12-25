import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Search, Filter, Columns } from 'lucide-react';
import { BoardState, LeadCard, StageId } from '@/types/pipeline';
import { loadInitialBoardState } from '@/data/mockData';
import { setPipelineStages, getPipelines, setPipelines, pushNotificationForUser } from '@/lib/settings';
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

export function KanbanBoard() {
  const { pipelineId = 'default' } = useParams();
  const location = useLocation();
  const [boardState, setBoardState] = useState<BoardState>(loadInitialBoardState(pipelineId));
  const [selectedCard, setSelectedCard] = useState<LeadCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState<'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost' | 'stage-purple' | 'stage-teal' | 'stage-indigo' | 'stage-pink' | 'stage-orange'>('stage-new');
  const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Current user (simulated - in real app would come from auth)
  const currentUser = boardState.teamMembers[0]; // Alex (Manager)
  const navigate = useNavigate();
  const pipelines = getPipelines();
  const pipelineTitle = `${(pipelines.find(p => p.id === pipelineId)?.name || 'Sales')} Pipeline`;
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

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    const destinationId = destination.droppableId;
    const isSectionDrop = destinationId.startsWith('section:');

    let newLanes = [...boardState.lanes];
    const card = boardState.cards[draggableId];

    // Branch: dropping onto the general lane area (unsectioned)
    if (!isSectionDrop) {
      const srcIsSection = source.droppableId.startsWith('section:');
      const srcLaneId = srcIsSection ? source.droppableId.split(':')[1] : source.droppableId;
      const sourceIndex = newLanes.findIndex(l => l.id === srcLaneId);
      const destIndex = newLanes.findIndex(l => l.id === destinationId);
      if (sourceIndex === -1 || destIndex === -1) return;
      if (srcLaneId === destinationId && source.index === destination.index) return;
      newLanes[sourceIndex].cardIds = newLanes[sourceIndex].cardIds.filter(id => id !== draggableId);
      const destIds = [...newLanes[destIndex].cardIds];
      const insertAt = Math.min(Math.max(destination.index, 0), destIds.length);
      destIds.splice(insertAt, 0, draggableId);
      newLanes[destIndex].cardIds = destIds;

      // If dragged from a section, remove from that section
      if (srcIsSection) {
        const [, , srcSectionId] = source.droppableId.split(':');
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
      const updatedCards = {
        ...boardState.cards,
        [draggableId]: {
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
        },
      };
      setBoardState({ ...boardState, lanes: newLanes, cards: updatedCards });
      return;
    }

    const [, laneId, sectionId] = destinationId.split(':');
    const srcIsSection = source.droppableId.startsWith('section:');
    const srcLaneId = srcIsSection ? source.droppableId.split(':')[1] : source.droppableId;
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
      const [, , srcSectionId] = source.droppableId.split(':');
      newLanes = newLanes.map(lane => {
        if (lane.id !== laneId) return lane;
        const sections = (lane.sections || []).map(sec => sec.id === srcSectionId && srcSectionId !== sectionId ? { ...sec, cardIds: sec.cardIds.filter(id => id !== draggableId) } : sec);
        return { ...lane, sections };
      });
    }

    const oldStageName = boardState.stages.find(s => s.id === card.stageId)?.name || '';
    const newStageId = laneId as StageId;
    const newStageName = boardState.stages.find(s => s.id === newStageId)?.name || '';
    const updatedCards = {
      ...boardState.cards,
      [draggableId]: {
        ...card,
        stageId: newStageId,
        sectionId,
        history: [
          ...card.history,
          ...(card.stageId !== newStageId ? [{
            id: uid(),
            type: 'stage_change' as const,
            timestamp: new Date(),
            user: currentUser,
            details: { from: oldStageName, to: newStageName },
          }] : []),
        ],
      },
    };

    setBoardState({ ...boardState, lanes: newLanes, cards: updatedCards });
  }, [boardState, currentUser]);

  const handleCardClick = useCallback((card: LeadCard) => {
    setSelectedCard(card);
  }, []);

  const handleCardUpdate = useCallback((cardId: string, updates: Partial<LeadCard>) => {
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
        updatedCard.watchers.forEach(uid => {
          if (uid !== currentUser.id) {
            pushNotificationForUser(uid, { id: uid(), cardId, clientName: updatedCard.clientName || '', note: 'Card updated', timestamp: new Date().toISOString(), pipelineId });
          }
        });
      }
      return { ...prev, lanes: newLanes, cards: { ...prev.cards, [cardId]: updatedCard } };
    });
    setSelectedCard(prev => (prev?.id === cardId ? { ...prev, ...updates } : prev));
  }, []);

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

  const saveDraftCard = useCallback((card: LeadCard) => {
    setBoardState(prev => ({
      ...prev,
      cards: { ...prev.cards, [card.id]: { ...card, history: [ ...card.history, { id: uid(), type: 'card_created', timestamp: new Date(), user: currentUser, details: {} } ] } },
      lanes: prev.lanes.map(lane =>
        lane.id === card.stageId ? { ...lane, cardIds: [...lane.cardIds, card.id] } : lane
      ),
    }));
    setSelectedCard(null);
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = params.get('card');
    if (openId && boardState.cards[openId]) {
      setSelectedCard(boardState.cards[openId]);
    }
    try { localStorage.setItem('lastPipelineId', pipelineId); } catch {}
  }, [location.search, boardState.cards]);

  const handleCreateColumn = useCallback(() => {
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
    setPipelineStages(pipelineId, [...boardState.stages, stage].map((s: any) => ({ id: s.id, name: s.name, color: s.color })));
    setAddColumnOpen(false);
    setNewColumnName('');
    setNewColumnColor('stage-new');
  }, [boardState, newColumnName, newColumnColor]);

  const editStageName = (stageId: string, newName: string) => {
    setBoardState(prev => {
      const newStages = prev.stages.map(s => s.id === stageId ? { ...s, name: newName } : s);
      const newLanes = prev.lanes.map(l => l.stage.id === stageId ? { ...l, stage: { ...l.stage, name: newName } } : l);
      setPipelineStages(pipelineId, newStages.map(s => ({ id: s.id, name: s.name, color: (s as any).color })));
      return { ...prev, stages: newStages, lanes: newLanes };
    });
  };

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

  const addSection = useCallback((stageId: string, name: string, color: string) => {
    setBoardState(prev => ({
      ...prev,
      lanes: prev.lanes.map(l => l.id === stageId ? { ...l, sections: [ ...(l.sections || []), { id: `section-${Math.random().toString(36).slice(2,8)}`, name, color, cardIds: [] } ] } : l)
    }));
  }, []);

  // Filter cards based on search
  const filteredLanes = boardState.lanes.map(lane => ({
    ...lane,
    cardIds: lane.cardIds.filter(cardId => {
      const card = boardState.cards[cardId];
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
            <div className="mt-2">
              <Button variant="default" onClick={() => setAddColumnOpen(true)}>
                <Columns className="w-4 h-4 mr-2" />
                Add New Column
              </Button>
            </div>
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
              <Select value={pipelineId} onValueChange={(id) => { try { localStorage.setItem('lastPipelineId', id); } catch {}; navigate(`/pipeline/${id}`); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full">
                    <MemberAvatar member={currentUser} size="md" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/pipeline/${pipelineId}/settings`)}>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/profile`)}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/notifications`)}>
                    Notifications ({getNotificationsForUser(currentUser.id).length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { try { localStorage.removeItem('sb:token'); } catch {}; navigate('/login'); }}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-5 h-full">
            {filteredLanes.map(lane => (
              <KanbanLane
                key={lane.id}
                lane={lane}
                cards={lane.cardIds.map(id => boardState.cards[id])}
                onCardClick={handleCardClick}
                onAddCard={handleAddCard}
                onEditStage={editStageName}
                currentUser={currentUser}
                onToggleWatch={toggleWatch}
                onAddSection={addSection}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Card Detail Panel */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard}
          stages={boardState.stages}
          teamMembers={boardState.teamMembers}
          currentUser={currentUser}
          sectionsByStage={Object.fromEntries(boardState.lanes.map(l => [l.id, (l.sections || []).map(s => ({ id: s.id, name: s.name, color: s.color }))]))}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onSave={saveDraftCard}
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
                  <SelectValue placeholder="Select color" />
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
