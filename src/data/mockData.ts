import { BoardState, Stage, TeamMember, LeadCard, Lane, StageId } from '@/types/pipeline';
import { getPipelineMembers, getPipelineStages } from '@/lib/settings';
import * as dbCards from '@/lib/db/cards';
import * as dbStages from '@/lib/db/stages';
import * as dbUsers from '@/lib/db/users';
import * as dbPipelines from '@/lib/db/pipelines';

export const loadInitialBoardState = async (pipelineName: string = 'default'): Promise<BoardState> => {
  try {
    // Check if user is authenticated before trying to create pipelines
    const { getCurrentAuthUser } = await import('../lib/auth');
    let isAuthenticated = false;
    try {
      const authUser = await getCurrentAuthUser();
      isAuthenticated = !!authUser;
    } catch {}

    // Convert pipeline name (slug) to numeric ID
    let pipelineIdNum: number | null = null;
    if (isAuthenticated) {
      try {
        // Check if pipeline exists by name
        const pipeline = await dbPipelines.getPipelineByName(pipelineName);
        if (pipeline) {
          pipelineIdNum = pipeline.id;
        } else {
          // Pipeline doesn't exist - don't create automatically
          // Return empty state instead
          console.warn(`Pipeline "${pipelineName}" not found. Returning empty state.`);
        }
      } catch (error) {
        console.error('Error checking pipeline:', error);
      }
    }

    // If we don't have a numeric ID, we can't proceed with database operations
    if (!pipelineIdNum && isAuthenticated) {
      console.warn('No pipeline ID found, returning empty state');
      return {
        lanes: [],
        cards: {},
        stages: [],
        teamMembers: [],
      };
    }

    // Fetch stages (will return empty if not authenticated or no pipeline ID)
    let stages: Stage[] = [];
    if (pipelineIdNum) {
      try {
        stages = await dbStages.getPipelineStages(pipelineIdNum);
      } catch (error) {
        console.error('Error fetching stages:', error);
      }
    }
    
    // If no stages exist and user is authenticated, create default stages
    if (stages.length === 0 && isAuthenticated && pipelineIdNum) {
      const defaultStages = getDefaultStagesForPipeline(pipelineName);
      for (const stage of defaultStages) {
        try {
          await dbStages.createPipelineStage(pipelineIdNum, stage);
        } catch (error) {
          console.error(`Error creating stage ${stage.id}:`, error);
        }
      }
      try {
        stages = await dbStages.getPipelineStages(pipelineIdNum);
      } catch (error) {
        console.error('Error fetching stages after creation:', error);
      }
    }
    
    // If still no stages, use defaults
    if (stages.length === 0) {
      stages = getDefaultStagesForPipeline(pipelineName);
    }

    // Fetch team members
    let teamMembers: TeamMember[] = [];
    if (isAuthenticated && pipelineIdNum) {
      try {
        teamMembers = await dbUsers.getPipelineMembers(pipelineIdNum);
        
        // If no members, try to get all users (for initial setup)
        if (teamMembers.length === 0) {
          try {
            const allUsers = await dbUsers.getUsers();
            teamMembers = allUsers;
          } catch (error) {
            console.error('Error fetching users:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching pipeline members:', error);
      }
    }
    
    // Fallback to default team if no members found
    if (teamMembers.length === 0) {
      teamMembers = [
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
      ];
    }

    // Fetch cards
    let cards: Record<string, LeadCard> = {};
    if (isAuthenticated && pipelineIdNum) {
      try {
        cards = await dbCards.getCards(pipelineIdNum);
      } catch (error) {
        console.error('Error fetching cards:', error);
      }
    }

    // Build lanes from stages
    const lanes: Lane[] = stages.map(stage => {
      const stageCards = Object.values(cards).filter(c => c.stageId === stage.id);
      const cardIds = stageCards.map(c => c.id);
      
      // Get sections for this stage
      return {
        id: stage.id,
        stage,
        cardIds,
        sections: [], // Sections will be loaded separately if needed
      };
    });

    // Load sections for each lane
    if (pipelineIdNum) {
      for (const lane of lanes) {
        try {
          const sections = await dbStages.getPipelineSections(pipelineIdNum, lane.id);
          if (sections.length > 0) {
            lane.sections = sections;
          }
        } catch (error) {
          console.error(`Error loading sections for stage ${lane.id}:`, error);
        }
      }
    }

    return {
      lanes,
      cards,
      stages,
      teamMembers,
    };
  } catch (error) {
    console.error('Error loading board state:', error);
    // Return empty state on error
  return {
      lanes: [],
      cards: {},
      stages: [],
      teamMembers: [],
    };
  }
};

// Default stages for different pipeline types
// Note: pipelineName is the slug/name, not the numeric ID
const getDefaultStagesForPipeline = (pipelineName: string): Stage[] => {
  if (pipelineName === 'retail' || pipelineName.toLowerCase().includes('retail')) {
    return [
      { id: 'prospect', name: 'Prospect', color: 'stage-indigo', order: 0 },
      { id: 'demo', name: 'Demo', color: 'stage-teal', order: 1 },
      { id: 'negotiation', name: 'Negotiation', color: 'stage-orange', order: 2 },
      { id: 'won', name: 'Won', color: 'stage-live', order: 3 },
      { id: 'lost', name: 'Lost', color: 'stage-lost', order: 4 },
    ];
  }
  if (pipelineName === 'fnb' || pipelineName.toLowerCase().includes('food') || pipelineName.toLowerCase().includes('beverage')) {
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

// Legacy exports for backward compatibility (deprecated)
export const stages: Stage[] = [];
export const teamMembers: TeamMember[] = [];
export const mockCards: Record<string, LeadCard> = {};
export const lanes: Lane[] = [];
