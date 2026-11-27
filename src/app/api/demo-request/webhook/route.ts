import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDemoRequestStatusEmail } from '@/lib/mail/mailer';

interface DemoRequestRecord {
  id?: string;
  demo_request_id?: string;
  full_name?: string;
  email?: string;
  company_name?: string;
  plant_name?: string;
  status?: string;
  scheduled_demo_date?: string | null;
  scheduled_demo_time?: string | null;
  admin_notes?: string | null;
}

interface SupabaseWebhookPayload {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: DemoRequestRecord | null;
  old_record?: {
    status?: string;
    scheduled_demo_date?: string | null;
    scheduled_demo_time?: string | null;
  } | null;
}

const NOTIFIABLE_DEMO_STATUSES = new Set([
  'Contacted',
  'Demo Scheduled',
  'Demo Completed',
  'Cancelled',
]);

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

/**
 * Supabase Database Webhook handler for `public.demo_requests` UPDATE events.
 * Uses `public.demo_request_notifications_log` for database-backed duplicate prevention.
 */
export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.DEMO_REQUEST_WEBHOOK_SECRET;
    if (!configuredSecret || configuredSecret.trim().length === 0) {
      console.error('DEMO_REQUEST_WEBHOOK_SECRET is not configured.');
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
      payload.table !== 'demo_requests' ||
      payload.type !== 'UPDATE' ||
      !payload.record
    ) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'Not a public.demo_requests UPDATE event.',
      });
    }

    const { record, old_record } = payload;
    const newStatus = record.status?.trim() || '';
    const oldStatus = old_record?.status?.trim() || '';
    const newDate = record.scheduled_demo_date || '';
    const oldDate = old_record?.scheduled_demo_date || '';
    const newTime = record.scheduled_demo_time?.trim() || '';
    const oldTime = old_record?.scheduled_demo_time?.trim() || '';

    const statusChanged = newStatus !== oldStatus;
    const scheduleUpdatedWhileScheduled =
      newStatus === 'Demo Scheduled' && (newDate !== oldDate || newTime !== oldTime);

    if (
      !NOTIFIABLE_DEMO_STATUSES.has(newStatus) ||
      (!statusChanged && !scheduleUpdatedWhileScheduled)
    ) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'Status unchanged or non-notifiable update.',
      });
    }

    if (!record.email || !record.demo_request_id) {
      return NextResponse.json(
        { ok: false, error: 'Missing required email or demo_request_id in payload.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Database service is not configured on server.' },
        { status: 500 }
      );
    }

    const eventKey = `UPDATE:${record.id || record.demo_request_id}:${newStatus}:${newDate}:${newTime}`;

    // Database-backed idempotency claim (no in-memory variables)
    const { data: logRow, error: logError } = await supabase
      .from('demo_request_notifications_log')
      .insert([
        {
          demo_request_id: record.demo_request_id,
          event_key: eventKey,
          event_type: `UPDATE_${newStatus.toUpperCase().replace(/\s+/g, '_')}`,
          recipient_email: record.email.trim().toLowerCase(),
          status: 'processing',
        },
      ])
      .select('id')
      .single();

    if (logError) {
      if (logError.code === '23505') {
        return NextResponse.json({ ok: true, duplicate: true, eventKey });
      }
      console.error('Demo notification log insert error:', logError.message);
      return NextResponse.json(
        { ok: false, error: 'Idempotency log unavailable; ensure demo_requests_notifications migration is applied.' },
        { status: 500 }
      );
    }

    const mailRes = await sendDemoRequestStatusEmail({
      demoRequestId: record.demo_request_id,
      fullName: record.full_name || 'User',
      email: record.email.trim().toLowerCase(),
      companyName: record.company_name || 'Organization',
      plantName: record.plant_name || 'Facility',
      status: newStatus as 'Contacted' | 'Demo Scheduled' | 'Demo Completed' | 'Cancelled',
      scheduledDemoDate: record.scheduled_demo_date ?? null,
      scheduledDemoTime: record.scheduled_demo_time ?? null,
      adminNotes: record.admin_notes ?? null,
    });

    await supabase
      .from('demo_request_notifications_log')
      .update({
        status: mailRes.success ? 'sent' : 'failed',
        error_message: mailRes.error ? mailRes.error.slice(0, 500) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', logRow.id);

    if (!mailRes.success) {
      return NextResponse.json(
        {
          ok: false,
          eventKey,
          emailSent: false,
          error: mailRes.error || 'Email delivery failed.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      eventKey,
      demoRequestId: record.demo_request_id,
      status: newStatus,
      emailSent: true,
    });
  } catch (err: any) {
    console.error('Demo request webhook error:', err?.message || err);
    return NextResponse.json(
      { ok: false, error: 'Failed to process demo request webhook.' },
      { status: 500 }
    );
  }
}

