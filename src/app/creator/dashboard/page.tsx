'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserContext } from '@/contexts/UserContext';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import {
  Users,
  BookOpen,
  Calendar,
  Star,
  Plus,
  CalendarDays,
  MessageSquare,
  Pencil,
  Sparkles,
  ChevronRight,
  Inbox,
  Search,
  Loader2,
} from 'lucide-react';

const CREATOR_SUGGESTIONS = [
  'How many students are in my courses?',
  "Show me this week's appointments",
  'Which of my courses is most popular?',
  'List my upcoming lessons',
];

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-2 text-gray-700">
          {listItems.map((item, i) => (
            <li key={i} className="ml-2">
              {item.replace(/^\s*[-*]\s*/, '').split(/(\*\*.*?\*\*)/g).map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="font-semibold text-text-light">{part.slice(2, -2)}</strong> : part
              )}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string) =>
    text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="font-semibold text-text-light">{part.slice(2, -2)}</strong>
        : part
    );

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.match(/^[-*]\s/)) { listItems.push(trimmed); i++; continue; }
    flushList();
    if (trimmed) elements.push(<p key={key++} className="my-1.5 text-gray-700">{renderInline(trimmed)}</p>);
    else elements.push(<br key={key++} />);
    i++;
  }
  flushList();
  return <div className="prose prose-sm max-w-none">{elements}</div>;
}

function CreatorRAGSearch() {
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q || loading) return;
    setQuery('');
    setConversation(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/rag/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setConversation(prev => [...prev, { role: 'assistant', content: data.response || 'Sorry, I could not process your request.' }]);
    } catch {
      setConversation(prev => [...prev, { role: 'assistant', content: 'An error occurred. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-text-light mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-dash-primary" />
        AI Teaching Assistant
      </h2>
      <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-orange-50">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Ask about your students, courses, or schedule..."
              className="flex-1 px-4 py-3 rounded-xl border border-orange-200 focus:border-dash-primary focus:ring-2 focus:ring-dash-primary/20 outline-none transition-all text-text-light placeholder:text-gray-400"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-dash-primary text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Ask
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {CREATOR_SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-orange-50 text-dash-primary hover:bg-orange-100 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-[220px] max-h-[360px] overflow-y-auto p-4 space-y-4">
          {conversation.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Sparkles className="w-10 h-10 mb-3 text-orange-200" />
              <p className="text-center text-sm max-w-xs">
                Ask me about your students, courses, or upcoming lessons. I only see your own data.
              </p>
            </div>
          ) : (
            conversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-dash-primary text-white' : 'bg-orange-50 text-text-light border border-orange-100'}`}>
                  {msg.role === 'user' ? <p className="text-sm">{msg.content}</p> : <MarkdownContent content={msg.content} />}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-dash-primary" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface Course {
  id: string;
  title: string;
  currentStudents: number;
  maxStudents: number;
  level?: string;
}

interface Appointment {
  id: number;
  studentName: string;
  title: string;
  date: string;
  time: string;
  status: string;
}

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { hasCompletedOnboarding, loadingOnboarding, isAdmin, loadingRoles } = useUserContext();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!loadingRoles && isAdmin) router.replace('/admin/dashboard');
  }, [loadingRoles, isAdmin, router]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; read: boolean; createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, appointmentsRes, notifRes] = await Promise.all([
          fetch('/api/courses?creatorOnly=true'),
          fetch('/api/appointments?role=creator'),
          fetch('/api/notifications'),
        ]);
        const coursesData = await coursesRes.json();
        const appointmentsData = await appointmentsRes.json();
        const notifData = notifRes.ok ? await notifRes.json() : { notifications: [], unreadCount: 0 };
        if (coursesData.success) setCourses(coursesData.courses || []);
        if (appointmentsData.success) setAppointments(appointmentsData.appointments || []);
        setNotifications((notifData.notifications || []).slice(0, 3));
        setUnreadCount(notifData.unreadCount || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalStudents = courses.reduce((sum, c) => sum + (c.currentStudents || 0), 0);
  const activeCourses = courses.filter((c) => c.currentStudents > 0).length;
  const upcomingLessons = appointments.slice(0, 5);

  if (loadingRoles) {
    return (
      <div className="min-h-screen bg-background-light">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <DashboardHeader title="Creator Studio" subtitle="Manage your courses and students" />
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-orange-100 rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-orange-50 rounded-xl" />
                ))}
              </div>
              <div className="h-64 bg-orange-50 rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="Creator Studio"
            subtitle="Manage your courses and students"
          />

          {/* Onboarding Banner */}
          {!loadingOnboarding && !hasCompletedOnboarding && (
            <Link
              href="/creator/onboarding"
              className="mb-6 block bg-gradient-to-r from-dash-primary to-orange-400 rounded-2xl p-6 text-white hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">Get Matched with Students</h3>
                  <p className="text-white/80 text-sm mt-0.5">Complete your teaching profile and let AI match you with ideal students</p>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Students</p>
                  <p className="text-2xl font-bold text-text-light mt-1">
                    {loading ? '—' : totalStudents}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-dash-primary" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Active Courses</p>
                  <p className="text-2xl font-bold text-text-light mt-1">
                    {loading ? '—' : activeCourses}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Upcoming Lessons</p>
                  <p className="text-2xl font-bold text-text-light mt-1">
                    {loading ? '—' : appointments.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-dash-primary" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Rating</p>
                  <p className="text-2xl font-bold text-text-light mt-1">—</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/creator/courses"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-dash-primary text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Course
            </Link>
            <Link
              href="/creator/schedule"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-orange-200 text-dash-primary rounded-lg font-medium hover:bg-orange-50 transition-colors"
            >
              <CalendarDays className="w-5 h-5" />
              View Schedule
            </Link>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-orange-200 text-dash-primary rounded-lg font-medium hover:bg-orange-50 transition-colors">
              <MessageSquare className="w-5 h-5" />
              Message Students
            </button>
          </div>

          {/* AI Teaching Assistant */}
          <CreatorRAGSearch />

          {/* Inbox Preview - Course sign-ups & lesson invites */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-light">Inbox</h2>
              <Link
                href="/creator/inbox"
                className="text-sm text-dash-primary font-medium hover:underline flex items-center gap-1"
              >
                View all
                {unreadCount > 0 && (
                  <span className="bg-dash-primary text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-orange-100 overflow-hidden">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Inbox className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1">Lesson invites and course sign-ups will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-orange-50">
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href="/creator/inbox"
                      className={`block p-4 hover:bg-orange-50/50 transition-colors ${!n.read ? 'bg-orange-50/30' : ''}`}
                    >
                      <p className="font-medium text-text-light">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* My Courses */}
            <section className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-orange-50">
                <h2 className="text-lg font-semibold text-text-light">My Courses</h2>
              </div>
              <div className="p-6">
                {loading ? (
                  <p className="text-gray-500">Loading courses…</p>
                ) : courses.length === 0 ? (
                  <p className="text-gray-500">No courses yet.</p>
                ) : (
                  <div className="space-y-4">
                    {courses.slice(0, 5).map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-background-light border border-orange-50"
                      >
                        <div>
                          <p className="font-medium text-text-light">{course.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {course.currentStudents} / {course.maxStudents} students
                          </p>
                        </div>
                        <Link
                          href={`/creator/courses?edit=${course.id}`}
                          className="p-2 text-dash-primary hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit course"
                        >
                          <Pencil className="w-5 h-5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {courses.length > 0 && (
                  <Link
                    href="/creator/courses"
                    className="block mt-4 text-dash-primary font-medium hover:underline"
                  >
                    View all courses →
                  </Link>
                )}
              </div>
            </section>

            {/* Upcoming Lessons */}
            <section className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-orange-50">
                <h2 className="text-lg font-semibold text-text-light">Upcoming Lessons</h2>
              </div>
              <div className="p-6">
                {loading ? (
                  <p className="text-gray-500">Loading appointments…</p>
                ) : upcomingLessons.length === 0 ? (
                  <p className="text-gray-500">No upcoming lessons.</p>
                ) : (
                  <ul className="space-y-4">
                    {upcomingLessons.map((apt) => (
                      <li
                        key={apt.id}
                        className="flex items-start justify-between p-4 rounded-lg bg-background-light border border-orange-50"
                      >
                        <div>
                          <p className="font-medium text-text-light">{apt.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {apt.studentName} · {apt.date} · {apt.time}
                          </p>
                          <span
                            className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                              apt.status === 'scheduled'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {appointments.length > 0 && (
                  <Link
                    href="/creator/schedule"
                    className="block mt-4 text-dash-primary font-medium hover:underline"
                  >
                    View full schedule →
                  </Link>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
