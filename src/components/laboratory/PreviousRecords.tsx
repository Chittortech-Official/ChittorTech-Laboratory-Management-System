'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Calendar, Edit3, Trash2, Download, Eye, 
  RefreshCw, CheckCircle2, AlertTriangle, X, ChevronDown, 
  ChevronLeft, ChevronRight, FileSpreadsheet, Beaker
} from 'lucide-react';
import { LaboratoryRecord, ChemicalParameterKey } from '@/types';
import { CHEMICAL_PARAMETERS, PLANT_CATEGORIES } from '@/lib/laboratory/constants';
import { generateSingleRecordPdf, exportToCsv, exportToExcel } from '@/lib/laboratory/exportService';

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
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setEditError(null);
    setEditSuccess(null);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch('/api/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecord.id,
          user_id: userId,
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

      setEditSuccess('Record updated successfully.');
      setTimeout(() => {
        setEditingRecord(null);
        fetchRecords();
      }, 1000);
    } catch (err: any) {
      setEditError(err.message || 'Error updating record.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/records?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete record.');
      }
      setDeletingId(null);
      fetchRecords();
    } catch (err: any) {
      alert(err.message || 'Error deleting record.');
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
  };

  // Quick Export
  const handleQuickCsv = () => {
    exportToCsv(filteredRecords, `ChittorTech_Lab_Records_${selectedMonth}`);
  };

  const handleQuickExcel = () => {
    exportToExcel(filteredRecords, `ChittorTech_Lab_Records_${selectedMonth}`);
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold tracking-wider uppercase text-[10px]">
                  <th className="py-3.5 px-4 whitespace-nowrap">Date / Shift</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Sample ID</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Category</th>
                  {/* Strict 9 parameters */}
                  {CHEMICAL_PARAMETERS.map((p) => (
                    <th key={p.key} className="py-3.5 px-2.5 text-right whitespace-nowrap" title={`${p.label} (${p.formula})`}>
                      <span className="text-slate-800">{p.symbol}</span>
                      <span className="block text-[8px] font-normal text-slate-400">{p.formula}</span>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{r.test_date}</div>
                      <div className="text-[10px] text-slate-400">{r.shift}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] font-medium text-blue-700">
                      {r.sample_id}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.category.includes('Ball Mill') 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : r.category.includes('Cement')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {r.category}
                      </span>
                    </td>

                    {/* 9 parameter values */}
                    {CHEMICAL_PARAMETERS.map((p) => {
                      const val = r[p.key as ChemicalParameterKey];
                      return (
                        <td key={p.key} className="py-3 px-2.5 text-right font-mono text-[11px] whitespace-nowrap">
                          {val !== null && val !== undefined ? (
                            <span className="text-slate-800 font-semibold">{val.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => handleDownloadSinglePdf(r)}
                          title="Download Single Test PDF Report"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          title="Edit Test Record"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(r.id)}
                          title="Delete Record"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && filteredRecords.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-700">{filteredRecords.length}</strong> record{filteredRecords.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] text-slate-400">
              ChittorTech QA &bull; Parameter Values in % (wt/wt)
            </span>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Chemical Test Record</h3>
                <p className="text-xs text-slate-500 font-mono">Sample ID: {editingRecord.sample_id}</p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
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
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Test Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.test_date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, test_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Shift
                  </label>
                  <select
                    value={editFormData.shift || 'Shift A'}
                    onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Shift A">Shift A (06:00 - 14:00)</option>
                    <option value="Shift B">Shift B (14:00 - 22:00)</option>
                    <option value="Shift C">Shift C (22:00 - 06:00)</option>
                    <option value="General">General Shift (09:00 - 17:30)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={editFormData.category || 'Ball Mill'}
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
                          step="0.01"
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

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-center text-slate-900">Delete Laboratory Record?</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              This action cannot be undone. The chemical analysis entry will be permanently removed from ChittorTech QA database.
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRecord(deletingId)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

