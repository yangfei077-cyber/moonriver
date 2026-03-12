'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  parse,
  isSameMonth,
  isSameDay,
} from 'date-fns';

interface Appointment {
  id: number;
  title: string;
  creatorName: string;
  creatorEmail: string;
  date: string;
  time: string;
  status: string;
  description?: string;
}

interface Educator {
  id: string;
  email: string;
  name: string;
}

export default function StudentAppointmentsPage() {
  const searchParams = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<Appointment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    date: '',
    time: '14:00',
    creatorEmail: '',
    creatorName: '',
    notes: '',
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    newDate: '',
    newTime: '14:00',
    notes: '',
  });

  const [cancelReason, setCancelReason] = useState('');

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    }
  };

  const fetchEducators = async () => {
    try {
      const res = await fetch('/api/educators');
      if (!res.ok) throw new Error('Failed to fetch educators');
      const data = await res.json();
      setEducators(data.educators || []);
    } catch {
      setEducators([]);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/google-calendar/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected || false);
        return data.connected || false;
      }
    } catch {
      setGoogleConnected(false);
    }
    return false;
  };

  const fetchGoogleEvents = async () => {
    try {
      const res = await fetch('/api/google-calendar/events');
      if (res.ok) {
        const data = await res.json();
        setGoogleEvents(data.appointments || []);
      }
    } catch {
      setGoogleEvents([]);
    }
  };

  const autoSync = async () => {
    try {
      await fetch('/api/google-calendar/sync', { method: 'POST' });
      await Promise.all([fetchAppointments(), fetchGoogleEvents()]);
    } catch {
      // silent fail for auto-sync
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [, , connected] = await Promise.all([fetchAppointments(), fetchEducators(), fetchGoogleStatus()]);
      if (connected) {
        await autoSync();
      }
      setLoading(false);
    };
    load();
  }, []);

  const calendarDays = (() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  })();

  const allEvents = [...appointments, ...googleEvents.filter(
    (ge) => !appointments.some((a: any) => a.googleEventId === ge.id.toString() || a.id.toString() === ge.id.toString())
  )];

  const getAppointmentsForDate = (d: Date) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return allEvents.filter((a) => a.date === dateStr);
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/google-calendar/connect?returnTo=' + encodeURIComponent('/student/appointments?success=calendar_connected');
  };

  const handleSyncGoogle = async () => {
    try {
      const res = await fetch('/api/google-calendar/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      await fetchAppointments();
    } catch {
      setError('Failed to sync');
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.date || !createForm.time) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: createForm.title,
          date: createForm.date,
          time: createForm.time,
          creatorEmail: createForm.creatorEmail || undefined,
          creatorName: createForm.creatorName || undefined,
          notes: createForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setShowCreateModal(false);
      setCreateForm({ title: '', date: '', time: '14:00', creatorEmail: '', creatorName: '', notes: '' });
      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleForm.newDate || !rescheduleForm.newTime) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule',
          appointmentId: selectedAppointment.id,
          newDate: rescheduleForm.newDate,
          newTime: rescheduleForm.newTime,
          notes: rescheduleForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reschedule failed');
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setRescheduleForm({ newDate: '', newTime: '14:00', notes: '' });
      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          appointmentId: selectedAppointment.id,
          reason: cancelReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setSubmitting(false);
    }
  };

  const parseTimeToInput = (timeStr: string): string => {
    const startPart = timeStr?.split('-')[0]?.trim();
    if (!startPart) return '14:00';
    try {
      const d = parse(startPart, 'h:mm a', new Date());
      return format(d, 'HH:mm');
    } catch {
      return '14:00';
    }
  };

  const openReschedule = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setRescheduleForm({
      newDate: apt.date || '',
      newTime: apt.time ? parseTimeToInput(apt.time) : '14:00',
      notes: '',
    });
    setShowRescheduleModal(true);
  };

  const openCancel = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const upcomingAppointments = allEvents
    .filter((a) => a.date >= format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <DashboardHeader title="Schedule" subtitle="Manage your lessons and appointments." />
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-dash-primary animate-spin" />
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
            title="Schedule"
            subtitle="Manage your lessons and appointments."
          />

          {searchParams.get('error') === 'connect_failed' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-medium text-red-800">Google Calendar 连接失败</p>
              {searchParams.get('error_detail') === 'refresh_token_not_issued' ? (
                <p className="text-sm text-red-600 mt-1">
                  Auth0 未返回 refresh token。请在 Auth0 Dashboard → Applications → 你的应用 → Advanced Settings → Grant Types 中勾选 <strong>Refresh Token</strong>，并确认 AUTH0_SCOPE 包含 <code>offline_access</code>。
                </p>
              ) : (
                <p className="text-sm text-red-600 mt-1">请检查 Auth0 配置或查看终端日志。</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Calendar */}
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-orange-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 rounded-lg hover:bg-orange-50 text-gray-600"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold text-text-light min-w-[180px] text-center">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 rounded-lg hover:bg-orange-50 text-gray-600"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-dash-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    New Lesson
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const apts = getAppointmentsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[80px] p-2 rounded-lg border ${
                          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        } ${isToday ? 'border-dash-primary' : 'border-orange-100'}`}
                      >
                        <span className={`text-sm ${isCurrentMonth ? 'text-text-light' : 'text-gray-400'}`}>
                          {format(day, 'd')}
                        </span>
                        {apts.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {apts.slice(0, 2).map(() => (
                              <span
                                key={Math.random()}
                                className="w-1.5 h-1.5 rounded-full bg-dash-primary"
                              />
                            ))}
                            {apts.length > 2 && (
                              <span className="text-[10px] text-gray-500">+{apts.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Google Calendar */}
              <div className="mt-6 bg-white rounded-xl border border-orange-100 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-light">Google Calendar</h3>
                  {googleConnected ? (
                    <span className="text-sm text-green-600 font-medium">Connected</span>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      className="flex items-center gap-2 px-4 py-2 bg-dash-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                    >
                      <Link2 className="w-4 h-4" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="w-full lg:w-80">
              <div className="bg-white rounded-xl border border-orange-100 p-6 shadow-sm sticky top-6">
                <h3 className="font-semibold text-text-light mb-4">Upcoming Events</h3>
                {upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming appointments</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 rounded-lg border border-orange-100 hover:bg-orange-50/50"
                      >
                        <p className="font-medium text-sm text-text-light">{apt.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {apt.date} · {apt.time}
                        </p>
                        <p className="text-xs text-gray-500">{apt.creatorName}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => openReschedule(apt)}
                            className="text-xs text-dash-primary hover:underline"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => openCancel(apt)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-text-light">New Lesson</h3>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateAppointment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={createForm.title}
                      onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                      required
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                      placeholder="e.g. Guitar Lesson"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={createForm.date}
                        onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
                        required
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <input
                        type="time"
                        value={createForm.time}
                        onChange={(e) => setCreateForm((f) => ({ ...f, time: e.target.value }))}
                        required
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                    <select
                      value={createForm.creatorEmail}
                      onChange={(e) => {
                        const edu = educators.find((ed) => ed.email === e.target.value);
                        setCreateForm((f) => ({
                          ...f,
                          creatorEmail: e.target.value,
                          creatorName: edu?.name || '',
                        }));
                      }}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                    >
                      <option value="">Select instructor</option>
                      {educators.map((ed) => (
                        <option key={ed.id} value={ed.email}>
                          {ed.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={createForm.notes}
                      onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                      placeholder="Optional notes"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-dash-primary text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reschedule Modal */}
          {showRescheduleModal && selectedAppointment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-text-light">Reschedule</h3>
                  <button onClick={() => setShowRescheduleModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">{selectedAppointment.title}</p>
                <form onSubmit={handleReschedule} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                      <input
                        type="date"
                        value={rescheduleForm.newDate}
                        onChange={(e) => setRescheduleForm((f) => ({ ...f, newDate: e.target.value }))}
                        required
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Time</label>
                      <input
                        type="time"
                        value={rescheduleForm.newTime}
                        onChange={(e) => setRescheduleForm((f) => ({ ...f, newTime: e.target.value }))}
                        required
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={rescheduleForm.notes}
                      onChange={(e) => setRescheduleForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowRescheduleModal(false)}
                      className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-dash-primary text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Reschedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Cancel Modal */}
          {showCancelModal && selectedAppointment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-text-light">Cancel Appointment</h3>
                  <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">{selectedAppointment.title}</p>
                <form onSubmit={handleCancel} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Keep
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Cancel
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
