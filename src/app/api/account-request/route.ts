import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
    if (!emailRegex.test(payload.workEmail.trim())) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address provided.' },
        { status: 400 }
      );
    }

    // 2. Save request in Supabase database (INSERT webhook handles applicant & admin emails)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Database service is not configured on server.' },
        { status: 500 }
      );
    }

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

    if (dbError || !data) {
      console.error('Supabase account_requests insert error:', dbError?.message);
      return NextResponse.json(
        { success: false, error: 'Failed to save account request in database.' },
        { status: 500 }
      );
    }

    // 3. Return immediately; Supabase INSERT webhook dispatches applicant & admin emails asynchronously
    return NextResponse.json({
      success: true,
      requestId: data.id,
      dbSaved: true,
      notificationQueued: true,
      message:
        'Your Account Request has been submitted successfully. A confirmation email will be sent to your registered work email address.',
    });
  } catch (error: any) {
    console.error('Account request route error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing request.' },
      { status: 500 }
    );
  }
}
