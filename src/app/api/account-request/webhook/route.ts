import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendAccountRequestEmails,
  sendAccountRequestStatusEmail,
} from '@/lib/mail/mailer';

interface AccountRequestRecord {
  id?: string;
  full_name?: string;
  work_email?: string;
  company_name?: string;
  plant_name?: string;
  designation?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  reason?: string | null;
  status?: string;
  admin_notes?: string | null;
  created_at?: string;
}

interface SupabaseWebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: AccountRequestRecord | null;
  old_record?: { status?: string } | null;
}

// Process-level fallback idempotency cache if notification log migration has not been run yet
const inMemoryProcessedEvents = new Set<string>();

function timingSafeSecretMatch(incoming: string | null, expected: string): boolean {
  if (!incoming) return false;
  const a = Buffer.from(incoming);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function formatIstTimestamp(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function claimIdempotencyKey(
  eventKey: string,
  accountRequestId: string,
  eventType: 'INSERT' | 'UPDATE_APPROVED' | 'UPDATE_REJECTED',
  recipientEmail: string
): Promise<{ claimed: boolean; logId?: string; usingDb: boolean }> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('account_request_notifications_log')
      .insert([
        {
          account_request_id: accountRequestId,
          event_key: eventKey,
          event_type: eventType,
          recipient_email: recipientEmail,
          status: 'processing',
        },
      ])
      .select('id')
      .single();

    if (!error && data) {
      return { claimed: true, logId: data.id, usingDb: true };
    }

    // PostgreSQL unique_violation (23505) => duplicate webhook delivery
    if (error?.code === '23505') {
      return { claimed: false, usingDb: true };
    }

    // If table doesn't exist yet (PGRST205), fall back to in-memory set
    if (error?.code !== 'PGRST205') {
      console.warn('Notification log insert warning:', error?.message);
    }
  }

  if (inMemoryProcessedEvents.has(eventKey)) {
    return { claimed: false, usingDb: false };
  }
  inMemoryProcessedEvents.add(eventKey);
  return { claimed: true, usingDb: false };
}

async function updateIdempotencyLog(
  logId: string | undefined,
  status: 'sent' | 'failed',
  errorMessage?: string | null
) {
  if (!logId) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase
    .from('account_request_notifications_log')
    .update({
      status,
      error_message: errorMessage ? errorMessage.slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

/**
 * Supabase Database Webhook handler for `public.account_requests` (INSERT & UPDATE).
 * Protected by `x-webhook-secret` matching `ACCOUNT_REQUEST_WEBHOOK_SECRET`.
 */
export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.ACCOUNT_REQUEST_WEBHOOK_SECRET;
    if (!configuredSecret || configuredSecret.trim().length === 0) {
      console.error('ACCOUNT_REQUEST_WEBHOOK_SECRET is not configured.');
      return NextResponse.json(
        { ok: false, error: 'Webhook authentication is not configured on server.' },
        { status: 500 }
      );
    }

    const incomingSecret = req.headers.get('x-webhook-secret');
    if (!timingSafeSecretMatch(incomingSecret, configuredSecret)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized webhook request.' },
        { status: 401 }
      );
    }

    let payload: SupabaseWebhookPayload;
    try {
      payload = (await req.json()) as SupabaseWebhookPayload;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON webhook payload.' },
        { status: 400 }
      );
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      (payload.schema && payload.schema !== 'public') ||
      payload.table !== 'account_requests' ||
      (payload.type !== 'INSERT' && payload.type !== 'UPDATE') ||
      !payload.record ||
      !payload.record.id
    ) {
      return NextResponse.json(
        { ok: false, error: 'Invalid webhook payload: expected public.account_requests INSERT or UPDATE.' },
        { status: 400 }
      );
    }

    const record = payload.record;
    const requestId = record.id as string;
    const workEmail = record.work_email?.trim().toLowerCase();

    if (!workEmail) {
      return NextResponse.json(
        { ok: false, error: 'Missing applicant work_email in account_requests record.' },
        { status: 400 }
      );
    }

    // 1. Handle INSERT => Applicant Acknowledgement + Admin Notification
    if (payload.type === 'INSERT') {
      const eventKey = `INSERT:${requestId}`;
      const claim = await claimIdempotencyKey(eventKey, requestId, 'INSERT', workEmail);
      if (!claim.claimed) {
        return NextResponse.json({ ok: true, duplicate: true, eventKey });
      }

      const mailRes = await sendAccountRequestEmails(
        {
          fullName: record.full_name || 'Applicant',
          workEmail,
          companyName: record.company_name || 'Organization',
          plantName: record.plant_name || 'Facility',
          designation: record.designation || 'N/A',
          phone: record.phone || 'N/A',
          city: record.city || 'N/A',
          state: record.state || 'N/A',
          reason: record.reason || 'N/A',
        },
        {
          id: requestId,
          status: record.status || 'pending',
          createdAt: formatIstTimestamp(record.created_at),
        }
      );

      await updateIdempotencyLog(
        claim.logId,
        mailRes.success ? 'sent' : 'failed',
        mailRes.error || null
      );

      if (!mailRes.success) {
        return NextResponse.json(
          {
            ok: false,
            eventKey,
            requestSaved: true,
            emailSent: false,
            applicantSent: mailRes.applicantSent,
            adminSent: mailRes.adminSent,
            error: mailRes.error || 'Email delivery failed.',
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        ok: true,
        eventKey,
        requestId,
        emailSent: true,
        applicantSent: mailRes.applicantSent,
        adminSent: mailRes.adminSent,
      });
    }

    // 2. Handle UPDATE => Only notify on status transition to 'approved' or 'rejected'
    const newStatus = record.status?.trim().toLowerCase();
    const oldStatus = payload.old_record?.status?.trim().toLowerCase();

    if (!newStatus || newStatus === oldStatus || (newStatus !== 'approved' && newStatus !== 'rejected')) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'Status unchanged or non-notifiable status.',
      });
    }

    const eventType = newStatus === 'approved' ? 'UPDATE_APPROVED' : 'UPDATE_REJECTED';
    const eventKey = `UPDATE:${requestId}:${newStatus}`;
    const claim = await claimIdempotencyKey(eventKey, requestId, eventType, workEmail);
    if (!claim.claimed) {
      return NextResponse.json({ ok: true, duplicate: true, eventKey });
    }

    const statusMailRes = await sendAccountRequestStatusEmail({
      requestId,
      fullName: record.full_name || 'Applicant',
      workEmail,
      companyName: record.company_name || 'Organization',
      plantName: record.plant_name || 'Facility',
      status: newStatus,
      adminNotes: record.admin_notes ?? null,
    });

    await updateIdempotencyLog(
      claim.logId,
      statusMailRes.success ? 'sent' : 'failed',
      statusMailRes.error || null
    );

    if (!statusMailRes.success) {
      return NextResponse.json(
        {
          ok: false,
          eventKey,
          requestSaved: true,
          emailSent: false,
          error: statusMailRes.error || 'Status email delivery failed.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      eventKey,
      requestId,
      status: newStatus,
      emailSent: true,
    });
  } catch (err: any) {
    console.error('Account request webhook error:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: 'Failed to process account request webhook.' },
      { status: 500 }
    );
  }
}

