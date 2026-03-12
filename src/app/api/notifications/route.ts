import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '../../../../lib/auth0.js';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userEmail = session.user.email;
    const notifications = await sql`
      SELECT id, type, recipient_email as "recipientEmail", sender_email as "senderEmail", sender_name as "senderName",
        title, message, metadata, read, created_at as "createdAt"
      FROM notifications
      WHERE recipient_email = ${userEmail}
      ORDER BY created_at DESC
    `;

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userEmail = session.user.email;
    const body = await request.json();
    const { action, recipientEmail, type, title, message, metadata } = body;

    if (action === 'create') {
      if (!recipientEmail || !type || !title || !message) {
        return NextResponse.json(
          { error: 'recipientEmail, type, title, and message are required' },
          { status: 400 }
        );
      }

      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await sql`
        INSERT INTO notifications (id, type, recipient_email, sender_email, sender_name, title, message, metadata, read, created_at)
        VALUES (${id}, ${type}, ${recipientEmail}, ${userEmail}, ${session.user.name || userEmail}, ${title}, ${message}, ${JSON.stringify(metadata || {})}, false, ${new Date().toISOString()})
      `;

      return NextResponse.json({ success: true, notification: { id, type, recipientEmail, senderEmail: userEmail, senderName: session.user.name || userEmail, title, message, metadata: metadata || {}, read: false, createdAt: new Date().toISOString() } });
    }

    if (action === 'mark_read') {
      const { notificationId } = body;
      if (!notificationId) return NextResponse.json({ error: 'notificationId required' }, { status: 400 });

      const result = await sql`
        UPDATE notifications SET read = true WHERE id = ${notificationId} AND recipient_email = ${userEmail}
      `;
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_all_read') {
      await sql`
        UPDATE notifications SET read = true WHERE recipient_email = ${userEmail}
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
