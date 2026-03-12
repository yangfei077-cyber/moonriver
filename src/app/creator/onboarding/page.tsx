'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/contexts/UserContext';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const INSTRUMENTS = ['Guitar', 'Piano', 'Vocal', 'Drums', 'Bass', 'Violin', 'Saxophone', 'Production', 'Theory'];
const GENRES = ['Classical', 'Jazz', 'Rock', 'Pop', 'Blues', 'R&B', 'Electronic', 'Folk', 'Country', 'Hip-Hop'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const TEACHING_STYLES = ['Structured', 'Freeform', 'Visual', 'Theory-heavy', 'Ear-training', 'Project-based'];
const AVAILABILITY = ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Saturday morning', 'Saturday afternoon', 'Sunday morning', 'Sunday afternoon'];

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

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const { user } = useUserContext();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [instruments, setInstruments] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [teachingLevels, setTeachingLevels] = useState<string[]>([]);
  const [teachingStyle, setTeachingStyle] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [maxStudents, setMaxStudents] = useState(15);
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadExisting = async () => {
      if (!user?.email) return;
      try {
        const res = await fetch(`/api/questionnaire?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.questionnaire) {
          const q = data.questionnaire;
          setInstruments(q.instruments || []);
          setGenres(q.genres || []);
          setTeachingLevels(q.teachingLevels || []);
          setTeachingStyle(q.teachingStyle || []);
          setAvailability(q.availability || []);
          setMaxStudents(q.maxStudents || 15);
          setBio(q.bio || '');
          setIsEditing(true);
        }
      } catch {}
    };
    loadExisting();
  }, [user?.email]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const totalSteps = 4;

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
          role: 'Creator',
          instruments, genres, teachingLevels, teachingStyle, availability, maxStudents, bio,
        }),
      });
      if (res.ok) {
        router.push('/creator/matches');
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
      <h2 className="text-2xl font-bold text-text-light mb-2">What do you teach?</h2>
      <p className="text-gray-500 mb-6">Select all instruments and subjects you offer</p>
      <div className="flex flex-wrap gap-3">
        {INSTRUMENTS.map(i => (
          <Chip key={i} label={i} selected={instruments.includes(i)} onClick={() => toggle(instruments, setInstruments, i)} />
        ))}
      </div>
    </div>,

    // Step 1: Genres
    <div key="genres">
      <h2 className="text-2xl font-bold text-text-light mb-2">Your musical specialties</h2>
      <p className="text-gray-500 mb-6">What genres do you specialize in?</p>
      <div className="flex flex-wrap gap-3">
        {GENRES.map(g => (
          <Chip key={g} label={g} selected={genres.includes(g)} onClick={() => toggle(genres, setGenres, g)} />
        ))}
      </div>
    </div>,

    // Step 2: Teaching levels + style
    <div key="levels-style">
      <h2 className="text-2xl font-bold text-text-light mb-2">Your teaching approach</h2>
      <p className="text-gray-500 mb-6">What levels do you teach?</p>
      <div className="flex gap-3 mb-8">
        {LEVELS.map(l => (
          <Chip key={l} label={l} selected={teachingLevels.includes(l)} onClick={() => toggle(teachingLevels, setTeachingLevels, l)} />
        ))}
      </div>
      <h3 className="text-lg font-semibold text-text-light mb-3">Teaching style</h3>
      <div className="flex flex-wrap gap-3">
        {TEACHING_STYLES.map(s => (
          <Chip key={s} label={s} selected={teachingStyle.includes(s)} onClick={() => toggle(teachingStyle, setTeachingStyle, s)} />
        ))}
      </div>
    </div>,

    // Step 3: Availability + Bio
    <div key="availability-bio">
      <h2 className="text-2xl font-bold text-text-light mb-2">Availability & Bio</h2>
      <p className="text-gray-500 mb-6">When do you teach?</p>
      <div className="flex flex-wrap gap-3 mb-8">
        {AVAILABILITY.map(a => (
          <Chip key={a} label={a} selected={availability.includes(a)} onClick={() => toggle(availability, setAvailability, a)} />
        ))}
      </div>
      <div className="mb-6">
        <label className="text-sm font-medium text-text-light mb-2 block">Max students</label>
        <input
          type="number"
          min={1}
          max={50}
          value={maxStudents}
          onChange={e => setMaxStudents(Number(e.target.value))}
          className="w-24 px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-dash-primary/30"
        />
      </div>
      <h3 className="text-lg font-semibold text-text-light mb-3">Tell students about yourself</h3>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Your teaching philosophy, experience, what makes your lessons special..."
        className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-dash-primary/30 focus:border-dash-primary resize-none h-32"
      />
    </div>,
  ];

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-dash-primary/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-dash-primary" />
            <span className="text-sm font-medium text-dash-primary">AI-Powered Matching</span>
          </div>
          <h1 className="text-3xl font-bold text-text-light">
            <span className="text-dash-primary">M</span>oonriver
          </h1>
          <p className="text-gray-500 mt-1">{isEditing ? 'Update your teaching profile' : 'Get matched with ideal students'}</p>
        </div>

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

        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8">
          {steps[step]}
        </div>

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
              {saving ? 'Saving...' : isEditing ? 'Update & Rematch' : 'Find My Students'}
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
