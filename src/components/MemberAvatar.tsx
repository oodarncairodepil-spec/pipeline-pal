import { cn } from '@/lib/utils';
import { TeamMember } from '@/types/pipeline';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface AvatarStackProps {
  member?: TeamMember;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

// Helper function to get user initial
const getUserInitial = (name?: string, email?: string): string => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  }
  if (email) {
    return email[0]?.toUpperCase() || 'U';
  }
  return 'U';
};

// Helper function to get color based on name/email for consistent coloring
const getAvatarColor = (name?: string, email?: string): string => {
  const str = name || email || 'User';
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function MemberAvatar({ member, size = 'md', showName = false, className }: AvatarStackProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
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

  // Use custom avatar if available, otherwise show default with initial
  const hasCustomAvatar = member.avatar && member.avatar.trim() !== '';
  const [avatarError, setAvatarError] = useState(false);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          {hasCustomAvatar && !avatarError ? (
          <img
              src={member.avatar}
            alt={member.name}
            className={cn(
              'rounded-full ring-2 ring-background shadow-sm object-cover',
              sizeClasses[size]
            )}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div
              className={cn(
                'rounded-full ring-2 ring-background shadow-sm flex items-center justify-center text-white font-semibold',
                sizeClasses[size],
                getAvatarColor(member.name, member.email),
                textSizeClasses[size]
              )}
            >
              {getUserInitial(member.name, member.email)}
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent>{member.name}</TooltipContent>
      </Tooltip>
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

// Component for individual avatar in group (needed for useState hook)
const GroupAvatarItem = ({ member, size, index, sizeClasses, textSizeClasses, offsetClasses }: {
  member: TeamMember;
  size: 'sm' | 'md' | 'lg';
  index: number;
  sizeClasses: Record<string, string>;
  textSizeClasses: Record<string, string>;
  offsetClasses: Record<string, string>;
}) => {
  const hasCustomAvatar = member.avatar && member.avatar.trim() !== '';
  const [avatarError, setAvatarError] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {hasCustomAvatar && !avatarError ? (
          <img
            src={member.avatar}
            alt={member.name}
            className={cn(
              'rounded-full ring-2 ring-background shadow-sm object-cover',
              sizeClasses[size],
              index > 0 && offsetClasses[size]
            )}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div
            className={cn(
              'rounded-full ring-2 ring-background shadow-sm flex items-center justify-center text-white font-semibold',
              sizeClasses[size],
              getAvatarColor(member.name, member.email),
              textSizeClasses[size],
              index > 0 && offsetClasses[size]
            )}
          >
            {getUserInitial(member.name, member.email)}
          </div>
        )}
      </TooltipTrigger>
      <TooltipContent>{member.name}</TooltipContent>
    </Tooltip>
  );
};

export function AvatarGroup({ members, max = 3, size = 'sm' }: AvatarGroupProps) {
  const displayMembers = members.slice(0, max);
  const remaining = members.length - max;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  const textSizeClasses = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  const offsetClasses = {
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
  };

  return (
    <div className="flex items-center">
      {displayMembers.map((member, index) => (
        <GroupAvatarItem
          key={member.id}
          member={member}
          size={size}
          index={index}
          sizeClasses={sizeClasses}
          textSizeClasses={textSizeClasses}
          offsetClasses={offsetClasses}
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
