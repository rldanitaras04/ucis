'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from './actions';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchNotifications = async () => {
    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError('Failed to fetch notifications');
      return;
    }

    setNotifications(data || []);
  };

  useEffect(() => {
    fetchNotifications();
    setLoading(false);
  }, []);

  const handleMarkRead = async (id: string) => {
    setActionLoading(id);
    const result = await markNotificationRead(id);
    if (result.success) {
      await fetchNotifications();
    }
    setActionLoading(null);
  };

  const handleMarkAllRead = async () => {
    setActionLoading('all');
    const result = await markAllNotificationsRead();
    if (result.success) {
      await fetchNotifications();
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    const result = await deleteNotification(id);
    if (result.success) {
      await fetchNotifications();
    }
    setActionLoading(null);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({unreadCount} unread)
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={actionLoading === 'all'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading === 'all' ? 'Marking...' : 'Mark All Read'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-lg shadow p-4 border-l-4 ${
              notification.is_read ? 'border-gray-300' : 'border-blue-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className={`font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                  {notification.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    disabled={actionLoading === notification.id}
                    className="text-blue-600 hover:text-blue-900 text-sm disabled:opacity-50"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notification.id)}
                  disabled={actionLoading === notification.id}
                  className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">No notifications</div>
        )}
      </div>
    </div>
  );
}
