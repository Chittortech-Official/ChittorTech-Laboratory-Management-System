import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// GET /api/audit-logs?recordId=...&userId=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const userId = searchParams.get('userId');

    if (!recordId && !userId) {
      return NextResponse.json(
        { success: false, error: 'recordId or userId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    let query = supabase
      .from('laboratory_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (recordId) {
      query = query.eq('record_id', recordId);
    } else if (userId) {
      query = query.eq('changed_by_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({
          success: true,
          logs: [],
          tableMissing: true,
          message:
            'Audit log table (public.laboratory_audit_logs) not yet created in Supabase. Run supabase/audit_logs_migration.sql in SQL Editor.',
        });
      }
      console.error('GET /api/audit-logs error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logs: data || [],
    });
  } catch (err: any) {
    console.error('GET /api/audit-logs exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

