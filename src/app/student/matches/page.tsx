'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useUserContext } from '@/contexts/UserContext';
import { Heart, Star, Clock, Music, Calendar, Sparkles, Send, Loader2 } from 'lucide-react';

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
    specialties: string[];
    experience: string;
    rating: number | null;
  };
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

export default function StudentMatchesPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const fetchMatches = async (refresh = false) => {
    if (!user?.email) return;
    setLoading(true);

    try {
      const url = `/api/matches?email=${encodeURIComponent(user.email)}&role=Student${refresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.needsOnboarding) {
        router.push('/student/onboarding');
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

  const handleInviteToLessons = async (match: Match) => {
    if (!user?.email) return;
    setInvitingId(match.id);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          recipientEmail: match.matchProfile.email,
          type: 'lesson_invite',
          title: 'Lesson invitation',
          message: `${user.name || user.email} would like to take lessons with you. They found you through AI matching and are interested in learning from you.`,
          metadata: { matchId: match.id, studentEmail: user.email },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setInvitedIds((prev) => new Set([...prev, match.id]));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background-light">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <DashboardHeader
            title="Your Matches"
            subtitle="AI-matched instructors based on your profile"
          />

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-orange-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 mx-auto text-orange-200 mb-4" />
              <h3 className="text-xl font-semibold text-text-light mb-2">No matches yet</h3>
              <p className="text-gray-500 mb-6">We need more instructors to match you with. Check back soon!</p>
              <Link
                href="/student/onboarding"
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
                    {/* Score */}
                    <ScoreRing score={match.compatibilityScore} />

                    {/* Profile info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          {index === 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold mb-2">
                              <Star className="w-3 h-3" /> Top Match
                            </span>
                          )}
                          <h3 className="text-xl font-bold text-text-light">{match.matchProfile.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            {match.matchProfile.experience && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {match.matchProfile.experience}
                              </span>
                            )}
                            {match.matchProfile.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-400" />
                                {match.matchProfile.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
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

                      {/* Reasons */}
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

                      {/* Actions */}
                      <div className="flex gap-3 mt-4">
                        {invitedIds.has(match.id) ? (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                            <Send className="w-4 h-4" />
                            Invite sent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInviteToLessons(match)}
                            disabled={!!invitingId}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-dash-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-70"
                          >
                            {invitingId === match.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Invite to Lessons
                          </button>
                        )}
                        <Link
                          href="/student/courses"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-dash-primary rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                        >
                          <Music className="w-4 h-4" />
                          View Courses
                        </Link>
                      </div>
                    </div>
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
