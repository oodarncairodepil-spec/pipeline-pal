export const getSubscriptionTierObjects = (): { name: string; active: boolean }[] => {
  try {
    const raw = localStorage.getItem('subscriptionTiers');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const normalized: { name: string; active: boolean }[] = parsed
        .map((x: any) => {
          if (typeof x === 'string') return { name: x, active: true };
          if (x && typeof x.name === 'string') return { name: x.name, active: Boolean(x.active) };
          return null;
        })
        .filter((v: any) => v && v.name.trim().length > 0);
      // Deduplicate by name
      const seen = new Set<string>();
      const dedup = normalized.filter((t) => {
        const key = t.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (dedup.length > 0) return dedup;
    }
  } catch {}
  return [
    { name: 'Basic', active: true },
    { name: 'Pro', active: true },
    { name: 'Enterprise', active: true },
  ];
};

export const setSubscriptionTierObjects = (tiers: { name: string; active: boolean }[]) => {
  try {
    localStorage.setItem('subscriptionTiers', JSON.stringify(tiers));
  } catch {}
};

export const getSubscriptionTiers = (): string[] => {
  return getSubscriptionTierObjects()
    .filter((t) => t.active)
    .map((t) => t.name);
};

export const setSubscriptionTiers = (tiers: string[]) => {
  try {
    const objs = Array.isArray(tiers)
      ? tiers.filter((n) => typeof n === 'string' && n.trim().length > 0).map((n) => ({ name: n, active: true }))
      : [];
    localStorage.setItem('subscriptionTiers', JSON.stringify(objs));
  } catch {}
};

export const getTeamMembersOverrides = () => {
  try {
    const raw = localStorage.getItem('teamMembers');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [
    {
      id: 'invite-1',
      name: 'Rina',
      email: 'rina@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rina&backgroundColor=b6e3f4',
      role: 'staff',
      invitationStatus: 'sent',
      invitationSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'invite-2',
      name: 'Budi',
      email: 'budi@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi&backgroundColor=c0aede',
      role: 'manager',
      invitationStatus: 'sent',
      invitationSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export const setTeamMembersOverrides = (members: any[]) => {
  try {
    localStorage.setItem('teamMembers', JSON.stringify(members));
  } catch {}
};

export const getStagesOverrides = () => {
  try {
    const raw = localStorage.getItem('stages');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
};

export const setStagesOverrides = (stages: any[]) => {
  try {
    localStorage.setItem('stages', JSON.stringify(stages));
  } catch {}
};

export const getTags = (): string[] => {
  try {
    const raw = localStorage.getItem('tags');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((x: any) => (typeof x === 'string' ? x : ''))
        .filter((v: any) => typeof v === 'string' && v.trim().length > 0);
      if (normalized.length > 0) return normalized as string[];
    }
  } catch {}
  return ['VIP','Priority','Coffee','Ecommerce'];
};

export const setTags = (tags: string[]) => {
  try {
    const list = Array.from(new Set(tags.filter(t => typeof t === 'string' && t.trim().length > 0)));
    localStorage.setItem('tags', JSON.stringify(list));
  } catch {}
};

export const getActivityPhases = (): string[] => {
  try {
    const raw = localStorage.getItem('activityPhases');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((x: any) => (typeof x === 'string' ? x : ''))
        .filter((v: any) => typeof v === 'string' && v.trim().length > 0);
      if (normalized.length > 0) return normalized as string[];
    }
  } catch {}
  return ['Activity One', 'Activity Two'];
};

export const setActivityPhases = (phases: string[]) => {
  try {
    const list = Array.from(new Set(phases.filter(p => typeof p === 'string' && p.trim().length > 0)));
    localStorage.setItem('activityPhases', JSON.stringify(list));
  } catch {}
};

// Pipelines registry
export interface PipelineRef { id: string; name: string }
export interface UserNotification { id: string; cardId: string; clientName: string; note: string; timestamp: string; pipelineId: string }

export const getPipelines = (): PipelineRef[] => {
  try {
    const raw = localStorage.getItem('pipelines');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const normalized = parsed
        .map((x: any) => (x && typeof x.id === 'string' && typeof x.name === 'string' ? x : null))
        .filter(Boolean) as PipelineRef[];
      if (normalized.length > 0) {
        const ensure: PipelineRef[] = [{ id: 'default', name: 'Default' }, { id: 'retail', name: 'Retail' }, { id: 'fnb', name: 'Food & Beverage' }];
        const ids = new Set(normalized.map(p => p.id));
        const merged = [...normalized];
        ensure.forEach(p => { if (!ids.has(p.id)) merged.push(p); });
        try { localStorage.setItem('pipelines', JSON.stringify(merged)); } catch {}
        return merged;
      }
    }
  } catch {}
  const defaults = [
    { id: 'default', name: 'Default' },
    { id: 'retail', name: 'Retail' },
    { id: 'fnb', name: 'Food & Beverage' },
  ];
  try { localStorage.setItem('pipelines', JSON.stringify(defaults)); } catch {}
  return defaults;
};

export const setPipelines = (pipelines: PipelineRef[]) => {
  try {
    const list = Array.from(new Set(pipelines.map(p => p.id))).length === pipelines.length
      ? pipelines
      : pipelines.reduce((acc: PipelineRef[], p) => (acc.find(x => x.id === p.id) ? acc : acc.concat(p)), []);
    localStorage.setItem('pipelines', JSON.stringify(list));
  } catch {}
};

// Pipeline-scoped helpers
const k = (id: string, key: string) => `pipeline:${id}:${key}`;

export const getPipelineStages = (pipelineId: string) => {
  try {
    const raw = localStorage.getItem(k(pipelineId, 'stages'));
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const defaults = getDefaultStagesForPipeline(pipelineId);
  return defaults;
};

export const setPipelineStages = (pipelineId: string, stages: any[]) => {
  try { localStorage.setItem(k(pipelineId, 'stages'), JSON.stringify(stages)); } catch {}
};

export const getPipelineMembers = (pipelineId: string) => {
  try {
    const raw = localStorage.getItem(k(pipelineId, 'members'));
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
};

export const setPipelineMembers = (pipelineId: string, members: any[]) => {
  try { localStorage.setItem(k(pipelineId, 'members'), JSON.stringify(members)); } catch {}
};

export const getPipelineActivityPhases = (pipelineId: string): string[] => {
  try {
    const raw = localStorage.getItem(k(pipelineId, 'phases'));
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((x: any) => (typeof x === 'string' ? x : ''))
        .filter((v: any) => typeof v === 'string' && v.trim().length > 0);
      if (normalized.length > 0) return normalized as string[];
    }
  } catch {}
  return getDefaultPhasesForPipeline(pipelineId);
};

export const setPipelineActivityPhases = (pipelineId: string, phases: string[]) => {
  try {
    const list = Array.from(new Set(phases.filter(p => typeof p === 'string' && p.trim().length > 0)));
    localStorage.setItem(k(pipelineId, 'phases'), JSON.stringify(list));
  } catch {}
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('currentUser');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.id === 'string') return parsed;
  } catch {}
  const fallback = { id: 'alex', name: 'Alex', email: 'alex@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4', role: 'manager' };
  try { localStorage.setItem('currentUser', JSON.stringify(fallback)); } catch {}
  return fallback;
};

export const setCurrentUser = (user: any) => {
  try { localStorage.setItem('currentUser', JSON.stringify(user)); } catch {}
};

export const getNotificationsForUser = (userId: string): UserNotification[] => {
  try {
    const raw = localStorage.getItem(`notifications:${userId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const seed: UserNotification[] = [
    { id: `n-${Date.now()}`, cardId: 'card-1', clientName: 'Bakery Aja', note: '@Alex please review', timestamp: new Date().toISOString(), pipelineId: 'default' },
  ];
  try { localStorage.setItem(`notifications:${userId}`, JSON.stringify(seed)); } catch {}
  return seed;
};

export const pushNotificationForUser = (userId: string, notification: UserNotification) => {
  try {
    const list = getNotificationsForUser(userId);
    const next = [notification, ...list].slice(0, 200);
    localStorage.setItem(`notifications:${userId}`, JSON.stringify(next));
  } catch {}
};

const getDefaultStagesForPipeline = (pipelineId: string) => {
  if (pipelineId === 'retail') {
    return [
      { id: 'prospect', name: 'Prospect', color: 'stage-indigo', order: 0 },
      { id: 'demo', name: 'Demo', color: 'stage-teal', order: 1 },
      { id: 'negotiation', name: 'Negotiation', color: 'stage-orange', order: 2 },
      { id: 'won', name: 'Won', color: 'stage-live', order: 3 },
      { id: 'lost', name: 'Lost', color: 'stage-lost', order: 4 },
    ];
  }
  if (pipelineId === 'fnb') {
    return [
      { id: 'lead', name: 'Lead', color: 'stage-purple', order: 0 },
      { id: 'trial', name: 'Trial', color: 'stage-called', order: 1 },
      { id: 'onboard', name: 'Onboard', color: 'stage-onboard', order: 2 },
      { id: 'live', name: 'Live', color: 'stage-live', order: 3 },
      { id: 'churn', name: 'Churn', color: 'stage-pink', order: 4 },
    ];
  }
  return [
    { id: 'new', name: 'New', color: 'stage-new', order: 0 },
    { id: 'called', name: 'Called', color: 'stage-called', order: 1 },
    { id: 'onboard', name: 'Onboard', color: 'stage-onboard', order: 2 },
    { id: 'live', name: 'Live', color: 'stage-live', order: 3 },
    { id: 'lost', name: 'Lost', color: 'stage-lost', order: 4 },
  ];
};

const getDefaultPhasesForPipeline = (pipelineId: string): string[] => {
  if (pipelineId === 'retail') {
    return ['Discovery', 'Demo', 'Quote', 'Negotiation', 'Close'];
  }
  if (pipelineId === 'fnb') {
    return ['Tasting', 'Menu Setup', 'Kitchen Onboarding', 'Go Live'];
  }
  return ['Activity One', 'Activity Two'];
};
