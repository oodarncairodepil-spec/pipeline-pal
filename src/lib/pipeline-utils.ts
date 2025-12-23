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

export function getStageColorClasses(stageId: StageId): {
  bg: string;
  text: string;
  bgLight: string;
  border: string;
} {
  const colors: Record<StageId, { bg: string; text: string; bgLight: string; border: string }> = {
    new: {
      bg: 'bg-stage-new',
      text: 'text-stage-new',
      bgLight: 'bg-stage-new-bg',
      border: 'border-stage-new/30',
    },
    called: {
      bg: 'bg-stage-called',
      text: 'text-stage-called',
      bgLight: 'bg-stage-called-bg',
      border: 'border-stage-called/30',
    },
    onboard: {
      bg: 'bg-stage-onboard',
      text: 'text-stage-onboard',
      bgLight: 'bg-stage-onboard-bg',
      border: 'border-stage-onboard/30',
    },
    live: {
      bg: 'bg-stage-live',
      text: 'text-stage-live',
      bgLight: 'bg-stage-live-bg',
      border: 'border-stage-live/30',
    },
    lost: {
      bg: 'bg-stage-lost',
      text: 'text-stage-lost',
      bgLight: 'bg-stage-lost-bg',
      border: 'border-stage-lost/30',
    },
  };
  return colors[stageId];
}
