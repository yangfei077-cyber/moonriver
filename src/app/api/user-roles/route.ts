import { NextResponse } from 'next/server';
import { auth0 } from '../../../../lib/auth0.js';
import { getUserRoles } from '@/lib/user-roles';

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;
    const roles = await getUserRoles(userId);

    return NextResponse.json({ success: true, roles });
  } catch (error) {
    console.error('Error in user-roles API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
