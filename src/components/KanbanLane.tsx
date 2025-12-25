import { Droppable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Lane, LeadCard, Stage } from '@/types/pipeline';
import { KanbanCard } from './KanbanCard';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getStageColorClasses } from '@/lib/pipeline-utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface KanbanLaneProps {
  lane: Lane;
  cards: LeadCard[];
  onCardClick: (card: LeadCard) => void;
  onAddCard: (stageId: string) => void;
  onEditStage: (stageId: string, newName: string) => void;
  currentUser: any;
  onToggleWatch: (cardId: string, userId: string) => void;
  onAddSection: (stageId: string, name: string, color: string) => void;
}

export function KanbanLane({ lane, cards, onCardClick, onAddCard, onEditStage, currentUser, onToggleWatch, onAddSection }: KanbanLaneProps) {
  const stageColors = getStageColorClasses(lane.stage.id, lane.stage.color as any);
  const [editingOpen, setEditingOpen] = useState(false);
  const [stageName, setStageName] = useState(lane.stage.name);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionColor, setSectionColor] = useState<'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost' | 'stage-purple' | 'stage-teal' | 'stage-indigo' | 'stage-pink' | 'stage-orange'>('stage-new');
  const totalDeal = cards.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const formattedTotal = totalDeal.toLocaleString();

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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className={cn('w-3 h-3 rounded-full', stageColors.bg)} />
            <h2 className="font-semibold text-foreground">{lane.stage.name}</h2>
          </div>
          <div className="text-xs text-muted-foreground">Value: {formattedTotal}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setStageName(lane.stage.name); setEditingOpen(true); }}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddCard(lane.id)}>Add card</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddSectionOpen(true)}>Add section</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editingOpen} onOpenChange={setEditingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
          </DialogHeader>
          <Input value={stageName} onChange={(e) => setStageName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStageName(lane.stage.name); setEditingOpen(false); }}>Cancel</Button>
            <Button onClick={() => {
              const name = stageName.trim();
              if (!name) return;
              onEditStage(lane.stage.id, name);
              setEditingOpen(false);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Section name</label>
              <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Section color</label>
              <Select value={sectionColor} onValueChange={(v) => setSectionColor(v as any)}>
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
            <Button variant="outline" onClick={() => setAddSectionOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const name = sectionName.trim();
              if (!name) return;
              onAddSection(lane.id, name, sectionColor);
              setSectionName('');
              setSectionColor('stage-new');
              setAddSectionOpen(false);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cards Container */}
      {(!lane.sections || lane.sections.length === 0) ? (
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
                  currentUser={currentUser}
                  onToggleWatch={() => onToggleWatch(card.id, currentUser.id)}
                />
              ))}
              {provided.placeholder}

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
      ) : (
        <div className="p-3 rounded-b-xl space-y-4 bg-muted/30">
          {/* Section containers */}
          {lane.sections?.map((sec) => {
            const colors = getStageColorClasses('new', sec.color as any);
            const sectionCards = cards.filter(c => c.sectionId === sec.id);
            return (
              <div key={sec.id} className="relative">
                {/* Header as separate droppable */}
                <Droppable droppableId={`section-header:${lane.id}:${sec.id}`}>
                  {(headerProvided, headerSnapshot) => (
                    <div
                      ref={headerProvided.innerRef}
                      {...headerProvided.droppableProps}
                      className={cn(
                        'rounded-t-lg border-t border-l border-r bg-card/60 px-3 py-2 flex items-center gap-2 cursor-pointer transition-all',
                        colors.bgLight,
                        colors.text,
                        headerSnapshot.isDraggingOver && 'ring-2 ring-primary/50 scale-[1.02] shadow-lg'
                      )}
                    >
                      <div className={cn('w-3 h-3 rounded-full', colors.bg)} />
                      <span className="text-xs font-medium">{sec.name}</span>
                      <span className="text-[10px] text-muted-foreground">({sectionCards.length})</span>
                      {headerProvided.placeholder}
                    </div>
                  )}
                </Droppable>
                {/* Content area as separate droppable */}
                <Droppable droppableId={`section:${lane.id}:${sec.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'rounded-b-lg border-b border-l border-r bg-card/60 p-2 space-y-3 min-h-[60px]',
                        colors.text,
                        snapshot.isDraggingOver && 'ring-2 ring-primary/20'
                      )}
                    >
                      {sectionCards.map((card, index) => (
                        <KanbanCard
                          key={card.id}
                          card={card}
                          stage={lane.stage}
                          index={index}
                          onClick={() => onCardClick(card)}
                          currentUser={currentUser}
                          onToggleWatch={() => onToggleWatch(card.id, currentUser.id)}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}

          {/* Unsectioned container */}
          <div className="rounded-lg border border-border/50 bg-card/60">
            <div className="px-3 py-2 text-xs text-muted-foreground">No Section</div>
            <Droppable droppableId={lane.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn('p-2 space-y-3 rounded-b-lg', snapshot.isDraggingOver && 'bg-accent/50 ring-2 ring-primary/20')}
                >
                  {cards.filter(c => !c.sectionId).map((card, index) => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      stage={lane.stage}
                      index={index}
                      onClick={() => onCardClick(card)}
                      currentUser={currentUser}
                      onToggleWatch={() => onToggleWatch(card.id, currentUser.id)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

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
    </motion.div>
  );
}
