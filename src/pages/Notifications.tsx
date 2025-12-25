import { Helmet } from 'react-helmet-async';
import { getCurrentUser, getNotificationsForUser, markNotificationsAsRead } from '@/lib/settings';
import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';

export default function Notifications() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const items = useMemo(() => getNotificationsForUser(user.id), [user.id]);
  
  useEffect(() => {
    // Mark all notifications as read when the page is viewed
    markNotificationsAsRead(user.id);
  }, [user.id]);
  return (
    <>
      <Helmet><title>Notifications</title></Helmet>
      <AppHeader title="Notifications" subtitle="Mentions & activity" />
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          {items.map(n => (
            <div key={n.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <div className="font-medium">{n.clientName || n.cardId}</div>
                <div className="text-xs text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</div>
                <div className="text-sm mt-1">{n.note}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/pipeline/${n.pipelineId}?card=${encodeURIComponent(n.cardId)}&note=${encodeURIComponent(n.note)}`)}
                >
                  Open Discussion
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
