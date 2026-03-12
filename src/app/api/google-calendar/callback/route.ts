import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), 'data', 'google-tokens.json');

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeTokens(data: any) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/student/appointments?error=oauth_error', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/student/appointments?error=missing_params', request.url));
  }

  try {
    const redirectUri = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/google-calendar/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/student/appointments?error=token_error', request.url));
    }

    const tokens = await tokenResponse.json();
    const allTokens = readTokens();
    allTokens[state] = { ...tokens, updatedAt: new Date().toISOString() };
    writeTokens(allTokens);

    return NextResponse.redirect(new URL('/student/appointments?success=calendar_connected', request.url));
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    return NextResponse.redirect(new URL('/student/appointments?error=callback_error', request.url));
  }
}
