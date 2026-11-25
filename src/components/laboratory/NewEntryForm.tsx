'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  FlaskConical,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  Calculator,
  X,
  Edit3,
  Eye,
  ClipboardCheck,
  ChevronDown,
} from 'lucide-react';
import { CHEMICAL_PARAMETERS, PLANT_CATEGORIES, LAB_SHIFTS } from '@/lib/laboratory/constants';
import { LaboratoryRecord, UserProfile } from '@/types';
import { calculateOxideSum, calculateEquivalentAlkali, formatDateDDMMYYYY } from '@/lib/laboratory/exportService';
import { calculateBoguePhases, BogueResult } from '@/lib/laboratory/bogueEngine';
import { parseXrfInstrumentFile, generateDemoXrfCsv, ParsedSample } from '@/lib/laboratory/xrfParser';
import { Sparkles, Award, TrendingUp, Info, Zap, Flame, AlertOctagon, CheckCheck, UploadCloud, FileSpreadsheet, Download, CheckCircle, FileText, RefreshCw } from 'lucide-react';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import { extractNextSampleId, checkIsDuplicateSampleId } from '@/lib/laboratory/sampleIdHelper';

interface NewEntryFormProps {
  user: UserProfile | null;
  onRecordSaved: (record: LaboratoryRecord) => void;
}

export const NewEntryForm: React.FC<NewEntryFormProps> = ({ user, onRecordSaved }) => {
  const { showSuccess, showError: showGlobalError } = useConfirmationModal();
  const today = new Date().toISOString().split('T')[0];

  const [testDate, setTestDate] = useState<string>(today);
  const [category, setCategory] = useState<string>('Ball mill');
  const [sampleId, setSampleId] = useState<string>('Sample-1');
  const [suggestedNextId, setSuggestedNextId] = useState<string>('Sample-1');
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [isLoadingSampleId, setIsLoadingSampleId] = useState<boolean>(false);
  const [existingRecords, setExistingRecords] = useState<LaboratoryRecord[]>([]);
  const [shift, setShift] = useState<string>('General');
  const [notes, setNotes] = useState<string>('');

  // Live duplicate check against existing laboratory records
  const isDuplicateSample = React.useMemo(() => {
    return checkIsDuplicateSampleId(sampleId, testDate, category, existingRecords);
  }, [sampleId, testDate, category, existingRecords]);

  // Query Supabase for existing records and auto-increment Sample ID
  const fetchAndSetNextSampleId = React.useCallback(async (forceOverride = false) => {
    if (!user?.id) return;
    setIsLoadingSampleId(true);
    try {
      const res = await fetch(`/api/records?userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (res.ok && data.records) {
        setExistingRecords(data.records);
        const nextId = extractNextSampleId(data.records.map((r: LaboratoryRecord) => r.sample_id));
        setSuggestedNextId(nextId);
        if (!isManualOverride || forceOverride) {
          setSampleId(nextId);
          setIsManualOverride(false);
        }
      }
    } catch (err) {
      console.warn('Auto-increment sample ID fetch notice:', err);
    } finally {
      setIsLoadingSampleId(false);
    }
  }, [user?.id, isManualOverride]);

  React.useEffect(() => {
    fetchAndSetNextSampleId();
  }, [fetchAndSetNextSampleId]);

  // The 11 Chemical Parameters in Exact Sequence:
  // 1. LOI -> 2. IR -> 3. SO3 -> 4. SiO2 -> 5. Al2O3 -> 6. Fe2O3 -> 7. CaO -> 8. MgO -> 9. K2O -> 10. Na2O -> 11. Chloride
  const [values, setValues] = useState<Record<string, string>>({
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Keyboard navigation & modal accessibility refs
  const paramRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const reviewButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const editButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const modalRef = React.useRef<HTMLDivElement | null>(null);

  // XRF / Spectrometer Instrument Auto-Import State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingXrf, setIsParsingXrf] = useState(false);
  const [xrfSuccessNotice, setXrfSuccessNotice] = useState<string | null>(null);
  const [xrfSamples, setXrfSamples] = useState<ParsedSample[]>([]);
  const [selectedXrfIndex, setSelectedXrfIndex] = useState<number>(0);

  const applyParsedSample = (sample: ParsedSample, sourceFileName?: string) => {
    setValues((prev) => ({
      ...prev,
      ...sample.values,
    }));

    if (sample.sampleId) {
      setSampleId(sample.sampleId);
      setIsManualOverride(true);
    }
    if (sample.testDate) {
      setTestDate(sample.testDate);
    }

    setXrfSuccessNotice(
      `⚡ Successfully imported ${sample.matchedParametersCount} parameters from ${sample.detectedInstrument} (${sourceFileName || sample.sampleId || 'Spectrometer export'})!`
    );
  };

  const handleProcessXrfFile = async (file: File) => {
    setIsParsingXrf(true);
    setXrfSuccessNotice(null);
    setError(null);
    try {
      const result = await parseXrfInstrumentFile(file);
      if (!result.success || result.samples.length === 0) {
        throw new Error(result.error || 'Failed to detect chemical parameters in file.');
      }

      setXrfSamples(result.samples);
      setSelectedXrfIndex(0);
      applyParsedSample(result.samples[0], result.fileName);
    } catch (err: any) {
      console.error('XRF Import error:', err);
      setError(err.message || 'Error parsing spectrometer file.');
    } finally {
      setIsParsingXrf(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessXrfFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessXrfFile(e.target.files[0]);
    }
  };

  // Live sum calculation (All 11 oxides in sequence)
  const currentSum = calculateOxideSum({
    loi: values.loi ? Number(values.loi) : null,
    ir: values.ir ? Number(values.ir) : null,
    so3: values.so3 ? Number(values.so3) : null,
    silica: values.silica ? Number(values.silica) : null,
    alumina: values.alumina ? Number(values.alumina) : null,
    iron: values.iron ? Number(values.iron) : null,
    lime: values.lime ? Number(values.lime) : null,
    magnesia: values.magnesia ? Number(values.magnesia) : null,
    k2o: values.k2o ? Number(values.k2o) : null,
    na2o: values.na2o ? Number(values.na2o) : null,
    chloride: values.chloride ? Number(values.chloride) : null,
  });

  // Real-time Bogue Mineral Phases & Moduli Engine
  const bogue = React.useMemo(() => {
    return calculateBoguePhases({
      lime: values.lime ? parseFloat(values.lime) : null,
      silica: values.silica ? parseFloat(values.silica) : null,
      alumina: values.alumina ? parseFloat(values.alumina) : null,
      iron: values.iron ? parseFloat(values.iron) : null,
      so3: values.so3 ? parseFloat(values.so3) : null,
    });
  }, [values.lime, values.silica, values.alumina, values.iron, values.so3]);

  const handleFieldChange = (key: string, val: string) => {
    // Only allow numbers and decimal point
    // Chloride allows up to 4 decimals, all other parameters allow up to 2 decimals
    const maxDecimals = key === 'chloride' ? 4 : 2;
    const regex = new RegExp(`^\\d*(\\.\\d{0,${maxDecimals}})?$`);
    if (val === '' || regex.test(val)) {
      setValues((prev) => ({ ...prev, [key]: val }));
      setError(null);
      setSuccess(null);
    }
  };

  const handleReset = () => {
    setValues({
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
    });
    setNotes('');
    setSampleId(suggestedNextId);
    setIsManualOverride(false);
    setError(null);
    setSuccess(null);
  };

  // Sequential Enter Key Navigation in Exact Order:
  // 1. LOI -> 2. IR -> 3. SO3 -> 4. SiO2 -> 5. Al2O3 -> 6. Fe2O3 -> 7. CaO -> 8. MgO -> 9. K2O -> 10. Na2O -> 11. Chloride
  const handleParamKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    paramKey: string,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < CHEMICAL_PARAMETERS.length - 1) {
        const nextKey = CHEMICAL_PARAMETERS[index + 1].key;
        const nextInput = paramRefs.current[nextKey];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      } else {
        // Final field (Chloride): move focus to Review / Submit action (does NOT save directly)
        reviewButtonRef.current?.focus();
        handleOpenReview();
      }
    }
  };

  // Step 1: Open Confirmation Modal with Validation
  const handleOpenReview = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('You must be logged in to record laboratory tests.');
      return;
    }

    if (!testDate) {
      setError('Testing date is mandatory.');
      return;
    }

    if (!sampleId.trim()) {
      setError('Sample Identification is mandatory. Please enter a Sample ID or click "Reset to auto".');
      return;
    }

    if (isDuplicateSample) {
      setError(
        `Duplicate Sample ID: "${sampleId.trim()}" is already registered for ${category} on ${formatDateDDMMYYYY(testDate)}. Please specify a unique Sample ID (suggested: ${suggestedNextId}).`
      );
      return;
    }

    // Check that at least one test parameter is filled
    const hasAnyValue = Object.values(values).some((v) => v.trim() !== '');
    if (!hasAnyValue) {
      setError('Please enter at least one chemical parameter value before reviewing.');
      return;
    }

    // Open the confirmation modal
    setShowConfirmModal(true);
  };

  // Keyboard accessibility for Confirmation Modal:
  // - Escape closes modal without submitting
  // - Initial focus goes to Confirm & Submit button
  React.useEffect(() => {
    if (!showConfirmModal) return;

    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 60);

    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowConfirmModal(false);
        reviewButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [showConfirmModal]);

  // Step 2: Final Submission only after user clicks "Confirm & Submit"
  const handleConfirmSubmit = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const k2oNum = values.k2o !== '' ? Number(values.k2o) : null;
      const na2oNum = values.na2o !== '' ? Number(values.na2o) : null;

      const payload = {
        user_id: user.id,
        changed_by_name: user.fullName || 'QA Chemist',
        changed_by_email: user.email || null,
        test_date: testDate,
        category,
        sample_id: sampleId.trim() || 'Sample-1',
        shift,
        loi: values.loi !== '' ? Number(values.loi) : null,
        ir: values.ir !== '' ? Number(values.ir) : null,
        so3: values.so3 !== '' ? Number(values.so3) : null,
        silica: values.silica !== '' ? Number(values.silica) : null,
        alumina: values.alumina !== '' ? Number(values.alumina) : null,
        iron: values.iron !== '' ? Number(values.iron) : null,
        lime: values.lime !== '' ? Number(values.lime) : null,
        magnesia: values.magnesia !== '' ? Number(values.magnesia) : null,
        k2o: k2oNum,
        na2o: na2oNum,
        na2o_eq: calculateEquivalentAlkali(na2oNum, k2oNum),
        chloride: values.chloride !== '' ? Number(values.chloride) : null,
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save laboratory record.');
      }

      // Close modal on successful submission
      setShowConfirmModal(false);

      // Enterprise central animated success popup
      showSuccess({
        type: 'create',
        title: 'Record Saved to Database',
        message: 'Your record has been successfully saved to the database.',
        description: `${category} • ${sampleId} (${formatDateDDMMYYYY(testDate)})`,
      });

      setSuccess(`Record for ${formatDateDDMMYYYY(testDate)} under "${category}" successfully logged into Supabase.`);
      
      // Auto-update after successful save: add saved record and calculate next sequential Sample ID
      const savedRec: LaboratoryRecord = data.record || {
        id: String(Date.now()),
        user_id: user.id,
        test_date: testDate,
        category,
        sample_id: sampleId.trim(),
        shift,
        ...values,
      };

      const updatedRecords = [...existingRecords, savedRec];
      setExistingRecords(updatedRecords);

      const nextNumId = extractNextSampleId(updatedRecords.map((r) => r.sample_id));
      setSuggestedNextId(nextNumId);
      setSampleId(nextNumId);
      setIsManualOverride(false);

      // Clear inputs for next entry
      setValues({
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
      });
      setNotes('');

      // Notify parent to refresh and navigate to Previous Records
      onRecordSaved(data.record);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
      showGlobalError({
        title: 'Submission Failed',
        message: err.message || 'Failed to save laboratory record to the database.',
      });
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-subtle space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 border border-blue-200">
              Daily QC Analysis
            </span>
            <span className="text-xs text-slate-400 font-mono">Form 101-CHEM</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-blue-600" />
            <span>New Laboratory Chemical Test Entry</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log standard oxide determinations and compliance test parameters for cement & material batches.
          </p>
        </div>

        {/* Real-time Sum Pill */}
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 shrink-0">
          <Calculator className="h-4 w-4 text-slate-500" />
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Oxides (Σ)</div>
            <div className={`text-sm font-bold font-mono ${currentSum > 100 ? 'text-amber-600' : 'text-slate-900'}`}>
              {currentSum.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 animate-fadeIn">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleOpenReview} className="space-y-6">
        {/* XRF / SPECTROMETER 1-CLICK INSTRUMENT AUTO-IMPORT DROPZONE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span>1-Click XRF / Spectrometer File Auto-Import</span>
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full border border-amber-200">
                    ZERO TYPING
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Drag & drop raw export file from Thermo Scientific ARL, Panalytical Zetium/Axios, Bruker, or Shimadzu.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={generateDemoXrfCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors self-start sm:self-center"
              title="Download dummy XRF spectrometer CSV file to test instant drag-and-drop"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download Demo XRF File (.csv)</span>
            </button>
          </div>

          {/* Drag & Drop Target Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                : 'border-slate-200 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-300'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls,.txt,.tsv"
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="p-2.5 rounded-full bg-white shadow-xs text-blue-600 border border-slate-200/80">
                <UploadCloud className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {isParsingXrf ? 'Parsing Spectrometer Oxides...' : 'Drop XRF file here or click to browse'}
              </p>
              <p className="text-[10px] text-slate-400">
                Supports .CSV, .XLSX, .XLS, .TXT, .TSV &bull; Auto-detects CaO, SiO₂, Al₂O₃, SO₃, LOI, Fe₂O₃, MgO, Cl
              </p>
            </div>
          </div>

          {/* Success Notice / Multi-Sample Selector */}
          {xrfSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{xrfSuccessNotice}</span>
              </div>
            </div>
          )}

          {/* If multi samples detected in the uploaded file */}
          {xrfSamples.length > 1 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Multiple Test Batches Detected in File ({xrfSamples.length}):</span>
                <span className="text-slate-400 font-normal">Click to switch loaded batch</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {xrfSamples.map((samp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedXrfIndex(idx);
                      applyParsedSample(samp);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      selectedXrfIndex === idx
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {samp.sampleId || `Batch #${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Sampling Metadata (Date, Category, Sample ID, Shift) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>1. Sample & Section Identification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* Field 1: Date (Calendar Picker with strict DD-MM-YYYY indicator) */}
            <div className="flex flex-col">
              <div className="h-6 flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Testing Date <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                  DD-MM-YYYY
                </span>
              </div>
              <div className="relative h-10 w-full rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-all"
                  required
                />
              </div>
              <div className="h-5 flex items-center mt-1">
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  Date: <strong className="text-slate-800 font-bold">{formatDateDDMMYYYY(testDate)}</strong>
                </p>
              </div>
            </div>

            {/* Field 2: Category (Ball Mill first & default) */}
            <div className="flex flex-col">
              <div className="h-6 flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Plant Category <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                  19 Circuits
                </span>
              </div>
              <div className="relative h-10 w-full rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Layers className="h-4 w-4" />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs font-bold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  {PLANT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="h-5 flex items-center mt-1">
                <p className="text-[10px] text-slate-500 truncate">
                  Default: <strong className="text-slate-800">Ball mill</strong> &bull; ASTM standard
                </p>
              </div>
            </div>

            {/* Field 3: Sample ID / Batch */}
            <div className="flex flex-col">
              <div className="h-6 flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Sample ID <span className="text-red-500">*</span>
                </label>
                {isManualOverride ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSampleId(suggestedNextId);
                      setIsManualOverride(false);
                      setError(null);
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    title={`Reset to auto-incremented ${suggestedNextId}`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Reset auto ({suggestedNextId})
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Auto-seq
                  </span>
                )}
              </div>
              <div className="relative h-10 w-full rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Tag className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => {
                    setSampleId(e.target.value);
                    setIsManualOverride(true);
                    setError(null);
                  }}
                  placeholder="e.g. Sample-1"
                  className={`h-10 w-full rounded-xl border pl-9 pr-9 text-xs font-mono font-bold focus:ring-2 focus:outline-none transition-all ${
                    isDuplicateSample
                      ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-blue-600 focus:ring-blue-600/15'
                  }`}
                />
                {isLoadingSampleId && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              <div className="h-5 flex items-center mt-1">
                {isDuplicateSample ? (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 truncate animate-in fade-in">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span>Duplicate: already used on this date!</span>
                  </p>
                ) : isManualOverride ? (
                  <p className="text-[10px] text-amber-600 font-medium truncate flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Manual override active</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    Sequenced from database &bull; Editable
                  </p>
                )}
              </div>
            </div>

            {/* Field 4: Shift */}
            <div className="flex flex-col">
              <div className="h-6 flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Plant Shift <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                  4 Shifts
                </span>
              </div>
              <div className="relative h-10 w-full rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Clock className="h-4 w-4" />
                </div>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs font-bold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                  {LAB_SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="h-5 flex items-center mt-1">
                <p className="text-[10px] text-slate-500 truncate">
                  Current: <strong className="text-slate-800">{shift}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: The 9 Chemical Parameter Inputs (Exact Sequence) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
              <span>2. Chemical Analysis Results (Percentages %)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Use Tab key for fast numeric entry</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {CHEMICAL_PARAMETERS.map((param, index) => (
              <div
                key={param.key}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{param.label}</span>
                  </div>
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 border border-slate-200">
                    {param.formula}
                  </span>
                </div>

                <div className="relative rounded-md shadow-subtle">
                  <input
                    ref={(el) => {
                      paramRefs.current[param.key] = el;
                    }}
                    type="text"
                    inputMode="decimal"
                    value={values[param.key]}
                    onChange={(e) => handleFieldChange(param.key, e.target.value)}
                    onKeyDown={(e) => handleParamKeyDown(e, param.key, index)}
                    placeholder={param.key === 'chloride' ? 'e.g. 0.0150' : 'e.g. 1.50'}
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold font-mono text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-slate-400">
                    {param.unit}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{param.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Bogue Mineral & Moduli Quality Engine (Cement Chemist Copilot) */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 p-5 space-y-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/70">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Real-Time Bogue Mineral & Moduli Engine</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    ASTM C150 / IS 269
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Calculates LSF, Silica & Alumina Moduli, and Bogue mineral phases instantly as you type.
                </p>
              </div>
            </div>

            {(bogue.hasSufficientData || values.k2o !== '' || values.na2o !== '') && (
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const na2oEq = calculateEquivalentAlkali(
                    values.na2o !== '' ? Number(values.na2o) : null,
                    values.k2o !== '' ? Number(values.k2o) : null
                  );
                  if (na2oEq === null) return null;
                  const isLowAlkali = na2oEq <= 0.60;
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                        isLowAlkali
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                      title="Na2Oeq = Na2O + 0.658 × K2O (Low-Alkali Cement Limit <= 0.60%)"
                    >
                      Na₂Oeq: {na2oEq.toFixed(3)}% ({isLowAlkali ? 'Low-Alkali OK' : '> 0.60% Limit'})
                    </span>
                  );
                })()}
                {bogue.hasSufficientData && (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Award className="w-3 h-3" />
                      {bogue.strengthProfile}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {bogue.sulfateResistance}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {!bogue.hasSufficientData ? (
            <div className="py-6 text-center text-xs text-slate-500 bg-white/70 rounded-xl border border-dashed border-blue-200/80 p-4">
              <Calculator className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Enter Lime (CaO), Silica (SiO₂), Alumina (Al₂O₃), and Iron (Fe₂O₃) above.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                The engine will instantly compute LSF, SM, AM, C₃S, C₂S, C₃A, and C₄AF with zero manual calculator effort.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Row 1: The 3 Core Moduli Ratios */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Core Cement Moduli (Quality Ratios)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* LSF */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">LSF</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Lime Saturation)</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                        {bogue.lsf !== null ? bogue.lsf.toFixed(3) : '-'}
                      </div>
                      <span className="text-[10px] text-slate-400">Target: 0.92 – 0.98</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      bogue.lsfStatus === 'optimal'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : bogue.lsfStatus === 'low'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {bogue.lsfStatus}
                    </span>
                  </div>

                  {/* SM */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">SM / SR</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Silica Ratio)</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                        {bogue.sm !== null ? bogue.sm.toFixed(2) : '-'}
                      </div>
                      <span className="text-[10px] text-slate-400">Target: 2.10 – 2.70</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      bogue.smStatus === 'optimal'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {bogue.smStatus}
                    </span>
                  </div>

                  {/* AM */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">AM / AR</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Alumina Ratio)</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                        {bogue.am !== null ? bogue.am.toFixed(2) : '-'}
                      </div>
                      <span className="text-[10px] text-slate-400">Target: 1.20 – 1.80</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      bogue.amStatus === 'optimal'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {bogue.amStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: The 4 Bogue Mineral Compounds */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Bogue Mineral Phase Distribution (% wt/wt)
                  </span>
                  <span className="text-[11px] font-mono text-slate-600">
                    Total Silicates (C₃S + C₂S): <strong className="text-blue-700">{bogue.totalSilicates}%</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* C3S (Alite) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">C₃S (Alite)</span>
                      <span className="text-[10px] text-slate-400">28d Strength</span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-blue-700">
                      {bogue.c3s !== null ? `${bogue.c3s.toFixed(1)}%` : '-'}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, (bogue.c3s || 0) * 1.3))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Normal: 45 – 65%</p>
                  </div>

                  {/* C2S (Belite) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">C₂S (Belite)</span>
                      <span className="text-[10px] text-slate-400">Late Strength</span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-slate-800">
                      {bogue.c2s !== null ? `${bogue.c2s.toFixed(1)}%` : '-'}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, (bogue.c2s || 0) * 2.5))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Normal: 12 – 28%</p>
                  </div>

                  {/* C3A (Tricalcium Aluminate) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">C₃A (Celite)</span>
                      <span className="text-[10px] text-slate-400">Setting Heat</span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-amber-700">
                      {bogue.c3a !== null ? `${bogue.c3a.toFixed(1)}%` : '-'}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, (bogue.c3a || 0) * 6))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Normal: 5 – 12%</p>
                  </div>

                  {/* C4AF (Ferrite) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">C₄AF (Ferrite)</span>
                      <span className="text-[10px] text-slate-400">Flux & Tone</span>
                    </div>
                    <div className="text-xl font-extrabold font-mono text-slate-800">
                      {bogue.c4af !== null ? `${bogue.c4af.toFixed(1)}%` : '-'}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-slate-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, (bogue.c4af || 0) * 5))}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Normal: 8 – 15%</p>
                  </div>
                </div>
              </div>

              {/* Actionable Chemical Observations */}
              {bogue.insights.length > 0 && (
                <div className="p-3.5 bg-white/90 rounded-xl border border-blue-200/80 text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px] uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span>Real-Time Quality Advisory</span>
                  </div>
                  <ul className="space-y-1 pl-4 list-disc text-[11px] text-slate-600 leading-relaxed">
                    {bogue.insights.map((ins, idx) => (
                      <li key={idx}>{ins}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Notes & Action Buttons */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Chemist Observations & Testing Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sampling at 10:30 AM after Ball Mill separator adjustment. Temperature: 110°C."
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-subtle hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Values</span>
            </button>

            <button
              ref={reviewButtonRef}
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-600/30 focus:outline-none disabled:opacity-60"
            >
              <Eye className="h-4 w-4" />
              <span>Review & Confirm Data</span>
            </button>
          </div>
        </div>
      </form>

      {/* ============================================================================== */}
      {/* 4. CENTERED DATA CONFIRMATION MODAL BEFORE SAVING                              */}
      {/* ============================================================================== */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            // Close when clicking subtle backdrop outside modal box
            if (e.target === e.currentTarget && !isSubmitting) {
              setShowConfirmModal(false);
              reviewButtonRef.current?.focus();
            }
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900">
                    Confirm Chemical Analysis Data
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Please review your entered laboratory results before submitting. Check that all values are correct.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    setShowConfirmModal(false);
                    reviewButtonRef.current?.focus();
                  }
                }}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: Complete Data Table */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Parameter</th>
                      <th className="py-2.5 px-4 text-right">Entered Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {/* Date */}
                    <tr className="bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>Date</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatDateDDMMYYYY(testDate)}
                      </td>
                    </tr>

                    {/* Category */}
                    <tr className="bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        <span>Category</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                        {category}
                      </td>
                    </tr>

                    {/* The 9 Parameters in Exact Sequence */}
                    {CHEMICAL_PARAMETERS.map((param) => {
                      const rawVal = values[param.key];
                      const hasVal = rawVal !== '' && !isNaN(Number(rawVal));
                      return (
                        <tr key={param.key} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2 px-4 font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{param.symbol}</span>
                              <span className="text-[11px] text-slate-400">({param.label})</span>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right">
                            {hasVal ? (
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                                {rawVal} {param.unit}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Oxides (Σ) */}
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Total Oxides (Σ)</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900">
                        {currentSum.toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sample ID & Shift Info Pill */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sample Identifier: <strong>{sampleId || 'Sample-1'}</strong></span>
                </span>
                <span className="font-medium text-slate-600">Shift: {shift}</span>
              </div>

              {notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">Chemist Notes:</span>
                  <p className="text-slate-600 italic">{notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer with Two Buttons */}
            <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              {/* Button 1: Edit Data */}
              <button
                ref={editButtonRef}
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  reviewButtonRef.current?.focus();
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs disabled:opacity-60"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                <span>Edit Data</span>
              </button>

              {/* Button 2: Confirm & Submit */}
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-colors focus:ring-2 focus:ring-blue-600/30 focus:outline-none disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Saving Record to Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

