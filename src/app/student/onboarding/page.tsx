'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/contexts/UserContext';
import { ChevronRight, ChevronLeft, Music, Sparkles } from 'lucide-react';

const INSTRUMENTS = ['Guitar', 'Piano', 'Vocal', 'Drums', 'Bass', 'Violin', 'Saxophone', 'Production', 'Theory'];
const GENRES = ['Classical', 'Jazz', 'Rock', 'Pop', 'Blues', 'R&B', 'Electronic', 'Folk', 'Country', 'Hip-Hop'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const GOALS = ['Learn fundamentals', 'Play in a band', 'Perform solo', 'Write songs', 'Record music', 'Music theory', 'Fun / hobby'];
const LEARNING_STYLES = ['Visual', 'Hands-on', 'Theory-first', 'By ear', 'Structured', 'Freeform'];
const AVAILABILITY = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Saturday morning', 'Saturday afternoon', 'Sunday morning', 'Sunday afternoon'];
const BUDGETS = [
  { value: 'low', label: 'Budget-friendly', desc: 'Under $200' },
  { value: 'medium', label: 'Mid-range', desc: '$200 - $400' },
  { value: 'high', label: 'Premium', desc: '$400+' },
];

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
        selected
          ? 'bg-dash-primary text-white shadow-md scale-105'
          : 'bg-orange-50 text-gray-600 hover:bg-orange-100 hover:text-dash-primary'
      }`}
    >
      {label}
    </button>
  );
}

export default function StudentOnboardingPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [instruments, setInstruments] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('Beginner');
  const [goals, setGoals] = useState<string[]>([]);
  const [learningStyle, setLearningStyle] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [budget, setBudget] = useState('medium');
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const loadExisting = async () => {
      if (!user?.email) { setLoadingProfile(false); return; }
      try {
        const res = await fetch(`/api/questionnaire?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.questionnaire) {
          const q = data.questionnaire;
          setInstruments(q.instruments || []);
          setGenres(q.genres || []);
          setSkillLevel(q.skillLevel || 'Beginner');
          setGoals(q.goals || []);
          setLearningStyle(q.learningStyle || []);
          setAvailability(q.availability || []);
          setBudget(q.budget || 'medium');
          setBio(q.bio || '');
          setIsEditing(true);
        }
      } catch {}
      setLoadingProfile(false);
    };
    loadExisting();
  }, [user?.email]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const totalSteps = 5;

  const canNext = () => {
    if (step === 0) return instruments.length > 0;
    if (step === 1) return genres.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || user?.sub || '',
          role: 'Student',
          instruments, genres, skillLevel, goals, learningStyle, availability, budget, bio,
        }),
      });
      if (res.ok) {
        router.push('/student/matches');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    // Step 0: Instruments
    <div key="instruments">
      <h2 className="text-2xl font-bold text-text-light mb-2">What do you want to learn?</h2>
      <p className="text-gray-500 mb-6">Pick all the instruments that interest you</p>
      <div className="flex flex-wrap gap-3">
        {INSTRUMENTS.map(i => (
          <Chip key={i} label={i} selected={instruments.includes(i)} onClick={() => toggle(instruments, setInstruments, i)} />
        ))}
      </div>
    </div>,

    // Step 1: Genres
    <div key="genres">
      <h2 className="text-2xl font-bold text-text-light mb-2">What genres excite you?</h2>
      <p className="text-gray-500 mb-6">Select the styles of music you love</p>
      <div className="flex flex-wrap gap-3">
        {GENRES.map(g => (
          <Chip key={g} label={g} selected={genres.includes(g)} onClick={() => toggle(genres, setGenres, g)} />
        ))}
      </div>
    </div>,

    // Step 2: Level + Goals
    <div key="level-goals">
      <h2 className="text-2xl font-bold text-text-light mb-2">Where are you at?</h2>
      <p className="text-gray-500 mb-6">Your current skill level</p>
      <div className="flex gap-3 mb-8">
        {LEVELS.map(l => (
          <button
            key={l}
            type="button"
            onClick={() => setSkillLevel(l)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              skillLevel === l
                ? 'bg-dash-primary text-white shadow-md'
                : 'bg-orange-50 text-gray-600 hover:bg-orange-100'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <h3 className="text-lg font-semibold text-text-light mb-3">What are your goals?</h3>
      <div className="flex flex-wrap gap-3">
        {GOALS.map(g => (
          <Chip key={g} label={g} selected={goals.includes(g)} onClick={() => toggle(goals, setGoals, g)} />
        ))}
      </div>
    </div>,

    // Step 3: Availability + Learning Style
    <div key="availability">
      <h2 className="text-2xl font-bold text-text-light mb-2">When can you learn?</h2>
      <p className="text-gray-500 mb-6">Select all time slots that work for you</p>
      <div className="flex flex-wrap gap-3 mb-8">
        {AVAILABILITY.map(a => (
          <Chip key={a} label={a} selected={availability.includes(a)} onClick={() => toggle(availability, setAvailability, a)} />
        ))}
      </div>
      <h3 className="text-lg font-semibold text-text-light mb-3">How do you learn best?</h3>
      <div className="flex flex-wrap gap-3">
        {LEARNING_STYLES.map(s => (
          <Chip key={s} label={s} selected={learningStyle.includes(s)} onClick={() => toggle(learningStyle, setLearningStyle, s)} />
        ))}
      </div>
    </div>,

    // Step 4: Budget + Bio
    <div key="bio">
      <h2 className="text-2xl font-bold text-text-light mb-2">Almost there!</h2>
      <p className="text-gray-500 mb-6">A few more details to find your perfect match</p>
      <h3 className="text-lg font-semibold text-text-light mb-3">Budget preference</h3>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {BUDGETS.map(b => (
          <button
            key={b.value}
            type="button"
            onClick={() => setBudget(b.value)}
            className={`py-3 px-4 rounded-xl text-center transition-all ${
              budget === b.value
                ? 'bg-dash-primary text-white shadow-md'
                : 'bg-orange-50 text-gray-600 hover:bg-orange-100'
            }`}
          >
            <p className="font-semibold text-sm">{b.label}</p>
            <p className="text-xs mt-0.5 opacity-80">{b.desc}</p>
          </button>
        ))}
      </div>
      <h3 className="text-lg font-semibold text-text-light mb-3">Tell us about yourself</h3>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="What excites you about music? What do you hope to achieve?"
        className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary resize-none h-32"
      />
    </div>,
  ];

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-dash-primary/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-dash-primary" />
            <span className="text-sm font-medium text-dash-primary">AI-Powered Matching</span>
          </div>
          <h1 className="text-3xl font-bold text-text-light">
            <span className="text-dash-primary">M</span>oonriver
          </h1>
          <p className="text-gray-500 mt-1">{isEditing ? 'Update your music preferences' : 'Find your perfect music instructor'}</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-dash-primary' : 'bg-orange-100'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8">
          {steps[step]}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => step === 0 ? router.back() : setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 text-gray-500 hover:text-dash-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-6 py-2.5 bg-dash-primary text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-dash-primary text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Update & Rematch' : 'Find My Match'}
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
