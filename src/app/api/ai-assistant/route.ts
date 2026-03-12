import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

async function buildKnowledgeBase(roles: string[]) {
  if (!sql) return { courses: [], creators: [] };

  const courses = await sql`SELECT * FROM courses WHERE is_active = true`;
  const creators = await sql`SELECT name, email, specialties, experience, rating, students_count as "studentsCount" FROM creators`;
  const appointments = await sql`
    SELECT creator_email as "creatorEmail", creator_name as "creatorName", student_email as "studentEmail",
      student_name as "studentName", title, start_time as "startTime", end_time as "endTime", status
    FROM appointments
  `;

  const knowledge: any = {
    courses: courses.map((c: any) => ({
      name: c.title,
      title: c.title,
      level: c.level,
      creatorName: c.creator_name || c.creatorName,
      price: c.price,
      currentStudents: c.current_students ?? c.currentStudents,
      maxStudents: c.max_students ?? c.maxStudents,
    })),
    creators: creators.map((c: any) => ({
      name: c.name,
      email: c.email,
      specialties: c.specialties,
      experience: c.experience,
      rating: c.rating,
      studentsCount: c.studentsCount,
    })),
  };

  if (roles.includes('Admin')) {
    const students = await sql`SELECT * FROM students`;
    const enrollments = await sql`SELECT * FROM enrollments`;
    knowledge.allStudents = students;
    knowledge.allEnrollments = enrollments;
    knowledge.allAppointments = appointments;
    knowledge.statistics = {
      totalCourses: courses.length,
      totalStudents: students.length,
      totalCreators: creators.length,
      totalEnrollments: enrollments.length,
      totalAppointments: appointments.length,
      activeAppointments: appointments.filter((a: any) => a.status !== 'cancelled').length,
    };
  }

  if (roles.includes('Creator')) {
    knowledge.myStudentsData = await sql`SELECT * FROM students`;
    knowledge.enrollmentData = await sql`SELECT * FROM enrollments`;
    knowledge.appointmentData = appointments;
  }

  if (roles.includes('Student')) {
    knowledge.courseRecommendations = [
      'Start with fundamentals courses if you are a beginner',
      'Music Theory complements any instrument study',
      'Consider your schedule when choosing course times',
    ];
  }

  return knowledge;
}

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
    if (knowledge.statistics) results.push(`Platform Statistics: ${JSON.stringify(knowledge.statistics)}`);
    if (knowledge.courses) results.push(`Available Courses: ${JSON.stringify(knowledge.courses.slice(0, 3).map((c: any) => c.title))}`);
  }

  return results.slice(0, 8).join('\n\n');
}

function checkPrivacy(query: string, roles: string[]): boolean {
  const privacyWords = ['other students', 'student data', 'student names', 'student emails', 'all students', 'student personal'];
  const asking = privacyWords.some(w => query.toLowerCase().includes(w));
  const canAccess = roles.includes('Admin') || roles.includes('Creator');
  return asking && !canAccess;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userRoles, userInfo } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const roles = userRoles || ['Student'];

    if (checkPrivacy(message, roles)) {
      return NextResponse.json({
        success: true,
        response: `I cannot share information about other students. This data is confidential.\n\nI can help you with:\n- **Course information** and recommendations\n- **Your own progress** and schedule\n- **General music education** guidance\n\nWhat else can I help with?`,
      });
    }

    const knowledge = await buildKnowledgeBase(roles);
    const context = findRelevantContext(message, knowledge);

    const systemPrompt = `You are the AI assistant for Moonriver Music Education Platform. You help users with music education questions.

USER INFO:
- Name: ${userInfo?.name || 'User'}
- Email: ${userInfo?.email || ''}
- Roles: ${roles.join(', ')}

${roles.includes('Admin') ? `ADMIN ACCESS: You have full access to all platform data including students, creators, appointments, enrollments, and statistics. Help the admin search and analyze this data.` : ''}
${roles.includes('Creator') ? `CREATOR ACCESS: You can see student data, enrollments, and appointments relevant to teaching.` : ''}

RELEVANT CONTEXT (from platform database):
${context}

FULL KNOWLEDGE BASE:
${JSON.stringify(knowledge, null, 2).slice(0, 4000)}

Be helpful, concise, and accurate. Format responses with markdown. For admins searching data, present results in organized tables or lists.`;

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
      const errorText = await openrouterResponse.text();
      console.error('OpenRouter error:', errorText);

      const fallbackResponse = generateFallbackResponse(message, knowledge, roles);
      return NextResponse.json({ success: true, response: fallbackResponse, context: 'Fallback response (AI service unavailable)' });
    }

    const aiResponse = await openrouterResponse.json();
    return NextResponse.json({
      success: true,
      response: aiResponse.choices[0].message.content,
      context: context ? 'Used RAG context' : 'General response',
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

function generateFallbackResponse(query: string, knowledge: any, roles: string[]): string {
  const q = query.toLowerCase();

  if (q.includes('appointment') || q.includes('schedule')) {
    const appointments = knowledge.allAppointments || knowledge.appointmentData || [];
    if (appointments.length > 0) {
      const list = appointments.slice(0, 5).map((a: any) =>
        `- **${a.title}** | ${a.studentName || a.student_name || 'Student'} with ${a.creatorName || a.creator_name || 'Creator'} | ${a.startTime?.split?.('T')[0] || a.start_time?.split?.('T')[0]} | Status: ${a.status}`
      ).join('\n');
      return `Here are the recent appointments:\n\n${list}\n\nTotal: ${appointments.length} appointments found.`;
    }
    return 'No appointments found matching your query.';
  }

  if (q.includes('course') || q.includes('enroll')) {
    const courses = knowledge.courses || [];
    const list = courses.slice(0, 5).map((c: any) =>
      `- **${c.title || c.name}** (${c.level}) by ${c.creatorName} - $${c.price} | ${c.currentStudents}/${c.maxStudents} students`
    ).join('\n');
    return `Here are the available courses:\n\n${list}`;
  }

  if (q.includes('student')) {
    const students = knowledge.allStudents || [];
    if (students.length > 0) {
      const list = students.map((s: any) =>
        `- **${s.name}** (${s.email}) - Level: ${s.level} | Interests: ${(s.interests || []).join(', ')}`
      ).join('\n');
      return `Platform students:\n\n${list}`;
    }
  }

  if (q.includes('creator') || q.includes('instructor') || q.includes('teacher')) {
    const creators = knowledge.creators || [];
    const list = creators.map((c: any) =>
      `- **${c.name}** - ${(c.specialties || []).join(', ')} | Rating: ${c.rating} | ${c.studentsCount} students`
    ).join('\n');
    return `Our creators:\n\n${list}`;
  }

  if (knowledge.statistics) {
    return `Here's a platform overview:\n\n- **${knowledge.statistics.totalCourses}** courses\n- **${knowledge.statistics.totalStudents}** students\n- **${knowledge.statistics.totalCreators}** creators\n- **${knowledge.statistics.totalEnrollments}** enrollments\n- **${knowledge.statistics.totalAppointments}** appointments (${knowledge.statistics.activeAppointments} active)\n\nAsk me about specific students, courses, appointments, or creators!`;
  }

  return 'I can help you with courses, appointments, student information, and more. What would you like to know?';
}
