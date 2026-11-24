import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAccountRequestEmails } from '@/lib/mail/mailer';
import { AccountRequestPayload } from '@/types';

export async function POST(request: Request) {
  try {
    const payload: AccountRequestPayload = await request.json();

    // 1. Server-side validation
    if (!payload.fullName || !payload.workEmail || !payload.companyName || !payload.plantName) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing from account request submission.' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.workEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address provided.' },
        { status: 400 }
      );
    }

    let requestId = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    let submittedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    let dbSaved = false;

    // 2. Save request in Supabase database first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

        const { data, error: dbError } = await supabase
          .from('account_requests')
          .insert([
            {
              full_name: payload.fullName.trim(),
              work_email: payload.workEmail.trim().toLowerCase(),
              company_name: payload.companyName.trim(),
              plant_name: payload.plantName.trim(),
              designation: payload.designation ? payload.designation.trim() : null,
              phone: payload.phone ? payload.phone.trim() : null,
              city: payload.city ? payload.city.trim() : null,
              state: payload.state ? payload.state.trim() : null,
              reason: payload.reason ? payload.reason.trim() : null,
              status: 'pending',
            },
          ])
          .select('id, created_at')
          .single();

        if (!dbError && data) {
          dbSaved = true;
          requestId = data.id;
          if (data.created_at) {
            submittedAt = new Date(data.created_at).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short',
            });
          }
        } else if (dbError) {
          console.warn('Supabase insertion notice:', dbError.message);
        }
      } catch (dbErr: any) {
        console.warn('Supabase connection notice:', dbErr.message);
      }
    }

    // 3. Send SMTP Email Notification to chittortech@gmail.com from contact@chittortech.in
    let emailSent = false;
    let emailError: string | null = null;

    try {
      const mailRes = await sendAccountRequestEmails(payload, {
        id: requestId,
        status: 'Pending',
        createdAt: submittedAt,
      });

      emailSent = mailRes.success;
      if (!mailRes.success) {
        emailError = mailRes.error || 'SMTP delivery issue';
      }
    } catch (err: any) {
      console.error('SMTP notification error:', err);
      emailError = err.message || 'SMTP exception';
    }

    // 4. Return success response
    return NextResponse.json({
      success: true,
      requestId,
      emailSent,
      emailError,
      dbSaved,
      message:
        'Your account request has been received by ChittorTech. Our team will review your application and, once approved, your account access details will be sent to your registered email address.',
    });
  } catch (error: any) {
    console.error('Account request route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing request.' },
      { status: 500 }
    );
  }
}
