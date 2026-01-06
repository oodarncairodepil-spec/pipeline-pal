import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Instagram, Calendar, Phone, Globe, User, FileText, Upload,
  Clock, ArrowRight, MessageSquare, Paperclip, ExternalLink, Trash2
} from 'lucide-react';
import { LeadCard, Stage, TeamMember, StageId, FileAttachment } from '@/types/pipeline';
import { getRunningDays, formatRunningDays, formatFollowers, formatFileSize, getStageColorClasses } from '@/lib/pipeline-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from './MemberAvatar';
import { StageBadge } from './StageBadge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { getTags, setTags, getPipelineActivityPhases, pushNotificationForUser } from '@/lib/settings';
import { useParams, useLocation } from 'react-router-dom';
import { getSubscriptionTiers } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CardDetailPanelProps {
  card: LeadCard;
  stages: Stage[];
  teamMembers: TeamMember[];
  currentUser: TeamMember;
  onClose: () => void;
  onUpdate: (cardId: string, updates: Partial<LeadCard>) => void;
  onSave?: (card: LeadCard) => void;
  onDelete?: (cardId: string) => void;
  isDraft?: boolean;
  sectionsByStage?: Record<string, { id: string; name: string; color: string }[]>;
  existingClientNames?: string[];
}

export function CardDetailPanel({
  card,
  stages,
  teamMembers,
  currentUser,
  onClose,
  onUpdate,
  onSave,
  onDelete,
  isDraft = false,
  sectionsByStage,
  existingClientNames = [],
}: CardDetailPanelProps) {
  const { pipelineId = 'default' } = useParams();
  const [newNote, setNewNote] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [clientNameOpen, setClientNameOpen] = useState(false);
  const [clientNameSearch, setClientNameSearch] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activityPhases, setActivityPhases] = useState<string[]>([]);
  const [subscriptionTiers, setSubscriptionTiers] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Load tags, activity phases, and subscription tiers
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tags, phases, tiers] = await Promise.all([
          getTags(),
          getPipelineActivityPhases(pipelineId),
          getSubscriptionTiers(),
        ]);
        setAllTags(tags);
        setActivityPhases(phases);
        setSubscriptionTiers(tiers);
      } catch (error) {
        console.error('Error loading tags/phases/tiers:', error);
        // Set defaults
        setAllTags(['VIP', 'Priority', 'Coffee', 'Ecommerce']);
        setActivityPhases([]);
        setSubscriptionTiers(['Basic', 'Pro', 'Enterprise']);
      }
    };
    loadData();
  }, [pipelineId]);

  const tagSuggestions = allTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).filter(t => !(card.tags || []).includes(t)).slice(0, 5);
  const [dealInput, setDealInput] = useState<string>(() => (card.dealValue ?? 0).toLocaleString());
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionOptions, setMentionOptions] = useState<TeamMember[]>([]);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const renderNoteWithMentions = (text: string) => {
    const nodes: any[] = [];
    let idx = 0;
    const regex = /@([A-Za-z0-9._-]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      const before = text.slice(idx, match.index);
      if (before) nodes.push(before);
      const token = match[1];
      const member = teamMembers.find(m => m.name.toLowerCase() === token.toLowerCase() || ((m.email || '').split('@')[0].toLowerCase() === token.toLowerCase()));
      nodes.push(
        <span key={`m-${match.index}`} className="text-primary font-semibold">
          @{member ? member.name : token}
        </span>
      );
      idx = match.index + match[0].length;
    }
    const after = text.slice(idx);
    if (after) nodes.push(after);
    return nodes;
  };
  useEffect(() => {
    setDealInput((card.dealValue ?? 0).toLocaleString());
  }, [card.dealValue]);

  const handleActivityPhaseChange = (phase: string) => {
    const oldPhase = card.activityPhase || '';
    const newPhase = phase;
    onUpdate(card.id, {
      activityPhase: newPhase,
      history: [
        ...card.history,
        {
          id: uid(),
          type: 'activity_phase_change',
          timestamp: new Date(),
          user: currentUser,
          details: { from: oldPhase, to: newPhase },
        },
      ],
    });
  };
  const runningDays = getRunningDays(card.startDate);
  const currentStage = stages.find(s => s.id === card.stageId);
  const stageColors = getStageColorClasses(card.stageId, currentStage?.color as any);
  const availableSections = (sectionsByStage && sectionsByStage[card.stageId]) ? sectionsByStage[card.stageId] : [];
  const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const location = useLocation();
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [focusEventId, setFocusEventId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const noteParam = params.get('note');
    let targetId: string | null = null;
    if (noteParam) {
      const evt = card.history.find(e => e.type === 'note_added' && e.details && (e.details as any).note === noteParam);
      if (evt) targetId = evt.id;
    }
    if (!targetId) {
      const local = (currentUser.email || '').split('@')[0];
      const tokens = [currentUser.name, local].filter(Boolean).map(x => `@${String(x)}`.toLowerCase());
      const evt = card.history.find(e => e.type === 'note_added' && e.details && tokens.some(t => String((e.details as any).note || '').toLowerCase().includes(t)));
      if (evt) targetId = evt.id;
    }
    if (targetId) {
      setFocusEventId(targetId);
      const el = itemRefs.current[targetId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [location.search, card.history, currentUser]);

  const handleTakeCard = () => {
    onUpdate(card.id, {
      assignedTo: currentUser,
      history: [
        ...card.history,
        {
          id: uid(),
          type: 'assignment_change',
          timestamp: new Date(),
          user: currentUser,
          details: { to: currentUser.name },
        },
      ],
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim() && attachments.length === 0) return;
    const note = {
      id: uid(),
      content: newNote,
      createdAt: new Date(),
      createdBy: currentUser,
    };
    const getFileType = (file: File): 'image' | 'document' | 'other' => {
      if (file.type.startsWith('image/')) return 'image';
      if (file.type.includes('pdf') || file.type.includes('msword') || file.type.includes('officedocument')) return 'document';
      return 'other';
    };
    const newFiles = attachments.map((file) => ({
      id: uid(),
      name: file.name,
      url: URL.createObjectURL(file),
      type: getFileType(file),
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: currentUser,
    }));
    const historyItems = [
      newNote.trim()
        ? {
            id: uid(),
            type: 'note_added' as const,
            timestamp: new Date(),
            user: currentUser,
            details: { note: newNote },
          }
        : null,
      ...newFiles.map((f) => ({
        id: uid(),
        type: 'file_added' as const,
        timestamp: new Date(),
        user: currentUser,
        details: { fileName: f.name },
      })),
    ].filter(Boolean) as typeof card.history;
    onUpdate(card.id, {
      notes: newNote.trim() ? [...card.notes, note] : card.notes,
      files: [...card.files, ...newFiles],
      history: [...card.history, ...historyItems],
    });
    const mentionRegex = /@([A-Za-z0-9._-]+)/g;
    const mentioned: string[] = [];
    let m;
    while ((m = mentionRegex.exec(newNote))) mentioned.push(m[1].toLowerCase());
    if (mentioned.length > 0) {
      teamMembers.forEach(tm => {
        const local = (tm.email || '').split('@')[0].toLowerCase();
        if (mentioned.includes(tm.name.toLowerCase()) || (local && mentioned.includes(local))) {
          pushNotificationForUser(tm.id, { id: uid(), cardId: card.id, clientName: card.clientName || '', note: newNote, timestamp: new Date().toISOString(), pipelineId });
        }
      });
    }
    setNewNote('');
    setAttachments([]);
  };

  const handleStageChange = (stageId: string) => {
    const oldStage = currentStage?.name || 'Unknown';
    const newStage = stages.find(s => s.id === stageId)?.name || 'Unknown';
    onUpdate(card.id, {
      stageId: stageId as StageId,
      history: [
        ...card.history,
        {
          id: uid(),
          type: 'stage_change' as const,
          timestamp: new Date(),
          user: currentUser,
          details: { from: oldStage, to: newStage },
        },
      ],
    });
  };

  const handleTierChange = (tier: string) => {
    const oldTier = card.subscriptionTier;
    const newTier = tier;
    onUpdate(card.id, {
      subscriptionTier: newTier,
      history: [
        ...card.history,
        {
          id: uid(),
          type: 'tier_change',
          timestamp: new Date(),
          user: currentUser,
          details: { from: oldTier, to: newTier },
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
          id: uid(),
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
      <motion.div key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div key={`panel-${card.id}`}
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
            <h2 className="text-xl font-bold text-foreground">{card.clientName?.trim() || 'New Lead'}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 space-y-6">
            

            {/* Client Info */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Client Information
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">Started {format(card.startDate, 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
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
              </div>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                <label className="text-xs text-muted-foreground">
                  Client name <span className="text-destructive">*</span>
                </label>
                    <Popover open={clientNameOpen} onOpenChange={setClientNameOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                            !card.clientName 
                              ? "text-muted-foreground border-destructive focus:ring-destructive" 
                              : "border-input"
                          )}
                        >
                          {card.clientName || "Select or create client... *"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[244px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or create client..." 
                            value={clientNameSearch}
                            onValueChange={setClientNameSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-2">
                                <button
                                  type="button"
                                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                                  onClick={() => {
                                    if (clientNameSearch.trim()) {
                                      onUpdate(card.id, { clientName: clientNameSearch.trim() });
                                      setClientNameOpen(false);
                                      setClientNameSearch('');
                                    }
                                  }}
                                >
                                  Create "{clientNameSearch}"
                                </button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {existingClientNames
                                .filter(name => 
                                  name.toLowerCase().includes(clientNameSearch.toLowerCase()) &&
                                  name !== card.clientName
                                )
                                .map((name) => (
                                  <CommandItem
                                    key={name}
                                    value={name}
                                    onSelect={() => {
                                      onUpdate(card.id, { clientName: name });
                                      setClientNameOpen(false);
                                      setClientNameSearch('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        card.clientName === name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {name}
                                  </CommandItem>
                                ))}
                              {clientNameSearch.trim() && 
                               !existingClientNames.some(name => 
                                 name.toLowerCase() === clientNameSearch.toLowerCase()
                               ) && (
                                <CommandItem
                                  value={clientNameSearch}
                                  onSelect={() => {
                                    onUpdate(card.id, { clientName: clientNameSearch.trim() });
                                    setClientNameOpen(false);
                                    setClientNameSearch('');
                                  }}
                                >
                                  <Check className="mr-2 h-4 w-4 opacity-0" />
                                  Create "{clientNameSearch}"
                                </CommandItem>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <Input value={card.phone || ''} onChange={e => onUpdate(card.id, { phone: e.target.value || undefined })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Website</label>
                    <Input value={card.liveUrl || ''} onChange={e => onUpdate(card.id, { liveUrl: e.target.value || undefined })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Subscription Tier</label>
                    <Select value={card.subscriptionTier} onValueChange={handleTierChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={card.subscriptionTier || 'Select tier'} />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionTiers.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Value</label>
                    <Input
                      type="text"
                      value={dealInput}
                      onFocus={() => { if (dealInput === '0') setDealInput(''); }}
                      onBlur={() => { if (!dealInput) setDealInput('0'); }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        const formatted = raw ? Number(raw).toLocaleString() : '';
                        setDealInput(formatted);
                        onUpdate(card.id, { dealValue: raw ? Number(raw) : undefined });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Instagram</label>
                    <div className="flex items-center gap-1">
                    <Input value={card.instagram || ''} onChange={e => onUpdate(card.id, { instagram: e.target.value || undefined })} />
                      {card.instagram && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = card.instagram?.startsWith('http') ? card.instagram : `https://www.instagram.com/${card.instagram.replace(/^@/, '')}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex items-center justify-center w-10 h-10 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                          title="Open Instagram link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Instagram followers</label>
                    <Input type="number" value={card.instagramFollowers ?? 0} onChange={e => onUpdate(card.id, { instagramFollowers: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">TikTok</label>
                    <div className="flex items-center gap-1">
                    <Input value={card.tiktok || ''} onChange={e => onUpdate(card.id, { tiktok: e.target.value || undefined })} />
                      {card.tiktok && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = card.tiktok?.startsWith('http') ? card.tiktok : `https://www.tiktok.com/${card.tiktok.startsWith('@') ? card.tiktok : `@${card.tiktok}`}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex items-center justify-center w-10 h-10 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                          title="Open TikTok link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">TikTok followers</label>
                    <Input type="number" value={card.tiktokFollowers ?? 0} onChange={e => onUpdate(card.id, { tiktokFollowers: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Tokopedia</label>
                    <div className="flex items-center gap-1">
                    <Input value={card.tokopedia || ''} onChange={e => onUpdate(card.id, { tokopedia: e.target.value || undefined })} />
                      {card.tokopedia && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = card.tokopedia?.startsWith('http') ? card.tokopedia : `https://www.tokopedia.com/${card.tokopedia}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex items-center justify-center w-10 h-10 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                          title="Open Tokopedia link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Tokopedia followers</label>
                    <Input type="number" value={card.tokopediaFollowers ?? 0} onChange={e => onUpdate(card.id, { tokopediaFollowers: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Shopee</label>
                    <div className="flex items-center gap-1">
                    <Input value={card.shopee || ''} onChange={e => onUpdate(card.id, { shopee: e.target.value || undefined })} />
                      {card.shopee && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const url = card.shopee?.startsWith('http') ? card.shopee : `https://shopee.co.id/${card.shopee}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex items-center justify-center w-10 h-10 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                          title="Open Shopee link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Shopee followers</label>
                    <Input type="number" value={card.shopeeFollowers ?? 0} onChange={e => onUpdate(card.id, { shopeeFollowers: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
              </div>
            </div>
            <Dialog open={!!previewFile} onOpenChange={(open) => { if (!open) setPreviewFile(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{previewFile?.name}</DialogTitle>
                </DialogHeader>
                {previewFile && (
                  <div className="space-y-3">
                    {previewFile.type === 'image' && (
                      <img src={previewFile.url} alt={previewFile.name} className="max-h-[70vh] w-auto" />
                    )}
                    {previewFile.type === 'document' && (
                      <iframe src={previewFile.url} className="w-full h-[70vh]" />
                    )}
                    {previewFile.type === 'other' && (
                      <a href={previewFile.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Open in new tab
                      </a>
                    )}
                    <div className="flex justify-end">
                      <a href={previewFile.url} download className="inline-flex items-center rounded-md border px-3 py-2 text-sm">
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            

            {/* Assignment & Stage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Assigned to
                </label>
                <Select value={card.assignedTo?.id || 'unassigned'} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={card.assignedTo?.name || 'Unassigned'} />
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
                    <SelectValue placeholder={currentStage?.name || 'Select stage'} />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <StageBadge stageId={stage.id} stageName={stage.name} variant={stage.color as any} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Section
                </label>
                <Select value={card.sectionId || 'none'} onValueChange={(v) => onUpdate(card.id, { sectionId: v === 'none' ? undefined : v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={card.sectionId ? (availableSections.find(s => s.id === card.sectionId)?.name || 'Section') : 'None'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableSections.map(sec => {
                      const colors = getStageColorClasses('new', sec.color as any);
                      return (
                        <SelectItem key={sec.id} value={sec.id}>
                          <div className={cn('flex items-center gap-2 rounded-md px-2 py-1', colors.bgLight, colors.text)}>
                            <div className={cn('w-4 h-4 rounded-full', colors.bg)} />
                            <span>{sec.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">Started {format(card.startDate, 'MMM d, yyyy')}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Collaborators
                </label>
                <div className="space-y-2">
                  {teamMembers.map(m => {
                    const checked = (card.collaborators || []).some(c => c.id === m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-2">
                        <Checkbox checked={checked} onCheckedChange={(v) => {
                          const isChecked = Boolean(v);
                          const next = isChecked
                            ? [...(card.collaborators || []), m]
                            : (card.collaborators || []).filter(c => c.id !== m.id);
                          const names = next.map(x => x.name).join(', ');
                          onUpdate(card.id, {
                            collaborators: next,
                            history: [
                              ...card.history,
                              {
                                id: uid(),
                                type: 'assignment_change',
                                timestamp: new Date(),
                                user: currentUser,
                                details: { to: names },
                              },
                            ],
                          });
                        }} />
                        <MemberAvatar member={m} size="sm" />
                        <span className="text-sm">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Activity Phase</label>
                <Select value={card.activityPhase || ''} onValueChange={handleActivityPhaseChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={card.activityPhase || 'Select activity phase'} />
                  </SelectTrigger>
                  <SelectContent>
                    {activityPhases.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</label>
              <div className="flex items-center gap-2 flex-wrap">
                {(card.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] flex items-center gap-1">
                    {tag}
                    <button
                      className="ml-1 text-muted-foreground"
                      onClick={() => {
                        const next = (card.tags || []).filter(t => t !== tag);
                        onUpdate(card.id, { tags: next });
                      }}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="relative">
                <Input
                  placeholder="Add or search tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const name = tagInput.trim();
                      if (!name) return;
                      const exists = (card.tags || []).includes(name);
                      const next = exists ? (card.tags || []) : [ ...(card.tags || []), name ];
                      onUpdate(card.id, { tags: next });
                      if (!allTags.includes(name)) {
                        const updatedTags = [...allTags, name];
                        setAllTags(updatedTags);
                        setTags(updatedTags).catch(console.error);
                      }
                      setTagInput('');
                    }
                  }}
                />
                {tagInput && tagSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-card">
                    {tagSuggestions.map(s => (
                      <button
                        key={s}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
                        onClick={() => {
                          const next = [ ...(card.tags || []), s ];
                          onUpdate(card.id, { tags: next });
                          setTagInput('');
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save Button and Delete Button */}
            <div className="flex justify-between items-center">
              {!isDraft && onDelete && (
                <Button 
                  variant="destructive"
                  size="sm" 
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className={!isDraft && onDelete ? '' : 'ml-auto'}>
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (!card.clientName || !card.clientName.trim()) {
                      // Show error or prevent save
                      return;
                    }
                    if (onSave) {
                      onSave(card);
                    } else {
                      onClose();
                    }
                  }}
                  disabled={!card.clientName || !card.clientName.trim()}
                >
                  Save
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
                        <button
                          className="text-sm font-medium text-primary hover:underline truncate"
                          onClick={() => setPreviewFile(file)}
                        >
                          {file.name}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {format(file.uploadedAt, 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            

            {/* History/Timeline */}
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Activity
              </h3>
              <div className="mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Add a note
                </h3>
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute inset-0 pointer-events-none px-3 py-2 text-sm whitespace-pre-wrap">
                      {renderNoteWithMentions(newNote)}
                    </div>
                    <Textarea
                      ref={noteRef}
                      value={newNote}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewNote(val);
                        const cursor = e.target.selectionStart ?? val.length;
                        let start = cursor - 1;
                        while (start >= 0 && !/\s/.test(val[start])) start--;
                        const token = val.slice(start + 1, cursor);
                        if (token.startsWith('@')) {
                          const q = token.slice(1).toLowerCase();
                          const source = teamMembers;
                          const opts = q
                            ? source.filter(m => (m.name.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)))
                            : source;
                          setMentionOptions(opts.slice(0, 6));
                          setMentionQuery(q);
                          setMentionOpen(opts.length > 0);
                        } else {
                          setMentionOpen(false);
                          setMentionQuery('');
                        }
                      }}
                      placeholder="Write a note about this lead..."
                      className="min-h-[80px] resize-none bg-transparent text-transparent"
                      style={{ caretColor: 'hsl(var(--foreground))' }}
                    />
                    {mentionOpen && mentionOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-card">
                        {mentionOptions.map(m => (
                          <button
                            key={m.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                            onClick={() => {
                              const val = newNote;
                              const cursor = (noteRef.current?.selectionStart ?? val.length);
                              let start = cursor - 1;
                              while (start >= 0 && !/\s/.test(val[start])) start--;
                              const before = val.slice(0, start + 1);
                              const after = val.slice(cursor);
                              const insert = `@${m.name} `;
                              const next = `${before}${insert}${after}`;
                              setNewNote(next);
                              setMentionOpen(false);
                              setMentionQuery('');
                            }}
                          >
                            <MemberAvatar member={m} size="sm" />
                            <span>{m.name}</span>
                            {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setAttachments(files);
                    }} />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Attach files
                    </Button>
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() && attachments.length === 0}>
                      Add note
                    </Button>
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((f) => (
                        <Badge key={f.name} variant="secondary" className="text-[10px]">
                          {f.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {[...card.history].reverse().map((event, index) => (
                  <div
                    key={event.id}
                    ref={(el) => { itemRefs.current[event.id] = el; }}
                    className={cn("flex gap-3", focusEventId === event.id ? "ring-2 ring-primary rounded-md" : "")}
                  >
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
                            {renderNoteWithMentions(event.details.note)}
                          </p>
                        )}
                        {event.type === 'assignment_change' && (
                          <span>
                            Assigned to <strong>{event.details.to}</strong>
                          </span>
                        )}
                        {event.type === 'file_added' && (
                          <span>
                            Added file <strong>{event.details.fileName}</strong>
                          </span>
                        )}
                        {event.type === 'tier_change' && (
                          <span className="flex items-center gap-1">
                            Subscription tier <strong>{event.details.from}</strong>
                            <ArrowRight className="w-3 h-3" />
                            <strong>{event.details.to}</strong>
                          </span>
                        )}
                        {event.type === 'activity_phase_change' && (
                          <span className="flex items-center gap-1">
                            Activity phase <strong>{event.details.from || 'None'}</strong>
                            <ArrowRight className="w-3 h-3" />
                            <strong>{event.details.to}</strong>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Card</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{card.clientName}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (onDelete) {
                  onDelete(card.id);
                  setDeleteConfirmOpen(false);
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}
