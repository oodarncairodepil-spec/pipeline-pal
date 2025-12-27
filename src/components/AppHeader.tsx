import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MemberAvatar } from '@/components/MemberAvatar';
import { getPipelines, getCurrentUser, getNotificationsForUser, getUnreadNotificationCount } from '@/lib/settings';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { signOut } from '@/lib/auth';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  hideSearchAndFilter?: boolean;
}

export function AppHeader({ title, subtitle, hideSearchAndFilter = false }: AppHeaderProps) {
  const { pipelineId = 'default' } = useParams();
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pipelineList, user] = await Promise.all([
          getPipelines(),
          getCurrentUser(),
        ]);
        setPipelines(pipelineList);
        setCurrentUser(user);
        
        const count = await getUnreadNotificationCount(user.id);
        setUnreadCount(count);
        
        const notifications = await getNotificationsForUser(user.id);
        setNotificationCount(notifications.length);
      } catch (error) {
        console.error('Error loading header data:', error);
      }
    };
    loadData();
    
    // Update unread count periodically
    const interval = setInterval(async () => {
      if (currentUser) {
        try {
          const count = await getUnreadNotificationCount(currentUser.id);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error updating unread count:', error);
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate(`/pipeline/${pipelineId}`)}>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!hideSearchAndFilter && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="text" placeholder="Search..." className="pl-9 w-64" />
              </div>
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98] h-8 rounded-md px-3 text-xs">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </button>
            </>
          )}
          <Select value={pipelineId} onValueChange={(name) => navigate(`/pipeline/${name}/settings`)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.filter(p => p.name && p.name.trim() !== '').map(p => (
                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full relative">
                {currentUser && (
                  <>
                    <MemberAvatar member={{ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, role: currentUser.role || 'manager', email: currentUser.email }} size="md" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold text-white bg-red-500 rounded-full border-2 border-background">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/pipeline/${pipelineId}/settings`)}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/profile`)}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/notifications`)}>
                Notifications ({notificationCount})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                try {
                  await signOut();
                } catch (error) {
                  console.error('Error signing out:', error);
                }
                // Clear legacy token as fallback
                try {
                  localStorage.removeItem('sb:token');
                } catch {}
                navigate('/login');
              }}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
