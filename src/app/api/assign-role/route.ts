import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../lib/auth0.js';

async function getManagementToken(): Promise<string | null> {
  try {
    const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
        client_secret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  } catch {
    return null;
  }
}

async function assignRole(userId: string, roleName: string, managementToken: string): Promise<boolean> {
  try {
    // Get all roles
    const rolesRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/roles`, {
      headers: { Authorization: `Bearer ${managementToken}`, 'Content-Type': 'application/json' },
    });
    if (!rolesRes.ok) return false;

    const roles = await rolesRes.json();
    const role = roles.find((r: any) => r.name === roleName);
    if (!role) return false;

    // Assign role to user
    await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${userId}/roles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${managementToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: [role.id] }),
    });

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (role === 'creator') {
      const managementToken = await getManagementToken();
      if (managementToken) {
        await assignRole(session.user.sub, 'Creator', managementToken);
      }
      return NextResponse.redirect(new URL('/creator/onboarding', request.url));
    }

    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  } catch (error) {
    console.error('Assign role error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
