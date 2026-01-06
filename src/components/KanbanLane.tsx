import { Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { MoreHorizontal, Plus, Trash2, X, GripVertical, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
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
  onEditStage: (stageId: string, newName: string, newColor?: string) => void;
  onDeleteStage?: (stageId: string) => void;
  currentUser: any;
  onToggleWatch: (cardId: string, userId: string) => void;
  onAddSection: (stageId: string, name: string, color: string) => void;
  onEditSection?: (stageId: string, sectionId: string, name: string, color: string) => void;
  onDeleteSection: (stageId: string, sectionId: string) => void;
  onReorderSections?: (stageId: string, sectionOrders: { sectionId: string; order: number }[]) => void;
  dragHandleProps?: any;
}

export function KanbanLane({ lane, cards, onCardClick, onAddCard, onEditStage, onDeleteStage, currentUser, onToggleWatch, onAddSection, onEditSection, onDeleteSection, onReorderSections, dragHandleProps }: KanbanLaneProps) {
  const stageColors = getStageColorClasses(lane.stage.id, lane.stage.color as any);
  const [editingOpen, setEditingOpen] = useState(false);
  const [stageName, setStageName] = useState(lane.stage.name);
  const [stageColor, setStageColor] = useState<'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost' | 'stage-purple' | 'stage-teal' | 'stage-indigo' | 'stage-pink' | 'stage-orange'>(lane.stage.color as any);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionColor, setSectionColor] = useState<'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost' | 'stage-purple' | 'stage-teal' | 'stage-indigo' | 'stage-pink' | 'stage-orange'>('stage-new');
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const [deleteStageOpen, setDeleteStageOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [editingSectionColor, setEditingSectionColor] = useState<'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost' | 'stage-purple' | 'stage-teal' | 'stage-indigo' | 'stage-pink' | 'stage-orange'>('stage-new');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Remove duplicate cards by ID to prevent React key warnings
  const uniqueCards = cards.filter((card, index, self) => 
    index === self.findIndex(c => c.id === card.id)
  );
  
  const totalDeal = uniqueCards.reduce((sum, c) => sum + (c.dealValue || 0), 0);
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
        <div className="flex items-center gap-2 flex-1">
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
              title="Drag to reorder column"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', stageColors.bg)} />
              <h2 className="font-semibold text-foreground">{lane.stage.name}</h2>
            </div>
            <div className="text-xs text-muted-foreground">Value: {formattedTotal}</div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setStageName(lane.stage.name);
              setStageColor(lane.stage.color as any);
              setEditingOpen(true);
            }}>Edit column</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddSectionOpen(true)}>Add section</DropdownMenuItem>
            {onDeleteStage && (
              <DropdownMenuItem 
                onClick={() => setDeleteStageOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                Delete column
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editingOpen} onOpenChange={setEditingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Column name</label>
              <Input value={stageName} onChange={(e) => setStageName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Column color</label>
              <Select value={stageColor} onValueChange={(v) => setStageColor(v as any)}>
                <SelectTrigger className="w-full">
                  <span style={{ pointerEvents: 'none' }}>
                    {(() => {
                      const colors = getStageColorClasses('new', stageColor);
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
            <Button variant="outline" onClick={() => { 
              setStageName(lane.stage.name); 
              setStageColor(lane.stage.color as any);
              setEditingOpen(false); 
            }}>Cancel</Button>
            <Button onClick={() => {
              const name = stageName.trim();
              if (!name) return;
              onEditStage(lane.stage.id, name, stageColor);
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
                  <span style={{ pointerEvents: 'none' }}>
                    {(() => {
                      const colors = getStageColorClasses('new', sectionColor);
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
                'min-h-[calc(100vh-16rem)] max-h-[calc(100vh-10rem)] p-3 rounded-b-xl space-y-3 transition-colors duration-200',
                'bg-muted/30 overflow-y-auto',
                snapshot.isDraggingOver && 'bg-accent/50 ring-2 ring-primary/20'
              )}
            >
              {uniqueCards.map((card, index) => (
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
        <Droppable droppableId={`sections-${lane.id}`} type="SECTION">
          {(sectionsProvided, sectionsSnapshot) => (
            <div
              ref={sectionsProvided.innerRef}
              {...sectionsProvided.droppableProps}
              className={cn(
                "p-3 rounded-b-xl space-y-4 bg-muted/30 max-h-[calc(100vh-10rem)] overflow-y-auto",
                sectionsSnapshot.isDraggingOver && "bg-accent/10"
              )}
            >
              {/* Section containers */}
              {lane.sections?.map((sec, sectionIndex) => {
                const colors = getStageColorClasses('new', sec.color as any);
                const sectionCards = uniqueCards.filter(c => c.sectionId === sec.id);
                return (
                  <Draggable key={sec.id} draggableId={`section-${lane.id}-${sec.id}`} index={sectionIndex} type="SECTION">
                    {(sectionProvided, sectionSnapshot) => (
                      <div
                        ref={sectionProvided.innerRef}
                        {...sectionProvided.draggableProps}
                        className={cn(
                          "relative",
                          sectionSnapshot.isDragging && "opacity-50"
                        )}
                        style={sectionProvided.draggableProps.style}
                      >
                        {/* Header as separate droppable */}
                        <Droppable droppableId={`section-header:${lane.id}:${sec.id}`}>
                          {(headerProvided, headerSnapshot) => (
                            <div
                              ref={headerProvided.innerRef}
                              {...headerProvided.droppableProps}
                              className={cn(
                                'rounded-t-lg border-t border-l border-r bg-card/60 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-all group',
                                colors.bgLight,
                                colors.text,
                                headerSnapshot.isDraggingOver && 'ring-2 ring-primary/50 scale-[1.02] shadow-lg'
                              )}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div
                                  {...sectionProvided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                                  title="Drag to reorder section"
                                >
                                  <GripVertical className="w-3 h-3" />
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSections(prev => {
                                      const next = new Set(prev);
                                      if (next.has(sec.id)) {
                                        next.delete(sec.id);
                                      } else {
                                        next.add(sec.id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="p-0.5 hover:bg-background/20 rounded transition-colors"
                                  title={expandedSections.has(sec.id) ? "Collapse section" : "Expand section"}
                                >
                                  {expandedSections.has(sec.id) ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                                <div className={cn('w-3 h-3 rounded-full', colors.bg)} />
                                <span className="text-xs font-medium">{sec.name}</span>
                                <span className="text-[10px] text-muted-foreground">({sectionCards.length})</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {onEditSection && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSectionId(sec.id);
                                      setEditingSectionName(sec.name);
                                      setEditingSectionColor(sec.color as any);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/20 rounded hover:text-primary"
                                    title="Edit section"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteSectionId(sec.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded hover:text-destructive"
                                  title="Delete section"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              {headerProvided.placeholder}
                            </div>
                          )}
                        </Droppable>
                {/* Content area as separate droppable - only show if expanded */}
                {expandedSections.has(sec.id) && (
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
                )}
                {/* Show rounded bottom border when collapsed */}
                {!expandedSections.has(sec.id) && (
                  <div className="rounded-b-lg border-b border-l border-r bg-card/60 min-h-[4px]" />
                )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {sectionsProvided.placeholder}

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
                  {uniqueCards.filter(c => !c.sectionId).map((card, index) => (
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
        </Droppable>
      )}

      {/* Edit Section Dialog */}
      {onEditSection && (
        <Dialog open={editingSectionId !== null} onOpenChange={(open) => !open && setEditingSectionId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Section name</label>
                <Input 
                  value={editingSectionName} 
                  onChange={(e) => setEditingSectionName(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Section color</label>
                <Select value={editingSectionColor} onValueChange={(v) => setEditingSectionColor(v as any)}>
                  <SelectTrigger className="w-full">
                    <span style={{ pointerEvents: 'none' }}>
                      {(() => {
                        const colors = getStageColorClasses('new', editingSectionColor);
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
              <Button variant="outline" onClick={() => setEditingSectionId(null)}>Cancel</Button>
              <Button onClick={() => {
                if (editingSectionId && editingSectionName.trim()) {
                  onEditSection(lane.id, editingSectionId, editingSectionName.trim(), editingSectionColor);
                  setEditingSectionId(null);
                }
              }}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Section Confirmation Dialog */}
      <Dialog open={deleteSectionId !== null} onOpenChange={(open) => !open && setDeleteSectionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{lane.sections?.find(s => s.id === deleteSectionId)?.name}"? 
            All cards in this section will be moved to "No Section". This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSectionId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteSectionId) {
                  onDeleteSection(lane.id, deleteSectionId);
                  setDeleteSectionId(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Confirmation Dialog */}
      {onDeleteStage && (
        <Dialog open={deleteStageOpen} onOpenChange={setDeleteStageOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Column</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{lane.stage.name}"? 
              All cards in this column will be moved to the first available column. This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteStageOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  onDeleteStage(lane.id);
                  setDeleteStageOpen(false);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
