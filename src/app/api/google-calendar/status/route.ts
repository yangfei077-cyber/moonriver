import { NextResponse } from 'next/server';
import { auth0 } from '../../../../../lib/auth0.js';
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), 'data', 'google-tokens.json');

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let connected = false;
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
      connected = !!tokens[session.user.sub]?.access_token;
    } catch {
      connected = false;
    }

    return NextResponse.json({ connected });
  } catch (error) {
    return NextResponse.json({ connected: false });
  }
}
