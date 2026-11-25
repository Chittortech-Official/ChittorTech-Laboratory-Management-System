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
  const [lineA, setLineA] = useState<string>('Ball Mill - Line 1');
  const [lineB, setLineB] = useState<string>('Ball Mill - Line 2');
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

  // Quick Presets
  const applyPreset = (preset: 'mill1_vs_mill2' | 'raw_vs_clinker' | 'clinker_vs_cement') => {
    if (preset === 'mill1_vs_mill2') {
      setLineA('Ball Mill - Line 1');
      setLineB('Ball Mill - Line 2');
      setSelectedParam('so3');
    } else if (preset === 'raw_vs_clinker') {
      setLineA('Raw Mill Feed');
      setLineB('Kiln Clinker');
      setSelectedParam('lime');
    } else if (preset === 'clinker_vs_cement') {
      setLineA('Kiln Clinker');
      setLineB('Finished Cement (OPC)');
      setSelectedParam('so3');
    }
  };

  // Filter records for Line A and Line B
  const recordsA = useMemo(() => {
    return records
      .filter((r) => r.category === lineA || (lineA === 'Ball Mill' && r.category.includes('Ball Mill')))
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
  }, [records, lineA]);

  const recordsB = useMemo(() => {
    return records
      .filter((r) => r.category === lineB || (lineB === 'Ball Mill' && r.category.includes('Ball Mill')))
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

  // Consistency winner calculation (lower CV = higher stability)
  const stabilityWinner = useMemo(() => {
    if (statsA.cv === null && statsB.cv === null) return null;
    if (statsA.cv !== null && statsB.cv === null) return 'A';
    if (statsA.cv === null && statsB.cv !== null) return 'B';
    if (statsA.cv! < statsB.cv!) return 'A';
    if (statsB.cv! < statsA.cv!) return 'B';
    return 'Tie';
  }, [statsA, statsB]);

  // Dual SVG Timeline Chart coordinates
  const svgChart = useMemo(() => {
    // Combine unique dates
    const allDates = Array.from(new Set([...recordsA.map((r) => r.test_date), ...recordsB.map((r) => r.test_date)])).sort();
    if (allDates.length < 2) return null;

    const width = 800;
    const height = 260;
    const padX = 50;
    const padY = 30;

    const valuesA = recordsA.map((r) => r[selectedParam]).filter((v): v is number => v !== null && v !== undefined);
    const valuesB = recordsB.map((r) => r[selectedParam]).filter((v): v is number => v !== null && v !== undefined);
    const allValues = [...valuesA, ...valuesB];

    if (allValues.length === 0) return null;

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const rangeVal = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    // Helper to map points
    const makePoints = (recs: LaboratoryRecord[]) => {
      return recs
        .map((r) => {
          const val = r[selectedParam];
          if (val === null || val === undefined) return null;
          const dateIdx = allDates.indexOf(r.test_date);
          const x = padX + (dateIdx / (allDates.length - 1)) * (width - padX * 2);
          const y = height - padY - ((val - minVal) / rangeVal) * (height - padY * 2);
          return { x, y, date: r.test_date, sampleId: r.sample_id, val };
        })
        .filter(Boolean) as { x: number; y: number; date: string; sampleId?: string; val: number }[];
    };

    const pointsA = makePoints(recordsA);
    const pointsB = makePoints(recordsB);

    const pathA = pointsA.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
    const pathB = pointsB.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

    return { width, height, allDates, pointsA, pointsB, pathA, pathB, minVal, maxVal };
  }, [recordsA, recordsB, selectedParam]);

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
            Side-by-side consistency benchmarking (Ball Mill 1 vs Ball Mill 2, Raw Mix vs Clinker).
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
            onClick={() => applyPreset('mill1_vs_mill2')}
            className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
              lineA === 'Ball Mill - Line 1' && lineB === 'Ball Mill - Line 2'
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold">Ball Mill 1 vs Ball Mill 2</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Grinding consistency & gypsum dosage</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('raw_vs_clinker')}
            className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
              lineA === 'Raw Mill Feed' && lineB === 'Kiln Clinker'
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold">Raw Mix vs Kiln Clinker</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Calcination burning transformation</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('clinker_vs_cement')}
            className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
              lineA === 'Kiln Clinker' && lineB === 'Finished Cement (OPC)'
                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-bold">Clinker vs Finished Cement</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Gypsum regulatory absorption</div>
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
                onClick={() => setSelectedParam(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.symbol} ({p.formula})
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

        {/* SVG Dual Line Chart */}
        <div className="w-full bg-slate-50/70 rounded-xl p-4 border border-slate-100 overflow-hidden">
          {!svgChart ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Not enough recorded batches in {selectedMonth} to plot dual timeline for both circuits.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${svgChart.width} ${svgChart.height}`} className="w-full h-64 overflow-visible">
                {/* Horizontal grid lines */}
                <line x1="50" y1="30" x2={svgChart.width - 50} y2="30" stroke="#e2e8f0" strokeDasharray="4 4" />
                <line x1="50" y1={svgChart.height / 2} x2={svgChart.width - 50} y2={svgChart.height / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
                <line x1="50" y1={svgChart.height - 30} x2={svgChart.width - 50} y2={svgChart.height - 30} stroke="#e2e8f0" strokeDasharray="4 4" />

                {/* Y Axis Labels */}
                <text x="44" y="34" fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {svgChart.maxVal.toFixed(2)}%
                </text>
                <text x="44" y={svgChart.height / 2 + 3} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {((svgChart.maxVal + svgChart.minVal) / 2).toFixed(2)}%
                </text>
                <text x="44" y={svgChart.height - 27} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {svgChart.minVal.toFixed(2)}%
                </text>

                {/* Path A (Blue) */}
                {svgChart.pathA && (
                  <path d={svgChart.pathA} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                )}

                {/* Path B (Emerald) */}
                {svgChart.pathB && (
                  <path d={svgChart.pathB} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 0" />
                )}

                {/* Points A */}
                {svgChart.pointsA.map((pt, i) => (
                  <circle key={`A-${i}`} cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2">
                    <title>{`${lineA} [${pt.date}]: ${pt.val.toFixed(2)}%`}</title>
                  </circle>
                ))}

                {/* Points B */}
                {svgChart.pointsB.map((pt, i) => (
                  <circle key={`B-${i}`} cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#059669" strokeWidth="2">
                    <title>{`${lineB} [${pt.date}]: ${pt.val.toFixed(2)}%`}</title>
                  </circle>
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

