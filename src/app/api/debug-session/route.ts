import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../lib/auth0.js';

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    let tokenResult: { token?: string; error?: string } = {};
    try {
      const result = await auth0.getAccessTokenForConnection(
        { connection: 'google-oauth2' },
        request,
        undefined
      );
      tokenResult = { token: result.token ? 'exists' : 'empty' };
    } catch (err: unknown) {
      const e = err as Error & { code?: string; cause?: unknown };
      const cause = e.cause as Error | undefined;
      tokenResult = { error: `${e.code || e.name}: ${e.message}`, cause: cause ? `${(cause as any).code || cause.name}: ${cause.message}` : undefined } as any;
    }

    return NextResponse.json({
      hasRefreshToken: !!session.tokenSet?.refreshToken,
      scopes: session.tokenSet?.scope,
      user: session.user?.email,
      googleToken: tokenResult,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
