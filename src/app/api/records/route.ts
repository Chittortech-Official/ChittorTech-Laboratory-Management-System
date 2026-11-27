import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LaboratoryRecordPayload } from '@/types';
import { extractNextSampleId } from '@/lib/laboratory/sampleIdHelper';
import { computeRecordDiff, insertAuditLog } from '@/lib/laboratory/auditHelper';
import { calculateEquivalentAlkali } from '@/lib/laboratory/exportService';
import { requireAuthenticatedSession } from '@/lib/auth/session';

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
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

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

    const activeRecords = (data || [])
      .filter((r: any) => r.is_deleted !== true)
      .map((r: any) => {
        let k2o = r.k2o ?? null;
        let na2o = r.na2o ?? null;
        if ((k2o === null || na2o === null) && typeof r.notes === 'string' && r.notes.includes('[Alkalis:')) {
          const kMatch = r.notes.match(/K2O=([0-9]+\.?[0-9]*)/);
          const nMatch = r.notes.match(/Na2O=([0-9]+\.?[0-9]*)/);
          if (k2o === null && kMatch) k2o = Number(kMatch[1]);
          if (na2o === null && nMatch) na2o = Number(nMatch[1]);
        }
        const na2o_eq = r.na2o_eq ?? calculateEquivalentAlkali(na2o, k2o);
        return { ...r, k2o, na2o, na2o_eq };
      });
    const sampleIds = activeRecords.map((r: any) => r.sample_id);
    return NextResponse.json({
      success: true,
      records: activeRecords,
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
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

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
      k2o = null,
      na2o = null,
      chloride = null,
      free_lime = null,
      cv = null,
      lv = null,
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

    const k2oNum = k2o !== null && k2o !== undefined && !isNaN(Number(k2o)) ? Number(k2o) : null;
    const na2oNum = na2o !== null && na2o !== undefined && !isNaN(Number(na2o)) ? Number(na2o) : null;
    const na2oEqNum = calculateEquivalentAlkali(na2oNum, k2oNum);
    const freeLimeNum = free_lime !== null && free_lime !== undefined && !isNaN(Number(free_lime)) ? Number(free_lime) : null;
    const cvNum = cv !== null && cv !== undefined && !isNaN(Number(cv)) ? Number(cv) : null;
    const lvNum = lv !== null && lv !== undefined && !isNaN(Number(lv)) ? Number(lv) : null;

    const baseInsert = {
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
    };

    let { data, error } = await supabase
      .from('laboratory_records')
      .insert([
        {
          ...baseInsert,
          k2o: k2oNum,
          na2o: na2oNum,
          na2o_eq: na2oEqNum,
          free_lime: freeLimeNum,
          cv: cvNum,
          lv: lvNum,
        },
      ])
      .select()
      .single();

    // Fallback if daily_sheet_migration.sql / alkalis_migration.sql hasn't been executed in Supabase yet
    if (error && (error.code === '42703' || error.message?.includes('k2o') || error.message?.includes('na2o') || error.message?.includes('free_lime'))) {
      const alkaliTag =
        k2oNum !== null || na2oNum !== null
          ? `[Alkalis: ${k2oNum !== null ? `K2O=${k2oNum}%` : ''}${k2oNum !== null && na2oNum !== null ? ', ' : ''}${na2oNum !== null ? `Na2O=${na2oNum}%` : ''}]`
          : '';
      const fallbackNotes = alkaliTag ? (notes ? `${alkaliTag} ${notes}` : alkaliTag) : notes;
      const retry = await supabase
        .from('laboratory_records')
        .insert([{ ...baseInsert, notes: fallbackNotes }])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

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

    // Log CREATE event to immutable NABL audit trail
    if (data?.id) {
      await insertAuditLog({
        supabase,
        recordId: data.id,
        sampleId: data.sample_id,
        action: 'CREATE',
        changedById: user_id,
        changedByName: body.changed_by_name || 'QA Chemist',
        changedByEmail: body.changed_by_email || null,
        oldValues: null,
        newValues: data,
        changedFields: null,
        reason: 'Initial laboratory test entry recorded',
      });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (err: any) {
    console.error('POST /api/records error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/records - Update an existing laboratory record (Requires Reason for Change under NABL Clause 7.5)
export async function PUT(request: Request) {
  try {
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const {
      id,
      user_id,
      reason,
      changed_by_name,
      changed_by_email,
      ...updates
    } = body;

    if (!id || !user_id) {
      return NextResponse.json({ success: false, error: 'Record ID and User ID are required' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'NABL ISO/IEC 17025 Clause 7.5: A valid "Reason for Change" (min 3 characters) is mandatory for modifying laboratory test data.',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Fetch existing record BEFORE updating to preserve Old Values for audit trail
    const { data: existingRecord, error: fetchError } = await supabase
      .from('laboratory_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Original laboratory record not found or unauthorized.' },
        { status: 404 }
      );
    }

    const k2oVal = updates.k2o !== null && updates.k2o !== undefined && String(updates.k2o) !== '' && !isNaN(Number(updates.k2o)) ? Number(updates.k2o) : null;
    const na2oVal = updates.na2o !== null && updates.na2o !== undefined && String(updates.na2o) !== '' && !isNaN(Number(updates.na2o)) ? Number(updates.na2o) : null;
    const na2oEqVal = calculateEquivalentAlkali(na2oVal, k2oVal);

    const baseUpdate = {
      test_date: updates.test_date,
      category: updates.category,
      sample_id: updates.sample_id,
      shift: updates.shift,
      loi: updates.loi !== null && updates.loi !== undefined && String(updates.loi) !== '' && !isNaN(Number(updates.loi)) ? Number(updates.loi) : null,
      ir: updates.ir !== null && updates.ir !== undefined && String(updates.ir) !== '' && !isNaN(Number(updates.ir)) ? Number(updates.ir) : null,
      so3: updates.so3 !== null && updates.so3 !== undefined && String(updates.so3) !== '' && !isNaN(Number(updates.so3)) ? Number(updates.so3) : null,
      lime: updates.lime !== null && updates.lime !== undefined && String(updates.lime) !== '' && !isNaN(Number(updates.lime)) ? Number(updates.lime) : null,
      silica: updates.silica !== null && updates.silica !== undefined && String(updates.silica) !== '' && !isNaN(Number(updates.silica)) ? Number(updates.silica) : null,
      alumina: updates.alumina !== null && updates.alumina !== undefined && String(updates.alumina) !== '' && !isNaN(Number(updates.alumina)) ? Number(updates.alumina) : null,
      iron: updates.iron !== null && updates.iron !== undefined && String(updates.iron) !== '' && !isNaN(Number(updates.iron)) ? Number(updates.iron) : null,
      magnesia: updates.magnesia !== null && updates.magnesia !== undefined && String(updates.magnesia) !== '' && !isNaN(Number(updates.magnesia)) ? Number(updates.magnesia) : null,
      chloride: updates.chloride !== null && updates.chloride !== undefined && String(updates.chloride) !== '' && !isNaN(Number(updates.chloride)) ? Number(updates.chloride) : null,
      notes: updates.notes,
      updated_at: new Date().toISOString(),
    };

    const fullUpdatePayload = {
      ...baseUpdate,
      k2o: k2oVal,
      na2o: na2oVal,
      na2o_eq: na2oEqVal,
      free_lime: updates.free_lime !== null && updates.free_lime !== undefined && String(updates.free_lime) !== '' && !isNaN(Number(updates.free_lime)) ? Number(updates.free_lime) : null,
    };

    // Compute field-level diff
    const changedFields = computeRecordDiff(existingRecord, fullUpdatePayload);

    let { data, error } = await supabase
      .from('laboratory_records')
      .update(fullUpdatePayload)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error && (error.code === '42703' || error.message?.includes('k2o') || error.message?.includes('na2o') || error.message?.includes('free_lime'))) {
      const retry = await supabase
        .from('laboratory_records')
        .update(baseUpdate)
        .eq('id', id)
        .eq('user_id', user_id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Update record error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 2. Write immutable UPDATE audit log
    await insertAuditLog({
      supabase,
      recordId: id,
      sampleId: data?.sample_id || existingRecord.sample_id,
      action: 'UPDATE',
      changedById: user_id,
      changedByName: changed_by_name || 'QA Chemist',
      changedByEmail: changed_by_email || null,
      oldValues: existingRecord,
      newValues: data,
      changedFields,
      reason: reason.trim(),
    });

    return NextResponse.json({ success: true, record: data, changedFieldsCount: changedFields.length });
  } catch (err: any) {
    console.error('PUT /api/records error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/records - Soft-delete / archive an existing record (Requires Reason under NABL Clause 7.5)
export async function DELETE(request: Request) {
  try {
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    let reason = searchParams.get('reason') || '';
    let changedByName = searchParams.get('changedByName') || 'QA Chemist';
    let changedByEmail = searchParams.get('changedByEmail') || null;

    // Also allow JSON body parameters for DELETE
    try {
      const bodyText = await request.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        if (body.reason) reason = body.reason;
        if (body.changedByName) changedByName = body.changedByName;
        if (body.changedByEmail) changedByEmail = body.changedByEmail;
      }
    } catch {}

    if (!id || !userId) {
      return NextResponse.json({ success: false, error: 'Record ID and User ID are required' }, { status: 400 });
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'NABL ISO/IEC 17025 Clause 7.5: A valid "Reason for Deletion" (min 3 characters) is mandatory.',
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Fetch existing record BEFORE deletion to preserve complete snapshot in audit logs
    const { data: existingRecord, error: fetchError } = await supabase
      .from('laboratory_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Laboratory record not found or unauthorized.' },
        { status: 404 }
      );
    }

    // 2. Write immutable DELETE audit log first
    await insertAuditLog({
      supabase,
      recordId: id,
      sampleId: existingRecord.sample_id,
      action: 'DELETE',
      changedById: userId,
      changedByName,
      changedByEmail,
      oldValues: existingRecord,
      newValues: null,
      changedFields: null,
      reason: reason.trim(),
    });

    // 3. Perform Soft Delete if is_deleted column exists, otherwise fall back cleanly
    const { error: softDeleteError } = await supabase
      .from('laboratory_records')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: changedByName,
        delete_reason: reason.trim(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (softDeleteError) {
      // Fallback if soft-delete columns haven't been added via SQL migration yet
      if (softDeleteError.message?.includes('is_deleted') || softDeleteError.code === '42703') {
        const { error: hardDeleteError } = await supabase
          .from('laboratory_records')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (hardDeleteError) {
          console.error('Delete record error:', hardDeleteError);
          return NextResponse.json({ success: false, error: hardDeleteError.message }, { status: 500 });
        }
      } else {
        console.error('Soft delete error:', softDeleteError);
        return NextResponse.json({ success: false, error: softDeleteError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Record archived and logged in NABL audit trail.' });
  } catch (err: any) {
    console.error('DELETE /api/records error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

