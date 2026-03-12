'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import {
  BarChart3,
  Flame,
  Target,
  Music,
  Loader2,
  TrendingUp,
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

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  courseName: string;
  date: string;
}

// Mock data for skills radar (category breakdown)
const MOCK_SKILLS = [
  { name: 'Guitar', value: 65, color: '#F97316' },
  { name: 'Music Theory', value: 80, color: '#F2B949' },
  { name: 'Piano', value: 25, color: '#FB923C' },
  { name: 'Vocal', value: 40, color: '#FBBF24' },
  { name: 'Composition', value: 55, color: '#EDD377' },
];

// Mock activity feed
const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: '1', type: 'practice', title: 'Completed chord exercises', courseName: 'Guitar Fundamentals', date: '2 hours ago' },
  { id: '2', type: 'lesson', title: 'Attended Music Theory session', courseName: 'Music Theory Essentials', date: 'Yesterday' },
  { id: '3', type: 'practice', title: 'Practiced scales for 30 min', courseName: 'Guitar Fundamentals', date: '2 days ago' },
  { id: '4', type: 'milestone', title: 'Reached 60% in Music Theory', courseName: 'Music Theory Essentials', date: '3 days ago' },
  { id: '5', type: 'lesson', title: 'Jazz Improv lesson', courseName: 'Jazz Improvisation Workshop', date: '4 days ago' },
];

export default function StudentProgressPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/courses');
        if (!res.ok) throw new Error('Failed to fetch courses');
        const data = await res.json();
        setCourses(data.courses?.filter((c: Course) => c.isEnrolled) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const practiceStreak = 7; // mock
  const totalPracticeHours = 24; // mock

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <DashboardHeader title="Progress" subtitle="Track your learning journey." />
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
            title="Progress"
            subtitle="Track your learning journey."
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Practice Streak */}
          <section className="mb-8">
            <div className="bg-gradient-to-r from-dash-primary to-primary rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <Flame className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{practiceStreak} day streak</p>
                    <p className="text-white/90 mt-1">Keep it up! You&apos;re on fire.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{totalPracticeHours}h</p>
                  <p className="text-sm text-white/80">Total practice this month</p>
                </div>
              </div>
            </div>
          </section>

          {/* Course Progress Cards */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-light mb-4">Course Progress</h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-xl border border-orange-100 p-12 text-center text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Enroll in courses to track your progress.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl border border-orange-100 p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={course.image}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-light truncate">{course.title}</h3>
                        <p className="text-sm text-gray-500">{course.creatorName}</p>
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium text-dash-primary">{course.progress ?? 0}%</span>
                          </div>
                          <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-dash-primary rounded-full transition-all"
                              style={{ width: `${course.progress ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {/* Circular progress alternative - small indicator */}
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#FED7AA"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#F97316"
                            strokeWidth="3"
                            strokeDasharray={`${(course.progress ?? 0) / 100 * 100}, 100`}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-dash-primary">
                          {course.progress ?? 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Skills Radar / Breakdown */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-text-light mb-4">Skills by Category</h2>
            <div className="bg-white rounded-xl border border-orange-100 p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {MOCK_SKILLS.map((skill) => (
                    <div key={skill.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-text-light">{skill.name}</span>
                        <span className="text-dash-primary">{skill.value}%</span>
                      </div>
                      <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${skill.value}%`, backgroundColor: skill.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {[20, 40, 60, 80].map((r) => (
                        <circle
                          key={r}
                          cx="50"
                          cy="50"
                          r={r}
                          fill="none"
                          stroke="#FED7AA"
                          strokeWidth="0.5"
                        />
                      ))}
                      {MOCK_SKILLS.map((skill, i) => {
                        const angle = (i / MOCK_SKILLS.length) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const radius = 35 * (skill.value / 100);
                        const x = 50 + radius * Math.cos(rad);
                        const y = 50 + radius * Math.sin(rad);
                        return (
                          <g key={skill.name}>
                            <line
                              x1="50"
                              y1="50"
                              x2={String(x)}
                              y2={String(y)}
                              stroke={skill.color}
                              strokeWidth="2"
                              opacity="0.8"
                            />
                            <circle cx={String(x)} cy={String(y)} r="6" fill={skill.color} />
                            <text
                              x={String(x)}
                              y={String(y)}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="5"
                              fill="white"
                              fontWeight="bold"
                            >
                              {skill.value}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <h2 className="text-xl font-semibold text-text-light mb-4">Recent Activity</h2>
            <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
              {MOCK_ACTIVITIES.map((activity, idx) => (
                <div
                  key={activity.id}
                  className={`flex items-center gap-4 p-4 ${
                    idx < MOCK_ACTIVITIES.length - 1 ? 'border-b border-orange-100' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-dash-primary/10 flex items-center justify-center flex-shrink-0">
                    {activity.type === 'practice' ? (
                      <Music className="w-5 h-5 text-dash-primary" />
                    ) : activity.type === 'milestone' ? (
                      <Target className="w-5 h-5 text-dash-primary" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-dash-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-light">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.courseName}</p>
                  </div>
                  <span className="text-sm text-gray-400 flex-shrink-0">{activity.date}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
