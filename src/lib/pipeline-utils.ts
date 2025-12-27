import { differenceInDays } from 'date-fns';
import { StageId } from '@/types/pipeline';

export function getRunningDays(startDate: Date): number {
  return differenceInDays(new Date(), startDate) + 1;
}

export function formatRunningDays(days: number): string {
  if (days === 1) return 'Day 1';
  return `Day ${days}`;
}

export function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

// Static map for stage color classes to ensure Tailwind JIT generates all classes
const STAGE_COLOR_CLASSES = {
  'stage-new': {
    bg: 'bg-stage-new',
    text: 'text-stage-new',
    bgLight: 'bg-stage-new-bg',
    border: 'border-stage-new/30',
  },
  'stage-called': {
    bg: 'bg-stage-called',
    text: 'text-stage-called',
    bgLight: 'bg-stage-called-bg',
    border: 'border-stage-called/30',
  },
  'stage-onboard': {
    bg: 'bg-stage-onboard',
    text: 'text-stage-onboard',
    bgLight: 'bg-stage-onboard-bg',
    border: 'border-stage-onboard/30',
  },
  'stage-live': {
    bg: 'bg-stage-live',
    text: 'text-stage-live',
    bgLight: 'bg-stage-live-bg',
    border: 'border-stage-live/30',
  },
  'stage-lost': {
    bg: 'bg-stage-lost',
    text: 'text-stage-lost',
    bgLight: 'bg-stage-lost-bg',
    border: 'border-stage-lost/30',
  },
  'stage-purple': {
    bg: 'bg-stage-purple',
    text: 'text-stage-purple',
    bgLight: 'bg-stage-purple-bg',
    border: 'border-stage-purple/30',
  },
  'stage-teal': {
    bg: 'bg-stage-teal',
    text: 'text-stage-teal',
    bgLight: 'bg-stage-teal-bg',
    border: 'border-stage-teal/30',
  },
  'stage-indigo': {
    bg: 'bg-stage-indigo',
    text: 'text-stage-indigo',
    bgLight: 'bg-stage-indigo-bg',
    border: 'border-stage-indigo/30',
  },
  'stage-pink': {
    bg: 'bg-stage-pink',
    text: 'text-stage-pink',
    bgLight: 'bg-stage-pink-bg',
    border: 'border-stage-pink/30',
  },
  'stage-orange': {
    bg: 'bg-stage-orange',
    text: 'text-stage-orange',
    bgLight: 'bg-stage-orange-bg',
    border: 'border-stage-orange/30',
  },
} as const;

export function getStageColorClasses(stageId: StageId, colorVariant?: 'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost' | 'stage-purple' | 'stage-teal' | 'stage-indigo' | 'stage-pink' | 'stage-orange'): {
  bg: string;
  text: string;
  bgLight: string;
  border: string;
} {
  const variant = colorVariant ?? ({
    new: 'stage-new',
    called: 'stage-called',
    onboard: 'stage-onboard',
    live: 'stage-live',
    lost: 'stage-lost',
  }[stageId] as keyof typeof STAGE_COLOR_CLASSES);
  
  // Fallback to stage-new if variant not found
  const colorClasses = STAGE_COLOR_CLASSES[variant] || STAGE_COLOR_CLASSES['stage-new'];
  
  return colorClasses;
}
