import { auth0 } from '../../lib/auth0.js';
import type { NextRequest } from 'next/server';

/**
 * Get Google Calendar access token from Auth0 Token Vault.
 * Uses getAccessTokenForConnection to exchange Auth0 refresh token for Google access token.
 * @param request - NextRequest for session/cookie context (required in API routes)
 */
export async function getGoogleAccessToken(request?: NextRequest): Promise<string | null> {
  try {
    const { token } = await auth0.getAccessTokenForConnection(
      { connection: 'google-oauth2' },
      request,
      undefined
    );
    return token;
  } catch {
    return null;
  }
}
