'use client';

import { useState, useEffect } from 'react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from './actions';

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

  const fetchNotificationsData = async () => {
    const result = await fetchNotifications();
    if (result.success) {
      setNotifications(result.data);
    } else {
      setError('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    fetchNotificationsData();
    setLoading(false);
  }, []);

  const handleMarkRead = async (id: string) => {
    setActionLoading(id);
    const result = await markNotificationRead(id);
    if (result.success) {
      await fetchNotificationsData();
    }
    setActionLoading(null);
  };

  const handleMarkAllRead = async () => {
    setActionLoading('all');
    const result = await markAllNotificationsRead();
    if (result.success) {
      await fetchNotificationsData();
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    const result = await deleteNotification(id);
    if (result.success) {
      await fetchNotificationsData();
    }
    setActionLoading(null);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading notifications">
        <div className="spinner"></div>
        <span className="sr-only">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-heading text-[#0F172A]">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-body font-normal text-[#64748B]">
              ({unreadCount} unread)
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={actionLoading === 'all'}
            className="btn-primary"
          >
            {actionLoading === 'all' ? 'Marking...' : 'Mark All Read'}
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`card border-l-4 ${
              notification.is_read ? 'border-l-[#E2E8F0]' : 'border-l-[#1E40AF]'
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className={`font-medium ${notification.is_read ? 'text-[#64748B]' : 'text-[#0F172A]'}`}>
                  {notification.title}
                </h3>
                <p className="text-body text-[#64748B] mt-1">{notification.message}</p>
                <p className="text-small text-[#94A3B8] mt-2">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    disabled={actionLoading === notification.id}
                    className="text-[#1E40AF] hover:text-[#1D4ED8] text-sm font-medium disabled:opacity-50"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notification.id)}
                  disabled={actionLoading === notification.id}
                  className="text-[#DC2626] hover:text-[#B91C1C] text-sm font-medium disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-12 text-body text-[#64748B]">
            No notifications
          </div>
        )}
      </div>
    </div>
  );
}
