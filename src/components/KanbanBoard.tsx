import { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { BoardState, LeadCard, StageId } from '@/types/pipeline';
import { initialBoardState } from '@/data/mockData';
import { KanbanLane } from './KanbanLane';
import { CardDetailPanel } from './CardDetailPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarGroup } from './MemberAvatar';

export function KanbanBoard() {
  const [boardState, setBoardState] = useState<BoardState>(initialBoardState);
  const [selectedCard, setSelectedCard] = useState<LeadCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Current user (simulated - in real app would come from auth)
  const currentUser = boardState.teamMembers[0]; // Alex (Manager)

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newLanes = [...boardState.lanes];
    const sourceIndex = newLanes.findIndex(l => l.id === source.droppableId);
    const destIndex = newLanes.findIndex(l => l.id === destination.droppableId);

    // Remove from source
    const [removed] = newLanes[sourceIndex].cardIds.splice(source.index, 1);

    // Add to destination
    newLanes[destIndex].cardIds.splice(destination.index, 0, removed);

    // Update card's stage
    const card = boardState.cards[draggableId];
    const oldStageName = boardState.stages.find(s => s.id === card.stageId)?.name || '';
    const newStageId = destination.droppableId as StageId;
    const newStageName = boardState.stages.find(s => s.id === newStageId)?.name || '';

    const updatedCards = {
      ...boardState.cards,
      [draggableId]: {
        ...card,
        stageId: newStageId,
        history: [
          ...card.history,
          {
            id: `hist-${Date.now()}`,
            type: 'stage_change' as const,
            timestamp: new Date(),
            user: currentUser,
            details: { from: oldStageName, to: newStageName },
          },
        ],
      },
    };

    setBoardState({
      ...boardState,
      lanes: newLanes,
      cards: updatedCards,
    });
  }, [boardState, currentUser]);

  const handleCardClick = useCallback((card: LeadCard) => {
    setSelectedCard(card);
  }, []);

  const handleCardUpdate = useCallback((cardId: string, updates: Partial<LeadCard>) => {
    setBoardState(prev => {
      const updatedCard = { ...prev.cards[cardId], ...updates };
      
      // If stage changed, update lanes
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

      return {
        ...prev,
        lanes: newLanes,
        cards: { ...prev.cards, [cardId]: updatedCard },
      };
    });

    // Update selected card if it's the one being updated
    setSelectedCard(prev => (prev?.id === cardId ? { ...prev, ...updates } : prev));
  }, []);

  const handleAddCard = useCallback((stageId: string) => {
    const newCard: LeadCard = {
      id: `card-${Date.now()}`,
      clientName: 'New Lead',
      subscriptionTier: 'Basic',
      startDate: new Date(),
      stageId: stageId as StageId,
      notes: [],
      history: [
        {
          id: `hist-${Date.now()}`,
          type: 'card_created',
          timestamp: new Date(),
          user: currentUser,
          details: {},
        },
      ],
      files: [],
    };

    setBoardState(prev => ({
      ...prev,
      cards: { ...prev.cards, [newCard.id]: newCard },
      lanes: prev.lanes.map(lane =>
        lane.id === stageId
          ? { ...lane, cardIds: [...lane.cardIds, newCard.id] }
          : lane
      ),
    }));

    setSelectedCard(newCard);
  }, [currentUser]);

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
            <h1 className="text-2xl font-bold text-foreground">Sales Pipeline</h1>
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

            {/* Team */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
              <Users className="w-4 h-4 text-muted-foreground" />
              <AvatarGroup members={boardState.teamMembers} max={3} />
            </div>

            {/* Add Lead */}
            <Button onClick={() => handleAddCard('new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
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
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
        />
      )}
    </div>
  );
}
