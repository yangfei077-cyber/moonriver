import { NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), 'data', 'google-tokens.json');

function getToken(userId: string): string | null {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    return tokens[userId]?.access_token || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = getToken(session.user.sub);
    if (!accessToken) {
      return NextResponse.json({ error: 'Not connected to Google Calendar' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const maxTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(maxTime)}&` +
      `singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: response.status });
    }

    const data = await response.json();
    const events = (data.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || 'Untitled',
      date: event.start?.date || event.start?.dateTime?.split('T')[0] || '',
      time: event.start?.dateTime
        ? `${new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
        : 'All day',
      duration: '1 hour',
      status: 'confirmed',
      source: 'google_calendar',
      description: event.description || '',
      location: event.location || '',
      googleEventId: event.id,
      creatorName: event.organizer?.displayName || 'Google Calendar',
    }));

    return NextResponse.json({ success: true, appointments: events });
  } catch (error) {
    console.error('Google Calendar events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
