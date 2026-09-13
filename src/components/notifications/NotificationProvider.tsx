'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchUnreadCount } from '@/app/(app)/notifications/actions';
import type { Notification } from '@/lib/notifications/types';

interface NotificationContextValue {
  unreadCount: number;
  notifications: Notification[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const supabase = createClient();

  const refresh = useCallback(async () => {
    const result = await fetchUnreadCount();
    if (result.success) setUnreadCount(result.count);
  }, []);

  const refreshList = useCallback(async () => {
    const { fetchNotifications } = await import('@/app/(app)/notifications/actions');
    const result = await fetchNotifications(20);
    if (result.success) setNotifications(result.data);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const { markNotificationRead } = await import('@/app/(app)/notifications/actions');
    const result = await markNotificationRead(id);
    if (result.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const { markAllNotificationsRead } = await import('@/app/(app)/notifications/actions');
    const result = await markAllNotificationsRead();
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshList();
  }, [refresh, refreshList]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications(prev => prev.filter(n => n.id !== deleted.id));
          refresh();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase]);

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, isOpen, setIsOpen, refresh, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
