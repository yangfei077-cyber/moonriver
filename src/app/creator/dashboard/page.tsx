'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

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
  const { hasCompletedOnboarding, loadingOnboarding } = useUserContext();
  const [courses, setCourses] = useState<Course[]>([]);
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
