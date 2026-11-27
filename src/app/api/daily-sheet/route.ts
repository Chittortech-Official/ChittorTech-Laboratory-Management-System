import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateEquivalentAlkali } from '@/lib/laboratory/exportService';
import { calculateBoguePhases, calculateCoalMetrics } from '@/lib/laboratory/bogueEngine';
import { insertAuditLog } from '@/lib/laboratory/auditHelper';

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

function toNum(v: any): number | null {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// GET /api/daily-sheet?userId=...&date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
      return NextResponse.json({ success: false, error: 'userId and date are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const [chemRes, mechRes, coalRes] = await Promise.all([
      supabase
        .from('laboratory_records')
        .select('*')
        .eq('user_id', userId)
        .eq('test_date', date),
      supabase
        .from('mechanical_test_records')
        .select('*')
        .eq('user_id', userId)
        .eq('test_date', date),
      supabase
        .from('coal_test_records')
        .select('*')
        .eq('user_id', userId)
        .eq('test_date', date),
    ]);

    return NextResponse.json({
      success: true,
      chemical: (chemRes.data || []).filter((r: any) => r.is_deleted !== true),
      mechanical: (mechRes.data || []).filter((r: any) => r.is_deleted !== true),
      coal: (coalRes.data || []).filter((r: any) => r.is_deleted !== true),
      mechanicalTableMissing: mechRes.error?.code === 'PGRST205',
      coalTableMissing: coalRes.error?.code === 'PGRST205',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/daily-sheet - Save/Upsert entire daily sheet (Chemical + Mechanical + Coal)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      test_date,
      shift = 'General',
      changed_by_name = 'QA Chemist',
      changed_by_email = null,
      chemicalEntries = [],
      mechanicalEntries = [],
      coalEntries = [],
    } = body;

    if (!user_id || !test_date) {
      return NextResponse.json({ success: false, error: 'user_id and test_date are mandatory' }, { status: 400 });
    }

    const supabase = getSupabase();
    let savedChemCount = 0;
    let savedMechCount = 0;
    let savedCoalCount = 0;
    const warnings: string[] = [];

    // 1. Save / Upsert Chemical Analysis entries (by user_id + test_date + category)
    for (const entry of chemicalEntries) {
      const k2o = toNum(entry.k2o);
      const na2o = toNum(entry.na2o);
      const free_lime = toNum(entry.free_lime);
      const bogue = calculateBoguePhases({
        lime: toNum(entry.lime),
        silica: toNum(entry.silica),
        alumina: toNum(entry.alumina),
        iron: toNum(entry.iron),
        so3: toNum(entry.so3),
        magnesia: toNum(entry.magnesia),
        k2o,
        na2o,
        free_lime,
      });

      const basePayload = {
        user_id,
        test_date,
        category: entry.category,
        sample_id: (entry.sample_id || 'NA').trim() || 'NA',
        shift,
        loi: toNum(entry.loi),
        ir: toNum(entry.ir),
        so3: toNum(entry.so3),
        silica: toNum(entry.silica),
        alumina: toNum(entry.alumina),
        iron: toNum(entry.iron),
        lime: toNum(entry.lime),
        magnesia: toNum(entry.magnesia),
        chloride: toNum(entry.chloride),
        notes: entry.notes || null,
        updated_at: new Date().toISOString(),
      };

      const fullPayload = {
        ...basePayload,
        k2o,
        na2o,
        na2o_eq: calculateEquivalentAlkali(na2o, k2o),
        free_lime,
        cv: bogue.cv,
        lv: bogue.lv,
      };

      // Check if non-deleted record already exists for (user_id, test_date, category)
      const { data: existingList } = await supabase
        .from('laboratory_records')
        .select('*')
        .eq('user_id', user_id)
        .eq('test_date', test_date)
        .eq('category', entry.category);

      const existing = (existingList || []).find((r: any) => r.is_deleted !== true);

      if (existing) {
        let { data, error } = await supabase
          .from('laboratory_records')
          .update(fullPayload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error && error.code === '42703') {
          const retry = await supabase
            .from('laboratory_records')
            .update(basePayload)
            .eq('id', existing.id)
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (!error && data) {
          savedChemCount++;
          await insertAuditLog({
            supabase,
            recordId: existing.id,
            sampleId: data.sample_id,
            action: 'UPDATE',
            changedById: user_id,
            changedByName: changed_by_name,
            changedByEmail: changed_by_email,
            oldValues: existing,
            newValues: data,
            reason: 'Updated via Daily Testing Sheet',
          });
        }
      } else {
        let { data, error } = await supabase
          .from('laboratory_records')
          .insert([fullPayload])
          .select()
          .single();

        if (error && error.code === '42703') {
          const retry = await supabase
            .from('laboratory_records')
            .insert([basePayload])
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (!error && data) {
          savedChemCount++;
          await insertAuditLog({
            supabase,
            recordId: data.id,
            sampleId: data.sample_id,
            action: 'CREATE',
            changedById: user_id,
            changedByName: changed_by_name,
            changedByEmail: changed_by_email,
            oldValues: null,
            newValues: data,
            reason: 'Initial Daily Testing Sheet entry',
          });
        }
      }
    }

    // 2. Save / Upsert Mechanical Analysis entries
    for (const m of mechanicalEntries) {
      const payload = {
        user_id,
        test_date,
        category: m.category,
        shift,
        residue_45: toNum(m.residue_45),
        residue_90: toNum(m.residue_90),
        residue_212: toNum(m.residue_212),
        nc_pct: toNum(m.nc_pct),
        blaine_m2_kg: toNum(m.blaine_m2_kg),
        ist_min: toNum(m.ist_min) !== null ? Math.round(Number(m.ist_min)) : null,
        fst_min: toNum(m.fst_min) !== null ? Math.round(Number(m.fst_min)) : null,
        soundness_le_chat: toNum(m.soundness_le_chat),
        soundness_autoclv: toNum(m.soundness_autoclv),
        cs_1d: toNum(m.cs_1d),
        cs_3d: toNum(m.cs_3d),
        cs_7d: toNum(m.cs_7d),
        cs_28d: toNum(m.cs_28d),
        updated_at: new Date().toISOString(),
      };

      const { data: existingMech, error: mechLookupErr } = await supabase
        .from('mechanical_test_records')
        .select('id')
        .eq('user_id', user_id)
        .eq('test_date', test_date)
        .eq('category', m.category)
        .maybeSingle();

      if (mechLookupErr?.code === 'PGRST205') {
        warnings.push('mechanical_test_records table not created yet (run supabase/daily_sheet_migration.sql)');
        break;
      }

      if (existingMech) {
        const { error } = await supabase.from('mechanical_test_records').update(payload).eq('id', existingMech.id);
        if (!error) savedMechCount++;
      } else {
        const { error } = await supabase.from('mechanical_test_records').insert([payload]);
        if (!error) savedMechCount++;
      }
    }

    // 3. Save / Upsert Coal Analysis entries
    for (const c of coalEntries) {
      const im = toNum(c.im_pct);
      const vm = toNum(c.vm_pct);
      const ash = toNum(c.ash_pct);
      const gcv = toNum(c.gcv);
      const { fc, uhv } = calculateCoalMetrics(im, vm, ash);

      const payload = {
        user_id,
        test_date,
        coal_stream: c.coal_stream,
        im_pct: im,
        vm_pct: vm,
        ash_pct: ash,
        gcv,
        fc_pct: toNum(c.fc_pct) ?? fc,
        uhv: toNum(c.uhv) ?? uhv,
        updated_at: new Date().toISOString(),
      };

      const { data: existingCoal, error: coalLookupErr } = await supabase
        .from('coal_test_records')
        .select('id')
        .eq('user_id', user_id)
        .eq('test_date', test_date)
        .eq('coal_stream', c.coal_stream)
        .maybeSingle();

      if (coalLookupErr?.code === 'PGRST205') {
        warnings.push('coal_test_records table not created yet (run supabase/daily_sheet_migration.sql)');
        break;
      }

      if (existingCoal) {
        const { error } = await supabase.from('coal_test_records').update(payload).eq('id', existingCoal.id);
        if (!error) savedCoalCount++;
      } else {
        const { error } = await supabase.from('coal_test_records').insert([payload]);
        if (!error) savedCoalCount++;
      }
    }

    return NextResponse.json({
      success: true,
      savedChemCount,
      savedMechCount,
      savedCoalCount,
      warnings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
