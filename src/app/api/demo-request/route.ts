import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDemoRequestEmails } from '@/lib/mail/mailer';

interface DemoRequestBody {
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  companyName?: string;
  plantName?: string;
  designation?: string;
  city?: string;
  state?: string;
  message?: string;
}

function generateDemoRequestId(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CT-DEMO-${y}${m}${d}-${rand}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DemoRequestBody;

    const fullName = body.fullName?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const mobileNumber = body.mobileNumber?.trim() || '';
    const companyName = body.companyName?.trim() || '';
    const plantName = body.plantName?.trim() || '';
    const designation = body.designation?.trim() || null;
    const city = body.city?.trim() || '';
    const state = body.state?.trim() || '';
    const message = body.message?.trim() || null;

    // 1. Validate required fields
    if (!fullName || !email || !mobileNumber || !companyName || !plantName || !city || !state) {
      return NextResponse.json(
        { success: false, error: 'Please fill in all required fields.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid official email address.' },
        { status: 400 }
      );
    }

    const digitsOnly = mobileNumber.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // 2. Save in Supabase demo_requests table
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

    const demoRequestId = generateDemoRequestId();

    const { data, error: dbError } = await supabase
      .from('demo_requests')
      .insert([
        {
          demo_request_id: demoRequestId,
          full_name: fullName,
          email,
          mobile_number: mobileNumber,
          company_name: companyName,
          plant_name: plantName,
          designation,
          city,
          state,
          message,
          status: 'Pending',
        },
      ])
      .select('id, demo_request_id, created_at')
      .single();

    if (dbError || !data) {
      console.error('Supabase demo_requests insert error:', dbError?.message);
      return NextResponse.json(
        { success: false, error: 'Failed to save demo request in database.' },
        { status: 500 }
      );
    }

    const submittedAt = new Date(data.created_at || Date.now()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // 3. Send Admin & User confirmation emails (request remains saved even if SMTP fails)
    const mailResult = await sendDemoRequestEmails({
      demoRequestId: data.demo_request_id,
      fullName,
      email,
      mobileNumber,
      companyName,
      plantName,
      designation,
      city,
      state,
      message,
      submittedAt,
    });

    return NextResponse.json({
      success: true,
      demoRequestId: data.demo_request_id,
      dbSaved: true,
      emailSent: mailResult.success,
      userEmailSent: mailResult.userSent,
      adminEmailSent: mailResult.adminSent,
      emailError: mailResult.error || null,
    });
  } catch (err: any) {
    console.error('Demo request route error:', err?.message || err);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing demo request.' },
      { status: 500 }
    );
  }
}

