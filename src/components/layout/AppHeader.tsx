'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  List,
  Bell,
  SignOut,
  CaretDown,
  User,
} from '@phosphor-icons/react';
import { NAVIGATION_REGISTRY } from '@/lib/navigation/registry';
import { UserRole } from '@/lib/navigation/types';
import { fetchNotifications, markNotificationRead } from '@/app/(app)/notifications/actions';

interface AppHeaderProps {
  userName?: string;
  userRoles?: string[];
  avatarUrl?: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const HEADER_ITEM_IDS = ['dashboard', 'queue', 'patient-records', 'reports'];

export default function AppHeader({ userName, userRoles, avatarUrl }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    const result = await fetchNotifications();
    if (result.success) {
      setNotifications(result.data);
    }
    setNotificationsLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (!notification.is_read) {
      setMarkingRead(notification.id);
      const result = await markNotificationRead(notification.id);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      }
      setMarkingRead(null);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }, [supabase, router]);

  const headerLinks = useMemo(() => {
    if (!userRoles) return HEADER_ITEM_IDS
      .map(id => NAVIGATION_REGISTRY.find(item => item.id === id))
      .filter(Boolean)
      .map(item => ({ label: item!.label, href: item!.href }));

    return HEADER_ITEM_IDS
      .map(id => NAVIGATION_REGISTRY.find(item => item.id === id))
      .filter(Boolean)
      .filter(item => {
        if (!item!.requiredRoles) return true;
        return (userRoles as UserRole[]).some(role =>
          item!.requiredRoles!.includes(role) || role === 'super_admin'
        );
      })
      .map(item => ({ label: item!.label, href: item!.href }));
  }, [userRoles]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] h-16 flex items-center px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('sidebar:toggle'))}
        className="lg:hidden mr-3 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
        aria-label="Toggle sidebar"
      >
        <List size={20} className="text-[#6B7280]" weight="regular" />
      </button>

      {/* Desktop collapse toggle */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('sidebar:toggle'))}
        className="hidden lg:flex mr-4 w-10 h-10 items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-[#6B7280]">
          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Navigation links */}
      <nav className="hidden md:flex items-center gap-1" aria-label="Header navigation">
        {headerLinks.map(link => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'text-[#111827] bg-[#F3F4F6]'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Notifications dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setNotificationsOpen(prev => !prev);
              setUserMenuOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors relative"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={20} className="text-[#6B7280]" weight="regular" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-[#E5E7EB] z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-semibold text-[#111827]">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 text-xs font-normal text-[#9CA3AF]">
                      ({unreadCount} unread)
                    </span>
                  )}
                </h3>
                <Link
                  href="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-[#1E40AF] hover:text-[#1D4ED8] font-medium"
                >
                  View all
                </Link>
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[#9CA3AF]">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map(notification => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      disabled={markingRead === notification.id}
                      className={`w-full text-left px-4 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 ${
                        !notification.is_read ? 'bg-[#F0F5FF]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!notification.is_read && (
                          <span className="mt-1.5 w-2 h-2 bg-[#1E40AF] rounded-full flex-shrink-0" />
                        )}
                        <div className={`flex-1 min-w-0 ${notification.is_read ? 'ml-5' : ''}`}>
                          <p className={`text-sm font-medium truncate ${notification.is_read ? 'text-[#6B7280]' : 'text-[#111827]'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-[#D1D5DB] mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-[#E5E7EB]">
                  <Link
                    href="/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm text-[#1E40AF] hover:bg-[#F9FAFB] transition-colors font-medium"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#E5E7EB] mx-2" />

        {/* User avatar with dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName || 'User'}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-[#1E40AF] rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {userName ? userName.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium text-[#374151] max-w-[100px] truncate">
              {userName || 'User'}
            </span>
            <CaretDown size={14} className={`text-[#6B7280] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} weight="bold" />
          </button>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-2 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={userName || 'User'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#1E40AF] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">
                        {userName ? userName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827] truncate">{userName || 'User'}</p>
                    {userRoles && userRoles.length > 0 && (
                      <p className="text-xs text-[#9CA3AF] truncate">
                        {userRoles.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile link */}
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors"
              >
                <User size={18} weight="regular" />
                <span className="text-sm font-medium">Profile</span>
              </Link>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors disabled:opacity-50"
              >
                <SignOut size={18} weight="regular" />
                <span className="text-sm font-medium">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
