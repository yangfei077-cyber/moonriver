'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useUserContext } from '@/contexts/UserContext';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar,
  Link2,
  RefreshCw,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
} from 'date-fns';

interface Appointment {
  id: number;
  studentName: string;
  studentEmail: string;
  title: string;
  date: string;
  time: string;
  status: string;
  startTime?: string;
}

interface Course {
  id: string;
  title: string;
  enrollments?: { studentEmail: string; studentName: string }[];
}

export default function CreatorSchedulePage() {
  const { user, displayName } = useUserContext();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    studentEmail: '',
    studentName: '',
    title: '',
    date: '',
    time: '',
    notes: '',
    courseId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const userEmail = user?.email || '';
  const userName = displayName || user?.name || user?.email || '';

  const [googleEvents, setGoogleEvents] = useState<Appointment[]>([]);

  const fetchData = async () => {
    try {
      const opts = { credentials: 'include' as RequestCredentials };
      const [aptRes, coursesRes, statusRes] = await Promise.all([
        fetch('/api/appointments?role=creator', opts),
        fetch('/api/courses?creatorOnly=true', opts),
        fetch('/api/google-calendar/status', opts),
      ]);
      const aptData = await aptRes.json();
      const coursesData = await coursesRes.json();
      const statusData = await statusRes.json();
      if (aptData.success) setAppointments(aptData.appointments || []);
      if (coursesData.success) setCourses(coursesData.courses || []);
      const connected = statusData.connected || false;
      setCalendarConnected(connected);

      // Auto-sync and fetch Google events if connected
      if (connected) {
        await fetch('/api/google-calendar/sync', { method: 'POST', credentials: 'include' });
        // Re-fetch appointments after sync
        const freshRes = await fetch('/api/appointments?role=creator', { credentials: 'include' });
        const freshData = await freshRes.json();
        if (freshData.success) setAppointments(freshData.appointments || []);
        // Fetch Google Calendar events
        try {
          const evtRes = await fetch('/api/google-calendar/events', { credentials: 'include' });
          if (evtRes.ok) {
            const evtData = await evtRes.json();
            setGoogleEvents(evtData.appointments || []);
          }
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-open modal if student info is passed from matches page
  useEffect(() => {
    const studentEmail = searchParams.get('studentEmail');
    const studentName = searchParams.get('studentName');
    if (studentEmail) {
      setForm(f => ({
        ...f,
        studentEmail,
        studentName: studentName || studentEmail,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '14:00',
      }));
      setModalOpen(true);
    }
  }, [searchParams]);

  const handleGoogleAuth = () => {
    const returnTo = `${window.location.origin}/creator/schedule?success=calendar_connected`;
    window.location.href = `/api/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/google-calendar/sync', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCalendarConnected(true);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const allEvents = [...appointments, ...googleEvents.filter(
    (ge) => !appointments.some((a: any) => a.googleEventId === ge.id.toString() || a.id.toString() === ge.id.toString())
  )];

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allEvents.filter((a) => a.date === dateStr);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const resetForm = () => {
    setForm({
      studentEmail: '',
      studentName: '',
      title: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '14:00',
      notes: '',
      courseId: '',
    });
    setModalOpen(false);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          creatorEmail: userEmail,
          creatorName: userName,
          studentEmail: form.studentEmail,
          studentName: form.studentName,
          title: form.title,
          date: form.date,
          time: form.time,
          notes: form.notes,
          courseId: form.courseId || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        fetchData();
      } else {
        alert(data.error || 'Failed to create appointment');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const studentsList = Array.from(
    new Map(
      courses.flatMap((c) =>
        (c.enrollments || []).map((e) => [e.studentEmail, e.studentName] as const)
      )
    ).entries()
  ).map(([email, name]) => ({ email, name }));

  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="Schedule"
            subtitle="Manage your lessons and appointments"
          />

          {/* Connect error banner */}
          {searchParams.get('error') === 'connect_failed' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-medium text-red-800">Google Calendar 连接失败</p>
              {searchParams.get('error_detail') === 'refresh_token_not_issued' ? (
                <p className="text-sm text-red-600 mt-1">
                  Auth0 未返回 refresh token。请在 Auth0 Dashboard → Applications → 你的应用 → Advanced Settings → Grant Types 中勾选 <strong>Refresh Token</strong>，并确认 AUTH0_SCOPE 包含 <code>offline_access</code>。
                </p>
              ) : (
                <p className="text-sm text-red-600 mt-1">
                  请查看终端 (npm run dev) 的日志获取详细错误。若为开发环境，可查看浏览器地址栏的 error_detail 参数。
                </p>
              )}
              {searchParams.get('error_detail') && searchParams.get('error_detail') !== 'refresh_token_not_issued' && (
                <p className="text-xs text-red-500 mt-2 font-mono break-all">{searchParams.get('error_detail')}</p>
              )}
            </div>
          )}

          {/* Google Calendar */}
          {!calendarConnected ? (
            <div className="mb-6 p-4 bg-white rounded-xl border border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-dash-primary" />
                <div>
                  <p className="font-medium text-text-light">Google Calendar</p>
                  <p className="text-sm text-gray-500">Not connected</p>
                </div>
              </div>
              <button
                onClick={handleGoogleAuth}
                className="inline-flex items-center gap-2 px-4 py-2 bg-dash-primary text-white rounded-lg font-medium hover:bg-orange-600"
              >
                <Link2 className="w-4 h-4" />
                Connect Google Calendar
              </button>
            </div>
          ) : googleEvents.length > 0 ? (
            <div className="mb-6 bg-white rounded-xl border border-orange-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-dash-primary" />
                  <h3 className="font-semibold text-text-light text-sm">Google Calendar Events</h3>
                </div>
                <span className="text-xs text-green-600 font-medium">Connected</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {googleEvents.slice(0, 6).map((evt) => (
                  <div key={evt.id} className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                    <p className="text-sm font-medium text-text-light truncate">{evt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{evt.date} · {evt.time}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-orange-50">
                <h2 className="text-lg font-semibold text-text-light">Month View</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 text-gray-500 hover:text-dash-primary hover:bg-orange-50 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 font-medium text-text-light min-w-[140px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 text-gray-500 hover:text-dash-primary hover:bg-orange-50 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const dayApts = getAppointmentsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[80px] p-2 rounded-lg border ${
                          isCurrentMonth ? 'bg-white border-orange-50' : 'bg-gray-50/50 border-gray-100'
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            isCurrentMonth ? 'text-text-light' : 'text-gray-400'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {dayApts.slice(0, 3).map((apt) => (
                            <div
                              key={apt.id}
                              className="w-2 h-2 rounded-full bg-dash-primary"
                              title={`${apt.title} - ${apt.studentName}`}
                            />
                          ))}
                          {dayApts.length > 3 && (
                            <span className="text-xs text-gray-400">+{dayApts.length - 3}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Upcoming appointments */}
            <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-orange-50">
                <h2 className="text-lg font-semibold text-text-light">Upcoming</h2>
                <button
                  onClick={() => {
                    setForm({
                      studentEmail: '',
                      studentName: '',
                      title: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      time: '14:00',
                      notes: '',
                      courseId: '',
                    });
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-dash-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto">
                {loading ? (
                  <p className="text-gray-500">Loading…</p>
                ) : appointments.length === 0 ? (
                  <p className="text-gray-500">No upcoming appointments.</p>
                ) : (
                  <ul className="space-y-3">
                    {appointments.map((apt) => (
                      <li
                        key={apt.id}
                        className="p-4 rounded-lg bg-background-light border border-orange-50"
                      >
                        <p className="font-medium text-text-light">{apt.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{apt.studentName}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {apt.date} · {apt.time}
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* New Appointment Modal */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-orange-50">
                  <h2 className="text-lg font-semibold text-text-light">New Appointment</h2>
                  <button
                    onClick={resetForm}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-orange-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                    {studentsList.length > 0 ? (
                      <select
                        value={form.studentEmail}
                        onChange={(e) => {
                          const val = e.target.value;
                          const student = studentsList.find((s) => s.email === val);
                          setForm((f) => ({
                            ...f,
                            studentEmail: val,
                            studentName: student?.name || val,
                          }));
                        }}
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      >
                        <option value="">Select student</option>
                        {studentsList.map((s) => (
                          <option key={s.email} value={s.email}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="email"
                          required
                          value={form.studentEmail}
                          onChange={(e) => setForm((f) => ({ ...f, studentEmail: e.target.value }))}
                          placeholder="Student email"
                          className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                        />
                        <input
                          type="text"
                          required
                          value={form.studentName}
                          onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                          placeholder="Student name"
                          className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      placeholder="e.g. Guitar Lesson"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={form.date || format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={form.time || '14:00'}
                        onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course (optional)</label>
                    <select
                      value={form.courseId}
                      onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                    >
                      <option value="">None</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 px-4 py-2.5 border border-orange-200 text-dash-primary rounded-lg font-medium hover:bg-orange-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 bg-dash-primary text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-60"
                    >
                      {submitting ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
