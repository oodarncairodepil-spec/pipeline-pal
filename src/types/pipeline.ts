export type StageId = string;

export interface Stage {
  id: StageId;
  name: string;
  color: string;
  order: number;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: 'manager' | 'staff';
  email?: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: TeamMember;
}

export interface HistoryEvent {
  id: string;
  type: 'stage_change' | 'assignment_change' | 'note_added' | 'file_added' | 'card_created' | 'tier_change' | 'activity_phase_change';
  timestamp: Date;
  user: TeamMember;
  details: {
    from?: string;
    to?: string;
    note?: string;
    fileName?: string;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'other';
  size: number;
  uploadedAt: Date;
  uploadedBy: TeamMember;
}

export type SubscriptionTier = string;

export interface LeadCard {
  id: string;
  clientName: string;
  instagram?: string;
  tiktok?: string;
  tokopedia?: string;
  shopee?: string;
  phone?: string;
  subscriptionTier: SubscriptionTier;
  liveUrl?: string;
  instagramFollowers?: number;
  tiktokFollowers?: number;
  tokopediaFollowers?: number;
  shopeeFollowers?: number;
  startDate: Date;
  liveDateTarget?: Date;
  stageId: StageId;
  assignedTo?: TeamMember;
  collaborators?: TeamMember[];
  activityPhase?: string;
  tags?: string[];
  dealValue?: number;
  notes: Note[];
  history: HistoryEvent[];
  files: FileAttachment[];
  watchers?: string[];
  sectionId?: string;
}

export interface Lane {
  id: StageId;
  stage: Stage;
  cardIds: string[];
  sections?: { id: string; name: string; color: string; cardIds: string[] }[];
}

export interface BoardState {
  lanes: Lane[];
  cards: Record<string, LeadCard>;
  stages: Stage[];
  teamMembers: TeamMember[];
}
