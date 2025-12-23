import { Badge } from '@/components/ui/badge';
import { StageId } from '@/types/pipeline';

interface StageBadgeProps {
  stageId: StageId;
  stageName: string;
  size?: 'sm' | 'md';
}

export function StageBadge({ stageId, stageName, size = 'md' }: StageBadgeProps) {
  const variantMap: Record<StageId, 'stage-new' | 'stage-called' | 'stage-onboard' | 'stage-live' | 'stage-lost'> = {
    new: 'stage-new',
    called: 'stage-called',
    onboard: 'stage-onboard',
    live: 'stage-live',
    lost: 'stage-lost',
  };

  return (
    <Badge
      variant={variantMap[stageId]}
      className={size === 'sm' ? 'px-2 py-0 text-[10px]' : ''}
    >
      {stageName}
    </Badge>
  );
}
