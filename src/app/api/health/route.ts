import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    if (!sql) {
      return NextResponse.json({
        ok: false,
        database: 'not_configured',
        message: 'DATABASE_URL 未配置或格式不正确（需要 postgresql:// 或 postgres:// 开头）',
      }, { status: 503 });
    }

    const result = await sql`SELECT 1 as ok`;
    const connected = result?.[0]?.ok === 1;

    if (!connected) {
      return NextResponse.json({
        ok: false,
        database: 'error',
        message: '数据库连接失败',
      }, { status: 503 });
    }

    const [students, creators, courses, enrollments, appointments] = await Promise.all([
      sql`SELECT COUNT(*)::int as c FROM students`.then((r) => (r[0] as any)?.c ?? 0),
      sql`SELECT COUNT(*)::int as c FROM creators`.then((r) => (r[0] as any)?.c ?? 0),
      sql`SELECT COUNT(*)::int as c FROM courses WHERE is_active = true`.then((r) => (r[0] as any)?.c ?? 0),
      sql`SELECT COUNT(*)::int as c FROM enrollments`.then((r) => (r[0] as any)?.c ?? 0),
      sql`SELECT COUNT(*)::int as c FROM appointments WHERE status != 'cancelled'`.then((r) => (r[0] as any)?.c ?? 0),
    ]);

    return NextResponse.json({
      ok: true,
      database: 'connected',
      message: '数据库已连接',
      tableCounts: {
        students,
        creators,
        courses,
        enrollments,
        appointments,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      ok: false,
      database: 'error',
      message: error instanceof Error ? error.message : '数据库连接异常',
    }, { status: 503 });
  }
}
