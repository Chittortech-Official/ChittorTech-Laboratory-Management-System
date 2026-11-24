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
} from 'lucide-react';
import { CHEMICAL_PARAMETERS, PLANT_CATEGORIES, LAB_SHIFTS } from '@/lib/laboratory/constants';
import { LaboratoryRecord, UserProfile } from '@/types';
import { calculateOxideSum } from '@/lib/laboratory/exportService';
import { calculateBoguePhases, BogueResult } from '@/lib/laboratory/bogueEngine';
import { Sparkles, Award, TrendingUp, Info } from 'lucide-react';

interface NewEntryFormProps {
  user: UserProfile | null;
  onRecordSaved: (record: LaboratoryRecord) => void;
}

export const NewEntryForm: React.FC<NewEntryFormProps> = ({ user, onRecordSaved }) => {
  const today = new Date().toISOString().split('T')[0];

  const [testDate, setTestDate] = useState<string>(today);
  const [category, setCategory] = useState<string>('Ball Mill');
  const [sampleId, setSampleId] = useState<string>('Sample-1');
  const [shift, setShift] = useState<'General' | 'Shift A' | 'Shift B' | 'Shift C'>('General');
  const [notes, setNotes] = useState<string>('');

  // The 9 Chemical Parameters
  const [values, setValues] = useState<Record<string, string>>({
    loi: '',
    ir: '',
    so3: '',
    lime: '',
    silica: '',
    alumina: '',
    iron: '',
    magnesia: '',
    chloride: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live sum calculation
  const currentSum = calculateOxideSum({
    loi: values.loi ? Number(values.loi) : null,
    ir: values.ir ? Number(values.ir) : null,
    so3: values.so3 ? Number(values.so3) : null,
    lime: values.lime ? Number(values.lime) : null,
    silica: values.silica ? Number(values.silica) : null,
    alumina: values.alumina ? Number(values.alumina) : null,
    iron: values.iron ? Number(values.iron) : null,
    magnesia: values.magnesia ? Number(values.magnesia) : null,
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
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
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
      lime: '',
      silica: '',
      alumina: '',
      iron: '',
      magnesia: '',
      chloride: '',
    });
    setNotes('');
    setSampleId('Sample-1');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to record laboratory tests.');
      return;
    }

    if (!testDate) {
      setError('Testing date is mandatory.');
      return;
    }

    // Check that at least one test parameter is filled
    const hasAnyValue = Object.values(values).some((v) => v.trim() !== '');
    if (!hasAnyValue) {
      setError('Please enter at least one test result parameter.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        user_id: user.id,
        test_date: testDate,
        category,
        sample_id: sampleId.trim() || 'Sample-1',
        shift,
        loi: values.loi !== '' ? Number(values.loi) : null,
        ir: values.ir !== '' ? Number(values.ir) : null,
        so3: values.so3 !== '' ? Number(values.so3) : null,
        lime: values.lime !== '' ? Number(values.lime) : null,
        silica: values.silica !== '' ? Number(values.silica) : null,
        alumina: values.alumina !== '' ? Number(values.alumina) : null,
        iron: values.iron !== '' ? Number(values.iron) : null,
        magnesia: values.magnesia !== '' ? Number(values.magnesia) : null,
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

      setSuccess(`Record for ${testDate} under "${category}" successfully logged into Supabase.`);
      onRecordSaved(data.record);
      // Auto increment sample ID for next quick entry
      const nextNum = parseInt(sampleId.replace(/\D/g, '') || '1', 10) + 1;
      setSampleId(`Sample-${nextNum}`);
      // Clear inputs for next entry
      setValues({
        loi: '',
        ir: '',
        so3: '',
        lime: '',
        silica: '',
        alumina: '',
        iron: '',
        magnesia: '',
        chloride: '',
      });
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Sampling Metadata (Date, Category, Sample ID, Shift) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>1. Sample & Section Identification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Field 1: Date (Calendar Picker) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Testing Date <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-subtle">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Field 2: Category (Ball Mill first & default) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Plant Category <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-subtle">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                >
                  {PLANT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field 3: Sample ID / Batch */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Sample Identification
              </label>
              <div className="relative rounded-md shadow-subtle">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  placeholder="e.g. Sample-1 / Batch-A"
                  className="block w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Field 4: Shift */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Plant Shift
              </label>
              <div className="relative rounded-md shadow-subtle">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="block w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                >
                  {LAB_SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
                    type="text"
                    inputMode="decimal"
                    value={values[param.key]}
                    onChange={(e) => handleFieldChange(param.key, e.target.value)}
                    placeholder={`e.g. ${param.key === 'chloride' ? '0.015' : '1.50'}`}
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

            {bogue.hasSufficientData && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Award className="w-3 h-3" />
                  {bogue.strengthProfile}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {bogue.sulfateResistance}
                </span>
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
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving to Database...' : 'Save QA Test Record'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

