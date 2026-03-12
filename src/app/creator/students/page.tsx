'use client';

import { useEffect, useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { Users, Search, Music } from 'lucide-react';

interface Enrollment {
  studentEmail: string;
  studentName: string;
  progress?: number;
  profileImage?: string;
  interests?: string[];
}

interface Course {
  id: string;
  title: string;
  enrollments?: Enrollment[];
}

interface StudentCard {
  studentEmail: string;
  studentName: string;
  profileImage?: string;
  interests: string[];
  courses: { title: string; progress: number }[];
  avgProgress: number;
}

export default function CreatorStudentsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
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
    fetchCourses();
  }, []);

  const students = useMemo<StudentCard[]>(() => {
    const map = new Map<string, StudentCard>();
    for (const course of courses) {
      for (const e of course.enrollments || []) {
        const existing = map.get(e.studentEmail);
        const courseEntry = { title: course.title, progress: e.progress || 0 };
        if (existing) {
          existing.courses.push(courseEntry);
          existing.avgProgress =
            existing.courses.reduce((s, c) => s + c.progress, 0) / existing.courses.length;
        } else {
          map.set(e.studentEmail, {
            studentEmail: e.studentEmail,
            studentName: e.studentName,
            profileImage: e.profileImage,
            interests: e.interests || [],
            courses: [courseEntry],
            avgProgress: e.progress || 0,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [courses]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentEmail.toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="My Students"
            subtitle="Students enrolled in your courses"
          />

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-10 pr-4 py-2.5 border border-orange-200 rounded-lg focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading students…</p>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-orange-100 p-12 text-center">
              <Users className="w-16 h-16 text-orange-200 mx-auto mb-4" />
              <p className="text-gray-500">
                {search ? 'No students match your search.' : 'No students enrolled in your courses yet.'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => (
                <div
                  key={student.studentEmail}
                  className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center shrink-0 overflow-hidden">
                        {student.profileImage ? (
                          <img
                            src={student.profileImage}
                            alt={student.studentName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-semibold text-dash-primary">
                            {student.studentName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-text-light truncate">
                          {student.studentName}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{student.studentEmail}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">Enrolled courses</p>
                      <ul className="space-y-1">
                        {student.courses.map((c) => (
                          <li key={c.title} className="flex items-center justify-between text-sm">
                            <span className="text-text-light truncate">{c.title}</span>
                            <span className="text-dash-primary font-medium shrink-0 ml-2">
                              {c.progress}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Overall progress</span>
                        <span>{Math.round(student.avgProgress)}%</span>
                      </div>
                      <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-dash-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, student.avgProgress)}%` }}
                        />
                      </div>
                    </div>
                    {student.interests.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {student.interests.slice(0, 4).map((interest) => (
                          <span
                            key={interest}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800"
                          >
                            <Music className="w-3 h-3" />
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
