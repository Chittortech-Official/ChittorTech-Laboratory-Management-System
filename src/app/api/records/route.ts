import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LaboratoryRecordPayload } from '@/types';
import { extractNextSampleId } from '@/lib/laboratory/sampleIdHelper';

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

// GET /api/records - Retrieve records with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month'); // YYYY-MM
    const limit = searchParams.get('limit');
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User identification required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fast action: retrieve only next sequential sample ID from database
    if (action === 'next-sample-id') {
      const { data, error } = await supabase
        .from('laboratory_records')
        .select('sample_id')
        .eq('user_id', userId);

      if (error) {
        return NextResponse.json({ success: true, nextSampleId: 'Sample-1' });
      }

      const sampleIds = (data || []).map((r: any) => r.sample_id);
      return NextResponse.json({
        success: true,
        nextSampleId: extractNextSampleId(sampleIds),
        count: sampleIds.length,
      });
    }

    let query = supabase
      .from('laboratory_records')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (startDate) {
      query = query.gte('test_date', startDate);
    }

    if (endDate) {
      query = query.lte('test_date', endDate);
    }

    if (month) {
      const startOfMonth = `${month}-01`;
      // Compute end of month
      const [y, m] = month.split('-').map(Number);
      const nextMonth = new Date(y, m, 0); // last day of month
      const endOfMonth = `${month}-${String(nextMonth.getDate()).padStart(2, '0')}`;
      query = query.gte('test_date', startOfMonth).lte('test_date', endOfMonth);
    }

    if (limit && !isNaN(Number(limit))) {
      query = query.limit(Number(limit));
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        // Table not created yet - return empty list gracefully so UI displays clean zero state instead of crashing
        console.warn('laboratory_records table not yet created in Supabase schema cache.');
        return NextResponse.json({
          success: true,
          records: [],
          nextSampleId: 'Sample-1',
          tableMissing: true,
          message: 'Table public.laboratory_records does not exist in Supabase yet.',
        });
      }
      console.error('Supabase query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const sampleIds = (data || []).map((r: any) => r.sample_id);
    return NextResponse.json({
      success: true,
      records: data || [],
      nextSampleId: extractNextSampleId(sampleIds),
    });
  } catch (err: any) {
    console.error('GET /api/records error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/records - Insert new laboratory test record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      test_date,
      category = 'Ball mill',
      sample_id = 'Sample-1',
      shift = 'General',
      loi = null,
      ir = null,
      so3 = null,
      lime = null,
      silica = null,
      alumina = null,
      iron = null,
      magnesia = null,
      chloride = null,
      notes = null,
    }: LaboratoryRecordPayload = body;

    if (!user_id || !test_date) {
      return NextResponse.json({ success: false, error: 'User ID and Test Date are mandatory' }, { status: 400 });
    }

    const supabase = getSupabase();
    const cleanSampleId = (sample_id || 'Sample-1').trim();

    // Check for duplicate record for same user, date, category and sample
    const { data: existing } = await supabase
      .from('laboratory_records')
      .select('id')
      .eq('user_id', user_id)
      .eq('test_date', test_date)
      .eq('category', category)
      .ilike('sample_id', cleanSampleId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `A record already exists for ${test_date} under "${category}" with Sample ID "${cleanSampleId}". Please use edit to update it or choose a unique Sample ID.`,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('laboratory_records')
      .insert([
        {
          user_id,
          test_date,
          category,
          sample_id: cleanSampleId,
          shift,
          loi: loi !== null && !isNaN(Number(loi)) ? Number(loi) : null,
          ir: ir !== null && !isNaN(Number(ir)) ? Number(ir) : null,
          so3: so3 !== null && !isNaN(Number(so3)) ? Number(so3) : null,
          lime: lime !== null && !isNaN(Number(lime)) ? Number(lime) : null,
          silica: silica !== null && !isNaN(Number(silica)) ? Number(silica) : null,
          alumina: alumina !== null && !isNaN(Number(alumina)) ? Number(alumina) : null,
          iron: iron !== null && !isNaN(Number(iron)) ? Number(iron) : null,
          magnesia: magnesia !== null && !isNaN(Number(magnesia)) ? Number(magnesia) : null,
          chloride: chloride !== null && !isNaN(Number(chloride)) ? Number(chloride) : null,
          notes,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Supabase table 'public.laboratory_records' is not created yet. Please execute supabase/create_laboratory_records.sql in the Supabase SQL Editor.",
          },
          { status: 500 }
        );
      }
      console.error('Insert record error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (err: any) {
    console.error('POST /api/records error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/records - Update an existing laboratory record
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, user_id, ...updates } = body;

    if (!id || !user_id) {
      return NextResponse.json({ success: false, error: 'Record ID and User ID are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('laboratory_records')
      .update({
        test_date: updates.test_date,
        category: updates.category,
        sample_id: updates.sample_id,
        shift: updates.shift,
        loi: updates.loi !== null && !isNaN(Number(updates.loi)) ? Number(updates.loi) : null,
        ir: updates.ir !== null && !isNaN(Number(updates.ir)) ? Number(updates.ir) : null,
        so3: updates.so3 !== null && !isNaN(Number(updates.so3)) ? Number(updates.so3) : null,
        lime: updates.lime !== null && !isNaN(Number(updates.lime)) ? Number(updates.lime) : null,
        silica: updates.silica !== null && !isNaN(Number(updates.silica)) ? Number(updates.silica) : null,
        alumina: updates.alumina !== null && !isNaN(Number(updates.alumina)) ? Number(updates.alumina) : null,
        iron: updates.iron !== null && !isNaN(Number(updates.iron)) ? Number(updates.iron) : null,
        magnesia: updates.magnesia !== null && !isNaN(Number(updates.magnesia)) ? Number(updates.magnesia) : null,
        chloride: updates.chloride !== null && !isNaN(Number(updates.chloride)) ? Number(updates.chloride) : null,
        notes: updates.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Update record error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (err: any) {
    console.error('PUT /api/records error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/records - Delete an existing record
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ success: false, error: 'Record ID and User ID are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('laboratory_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete record error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Record deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /api/records error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

