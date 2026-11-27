import { NextRequest, NextResponse } from 'next/server';
import { sendSupportTicketStatusEmail } from '@/lib/mail/mailer';

interface SupabaseWebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: {
    ticket_id?: string;
    full_name?: string;
    email?: string;
    issue_category?: string;
    issue_title?: string;
    affected_module?: string;
    priority?: string;
    status?: string;
    admin_notes?: string | null;
  } | null;
  old_record?: {
    status?: string;
  } | null;
}

const NOTIFIABLE_STATUSES = new Set([
  'In Progress',
  'Awaiting User Response',
  'Resolved',
  'Closed',
]);

/**
 * Supabase Database Webhook handler for `public.support_tickets` UPDATE events.
 * Sends an email notification to the ticket reporter whenever status changes
 * (e.g. marked as Resolved, In Progress, Awaiting User Response, or Closed in Supabase).
 */
export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.SUPPORT_WEBHOOK_SECRET;
    if (configuredSecret) {
      const incomingSecret = req.headers.get('x-webhook-secret');
      if (incomingSecret !== configuredSecret) {
        return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
      }
    }

    const payload = (await req.json()) as SupabaseWebhookPayload;

    if (payload.type !== 'UPDATE' || payload.table !== 'support_tickets' || !payload.record) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'Not a support_tickets UPDATE event.' });
    }

    const { record, old_record } = payload;
    const newStatus = record.status?.trim();
    const oldStatus = old_record?.status?.trim();

    if (!newStatus || newStatus === oldStatus || !NOTIFIABLE_STATUSES.has(newStatus)) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'Status unchanged or not a notifiable status.',
      });
    }

    if (!record.email || !record.ticket_id) {
      return NextResponse.json(
        { error: 'Missing required ticket email or ticket_id in webhook payload.' },
        { status: 400 }
      );
    }

    const mailResult = await sendSupportTicketStatusEmail({
      ticketId: record.ticket_id,
      fullName: record.full_name || 'User',
      email: record.email,
      issueCategory: record.issue_category || 'Support Request',
      issueTitle: record.issue_title || 'Support Ticket Update',
      affectedModule: record.affected_module || 'General',
      priority: record.priority || 'Medium',
      status: newStatus,
      adminNotes: record.admin_notes ?? null,
    });

    return NextResponse.json({
      ok: true,
      ticketId: record.ticket_id,
      status: newStatus,
      emailSent: mailResult.success,
    });
  } catch (err: any) {
    console.error('Support ticket status webhook error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process support ticket webhook.' },
      { status: 500 }
    );
  }
}

