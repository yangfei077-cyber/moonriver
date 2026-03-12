'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useUserContext } from '@/contexts/UserContext';
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Calendar,
  DollarSign,
  Search,
  Loader2,
  UserPlus,
  BookMarked,
  Download,
  Sparkles,
} from 'lucide-react';

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  colorClass: string;
}

function StatCard({ icon: Icon, value, label, colorClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6 text-dash-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text-light">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

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
                j % 2 === 1 ? <strong key={j} className="font-semibold text-text-light">{part}</strong> : part
              )}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-text-light">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const isTableRow = (l: string) => /^\s*\|.+\|\s*$/.test(l) && !/^[\s|:-]+$/.test(l.trim());
  const isTableDivider = (l: string) => /^[\s|:-]+$/.test(l.trim()) && l.includes('|');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.match(/^[-*]\s/)) {
      listItems.push(trimmed);
      i++;
      continue;
    }

    flushList();

    if (isTableRow(trimmed)) {
      const tableRows: string[][] = [];
      while (i < lines.length) {
        if (isTableDivider(lines[i])) {
          i++;
          continue;
        }
        if (!isTableRow(lines[i])) break;
        const cells = lines[i].split('|').map((c) => c.trim()).filter(Boolean);
        tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 0) {
        elements.push(
          <div key={key++} className="my-3 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-orange-200">
                  {tableRows[0].map((h, j) => (
                    <th key={j} className="text-left py-2 px-3 font-medium text-text-light">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-orange-100 last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 text-gray-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (trimmed) {
      elements.push(
        <p key={key++} className="my-1.5 text-gray-700">
          {renderInline(trimmed)}
        </p>
      );
    } else {
      elements.push(<br key={key++} />);
    }
    i++;
  }
  flushList();

  return <div className="prose prose-sm max-w-none">{elements}</div>;
}

interface Appointment {
  id: number;
  studentName: string;
  creatorName: string;
  title: string;
  date: string;
  time: string;
  status: string;
}

interface PlatformUser {
  name: string;
  email: string;
  type: string;
  roles?: string[];
}

const QUICK_SUGGESTIONS = [
  'All appointments this week',
  'Student enrollments',
  'Creator performance',
  'Course statistics',
  'Recent cancellations',
];

export default function AdminDashboardPage() {
  const { displayName, user, roles } = useUserContext();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCreators: 0,
    activeCourses: 0,
    totalEnrollments: 0,
    activeAppointments: 0,
    revenue: '$12,450',
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [query, setQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoadingStats(true);
      const [statsRes, appointmentsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/appointments?all=true'),
        fetch('/api/users'),
      ]);

      const statsData = statsRes.ok ? await statsRes.json() : {};
      const appointmentsData = appointmentsRes.ok ? await appointmentsRes.json() : { appointments: [] };
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

      const apts = appointmentsData.appointments || [];
      const allUsers = usersData.users || [];

      if (statsData.success && statsData.stats) {
        setStats({
          totalStudents: statsData.stats.totalStudents ?? 0,
          totalCreators: statsData.stats.totalCreators ?? 0,
          activeCourses: statsData.stats.activeCourses ?? 0,
          totalEnrollments: statsData.stats.totalEnrollments ?? 0,
          activeAppointments: statsData.stats.activeAppointments ?? 0,
          revenue: statsData.stats.revenue ?? '$12,450',
        });
      }

      setAppointments(apts.slice(-8).reverse());
      setUsers(allUsers.slice(0, 6));
    } catch {
      setStats((s) => ({ ...s, revenue: '$12,450' }));
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q || aiLoading) return;

    setQuery('');
    setConversation((prev) => [...prev, { role: 'user', content: q }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          userRoles: roles.length ? roles : ['Admin'],
          userInfo: { name: displayName || user?.name, email: user?.email },
        }),
      });

      const data = await res.json();
      const responseText = data.response || data.error || 'Sorry, I could not process your request.';
      setConversation((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch {
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', content: 'An error occurred. Please try again.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="Admin Command Center"
            subtitle="Full platform oversight with AI-powered search"
          />

          {/* Section 1: Platform Statistics */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-text-light mb-4">Platform Statistics</h2>
            {loadingStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 bg-orange-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                  icon={GraduationCap}
                  value={stats.totalStudents}
                  label="Total Students"
                  colorClass="bg-orange-50"
                />
                <StatCard
                  icon={Users}
                  value={stats.totalCreators}
                  label="Total Creators"
                  colorClass="bg-amber-50"
                />
                <StatCard
                  icon={BookOpen}
                  value={stats.activeCourses}
                  label="Active Courses"
                  colorClass="bg-orange-50"
                />
                <StatCard
                  icon={ClipboardList}
                  value={stats.totalEnrollments}
                  label="Total Enrollments"
                  colorClass="bg-amber-50"
                />
                <StatCard
                  icon={Calendar}
                  value={stats.activeAppointments}
                  label="Active Appointments"
                  colorClass="bg-orange-50"
                />
                <StatCard
                  icon={DollarSign}
                  value={stats.revenue}
                  label="Revenue"
                  colorClass="bg-amber-50"
                />
              </div>
            )}
          </section>

          {/* Section 2: RAG AI Search */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-text-light mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-dash-primary" />
              AI-Powered Search
            </h2>
            <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-orange-50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search anything... e.g., 'Show me all appointments for student Alex' or 'Which courses have the most enrollments?'"
                    className="flex-1 px-4 py-3 rounded-xl border border-orange-200 focus:border-dash-primary focus:ring-2 focus:ring-dash-primary/20 outline-none transition-all text-text-light placeholder:text-gray-400"
                  />
                  <button
                    onClick={() => handleSearch()}
                    disabled={aiLoading || !query.trim()}
                    className="px-6 py-3 bg-dash-primary text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    Search
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSearch(suggestion)}
                      disabled={aiLoading}
                      className="px-3 py-1.5 text-sm rounded-lg bg-orange-50 text-dash-primary hover:bg-orange-100 transition-colors disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-[280px] max-h-[400px] overflow-y-auto p-4 space-y-4">
                {conversation.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Sparkles className="w-12 h-12 mb-3 text-orange-200" />
                    <p className="text-center max-w-md">
                      Ask anything about your platform. Try &quot;Show me all appointments for student Alex&quot; or
                      &quot;Which courses have the most enrollments?&quot;
                    </p>
                  </div>
                ) : (
                  conversation.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-dash-primary text-white'
                            : 'bg-orange-50 text-text-light border border-orange-100'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p className="text-sm">{msg.content}</p>
                        ) : (
                          <MarkdownContent content={msg.content} />
                        )}
                      </div>
                    </div>
                  ))
                )}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-dash-primary" />
                      <span className="text-sm text-gray-500">Searching...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Recent Activity */}
          <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-text-light mb-4">Latest Appointments</h2>
              <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
                {appointments.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No appointments yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-orange-50/50 border-b border-orange-100">
                          <th className="text-left py-3 px-4 font-medium text-text-light">Student</th>
                          <th className="text-left py-3 px-4 font-medium text-text-light">Creator</th>
                          <th className="text-left py-3 px-4 font-medium text-text-light">Course</th>
                          <th className="text-left py-3 px-4 font-medium text-text-light">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-text-light">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((apt) => (
                          <tr
                            key={apt.id}
                            className="border-b border-orange-50 last:border-0 hover:bg-orange-50/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-gray-700">{apt.studentName}</td>
                            <td className="py-3 px-4 text-gray-700">{apt.creatorName}</td>
                            <td className="py-3 px-4 text-gray-700">{apt.title}</td>
                            <td className="py-3 px-4 text-gray-600">{apt.date}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  apt.status === 'confirmed' || apt.status === 'scheduled'
                                    ? 'bg-green-100 text-green-800'
                                    : apt.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {apt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-light mb-4">User Management</h2>
              <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No users loaded</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-orange-50">
                    {users.map((u, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between px-4 py-3 hover:bg-orange-50/30 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-text-light">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.type === 'creator' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {u.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Quick Actions */}
          <section>
            <h2 className="text-lg font-semibold text-text-light mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button className="flex items-center gap-2 px-6 py-3 bg-dash-primary text-white rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-sm">
                <Users className="w-5 h-5" />
                Manage Users
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-white border border-orange-200 text-dash-primary rounded-xl font-medium hover:bg-orange-50 transition-colors">
                <BookMarked className="w-5 h-5" />
                View All Courses
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-white border border-orange-200 text-dash-primary rounded-xl font-medium hover:bg-orange-50 transition-colors">
                <Download className="w-5 h-5" />
                Export Data
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
