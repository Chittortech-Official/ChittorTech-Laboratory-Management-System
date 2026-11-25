'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitCompare, Calendar, RefreshCw, Trophy, ArrowRight, 
  Activity, Layers, AlertCircle, CheckCircle2, ChevronDown, 
  Info, TrendingUp, Sparkles, Scale
} from 'lucide-react';
import { LaboratoryRecord, ChemicalParameterKey } from '@/types';
import { CHEMICAL_PARAMETERS, PLANT_CATEGORIES } from '@/lib/laboratory/constants';
import { calculateBoguePhases } from '@/lib/laboratory/bogueEngine';
import { formatDateDDMMYYYY } from '@/lib/laboratory/exportService';

interface DualLineComparisonProps {
  userId: string;
}

export const DualLineComparison: React.FC<DualLineComparisonProps> = ({ userId }) => {
  const [records, setRecords] = useState<LaboratoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month selector
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Circuit Line Selectors
  const [lineA, setLineA] = useState<string>('Ball mill');
  const [lineB, setLineB] = useState<string>('VRM');
  const [selectedParam, setSelectedParam] = useState<ChemicalParameterKey>('so3');

  // Fetch all records
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/records?userId=${encodeURIComponent(userId)}`;
      if (selectedMonth) {
        url += `&month=${encodeURIComponent(selectedMonth)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setRecords([]);
        setError(data.error || 'Failed to fetch comparison records.');
        return;
      }
      setRecords(data.records || []);
    } catch (err: any) {
      console.warn('Comparison fetch notice:', err?.message || err);
      setRecords([]);
      setError(err?.message || 'Notice loading records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [userId, selectedMonth]);

  // Quick Presets (Mapped to exact 19 Plant Circuits)
  const applyPreset = (preset: 'mill_vs_vrm' | 'kf_vs_nkf' | 'clk_vs_g53') => {
    if (preset === 'mill_vs_vrm') {
      setLineA('Ball mill');
      setLineB('VRM');
      setSelectedParam('so3');
    } else if (preset === 'kf_vs_nkf') {
      setLineA('KF');
      setLineB('NKF');
      setSelectedParam('lime');
    } else if (preset === 'clk_vs_g53') {
      setLineA('CLK');
      setLineB('G53');
      setSelectedParam('so3');
    }
  };

  // Filter records for Line A and Line B
  const recordsA = useMemo(() => {
    return records
      .filter((r) => r.category === lineA || r.category?.toLowerCase() === lineA.toLowerCase())
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
  }, [records, lineA]);

  const recordsB = useMemo(() => {
    return records
      .filter((r) => r.category === lineB || r.category?.toLowerCase() === lineB.toLowerCase())
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
  }, [records, lineB]);

  // Compute parameter statistics for a line
  const computeStats = (lineRecords: LaboratoryRecord[], paramKey: ChemicalParameterKey) => {
    const valid = lineRecords
      .map((r) => r[paramKey])
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    if (valid.length === 0) {
      return { count: 0, mean: null, min: null, max: null, stdDev: null, cv: null };
    }

    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const variance = valid.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / valid.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0; // Coefficient of Variation %

    return { count: valid.length, mean, min, max, stdDev, cv };
  };

  const statsA = useMemo(() => computeStats(recordsA, selectedParam), [recordsA, selectedParam]);
  const statsB = useMemo(() => computeStats(recordsB, selectedParam), [recordsB, selectedParam]);

  // Consistency winner calculation (lower CV = higher stability; requires >= 2 samples on BOTH lines)
  const stabilityWinner = useMemo(() => {
    if (statsA.count < 2 || statsB.count < 2) return null;
    if (statsA.cv === null || statsB.cv === null) return null;
    if (statsA.cv < statsB.cv) return 'A';
    if (statsB.cv < statsA.cv) return 'B';
    return 'Tie';
  }, [statsA, statsB]);

  const [hoveredPoint, setHoveredPoint] = useState<{
    line: 'A' | 'B';
    lineName: string;
    date: string;
    sampleId?: string;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  // Dual SVG Overlay Trend Chart coordinates (plots sequential batches across dates)
  const svgChart = useMemo(() => {
    const validA = recordsA.filter((r) => r[selectedParam] !== null && r[selectedParam] !== undefined && !isNaN(Number(r[selectedParam])));
    const validB = recordsB.filter((r) => r[selectedParam] !== null && r[selectedParam] !== undefined && !isNaN(Number(r[selectedParam])));

    const allValues = [
      ...validA.map((r) => Number(r[selectedParam])),
      ...validB.map((r) => Number(r[selectedParam])),
    ];

    if (allValues.length === 0) return null;

    const width = 860;
    const height = 280;
    const padX = 56;
    const padTop = 28;
    const padBottom = 42;
    const plotW = width - padX * 2;
    const plotH = height - padTop - padBottom;

    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const rawRange = rawMax - rawMin;
    const margin = rawRange === 0 ? Math.max(Math.abs(rawMax) * 0.1, 0.5) : rawRange * 0.12;
    const minVal = Math.max(0, rawMin - margin);
    const maxVal = rawMax + margin;
    const rangeVal = maxVal - minVal || 1;

    const mapSeries = (series: LaboratoryRecord[]) => {
      const n = series.length;
      return series.map((r, idx) => {
        const val = Number(r[selectedParam]);
        const x = n === 1 ? padX + plotW / 2 : padX + (idx / (n - 1)) * plotW;
        const y = padTop + plotH - ((val - minVal) / rangeVal) * plotH;
        return { x, y, date: r.test_date, sampleId: r.sample_id, val };
      });
    };

    const pointsA = mapSeries(validA);
    const pointsB = mapSeries(validB);

    const pathA = pointsA.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
    const pathB = pointsB.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

    const areaA =
      pointsA.length > 1
        ? `${pathA} L ${pointsA[pointsA.length - 1].x} ${padTop + plotH} L ${pointsA[0].x} ${padTop + plotH} Z`
        : '';

    const meanAY =
      statsA.mean !== null
        ? padTop + plotH - ((statsA.mean - minVal) / rangeVal) * plotH
        : null;
    const meanBY =
      statsB.mean !== null
        ? padTop + plotH - ((statsB.mean - minVal) / rangeVal) * plotH
        : null;

    // Build X-axis labels from combined sorted points
    const combinedTimeline = [...pointsA, ...pointsB].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const xLabels =
      combinedTimeline.length <= 6
        ? combinedTimeline
        : [
            combinedTimeline[0],
            combinedTimeline[Math.floor(combinedTimeline.length / 2)],
            combinedTimeline[combinedTimeline.length - 1],
          ];

    return {
      width,
      height,
      padX,
      padTop,
      padBottom,
      plotW,
      plotH,
      pointsA,
      pointsB,
      pathA,
      pathB,
      areaA,
      meanAY,
      meanBY,
      minVal,
      maxVal,
      xLabels,
    };
  }, [recordsA, recordsB, selectedParam, statsA.mean, statsB.mean]);

  const activeParamMeta = CHEMICAL_PARAMETERS.find((p) => p.key === selectedParam) || CHEMICAL_PARAMETERS[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Scale className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Dual-Circuit Multi-Line Split Comparison</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Side-by-side consistency benchmarking (Ball mill vs VRM, KF vs NKF, CLK vs G53).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800 font-semibold"
            />
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Refresh comparison data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Comparison Presets
          </span>
          <span className="text-[11px] text-slate-400">1-click circuit alignment</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => applyPreset('mill_vs_vrm')}
            className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
              lineA === 'Ball mill' && lineB === 'VRM'
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold">Ball mill vs VRM</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Grinding consistency & gypsum dosage</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('kf_vs_nkf')}
            className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
              lineA === 'KF' && lineB === 'NKF'
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold">KF vs NKF (Kiln Feed)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Raw meal & kiln feed uniformity</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('clk_vs_g53')}
            className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
              lineA === 'CLK' && lineB === 'G53'
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold">CLK vs G53 (Clinker vs Cement)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Clinker to finished grade conversion</div>
          </button>
        </div>

        {/* Custom Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-blue-700 uppercase mb-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Circuit / Line A
            </label>
            <select
              value={lineA}
              onChange={(e) => setLineA(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800 font-semibold"
            >
              {PLANT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Circuit / Line B
            </label>
            <select
              value={lineB}
              onChange={(e) => setLineB(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800 font-semibold"
            >
              {PLANT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parameter Switching Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {CHEMICAL_PARAMETERS.map((p) => {
            const key = p.key as ChemicalParameterKey;
            const isSel = selectedParam === key;
            return (
              <button
                key={p.key}
                type="button"
                title={p.label}
                onClick={() => setSelectedParam(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* SIDE-BY-SIDE HEAD-TO-HEAD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Line A Card */}
        <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600">Circuit Line A</span>
                <h3 className="text-sm font-bold text-slate-900">{lineA}</h3>
              </div>
            </div>
            {stabilityWinner === 'A' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                Stability Leader
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Samples</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{statsA.count}</span>
            </div>
            <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/60">
              <span className="block text-[10px] text-blue-600 font-bold uppercase">Mean Value</span>
              <span className="text-base font-bold text-blue-900 font-mono mt-0.5 block">
                {statsA.mean !== null ? `${statsA.mean.toFixed(2)}%` : '-'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Std Dev (σ)</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {statsA.stdDev !== null ? `±${statsA.stdDev.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Variance (CV)</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {statsA.cv !== null ? `${statsA.cv.toFixed(1)}%` : '-'}
              </span>
            </div>
          </div>

          {statsA.count === 0 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-500 text-center">
              No records logged for <strong className="text-slate-700">{lineA}</strong> in {selectedMonth}.
            </div>
          )}
        </div>

        {/* Line B Card */}
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></span>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600">Circuit Line B</span>
                <h3 className="text-sm font-bold text-slate-900">{lineB}</h3>
              </div>
            </div>
            {stabilityWinner === 'B' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                Stability Leader
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Samples</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{statsB.count}</span>
            </div>
            <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/60">
              <span className="block text-[10px] text-emerald-600 font-bold uppercase">Mean Value</span>
              <span className="text-base font-bold text-emerald-900 font-mono mt-0.5 block">
                {statsB.mean !== null ? `${statsB.mean.toFixed(2)}%` : '-'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Std Dev (σ)</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {statsB.stdDev !== null ? `±${statsB.stdDev.toFixed(2)}` : '-'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Variance (CV)</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {statsB.cv !== null ? `${statsB.cv.toFixed(1)}%` : '-'}
              </span>
            </div>
          </div>

          {statsB.count === 0 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-500 text-center">
              No records logged for <strong className="text-slate-700">{lineB}</strong> in {selectedMonth}.
            </div>
          )}
        </div>
      </div>

      {/* DUAL TIMELINE GRAPH */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>{activeParamMeta.label} ({activeParamMeta.symbol}) Dual-Circuit Timeline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct comparison of daily oxide variations across both production lines.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-3 h-1 bg-blue-600 rounded-full"></span>
              {lineA}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-1 bg-emerald-600 rounded-full"></span>
              {lineB}
            </span>
          </div>
        </div>

        {/* SVG Dual-Line Overlay Trend Chart */}
        <div className="w-full bg-slate-50/70 rounded-xl p-4 border border-slate-100 overflow-hidden relative">
          {!svgChart ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No recorded batches for {lineA} or {lineB} in {selectedMonth} to plot trend.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              {/* Interactive Hover Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 min-h-[24px] px-1">
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  {statsA.mean !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 border-t-2 border-dashed border-blue-400" />
                      {lineA} Avg: <strong className="font-mono text-blue-700">{statsA.mean.toFixed(2)}%</strong>
                    </span>
                  )}
                  {statsB.mean !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 border-t-2 border-dashed border-emerald-400" />
                      {lineB} Avg: <strong className="font-mono text-emerald-700">{statsB.mean.toFixed(2)}%</strong>
                    </span>
                  )}
                </div>

                {hoveredPoint ? (
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-mono shadow-xs">
                    <span className={`w-2 h-2 rounded-full ${hoveredPoint.line === 'A' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                    <span className="font-bold">{hoveredPoint.lineName}</span>
                    <span className="text-slate-300">|</span>
                    <span>{hoveredPoint.sampleId || 'Sample'}</span>
                    <span className="text-slate-300">({formatDateDDMMYYYY(hoveredPoint.date)})</span>
                    <span className="font-bold text-amber-300">{hoveredPoint.val.toFixed(activeParamMeta.decimals || 2)}%</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">Hover over any data point to inspect batch drift</span>
                )}
              </div>

              <svg
                viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
                className="w-full min-w-[540px] h-64 overflow-visible"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="areaGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                <line x1={svgChart.padX} y1={svgChart.padTop} x2={svgChart.width - svgChart.padX} y2={svgChart.padTop} stroke="#e2e8f0" strokeDasharray="4 4" />
                <line x1={svgChart.padX} y1={svgChart.padTop + svgChart.plotH / 2} x2={svgChart.width - svgChart.padX} y2={svgChart.padTop + svgChart.plotH / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
                <line x1={svgChart.padX} y1={svgChart.padTop + svgChart.plotH} x2={svgChart.width - svgChart.padX} y2={svgChart.padTop + svgChart.plotH} stroke="#cbd5e1" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x={svgChart.padX - 8} y={svgChart.padTop + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {svgChart.maxVal.toFixed(2)}%
                </text>
                <text x={svgChart.padX - 8} y={svgChart.padTop + svgChart.plotH / 2 + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {((svgChart.maxVal + svgChart.minVal) / 2).toFixed(2)}%
                </text>
                <text x={svgChart.padX - 8} y={svgChart.padTop + svgChart.plotH + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {svgChart.minVal.toFixed(2)}%
                </text>

                {/* Mean Reference Lines */}
                {svgChart.meanAY !== null && (
                  <line
                    x1={svgChart.padX}
                    y1={svgChart.meanAY}
                    x2={svgChart.width - svgChart.padX}
                    y2={svgChart.meanAY}
                    stroke="#93c5fd"
                    strokeWidth="1.2"
                    strokeDasharray="6 4"
                  />
                )}
                {svgChart.meanBY !== null && (
                  <line
                    x1={svgChart.padX}
                    y1={svgChart.meanBY}
                    x2={svgChart.width - svgChart.padX}
                    y2={svgChart.meanBY}
                    stroke="#6ee7b7"
                    strokeWidth="1.2"
                    strokeDasharray="6 4"
                  />
                )}

                {/* Subtle Area under Line A */}
                {svgChart.areaA && <path d={svgChart.areaA} fill="url(#areaGradA)" />}

                {/* Path A (Blue) */}
                {svgChart.pathA && (
                  <path d={svgChart.pathA} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Path B (Emerald) */}
                {svgChart.pathB && (
                  <path d={svgChart.pathB} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* X-Axis Date Labels (DD-MM-YYYY) */}
                {svgChart.xLabels.map((lbl, idx) => (
                  <text
                    key={`xlabel-${idx}`}
                    x={lbl.x}
                    y={svgChart.padTop + svgChart.plotH + 20}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {formatDateDDMMYYYY(lbl.date)}
                  </text>
                ))}

                {/* Points A */}
                {svgChart.pointsA.map((pt, i) => (
                  <g
                    key={`A-${i}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        line: 'A',
                        lineName: lineA,
                        date: pt.date,
                        sampleId: pt.sampleId,
                        val: pt.val,
                        x: pt.x,
                        y: pt.y,
                      })
                    }
                  >
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                    <text x={pt.x} y={pt.y - 10} fill="#1e40af" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      {pt.val.toFixed(activeParamMeta.decimals || 2)}
                    </text>
                  </g>
                ))}

                {/* Points B */}
                {svgChart.pointsB.map((pt, i) => (
                  <g
                    key={`B-${i}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        line: 'B',
                        lineName: lineB,
                        date: pt.date,
                        sampleId: pt.sampleId,
                        val: pt.val,
                        x: pt.x,
                        y: pt.y,
                      })
                    }
                  >
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#059669" strokeWidth="2.5" />
                    <text x={pt.x} y={pt.y - 10} fill="#065f46" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      {pt.val.toFixed(activeParamMeta.decimals || 2)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* METALLURGICAL VERDICT */}
      <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 p-6 rounded-2xl border border-indigo-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Trophy className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-900">Process Engineering Stability Verdict</h3>
        </div>

        <div className="text-xs text-slate-700 leading-relaxed space-y-2">
          {statsA.count > 0 && statsB.count > 0 ? (
            <>
              <p>
                <strong>Comparative Analysis: </strong>
                {stabilityWinner === 'A' ? (
                  <span>
                    <strong className="text-blue-700">{lineA}</strong> demonstrates superior consistency with a lower coefficient of variation ({statsA.cv?.toFixed(1)}% vs {statsB.cv?.toFixed(1)}%).
                  </span>
                ) : stabilityWinner === 'B' ? (
                  <span>
                    <strong className="text-emerald-700">{lineB}</strong> demonstrates superior consistency with a lower coefficient of variation ({statsB.cv?.toFixed(1)}% vs {statsA.cv?.toFixed(1)}%).
                  </span>
                ) : (
                  <span>Both circuits exhibit virtually identical variance patterns.</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                Mean Delta (Line A − Line B):{' '}
                <strong className="font-mono text-slate-800">
                  {statsA.mean !== null && statsB.mean !== null
                    ? `${(statsA.mean - statsB.mean > 0 ? '+' : '')}${(statsA.mean - statsB.mean).toFixed(2)}%`
                    : 'N/A'}
                </strong>
                . Consistent mill circuits reduce clinker over-grinding and lower specific power consumption (kWh/t).
              </p>
            </>
          ) : (
            <p className="text-slate-400">
              Log testing entries for both {lineA} and {lineB} in {selectedMonth} to generate the comprehensive metallurgical stability verdict.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

