import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const [profile] = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId} OR email = ${userId}`;
    if (profile) {
      return NextResponse.json({
        success: true,
        profile: {
          displayName: profile.display_name,
          userId: profile.user_id,
          email: profile.email,
          bio: profile.bio,
        },
      });
    }

    const [student] = await sql`SELECT * FROM students WHERE email = ${userId}`;
    if (student) {
      return NextResponse.json({
        success: true,
        profile: {
          displayName: student.name,
          ...student,
        },
      });
    }

    const [creator] = await sql`SELECT * FROM creators WHERE email = ${userId}`;
    if (creator) {
      return NextResponse.json({
        success: true,
        profile: {
          displayName: creator.name,
          ...creator,
        },
      });
    }

    return NextResponse.json({ success: false, profile: null });
  } catch (error) {
    console.error('User profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const body = await request.json();
    const { userId, displayName, bio } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const [existing] = await sql`SELECT id FROM user_profiles WHERE user_id = ${userId} OR email = ${userId}`;
    const now = new Date().toISOString();

    if (existing) {
      await sql`
        UPDATE user_profiles SET display_name = ${displayName || ''}, bio = ${bio || ''}, updated_at = ${now}
        WHERE id = ${existing.id}
      `;
      const [updated] = await sql`SELECT * FROM user_profiles WHERE id = ${existing.id}`;
      return NextResponse.json({
        success: true,
        profile: {
          displayName: updated?.display_name,
          userId: updated?.user_id,
          email: updated?.email,
          bio: updated?.bio,
        },
      });
    }

    const id = `profile-${Date.now()}`;
    await sql`
      INSERT INTO user_profiles (id, user_id, email, display_name, bio, created_at, updated_at)
      VALUES (${id}, ${userId}, ${userId}, ${displayName || ''}, ${bio || ''}, ${now}, ${now})
    `;
    const [created] = await sql`SELECT * FROM user_profiles WHERE id = ${id}`;
    return NextResponse.json({
      success: true,
      profile: {
        displayName: created?.display_name,
        userId: created?.user_id,
        email: created?.email,
        bio: created?.bio,
      },
    });
  } catch (error) {
    console.error('User profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
