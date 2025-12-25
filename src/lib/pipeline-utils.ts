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
  }[stageId]);
  return {
    bg: `bg-${variant}`,
    text: `text-${variant}`,
    bgLight: `bg-${variant}-bg`,
    border: `border-${variant}/30`,
  };
}
