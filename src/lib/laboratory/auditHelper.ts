import { SupabaseClient } from '@supabase/supabase-js';
import { ChangedFieldDiff } from '@/types';

const TRACKED_FIELD_LABELS: Record<string, string> = {
  test_date: 'Testing Date',
  category: 'Plant Category',
  sample_id: 'Sample ID',
  shift: 'Plant Shift',
  loi: 'LOI (%)',
  ir: 'IR (%)',
  so3: 'SO₃ (%)',
  silica: 'SiO₂ (%)',
  alumina: 'Al₂O₃ (%)',
  iron: 'Fe₂O₃ (%)',
  lime: 'CaO (%)',
  magnesia: 'MgO (%)',
  k2o: 'K₂O (%)',
  na2o: 'Na₂O (%)',
  na2o_eq: 'Total Eq. Alkalis Na₂Oeq (%)',
  chloride: 'Cl⁻ (%)',
  free_lime: 'Free Lime (%)',
  notes: 'Observations / Notes',
};

/**
 * Computes field-by-field diff between old record and updated record.
 * Required for NABL / ISO/IEC 17025 Clause 7.5 compliance.
 */
export function computeRecordDiff(
  oldRecord: Record<string, any>,
  newRecord: Record<string, any>
): ChangedFieldDiff[] {
  const diffs: ChangedFieldDiff[] = [];

  for (const [field, label] of Object.entries(TRACKED_FIELD_LABELS)) {
    const rawOld = oldRecord[field] === undefined ? null : oldRecord[field];
    const rawNew = newRecord[field] === undefined ? null : newRecord[field];

    // Normalize empty strings to null for clean comparison
    const normOld = rawOld === '' ? null : rawOld;
    const normNew = rawNew === '' ? null : rawNew;

    // Numeric comparison if both are numbers/numeric strings
    if (
      normOld !== null &&
      normNew !== null &&
      !isNaN(Number(normOld)) &&
      !isNaN(Number(normNew)) &&
      ['loi', 'ir', 'so3', 'silica', 'alumina', 'iron', 'lime', 'magnesia', 'k2o', 'na2o', 'na2o_eq', 'chloride', 'free_lime'].includes(field)
    ) {
      if (Number(normOld) !== Number(normNew)) {
        diffs.push({
          field,
          label,
          old_value: Number(normOld),
          new_value: Number(normNew),
        });
      }
      continue;
    }

    if (String(normOld ?? '') !== String(normNew ?? '')) {
      diffs.push({
        field,
        label,
        old_value: normOld,
        new_value: normNew,
      });
    }
  }

  return diffs;
}

export interface LogAuditParams {
  supabase: SupabaseClient;
  recordId: string;
  sampleId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  changedById: string;
  changedByName: string;
  changedByEmail?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  changedFields?: ChangedFieldDiff[] | null;
  reason: string;
}

/**
 * Persists an immutable audit trail entry to public.laboratory_audit_logs.
 * Fails gracefully with a warning if the audit table hasn't been migrated yet.
 */
export async function insertAuditLog(params: LogAuditParams): Promise<{ logged: boolean; tableMissing?: boolean }> {
  try {
    const { error } = await params.supabase.from('laboratory_audit_logs').insert([
      {
        record_id: params.recordId,
        sample_id: params.sampleId || null,
        action: params.action,
        changed_by_id: params.changedById,
        changed_by_name: params.changedByName || 'QA Chemist',
        changed_by_email: params.changedByEmail || null,
        old_values: params.oldValues || null,
        new_values: params.newValues || null,
        changed_fields: params.changedFields || null,
        reason: params.reason.trim(),
      },
    ]);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        console.warn('laboratory_audit_logs table not yet created. Run supabase/audit_logs_migration.sql');
        return { logged: false, tableMissing: true };
      }
      console.error('Failed to write audit log:', error);
      return { logged: false };
    }

    return { logged: true };
  } catch (err) {
    console.error('Audit log insert exception:', err);
    return { logged: false };
  }
}

