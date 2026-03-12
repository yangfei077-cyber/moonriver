import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';
import { getGoogleAccessToken } from '@/lib/google-calendar-token';

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = await getGoogleAccessToken(request);
    return NextResponse.json({ connected: !!token });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
