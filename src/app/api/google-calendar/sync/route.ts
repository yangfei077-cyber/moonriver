import { NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';
import fs from 'fs';
import path from 'path';
import { sql } from '@/lib/db';

const TOKENS_FILE = path.join(process.cwd(), 'data', 'google-tokens.json');

function getToken(userId: string): string | null {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    return tokens[userId]?.access_token || null;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = getToken(session.user.sub);
    if (!accessToken) {
      return NextResponse.json({ error: 'Not connected to Google Calendar' }, { status: 400 });
    }

    const userEmail = session.user.email;
    const appointments = await sql`
      SELECT * FROM appointments
      WHERE (student_email = ${userEmail} OR creator_email = ${userEmail})
      AND status != 'cancelled'
    `;

    let syncedCount = 0;
    let cancelledCount = 0;

    // Push: sync unsynced to Google Calendar
    const unsynced = appointments.filter((a: any) => !a.google_event_id);
    for (const apt of unsynced) {
      try {
        const event = {
          summary: apt.title,
          description: `${apt.description || ''}\n\nMoonriver Music Education Platform`,
          start: { dateTime: new Date(apt.start_time).toISOString(), timeZone: 'UTC' },
          end: { dateTime: new Date(apt.end_time).toISOString(), timeZone: 'UTC' },
          location: apt.location || 'Online',
          extendedProperties: { private: { moonriver: 'true', appointmentId: apt.id.toString() } },
        };

        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });

        if (response.ok) {
          const created = await response.json();
          await sql`UPDATE appointments SET google_event_id = ${created.id} WHERE id = ${apt.id}`;
          syncedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync appointment ${apt.id}:`, err);
      }
    }

    // Pull: check if synced events were cancelled in Google
    const synced = appointments.filter((a: any) => a.google_event_id);
    for (const apt of synced) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(apt.google_event_id)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (response.status === 404 || response.status === 410) {
          await sql`
            UPDATE appointments SET status = 'cancelled', cancellation_reason = 'Cancelled via Google Calendar', cancelled_at = ${new Date().toISOString()}
            WHERE id = ${apt.id}
          `;
          cancelledCount++;
        } else if (response.ok) {
          const event = await response.json();
          if (event.status === 'cancelled') {
            await sql`
              UPDATE appointments SET status = 'cancelled', cancellation_reason = 'Cancelled via Google Calendar', cancelled_at = ${new Date().toISOString()}
              WHERE id = ${apt.id}
            `;
            cancelledCount++;
          }
        }
      } catch (err) {
        console.error(`Failed to check Google event for appointment ${apt.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      cancelledCount,
      message: `Synced ${syncedCount} appointments, cancelled ${cancelledCount} from Google Calendar`,
    });
  } catch (error) {
    console.error('Google Calendar sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
