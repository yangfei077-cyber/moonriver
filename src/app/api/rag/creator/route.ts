import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';
import { sql } from '@/lib/db';

function findRelevantContext(query: string, knowledge: any): string {
  const queryLower = query.toLowerCase();
  const results: string[] = [];

  function searchObj(obj: any, prefix: string) {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        const itemStr = JSON.stringify(item).toLowerCase();
        if (itemStr.includes(queryLower) || queryLower.split(' ').some(w => w.length > 3 && itemStr.includes(w))) {
          results.push(`${prefix}[${i}]: ${JSON.stringify(item)}`);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        searchObj(value, `${prefix}.${key}`);
      });
    }
  }

  searchObj(knowledge, 'data');

  if (results.length === 0) {
    if (knowledge.stats) results.push(`Stats: ${JSON.stringify(knowledge.stats)}`);
    if (knowledge.myCourses) results.push(`My Courses: ${JSON.stringify(knowledge.myCourses.slice(0, 3))}`);
    if (knowledge.appointments) results.push(`Appointments: ${JSON.stringify(knowledge.appointments.slice(0, 3))}`);
  }

  return results.slice(0, 8).join('\n\n');
}

function generateFallbackResponse(query: string, knowledge: any): string {
  const q = query.toLowerCase();

  if (q.includes('student') || q.includes('enroll')) {
    const enrollments = knowledge.enrollments || [];
    if (enrollments.length > 0) {
      const list = enrollments.slice(0, 5).map((e: any) =>
        `- **${e.studentName}** enrolled in ${e.courseTitle}`
      ).join('\n');
      return `Your enrolled students:\n\n${list}\n\nTotal: ${enrollments.length} student enrollment${enrollments.length !== 1 ? 's' : ''}.`;
    }
    return 'No students enrolled in your courses yet.';
  }

  if (q.includes('appointment') || q.includes('lesson') || q.includes('schedule') || q.includes('week')) {
    const apts = knowledge.appointments || [];
    if (apts.length > 0) {
      const list = apts.slice(0, 5).map((a: any) =>
        `- **${a.title}** with ${a.studentName} | ${a.date} at ${a.time} | Status: ${a.status}`
      ).join('\n');
      return `Your upcoming lessons:\n\n${list}`;
    }
    return 'No upcoming appointments scheduled.';
  }

  if (q.includes('course') || q.includes('popular')) {
    const courses = knowledge.myCourses || [];
    if (courses.length > 0) {
      const sorted = [...courses].sort((a: any, b: any) => (b.currentStudents || 0) - (a.currentStudents || 0));
      const list = sorted.map((c: any) =>
        `- **${c.title}** (${c.level}) — ${c.currentStudents}/${c.maxStudents} students`
      ).join('\n');
      return `Your courses by popularity:\n\n${list}`;
    }
    return 'You have no courses yet. [Create a course](/creator/courses) to get started!';
  }

  const stats = knowledge.stats || {};
  return `Here's your creator summary:\n\n- **${stats.totalCourses ?? 0}** course${(stats.totalCourses ?? 0) !== 1 ? 's' : ''}\n- **${stats.totalStudents ?? 0}** total student enrollment${(stats.totalStudents ?? 0) !== 1 ? 's' : ''}\n- **${stats.upcomingLessons ?? 0}** upcoming lesson${(stats.upcomingLessons ?? 0) !== 1 ? 's' : ''}\n\nAsk me about your students, courses, appointments, or earnings!`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const userEmail = session.user.email;
    const userName = session.user.name || userEmail;

    if (!sql) {
      return NextResponse.json({ success: true, response: generateFallbackResponse(message, {}) });
    }

    // Fetch only data this creator owns
    const [myCourses, allEnrollments, appointments] = await Promise.all([
      sql`
        SELECT id, title, level, price, current_students, max_students, category, is_active
        FROM courses
        WHERE creator_email = ${userEmail}
        ORDER BY current_students DESC
      `,
      sql`SELECT * FROM enrollments`,
      sql`
        SELECT student_email as "studentEmail", student_name as "studentName", title,
          start_time as "startTime", end_time as "endTime", status, location
        FROM appointments
        WHERE creator_email = ${userEmail}
        ORDER BY start_time ASC
      `,
    ]);

    const myCourseIds = new Set(myCourses.map((c: any) => c.id));
    const myEnrollments = allEnrollments.filter((e: any) => myCourseIds.has(e.course_id || e.courseId));

    const formattedEnrollments = myEnrollments.map((e: any) => {
      const course = myCourses.find((c: any) => c.id === (e.course_id || e.courseId));
      return {
        studentName: e.student_name || e.studentName || 'Student',
        studentEmail: e.student_email || e.studentEmail,
        courseTitle: course?.title || 'Unknown course',
        progress: e.progress ?? 0,
      };
    });

    const formattedAppointments = appointments.map((a: any) => {
      const start = new Date(a.startTime);
      return {
        title: a.title,
        studentName: a.studentName,
        date: a.startTime?.split?.('T')[0] || start.toISOString().split('T')[0],
        time: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        status: a.status,
        location: a.location,
      };
    });

    const knowledge = {
      creator: { name: userName, email: userEmail },
      myCourses: myCourses.map((c: any) => ({
        title: c.title,
        level: c.level,
        price: c.price,
        currentStudents: c.current_students ?? c.currentStudents,
        maxStudents: c.max_students ?? c.maxStudents,
        isActive: c.is_active,
      })),
      enrollments: formattedEnrollments,
      appointments: formattedAppointments,
      stats: {
        totalCourses: myCourses.length,
        totalStudents: formattedEnrollments.length,
        upcomingLessons: formattedAppointments.filter((a: any) => a.status !== 'cancelled').length,
        mostPopularCourse: myCourses[0]?.title || null,
      },
    };

    const context = findRelevantContext(message, knowledge);

    const systemPrompt = `You are a personal AI assistant for a music instructor/creator on Moonriver Music Education Platform. You help the creator manage their teaching business.

CREATOR INFO:
- Name: ${userName}
- Email: ${userEmail}

IMPORTANT: You can ONLY access and discuss data that belongs to this creator (their own courses, their enrolled students, their appointments). Never reveal information about other creators.

RELEVANT CONTEXT (from database):
${context}

FULL CREATOR DATA:
${JSON.stringify(knowledge, null, 2).slice(0, 4000)}

Answer questions about their courses, students, appointments, and teaching stats. Be professional and helpful. Format responses with markdown. Today's date: ${new Date().toLocaleDateString()}.`;

    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Moonriver Music Education',
      },
      body: JSON.stringify({
        model: 'nousresearch/deephermes-3-llama-3-8b-preview:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openrouterResponse.ok) {
      return NextResponse.json({ success: true, response: generateFallbackResponse(message, knowledge) });
    }

    const aiResponse = await openrouterResponse.json();
    return NextResponse.json({
      success: true,
      response: aiResponse.choices[0].message.content,
    });
  } catch (error) {
    console.error('Creator RAG error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
