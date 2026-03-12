import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const creators = await sql`SELECT * FROM creators`;
    const students = await sql`SELECT * FROM students`;

    const allUsers = [
      ...creators.map((c: any) => ({
        id: c.id,
        email: c.email,
        name: c.name,
        bio: c.bio,
        roles: ['Creator'],
        type: 'creator',
      })),
      ...students.map((s: any) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        bio: s.bio,
        roles: ['Student'],
        type: 'student',
      })),
    ];

    return NextResponse.json({ success: true, users: allUsers });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { action, userId, role } = await request.json();

  if (action === 'assignRole') {
    return NextResponse.json({ success: true, message: `Role ${role} assigned to ${userId}` });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
