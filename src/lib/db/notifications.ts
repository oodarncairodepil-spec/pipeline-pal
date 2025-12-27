import { getSupabaseClient } from '../supabase';
import { UserNotification } from '../settings';

export const getNotificationsForUser = async (userId: string): Promise<UserNotification[]> => {
  // Handle non-UUID user IDs (fallback users)
  if (!userId || userId === 'alex' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []).map(n => ({
    id: n.id,
    cardId: n.card_id || '',
    clientName: n.client_name,
    note: n.note,
    timestamp: n.created_at,
    pipelineId: n.pipeline_id as number,
    read: n.read || false,
  }));
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  // Handle non-UUID user IDs (fallback users)
  if (!userId || userId === 'alex' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return 0;
  }

  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }

  return count || 0;
};

export const markNotificationsAsRead = async (userId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
};

export const pushNotificationForUser = async (
  userId: string,
  notification: UserNotification
): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .insert({
      id: notification.id,
      user_id: userId,
      card_id: notification.cardId || null,
      client_name: notification.clientName,
      note: notification.note,
      pipeline_id: notification.pipelineId,
      read: notification.read !== undefined ? notification.read : false,
    });

  if (error) throw error;
};

export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
};

