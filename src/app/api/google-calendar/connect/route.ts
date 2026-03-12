import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/student/appointments?success=calendar_connected';
  const failUrl = (msg?: string) => {
    const base = returnTo.startsWith('http') ? returnTo : `${request.nextUrl.origin}${returnTo.startsWith('/') ? returnTo : `/${returnTo}`}`;
    const sep = base.includes('?') ? '&' : '?';
    let url = `${base}${sep}error=connect_failed`;
    if (msg && process.env.NODE_ENV === 'development') url += `&error_detail=${encodeURIComponent(msg)}`;
    return NextResponse.redirect(new URL(url));
  };

  try {
    const session = await auth0.getSession();
    if (!session) {
      console.error('[Connect] No session - user must be logged in');
      return failUrl('no_session');
    }

    const response = await auth0.connectAccount({
      connection: 'google-oauth2',
      scopes: GOOGLE_CALENDAR_SCOPES,
      returnTo,
    });

    return response;
  } catch (error: unknown) {
    const err = error as Error & { status?: number; code?: string; cause?: unknown };
    const detail = [
      err.name,
      err.message,
      err.code,
      err.status,
      err.cause ? String(err.cause) : '',
    ].filter(Boolean).join(' | ');
    console.error('[Connect Google Calendar]', detail);
    console.error('[Connect Google Calendar] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    if (err.cause && typeof err.cause === 'object') {
      console.error('[Connect Google Calendar] Cause details:', JSON.stringify(err.cause, Object.getOwnPropertyNames(err.cause), 2));
    }

    // missing_refresh_token: 当前 session 没有 refresh token
    if (err.code === 'missing_refresh_token') {
      const fromLogin = request.nextUrl.searchParams.get('from_login');
      // 若刚从 login 回来仍无 refresh token，说明 Auth0 未返回，避免无限循环
      if (fromLogin === '1') {
        console.error('[Connect] Refresh token still missing after re-login. Enable Refresh Token grant in Auth0.');
        return failUrl('refresh_token_not_issued');
      }
      const connectRetryUrl = `${request.nextUrl.origin}/api/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}&from_login=1`;
      return NextResponse.redirect(new URL(`/auth/login?returnTo=${encodeURIComponent(connectRetryUrl)}`, request.url));
    }

    return failUrl(detail);
  }
}
