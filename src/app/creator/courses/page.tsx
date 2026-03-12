'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import {
  Plus,
  Pencil,
  X,
  BookOpen,
  Users,
  DollarSign,
  BarChart2,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  price: number;
  maxStudents: number;
  currentStudents: number;
  schedule: string;
  topics?: string[];
}

const CATEGORIES = ['Guitar', 'Piano', 'Vocal', 'Theory', 'Jazz', 'Production', 'Drums', 'Composition'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function CreatorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    level: '',
    duration: '',
    price: '',
    maxStudents: '',
    schedule: '',
    topics: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses?creatorOnly=true');
      const data = await res.json();
      if (data.success) setCourses(data.courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      category: '',
      level: '',
      duration: '',
      price: '',
      maxStudents: '',
      schedule: '',
      topics: '',
    });
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: form.title,
          description: form.description,
          category: form.category,
          level: form.level,
          duration: form.duration,
          price: Number(form.price) || 0,
          maxStudents: Number(form.maxStudents) || 10,
          schedule: form.schedule,
          topics: form.topics ? form.topics.split(',').map((t) => t.trim()) : [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        fetchCourses();
      } else {
        alert(data.error || 'Failed to create course');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="My Courses"
            subtitle="Manage your courses and schedules"
          />

          <div className="mb-6">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-dash-primary text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create New Course
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading courses…</p>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-xl border border-orange-100 p-12 text-center">
              <BookOpen className="w-16 h-16 text-orange-200 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No courses yet. Create your first course to get started.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-dash-primary text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create New Course
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="h-32 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-dash-primary/60" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-text-light">{course.title}</h3>
                      <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        {course.level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-4 mt-4 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        {course.currentStudents}/{course.maxStudents}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        {course.price}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Students</span>
                        <span>
                          {Math.round((course.currentStudents / course.maxStudents) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-dash-primary rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (course.currentStudents / course.maxStudents) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{course.schedule}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Course Modal */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-orange-50">
                  <h2 className="text-lg font-semibold text-text-light">Create New Course</h2>
                  <button
                    onClick={resetForm}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-orange-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      placeholder="e.g. Guitar Fundamentals"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      rows={3}
                      placeholder="Brief course description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      >
                        <option value="">Select</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                      <select
                        value={form.level}
                        onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      >
                        <option value="">Select</option>
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                      <input
                        type="text"
                        value={form.duration}
                        onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                        placeholder="e.g. 8 weeks"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                    <input
                      type="number"
                      min={1}
                      value={form.maxStudents}
                      onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                    <input
                      type="text"
                      value={form.schedule}
                      onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      placeholder="e.g. Tuesdays & Thursdays 6:00-7:30 PM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topics (comma-separated)</label>
                    <input
                      type="text"
                      value={form.topics}
                      onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
                      className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
                      placeholder="e.g. Basic chords, Strumming, Fingerpicking"
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
                      {submitting ? 'Creating…' : 'Create Course'}
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
