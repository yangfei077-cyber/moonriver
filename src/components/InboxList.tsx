'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Loader2,
  Send,
  UserPlus,
  CheckCheck,
  Calendar,
  Music,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  senderEmail: string;
  senderName: string;
  title: string;
  message: string;
  metadata?: { courseId?: string; courseTitle?: string; studentEmail?: string };
  read: boolean;
  createdAt: string;
}

export default function InboxList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    const n = notifications.find((x) => x.id === id);
    if (!n || n.read) return;
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((x) => (x.id === id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lesson_invite':
        return <Send className="w-5 h-5 text-dash-primary" />;
      case 'course_invite':
      case 'course_signup':
      case 'course_enrolled':
        return <UserPlus className="w-5 h-5 text-green-600" />;
      default:
        return <Inbox className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-dash-primary animate-spin" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-orange-100 p-12 text-center">
        <Inbox className="w-16 h-16 mx-auto text-orange-200 mb-4" />
        <h3 className="text-lg font-semibold text-text-light mb-2">No notifications yet</h3>
        <p className="text-gray-500">
          Invitations, course sign-ups, and other updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="text-sm text-dash-primary font-medium hover:underline flex items-center gap-1"
        >
          <CheckCheck className="w-4 h-4" />
          Mark all as read
        </button>
      )}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markAsRead(n.id)}
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors hover:shadow-sm ${
              n.read ? 'border-orange-100' : 'border-dash-primary/30 bg-orange-50/30'
            }`}
          >
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-text-light">{n.title}</h4>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-dash-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-500">{n.senderName}</span>
                  <span className="text-xs text-gray-400">{formatDate(n.createdAt)}</span>
                </div>
                {n.type === 'course_signup' && n.metadata?.courseTitle && (
                  <Link
                    href="/creator/courses"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-dash-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Music className="w-4 h-4" />
                    View course
                  </Link>
                )}
                {n.type === 'course_enrolled' && n.metadata?.courseTitle && (
                  <Link
                    href="/student/courses"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-dash-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Music className="w-4 h-4" />
                    View my courses
                  </Link>
                )}
                {n.type === 'course_invite' && n.metadata?.courseId && (
                  <Link
                    href={`/student/courses?courseId=${encodeURIComponent(n.metadata.courseId)}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-dash-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Music className="w-4 h-4" />
                    View course & enroll
                  </Link>
                )}
                {n.type === 'lesson_invite' && (
                  <Link
                    href="/creator/schedule"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-dash-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Calendar className="w-4 h-4" />
                    View schedule
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
