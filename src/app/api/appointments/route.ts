import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../lib/auth0.js';
import { sql } from '@/lib/db';
import { getGoogleAccessToken } from '@/lib/google-calendar-token';

async function deleteGoogleEvent(accessToken: string, googleEventId: string) {
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err) {
    console.error('Failed to delete Google Calendar event:', err);
  }
}

async function updateGoogleEvent(accessToken: string, googleEventId: string, startTime: string, endTime: string, title: string) {
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: title,
          start: { dateTime: new Date(startTime).toISOString(), timeZone: 'UTC' },
          end: { dateTime: new Date(endTime).toISOString(), timeZone: 'UTC' },
        }),
      }
    );
  } catch (err) {
    console.error('Failed to update Google Calendar event:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const allParam = searchParams.get('all');

    let appointments = await sql`
      SELECT id, creator_email as "creatorEmail", creator_name as "creatorName", student_email as "studentEmail",
        student_name as "studentName", course_id as "courseId", title, description, start_time as "startTime",
        end_time as "endTime", status, type, location, google_event_id as "googleEventId", created_at as "createdAt"
      FROM appointments
      WHERE status != 'cancelled'
    `;

    if (allParam !== 'true') {
      if (role === 'creator') {
        appointments = appointments.filter((a: any) => a.creatorEmail === userEmail);
      } else {
        appointments = appointments.filter((a: any) => a.studentEmail === userEmail);
      }
    }

    appointments.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const transformed = appointments.map((apt: any) => {
      const start = new Date(apt.startTime);
      const end = new Date(apt.endTime);
      const durationMs = end.getTime() - start.getTime();
      const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10;
      const dateOnly = apt.startTime.split?.('T')[0] || apt.startTime?.toISOString?.().split('T')[0];

      return {
        id: apt.id,
        creatorName: apt.creatorName,
        creatorEmail: apt.creatorEmail,
        studentName: apt.studentName,
        studentEmail: apt.studentEmail,
        title: apt.title,
        date: dateOnly,
        time: `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
        duration: durationHours === 1 ? '1 hour' : `${durationHours} hours`,
        status: apt.status,
        description: apt.description,
        location: apt.location,
        courseId: apt.courseId,
        googleEventId: apt.googleEventId,
        source: 'moonriver',
      };
    });

    return NextResponse.json({ success: true, appointments: transformed, total: transformed.length });
  } catch (error) {
    console.error('Appointments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userEmail = session.user.email;
    const userName = session.user.name || userEmail;
    const { action, ...data } = await request.json();

    if (action === 'create') {
      const { creatorEmail, creatorName, studentEmail, studentName, title, date, time, notes, type = 'lesson' } = data;
      if (!title || !date || !time) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

      const startTimeISO = `${date}T${time}:00`;
      const [hours, minutes] = time.split(':').map(Number);
      const endHour = hours + 1;
      const endTimeISO = `${date}T${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      const isCreatorCreating = creatorEmail === userEmail;
      const finalCreatorEmail = isCreatorCreating ? userEmail : (creatorEmail || '');
      const finalCreatorName = isCreatorCreating ? userName : (creatorName || '');
      const finalStudentEmail = isCreatorCreating ? (studentEmail || userEmail) : userEmail;
      const finalStudentName = isCreatorCreating ? (studentName || 'Student') : userName;

      const [inserted] = await sql`
        INSERT INTO appointments (creator_email, creator_name, student_email, student_name, course_id, title, description, start_time, end_time, status, type, location, google_event_id, created_at)
        VALUES (${finalCreatorEmail}, ${finalCreatorName}, ${finalStudentEmail}, ${finalStudentName}, ${data.courseId || null}, ${title}, ${notes || ''}, ${startTimeISO}, ${endTimeISO}, 'pending', ${type}, ${data.location || 'Online'}, null, ${new Date().toISOString()})
        RETURNING id
      `;

      const newId = inserted?.id;

      const accessToken = await getGoogleAccessToken(request);
      if (accessToken && newId) {
        try {
          const event = {
            summary: title,
            description: `${notes || ''}\n\nMoonriver Music Education Platform`,
            start: { dateTime: new Date(startTimeISO).toISOString(), timeZone: 'UTC' },
            end: { dateTime: new Date(endTimeISO).toISOString(), timeZone: 'UTC' },
            location: data.location || 'Online',
            extendedProperties: { private: { moonriver: 'true', appointmentId: newId.toString() } },
          };
          const gcalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });
          if (gcalRes.ok) {
            const created = await gcalRes.json();
            await sql`UPDATE appointments SET google_event_id = ${created.id} WHERE id = ${newId}`;
          }
        } catch (err) {
          console.error('Auto-sync to Google Calendar failed:', err);
        }
      }

      const newAppointment = {
        id: newId,
        creatorEmail: finalCreatorEmail,
        creatorName: finalCreatorName,
        studentEmail: finalStudentEmail,
        studentName: finalStudentName,
        courseId: data.courseId || null,
        title,
        description: notes || '',
        startTime: startTimeISO,
        endTime: endTimeISO,
        status: 'pending',
        type,
        location: data.location || 'Online',
        googleEventId: null,
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, appointment: newAppointment });
    }

    if (action === 'reschedule') {
      const { appointmentId, newDate, newTime, notes } = data;
      if (!appointmentId || !newDate || !newTime) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

      const [apt] = await sql`SELECT * FROM appointments WHERE id = ${Number(appointmentId)}`;
      if (!apt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const [h, m] = newTime.split(':').map(Number);
      const newStartTime = `${newDate}T${newTime}:00`;
      const newEndTime = `${newDate}T${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;

      await sql`
        UPDATE appointments SET start_time = ${newStartTime}, end_time = ${newEndTime}, status = 'pending', updated_at = ${new Date().toISOString()}
        WHERE id = ${Number(appointmentId)}
      `;

      if (apt.google_event_id) {
        const accessToken = await getGoogleAccessToken(request);
        if (accessToken) {
          await updateGoogleEvent(accessToken, apt.google_event_id, newStartTime, newEndTime, apt.title);
        }
      }

      return NextResponse.json({ success: true, message: 'Rescheduled' });
    }

    if (action === 'cancel') {
      const { appointmentId, reason } = data;
      const [apt] = await sql`SELECT * FROM appointments WHERE id = ${Number(appointmentId)}`;
      if (!apt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (apt.google_event_id) {
        const accessToken = await getGoogleAccessToken(request);
        if (accessToken) {
          await deleteGoogleEvent(accessToken, apt.google_event_id);
        }
      }

      await sql`
        UPDATE appointments SET status = 'cancelled', cancellation_reason = ${reason || ''}, cancelled_at = ${new Date().toISOString()}
        WHERE id = ${Number(appointmentId)}
      `;

      return NextResponse.json({ success: true, message: 'Cancelled' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Appointments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
