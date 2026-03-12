'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useUserContext } from '@/contexts/UserContext';
import {
  Music,
  Clock,
  Calendar,
  Plus,
  ChevronRight,
  BookOpen,
  Sparkles,
  Heart,
  Inbox,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  creatorName: string;
  image: string;
  category: string;
  level: string;
  progress?: number;
  isEnrolled?: boolean;
}

interface Appointment {
  id: number;
  title: string;
  creatorName: string;
  date: string;
  time: string;
  status: string;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const { displayName, hasCompletedOnboarding, loadingOnboarding, isAdmin, loadingRoles } = useUserContext();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!loadingRoles && isAdmin) router.replace('/admin/dashboard');
  }, [loadingRoles, isAdmin, router]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; read: boolean; createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [coursesRes, appointmentsRes, notifRes] = await Promise.all([
          fetch('/api/courses'),
          fetch('/api/appointments'),
          fetch('/api/notifications'),
        ]);

        if (!coursesRes.ok) throw new Error('Failed to fetch courses');
        if (!appointmentsRes.ok) throw new Error('Failed to fetch appointments');

        const coursesData = await coursesRes.json();
        const appointmentsData = await appointmentsRes.json();
        const notifData = notifRes.ok ? await notifRes.json() : { notifications: [], unreadCount: 0 };

        setCourses(coursesData.courses?.filter((c: Course) => c.isEnrolled) || []);
        setAppointments((appointmentsData.appointments || []).slice(0, 3));
        setNotifications((notifData.notifications || []).slice(0, 3));
        setUnreadCount(notifData.unreadCount || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalEnrolled = courses.length;
  const practiceHours = 12; // mock
  const upcomingLessons = appointments.length;

  if (loading || loadingRoles) {
    return (
      <div className="min-h-screen bg-background-light">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <DashboardHeader
              title={`Welcome Back, ${displayName || 'Student'}!`}
              subtitle="Let's make some music today."
            />
            <div className="animate-pulse space-y-6">
              <div className="h-24 bg-orange-100 rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
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
            title={`Welcome Back, ${displayName || 'Student'}!`}
            subtitle="Let's make some music today."
          />

          {/* Onboarding Banner */}
          {!loadingOnboarding && !hasCompletedOnboarding && (
            <Link
              href="/student/onboarding"
              className="mb-6 block bg-gradient-to-r from-dash-primary to-orange-400 rounded-2xl p-6 text-white hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">Find Your Perfect Instructor</h3>
                  <p className="text-white/80 text-sm mt-0.5">Complete your music profile and get AI-matched with the best teachers for you</p>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-dash-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-dash-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-light">{totalEnrolled}</p>
                  <p className="text-sm text-gray-500">Enrolled Courses</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-dash-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-light">{practiceHours}h</p>
                  <p className="text-sm text-gray-500">Practice Hours</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-dash-accent/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-dash-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-light">{upcomingLessons}</p>
                  <p className="text-sm text-gray-500">Upcoming Lessons</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Courses */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-light mb-4">Enrolled Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-xl border border-orange-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-gray-100 relative">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-dash-primary font-medium uppercase tracking-wide">
                      {course.category} · {course.level}
                    </p>
                    <h3 className="font-semibold text-text-light mt-1">{course.title}</h3>
                    <p className="text-sm text-gray-500">{course.creatorName}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{course.progress ?? 0}%</span>
                      </div>
                      <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-dash-primary rounded-full transition-all"
                          style={{ width: `${course.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/student/courses`}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 bg-dash-primary text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
              <Link
                href="/student/courses"
                className="flex flex-col items-center justify-center min-h-[200px] bg-white rounded-xl border-2 border-dashed border-orange-200 hover:border-dash-primary hover:bg-orange-50/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                  <Plus className="w-7 h-7 text-dash-primary" />
                </div>
                <span className="text-dash-primary font-medium">Explore New Courses</span>
              </Link>
            </div>
          </section>

          {/* Inbox Preview */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-light">Inbox</h2>
              <Link
                href="/student/inbox"
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
                  <Link href="/student/matches" className="mt-2 inline-block text-dash-primary font-medium hover:underline text-sm">
                    Invite instructors to lessons
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-orange-50">
                  {notifications.map((n) => (
                    <Link
                      key={n.id}
                      href="/student/inbox"
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

          {/* Upcoming Appointments */}
          <section>
            <h2 className="text-xl font-semibold text-text-light mb-4">Upcoming Appointments</h2>
            {appointments.length === 0 ? (
              <div className="bg-white rounded-xl border border-orange-100 p-8 text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming appointments</p>
                <Link
                  href="/student/appointments"
                  className="mt-2 inline-block text-dash-primary font-medium hover:underline"
                >
                  Schedule a lesson
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white rounded-xl border border-orange-100 p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-dash-primary/10 flex items-center justify-center">
                        <Music className="w-6 h-6 text-dash-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text-light">{apt.title}</p>
                        <p className="text-sm text-gray-500">
                          {apt.creatorName} · {apt.date} at {apt.time}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/student/appointments"
                      className="text-dash-primary hover:text-orange-600 font-medium text-sm"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
