import { Draggable } from '@hello-pangea/dnd';
import { Calendar, Instagram, Eye } from 'lucide-react';
import { LeadCard, Stage } from '@/types/pipeline';
import { getNotificationsForUser } from '@/lib/settings';
import { getRunningDays, formatRunningDays } from '@/lib/pipeline-utils';
import { MemberAvatar } from './MemberAvatar';
import { StageBadge } from './StageBadge';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  card: LeadCard;
  stage: Stage;
  index: number;
  onClick: () => void;
  currentUser?: any;
  onToggleWatch?: () => void;
}

export function KanbanCard({ card, stage, index, onClick, currentUser, onToggleWatch }: KanbanCardProps) {
  const runningDays = getRunningDays(card.startDate);
  const isAssigned = currentUser && card.assignedTo && card.assignedTo.id === currentUser.id;
  const isWatcher = currentUser && Array.isArray(card.watchers) && card.watchers.includes(currentUser.id);
  const notifCount = currentUser ? getNotificationsForUser(currentUser.id).filter(n => n.cardId === card.id).length : 0;
  const formatFollowers = (n?: number) => {
    if (!n || n <= 0) return undefined;
    if (n >= 1_000_000) {
      const v = Math.round(n / 100_000) / 10;
      return String(v).replace('.', ',') + 'M';
    }
    if (n >= 1_000) {
      const v = Math.round(n / 100) / 10;
      return String(v).replace('.', ',') + 'k';
    }
    return n.toLocaleString();
  };

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
            <div className="flex items-center gap-2">
              <MemberAvatar member={card.assignedTo} size="sm" />
              {!isAssigned && currentUser && (
                <button onClick={(e) => { e.stopPropagation(); onToggleWatch && onToggleWatch(); }} className="rounded-full bg-muted flex items-center justify-center w-6 h-6 text-xs">
                  <Eye className={cn('w-4 h-4', isWatcher ? 'text-primary' : 'text-muted-foreground')} />
                </button>
              )}
            </div>
          </div>

          {/* Current Activity & Days */}
          <div className="flex items-center gap-2 mb-3">
            <StageBadge stageId={card.stageId} stageName={card.activityPhase || 'Current Activity'} size="sm" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatRunningDays(runningDays)}
            </span>
          </div>

          {/* Socials */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {card.instagram && (
              <span className="flex items-center gap-1">
                <Instagram className="w-3 h-3" />
                {card.instagram} {card.instagramFollowers ? `(${formatFollowers(card.instagramFollowers)})` : ''}
              </span>
            )}
            {card.tiktok && (
              <span className="flex items-center gap-1">
                <img src="https://cdn.simpleicons.org/tiktok" alt="TikTok" className="w-3 h-3" />
                {card.tiktok} {card.tiktokFollowers ? `(${formatFollowers(card.tiktokFollowers)})` : ''}
              </span>
            )}
            {card.tokopedia && (
              <span className="flex items-center gap-1">
                <img src="https://www.tokopedia.com/favicon.ico" alt="Tokopedia" className="w-3 h-3" />
                {card.tokopedia} {card.tokopediaFollowers ? `(${formatFollowers(card.tokopediaFollowers)})` : ''}
              </span>
            )}
            {card.shopee && (
              <span className="flex items-center gap-1">
                <img src="https://cdn.simpleicons.org/shopee" alt="Shopee" className="w-3 h-3" />
                {card.shopee} {card.shopeeFollowers ? `(${formatFollowers(card.shopeeFollowers)})` : ''}
              </span>
            )}
            
          </div>

          {/* Phase */}
          <div className="mt-2 flex items-center gap-2">
            {card.activityPhase && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                Phase: {card.activityPhase}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wide">
              {card.subscriptionTier}
            </span>
            {typeof card.dealValue === 'number' && card.dealValue > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                Value: {card.dealValue.toLocaleString('en-US')}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
