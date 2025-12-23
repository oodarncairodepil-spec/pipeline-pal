import { Droppable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Lane, LeadCard, Stage } from '@/types/pipeline';
import { KanbanCard } from './KanbanCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getStageColorClasses } from '@/lib/pipeline-utils';

interface KanbanLaneProps {
  lane: Lane;
  cards: LeadCard[];
  onCardClick: (card: LeadCard) => void;
  onAddCard: (stageId: string) => void;
}

export function KanbanLane({ lane, cards, onCardClick, onAddCard }: KanbanLaneProps) {
  const stageColors = getStageColorClasses(lane.stage.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-shrink-0 w-80"
    >
      {/* Lane Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 rounded-t-xl border-b-2',
          stageColors.bgLight,
          stageColors.border
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-3 h-3 rounded-full', stageColors.bg)} />
          <h2 className="font-semibold text-foreground">{lane.stage.name}</h2>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              stageColors.bgLight,
              stageColors.text
            )}
          >
            {cards.length}
          </span>
        </div>
        <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Cards Container */}
      <Droppable droppableId={lane.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'min-h-[calc(100vh-16rem)] p-3 rounded-b-xl space-y-3 transition-colors duration-200',
              'bg-muted/30',
              snapshot.isDraggingOver && 'bg-accent/50 ring-2 ring-primary/20'
            )}
          >
            {cards.map((card, index) => (
              <KanbanCard
                key={card.id}
                card={card}
                stage={lane.stage}
                index={index}
                onClick={() => onCardClick(card)}
              />
            ))}
            {provided.placeholder}

            {/* Add Card Button */}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-card/80 border-2 border-dashed border-border/50 hover:border-primary/30"
              onClick={() => onAddCard(lane.id)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add a card
            </Button>
          </div>
        )}
      </Droppable>
    </motion.div>
  );
}
