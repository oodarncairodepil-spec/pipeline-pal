import { BoardState, Stage, TeamMember, LeadCard, Lane, StageId } from '@/types/pipeline';
import { getPipelineMembers, getPipelineStages } from '@/lib/settings';

export const stages: Stage[] = [
  { id: 'new', name: 'New', color: 'stage-new', order: 0 },
  { id: 'called', name: 'Called', color: 'stage-called', order: 1 },
  { id: 'onboard', name: 'Onboard', color: 'stage-onboard', order: 2 },
  { id: 'live', name: 'Live', color: 'stage-live', order: 3 },
  { id: 'lost', name: 'Lost', color: 'stage-lost', order: 4 },
];

export const teamMembers: TeamMember[] = [
  {
    id: 'alex',
    name: 'Alex',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4',
    role: 'manager',
    email: 'alex@example.com',
  },
  {
    id: 'jamie',
    name: 'Jamie',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie&backgroundColor=c0aede',
    role: 'staff',
    email: 'jamie@example.com',
  },
  {
    id: 'taylor',
    name: 'Taylor',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor&backgroundColor=ffd5dc',
    role: 'staff',
    email: 'taylor@example.com',
  },
];

export const mockCards: Record<string, LeadCard> = {
  'card-1': {
    id: 'card-1',
    clientName: 'Bakery Aja',
    instagram: '@bakeryaja',
    tiktok: '@bakeryaja.id',
    phone: '+62 812-3456-7890',
    subscriptionTier: 'Pro',
    dealValue: 15000000,
    liveUrl: 'https://bakeryaja.id',
    instagramFollowers: 12500,
    tiktokFollowers: 8200,
    startDate: new Date('2025-12-10'),
    stageId: 'called',
    assignedTo: teamMembers[1], // Jamie
    notes: [
      {
        id: 'note-1',
        content: 'Initial call done, interested in Pro tier.',
        createdAt: new Date('2025-12-10T10:30:00'),
        createdBy: teamMembers[1],
      },
      {
        id: 'note-2',
        content: 'Sent proposal, waiting for reply.',
        createdAt: new Date('2025-12-12T14:15:00'),
        createdBy: teamMembers[1],
      },
    ],
    history: [
      {
        id: 'hist-1',
        type: 'card_created',
        timestamp: new Date('2025-12-10T09:00:00'),
        user: teamMembers[0],
        details: {},
      },
      {
        id: 'hist-2',
        type: 'stage_change',
        timestamp: new Date('2025-12-10T10:30:00'),
        user: teamMembers[1],
        details: { from: 'New', to: 'Called' },
      },
      {
        id: 'hist-3',
        type: 'note_added',
        timestamp: new Date('2025-12-10T10:30:00'),
        user: teamMembers[1],
        details: { note: 'Initial call done, interested in Pro tier.' },
      },
    ],
    files: [
      {
        id: 'file-1',
        name: 'proposal_bakeryaja.pdf',
        url: '#',
        type: 'document',
        size: 245000,
        uploadedAt: new Date('2025-12-12T14:00:00'),
        uploadedBy: teamMembers[1],
      },
      {
        id: 'file-2',
        name: 'logo_bakeryaja.png',
        url: '#',
        type: 'image',
        size: 85000,
        uploadedAt: new Date('2025-12-10T09:30:00'),
        uploadedBy: teamMembers[0],
      },
    ],
  },
  'card-2': {
    id: 'card-2',
    clientName: 'Kopi Kita',
    instagram: '@kopikita',
    tiktok: '@kopikita.id',
    phone: '+62 812-9876-5432',
    subscriptionTier: 'Basic',
    dealValue: 10000000,
    liveUrl: 'https://kopikita.id',
    instagramFollowers: 5300,
    tiktokFollowers: 3100,
    startDate: new Date('2025-12-18'),
    stageId: 'new',
    assignedTo: teamMembers[2], // Taylor
    notes: [
      {
        id: 'note-3',
        content: 'Lead captured from Instagram DM.',
        createdAt: new Date('2025-12-18T11:00:00'),
        createdBy: teamMembers[2],
      },
      {
        id: 'note-4',
        content: 'First follow-up message sent.',
        createdAt: new Date('2025-12-19T09:30:00'),
        createdBy: teamMembers[2],
      },
    ],
    history: [
      {
        id: 'hist-4',
        type: 'card_created',
        timestamp: new Date('2025-12-18T11:00:00'),
        user: teamMembers[2],
        details: {},
      },
      {
        id: 'hist-5',
        type: 'note_added',
        timestamp: new Date('2025-12-18T11:00:00'),
        user: teamMembers[2],
        details: { note: 'Lead captured from Instagram DM.' },
      },
    ],
    files: [
      {
        id: 'file-3',
        name: 'logo_kopikita.png',
        url: '#',
        type: 'image',
        size: 72000,
        uploadedAt: new Date('2025-12-18T11:05:00'),
        uploadedBy: teamMembers[2],
      },
    ],
  },
  'card-3': {
    id: 'card-3',
    clientName: 'Warung Nasi Sedap',
    instagram: '@warungnasisedap',
    tiktok: '@nasisedap.id',
    phone: '+62 813-5555-1234',
    subscriptionTier: 'Enterprise',
    dealValue: 50000000,
    liveUrl: 'https://warungnasisedap.com',
    instagramFollowers: 45000,
    tiktokFollowers: 32000,
    startDate: new Date('2025-11-15'),
    stageId: 'live',
    assignedTo: teamMembers[0], // Alex
    notes: [
      {
        id: 'note-5',
        content: 'Successfully onboarded, site is now live!',
        createdAt: new Date('2025-12-01T16:00:00'),
        createdBy: teamMembers[0],
      },
    ],
    history: [
      {
        id: 'hist-6',
        type: 'card_created',
        timestamp: new Date('2025-11-15T10:00:00'),
        user: teamMembers[0],
        details: {},
      },
      {
        id: 'hist-7',
        type: 'stage_change',
        timestamp: new Date('2025-12-01T16:00:00'),
        user: teamMembers[0],
        details: { from: 'Onboard', to: 'Live' },
      },
    ],
    files: [],
  },
  'card-4': {
    id: 'card-4',
    clientName: 'Toko Baju Modern',
    instagram: '@tokobajumodern',
    tiktok: '@tokobaju',
    tokopedia: '@tokobaju.stores',
    shopee: '@tokobaju.shop',
    phone: '+62 811-2222-3333',
    subscriptionTier: 'Basic',
    dealValue: 7000000,
    instagramFollowers: 24800,
    tiktokFollowers: 99900,
    tokopediaFollowers: 178000,
    shopeeFollowers: 25300,
    startDate: new Date('2025-12-20'),
    stageId: 'new',
    notes: [],
    history: [
      {
        id: 'hist-8',
        type: 'card_created',
        timestamp: new Date('2025-12-20T14:00:00'),
        user: teamMembers[1],
        details: {},
      },
    ],
    files: [],
  },
  'card-5': {
    id: 'card-5',
    clientName: 'Salon Cantik',
    instagram: '@saloncantik.id',
    tiktok: '@saloncantik',
    phone: '+62 812-7777-8888',
    subscriptionTier: 'Pro',
    dealValue: 12000000,
    instagramFollowers: 8900,
    tiktokFollowers: 5600,
    startDate: new Date('2025-12-05'),
    stageId: 'onboard',
    assignedTo: teamMembers[1], // Jamie
    notes: [
      {
        id: 'note-6',
        content: 'Contract signed, starting onboarding process.',
        createdAt: new Date('2025-12-15T11:00:00'),
        createdBy: teamMembers[1],
      },
    ],
    history: [
      {
        id: 'hist-9',
        type: 'card_created',
        timestamp: new Date('2025-12-05T09:00:00'),
        user: teamMembers[1],
        details: {},
      },
      {
        id: 'hist-10',
        type: 'stage_change',
        timestamp: new Date('2025-12-15T11:00:00'),
        user: teamMembers[1],
        details: { from: 'Called', to: 'Onboard' },
      },
    ],
    files: [],
  },
  'card-6': {
    id: 'card-6',
    clientName: 'Gym Sehat',
    instagram: '@gymsehat',
    phone: '+62 815-9999-0000',
    subscriptionTier: 'Pro',
    dealValue: 0,
    instagramFollowers: 15200,
    startDate: new Date('2025-11-20'),
    stageId: 'lost',
    notes: [
      {
        id: 'note-7',
        content: 'Client decided to go with competitor. Budget constraints.',
        createdAt: new Date('2025-12-10T15:00:00'),
        createdBy: teamMembers[0],
      },
    ],
    history: [
      {
        id: 'hist-11',
        type: 'card_created',
        timestamp: new Date('2025-11-20T10:00:00'),
        user: teamMembers[0],
        details: {},
      },
      {
        id: 'hist-12',
        type: 'stage_change',
        timestamp: new Date('2025-12-10T15:00:00'),
        user: teamMembers[0],
        details: { from: 'Onboard', to: 'Lost' },
      },
    ],
    files: [],
  },
};

export const lanes: Lane[] = [
  { id: 'new', stage: stages[0], cardIds: ['card-2', 'card-4'] },
  { id: 'called', stage: stages[1], cardIds: ['card-1'] },
  { id: 'onboard', stage: stages[2], cardIds: ['card-5'] },
  { id: 'live', stage: stages[3], cardIds: ['card-3'] },
  { id: 'lost', stage: stages[4], cardIds: ['card-6'] },
];

export const loadInitialBoardState = (pipelineId: string = 'default'): BoardState => {
  const stageOverrides = getPipelineStages(pipelineId);
  let finalStages: Stage[] = [...stages];
  if (Array.isArray(stageOverrides) && stageOverrides.length > 0) {
    const map = new Map<string, Stage>();
    finalStages.forEach(s => map.set(s.id, s));
    let addCount = 0;
    const maxOrder = finalStages.reduce((m, s) => Math.max(m, s.order || 0), 0);
    stageOverrides.forEach((o: any) => {
      if (o && o.id && o.name) {
        const existing = map.get(o.id as StageId);
        if (existing) {
          map.set(o.id, { ...existing, name: o.name, color: o.color || existing.color });
        } else {
          const newStage: Stage = {
            id: o.id as StageId,
            name: o.name as string,
            color: (o.color as string) || 'stage-new',
            order: typeof o.order === 'number' ? o.order : maxOrder + (++addCount),
          };
          map.set(newStage.id, newStage);
        }
      }
    });
    finalStages = Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  const teamOverrides = getPipelineMembers(pipelineId);
  const finalTeam: TeamMember[] = Array.isArray(teamOverrides) && teamOverrides.length > 0
    ? teamOverrides as any
    : teamMembers;

  const computedLanes: Lane[] = finalStages.map(s => ({
    id: s.id,
    stage: s,
    cardIds: Object.values(mockCards).filter(c => c.stageId === s.id).map(c => c.id),
    sections: [],
  }));

  return {
    lanes: computedLanes,
    cards: mockCards,
    stages: finalStages,
    teamMembers: finalTeam,
  };
};
