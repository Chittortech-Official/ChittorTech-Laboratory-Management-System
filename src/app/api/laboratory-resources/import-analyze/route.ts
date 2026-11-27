import { NextResponse } from 'next/server';
import { requireAuthenticatedSession } from '@/lib/auth/session';
import {
  DEFAULT_GROQ_FAST_MODEL,
  DEFAULT_OPENROUTER_BACKUP_FREE_MODEL,
  DEFAULT_OPENROUTER_FREE_MODEL,
} from '@/lib/knowledge/groqAssistant';
import {
  ALLOWED_COLUMNS,
  buildHeuristicMapping,
  type ExcelColumnMapping,
  type ResourceSubModule,
} from '@/lib/laboratory/excelResourceImport';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

const TARGET_FIELD_DESCRIPTIONS: Record<ResourceSubModule, Record<string, string>> = {
  equipment: {
    equipment_code: 'Unique equipment/instrument ID or code (NOT row serial number 1, 2, 3)',
    name: 'Equipment or instrument name (e.g. XRF Spectrometer, Blaine Apparatus, Compression Testing Machine)',
    manufacturer: 'Manufacturer / Make / Brand',
    model: 'Model name or number',
    serial_number: 'Instrument manufacturer serial number (NOT row index)',
    location: 'Lab department / room / section',
    last_calibration_date: 'Date of last calibration',
    next_calibration_date: 'Next calibration due date / validity expiry date',
    calibration_agency: 'External calibration lab / agency name',
    certificate_no: 'Calibration certificate number',
    maintenance_notes: 'Remarks, maintenance notes, accuracy, frequency, etc.',
    status: 'Equipment status (Active / Calibration Due / Under Maintenance / Out of Service)',
  },
  documents: {
    doc_code: 'Controlled document number or SOP code',
    title: 'Document / SOP title',
    category: 'SOP, Quality Manual, Test Method, Work Instruction, Form / Record',
    version: 'Version number',
    revision_number: 'Revision number (Rev 00, Rev 01)',
    effective_date: 'Issue / effective date',
    review_due_date: 'Next review due date',
    prepared_by: 'Prepared by / author',
    reviewed_by: 'Reviewed by',
    approved_by: 'Approved by',
    standard_ref: 'BIS / ISO / ASTM standard reference',
    summary: 'Scope or summary',
    remarks: 'Remarks / notes',
    status: 'Approved, Under Review, Draft, Obsolete',
  },
  staff: {
    staff_name: 'Personnel / Chemist / Technician full name',
    employee_id: 'Employee ID / Code',
    designation: 'Job title / designation',
    qualified_tests: 'Authorized / qualified test methods',
    training_topic: 'Training course / topic name',
    training_date: 'Date training completed',
    assessment_score: 'Score / Pass-Fail result',
    competency_status: 'Competent, In Training, Re-evaluation Due',
    valid_until: 'Authorization valid until / re-evaluation due date',
    trainer_name: 'Trainer / assessor name',
    certificate_ref: 'Training certificate ref no.',
    approved_by: 'Approved by',
    notes: 'Additional notes / remarks',
  },
};

function sanitizeMapping(
  raw: any,
  headers: string[],
  targetModule: ResourceSubModule
): ExcelColumnMapping {
  const validHeaderSet = new Set(headers);
  const allowedFields = ALLOWED_COLUMNS[targetModule];
  const fallback = buildHeuristicMapping(headers, targetModule);

  const rawFieldMap = raw?.fieldMap && typeof raw.fieldMap === 'object' ? raw.fieldMap : {};
  const fieldMap: Record<string, string | null> = {};
  const claimed = new Set<string>();

  for (const field of allowedFields) {
    const candidate = rawFieldMap[field];
    if (typeof candidate === 'string' && validHeaderSet.has(candidate)) {
      fieldMap[field] = candidate;
      claimed.add(candidate);
    } else {
      const fb = fallback.fieldMap[field];
      fieldMap[field] = fb && !claimed.has(fb) ? fb : null;
      if (fieldMap[field]) claimed.add(fieldMap[field]!);
    }
  }

  let splitMakeModelColumn: string | null = null;
  if (
    targetModule === 'equipment' &&
    typeof raw?.splitMakeModelColumn === 'string' &&
    validHeaderSet.has(raw.splitMakeModelColumn)
  ) {
    const col: string = raw.splitMakeModelColumn;
    splitMakeModelColumn = col;
    claimed.add(col);
  } else if (fallback.splitMakeModelColumn) {
    const col: string = fallback.splitMakeModelColumn;
    splitMakeModelColumn = col;
    claimed.add(col);
  }

  const rawExtras = Array.isArray(raw?.extraNoteColumns) ? raw.extraNoteColumns : [];
  const extraNoteColumns = rawExtras.filter(
    (col: unknown): col is string =>
      typeof col === 'string' &&
      validHeaderSet.has(col) &&
      !claimed.has(col) &&
      !/^(s|sr|sl)\s*(no|num|#|\.)?$/i.test(col.trim())
  );

  // Include any remaining unmapped meaningful headers (like Least Count, Range, Frequency) if AI omitted them
  for (const h of headers) {
    if (
      !claimed.has(h) &&
      !extraNoteColumns.includes(h) &&
      !/^(s|sr|sl)\s*(no|num|#|\.)?$/i.test(h.trim())
    ) {
      extraNoteColumns.push(h);
    }
  }

  const detectedModule: ResourceSubModule =
    raw?.detectedModule === 'equipment' ||
    raw?.detectedModule === 'documents' ||
    raw?.detectedModule === 'staff'
      ? raw.detectedModule
      : fallback.detectedModule;

  const analysisSummary =
    typeof raw?.analysisSummary === 'string' && raw.analysisSummary.trim()
      ? raw.analysisSummary.trim()
      : 'AI analysed Excel headers and sample rows to map columns automatically.';

  return {
    fieldMap,
    extraNoteColumns,
    splitMakeModelColumn,
    detectedModule,
    analysisSummary,
  };
}

async function callProviderForExcelMapping(params: {
  provider: 'groq' | 'openrouter';
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<any | null> {
  const apiKey =
    params.provider === 'groq'
      ? (process.env.GROQ_API_KEY || '').trim()
      : (process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) return null;

  const url = params.provider === 'groq' ? GROQ_CHAT_URL : OPENROUTER_CHAT_URL;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (params.provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'https://lims.chittortech.in';
    headers['X-Title'] = 'ChittorTech QA Laboratory Management System';
  }

  const body: Record<string, any> = {
    model: params.model,
    temperature: 0,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
  };

  if (params.provider === 'groq') {
    body.max_completion_tokens = 1200;
    if (!params.model.includes('120b')) {
      body.response_format = { type: 'json_object' };
    }
  } else {
    body.max_tokens = 1000;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(18_000),
  });
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const rawContent = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!rawContent) return null;

  try {
    return JSON.parse(rawContent);
  } catch {
    const start = rawContent.indexOf('{');
    const end = rawContent.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(rawContent.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const targetModule = body?.targetModule as ResourceSubModule | undefined;
    const sheetName = typeof body?.sheetName === 'string' ? body.sheetName : 'Sheet1';
    const headers = Array.isArray(body?.headers)
      ? body.headers.filter((h: unknown): h is string => typeof h === 'string' && h.trim().length > 0)
      : [];
    const sampleRows = Array.isArray(body?.sampleRows) ? body.sampleRows.slice(0, 5) : [];

    if (!targetModule || !TARGET_FIELD_DESCRIPTIONS[targetModule] || headers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid targetModule and Excel column headers are required.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You map Excel columns from an Indian cement QA laboratory register to ChittorTech database fields.
Return ONLY valid JSON:
{
  "detectedModule": "equipment" | "documents" | "staff",
  "fieldMap": { "<target_field>": "<exact Excel header string or null>" },
  "splitMakeModelColumn": "<exact Excel header string if manufacturer & model are combined in ONE column, else null>",
  "extraNoteColumns": ["<useful Excel columns not directly mapped, e.g. Least Count, Range, Calibration Frequency>"],
  "analysisSummary": "One concise sentence describing what was mapped."
}
Rules:
- Use ONLY exact header strings from the provided "headers" array, or null.
- Never map sequential row numbers ("Sr. No.", "S.No.", "Sl. No.") to "equipment_code" or "serial_number".
- If "Make / Model" is combined in one column, put it in "splitMakeModelColumn" and set manufacturer/model to null.`;

    const userPrompt = JSON.stringify({
      targetModule,
      sheetName,
      targetFields: TARGET_FIELD_DESCRIPTIONS[targetModule],
      excelHeaders: headers,
      sampleRows,
    });

    const attempts: Array<{ provider: 'groq' | 'openrouter'; model: string }> = [
      { provider: 'groq', model: (process.env.GROQ_FAST_MODEL || DEFAULT_GROQ_FAST_MODEL).trim() },
      { provider: 'openrouter', model: (process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_FREE_MODEL).trim() },
      { provider: 'openrouter', model: DEFAULT_OPENROUTER_BACKUP_FREE_MODEL },
    ];

    for (const attempt of attempts) {
      try {
        const aiRaw = await callProviderForExcelMapping({
          provider: attempt.provider,
          model: attempt.model,
          systemPrompt,
          userPrompt,
        });
        if (aiRaw) {
          const mapping = sanitizeMapping(aiRaw, headers, targetModule);
          return NextResponse.json({
            success: true,
            usedAi: true,
            provider: attempt.provider,
            model: attempt.model,
            mapping,
          });
        }
      } catch {
        // fallback cleanly to next provider / heuristic mapper
      }
    }

    const fallbackMapping = buildHeuristicMapping(headers, targetModule);
    return NextResponse.json({
      success: true,
      usedAi: false,
      provider: 'smart-auto-mapper',
      model: 'deterministic-rules',
      mapping: fallbackMapping,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to analyse Excel file.' },
      { status: 500 }
    );
  }
}
