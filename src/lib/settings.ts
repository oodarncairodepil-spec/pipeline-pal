// Re-export types
export interface PipelineRef { id: number; name: string }
export interface UserNotification { id: string; cardId: string; clientName: string; note: string; timestamp: string; pipelineId: string; read?: boolean }

// Import Supabase data access functions
import * as dbPipelines from './db/pipelines';
import * as dbStages from './db/stages';
import * as dbUsers from './db/users';
import * as dbNotifications from './db/notifications';
import * as dbSettings from './db/settings';
import { getCurrentAuthUser } from './auth';
import { TeamMember } from '@/types/pipeline';

// Subscription Tiers - now async
export const getSubscriptionTierObjects = async (): Promise<{ name: string; active: boolean }[]> => {
  try {
    return await dbSettings.getSubscriptionTierObjects();
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
  return [
    { name: 'Basic', active: true },
    { name: 'Pro', active: true },
    { name: 'Enterprise', active: true },
  ];
  }
};

export const setSubscriptionTierObjects = async (tiers: { name: string; active: boolean }[]): Promise<void> => {
  await dbSettings.setSubscriptionTierObjects(tiers);
};

export const getSubscriptionTiers = async (): Promise<string[]> => {
  return await dbSettings.getSubscriptionTiers();
};

export const setSubscriptionTiers = async (tiers: string[]): Promise<void> => {
    const objs = Array.isArray(tiers)
      ? tiers.filter((n) => typeof n === 'string' && n.trim().length > 0).map((n) => ({ name: n, active: true }))
      : [];
  await setSubscriptionTierObjects(objs);
};

// Team Members - now uses pipeline_members
export const getTeamMembersOverrides = async (pipelineId: string) => {
  try {
    const members = await dbUsers.getPipelineMembers(pipelineId);
    // Filter to only pending/sent invitations
    return members.filter((m: any) => 
      m.invitationStatus === 'pending' || m.invitationStatus === 'sent'
    );
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
};

export const setTeamMembersOverrides = async (pipelineId: string, members: any[]): Promise<void> => {
  // This function is used for managing pipeline members
  // Members are managed through pipeline_members table
  // This is a no-op as members are managed via addPipelineMember/updatePipelineMember
};

// Stages - now uses pipeline_stages
export const getStagesOverrides = async (pipelineId: string) => {
  try {
    return await dbStages.getPipelineStages(pipelineId);
  } catch (error) {
    console.error('Error fetching stages:', error);
  return [];
  }
};

export const setStagesOverrides = async (pipelineId: string, stages: any[]): Promise<void> => {
  // Stages are managed through pipeline_stages table
  // This function is kept for compatibility but stages should be managed via db/stages.ts
};

// Tags - now async
export const getTags = async (): Promise<string[]> => {
  try {
    return await dbSettings.getTags();
  } catch (error) {
    console.error('Error fetching tags:', error);
    return ['VIP', 'Priority', 'Coffee', 'Ecommerce'];
  }
};

export const setTags = async (tags: string[]): Promise<void> => {
  await dbSettings.setTags(tags);
};

// Activity Phases - now async
export const getActivityPhases = async (pipelineId: string): Promise<string[]> => {
  try {
    return await dbSettings.getPipelineActivityPhases(pipelineId);
  } catch (error) {
    console.error('Error fetching activity phases:', error);
    return getDefaultPhasesForPipeline(pipelineId);
  }
};

export const setActivityPhases = async (pipelineId: string, phases: string[]): Promise<void> => {
  await dbSettings.setPipelineActivityPhases(pipelineId, phases);
};

// Pipelines - now async
export const getPipelines = async (): Promise<PipelineRef[]> => {
  try {
    const pipelines = await dbPipelines.getPipelines();
    
    // Return pipelines from database (no auto-creation of default pipelines)
    // Users should create pipelines manually through the UI
    return pipelines;
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    // Return empty array on error instead of default pipelines
    return [];
  }
};

export const setPipelines = async (pipelines: PipelineRef[]): Promise<void> => {
  // Pipelines are managed through pipelines table
  // This function is kept for compatibility but pipelines should be managed via db/pipelines.ts
};

// Pipeline-scoped helpers - now async
// Helper to convert pipeline name (slug) to numeric ID
const getPipelineIdFromName = async (pipelineNameOrId: string | number): Promise<number> => {
  // If it's already a number, return it
  if (typeof pipelineNameOrId === 'number') return pipelineNameOrId;
  
  // Try to parse as number first (for backward compatibility)
  const numId = Number(pipelineNameOrId);
  if (!isNaN(numId) && numId > 0) return numId;
  
  // Otherwise, treat as name and look it up
  const { getPipelineIdByName } = await import('./db/pipelines');
  const id = await getPipelineIdByName(pipelineNameOrId);
  if (!id) throw new Error(`Pipeline not found: ${pipelineNameOrId}`);
  return id;
};

export const getPipelineStages = async (pipelineId: string | number) => {
  try {
    const numericId = await getPipelineIdFromName(pipelineId);
    const stages = await dbStages.getPipelineStages(numericId.toString());
    if (stages.length > 0) return stages;
    // Return defaults if no stages found
    return getDefaultStagesForPipeline(numericId.toString());
  } catch (error) {
    console.error('Error fetching pipeline stages:', error);
    const numericId = typeof pipelineId === 'number' ? pipelineId : await getPipelineIdFromName(pipelineId).catch(() => 0);
    return getDefaultStagesForPipeline(numericId.toString());
  }
};

export const setPipelineStages = async (pipelineId: string | number, stages: any[]): Promise<void> => {
  // Sync stages with Supabase
  const { getPipelineStages, createPipelineStage, updatePipelineStage, deletePipelineStage } = await import('./db/stages');
  
  try {
    const numericId = await getPipelineIdFromName(pipelineId);
    const numericIdStr = numericId.toString();
    
    // Get existing stages
    const existingStages = await getPipelineStages(numericIdStr);
    const existingIds = new Set(existingStages.map(s => s.id));
    const newIds = new Set(stages.map(s => s.id));
    
    // Delete stages that are no longer in the list
    for (const existing of existingStages) {
      if (!newIds.has(existing.id)) {
        try {
          await deletePipelineStage(numericIdStr, existing.id);
        } catch (error) {
          // Log but don't throw - continue with other operations
          console.warn(`Error deleting stage ${existing.id}:`, error);
      }
    }
    }
    
    // Create or update stages
    for (const stage of stages) {
      try {
        if (existingIds.has(stage.id)) {
          // Update existing stage
          await updatePipelineStage(numericIdStr, stage.id, {
            name: stage.name,
            color: stage.color,
            order: stage.order || 0,
          });
        } else {
          // Create new stage
          await createPipelineStage(numericIdStr, {
            id: stage.id,
            name: stage.name,
            color: stage.color || 'stage-new',
            order: stage.order || 0,
          });
        }
      } catch (error) {
        // Log but don't throw - continue with other operations
        console.warn(`Error syncing stage ${stage.id}:`, error);
      }
    }
  } catch (error) {
    // Only log error, don't throw - allow other operations to continue
    console.error('Error syncing pipeline stages:', error);
  }
};

export const getPipelineMembers = async (pipelineId: string | number): Promise<TeamMember[]> => {
  try {
    const numericId = await getPipelineIdFromName(pipelineId);
    return await dbUsers.getPipelineMembers(numericId.toString());
  } catch (error) {
    console.error('Error fetching pipeline members:', error);
  return [];
  }
};

export const setPipelineMembers = async (pipelineId: string | number, members: any[]): Promise<void> => {
  // Sync members with Supabase pipeline_members table
  const { getPipelineMembers, addPipelineMember, updatePipelineMember, removePipelineMember } = await import('./db/users');
  
  try {
    const numericId = await getPipelineIdFromName(pipelineId);
    const numericIdStr = numericId.toString();
    
    // Get existing members
    const existingMembers = await getPipelineMembers(numericIdStr);
    const existingUserIds = new Set(existingMembers.map(m => m.id));
    const newUserIds = new Set(members.map(m => m.id));
    
    // Remove members that are no longer in the list
    for (const existing of existingMembers) {
      if (!newUserIds.has(existing.id)) {
        await removePipelineMember(numericIdStr, existing.id);
      }
    }
    
    // Add or update members
    for (const member of members) {
      if (existingUserIds.has(member.id)) {
        // Update existing member (role might have changed)
        const existing = existingMembers.find(m => m.id === member.id);
        if (existing && existing.role !== member.role) {
          await updatePipelineMember(numericIdStr, member.id, {
            role: member.role as 'manager' | 'staff',
            invitation_status: 'accepted', // Ensure they're accepted
          });
        }
      } else {
        // Add new member
        await addPipelineMember(numericIdStr, member.id, member.role as 'manager' | 'staff', 'accepted');
      }
    }
  } catch (error) {
    console.error('Error syncing pipeline members:', error);
    throw error;
  }
};

export const getPipelineActivityPhases = async (pipelineId: string | number): Promise<string[]> => {
  try {
    const numericId = await getPipelineIdFromName(pipelineId);
    return await dbSettings.getPipelineActivityPhases(numericId.toString());
  } catch (error) {
    console.error('Error fetching pipeline activity phases:', error);
    const numericId = typeof pipelineId === 'number' ? pipelineId : await getPipelineIdFromName(pipelineId).catch(() => 0);
    return getDefaultPhasesForPipeline(numericId.toString());
  }
};

export const setPipelineActivityPhases = async (pipelineId: string | number, phases: string[]): Promise<void> => {
  const numericId = await getPipelineIdFromName(pipelineId);
  await dbSettings.setPipelineActivityPhases(numericId.toString(), phases);
};

// Current User - now async, uses Supabase Auth
export const getCurrentUser = async (): Promise<TeamMember> => {
  try {
    const authUser = await getCurrentAuthUser();
    if (!authUser) {
      // Return fallback user for development/unauthenticated state
      const fallback: TeamMember = {
        id: 'alex',
        name: 'Alex',
        email: 'alex@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4',
        role: 'manager',
      };
      return fallback;
    }
    
    let user = await dbUsers.getUser(authUser.id);
    if (!user) {
      // Create user profile if it doesn't exist using upsert
      const { getSupabaseClient } = await import('./supabase');
      const supabase = getSupabaseClient();
      const fallback: TeamMember = {
        id: authUser.id,
        name: authUser.email?.split('@')[0] || 'User',
        email: authUser.email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser.email || 'User')}&backgroundColor=b6e3f4`,
        role: 'staff',
      };
      // Try to create user profile using upsert
      try {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: authUser.id,
            name: fallback.name,
            email: fallback.email,
            avatar: fallback.avatar,
            role: fallback.role,
          }, { onConflict: 'id' });
        if (!upsertError) {
          // Try to fetch again after creation
          user = await dbUsers.getUser(authUser.id);
        }
      } catch (err) {
        console.warn('Error creating user profile:', err);
      }
      return user || fallback;
    }
    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    // Fallback for development
    const fallback: TeamMember = {
      id: 'alex',
      name: 'Alex',
      email: 'alex@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4',
      role: 'manager',
    };
  return fallback;
  }
};

export const setCurrentUser = async (user: Partial<TeamMember>): Promise<void> => {
  if (!user.id) throw new Error('User ID is required');
  await dbUsers.updateUser(user.id, {
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  });
};

// Notifications - now async
export const getNotificationsForUser = async (userId: string): Promise<UserNotification[]> => {
  try {
    return await dbNotifications.getNotificationsForUser(userId);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    return await dbNotifications.getUnreadNotificationCount(userId);
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

export const markNotificationsAsRead = async (userId: string): Promise<void> => {
  await dbNotifications.markNotificationsAsRead(userId);
};

export const pushNotificationForUser = async (userId: string, notification: UserNotification): Promise<void> => {
  await dbNotifications.pushNotificationForUser(userId, notification);
};

// Default stages and phases helpers (synchronous, used for fallbacks)
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
