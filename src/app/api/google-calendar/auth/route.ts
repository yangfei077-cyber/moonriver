import { NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/google-calendar/callback`;

    if (!clientId) {
      return NextResponse.json({ error: 'Google Calendar not configured' }, { status: 500 });
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${session.user.sub}`;

    return NextResponse.json({ success: true, authUrl });
  } catch (error) {
    console.error('Google Calendar auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
