'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  ArrowRight,
  SlidersHorizontal,
  Download,
  Info,
} from 'lucide-react';
import {
  ALLOWED_COLUMNS,
  applyColumnMappingToRows,
  type ExcelColumnMapping,
  type NormalizedImportRow,
  type ParsedSheetPreview,
  type ResourceSubModule,
} from '@/lib/laboratory/excelResourceImport';

interface ExcelResourceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: ResourceSubModule;
  userId: string;
  existingKeys: Set<string>;
  onImported: () => Promise<void> | void;
}

const MODULE_LABELS: Record<ResourceSubModule, string> = {
  equipment: 'Equipment & Calibration',
  documents: 'Documents & SOPs',
  staff: 'Staff Training & Competency',
};

const STANDARD_FORMAT_SPEC: Record<
  ResourceSubModule,
  {
    requiredColumns: string[];
    recommendedColumns: string[];
    dateFormat: string;
    statusValues: string;
    templateFilename: string;
    sampleRows: Record<string, string>[];
  }
> = {
  equipment: {
    requiredColumns: ['Equipment Code', 'Equipment Name'],
    recommendedColumns: [
      'Manufacturer',
      'Model',
      'Serial Number',
      'Location',
      'Last Calibration Date',
      'Next Calibration Due',
      'Calibration Agency',
      'Certificate No.',
      'Status',
      'Maintenance Notes / Remarks',
    ],
    dateFormat: 'DD-MM-YYYY or YYYY-MM-DD (e.g. 15-08-2026)',
    statusValues: 'Active | Calibration Due | Under Maintenance | Out of Service',
    templateFilename: 'ChittorTech_Equipment_Import_Template.xlsx',
    sampleRows: [
      {
        'Equipment Code': 'EQ-XRF-01',
        'Equipment Name': 'WD-XRF Spectrometer',
        Manufacturer: 'Malvern Panalytical',
        Model: 'Zetium',
        'Serial Number': 'SN-84920',
        Location: 'Chemical QA Lab',
        'Last Calibration Date': '15-01-2026',
        'Next Calibration Due': '14-01-2027',
        'Calibration Agency': 'NABL Accredited Calibration Lab',
        'Certificate No.': 'CAL-2026-104',
        Status: 'Active',
        'Maintenance Notes / Remarks': 'Least Count: 0.01% | Range: Cement Oxides | Verified',
      },
      {
        'Equipment Code': 'EQ-BLN-02',
        'Equipment Name': 'Blaine Air Permeability Apparatus',
        Manufacturer: 'AIMIL',
        Model: 'AIM-392',
        'Serial Number': 'SN-41205',
        Location: 'Physical Testing Lab',
        'Last Calibration Date': '10-02-2026',
        'Next Calibration Due': '09-02-2027',
        'Calibration Agency': 'In-house SRM 114q Verification',
        'Certificate No.': 'SRM-2026-019',
        Status: 'Active',
        'Maintenance Notes / Remarks': 'IS 4031 Part 2 Fineness Testing',
      },
    ],
  },
  documents: {
    requiredColumns: ['Doc Code', 'Title'],
    recommendedColumns: [
      'Category',
      'Version',
      'Revision Number',
      'Effective Date',
      'Review Due Date',
      'Standard Ref',
      'Prepared By',
      'Reviewed By',
      'Approved By',
      'Status',
      'Summary',
      'Remarks',
    ],
    dateFormat: 'DD-MM-YYYY or YYYY-MM-DD',
    statusValues: 'Approved | Under Review | Draft | Obsolete',
    templateFilename: 'ChittorTech_Documents_SOP_Template.xlsx',
    sampleRows: [
      {
        'Doc Code': 'CT-SOP-CHEM-01',
        Title: 'Loss on Ignition (LOI) in OPC & Clinker',
        Category: 'SOP',
        Version: '2.0',
        'Revision Number': 'Rev 01',
        'Effective Date': '01-01-2026',
        'Review Due Date': '31-12-2026',
        'Standard Ref': 'IS 4032:1985',
        'Prepared By': 'QA Chemist',
        'Reviewed By': 'Technical Manager',
        'Approved By': 'Quality Manager',
        Status: 'Approved',
        Summary: 'Gravimetric ignition at 950 ± 50 °C to constant mass.',
        Remarks: 'Controlled copy in Chemical Lab',
      },
    ],
  },
  staff: {
    requiredColumns: ['Staff Name', 'Designation', 'Qualified Tests', 'Training Topic'],
    recommendedColumns: [
      'Employee ID',
      'Training Date',
      'Valid Until',
      'Assessment Score',
      'Competency Status',
      'Trainer Name',
      'Certificate Ref',
      'Approved By',
      'Notes',
    ],
    dateFormat: 'DD-MM-YYYY or YYYY-MM-DD',
    statusValues: 'Competent | In Training | Re-evaluation Due',
    templateFilename: 'ChittorTech_Staff_Competency_Template.xlsx',
    sampleRows: [
      {
        'Staff Name': 'Ramesh Verma',
        'Employee ID': 'EMP-104',
        Designation: 'Senior QC Chemist',
        'Qualified Tests': 'LOI, Insoluble Residue, Blaine Fineness, CTM Strength',
        'Training Topic': 'ISO/IEC 17025:2017 Measurement Uncertainty & Calibration',
        'Training Date': '20-02-2026',
        'Valid Until': '19-02-2027',
        'Assessment Score': '92% (Passed)',
        'Competency Status': 'Competent',
        'Trainer Name': 'Dr. R. K. Joshi',
        'Certificate Ref': 'TRN-17025-2026-09',
        'Approved By': 'Quality Manager',
        Notes: 'Authorized for OPC/PPC chemical & physical testing',
      },
    ],
  },
};

const HEADER_KEYWORDS = [
  'name', 'equipment', 'instrument', 'code', 'id', 'make', 'model',
  'serial', 'location', 'cal', 'calibration', 'due', 'date', 'agency',
  'certificate', 'cert', 'remark', 'status', 'doc', 'title', 'version',
  'revision', 'staff', 'employee', 'designation', 'training', 'topic',
  'range', 'least count', 'accuracy', 'frequency',
];

function scoreHeaderCandidate(cells: string[]): number {
  const nonEmpty = cells.map((c) => c.trim()).filter(Boolean);
  if (nonEmpty.length < 2) return -10;
  let score = nonEmpty.length * 2;
  for (const cell of nonEmpty) {
    const low = cell.toLowerCase();
    if (HEADER_KEYWORDS.some((kw) => low.includes(kw))) score += 5;
    if (cell.length > 60) score -= 4;
    if (/^\d{4,}$/.test(cell)) score -= 5;
  }
  return score;
}

function extractSheetPreview(workbook: XLSX.WorkBook, sheetName: string): ParsedSheetPreview {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return { sheetName, headerRowIndex: 0, headers: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  if (matrix.length === 0) {
    return { sheetName, headerRowIndex: 0, headers: [], rows: [] };
  }

  let bestRowIdx = 0;
  let bestScore = -Infinity;
  const searchLimit = Math.min(matrix.length, 15);
  for (let r = 0; r < searchLimit; r++) {
    const rowCells = (matrix[r] || []).map((v) => String(v ?? '').trim());
    const sc = scoreHeaderCandidate(rowCells);
    if (sc > bestScore) {
      bestScore = sc;
      bestRowIdx = r;
    }
  }

  const rawHeaderCells = (matrix[bestRowIdx] || []).map((v) =>
    String(v ?? '')
      .replace(/\s+/g, ' ')
      .trim()
  );

  // Build unique column headers
  const seen = new Map<string, number>();
  const colIndices: number[] = [];
  const headers: string[] = [];

  rawHeaderCells.forEach((h, idx) => {
    if (!h) {
      // Check if column actually has data below header row
      const hasData = matrix
        .slice(bestRowIdx + 1, bestRowIdx + 10)
        .some((r) => String(r?.[idx] ?? '').trim() !== '');
      if (!hasData) return;
      h = `Column ${idx + 1}`;
    }
    const count = (seen.get(h) || 0) + 1;
    seen.set(h, count);
    const uniqueName = count > 1 ? `${h} (${count})` : h;
    colIndices.push(idx);
    headers.push(uniqueName);
  });

  const rows: Record<string, string>[] = [];
  for (let r = bestRowIdx + 1; r < matrix.length; r++) {
    const rawRow = matrix[r] || [];
    const obj: Record<string, string> = {};
    let nonEmptyCount = 0;

    colIndices.forEach((colIdx, hIdx) => {
      const val = String(rawRow[colIdx] ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      obj[headers[hIdx]] = val;
      if (val) nonEmptyCount++;
    });

    if (nonEmptyCount === 0) continue;

    // Skip obvious signature/footer or repeated header rows
    const joined = Object.values(obj).join(' ').toLowerCase();
    if (/^(prepared by|checked by|approved by|page \d+ of)/.test(joined) && nonEmptyCount <= 2) {
      continue;
    }
    rows.push(obj);
  }

  return { sheetName, headerRowIndex: bestRowIdx + 1, headers, rows };
}

export const ExcelResourceImportModal: React.FC<ExcelResourceImportModalProps> = ({
  isOpen,
  onClose,
  activeModule,
  userId,
  existingKeys,
  onImported,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetPreview, setSheetPreview] = useState<ParsedSheetPreview | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [aiMeta, setAiMeta] = useState<{ usedAi: boolean; provider: string; model: string } | null>(null);
  const [mapping, setMapping] = useState<ExcelColumnMapping | null>(null);
  const [showColumnMapper, setShowColumnMapper] = useState(false);

  const [normalizedRows, setNormalizedRows] = useState<NormalizedImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const analyzeSheet = async (preview: ParsedSheetPreview) => {
    if (preview.headers.length === 0 || preview.rows.length === 0) {
      setError('No readable header or data rows were found in this worksheet.');
      setMapping(null);
      setNormalizedRows([]);
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/laboratory-resources/import-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetModule: activeModule,
          sheetName: preview.sheetName,
          headers: preview.headers,
          sampleRows: preview.rows.slice(0, 5),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.mapping) {
        setError(data.error || 'Could not analyse Excel columns.');
        return;
      }

      setAiMeta({
        usedAi: Boolean(data.usedAi),
        provider: data.provider || 'smart-auto-mapper',
        model: data.model || '',
      });
      setMapping(data.mapping);
      const computed = applyColumnMappingToRows({
        targetModule: activeModule,
        rows: preview.rows,
        mapping: data.mapping,
        existingKeys,
      });
      setNormalizedRows(computed);
    } catch {
      setError('Network error while analysing Excel sheet.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setImportSuccess(null);
    setFileName(file.name);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const visibleSheets = wb.SheetNames.filter((name) => {
        const meta = wb.Workbook?.Sheets?.find((s) => s.name === name);
        return !meta || meta.Hidden === 0 || meta.Hidden === undefined;
      });
      const names = visibleSheets.length > 0 ? visibleSheets : wb.SheetNames;
      if (names.length === 0) {
        setError('This Excel file contains no sheets.');
        return;
      }

      // Pick best sheet matching current module name if available
      const hint = activeModule === 'equipment' ? /equip|inst|cal/i : activeModule === 'documents' ? /doc|sop/i : /staff|train|comp/i;
      const defaultSheet = names.find((n) => hint.test(n)) || names[0];

      setWorkbookRef(wb);
      setSheetNames(names);
      setSelectedSheet(defaultSheet);

      const preview = extractSheetPreview(wb, defaultSheet);
      setSheetPreview(preview);
      await analyzeSheet(preview);
    } catch {
      setError('Failed to read Excel file. Please upload a valid .xlsx, .xls, or .csv file.');
    }
  };

  const handleSheetChange = async (name: string) => {
    if (!workbookRef) return;
    setSelectedSheet(name);
    setImportSuccess(null);
    const preview = extractSheetPreview(workbookRef, name);
    setSheetPreview(preview);
    await analyzeSheet(preview);
  };

  const handleManualMapChange = (portalField: string, excelHeader: string) => {
    if (!mapping || !sheetPreview) return;
    const updatedMapping: ExcelColumnMapping = {
      ...mapping,
      fieldMap: {
        ...mapping.fieldMap,
        [portalField]: excelHeader || null,
      },
    };
    setMapping(updatedMapping);
    const recomputed = applyColumnMappingToRows({
      targetModule: activeModule,
      rows: sheetPreview.rows,
      mapping: updatedMapping,
      existingKeys,
    });
    setNormalizedRows(recomputed);
  };

  const toggleRowSelected = (idx: number) => {
    setNormalizedRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, selected: !row.selected } : row))
    );
  };

  const toggleAllSelected = (selected: boolean) => {
    setNormalizedRows((prev) => prev.map((row) => ({ ...row, selected })));
  };

  const updateRowField = (idx: number, field: string, value: string) => {
    setNormalizedRows((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, record: { ...row.record, [field]: value } } : row
      )
    );
  };

  const selectedRows = useMemo(
    () => normalizedRows.filter((r) => r.selected),
    [normalizedRows]
  );

  const handleCommitImport = async () => {
    if (selectedRows.length === 0 || importing) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch('/api/laboratory-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: activeModule,
          userId,
          records: selectedRows.map((r) => r.record),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save imported rows to Laboratory Resources.');
        return;
      }

      setImportSuccess(
        `Successfully imported ${data.insertedCount ?? selectedRows.length} records into ${MODULE_LABELS[activeModule]}!`
      );
      await onImported();
    } catch {
      setError('Network error while saving imported records.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const formatSpec = STANDARD_FORMAT_SPEC[activeModule];

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(formatSpec.sampleRows);
    const colKeys = Object.keys(formatSpec.sampleRows[0] || {});
    ws['!cols'] = colKeys.map((key) => {
      const maxCellLen = Math.max(
        key.length,
        ...formatSpec.sampleRows.map((row) => String(row[key] ?? '').length)
      );
      return { wch: Math.min(48, Math.max(14, maxCellLen + 4)) };
    });
    ws['!rows'] = [{ hpt: 24 }, ...formatSpec.sampleRows.map(() => ({ hpt: 20 }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, MODULE_LABELS[activeModule].slice(0, 30));
    XLSX.writeFile(wb, formatSpec.templateFilename);
  };

  const primaryNameField =
    activeModule === 'equipment' ? 'name' : activeModule === 'documents' ? 'title' : 'staff_name';
  const primaryCodeField =
    activeModule === 'equipment' ? 'equipment_code' : activeModule === 'documents' ? 'doc_code' : 'designation';
  const statusField = activeModule === 'staff' ? 'competency_status' : 'status';
  const missingPrimaryMapping = Boolean(mapping && !mapping.fieldMap[primaryNameField]);

  return (
    <div className="fixed inset-0 z-[100] !mt-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] border border-[#D6E8FF] flex items-center justify-center text-[#2563EB]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">
                  AI Excel Import — {MODULE_LABELS[activeModule]}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                  <Sparkles className="w-3 h-3" />
                  Auto Column Mapping
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Upload any Excel/CSV sheet — AI detects headers, formats dates, maps columns &amp; feeds verified rows.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Standard Excel Format Definition & Template Download */}
          <div className="rounded-xl border border-[#D6E8FF] bg-[#F8FAFF] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">
                    Standard Excel Format — {MODULE_LABELS[activeModule]}
                  </h4>
                  <p className="text-[11px] text-[#475569] mt-0.5">
                    Use row 1 as clean column headings for best results. Any additional technical columns (Range, Least Count, Accuracy) are saved cleanly in Notes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#BFDBFE] bg-white px-3.5 py-2 text-xs font-semibold text-[#2563EB] hover:bg-[#EAF3FF] transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Standard Template (.xlsx)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
              <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
                <span className="font-bold text-[#0F172A] block mb-1">
                  Required Columns (*)
                </span>
                <div className="flex flex-wrap gap-1">
                  {formatSpec.requiredColumns.map((col) => (
                    <span
                      key={col}
                      className="rounded bg-[#EAF3FF] border border-[#D6E8FF] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#2563EB]"
                    >
                      {col} *
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 space-y-1">
                <div>
                  <span className="font-bold text-[#0F172A]">Date Format: </span>
                  <span className="text-[#475569] font-mono text-[10px]">{formatSpec.dateFormat}</span>
                </div>
                <div>
                  <span className="font-bold text-[#0F172A]">Allowed Status: </span>
                  <span className="text-[#475569] text-[10px]">{formatSpec.statusValues}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#475569]">
              <span className="font-semibold text-[#334155]">Recommended Columns: </span>
              <span>{formatSpec.recommendedColumns.join(', ')}</span>
            </div>
          </div>

          {/* File Dropzone / Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[#BFDBFE] bg-[#F5F9FF] p-4">
            <div className="flex items-center gap-3 min-w-0">
              <Upload className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0F172A] truncate">
                  {fileName || 'Select an Excel (.xlsx, .xls) or CSV file from your computer'}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {sheetPreview
                    ? `Sheet "${sheetPreview.sheetName}" · Header detected at Row ${sheetPreview.headerRowIndex} · ${sheetPreview.rows.length} rows found`
                    : 'Supports merged banner headers, Indian DD-MM-YYYY dates, Make/Model splitting, and extra specification columns.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {sheetNames.length > 1 && (
                <select
                  value={selectedSheet}
                  onChange={(e) => void handleSheetChange(e.target.value)}
                  disabled={analyzing || importing}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs font-semibold text-[#1E293B]"
                >
                  {sheetNames.map((s) => (
                    <option key={s} value={s}>
                      Sheet: {s}
                    </option>
                  ))}
                </select>
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{fileName ? 'Change File' : 'Choose Excel File'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => void handleFileSelected(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {importSuccess && (
            <div className="rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] px-4 py-3 text-xs text-[#15803D] font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#15803D] px-3 py-1 text-white text-[11px] font-semibold hover:bg-emerald-800"
              >
                Done
              </button>
            </div>
          )}

          {analyzing && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 flex items-center justify-center gap-3 text-xs font-semibold text-[#2563EB]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analysing Excel columns with AI and normalizing records...</span>
            </div>
          )}

          {/* AI Analysis Summary & Editable Column Map */}
          {!analyzing && mapping && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FAFCFF] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-[#0F9D92]" />
                  <span className="font-bold text-[#0F172A]">
                    {aiMeta?.usedAi
                      ? `AI Mapped (${aiMeta.provider})`
                      : 'Smart Column Mapper'}
                  </span>
                  <span className="text-[#475569]">— {mapping.analysisSummary}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowColumnMapper((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:border-[#2563EB]"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{showColumnMapper ? 'Hide Column Mapping' : 'Adjust Column Mapping'}</span>
                </button>
              </div>

              {missingPrimaryMapping && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span>
                    Required column <strong>{primaryNameField}</strong> could not be matched automatically. Click <strong>Adjust Column Mapping</strong> above to select it, or use the Standard Template.
                  </span>
                </div>
              )}

              {mapping.detectedModule !== activeModule && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    This worksheet looks like <strong>{MODULE_LABELS[mapping.detectedModule]}</strong>, while you currently have <strong>{MODULE_LABELS[activeModule]}</strong> selected. Switch tabs before importing if needed.
                  </span>
                </div>
              )}

              {showColumnMapper && sheetPreview && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-[#E2E8F0]">
                  {ALLOWED_COLUMNS[activeModule].map((field) => (
                    <div key={field} className="text-[11px]">
                      <label className="font-semibold text-[#334155] block mb-1">{field}</label>
                      <select
                        value={mapping.fieldMap[field] || ''}
                        onChange={(e) => handleManualMapChange(field, e.target.value)}
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#0F172A]"
                      >
                        <option value="">— Not Mapped —</option>
                        {sheetPreview.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {!analyzing && normalizedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#0F172A]">
                    Preview ({selectedRows.length} of {normalizedRows.length} rows selected)
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAllSelected(true)}
                    className="text-[#2563EB] font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllSelected(false)}
                    className="text-[#64748B] font-semibold hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
                <span className="text-[11px] text-[#64748B]">
                  Extra technical columns are preserved automatically in Notes/Remarks.
                </span>
              </div>

              <div className="max-h-72 overflow-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F5F8FC] text-[10px] font-bold uppercase tracking-wider text-[#64748B] sticky top-0 z-10 border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2.5 px-3 w-8">Use</th>
                      <th className="py-2.5 px-3">{primaryCodeField}</th>
                      <th className="py-2.5 px-3">{primaryNameField}</th>
                      {activeModule === 'equipment' && <th className="py-2.5 px-3">Cal / Due Date</th>}
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {normalizedRows.map((row, idx) => (
                      <tr
                        key={row.rowIndex}
                        className={row.selected ? 'hover:bg-slate-50/70' : 'bg-slate-50/70 opacity-60'}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRowSelected(idx)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            value={row.record[primaryCodeField] || ''}
                            onChange={(e) => updateRowField(idx, primaryCodeField, e.target.value)}
                            className="w-32 rounded border border-[#E2E8F0] px-2 py-1 text-xs font-mono text-[#0F172A]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            value={row.record[primaryNameField] || ''}
                            onChange={(e) => updateRowField(idx, primaryNameField, e.target.value)}
                            className="w-56 rounded border border-[#E2E8F0] px-2 py-1 text-xs font-medium text-[#0F172A]"
                          />
                        </td>
                        {activeModule === 'equipment' && (
                          <td className="py-2 px-3 text-[11px] font-mono text-[#475569] whitespace-nowrap">
                            {(row.record.last_calibration_date || '—')} → {(row.record.next_calibration_date || '—')}
                          </td>
                        )}
                        <td className="py-2 px-3">
                          <span className="inline-block rounded-full bg-[#EAF3FF] border border-[#D6E8FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                            {row.record[statusField]}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {row.warnings.length === 0 ? (
                            <span className="text-[#15803D] font-semibold">Ready</span>
                          ) : (
                            <span className="text-amber-700 font-medium">
                              {row.warnings.join(' · ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={selectedRows.length === 0 || importing || analyzing}
              onClick={() => void handleCommitImport()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2563EB] text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                Feed {selectedRows.length} Record{selectedRows.length === 1 ? '' : 's'} into Portal
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

