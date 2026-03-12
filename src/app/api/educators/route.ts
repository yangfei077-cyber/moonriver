import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const educators = await sql`
      SELECT id, email, name, bio, specialties, experience, education, rating, students_count, is_active, profile_image
      FROM creators
    `;

    const formatted = educators.map((c: any) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      bio: c.bio,
      specialties: c.specialties || [],
      experience: c.experience,
      education: c.education,
      rating: c.rating,
      studentsCount: c.students_count,
      isActive: c.is_active,
      profileImage: c.profile_image,
    }));

    return NextResponse.json({ success: true, educators: formatted });
  } catch (error) {
    console.error('Educators GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
