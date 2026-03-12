import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../lib/auth0.js';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const creatorOnly = searchParams.get('creatorOnly');

    let courses = await sql`
      SELECT id, title, description, creator_email as "creatorEmail", creator_name as "creatorName",
        category, level, duration, price, max_students as "maxStudents", current_students as "currentStudents",
        schedule, image, topics, is_active as "isActive", created_at as "createdAt"
      FROM courses
      WHERE is_active = true
    `;
    if (level) courses = courses.filter((c: any) => c.level?.toLowerCase() === level.toLowerCase());
    if (category) courses = courses.filter((c: any) => c.category?.toLowerCase() === category.toLowerCase());
    if (creatorOnly === 'true') courses = courses.filter((c: any) => c.creatorEmail === userEmail);

    const enrollments = await sql`SELECT * FROM enrollments`;
    const students = await sql`SELECT * FROM students`;
    const studentEnrollments = enrollments.filter((e: any) => e.student_email === userEmail);

    const getStudentInfo = (email: string) => {
      const s = students.find((st: any) => st.email === email);
      return {
        studentName: s?.name || email,
        profileImage: s?.profile_image,
        interests: s?.interests || [],
      };
    };

    courses = courses.map((course: any) => {
      const enrollment = studentEnrollments.find((e: any) => e.course_id === course.id);
      const courseEnrollments = creatorOnly === 'true'
        ? enrollments
            .filter((e: any) => e.course_id === course.id)
            .map((e: any) => ({
              id: e.id,
              studentEmail: e.student_email,
              courseId: e.course_id,
              progress: e.progress,
              status: e.status,
              enrolledAt: e.enrolled_at,
              ...getStudentInfo(e.student_email),
            }))
        : undefined;
      return {
        ...course,
        isEnrolled: !!enrollment,
        progress: enrollment?.progress || 0,
        canEnroll: !enrollment && course.currentStudents < course.maxStudents,
        ...(courseEnrollments !== undefined && { enrollments: courseEnrollments }),
      };
    });

    const allCourses = await sql`SELECT level, category FROM courses WHERE is_active = true`;
    const levels = [...new Set(allCourses.map((c: any) => c.level).filter(Boolean))];
    const categories = [...new Set(allCourses.map((c: any) => c.category).filter(Boolean))];

    return NextResponse.json({
      success: true,
      courses,
      total: courses.length,
      filters: { levels, categories },
    });
  } catch (error) {
    console.error('Courses API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userEmail = session.user.email;
    const body = await request.json();
    const { action, courseId, title, description, category, level, duration, price, maxStudents, schedule, topics } = body;

    if (action === 'enroll') {
      const [course] = await sql`
        SELECT * FROM courses WHERE id = ${courseId}
      `;
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      if (course.current_students >= course.max_students) return NextResponse.json({ error: 'Course is full' }, { status: 400 });

      const existing = await sql`
        SELECT 1 FROM enrollments WHERE student_email = ${userEmail} AND course_id = ${courseId}
      `;
      if (existing.length > 0) return NextResponse.json({ error: 'Already enrolled' }, { status: 400 });

      const enrollmentId = `enrollment-${Date.now()}`;
      const now = new Date().toISOString();
      const studentName = session.user.name || userEmail;

      await sql`
        INSERT INTO enrollments (id, student_email, course_id, progress, status, enrolled_at)
        VALUES (${enrollmentId}, ${userEmail}, ${courseId}, 0, 'active', ${now})
      `;
      await sql`
        UPDATE courses SET current_students = current_students + 1 WHERE id = ${courseId}
      `;

      // Notify course creator
      await sql`
        INSERT INTO notifications (id, type, recipient_email, sender_email, sender_name, title, message, metadata, read, created_at)
        VALUES (${`notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`}, 'course_signup', ${course.creator_email}, ${userEmail}, ${studentName}, 'New student enrolled', ${`${studentName} signed up for your course "${course.title}".`}, ${JSON.stringify({ courseId, courseTitle: course.title, studentEmail: userEmail })}, false, ${now})
      `;
      // Notify student
      await sql`
        INSERT INTO notifications (id, type, recipient_email, sender_email, sender_name, title, message, metadata, read, created_at)
        VALUES (${`notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`}, 'course_enrolled', ${userEmail}, ${course.creator_email}, ${course.creator_name}, 'You enrolled successfully', ${`You signed up for "${course.title}" by ${course.creator_name}.`}, ${JSON.stringify({ courseId, courseTitle: course.title })}, false, ${now})
      `;

      return NextResponse.json({ success: true, message: `Enrolled in ${course.title}` });
    }

    if (action === 'unenroll') {
      await sql`DELETE FROM enrollments WHERE student_email = ${userEmail} AND course_id = ${courseId}`;
      await sql`
        UPDATE courses SET current_students = GREATEST(0, current_students - 1) WHERE id = ${courseId}
      `;
      return NextResponse.json({ success: true, message: 'Unenrolled successfully' });
    }

    if (action === 'create') {
      const newId = `course-${Date.now()}`;
      const newCourse = {
        id: newId,
        title,
        description: description || '',
        category: category || '',
        level: level || '',
        duration: duration || '',
        price: price || 0,
        maxStudents: maxStudents || 10,
        schedule: schedule || '',
        topics: Array.isArray(topics) ? topics : [],
        creatorEmail: userEmail,
        creatorName: session.user.name || userEmail,
        image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=300&fit=crop',
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await sql`
        INSERT INTO courses (id, title, description, creator_email, creator_name, category, level, duration, price, max_students, current_students, schedule, image, topics, is_active, created_at)
        VALUES (${newId}, ${newCourse.title}, ${newCourse.description}, ${newCourse.creatorEmail}, ${newCourse.creatorName}, ${newCourse.category}, ${newCourse.level}, ${newCourse.duration}, ${newCourse.price}, ${newCourse.maxStudents}, 0, ${newCourse.schedule}, ${newCourse.image}, ${JSON.stringify(newCourse.topics)}, true, ${newCourse.createdAt})
      `;

      return NextResponse.json({ success: true, course: newCourse });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Courses POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
