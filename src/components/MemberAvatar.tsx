import { cn } from '@/lib/utils';
import { TeamMember } from '@/types/pipeline';

interface AvatarStackProps {
  member?: TeamMember;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function MemberAvatar({ member, size = 'md', showName = false, className }: AvatarStackProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  if (!member) {
    return (
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border',
          sizeClasses[size],
          className
        )}
      >
        <span className="text-muted-foreground">?</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={member.avatar}
        alt={member.name}
        className={cn(
          'rounded-full ring-2 ring-background shadow-sm object-cover',
          sizeClasses[size]
        )}
      />
      {showName && (
        <span className="text-sm font-medium text-foreground">{member.name}</span>
      )}
    </div>
  );
}

interface AvatarGroupProps {
  members: TeamMember[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ members, max = 3, size = 'sm' }: AvatarGroupProps) {
  const displayMembers = members.slice(0, max);
  const remaining = members.length - max;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  const offsetClasses = {
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
  };

  return (
    <div className="flex items-center">
      {displayMembers.map((member, index) => (
        <img
          key={member.id}
          src={member.avatar}
          alt={member.name}
          className={cn(
            'rounded-full ring-2 ring-background shadow-sm object-cover',
            sizeClasses[size],
            index > 0 && offsetClasses[size]
          )}
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full bg-muted flex items-center justify-center ring-2 ring-background font-medium text-muted-foreground',
            sizeClasses[size],
            offsetClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
