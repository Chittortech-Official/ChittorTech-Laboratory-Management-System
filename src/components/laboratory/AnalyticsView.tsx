'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, BarChart3, Calendar, 
  Filter, AlertCircle, RefreshCw, Layers, Award, Activity, 
  ChevronDown, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react';
import { LaboratoryRecord, ParameterAnalysis, ChemicalParameterKey } from '@/types';
import { CHEMICAL_PARAMETERS, PLANT_CATEGORIES } from '@/lib/laboratory/constants';
import { formatDateDDMMYYYY } from '@/lib/laboratory/exportService';

interface AnalyticsViewProps {
  userId: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ userId }) => {
  const [records, setRecords] = useState<LaboratoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedParameterKey, setSelectedParameterKey] = useState<ChemicalParameterKey>('loi');

  // Fetch records
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/records?userId=${encodeURIComponent(userId)}`;
      if (selectedMonth) {
        url += `&month=${encodeURIComponent(selectedMonth)}`;
      }
      if (selectedCategory && selectedCategory !== 'ALL') {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setRecords([]);
        setError(data.error || 'Failed to fetch analytics data.');
        return;
      }
      setRecords(data.records || []);
    } catch (err: any) {
      console.warn('Analytics fetch notice:', err?.message || err);
      setRecords([]);
      setError(err?.message || 'Notice loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [userId, selectedMonth, selectedCategory]);

  // Sort chronological for charts (oldest to newest)
  const chronologicalRecords = useMemo(() => {
    return [...records].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
  }, [records]);

  // Compute KPIs
  const kpis = useMemo(() => {
    const totalRecords = records.length;
    const uniqueDays = new Set(records.map((r) => r.test_date)).size;

    // Breakdown by category
    const categoryCount: Record<string, number> = {};
    records.forEach((r) => {
      categoryCount[r.category] = (categoryCount[r.category] || 0) + 1;
    });

    return {
      totalRecords,
      uniqueDays,
      categoryCount,
    };
  }, [records]);

  // Compute Parameter-Wise Analysis (Strict: NEVER treat missing values as zero!)
  const parameterStats = useMemo(() => {
    const stats: Record<ChemicalParameterKey, ParameterAnalysis> = {} as any;

    CHEMICAL_PARAMETERS.forEach((param) => {
      const key = param.key as ChemicalParameterKey;
      // Filter out null/undefined/empty readings:
      const validReadings = chronologicalRecords
        .map((r) => ({ date: r.test_date, val: r[key] }))
        .filter((item): item is { date: string; val: number } => item.val !== null && item.val !== undefined && !isNaN(item.val));

      const count = validReadings.length;

      if (count === 0) {
        stats[key] = {
          key,
          label: param.label,
          symbol: param.symbol,
          count: 0,
          min: null,
          max: null,
          avg: null,
          latest: null,
          change: null,
          stdDev: null,
        };
        return;
      }

      const values = validReadings.map((v) => v.val);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / count;
      const latest = values[values.length - 1];

      // Comparison: First half vs second half or previous point
      let change: number | null = null;
      if (values.length >= 2) {
        change = latest - values[values.length - 2];
      }

      // Standard Deviation (variance)
      const variance = values.reduce((acc, curr) => acc + Math.pow(curr - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      stats[key] = {
        key,
        label: param.label,
        symbol: param.symbol,
        count,
        min,
        max,
        avg,
        latest,
        change,
        stdDev,
      };
    });

    return stats;
  }, [chronologicalRecords]);

  // Active parameter details
  const activeParamMeta = useMemo(() => {
    return CHEMICAL_PARAMETERS.find((p) => p.key === selectedParameterKey) || CHEMICAL_PARAMETERS[0];
  }, [selectedParameterKey]);

  const activeParamStat = parameterStats[selectedParameterKey];

  // Chart data for selected parameter
  const chartData = useMemo(() => {
    return chronologicalRecords
      .map((r) => ({
        date: r.test_date,
        sampleId: r.sample_id || '-',
        val: r[selectedParameterKey],
      }))
      .filter((d): d is { date: string; sampleId: string; val: number } => d.val !== null && d.val !== undefined && !isNaN(d.val));
  }, [chronologicalRecords, selectedParameterKey]);

  // SVG Line Chart coordinates calculation
  const svgChart = useMemo(() => {
    if (chartData.length < 2) return null;

    const width = 800;
    const height = 260;
    const padX = 45;
    const padY = 30;

    const values = chartData.map((d) => d.val);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const rangeVal = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const points = chartData.map((d, i) => {
      const x = padX + (i / (chartData.length - 1)) * (width - padX * 2);
      const y = height - padY - ((d.val - minVal) / rangeVal) * (height - padY * 2);
      return { x, y, ...d };
    });

    const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

    return { width, height, points, pathD, areaD, minVal, maxVal };
  }, [chartData]);

  // Generate objective analytical insights
  const analyticalInsights = useMemo(() => {
    if (chronologicalRecords.length === 0) return [];

    const insights: { type: 'trend' | 'variance' | 'stability' | 'notice'; text: string }[] = [];

    // Analyze parameter stability vs variance
    CHEMICAL_PARAMETERS.forEach((p) => {
      const stat = parameterStats[p.key as ChemicalParameterKey];
      if (stat && stat.count >= 3 && stat.stdDev !== null && stat.avg !== null) {
        const cv = (stat.stdDev / stat.avg) * 100; // Coefficient of Variation %
        if (cv > 15) {
          insights.push({
            type: 'variance',
            text: `${p.label} (${p.symbol}) demonstrates high variation (Coefficient of Variation: ${cv.toFixed(1)}%, range: ${stat.min?.toFixed(2)}% - ${stat.max?.toFixed(2)}%). Consider checking kiln/mill operating consistency.`,
          });
        } else if (cv < 3) {
          insights.push({
            type: 'stability',
            text: `${p.label} (${p.symbol}) shows exceptionally high chemical stability across ${stat.count} logged batches (Std Dev: ±${stat.stdDev.toFixed(2)}%).`,
          });
        }
      }
    });

    // Recent trend insight
    if (activeParamStat && activeParamStat.change !== null) {
      if (Math.abs(activeParamStat.change) > 0.05) {
        const dir = activeParamStat.change > 0 ? 'increased' : 'decreased';
        insights.push({
          type: 'trend',
          text: `Latest reading for ${activeParamMeta.label} (${activeParamStat.latest?.toFixed(2)}%) ${dir} by ${Math.abs(activeParamStat.change).toFixed(2)}% compared with the immediately preceding test batch.`,
        });
      }
    }

    // Days coverage
    insights.push({
      type: 'notice',
      text: `Laboratory data coverage: ${kpis.uniqueDays} distinct production days recorded in ${selectedMonth} with ${kpis.totalRecords} logged test entries.`,
    });

    return insights;
  }, [chronologicalRecords, parameterStats, activeParamStat, activeParamMeta, kpis, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Laboratory Quality Analytics</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Statistical distribution, daily chemical oxide trends, and analytical observations.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Month selector */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold"
            />
          </div>

          {/* Category Selector */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold appearance-none"
            >
              <option value="ALL">All Categories</option>
              {PLANT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.totalRecords}</div>
            <span className="text-[11px] text-slate-500">Logged in {selectedMonth}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Days Tested */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Days Logged</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.uniqueDays}</div>
            <span className="text-[11px] text-slate-500">Distinct testing dates</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Primary Category Ratio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ball Mill Logs</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.categoryCount['Ball Mill'] || 0}
            </div>
            <span className="text-[11px] text-slate-500">Main grinding circuit</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Selected Parameter Latest */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Latest {activeParamMeta.symbol}
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {activeParamStat?.latest !== null && activeParamStat?.latest !== undefined
                ? `${activeParamStat.latest.toFixed(2)}%`
                : 'N/A'}
            </div>
            <span className="text-[11px] text-slate-500">
              Avg: {activeParamStat?.avg !== null && activeParamStat?.avg !== undefined ? `${activeParamStat.avg.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* PARAMETER SELECTION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {CHEMICAL_PARAMETERS.map((p) => {
            const key = p.key as ChemicalParameterKey;
            const stat = parameterStats[key];
            const isSelected = selectedParameterKey === key;
            return (
              <button
                key={p.key}
                onClick={() => setSelectedParameterKey(key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>{p.symbol}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {stat?.latest !== null && stat?.latest !== undefined ? `${stat.latest.toFixed(1)}%` : '-'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN GRAPH & PARAMETER OVERVIEW CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Trend Graph Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{activeParamMeta.label} ({activeParamMeta.symbol}) Daily Trend</span>
              <span className="text-xs font-mono font-normal text-slate-400">[{activeParamMeta.formula}]</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{activeParamMeta.description}</p>
          </div>

          {activeParamStat && activeParamStat.latest !== null && (
            <div className="flex items-center gap-2">
              {activeParamStat.change !== null && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  activeParamStat.change > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : activeParamStat.change < 0
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {activeParamStat.change > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : activeParamStat.change < 0 ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                  {activeParamStat.change > 0 ? '+' : ''}
                  {activeParamStat.change.toFixed(2)}% vs prior
                </span>
              )}
            </div>
          )}
        </div>

        {/* SVG Trend Line Chart */}
        <div className="w-full bg-slate-50/70 rounded-xl p-4 border border-slate-100 overflow-hidden">
          {chartData.length < 2 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              At least 2 saved data points required to render historical trend graph for {activeParamMeta.symbol}.
            </div>
          ) : svgChart ? (
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
                className="w-full h-64 overflow-visible"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide lines */}
                <line
                  x1="45"
                  y1="30"
                  x2={svgChart.width - 45}
                  y2="30"
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <line
                  x1="45"
                  y1={svgChart.height / 2}
                  x2={svgChart.width - 45}
                  y2={svgChart.height / 2}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <line
                  x1="45"
                  y1={svgChart.height - 30}
                  x2={svgChart.width - 45}
                  y2={svgChart.height - 30}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />

                {/* Y Axis Labels */}
                <text x="38" y="34" fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {svgChart.maxVal.toFixed(2)}%
                </text>
                <text x="38" y={svgChart.height / 2 + 3} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {((svgChart.maxVal + svgChart.minVal) / 2).toFixed(2)}%
                </text>
                <text x="38" y={svgChart.height - 27} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {svgChart.minVal.toFixed(2)}%
                </text>

                {/* Area under curve */}
                <path d={svgChart.areaD} fill="url(#areaGradient)" />

                {/* Main line */}
                <path
                  d={svgChart.pathD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {svgChart.points.map((pt, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      className="transition-all hover:r-6"
                    />
                    {/* Tooltip on hover */}
                    <title>
                      {`${formatDateDDMMYYYY(pt.date)} [${pt.sampleId}]: ${pt.val.toFixed(2)}%`}
                    </title>
                    {/* Date label at bottom for selected points */}
                    {(i === 0 || i === svgChart.points.length - 1 || i === Math.floor(svgChart.points.length / 2)) && (
                      <text
                        x={pt.x}
                        y={svgChart.height - 12}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {formatDateDDMMYYYY(pt.date).slice(0, 5)}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          ) : null}
        </div>

        {/* 6 Statistical Metrics for active parameter */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Readings</span>
            <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
              {activeParamStat?.count || 0}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Minimum Recorded</span>
            <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
              {activeParamStat?.min !== null && activeParamStat?.min !== undefined ? `${activeParamStat.min.toFixed(2)}%` : '-'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Maximum Recorded</span>
            <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
              {activeParamStat?.max !== null && activeParamStat?.max !== undefined ? `${activeParamStat.max.toFixed(2)}%` : '-'}
            </span>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
            <span className="block text-[10px] font-bold text-blue-600 uppercase">Average (Mean)</span>
            <span className="text-base font-bold text-blue-900 font-mono mt-0.5 block">
              {activeParamStat?.avg !== null && activeParamStat?.avg !== undefined ? `${activeParamStat.avg.toFixed(2)}%` : '-'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Latest Batch</span>
            <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
              {activeParamStat?.latest !== null && activeParamStat?.latest !== undefined ? `${activeParamStat.latest.toFixed(2)}%` : '-'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Std Deviation</span>
            <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
              {activeParamStat?.stdDev !== null && activeParamStat?.stdDev !== undefined ? `±${activeParamStat.stdDev.toFixed(2)}%` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* PARAMETER-WISE SUMMARY TABLE (All 9 Parameters) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Comprehensive 9-Parameter Chemical Summary ({selectedMonth})
          </h3>
          <span className="text-[11px] text-slate-400">
            Calculated strictly from valid saved database readings (missing values omitted from averages)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-3">Formula</th>
                <th className="py-3 px-3 text-right">Readings</th>
                <th className="py-3 px-3 text-right">Min (%)</th>
                <th className="py-3 px-3 text-right">Max (%)</th>
                <th className="py-3 px-3 text-right">Average (%)</th>
                <th className="py-3 px-3 text-right">Latest (%)</th>
                <th className="py-3 px-4 text-center">Stability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {CHEMICAL_PARAMETERS.map((p) => {
                const stat = parameterStats[p.key as ChemicalParameterKey];
                const count = stat?.count || 0;
                return (
                  <tr
                    key={p.key}
                    onClick={() => setSelectedParameterKey(p.key as ChemicalParameterKey)}
                    className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                      selectedParameterKey === p.key ? 'bg-blue-50/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      {p.label} ({p.symbol})
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{p.formula}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{count}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {stat?.min !== null && stat?.min !== undefined ? stat.min.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {stat?.max !== null && stat?.max !== undefined ? stat.max.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                      {stat?.avg !== null && stat?.avg !== undefined ? stat.avg.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {stat?.latest !== null && stat?.latest !== undefined ? stat.latest.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {count >= 2 && stat?.stdDev !== null && stat?.stdDev !== undefined ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          stat.stdDev < 0.2
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : stat.stdDev < 0.8
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          ±{stat.stdDev.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* OBJECTIVE ANALYTICAL INSIGHTS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <Info className="w-5 h-5" />
          </span>
          <h3 className="text-sm font-bold text-slate-900">Laboratory Quality Observations</h3>
        </div>

        {analyticalInsights.length === 0 ? (
          <p className="text-xs text-slate-400">
            No observations available. Log laboratory test entries to generate statistical insights.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analyticalInsights.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
          <strong>Note on Compliance:</strong> Quality observations above reflect mathematical and statistical variations calculated strictly from saved test batches. Pass/Fail declarations require authorized configuration of plant-specific BIS/ASTM specification limits.
        </div>
      </div>
    </div>
  );
};

