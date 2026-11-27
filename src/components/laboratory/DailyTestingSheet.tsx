'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Hammer,
  Flame,
  Eye,
  X,
  Upload,
  Zap,
  Download,
} from 'lucide-react';
import { ChemicalParameterKey, MechanicalParameterKey, UserProfile } from '@/types';
import {
  CHEMICAL_PARAMETERS,
  DAILY_WORKBOOK_CATEGORIES,
  MECHANICAL_PARAMETERS,
  LAB_SHIFTS,
} from '@/lib/laboratory/constants';
import {
  calculateBoguePhases,
  calculateCoalMetrics,
  blendCoalValues,
} from '@/lib/laboratory/bogueEngine';
import {
  calculateOxideSum,
  calculateEquivalentAlkali,
  formatDateDDMMYYYY,
} from '@/lib/laboratory/exportService';
import { parseXrfInstrumentFile, generateDemoXrfCsv, ParsedSample } from '@/lib/laboratory/xrfParser';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';

interface DailyTestingSheetProps {
  user: UserProfile | null;
  onSaved?: () => void;
}

type ChemColumnState = {
  sample_id: string;
} & Record<ChemicalParameterKey, string>;

type MechColumnState = Record<MechanicalParameterKey, string>;

type CoalStreamKey = 'Kiln Coal' | 'PC Coal' | 'NKiln Coal' | 'NPC Coal';
type CoalColumnState = {
  im_pct: string;
  vm_pct: string;
  ash_pct: string;
  gcv: string;
};

const emptyChemCol = (defaultSampleId: string): ChemColumnState => ({
  sample_id: defaultSampleId,
  loi: '',
  ir: '',
  so3: '',
  silica: '',
  alumina: '',
  iron: '',
  lime: '',
  magnesia: '',
  k2o: '',
  na2o: '',
  chloride: '',
  free_lime: '',
});

const emptyMechCol = (): MechColumnState => ({
  residue_45: '',
  residue_90: '',
  residue_212: '',
  nc_pct: '',
  blaine_m2_kg: '',
  ist_min: '',
  fst_min: '',
  soundness_le_chat: '',
  soundness_autoclv: '',
  cs_1d: '',
  cs_3d: '',
  cs_7d: '',
  cs_28d: '',
});

const emptyCoalCol = (): CoalColumnState => ({
  im_pct: '',
  vm_pct: '',
  ash_pct: '',
  gcv: '',
});

function buildInitialChemGrid(): Record<string, ChemColumnState> {
  const map: Record<string, ChemColumnState> = {};
  for (const cat of DAILY_WORKBOOK_CATEGORIES) {
    map[cat.dbValue] = emptyChemCol(cat.defaultSampleId);
  }
  return map;
}

function buildInitialMechGrid(): Record<string, MechColumnState> {
  const map: Record<string, MechColumnState> = {};
  for (const cat of DAILY_WORKBOOK_CATEGORIES) {
    map[cat.dbValue] = emptyMechCol();
  }
  return map;
}

export const DailyTestingSheet: React.FC<DailyTestingSheetProps> = ({ user, onSaved }) => {
  const { showSuccess, showError } = useConfirmationModal();

  const [testDate, setTestDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<string>('General');
  const [loadingDate, setLoadingDate] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // XRF / Spectrometer Auto-Import State
  const xrfFileInputRef = useRef<HTMLInputElement>(null);
  const [xrfTargetCategory, setXrfTargetCategory] = useState<string>(DAILY_WORKBOOK_CATEGORIES[0].dbValue);
  const [isParsingXrf, setIsParsingXrf] = useState<boolean>(false);
  const [xrfNotice, setXrfNotice] = useState<string | null>(null);
  const [xrfSamples, setXrfSamples] = useState<ParsedSample[]>([]);
  const [selectedXrfIdx, setSelectedXrfIdx] = useState<number>(0);

  // Excel-like Keyboard Navigation Ref Registry & Grid Helpers
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const registerCell = useCallback(
    (section: 'chem' | 'mech' | 'coal', row: number, col: number) => (el: HTMLInputElement | null) => {
      cellRefs.current[`${section}:${row}:${col}`] = el;
    },
    []
  );

  const focusCell = useCallback((section: 'chem' | 'mech' | 'coal', row: number, col: number): boolean => {
    const el = cellRefs.current[`${section}:${row}:${col}`];
    if (!el || el.disabled || el.readOnly || el.type === 'hidden') return false;
    if (el.getClientRects().length === 0) return false;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    return true;
  }, []);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, section: 'chem' | 'mech' | 'coal', row: number, col: number) => {
      // Preserve Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+A, Cmd+*, Alt+* shortcuts and modal state
      if (e.ctrlKey || e.metaKey || e.altKey || showReview) return;

      const maxRows =
        section === 'chem'
          ? CHEMICAL_PARAMETERS.length + 1 // row 0 = Sample ID, rows 1..12 = 12 oxides
          : section === 'mech'
          ? MECHANICAL_PARAMETERS.length
          : 4; // coal: 4 editable rows (IM, VM, ASH, GCV)

      const maxCols =
        section === 'coal'
          ? 4 // Kiln Coal, PC Coal, NKiln Coal, NPC Coal
          : DAILY_WORKBOOK_CATEGORIES.length; // 19 categories

      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          // Reverse Excel order: move up within current column, then bottommost editable cell of previous column
          let c = col;
          let r = row - 1;
          while (c >= 0) {
            while (r >= 0) {
              if (focusCell(section, r, c)) return;
              r--;
            }
            c--;
            r = maxRows - 1;
          }
          return;
        }

        // Excel-style Top-to-Bottom, Then Next Column:
        // Move down within current column; at bottom, wrap to topmost editable cell of next column
        let c = col;
        let r = row + 1;
        while (c < maxCols) {
          while (r < maxRows) {
            if (focusCell(section, r, c)) return;
            r++;
          }
          c++;
          r = 0;
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        const input = e.currentTarget;
        const len = input.value.length;
        const allSelected = input.selectionStart === 0 && input.selectionEnd === len;
        const atRightEdge = input.selectionStart === len && input.selectionEnd === len;
        if (!allSelected && !atRightEdge) return;

        e.preventDefault();
        for (let c = col + 1; c < maxCols; c++) {
          if (focusCell(section, row, c)) return;
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        const input = e.currentTarget;
        const len = input.value.length;
        const allSelected = input.selectionStart === 0 && input.selectionEnd === len;
        const atLeftEdge = input.selectionStart === 0 && input.selectionEnd === 0;
        if (!allSelected && !atLeftEdge) return;

        e.preventDefault();
        for (let c = col - 1; c >= 0; c--) {
          if (focusCell(section, row, c)) return;
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        for (let r = row + 1; r < maxRows; r++) {
          if (focusCell(section, r, col)) return;
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        for (let r = row - 1; r >= 0; r--) {
          if (focusCell(section, r, col)) return;
        }
      }
    },
    [focusCell, showReview]
  );

  const [chemGrid, setChemGrid] = useState<Record<string, ChemColumnState>>(buildInitialChemGrid);
  const [mechGrid, setMechGrid] = useState<Record<string, MechColumnState>>(buildInitialMechGrid);
  const [coalGrid, setCoalGrid] = useState<Record<CoalStreamKey, CoalColumnState>>({
    'Kiln Coal': emptyCoalCol(),
    'PC Coal': emptyCoalCol(),
    'NKiln Coal': emptyCoalCol(),
    'NPC Coal': emptyCoalCol(),
  });

  const userId = user?.id || '';

  // Load existing data for selected date
  const loadSheetForDate = async (targetDate: string) => {
    if (!userId || !targetDate) return;
    setLoadingDate(true);
    setError(null);
    try {
      const res = await fetch(`/api/daily-sheet?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(targetDate)}`);
      const data = await res.json();

      const nextChem = buildInitialChemGrid();
      const nextMech = buildInitialMechGrid();
      const nextCoal: Record<CoalStreamKey, CoalColumnState> = {
        'Kiln Coal': emptyCoalCol(),
        'PC Coal': emptyCoalCol(),
        'NKiln Coal': emptyCoalCol(),
        'NPC Coal': emptyCoalCol(),
      };

      if (res.ok && data.success) {
        for (const r of data.chemical || []) {
          if (nextChem[r.category]) {
            nextChem[r.category] = {
              sample_id: r.sample_id || nextChem[r.category].sample_id,
              loi: r.loi !== null && r.loi !== undefined ? String(r.loi) : '',
              ir: r.ir !== null && r.ir !== undefined ? String(r.ir) : '',
              so3: r.so3 !== null && r.so3 !== undefined ? String(r.so3) : '',
              silica: r.silica !== null && r.silica !== undefined ? String(r.silica) : '',
              alumina: r.alumina !== null && r.alumina !== undefined ? String(r.alumina) : '',
              iron: r.iron !== null && r.iron !== undefined ? String(r.iron) : '',
              lime: r.lime !== null && r.lime !== undefined ? String(r.lime) : '',
              magnesia: r.magnesia !== null && r.magnesia !== undefined ? String(r.magnesia) : '',
              k2o: r.k2o !== null && r.k2o !== undefined ? String(r.k2o) : '',
              na2o: r.na2o !== null && r.na2o !== undefined ? String(r.na2o) : '',
              chloride: r.chloride !== null && r.chloride !== undefined ? String(r.chloride) : '',
              free_lime: r.free_lime !== null && r.free_lime !== undefined ? String(r.free_lime) : '',
            };
          }
        }

        for (const m of data.mechanical || []) {
          if (nextMech[m.category]) {
            nextMech[m.category] = {
              residue_45: m.residue_45 !== null && m.residue_45 !== undefined ? String(m.residue_45) : '',
              residue_90: m.residue_90 !== null && m.residue_90 !== undefined ? String(m.residue_90) : '',
              residue_212: m.residue_212 !== null && m.residue_212 !== undefined ? String(m.residue_212) : '',
              nc_pct: m.nc_pct !== null && m.nc_pct !== undefined ? String(m.nc_pct) : '',
              blaine_m2_kg: m.blaine_m2_kg !== null && m.blaine_m2_kg !== undefined ? String(m.blaine_m2_kg) : '',
              ist_min: m.ist_min !== null && m.ist_min !== undefined ? String(m.ist_min) : '',
              fst_min: m.fst_min !== null && m.fst_min !== undefined ? String(m.fst_min) : '',
              soundness_le_chat: m.soundness_le_chat !== null && m.soundness_le_chat !== undefined ? String(m.soundness_le_chat) : '',
              soundness_autoclv: m.soundness_autoclv !== null && m.soundness_autoclv !== undefined ? String(m.soundness_autoclv) : '',
              cs_1d: m.cs_1d !== null && m.cs_1d !== undefined ? String(m.cs_1d) : '',
              cs_3d: m.cs_3d !== null && m.cs_3d !== undefined ? String(m.cs_3d) : '',
              cs_7d: m.cs_7d !== null && m.cs_7d !== undefined ? String(m.cs_7d) : '',
              cs_28d: m.cs_28d !== null && m.cs_28d !== undefined ? String(m.cs_28d) : '',
            };
          }
        }

        for (const c of data.coal || []) {
          if (c.coal_stream in nextCoal) {
            const k = c.coal_stream as CoalStreamKey;
            nextCoal[k] = {
              im_pct: c.im_pct !== null && c.im_pct !== undefined ? String(c.im_pct) : '',
              vm_pct: c.vm_pct !== null && c.vm_pct !== undefined ? String(c.vm_pct) : '',
              ash_pct: c.ash_pct !== null && c.ash_pct !== undefined ? String(c.ash_pct) : '',
              gcv: c.gcv !== null && c.gcv !== undefined ? String(c.gcv) : '',
            };
          }
        }
      }

      setChemGrid(nextChem);
      setMechGrid(nextMech);
      setCoalGrid(nextCoal);
    } catch (err) {
      console.warn('Could not load daily sheet:', err);
    } finally {
      setLoadingDate(false);
    }
  };

  useEffect(() => {
    loadSheetForDate(testDate);
  }, [userId, testDate]);

  const handleChemChange = (dbCat: string, field: keyof ChemColumnState, raw: string, decimals?: number) => {
    if (field !== 'sample_id' && decimals !== undefined) {
      const regex = new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);
      if (raw !== '' && !regex.test(raw)) return;
    }
    setChemGrid((prev) => ({
      ...prev,
      [dbCat]: { ...prev[dbCat], [field]: raw },
    }));
  };

  const handleMechChange = (dbCat: string, field: MechanicalParameterKey, raw: string, decimals: number) => {
    const regex = decimals === 0 ? /^\d*$/ : new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);
    if (raw !== '' && !regex.test(raw)) return;
    setMechGrid((prev) => ({
      ...prev,
      [dbCat]: { ...prev[dbCat], [field]: raw },
    }));
  };

  const handleCoalChange = (stream: CoalStreamKey, field: keyof CoalColumnState, raw: string) => {
    const regex = /^\d*(\.\d{0,3})?$/;
    if (raw !== '' && !regex.test(raw)) return;
    setCoalGrid((prev) => ({
      ...prev,
      [stream]: { ...prev[stream], [field]: raw },
    }));
  };

  const applyXrfSampleToColumn = useCallback((targetDbCat: string, sample: ParsedSample) => {
    setChemGrid((prev) => {
      const existing = prev[targetDbCat] || emptyChemCol('NA');
      const nextCol: ChemColumnState = { ...existing };
      if (sample.sampleId) {
        nextCol.sample_id = sample.sampleId;
      }
      for (const p of CHEMICAL_PARAMETERS) {
        const val = sample.values[p.key];
        if (val !== undefined && val !== '') {
          nextCol[p.key] = val;
        }
      }
      return { ...prev, [targetDbCat]: nextCol };
    });
  }, []);

  const handleProcessXrfFile = async (file: File) => {
    setIsParsingXrf(true);
    setError(null);
    setXrfNotice(null);
    try {
      const result = await parseXrfInstrumentFile(file);
      if (!result.success || result.samples.length === 0) {
        setError(result.error || 'Could not detect chemical oxide parameters in the uploaded XRF file.');
        return;
      }

      setXrfSamples(result.samples);
      setSelectedXrfIdx(0);

      // If multiple samples have matching plant categories, auto-populate each matching column
      let autoMappedCount = 0;
      if (result.samples.length > 1) {
        for (const s of result.samples) {
          if (!s.category) continue;
          const catLower = s.category.trim().toLowerCase();
          const matched = DAILY_WORKBOOK_CATEGORIES.find(
            (c) => c.dbValue.toLowerCase() === catLower || c.sheetLabel.toLowerCase() === catLower
          );
          if (matched) {
            applyXrfSampleToColumn(matched.dbValue, s);
            autoMappedCount++;
          }
        }
      }

      if (autoMappedCount > 0) {
        setXrfNotice(
          `Auto-imported ${autoMappedCount} plant categories from "${file.name}" (${result.samples[0].detectedInstrument}).`
        );
      } else {
        const first = result.samples[0];
        applyXrfSampleToColumn(xrfTargetCategory, first);
        const catMeta = DAILY_WORKBOOK_CATEGORIES.find((c) => c.dbValue === xrfTargetCategory);
        setXrfNotice(
          `Imported ${first.matchedParametersCount} oxides (${first.detectedInstrument}) into ${catMeta?.sheetLabel || xrfTargetCategory}.`
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to parse XRF instrument file.');
    } finally {
      setIsParsingXrf(false);
    }
  };

  // Computed Chemical Metrics per Category (Orange Calculated Cells)
  const chemCalculated = useMemo(() => {
    const res: Record<
      string,
      {
        total: number;
        na2oEq: number | null;
        bogue: ReturnType<typeof calculateBoguePhases>;
      }
    > = {};

    for (const cat of DAILY_WORKBOOK_CATEGORIES) {
      const col = chemGrid[cat.dbValue];
      const num = (v: string) => (v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null);

      const total = calculateOxideSum({
        loi: num(col.loi),
        ir: num(col.ir),
        so3: num(col.so3),
        silica: num(col.silica),
        alumina: num(col.alumina),
        iron: num(col.iron),
        lime: num(col.lime),
        magnesia: num(col.magnesia),
        k2o: num(col.k2o),
        na2o: num(col.na2o),
        chloride: num(col.chloride),
      });

      const na2oEq = calculateEquivalentAlkali(num(col.na2o), num(col.k2o));
      const bogue = calculateBoguePhases({
        lime: num(col.lime),
        silica: num(col.silica),
        alumina: num(col.alumina),
        iron: num(col.iron),
        so3: num(col.so3),
        magnesia: num(col.magnesia),
        k2o: num(col.k2o),
        na2o: num(col.na2o),
        free_lime: num(col.free_lime),
      });

      res[cat.dbValue] = { total, na2oEq, bogue };
    }
    return res;
  }, [chemGrid]);

  // Computed Coal Metrics (F.C., UHV, MIXED, NMIXED)
  const coalCalculated = useMemo(() => {
    const n = (v: string) => (v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null);
    const calcStream = (s: CoalColumnState) => {
      const im = n(s.im_pct);
      const vm = n(s.vm_pct);
      const ash = n(s.ash_pct);
      const gcv = n(s.gcv);
      const { fc, uhv } = calculateCoalMetrics(im, vm, ash);
      return { im, vm, ash, gcv, fc, uhv };
    };

    const kiln = calcStream(coalGrid['Kiln Coal']);
    const pc = calcStream(coalGrid['PC Coal']);
    const nKiln = calcStream(coalGrid['NKiln Coal']);
    const nPc = calcStream(coalGrid['NPC Coal']);

    const mixed = {
      im: blendCoalValues(kiln.im, pc.im),
      vm: blendCoalValues(kiln.vm, pc.vm),
      ash: blendCoalValues(kiln.ash, pc.ash),
      gcv: blendCoalValues(kiln.gcv, pc.gcv),
      fc: blendCoalValues(kiln.fc, pc.fc),
      uhv: blendCoalValues(kiln.uhv, pc.uhv),
    };

    const nMixed = {
      im: blendCoalValues(nKiln.im, nPc.im),
      vm: blendCoalValues(nKiln.vm, nPc.vm),
      ash: blendCoalValues(nKiln.ash, nPc.ash),
      gcv: blendCoalValues(nKiln.gcv, nPc.gcv),
      fc: blendCoalValues(nKiln.fc, nPc.fc),
      uhv: blendCoalValues(nKiln.uhv, nPc.uhv),
    };

    return { kiln, pc, mixed, nKiln, nPc, nMixed };
  }, [coalGrid]);

  // Prepare non-empty payloads for Review & Save
  const preparedSummary = useMemo(() => {
    const chemEntries = DAILY_WORKBOOK_CATEGORIES.filter((cat) => {
      const col = chemGrid[cat.dbValue];
      return CHEMICAL_PARAMETERS.some((p) => col[p.key].trim() !== '');
    }).map((cat) => ({
      category: cat.dbValue,
      sheetLabel: cat.sheetLabel,
      ...chemGrid[cat.dbValue],
    }));

    const mechEntries = DAILY_WORKBOOK_CATEGORIES.filter((cat) => {
      if (!cat.hasMechanical) return false;
      const col = mechGrid[cat.dbValue];
      return MECHANICAL_PARAMETERS.some((p) => col[p.key].trim() !== '');
    }).map((cat) => ({
      category: cat.dbValue,
      sheetLabel: cat.sheetLabel,
      ...mechGrid[cat.dbValue],
    }));

    const coalStreams: CoalStreamKey[] = ['Kiln Coal', 'PC Coal', 'NKiln Coal', 'NPC Coal'];
    const coalEntries: any[] = [];
    for (const s of coalStreams) {
      const c = coalGrid[s];
      if (c.im_pct || c.vm_pct || c.ash_pct || c.gcv) {
        coalEntries.push({ coal_stream: s, ...c });
      }
    }
    if (coalCalculated.mixed.im !== null || coalCalculated.mixed.gcv !== null) {
      coalEntries.push({
        coal_stream: 'MIXED',
        im_pct: coalCalculated.mixed.im,
        vm_pct: coalCalculated.mixed.vm,
        ash_pct: coalCalculated.mixed.ash,
        gcv: coalCalculated.mixed.gcv,
        fc_pct: coalCalculated.mixed.fc,
        uhv: coalCalculated.mixed.uhv,
      });
    }
    if (coalCalculated.nMixed.im !== null || coalCalculated.nMixed.gcv !== null) {
      coalEntries.push({
        coal_stream: 'NMIXED',
        im_pct: coalCalculated.nMixed.im,
        vm_pct: coalCalculated.nMixed.vm,
        ash_pct: coalCalculated.nMixed.ash,
        gcv: coalCalculated.nMixed.gcv,
        fc_pct: coalCalculated.nMixed.fc,
        uhv: coalCalculated.nMixed.uhv,
      });
    }

    return { chemEntries, mechEntries, coalEntries };
  }, [chemGrid, mechGrid, coalGrid, coalCalculated]);

  const handleConfirmSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/daily-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          test_date: testDate,
          shift,
          changed_by_name: user.fullName || 'QA Chemist',
          changed_by_email: user.email || null,
          chemicalEntries: preparedSummary.chemEntries,
          mechanicalEntries: preparedSummary.mechEntries,
          coalEntries: preparedSummary.coalEntries,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Daily Testing Sheet.');
      }

      setShowReview(false);
      showSuccess({
        type: 'create',
        title: 'Daily Sheet Saved',
        message: `Saved ${data.savedChemCount} Chemical, ${data.savedMechCount} Mechanical, and ${data.savedCoalCount} Coal entries.`,
        description: `Testing Date: ${formatDateDDMMYYYY(testDate)} (${shift})`,
      });
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || 'Error saving daily sheet.');
      showError({ title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Control Header (Date + Calendar + Shift + Save) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Testing Date (DD-MM-YYYY)
            </label>
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-blue-600 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Plant Shift
            </label>
            <div className="relative flex items-center">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="h-10 pl-9 pr-6 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                {LAB_SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingDate && (
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold mt-4">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Loading date records...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-[11px] text-slate-500 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl font-medium">
            <span className="inline-block w-2.5 h-2.5 rounded-xs bg-orange-300 border border-orange-400 mr-1.5 align-middle" />
            Orange cells = Auto-Calculated Excel Formulas
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                preparedSummary.chemEntries.length === 0 &&
                preparedSummary.mechEntries.length === 0 &&
                preparedSummary.coalEntries.length === 0
              ) {
                setError('Please enter at least one Chemical, Mechanical, or Coal reading before saving.');
                return;
              }
              setError(null);
              setShowReview(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Eye className="w-4 h-4" />
            Review & Save Daily Sheet
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 1-CLICK XRF / SPECTROMETER AUTO-IMPORT BAR */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) handleProcessXrfFile(e.dataTransfer.files[0]);
        }}
        className="bg-white rounded-2xl border border-dashed border-blue-300 bg-gradient-to-r from-[#EAF3FF]/60 via-white to-[#F5F8FC] p-4 shadow-2xs space-y-3"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] border border-[#D6E8FF] flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">1-Click XRF / Spectrometer Auto-Import</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FEF3C7] text-[#B45309]">
                  Zero Typing
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Drop or browse Thermo ARL, Panalytical, Bruker, Shimadzu (.csv, .xlsx, .txt) to auto-fill oxides into the selected column.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={xrfTargetCategory}
              onChange={(e) => setXrfTargetCategory(e.target.value)}
              title="Target category column for XRF import"
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              {DAILY_WORKBOOK_CATEGORIES.map((cat) => (
                <option key={cat.dbValue} value={cat.dbValue}>
                  Target: {cat.sheetLabel} ({cat.dbValue})
                </option>
              ))}
            </select>

            <input
              ref={xrfFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt,.tsv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleProcessXrfFile(e.target.files[0]);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              disabled={isParsingXrf}
              onClick={() => xrfFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isParsingXrf ? 'Parsing XRF...' : 'Import XRF File'}</span>
            </button>

            <button
              type="button"
              onClick={generateDemoXrfCsv}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Demo XRF (.csv)</span>
            </button>
          </div>
        </div>

        {xrfNotice && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-[#DCFCE7] px-3 py-2 text-xs text-[#15803D]">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{xrfNotice}</span>
            </div>
            {xrfSamples.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {xrfSamples.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedXrfIdx(idx);
                      applyXrfSampleToColumn(xrfTargetCategory, s);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                      selectedXrfIdx === idx
                        ? 'bg-[#15803D] text-white border-[#15803D]'
                        : 'bg-white text-[#15803D] border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {s.sampleId || `Row ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: CHEMICAL ANALYSIS (19 CATEGORIES SINGLE-PAGE MATRIX)        */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#EAF3FF] text-[#1E3A8A] flex items-center justify-between border-b border-[#D6E8FF]">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold tracking-wide">1. Chemical Analysis (19 Plant Categories)</h3>
          </div>
          <span className="text-[11px] text-[#2563EB] font-mono font-semibold">
            12 Manual Inputs + 11 Auto-Calculated Rows
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-900 font-bold">
                <th className="sticky left-0 z-20 bg-slate-200 py-2.5 px-3 text-left border-r-2 border-slate-300 min-w-[175px]">
                  Parameter
                </th>
                {DAILY_WORKBOOK_CATEGORIES.map((cat) => (
                  <th
                    key={cat.dbValue}
                    className="py-2.5 px-2 text-center border-r border-slate-200 min-w-[78px] whitespace-nowrap font-extrabold text-slate-900"
                    title={cat.dbValue}
                  >
                    {cat.sheetLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Sample ID Row (row = 0) */}
              <tr className="bg-blue-50/40 border-b border-slate-200">
                <td className="sticky left-0 z-10 bg-blue-50 py-1.5 px-3 font-bold text-blue-950 border-r-2 border-slate-300">
                  Sample ID
                </td>
                {DAILY_WORKBOOK_CATEGORIES.map((cat, colIdx) => (
                  <td key={cat.dbValue} className="p-1 border-r border-slate-200">
                    <input
                      ref={registerCell('chem', 0, colIdx)}
                      type="text"
                      value={chemGrid[cat.dbValue].sample_id}
                      onChange={(e) => handleChemChange(cat.dbValue, 'sample_id', e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => handleGridKeyDown(e, 'chem', 0, colIdx)}
                      placeholder="NA"
                      className="w-full h-7 px-1.5 text-center font-mono text-[11px] font-bold bg-white border border-blue-200 rounded focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-slate-900"
                    />
                  </td>
                ))}
              </tr>

              {/* 12 Manual Chemical Inputs (rows = 1..12) */}
              {CHEMICAL_PARAMETERS.map((p, pIdx) => (
                <tr key={p.key} className="border-b border-slate-200 hover:bg-slate-50/80">
                  <td className="sticky left-0 z-10 bg-white py-1.5 px-3 font-semibold text-slate-800 border-r-2 border-slate-300 whitespace-nowrap">
                    {p.symbol} <span className="text-[10px] text-slate-400">%</span>
                  </td>
                  {DAILY_WORKBOOK_CATEGORIES.map((cat, colIdx) => (
                    <td key={cat.dbValue} className="p-1 border-r border-slate-200">
                      <input
                        ref={registerCell('chem', pIdx + 1, colIdx)}
                        type="text"
                        inputMode="decimal"
                        value={chemGrid[cat.dbValue][p.key]}
                        onChange={(e) => handleChemChange(cat.dbValue, p.key, e.target.value, p.decimals)}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => handleGridKeyDown(e, 'chem', pIdx + 1, colIdx)}
                        className="w-full h-7 px-1.5 text-right font-mono text-[11px] font-semibold bg-white border border-slate-200 rounded focus:border-blue-600 focus:bg-blue-50/30 focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-slate-900"
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* 11 Orange Auto-Calculated Rows */}
              {[
                { label: 'Total', getVal: (c: typeof chemCalculated[string]) => (c.total > 0 ? c.total.toFixed(2) : '') },
                { label: 'Tot. Alkali.as Na2O %', getVal: (c: typeof chemCalculated[string]) => (c.na2oEq !== null ? c.na2oEq.toFixed(3) : '') },
                { label: 'LSF', getVal: (c: typeof chemCalculated[string]) => (c.bogue.lsf !== null ? c.bogue.lsf.toFixed(2) : '') },
                { label: 'SM', getVal: (c: typeof chemCalculated[string]) => (c.bogue.sm !== null ? c.bogue.sm.toFixed(2) : '') },
                { label: 'AM', getVal: (c: typeof chemCalculated[string]) => (c.bogue.am !== null ? c.bogue.am.toFixed(2) : '') },
                { label: 'C3S', getVal: (c: typeof chemCalculated[string]) => (c.bogue.c3s !== null ? c.bogue.c3s.toFixed(2) : '') },
                { label: 'C2S', getVal: (c: typeof chemCalculated[string]) => (c.bogue.c2s !== null ? c.bogue.c2s.toFixed(2) : '') },
                { label: 'C3A', getVal: (c: typeof chemCalculated[string]) => (c.bogue.c3a !== null ? c.bogue.c3a.toFixed(2) : '') },
                { label: 'C4AF', getVal: (c: typeof chemCalculated[string]) => (c.bogue.c4af !== null ? c.bogue.c4af.toFixed(2) : '') },
                { label: 'C.V.', getVal: (c: typeof chemCalculated[string]) => (c.bogue.cv !== null ? c.bogue.cv.toFixed(2) : '') },
                { label: 'L.V.', getVal: (c: typeof chemCalculated[string]) => (c.bogue.lv !== null ? c.bogue.lv.toFixed(2) : '') },
              ].map((calcRow) => (
                <tr key={calcRow.label} className="bg-orange-50/90 border-b border-orange-200/80">
                  <td className="sticky left-0 z-10 bg-orange-100 py-1.5 px-3 font-bold text-orange-950 border-r-2 border-orange-300 whitespace-nowrap">
                    {calcRow.label}
                  </td>
                  {DAILY_WORKBOOK_CATEGORIES.map((cat) => {
                    const val = calcRow.getVal(chemCalculated[cat.dbValue]);
                    return (
                      <td
                        key={cat.dbValue}
                        className="py-1.5 px-2 text-right font-mono text-[11px] font-bold text-orange-950 border-r border-orange-200/70 whitespace-nowrap"
                      >
                        {val || <span className="text-orange-300">-</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: MECHANICAL ANALYSIS (13 PARAMETERS)                         */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#CCFBF1] text-[#115E59] flex items-center justify-between border-b border-[#99F6E4]">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-[#0F9D92]" />
            <h3 className="text-sm font-bold tracking-wide">2. Mechanical Analysis</h3>
          </div>
          <span className="text-[11px] text-[#0F9D92] font-mono font-semibold">
            Residues, N.C %, Blaine, I.S.T., F.S.T., Soundness, C.S. (1D–28D)
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-900 font-bold">
                <th className="sticky left-0 z-20 bg-slate-200 py-2.5 px-3 text-left border-r-2 border-slate-300 min-w-[175px]">
                  Mechanical Parameter
                </th>
                {DAILY_WORKBOOK_CATEGORIES.map((cat) => (
                  <th
                    key={cat.dbValue}
                    className={`py-2.5 px-2 text-center border-r border-slate-200 min-w-[78px] whitespace-nowrap ${
                      cat.hasMechanical ? 'text-slate-900 font-extrabold' : 'text-slate-400 bg-slate-100/70'
                    }`}
                  >
                    {cat.sheetLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MECHANICAL_PARAMETERS.map((mp, mIdx) => (
                <tr key={mp.key} className="border-b border-slate-200 hover:bg-slate-50/80">
                  <td className="sticky left-0 z-10 bg-white py-1.5 px-3 font-semibold text-slate-800 border-r-2 border-slate-300 whitespace-nowrap">
                    {mp.label}
                  </td>
                  {DAILY_WORKBOOK_CATEGORIES.map((cat, colIdx) => (
                    <td
                      key={cat.dbValue}
                      className={`p-1 border-r border-slate-200 ${!cat.hasMechanical ? 'bg-slate-100/80' : ''}`}
                    >
                      {cat.hasMechanical ? (
                        <input
                          ref={registerCell('mech', mIdx, colIdx)}
                          type="text"
                          inputMode="decimal"
                          value={mechGrid[cat.dbValue][mp.key]}
                          onChange={(e) => handleMechChange(cat.dbValue, mp.key, e.target.value, mp.decimals)}
                          onFocus={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => handleGridKeyDown(e, 'mech', mIdx, colIdx)}
                          className="w-full h-7 px-1.5 text-right font-mono text-[11px] font-semibold bg-white border border-slate-200 rounded focus:border-blue-600 focus:bg-blue-50/30 focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-slate-900"
                        />
                      ) : (
                        <div className="h-7 flex items-center justify-center text-slate-300 font-mono text-[10px]">
                          —
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 3: COAL ANALYSIS (KILN, PC, MIXED 40/60)                       */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FEF3C7] text-[#92400E] flex items-center justify-between border-b border-[#FDE68A]">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#B45309]" />
            <h3 className="text-sm font-bold tracking-wide">3. Coal Analysis</h3>
          </div>
          <span className="text-[11px] text-[#B45309] font-mono font-semibold">
            MIXED = 40% Kiln Coal + 60% PC Coal • F.C. & UHV Auto-Calculated
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 font-bold text-slate-900">
                <th className="py-2.5 px-3 text-left border-r-2 border-slate-300 min-w-[150px]">Parameter</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200">Kiln Coal</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200">PC Coal</th>
                <th className="py-2.5 px-3 text-center border-r-2 border-slate-300 bg-orange-100 text-orange-950">MIXED (40/60)</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200">NKiln Coal</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200">NPC Coal</th>
                <th className="py-2.5 px-3 text-center bg-orange-100 text-orange-950">NMIXED (40/60)</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { key: 'im_pct', label: 'I.M. (%)' },
                  { key: 'vm_pct', label: 'V.M (%)' },
                  { key: 'ash_pct', label: 'ASH (%)' },
                  { key: 'gcv', label: 'GCV' },
                ] as { key: keyof CoalColumnState; label: string }[]
              ).map((row, rIdx) => {
                const mixedVal =
                  row.key === 'im_pct'
                    ? coalCalculated.mixed.im
                    : row.key === 'vm_pct'
                    ? coalCalculated.mixed.vm
                    : row.key === 'ash_pct'
                    ? coalCalculated.mixed.ash
                    : coalCalculated.mixed.gcv;
                const nMixedVal =
                  row.key === 'im_pct'
                    ? coalCalculated.nMixed.im
                    : row.key === 'vm_pct'
                    ? coalCalculated.nMixed.vm
                    : row.key === 'ash_pct'
                    ? coalCalculated.nMixed.ash
                    : coalCalculated.nMixed.gcv;

                return (
                  <tr key={row.key} className="border-b border-slate-200">
                    <td className="py-1.5 px-3 font-semibold text-slate-800 border-r-2 border-slate-300">{row.label}</td>
                    {(['Kiln Coal', 'PC Coal'] as CoalStreamKey[]).map((stream, cIdx) => (
                      <td key={stream} className="p-1.5 border-r border-slate-200">
                        <input
                          ref={registerCell('coal', rIdx, cIdx)}
                          type="text"
                          inputMode="decimal"
                          value={coalGrid[stream][row.key]}
                          onChange={(e) => handleCoalChange(stream, row.key, e.target.value)}
                          onFocus={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => handleGridKeyDown(e, 'coal', rIdx, cIdx)}
                          className="w-full h-8 px-2 text-right font-mono text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:bg-blue-50/30 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-mono font-bold bg-orange-50 text-orange-950 border-r-2 border-slate-300">
                      {mixedVal !== null ? mixedVal : '-'}
                    </td>
                    {(['NKiln Coal', 'NPC Coal'] as CoalStreamKey[]).map((stream, cIdx) => (
                      <td key={stream} className="p-1.5 border-r border-slate-200">
                        <input
                          ref={registerCell('coal', rIdx, cIdx + 2)}
                          type="text"
                          inputMode="decimal"
                          value={coalGrid[stream][row.key]}
                          onChange={(e) => handleCoalChange(stream, row.key, e.target.value)}
                          onFocus={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => handleGridKeyDown(e, 'coal', rIdx, cIdx + 2)}
                          className="w-full h-8 px-2 text-right font-mono text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:bg-blue-50/30 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                        />
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right font-mono font-bold bg-orange-50 text-orange-950">
                      {nMixedVal !== null ? nMixedVal : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* F.C. Calculated Row */}
              <tr className="bg-orange-50/90 border-b border-orange-200 font-bold text-orange-950">
                <td className="py-2 px-3 bg-orange-100 border-r-2 border-orange-300">F.C. (%)</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.kiln.fc ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.pc.fc ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r-2 border-orange-300 bg-orange-100">{coalCalculated.mixed.fc ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.nKiln.fc ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.nPc.fc ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono bg-orange-100">{coalCalculated.nMixed.fc ?? '-'}</td>
              </tr>

              {/* UHV Calculated Row */}
              <tr className="bg-orange-50/90 font-bold text-orange-950">
                <td className="py-2 px-3 bg-orange-100 border-r-2 border-orange-300">UHV</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.kiln.uhv ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.pc.uhv ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r-2 border-orange-300 bg-orange-100">{coalCalculated.mixed.uhv ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.nKiln.uhv ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono border-r border-orange-200">{coalCalculated.nPc.uhv ?? '-'}</td>
                <td className="py-2 px-3 text-right font-mono bg-orange-100">{coalCalculated.nMixed.uhv ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW & CONFIRMATION MODAL */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Confirm Daily Laboratory Sheet Submission</h3>
                <p className="text-[11px] text-slate-300 font-mono">
                  Date: {formatDateDDMMYYYY(testDate)} &bull; Shift: {shift}
                </p>
              </div>
              <button onClick={() => setShowReview(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <div className="text-lg font-extrabold text-blue-900">{preparedSummary.chemEntries.length}</div>
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Chemical Streams</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <div className="text-lg font-extrabold text-amber-900">{preparedSummary.mechEntries.length}</div>
                  <div className="text-[10px] font-bold text-amber-700 uppercase">Mechanical Streams</div>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
                  <div className="text-lg font-extrabold text-orange-900">{preparedSummary.coalEntries.length}</div>
                  <div className="text-[10px] font-bold text-orange-700 uppercase">Coal Streams</div>
                </div>
              </div>

              {preparedSummary.chemEntries.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Chemical Streams Ready to Save:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {preparedSummary.chemEntries.map((c) => {
                      const calc = chemCalculated[c.category];
                      return (
                        <span key={c.category} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-[11px]">
                          <strong>{c.sheetLabel}</strong> ({c.sample_id || 'NA'}) &bull; Σ={calc.total.toFixed(2)}%
                          {calc.bogue.lsf !== null ? ` • LSF=${calc.bogue.lsf}` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving to Supabase...' : 'Confirm & Save Daily Sheet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

