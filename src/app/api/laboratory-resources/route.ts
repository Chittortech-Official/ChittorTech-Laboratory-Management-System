import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ResourceType = 'equipment' | 'documents' | 'staff';

const TABLE_MAP: Record<ResourceType, string> = {
  equipment: 'lab_equipment',
  documents: 'lab_documents',
  staff: 'lab_staff_competency',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    throw new Error('Supabase environment variables missing');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const [eqRes, docRes, staffRes] = await Promise.all([
      supabase.from('lab_equipment').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('lab_documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('lab_staff_competency').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    const migrationRequired =
      eqRes.error?.code === 'PGRST205' ||
      docRes.error?.code === 'PGRST205' ||
      staffRes.error?.code === 'PGRST205';

    return NextResponse.json({
      success: true,
      migrationRequired,
      equipment: eqRes.data || [],
      documents: docRes.data || [],
      staff: staffRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch laboratory resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resource, userId, record } = body as {
      resource?: ResourceType;
      userId?: string;
      record?: Record<string, any>;
    };

    if (!resource || !TABLE_MAP[resource] || !userId || !record) {
      return NextResponse.json(
        { success: false, error: 'resource, userId, and record are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE_MAP[resource])
      .insert([{ ...record, user_id: userId }])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save resource record' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { resource, userId, id, updates } = body as {
      resource?: ResourceType;
      userId?: string;
      id?: string;
      updates?: Record<string, any>;
    };

    if (!resource || !TABLE_MAP[resource] || !userId || !id || !updates) {
      return NextResponse.json(
        { success: false, error: 'resource, userId, id, and updates are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE_MAP[resource])
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update resource record' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource') as ResourceType | null;
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (!resource || !TABLE_MAP[resource] || !userId || !id) {
      return NextResponse.json(
        { success: false, error: 'resource, userId, and id are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from(TABLE_MAP[resource])
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete resource record' },
      { status: 500 }
    );
  }
}

