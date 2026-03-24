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
    if (knowledge.enrolledCourses) results.push(`Enrolled Courses: ${JSON.stringify(knowledge.enrolledCourses)}`);
    if (knowledge.appointments) results.push(`Appointments: ${JSON.stringify(knowledge.appointments.slice(0, 3))}`);
    if (knowledge.availableInstructors) results.push(`Available Instructors: ${JSON.stringify(knowledge.availableInstructors.slice(0, 3))}`);
  }

  return results.slice(0, 8).join('\n\n');
}

function generateFallbackResponse(query: string, knowledge: any): string {
  const q = query.toLowerCase();

  if (q.includes('appointment') || q.includes('lesson') || q.includes('schedule') || q.includes('next')) {
    const apts = knowledge.appointments || [];
    if (apts.length > 0) {
      const upcoming = apts.filter((a: any) => a.status !== 'cancelled').slice(0, 5);
      if (upcoming.length > 0) {
        const list = upcoming.map((a: any) =>
          `- **${a.title}** with ${a.creatorName} | ${a.date} at ${a.time} | Status: ${a.status}`
        ).join('\n');
        return `Here are your upcoming lessons:\n\n${list}`;
      }
    }
    return 'You have no upcoming appointments. [Schedule a lesson](/student/appointments) to get started!';
  }

  if (q.includes('course') || q.includes('enroll') || q.includes('progress')) {
    const courses = knowledge.enrolledCourses || [];
    if (courses.length > 0) {
      const list = courses.map((c: any) =>
        `- **${c.title}** by ${c.creatorName} (${c.level}) — Progress: ${c.progress ?? 0}%`
      ).join('\n');
      return `Your enrolled courses:\n\n${list}`;
    }
    return 'You are not enrolled in any courses yet. [Explore courses](/student/courses) to get started!';
  }

  if (q.includes('instructor') || q.includes('teacher') || q.includes('creator')) {
    const instructors = knowledge.availableInstructors || [];
    if (instructors.length > 0) {
      const list = instructors.slice(0, 5).map((i: any) =>
        `- **${i.name}** — ${(i.specialties || []).join(', ')} | Rating: ${i.rating || 'N/A'} | ${i.studentsCount || 0} students`
      ).join('\n');
      return `Available instructors:\n\n${list}`;
    }
  }

  const courses = knowledge.enrolledCourses || [];
  const apts = knowledge.appointments || [];
  return `Here's your summary:\n\n- **${courses.length}** enrolled course${courses.length !== 1 ? 's' : ''}\n- **${apts.filter((a: any) => a.status !== 'cancelled').length}** upcoming lesson${apts.length !== 1 ? 's' : ''}\n\nAsk me about your courses, lessons, progress, or available instructors!`;
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

    // Fetch only data this student is authorized to see
    const [enrollments, allCourses, appointments, creators] = await Promise.all([
      sql`SELECT * FROM enrollments WHERE student_email = ${userEmail}`,
      sql`SELECT id, title, creator_name, level, price, current_students, max_students, category FROM courses WHERE is_active = true`,
      sql`
        SELECT creator_email as "creatorEmail", creator_name as "creatorName", title,
          start_time as "startTime", end_time as "endTime", status, location
        FROM appointments
        WHERE student_email = ${userEmail}
        ORDER BY start_time ASC
      `,
      sql`SELECT name, email, specialties, experience, rating, students_count as "studentsCount" FROM creators`,
    ]);

    const enrolledCourseIds = new Set(enrollments.map((e: any) => e.course_id || e.courseId));
    const enrolledCourses = allCourses
      .filter((c: any) => enrolledCourseIds.has(c.id))
      .map((c: any) => ({
        title: c.title,
        creatorName: c.creator_name,
        level: c.level,
        price: c.price,
        progress: enrollments.find((e: any) => (e.course_id || e.courseId) === c.id)?.progress ?? 0,
      }));

    const formattedAppointments = appointments.map((a: any) => {
      const start = new Date(a.startTime);
      return {
        title: a.title,
        creatorName: a.creatorName,
        date: a.startTime?.split?.('T')[0] || start.toISOString().split('T')[0],
        time: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        status: a.status,
        location: a.location,
      };
    });

    const knowledge = {
      student: { name: userName, email: userEmail },
      enrolledCourses,
      appointments: formattedAppointments,
      availableInstructors: creators.map((c: any) => ({
        name: c.name,
        specialties: c.specialties,
        experience: c.experience,
        rating: c.rating,
        studentsCount: c.studentsCount,
      })),
      stats: {
        enrolledCourses: enrolledCourses.length,
        upcomingLessons: formattedAppointments.filter((a: any) => a.status !== 'cancelled').length,
        availableInstructors: creators.length,
      },
    };

    const context = findRelevantContext(message, knowledge);

    const systemPrompt = `You are a personal AI assistant for a music education student on Moonriver Music Education Platform. You help the student with their learning journey.

STUDENT INFO:
- Name: ${userName}
- Email: ${userEmail}

IMPORTANT: You can ONLY access and discuss data that belongs to this student. Never reveal information about other students.

RELEVANT CONTEXT (from database):
${context}

FULL STUDENT DATA:
${JSON.stringify(knowledge, null, 2).slice(0, 4000)}

Answer questions about their enrolled courses, upcoming lessons, progress, and available instructors. Be encouraging and helpful. Format responses with markdown. Today's date: ${new Date().toLocaleDateString()}.`;

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
    console.error('Student RAG error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
