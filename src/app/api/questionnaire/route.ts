import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const [questionnaire] = await sql`SELECT * FROM questionnaires WHERE email = ${email}`;
    const q = questionnaire ? {
      id: questionnaire.id,
      email: questionnaire.email,
      role: questionnaire.role,
      instruments: questionnaire.instruments || [],
      genres: questionnaire.genres || [],
      availability: questionnaire.availability || [],
      bio: questionnaire.bio,
      skillLevel: questionnaire.skill_level,
      goals: questionnaire.goals || [],
      learningStyle: questionnaire.learning_style || [],
      budget: questionnaire.budget,
      teachingLevels: questionnaire.teaching_levels || [],
      teachingStyle: questionnaire.teaching_style || [],
      maxStudents: questionnaire.max_students,
      completedAt: questionnaire.completed_at,
      updatedAt: questionnaire.updated_at,
    } : null;

    return NextResponse.json({ success: true, questionnaire: q });
  } catch (error) {
    console.error('Questionnaire GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const body = await request.json();
    const { email, role, instruments, genres, skillLevel, goals, availability, learningStyle, teachingLevels, teachingStyle, maxStudents, budget, bio } = body;

    if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 });
    if (!instruments || instruments.length === 0) return NextResponse.json({ error: 'Select at least one instrument' }, { status: 400 });

    const now = new Date().toISOString();
    const [existing] = await sql`SELECT id, completed_at FROM questionnaires WHERE email = ${email}`;

    const id = existing ? existing.id : `questionnaire-${Date.now()}`;
    const completedAt = existing ? existing.completed_at : now;

    await sql`
      INSERT INTO questionnaires (id, email, role, instruments, genres, availability, bio, skill_level, goals, learning_style, budget, teaching_levels, teaching_style, max_students, completed_at, updated_at)
      VALUES (${id}, ${email}, ${role}, ${JSON.stringify(instruments || [])}, ${JSON.stringify(genres || [])}, ${JSON.stringify(availability || [])}, ${bio || ''}, ${skillLevel || 'Beginner'}, ${JSON.stringify(goals || [])}, ${JSON.stringify(learningStyle || [])}, ${budget || 'medium'}, ${JSON.stringify(teachingLevels || [])}, ${JSON.stringify(teachingStyle || [])}, ${maxStudents || null}, ${completedAt}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        instruments = EXCLUDED.instruments,
        genres = EXCLUDED.genres,
        availability = EXCLUDED.availability,
        bio = EXCLUDED.bio,
        skill_level = EXCLUDED.skill_level,
        goals = EXCLUDED.goals,
        learning_style = EXCLUDED.learning_style,
        budget = EXCLUDED.budget,
        teaching_levels = EXCLUDED.teaching_levels,
        teaching_style = EXCLUDED.teaching_style,
        max_students = EXCLUDED.max_students,
        updated_at = EXCLUDED.updated_at
    `;

    const questionnaire = {
      id,
      email,
      role,
      instruments: instruments || [],
      genres: genres || [],
      availability: availability || [],
      bio: bio || '',
      skillLevel: role === 'Student' ? (skillLevel || 'Beginner') : undefined,
      goals: role === 'Student' ? (goals || []) : undefined,
      learningStyle: role === 'Student' ? (learningStyle || []) : undefined,
      budget: role === 'Student' ? (budget || 'medium') : undefined,
      teachingLevels: role === 'Creator' ? (teachingLevels || []) : undefined,
      teachingStyle: role === 'Creator' ? (teachingStyle || []) : undefined,
      maxStudents: role === 'Creator' ? (maxStudents || 15) : undefined,
      completedAt,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, questionnaire });
  } catch (error) {
    console.error('Questionnaire POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
