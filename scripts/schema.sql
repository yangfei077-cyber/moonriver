-- Moonriver Neon PostgreSQL Schema
-- Run this in Neon SQL Editor or: psql $DATABASE_URL -f scripts/schema.sql

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator_email TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  category TEXT,
  level TEXT,
  duration TEXT,
  price INTEGER DEFAULT 0,
  max_students INTEGER DEFAULT 10,
  current_students INTEGER DEFAULT 0,
  schedule TEXT,
  image TEXT,
  topics JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creators (seed/reference data)
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  bio TEXT,
  specialties JSONB DEFAULT '[]',
  experience TEXT,
  education TEXT,
  rating DECIMAL(3,2),
  students_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  profile_image TEXT
);

-- Students (seed/reference data)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  bio TEXT,
  interests JSONB DEFAULT '[]',
  level TEXT,
  is_active BOOLEAN DEFAULT true,
  profile_image TEXT
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  student_email TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_email);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

-- User profiles (Auth0 users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  display_name TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Questionnaires (onboarding)
CREATE TABLE IF NOT EXISTS questionnaires (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  instruments JSONB DEFAULT '[]',
  genres JSONB DEFAULT '[]',
  availability JSONB DEFAULT '[]',
  bio TEXT,
  skill_level TEXT,
  goals JSONB DEFAULT '[]',
  learning_style JSONB DEFAULT '[]',
  budget TEXT,
  teaching_levels JSONB DEFAULT '[]',
  teaching_style JSONB DEFAULT '[]',
  max_students INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaires_email ON questionnaires(email);

-- Matches (AI-generated)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  match_email TEXT NOT NULL,
  compatibility_score INTEGER NOT NULL,
  reasons JSONB DEFAULT '[]',
  match_profile JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_email);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_email);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  creator_email TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  course_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  type TEXT DEFAULT 'lesson',
  location TEXT,
  google_event_id TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_creator ON appointments(creator_email);
CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_email);

-- Google tokens (OAuth)
CREATE TABLE IF NOT EXISTS google_tokens (
  user_id TEXT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
