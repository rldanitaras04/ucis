'use client';

import Link from 'next/link';
import { useNotifications } from './NotificationProvider';

export default function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead, setIsOpen } = useNotifications();

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E5E7EB] z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <h3 className="text-sm font-semibold text-[#111827]">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-1 text-xs font-normal text-[#9CA3AF]">
              ({unreadCount} unread)
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-[#1E40AF] hover:text-[#1D4ED8] font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#9CA3AF]">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 10).map(notification => (
            <button
              key={notification.id}
              onClick={() => {
                markRead(notification.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors ${
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
                  {notification.body && (
                    <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                      {notification.body}
                    </p>
                  )}
                  <p className="text-xs text-[#D1D5DB] mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-[#E5E7EB]">
        <Link
          href="/notifications"
          onClick={() => setIsOpen(false)}
          className="block w-full text-center px-4 py-2.5 text-sm text-[#1E40AF] hover:bg-[#F9FAFB] transition-colors font-medium"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
