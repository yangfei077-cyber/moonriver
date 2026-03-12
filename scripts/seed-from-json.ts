/**
 * Seed Neon database from existing JSON files.
 * Run: npx tsx scripts/seed-from-json.ts
 * Requires: DATABASE_URL in .env.local
 */
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const APPOINTMENTS_FILE = path.join(process.cwd(), 'data', 'appointments.json');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set. Add it to .env.local');
    process.exit(1);
  }

  const sql = neon(dbUrl);

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  let appointmentsData: { appointments: any[]; nextId?: number } = { appointments: [], nextId: 1 };
  try {
    appointmentsData = JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, 'utf8'));
  } catch {}

  console.log('Seeding courses...');
  for (const c of db.courses || []) {
    await sql`
      INSERT INTO courses (id, title, description, creator_email, creator_name, category, level, duration, price, max_students, current_students, schedule, image, topics, is_active, created_at)
      VALUES (${c.id}, ${c.title}, ${c.description || ''}, ${c.creatorEmail}, ${c.creatorName}, ${c.category}, ${c.level}, ${c.duration || ''}, ${c.price || 0}, ${c.maxStudents || 10}, ${c.currentStudents || 0}, ${c.schedule || ''}, ${c.image || ''}, ${JSON.stringify(c.topics || [])}, ${c.isActive !== false}, ${c.createdAt || new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, current_students = EXCLUDED.current_students
    `;
  }

  console.log('Seeding creators...');
  for (const c of db.creators || []) {
    await sql`
      INSERT INTO creators (id, email, name, bio, specialties, experience, education, rating, students_count, is_active, profile_image)
      VALUES (${c.id}, ${c.email}, ${c.name}, ${c.bio || ''}, ${JSON.stringify(c.specialties || [])}, ${c.experience || ''}, ${c.education || ''}, ${c.rating}, ${c.studentsCount || 0}, ${c.isActive !== false}, ${c.profileImage || ''})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seeding students...');
  for (const s of db.students || []) {
    await sql`
      INSERT INTO students (id, email, name, bio, interests, level, is_active, profile_image)
      VALUES (${s.id}, ${s.email}, ${s.name}, ${s.bio || ''}, ${JSON.stringify(s.interests || [])}, ${s.level || ''}, ${s.isActive !== false}, ${s.profileImage || ''})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seeding enrollments...');
  for (const e of db.enrollments || []) {
    await sql`
      INSERT INTO enrollments (id, student_email, course_id, progress, status, enrolled_at)
      VALUES (${e.id}, ${e.studentEmail}, ${e.courseId}, ${e.progress || 0}, ${e.status || 'active'}, ${e.enrolledAt || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seeding questionnaires...');
  for (const q of db.questionnaires || []) {
    await sql`
      INSERT INTO questionnaires (id, email, role, instruments, genres, availability, bio, skill_level, goals, learning_style, budget, teaching_levels, teaching_style, max_students, completed_at, updated_at)
      VALUES (${q.id}, ${q.email}, ${q.role}, ${JSON.stringify(q.instruments || [])}, ${JSON.stringify(q.genres || [])}, ${JSON.stringify(q.availability || [])}, ${q.bio || ''}, ${q.skillLevel || ''}, ${JSON.stringify(q.goals || [])}, ${JSON.stringify(q.learningStyle || [])}, ${q.budget || ''}, ${JSON.stringify(q.teachingLevels || [])}, ${JSON.stringify(q.teachingStyle || [])}, ${q.maxStudents || null}, ${q.completedAt || new Date().toISOString()}, ${q.updatedAt || new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
    `;
  }

  console.log('Seeding matches...');
  for (const m of db.matches || []) {
    await sql`
      INSERT INTO matches (id, user_email, match_email, compatibility_score, reasons, match_profile, generated_at)
      VALUES (${m.id}, ${m.userEmail}, ${m.matchEmail}, ${m.compatibilityScore}, ${JSON.stringify(m.reasons || [])}, ${JSON.stringify(m.matchProfile || {})}, ${m.generatedAt || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seeding notifications...');
  for (const n of db.notifications || []) {
    await sql`
      INSERT INTO notifications (id, type, recipient_email, sender_email, sender_name, title, message, metadata, read, created_at)
      VALUES (${n.id}, ${n.type}, ${n.recipientEmail}, ${n.senderEmail}, ${n.senderName || ''}, ${n.title}, ${n.message}, ${JSON.stringify(n.metadata || {})}, ${n.read || false}, ${n.createdAt || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seeding appointments...');
  for (const a of appointmentsData.appointments || []) {
    await sql`
      INSERT INTO appointments (id, creator_email, creator_name, student_email, student_name, course_id, title, description, start_time, end_time, status, type, location, google_event_id, cancellation_reason, cancelled_at, created_at)
      VALUES (${a.id}, ${a.creatorEmail}, ${a.creatorName}, ${a.studentEmail}, ${a.studentName}, ${a.courseId || null}, ${a.title}, ${a.description || ''}, ${a.startTime}, ${a.endTime}, ${a.status || 'scheduled'}, ${a.type || 'lesson'}, ${a.location || 'Online'}, ${a.googleEventId || null}, ${a.cancellationReason || null}, ${a.cancelledAt || null}, ${a.createdAt || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  console.log('Seeding user_profiles...');
  for (const p of db.userProfiles || []) {
    await sql`
      INSERT INTO user_profiles (id, user_id, email, display_name, bio, created_at, updated_at)
      VALUES (${p.id}, ${p.userId || p.email}, ${p.email || p.userId}, ${p.displayName || ''}, ${p.bio || ''}, ${p.createdAt || new Date().toISOString()}, ${p.updatedAt || new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio, updated_at = EXCLUDED.updated_at
    `;
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
