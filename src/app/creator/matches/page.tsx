'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useUserContext } from '@/contexts/UserContext';
import { Heart, Star, Music, MessageSquare, Sparkles, GraduationCap, Send, X, Loader2, BookOpen } from 'lucide-react';

interface Match {
  id: string;
  compatibilityScore: number;
  reasons: string[];
  matchProfile: {
    name: string;
    email: string;
    image: string;
    bio: string;
    instruments: string[];
    genres: string[];
    skillLevel: string | null;
  };
}

interface Course {
  id: string;
  title: string;
  level: string;
  currentStudents: number;
  maxStudents: number;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-text-light">{score}%</span>
      </div>
    </div>
  );
}

export default function CreatorMatchesPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState<{ match: Match } | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses?creatorOnly=true');
      const data = await res.json();
      if (data.success) setCourses(data.courses || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMatches = async (refresh = false) => {
    if (!user?.email) return;
    setLoading(true);

    try {
      const url = `/api/matches?email=${encodeURIComponent(user.email)}&role=Creator${refresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.needsOnboarding) {
        router.push('/creator/onboarding');
        return;
      }
      setMatches(data.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, [user?.email]);
  useEffect(() => { fetchCourses(); }, [user?.email]);
  useEffect(() => { if (inviteModal) fetchCourses(); }, [inviteModal]);

  const handleInviteToCourse = async () => {
    if (!inviteModal || !selectedCourseId || !user?.email) return;
    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course) return;
    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          recipientEmail: inviteModal.match.matchProfile.email,
          type: 'course_invite',
          title: 'Course invitation',
          message: `${user.name || user.email} invited you to join their course "${course.title}".`,
          metadata: {
            courseId: course.id,
            courseTitle: course.title,
            creatorEmail: user.email,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setInviteModal(null);
      setSelectedCourseId(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const openInviteModal = (match: Match) => {
    setInviteModal({ match });
    setSelectedCourseId(null);
  };

  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="Student Matches"
            subtitle="AI-matched students based on your teaching profile"
          />

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-orange-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 mx-auto text-orange-200 mb-4" />
              <h3 className="text-xl font-semibold text-text-light mb-2">No matches yet</h3>
              <p className="text-gray-500 mb-6">We need more students to match you with. Check back soon!</p>
              <Link
                href="/creator/onboarding"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-dash-primary text-white rounded-xl font-medium hover:bg-orange-600"
              >
                <Sparkles className="w-4 h-4" />
                Update Your Profile
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {matches.map((match, index) => (
                <div
                  key={match.id}
                  className="bg-white rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all p-6"
                >
                  <div className="flex gap-6">
                    <ScoreRing score={match.compatibilityScore} />

                    <div className="flex-1 min-w-0">
                      <div>
                        {index === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold mb-2">
                            <Star className="w-3 h-3" /> Best Match
                          </span>
                        )}
                        <h3 className="text-xl font-bold text-text-light">{match.matchProfile.name}</h3>
                        {match.matchProfile.skillLevel && (
                          <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {match.matchProfile.skillLevel}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {match.matchProfile.instruments.slice(0, 4).map(i => (
                          <span key={i} className="px-2.5 py-1 bg-orange-50 text-dash-primary rounded-full text-xs font-medium">
                            {i}
                          </span>
                        ))}
                        {match.matchProfile.genres.slice(0, 3).map(g => (
                          <span key={g} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                            {g}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 space-y-1.5">
                        {match.reasons.map((reason, i) => (
                          <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <Heart className="w-3.5 h-3.5 text-dash-primary mt-0.5 flex-shrink-0" />
                            {reason}
                          </p>
                        ))}
                      </div>

                      {match.matchProfile.bio && (
                        <p className="mt-3 text-sm text-gray-500 line-clamp-2">{match.matchProfile.bio}</p>
                      )}

                      <div className="flex gap-3 mt-4">
                        {courses.length === 0 ? (
                          <Link
                            href="/creator/courses"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-dash-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                          >
                            <Music className="w-4 h-4" />
                            Invite to Course
                          </Link>
                        ) : (
                          <button
                            onClick={() => openInviteModal(match)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-dash-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                          >
                            <Music className="w-4 h-4" />
                            Invite to Course
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invite to Course Modal */}
          {inviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-orange-50">
                  <h2 className="text-lg font-semibold text-text-light">Invite to Course</h2>
                  <button
                    onClick={() => { setInviteModal(null); setSelectedCourseId(null); }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-orange-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Select a course to invite <span className="font-medium text-text-light">{inviteModal.match.matchProfile.name}</span> to:
                  </p>
                  {courses.length === 0 ? (
                    <p className="text-gray-500 py-4">No courses yet. Create a course first.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {courses.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => setSelectedCourseId(course.id)}
                          className={`w-full text-left p-4 rounded-lg border transition-colors ${
                            selectedCourseId === course.id
                              ? 'border-dash-primary bg-orange-50'
                              : 'border-orange-100 hover:bg-orange-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-dash-primary" />
                            <div>
                              <p className="font-medium text-text-light">{course.title}</p>
                              <p className="text-xs text-gray-500">
                                {course.level} · {course.currentStudents}/{course.maxStudents} students
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setInviteModal(null); setSelectedCourseId(null); }}
                      className="flex-1 px-4 py-2.5 border border-orange-200 text-dash-primary rounded-lg font-medium hover:bg-orange-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInviteToCourse}
                      disabled={!selectedCourseId || sending}
                      className="flex-1 px-4 py-2.5 bg-dash-primary text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send Invite
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
