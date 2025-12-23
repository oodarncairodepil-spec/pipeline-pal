import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Instagram, Calendar, Phone, Globe, User, FileText, Upload,
  Clock, ArrowRight, MessageSquare, Paperclip, ExternalLink
} from 'lucide-react';
import { LeadCard, Stage, TeamMember, StageId } from '@/types/pipeline';
import { getRunningDays, formatRunningDays, formatFollowers, formatFileSize, getStageColorClasses } from '@/lib/pipeline-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from './MemberAvatar';
import { StageBadge } from './StageBadge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CardDetailPanelProps {
  card: LeadCard;
  stages: Stage[];
  teamMembers: TeamMember[];
  currentUser: TeamMember;
  onClose: () => void;
  onUpdate: (cardId: string, updates: Partial<LeadCard>) => void;
}

export function CardDetailPanel({
  card,
  stages,
  teamMembers,
  currentUser,
  onClose,
  onUpdate,
}: CardDetailPanelProps) {
  const [newNote, setNewNote] = useState('');
  const runningDays = getRunningDays(card.startDate);
  const currentStage = stages.find(s => s.id === card.stageId);
  const stageColors = getStageColorClasses(card.stageId);

  const handleTakeCard = () => {
    onUpdate(card.id, { assignedTo: currentUser });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      content: newNote,
      createdAt: new Date(),
      createdBy: currentUser,
    };
    onUpdate(card.id, {
      notes: [...card.notes, note],
      history: [
        ...card.history,
        {
          id: `hist-${Date.now()}`,
          type: 'note_added' as const,
          timestamp: new Date(),
          user: currentUser,
          details: { note: newNote },
        },
      ],
    });
    setNewNote('');
  };

  const handleStageChange = (stageId: string) => {
    const oldStage = currentStage?.name || 'Unknown';
    const newStage = stages.find(s => s.id === stageId)?.name || 'Unknown';
    onUpdate(card.id, {
      stageId: stageId as StageId,
      history: [
        ...card.history,
        {
          id: `hist-${Date.now()}`,
          type: 'stage_change' as const,
          timestamp: new Date(),
          user: currentUser,
          details: { from: oldStage, to: newStage },
        },
      ],
    });
  };

  const handleAssigneeChange = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    onUpdate(card.id, {
      assignedTo: member,
      history: [
        ...card.history,
        {
          id: `hist-${Date.now()}`,
          type: 'assignment_change' as const,
          timestamp: new Date(),
          user: currentUser,
          details: { to: member?.name || 'Unassigned' },
        },
      ],
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-modal z-50 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('px-6 py-4 border-b border-border flex items-start justify-between', stageColors.bgLight)}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StageBadge stageId={card.stageId} stageName={currentStage?.name || ''} />
              <span className="text-sm text-muted-foreground">
                {formatRunningDays(runningDays)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">{card.clientName}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 space-y-6">
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              {!card.assignedTo || card.assignedTo.id !== currentUser.id ? (
                <Button variant="default" size="sm" onClick={handleTakeCard}>
                  <User className="w-4 h-4" />
                  Take this card
                </Button>
              ) : (
                <Badge variant="stage-live" className="py-1">
                  <User className="w-3 h-3 mr-1" />
                  Assigned to you
                </Badge>
              )}
            </div>

            {/* Assignment & Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Assigned to
                </label>
                <Select
                  value={card.assignedTo?.id || 'unassigned'}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {card.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <MemberAvatar member={card.assignedTo} size="sm" />
                          <span>{card.assignedTo.name}</span>
                        </div>
                      ) : (
                        'Unassigned'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <MemberAvatar member={member} size="sm" />
                          <span>{member.name}</span>
                          {member.role === 'manager' && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Manager
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Stage
                </label>
                <Select value={card.stageId} onValueChange={handleStageChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <StageBadge stageId={card.stageId} stageName={currentStage?.name || ''} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <StageBadge stageId={stage.id} stageName={stage.name} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Client Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {card.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{card.instagram}</span>
                    {card.instagramFollowers && (
                      <Badge variant="secondary" className="text-[10px]">
                        {formatFollowers(card.instagramFollowers)}
                      </Badge>
                    )}
                  </div>
                )}
                {card.tiktok && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <span className="text-foreground">{card.tiktok}</span>
                    {card.tiktokFollowers && (
                      <Badge variant="secondary" className="text-[10px]">
                        {formatFollowers(card.tiktokFollowers)}
                      </Badge>
                    )}
                  </div>
                )}
                {card.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{card.phone}</span>
                  </div>
                )}
                {card.liveUrl && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={card.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {card.liveUrl.replace('https://', '')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    Started {format(card.startDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="tier">{card.subscriptionTier}</Badge>
                </div>
              </div>
            </div>

            {/* Add Note */}
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Add a note
              </h3>
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write a note about this lead..."
                  className="min-h-[80px] resize-none"
                />
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add note
                </Button>
              </div>
            </div>

            {/* Files */}
            {card.files.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  Files ({card.files.length})
                </h3>
                <div className="space-y-2">
                  {card.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {format(file.uploadedAt, 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop files here or click to upload
              </p>
            </div>

            {/* History/Timeline */}
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Activity
              </h3>
              <div className="space-y-4">
                {[...card.history].reverse().map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="relative">
                      <MemberAvatar member={event.user} size="sm" />
                      {index < card.history.length - 1 && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {event.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(event.timestamp, 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.type === 'card_created' && 'Created this card'}
                        {event.type === 'stage_change' && (
                          <span className="flex items-center gap-1">
                            Moved from <strong>{event.details.from}</strong>
                            <ArrowRight className="w-3 h-3" />
                            <strong>{event.details.to}</strong>
                          </span>
                        )}
                        {event.type === 'note_added' && (
                          <p className="bg-muted/50 rounded-lg p-2 mt-1 text-foreground">
                            {event.details.note}
                          </p>
                        )}
                        {event.type === 'assignment_change' && (
                          <span>
                            Assigned to <strong>{event.details.to}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
