import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSupportTicketEmails, isSmtpConfigured } from '@/lib/mail/mailer';
import { SupportIssueCategory, SupportPriority, SupportTicketStatus } from '@/types';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables missing');
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

const VALID_CATEGORIES: SupportIssueCategory[] = [
  'Bug / Technical Issue',
  'Website Glitch',
  'Login / Authentication Problem',
  'Data Entry Issue',
  'Calculation / Formula Issue',
  'Report / Export Issue',
  'Performance / Loading Issue',
  'Feature Request',
  'General Inquiry',
  'Other',
];

const VALID_PRIORITIES: SupportPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const VALID_STATUSES: SupportTicketStatus[] = ['Open', 'In Progress', 'Awaiting User Response', 'Resolved', 'Closed'];

function sanitizeText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function generateTicketId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CT-SUP-${y}${m}${d}-${rand}`;
}

// GET /api/support-tickets?userId=...&role=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User identification required' }, { status: 400 });
    }

    const supabase = getSupabase();
    let query = supabase
      .from('support_tickets')
      .select('id, ticket_id, user_id, full_name, email, issue_category, issue_title, description, affected_module, priority, status, admin_notes, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(100);

    // Protect private support records: non-admins can ONLY read their own tickets
    if (role !== 'admin') {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({
          success: true,
          tickets: [],
          tableMissing: true,
          message: 'Support tickets table not yet created in Supabase. Please run supabase/support_tickets_migration.sql.',
        });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tickets: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/support-tickets
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = sanitizeText(body.user_id, 120);
    const fullName = sanitizeText(body.full_name, 120);
    const email = sanitizeText(body.email, 160).toLowerCase();
    const issueCategory = sanitizeText(body.issue_category, 80) as SupportIssueCategory;
    const issueTitle = sanitizeText(body.issue_title, 180);
    const description = sanitizeText(body.description, 4000);
    const affectedModule = sanitizeText(body.affected_module, 120);
    const priority = sanitizeText(body.priority, 20) as SupportPriority;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authenticated user ID is required.' }, { status: 400 });
    }
    if (fullName.length < 2) {
      return NextResponse.json({ success: false, error: 'Full Name is required (minimum 2 characters).' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'A valid Email Address is required.' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(issueCategory)) {
      return NextResponse.json({ success: false, error: 'Please select a valid Issue Category.' }, { status: 400 });
    }
    if (issueTitle.length < 4) {
      return NextResponse.json({ success: false, error: 'Issue Title must be at least 4 characters.' }, { status: 400 });
    }
    if (description.length < 10) {
      return NextResponse.json({ success: false, error: 'Detailed Description must be at least 10 characters.' }, { status: 400 });
    }
    if (!affectedModule) {
      return NextResponse.json({ success: false, error: 'Please select the affected Page / Module.' }, { status: 400 });
    }
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ success: false, error: 'Please select a valid Priority.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Duplicate protection: prevent identical title by same user within 60 seconds
    const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recentDup } = await supabase
      .from('support_tickets')
      .select('ticket_id')
      .eq('user_id', userId)
      .ilike('issue_title', issueTitle)
      .gte('created_at', sixtySecAgo)
      .maybeSingle();

    if (recentDup) {
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate submission prevented: Ticket ${recentDup.ticket_id} was already created for this issue moments ago.`,
        },
        { status: 409 }
      );
    }

    const ticketId = generateTicketId();

    const { data, error } = await supabase
      .from('support_tickets')
      .insert([
        {
          ticket_id: ticketId,
          user_id: userId,
          full_name: fullName,
          email,
          issue_category: issueCategory,
          issue_title: issueTitle,
          description,
          affected_module: affectedModule,
          priority,
          status: 'Open',
        },
      ])
      .select('id, ticket_id, user_id, full_name, email, issue_category, issue_title, description, affected_module, priority, status, created_at')
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json(
          {
            success: false,
            error: "Database table 'public.support_tickets' is not created yet. Please run supabase/support_tickets_migration.sql in the Supabase SQL Editor.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Dispatch acknowledgement & internal notification emails in the background so UI responds immediately
    const emailQueued = isSmtpConfigured();
    if (emailQueued) {
      void sendSupportTicketEmails({
        ticketId: data.ticket_id,
        fullName: data.full_name,
        email: data.email,
        issueCategory: data.issue_category,
        issueTitle: data.issue_title,
        description: data.description,
        affectedModule: data.affected_module,
        priority: data.priority,
        createdAt: data.created_at,
      }).catch((mailErr) => {
        console.error('Background support email error:', mailErr);
      });
    }

    return NextResponse.json({
      success: true,
      ticket: data,
      emailSent: emailQueued,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/support-tickets (Restricted to authorized administrators)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const role = sanitizeText(body.role, 40);
    const id = sanitizeText(body.id, 80);
    const status = sanitizeText(body.status, 40) as SupportTicketStatus;
    const adminNotes = body.admin_notes !== undefined ? sanitizeText(body.admin_notes, 2000) : undefined;

    if (role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only administrators can update support ticket statuses.' },
        { status: 403 }
      );
    }

    if (!id || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: 'Valid ticket ID and status are required.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (adminNotes !== undefined) updatePayload.admin_notes = adminNotes;

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', id)
      .select('id, ticket_id, status, admin_notes, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

