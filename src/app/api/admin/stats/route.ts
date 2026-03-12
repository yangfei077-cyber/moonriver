import { NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';
import { sql } from '@/lib/db';
import { getUserRoles } from '@/lib/user-roles';

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = await getUserRoles(session.user.sub);
    if (!roles.includes('Admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const [
      studentsResult,
      creatorsResult,
      coursesResult,
      enrollmentsResult,
      appointmentsResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM students`,
      sql`SELECT COUNT(*)::int as count FROM creators`,
      sql`SELECT COUNT(*)::int as count FROM courses WHERE is_active = true`,
      sql`SELECT COUNT(*)::int as count FROM enrollments`,
      sql`SELECT COUNT(*)::int as count FROM appointments WHERE status != 'cancelled'`,
    ]);

    const totalStudents = (studentsResult[0] as any)?.count ?? 0;
    const totalCreators = (creatorsResult[0] as any)?.count ?? 0;
    const activeCourses = (coursesResult[0] as any)?.count ?? 0;
    const totalEnrollments = (enrollmentsResult[0] as any)?.count ?? 0;
    const activeAppointments = (appointmentsResult[0] as any)?.count ?? 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents,
        totalCreators,
        activeCourses,
        totalEnrollments,
        activeAppointments,
        revenue: '$12,450',
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
