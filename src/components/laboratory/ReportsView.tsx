'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, FileSpreadsheet, Calendar, Filter, 
  CheckCircle2, AlertTriangle, RefreshCw, Layers, Printer, ShieldCheck
} from 'lucide-react';
import { LaboratoryRecord } from '@/types';
import { PLANT_CATEGORIES } from '@/lib/laboratory/constants';
import { 
  generateLaboratoryPdf, 
  exportToCsv, 
  exportToExcel 
} from '@/lib/laboratory/exportService';

interface ReportsViewProps {
  userId: string;
  userName?: string;
  userEmail?: string;
  plantName?: string;
}

type PeriodType = 'single_date' | 'current_month' | 'previous_month' | 'custom_range';

export const ReportsView: React.FC<ReportsViewProps> = ({
  userId,
  userName = 'QA Chemist',
  userEmail = 'chemist@plant.chittortech.in',
  plantName = 'ChittorTech Materials QA Laboratory',
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>('current_month');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [records, setRecords] = useState<LaboratoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Compute reporting period string
  const getReportingPeriodLabel = (): string => {
    if (periodType === 'single_date') return `Date: ${selectedDate}`;
    if (periodType === 'current_month') {
      const now = new Date();
      return now.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (periodType === 'previous_month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return `${startDate} to ${endDate}`;
  };

  // Fetch records matching criteria
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/records?userId=${encodeURIComponent(userId)}`;

      if (periodType === 'single_date') {
        url += `&startDate=${selectedDate}&endDate=${selectedDate}`;
      } else if (periodType === 'current_month') {
        const now = new Date();
        const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        url += `&month=${m}`;
      } else if (periodType === 'previous_month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        url += `&month=${m}`;
      } else {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      if (selectedCategory && selectedCategory !== 'ALL') {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch report data.');
      setRecords(data.records || []);
    } catch (err: any) {
      console.error('Report fetch error:', err);
      setError(err.message || 'Error fetching records for report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [userId, periodType, selectedDate, startDate, endDate, selectedCategory]);

  // Handle PDF Export
  const handleDownloadPdf = () => {
    if (records.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      generateLaboratoryPdf(records, {
        reportingPeriod: getReportingPeriodLabel(),
        category: selectedCategory === 'ALL' ? 'All Plant Categories' : selectedCategory,
        userName,
        userEmail,
        plantName,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Error generating PDF report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle CSV Export
  const handleDownloadCsv = () => {
    if (records.length === 0) return;
    const filename = `ChittorTech_QA_Report_${getReportingPeriodLabel().replace(/[^a-zA-Z0-9]/g, '_')}`;
    exportToCsv(records, filename);
  };

  // Handle Excel Export
  const handleDownloadExcel = () => {
    if (records.length === 0) return;
    const filename = `ChittorTech_QA_Report_${getReportingPeriodLabel().replace(/[^a-zA-Z0-9]/g, '_')}`;
    exportToExcel(records, filename);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Reports & Compliance Downloads</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate audit-ready PDF reports, CSV logs, and Excel spreadsheets for any reporting period.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Report Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-slate-900">1. Select Reporting Scope</h3>

        {/* Period Type Selection Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setPeriodType('current_month')}
            className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
              periodType === 'current_month'
                ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Current Month
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('previous_month')}
            className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
              periodType === 'previous_month'
                ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Previous Month
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('single_date')}
            className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
              periodType === 'single_date'
                ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Single Selected Date
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('custom_range')}
            className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
              periodType === 'custom_range'
                ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Custom Date Range
          </button>
        </div>

        {/* Dynamic Filters depending on selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {periodType === 'single_date' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Selected Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold"
              />
            </div>
          )}

          {periodType === 'custom_range' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Category Filter
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-semibold"
            >
              <option value="ALL">All Categories</option>
              {PLANT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Selection summary box */}
        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-500">Report Scope: </span>
            <strong className="text-slate-800">{getReportingPeriodLabel()}</strong>
            <span className="mx-2 text-slate-300">&bull;</span>
            <span className="text-slate-500">Category: </span>
            <strong className="text-slate-800">{selectedCategory}</strong>
          </div>
          <div>
            <span className="text-slate-500">Matching Records: </span>
            <strong className="text-blue-600 font-mono text-sm">{records.length}</strong>
          </div>
        </div>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PDF Download Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-400 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Printer className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Professional PDF Report</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Industrial standard A4 multi-page document with ChittorTech header, structured oxide tables, summary observations, and signature block.
            </p>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={records.length === 0 || isGeneratingPdf}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating A4 PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF Report ({records.length})
              </>
            )}
          </button>
        </div>

        {/* Excel XLSX Download Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-400 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Excel Spreadsheet (.xlsx)</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Native Microsoft Excel workbook with formatted headers, auto-calculated oxide columns, and clean plant metadata sheets.
            </p>
          </div>
          <button
            onClick={handleDownloadExcel}
            disabled={records.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download Excel Workbook
          </button>
        </div>

        {/* CSV Raw Data Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-400 transition-colors">
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Raw Data Export (.csv)</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Standard comma-separated value format compatible with ERP, LIMS, SAP, and statistical processing software.
            </p>
          </div>
          <button
            onClick={handleDownloadCsv}
            disabled={records.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download CSV Data
          </button>
        </div>
      </div>

      {/* Compliance / Audit Note */}
      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/70 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Audit-Ready Quality Assurance Standards</p>
          <p className="text-blue-700 text-[11px] leading-relaxed">
            All exported reports contain actual saved database values only, along with user attribution, creation timestamp, and unique report reference IDs. Reports never insert fabricated results.
          </p>
        </div>
      </div>
    </div>
  );
};

