import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAccountRequestEmails } from '@/lib/mail/mailer';
import { AccountRequestPayload } from '@/types';

export async function POST(request: Request) {
  try {
    const payload: AccountRequestPayload = await request.json();

    // Basic server validation
    if (!payload.fullName || !payload.workEmail || !payload.companyName || !payload.plantName) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing from request submission.' },
        { status: 400 }
      );
    }

    // 1. Dispatch SMTP emails immediately to ChittorTech (business@chittortech.in)
    let emailSent = false;
    try {
      const mailRes = await sendAccountRequestEmails(payload);
      emailSent = mailRes.success;
    } catch (emailErr: any) {
      console.warn('SMTP dispatch note:', emailErr.message);
    }

    // 2. Attempt saving to Supabase database (non-blocking if Supabase platform DNS is propagating)
    let dbSaved = false;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

        const { error: dbError } = await supabase.from('account_requests').insert([
          {
            full_name: payload.fullName,
            work_email: payload.workEmail,
            company_name: payload.companyName,
            plant_name: payload.plantName,
            designation: payload.designation,
            phone: payload.phone,
            city: payload.city,
            state: payload.state,
            reason: payload.reason,
            status: 'pending',
          },
        ]);

        if (!dbError) {
          dbSaved = true;
        } else {
          console.warn('Supabase insert note:', dbError.message);
        }
      }
    } catch (dbErr: any) {
      console.warn('Supabase connection note:', dbErr.message);
    }

    // Return success to the client
    return NextResponse.json({
      success: true,
      emailSent,
      dbSaved,
      message: 'Account request received and ChittorTech notified.',
    });
  } catch (error: any) {
    console.error('Account request route error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing request.' },
      { status: 500 }
    );
  }
}
