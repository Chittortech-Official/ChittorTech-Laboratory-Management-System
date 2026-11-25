'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Calendar, Edit3, Trash2, Download, Eye,
  RefreshCw, CheckCircle2, AlertTriangle, X, ChevronDown,
  ChevronLeft, ChevronRight, FileSpreadsheet, Beaker, History, ShieldAlert
} from 'lucide-react';
import { LaboratoryRecord, ChemicalParameterKey, AuditLogEntry } from '@/types';
import { CHEMICAL_PARAMETERS, PLANT_CATEGORIES, LAB_SHIFTS } from '@/lib/laboratory/constants';
import { generateSingleRecordPdf, exportToCsv, exportToExcel, buildExcelFilename, calculateOxideSum, formatDateDDMMYYYY } from '@/lib/laboratory/exportService';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';

interface PreviousRecordsProps {
  userId: string;
  userEmail: string;
  userName?: string;
  plantName?: string;
  onNavigateToNewEntry?: () => void;
}

export const PreviousRecords: React.FC<PreviousRecordsProps> = ({
  userId,
  userEmail,
  userName = 'QA Chemist',
  plantName = 'ChittorTech Materials QA Laboratory',
  onNavigateToNewEntry,
}) => {
  const { showSuccess, showError } = useConfirmationModal();
  const [records, setRecords] = useState<LaboratoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<LaboratoryRecord | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<LaboratoryRecord>>({});
  const [editReason, setEditReason] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // NABL Audit Trail Modal State
  const [auditTarget, setAuditTarget] = useState<{ recordId?: string; label: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditTableMissing, setAuditTableMissing] = useState(false);

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
        setError(data.error || 'Failed to fetch laboratory records.');
        return;
      }
      setRecords(data.records || []);
    } catch (err: any) {
      console.warn('Notice fetching records:', err?.message || err);
      setRecords([]);
      setError(err?.message || 'Error loading records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [userId, selectedMonth, selectedCategory]);

  // Filtered records by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) =>
      (r.sample_id || '').toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.test_date.includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (rec: LaboratoryRecord) => {
    setEditingRecord(rec);
    setEditFormData({ ...rec });
    setEditReason('');
    setEditError(null);
    setEditSuccess(null);
  };

  // Open NABL Audit Trail Modal
  const handleOpenAuditTrail = async (recordId?: string, label = 'All Laboratory Audit Logs') => {
    setAuditTarget({ recordId, label });
    setLoadingAudit(true);
    setAuditLogs([]);
    setAuditTableMissing(false);
    try {
      const url = recordId
        ? `/api/audit-logs?recordId=${encodeURIComponent(recordId)}`
        : `/api/audit-logs?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.tableMissing) {
        setAuditTableMissing(true);
      }
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!editReason || editReason.trim().length < 3) {
      setEditError('NABL Clause 7.5: Please enter a valid Reason for Change (minimum 3 characters).');
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch('/api/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecord.id,
          user_id: userId,
          reason: editReason.trim(),
          changed_by_name: userName,
          changed_by_email: userEmail,
          sample_id: editFormData.sample_id,
          test_date: editFormData.test_date,
          shift: editFormData.shift,
          category: editFormData.category,
          loi: editFormData.loi !== undefined && editFormData.loi !== null && String(editFormData.loi) !== '' ? Number(editFormData.loi) : null,
          ir: editFormData.ir !== undefined && editFormData.ir !== null && String(editFormData.ir) !== '' ? Number(editFormData.ir) : null,
          so3: editFormData.so3 !== undefined && editFormData.so3 !== null && String(editFormData.so3) !== '' ? Number(editFormData.so3) : null,
          lime: editFormData.lime !== undefined && editFormData.lime !== null && String(editFormData.lime) !== '' ? Number(editFormData.lime) : null,
          silica: editFormData.silica !== undefined && editFormData.silica !== null && String(editFormData.silica) !== '' ? Number(editFormData.silica) : null,
          alumina: editFormData.alumina !== undefined && editFormData.alumina !== null && String(editFormData.alumina) !== '' ? Number(editFormData.alumina) : null,
          iron: editFormData.iron !== undefined && editFormData.iron !== null && String(editFormData.iron) !== '' ? Number(editFormData.iron) : null,
          magnesia: editFormData.magnesia !== undefined && editFormData.magnesia !== null && String(editFormData.magnesia) !== '' ? Number(editFormData.magnesia) : null,
          chloride: editFormData.chloride !== undefined && editFormData.chloride !== null && String(editFormData.chloride) !== '' ? Number(editFormData.chloride) : null,
          notes: editFormData.notes || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update record.');
      }

      setEditSuccess('Record updated & logged in NABL audit trail.');
      showSuccess({
        type: 'update',
        title: 'Changes Saved & Audited',
        message: 'Your changes have been saved and permanently logged in the NABL Audit Trail.',
        description: `${editFormData.category || 'Lab Record'} • ${editFormData.sample_id || 'Sample'} (${formatDateDDMMYYYY(editFormData.test_date)})`,
      });

      setEditingRecord(null);
      setEditReason('');
      fetchRecords();
    } catch (err: any) {
      setEditError(err.message || 'Error updating record.');
      showError({
        title: 'Update Failed',
        message: err.message || 'Error updating record in database.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async (id: string) => {
    if (!deleteReason || deleteReason.trim().length < 3) {
      showError({
        title: 'Reason Required (NABL Clause 7.5)',
        message: 'Please provide a valid Reason for Deletion (minimum 3 characters).',
      });
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/records?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: deleteReason.trim(),
          changedByName: userName,
          changedByEmail: userEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete record.');
      }
      setDeletingId(null);
      setDeleteReason('');
      showSuccess({
        type: 'delete',
        title: 'Record Archived & Logged',
        message: 'Record removed from active list and permanently preserved in the NABL Audit Trail.',
      });
      fetchRecords();
    } catch (err: any) {
      showError({
        title: 'Deletion Failed',
        message: err.message || 'Error deleting record from database.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Download Single PDF
  const handleDownloadSinglePdf = (rec: LaboratoryRecord) => {
    generateSingleRecordPdf(rec, {
      userName,
      userEmail,
      plantName,
    });
    showSuccess({
      type: 'export',
      title: 'PDF Certificate Generated',
      message: 'Your file has been successfully generated.',
      description: `${rec.sample_id} Quality Report PDF`,
    });
  };

  // Quick Export
  const handleQuickCsv = () => {
    if (filteredRecords.length === 0) return;
    exportToCsv(filteredRecords, `ChittorTech_Lab_Records_${selectedMonth}`);
    showSuccess({
      type: 'export',
      title: 'CSV File Generated',
      message: 'Your file has been successfully generated.',
      description: `ChittorTech_Lab_Records_${selectedMonth}.csv (${filteredRecords.length} records)`,
    });
  };

  const handleQuickExcel = () => {
    if (filteredRecords.length === 0) return;
    const reportDate = filteredRecords[0]?.test_date || selectedMonth || new Date();
    const filename = buildExcelFilename(userName, reportDate);
    exportToExcel(filteredRecords, filename);
    showSuccess({
      type: 'export',
      title: 'Excel File Generated',
      message: 'Your file has been successfully generated.',
      description: `${filename}.xlsx (${filteredRecords.length} records)`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Beaker className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Previous Laboratory Records</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search, review, edit, and export historical chemical quality testing entries.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenAuditTrail(undefined, 'All Laboratory Audit Logs (NABL Clause 7.5)')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
            title="View Immutable NABL Audit Trail"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            Audit Trail
          </button>
          <button
            onClick={handleQuickCsv}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV
          </button>
          <button
            onClick={handleQuickExcel}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors disabled:opacity-50"
            title="Export filtered records to Excel (XLSX)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>
          {onNavigateToNewEntry && (
            <button
              onClick={onNavigateToNewEntry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
            >
              + New Entry
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sample ID, date, or notes..."
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Month Selector */}
        <div className="md:col-span-3 relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
          />
        </div>

        {/* Category Filter */}
        <div className="md:col-span-4 relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 appearance-none font-medium"
          >
            <option value="ALL">All Categories</option>
            {PLANT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Records Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading laboratory records...</p>
            <p className="text-xs text-slate-400 mt-1">Connecting to ChittorTech QA database node</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Unable to Load Records</h3>
            <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchRecords}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Beaker className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Laboratory Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No test entries matched "${searchQuery}". Try adjusting your search or filters.`
                : `No testing entries recorded for ${selectedCategory === 'ALL' ? 'selected month' : selectedCategory} (${selectedMonth}).`}
            </p>
            {onNavigateToNewEntry && (
              <button
                onClick={onNavigateToNewEntry}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
              >
                + Create First Test Entry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-slate-300">
            <table className="w-full min-w-[1150px] text-left border-collapse border border-slate-300 text-xs shadow-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider border-b-2 border-slate-800">
                  <th className="py-3.5 px-3.5 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Date &bull; Shift
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Sample ID
                  </th>
                  <th className="py-3.5 px-3 whitespace-nowrap border-r border-slate-700 bg-slate-900 text-slate-100 font-bold">
                    Category
                  </th>
                  {/* The 11 Chemical Parameters in Exact Sequence */}
                  {CHEMICAL_PARAMETERS.map((p) => (
                    <th
                      key={p.key}
                      className="py-2.5 px-3 text-right whitespace-nowrap border-r border-slate-700 bg-slate-900"
                      title={`${p.label} (${p.formula})`}
                    >
                      <span className="block text-[11px] font-black text-white tracking-wide">{p.symbol}</span>
                      <span className="block text-[9px] font-mono font-bold text-sky-300 uppercase tracking-wider">{p.formula}</span>
                    </th>
                  ))}
                  {/* Total Oxides Column */}
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap border-r border-slate-700 bg-emerald-950 text-emerald-100">
                    <span className="block text-[11px] font-black text-emerald-100">Total Σ</span>
                    <span className="block text-[9px] font-mono font-bold text-emerald-300 uppercase">Oxides</span>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap bg-slate-900 text-slate-100 font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {filteredRecords.map((r) => {
                  const total = calculateOxideSum(r);
                  return (
                    <tr
                      key={r.id}
                      className="odd:bg-white even:bg-slate-50 hover:bg-amber-50/50 transition-colors group"
                    >
                      {/* Date & Shift */}
                      <td className="py-3 px-3.5 whitespace-nowrap border-r border-b border-slate-200">
                        <div className="font-extrabold text-slate-950 text-xs font-mono">{formatDateDDMMYYYY(r.test_date)}</div>
                        <div className="text-[10px] text-slate-600 font-semibold bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded inline-block mt-0.5">
                          {r.shift || 'General'}
                        </div>
                      </td>

                      {/* Sample ID */}
                      <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200 font-mono text-xs font-bold text-blue-900">
                        <span className="bg-blue-50/90 text-blue-900 border border-blue-300/80 px-2 py-0.5 rounded-md inline-block font-mono font-bold">
                          {r.sample_id || 'Sample-1'}
                        </span>
                      </td>

                      {/* Plant Category */}
                      <td className="py-3 px-3 whitespace-nowrap border-r border-b border-slate-200">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-white shadow-2xs">
                          {r.category}
                        </span>
                      </td>

                      {/* 11 Chemical Parameter Values */}
                      {CHEMICAL_PARAMETERS.map((p) => {
                        const val = r[p.key as ChemicalParameterKey];
                        const isFilled = val !== null && val !== undefined && !isNaN(Number(val));
                        const decimals = p.decimals || (p.key === 'chloride' ? 4 : 2);
                        return (
                          <td
                            key={p.key}
                            className="py-3 px-3 text-right font-mono text-xs whitespace-nowrap border-r border-b border-slate-200"
                          >
                            {isFilled ? (
                              <span className="font-black text-slate-950 font-mono">
                                {Number(val).toFixed(decimals)}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic font-mono">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Oxides (Σ) */}
                      <td className="py-3 px-3.5 text-right font-mono text-xs font-black whitespace-nowrap border-r border-b border-slate-200 bg-emerald-50 text-emerald-950">
                        {total > 0 ? `${total.toFixed(2)}%` : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-200 bg-slate-50/30">
                        <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenAuditTrail(r.id, `Audit Trail: ${r.sample_id || 'Sample'} (${formatDateDDMMYYYY(r.test_date)})`)}
                            title="View NABL Audit Trail / Edit History"
                            className="p-1.5 text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadSinglePdf(r)}
                            title="Download Single Test PDF Report"
                            className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            title="Edit Test Record (Requires Reason)"
                            className="p-1.5 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingId(r.id);
                              setDeleteReason('');
                            }}
                            title="Archive / Delete Record (Requires Reason)"
                            className="p-1.5 text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && filteredRecords.length > 0 && (
          <div className="px-5 py-3 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
            <span>
              Showing <strong className="text-slate-900 font-extrabold">{filteredRecords.length}</strong> record{filteredRecords.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              ChittorTech QA &bull; Parameter Values in % (wt/wt) &bull; ASTM C150 / IS 269 Standard
            </span>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Chemical Test Record</h3>
                <p className="text-xs text-slate-500 font-mono">Sample ID: {editingRecord.sample_id} &bull; Date: {formatDateDDMMYYYY(editingRecord.test_date)}</p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* Top metadata grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Test Date
                    </label>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {formatDateDDMMYYYY(editFormData.test_date)}
                    </span>
                  </div>
                  <input
                    type="date"
                    required
                    value={editFormData.test_date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, test_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Format: <strong className="text-slate-800">{formatDateDDMMYYYY(editFormData.test_date)}</strong> (DD-MM-YYYY)
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Shift
                  </label>
                  <select
                    value={editFormData.shift || 'General'}
                    onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {LAB_SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={editFormData.category || 'Ball mill'}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {PLANT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 9 Chemical Parameters Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Chemical Analysis Parameters (% wt/wt)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {CHEMICAL_PARAMETERS.map((p) => {
                    const key = p.key as ChemicalParameterKey;
                    const val = editFormData[key];
                    return (
                      <div key={p.key} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-800">{p.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.formula}</span>
                        </div>
                        <input
                          type="number"
                          step={p.key === 'chloride' ? '0.0001' : '0.01'}
                          min="0"
                          max="100"
                          value={val !== null && val !== undefined ? val : ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            [key]: e.target.value === '' ? null : parseFloat(e.target.value)
                          })}
                          placeholder="-"
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-right"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Observations / Notes
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Optional observations..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* NABL ISO/IEC 17025 Mandatory Reason for Change */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    Reason for Change (Mandatory — NABL Clause 7.5) *
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Typo / Transcription correction',
                    'Re-test / Repeat analysis',
                    'Instrument recalibration adjustment',
                    'Sample ID / Shift correction',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditReason(preset)}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                        editReason === preset
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Specify exact reason for modifying this test record..."
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
                />
              </div>

              {/* Modal Actions - Sticky Bottom Footer */}
              <div className="sticky bottom-0 -mx-6 -mb-6 p-4 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end gap-2 shadow-xs">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || editReason.trim().length < 3}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving & Logging...
                    </>
                  ) : (
                    'Save & Log Change'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE CONFIRMATION MODAL (NABL Clause 7.5) */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-center text-slate-900">Archive / Delete Laboratory Record?</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Under NABL ISO/IEC 17025 Clause 7.5, this record will be preserved in the immutable Audit Trail with your name, timestamp, and reason.
            </p>
            <div className="mt-4 space-y-2 text-left">
              <label className="block text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Mandatory Reason for Deletion *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Duplicate entry', 'Wrong sample logged', 'Invalid / aborted test run'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeleteReason(preset)}
                    className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                      deleteReason === preset
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for archiving/deleting (min 3 chars)..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-rose-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setDeletingId(null);
                  setDeleteReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(deletingId)}
                disabled={isDeleting || deleteReason.trim().length < 3}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Archiving...' : 'Confirm & Log Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NABL IMMUTABLE AUDIT TRAIL MODAL */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{auditTarget.label}</h3>
                  <p className="text-[11px] text-slate-400">
                    NABL / ISO/IEC 17025 Clause 7.5 — Immutable Data Integrity Log
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditTarget(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
              {auditTableMissing && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Supabase Audit Table Migration Required</p>
                    <p className="mt-1 text-amber-800">
                      Execute <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">supabase/audit_logs_migration.sql</code> in your Supabase SQL Editor to activate permanent database audit logging.
                    </p>
                  </div>
                </div>
              )}

              {loadingAudit ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>Loading immutable audit history...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No audit history recorded yet.</p>
                  <p className="text-slate-400 mt-1">
                    All new entries, edits, and deletions will appear here with user identity, timestamp, and field diffs.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const dt = new Date(log.created_at);
                    const formattedTs = `${formatDateDDMMYYYY(dt.toISOString().split('T')[0])} ${dt.toLocaleTimeString('en-IN', { hour12: false })}`;
                    const actionBadge =
                      log.action === 'CREATE'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : log.action === 'UPDATE'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200';

                    return (
                      <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${actionBadge}`}>
                              {log.action}
                            </span>
                            {log.sample_id && (
                              <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                {log.sample_id}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">{formattedTs}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 font-semibold">Performed By:</span>{' '}
                            <span className="font-bold text-slate-800">{log.changed_by_name}</span>
                            {log.changed_by_email && (
                              <span className="text-slate-500 ml-1">({log.changed_by_email})</span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold">Reason:</span>{' '}
                            <span className="font-medium text-slate-800">{log.reason}</span>
                          </div>
                        </div>

                        {/* Field-by-field diff table for UPDATE */}
                        {log.action === 'UPDATE' && log.changed_fields && log.changed_fields.length > 0 && (
                          <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead className="bg-slate-100 text-slate-600 uppercase">
                                <tr>
                                  <th className="py-1.5 px-3 border-b border-slate-200">Field</th>
                                  <th className="py-1.5 px-3 border-b border-slate-200">Old Value</th>
                                  <th className="py-1.5 px-3 border-b border-slate-200">New Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {log.changed_fields.map((diff, idx) => (
                                  <tr key={idx} className="border-b last:border-b-0 border-slate-100">
                                    <td className="py-1.5 px-3 font-semibold text-slate-800">{diff.label}</td>
                                    <td className="py-1.5 px-3 font-mono text-rose-700 bg-rose-50/40">
                                      {diff.old_value !== null && diff.old_value !== undefined ? String(diff.old_value) : '-'}
                                    </td>
                                    <td className="py-1.5 px-3 font-mono text-emerald-700 bg-emerald-50/40 font-bold">
                                      {diff.new_value !== null && diff.new_value !== undefined ? String(diff.new_value) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Snapshot notice for DELETE */}
                        {log.action === 'DELETE' && log.old_values && (
                          <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 text-[11px] text-rose-900 font-mono">
                            Preserved Snapshot — Date: {formatDateDDMMYYYY(log.old_values.test_date)} | Category: {log.old_values.category} | CaO: {log.old_values.lime ?? '-'}% | SiO₂: {log.old_values.silica ?? '-'}% | SO₃: {log.old_values.so3 ?? '-'}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

