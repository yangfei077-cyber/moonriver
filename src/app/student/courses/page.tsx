'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import {
  Music,
  Loader2,
  UserPlus,
  UserMinus,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  creatorName: string;
  creatorEmail: string;
  image: string;
  category: string;
  level: string;
  duration: string;
  price: number;
  progress?: number;
  isEnrolled?: boolean;
  canEnroll?: boolean;
}

type Tab = 'my' | 'browse';

function StudentCoursesContent() {
  const searchParams = useSearchParams();
  const courseIdFromUrl = searchParams.get('courseId');
  const instructorFilter = searchParams.get('instructor');
  const courseCardRef = useRef<HTMLDivElement | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [filters, setFilters] = useState<{ levels: string[]; categories: string[] }>({
    levels: [],
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(courseIdFromUrl || instructorFilter ? 'browse' : 'my');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (levelFilter) params.set('level', levelFilter);
      const res = await fetch(`/api/courses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      setCourses(data.courses || []);
      setFilters(data.filters || { levels: [], categories: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [categoryFilter, levelFilter]);

  // When landing with courseId from notification, switch to correct tab and scroll to course
  useEffect(() => {
    if (!courseIdFromUrl || loading || courses.length === 0) return;
    const course = courses.find((c) => c.id === courseIdFromUrl);
    if (!course) return;
    setTab(course.isEnrolled ? 'my' : 'browse');
  }, [courseIdFromUrl, loading, courses]);

  useEffect(() => {
    if (courseIdFromUrl && !loading && courses.length > 0) {
      const course = courses.find((c) => c.id === courseIdFromUrl);
      if (course) {
        setTimeout(() => courseCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      }
    }
  }, [courseIdFromUrl, loading, courses, tab]);

  const enrolledCourses = courses.filter((c) => c.isEnrolled);
  const browseCourses = courses.filter((c) => {
    if (c.isEnrolled) return false;
    if (instructorFilter) return c.creatorEmail === instructorFilter;
    return true;
  });

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollingId(courseId);
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll', courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enroll failed');
      await fetchCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enroll failed');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleUnenroll = async (courseId: string) => {
    try {
      setEnrollingId(courseId);
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unenroll', courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unenroll failed');
      await fetchCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unenroll failed');
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="min-h-screen bg-background-light">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <DashboardHeader title="My Courses" subtitle="Manage your enrollments and discover new courses." />
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
            title={instructorFilter ? 'Instructor Courses' : 'My Courses'}
            subtitle={instructorFilter ? `Courses by your matched instructor` : 'Manage your enrollments and discover new courses.'}
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab('my')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tab === 'my'
                  ? 'bg-dash-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-orange-50 border border-orange-100'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => setTab('browse')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                tab === 'browse'
                  ? 'bg-dash-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-orange-50 border border-orange-100'
              }`}
            >
              Browse All
            </button>
          </div>

          {tab === 'browse' && (
            <div className="flex flex-wrap gap-2 mb-6">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-orange-200 bg-white text-sm"
              >
                <option value="">All Categories</option>
                {filters.categories.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-orange-200 bg-white text-sm"
              >
                <option value="">All Levels</option>
                {filters.levels.map((l: string) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          )}

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tab === 'my' ? enrolledCourses : browseCourses).map((course) => (
              <div
                key={course.id}
                ref={courseIdFromUrl === course.id ? courseCardRef : undefined}
                className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                  courseIdFromUrl === course.id ? 'border-dash-primary ring-2 ring-dash-primary/30' : 'border-orange-100'
                }`}
              >
                <div className="aspect-video bg-gray-100 relative">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-dash-primary/90 text-white text-xs font-medium rounded">
                    {course.level}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-dash-primary font-medium uppercase tracking-wide">
                    {course.category}
                  </p>
                  <h3 className="font-semibold text-text-light mt-1">{course.title}</h3>
                  <p className="text-sm text-gray-500">{course.creatorName}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{course.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-dash-primary">${course.price}</span>
                    <span className="text-xs text-gray-500">{course.duration}</span>
                  </div>
                  {tab === 'my' && (
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
                  )}
                  <div className="mt-4">
                    {course.isEnrolled ? (
                      <button
                        onClick={() => handleUnenroll(course.id)}
                        disabled={enrollingId === course.id}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {enrollingId === course.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                        Unenroll
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={!course.canEnroll || enrollingId === course.id}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-dash-primary text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {enrollingId === course.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        Enroll
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tab === 'my' && enrolledCourses.length === 0 && !loading && (
            <div className="text-center py-16 bg-white rounded-xl border border-orange-100">
              <Music className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-2">You haven&apos;t enrolled in any courses yet.</p>
              <button
                onClick={() => setTab('browse')}
                className="text-dash-primary font-medium hover:underline"
              >
                Browse courses
              </button>
            </div>
          )}

          {tab === 'browse' && browseCourses.length === 0 && !loading && (
            <div className="text-center py-16 bg-white rounded-xl border border-orange-100">
              <p className="text-gray-500">No courses match your filters.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function StudentCoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background-light">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-dash-primary animate-spin" />
          </main>
        </div>
      </div>
    }>
      <StudentCoursesContent />
    </Suspense>
  );
}
