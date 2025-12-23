import { Draggable } from '@hello-pangea/dnd';
import { Calendar, Instagram, User } from 'lucide-react';
import { LeadCard, Stage } from '@/types/pipeline';
import { getRunningDays, formatRunningDays } from '@/lib/pipeline-utils';
import { MemberAvatar } from './MemberAvatar';
import { StageBadge } from './StageBadge';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  card: LeadCard;
  stage: Stage;
  index: number;
  onClick: () => void;
}

export function KanbanCard({ card, stage, index, onClick }: KanbanCardProps) {
  const runningDays = getRunningDays(card.startDate);

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            'group bg-card rounded-xl p-4 shadow-card cursor-pointer transition-all duration-200',
            'hover:shadow-card-hover hover:-translate-y-0.5',
            'border border-border/50',
            'animate-fade-in',
            snapshot.isDragging && 'shadow-card-hover rotate-[2deg] scale-[1.02]'
          )}
          style={{
            ...provided.draggableProps.style,
            animationDelay: `${index * 50}ms`,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
              {card.clientName}
            </h3>
            <MemberAvatar member={card.assignedTo} size="sm" />
          </div>

          {/* Stage & Days */}
          <div className="flex items-center gap-2 mb-3">
            <StageBadge stageId={card.stageId} stageName={stage.name} size="sm" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatRunningDays(runningDays)}
            </span>
          </div>

          {/* Quick Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {card.instagram && (
              <span className="flex items-center gap-1">
                <Instagram className="w-3 h-3" />
                {card.instagram}
              </span>
            )}
            {card.assignedTo && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {card.assignedTo.name}
              </span>
            )}
          </div>

          {/* Subscription Tier */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wide">
              {card.subscriptionTier}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
