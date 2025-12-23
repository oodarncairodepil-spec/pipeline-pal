export type StageId = 'new' | 'called' | 'onboard' | 'live' | 'lost';

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
}

export interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: TeamMember;
}

export interface HistoryEvent {
  id: string;
  type: 'stage_change' | 'assignment_change' | 'note_added' | 'file_added' | 'card_created';
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

export type SubscriptionTier = 'Basic' | 'Pro' | 'Enterprise';

export interface LeadCard {
  id: string;
  clientName: string;
  instagram?: string;
  tiktok?: string;
  phone?: string;
  subscriptionTier: SubscriptionTier;
  liveUrl?: string;
  instagramFollowers?: number;
  tiktokFollowers?: number;
  startDate: Date;
  stageId: StageId;
  assignedTo?: TeamMember;
  notes: Note[];
  history: HistoryEvent[];
  files: FileAttachment[];
}

export interface Lane {
  id: StageId;
  stage: Stage;
  cardIds: string[];
}

export interface BoardState {
  lanes: Lane[];
  cards: Record<string, LeadCard>;
  stages: Stage[];
  teamMembers: TeamMember[];
}
