'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  FileCheck2,
  Users,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  X,
  Loader2,
  ShieldCheck,
  FileSpreadsheet,
  Eye,
  Printer,
  Download,
} from 'lucide-react';
import { ExcelResourceImportModal } from './ExcelResourceImportModal';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';
import {
  exportResourcesToExcel,
  exportResourcesToPdf,
} from '@/lib/laboratory/resourceExportService';

type SubModule = 'equipment' | 'documents' | 'staff';

interface EquipmentItem {
  id: string;
  equipment_code: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  location?: string | null;
  last_calibration_date?: string | null;
  next_calibration_date?: string | null;
  calibration_agency?: string | null;
  certificate_no?: string | null;
  maintenance_notes?: string | null;
  status: 'Active' | 'Calibration Due' | 'Under Maintenance' | 'Out of Service';
}

interface DocumentItem {
  id: string;
  doc_code: string;
  title: string;
  category: 'SOP' | 'Quality Manual' | 'Test Method' | 'Work Instruction' | 'Form / Record';
  version: string;
  revision_number?: string | null;
  effective_date?: string | null;
  review_due_date?: string | null;
  prepared_by?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  standard_ref?: string | null;
  summary?: string | null;
  remarks?: string | null;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Obsolete';
}

interface StaffItem {
  id: string;
  staff_name: string;
  employee_id?: string | null;
  designation: string;
  qualified_tests: string;
  training_topic: string;
  training_date?: string | null;
  assessment_score?: string | null;
  competency_status: 'In Training' | 'Competent' | 'Re-evaluation Due';
  valid_until?: string | null;
  trainer_name?: string | null;
  certificate_ref?: string | null;
  approved_by?: string | null;
  notes?: string | null;
}

interface LaboratoryResourcesViewProps {
  userId: string;
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function parseNotePairs(raw?: string | null): Array<{ label: string; value: string }> {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/\s*\|\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const colonIdx = segment.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) {
        return {
          label: segment.slice(0, colonIdx).trim(),
          value: segment.slice(colonIdx + 1).trim(),
        };
      }
      return { label: 'Note', value: segment };
    })
    .filter((entry) => entry.value.length > 0);
}

export const LaboratoryResourcesView: React.FC<LaboratoryResourcesViewProps> = ({ userId }) => {
  const { showSuccess, showError } = useConfirmationModal();
  const [activeModule, setActiveModule] = useState<SubModule>('equipment');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    resource: SubModule;
    id: string;
    itemLabel: string;
    field: string;
    fromValue: string;
    toValue: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    resource: SubModule;
    id: string;
    itemLabel: string;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Equipment Form State
  const [eqForm, setEqForm] = useState({
    equipment_code: '',
    name: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    location: '',
    last_calibration_date: '',
    next_calibration_date: '',
    calibration_agency: '',
    certificate_no: '',
    maintenance_notes: '',
    status: 'Active' as EquipmentItem['status'],
  });

  // Document Form State
  const [docForm, setDocForm] = useState({
    doc_code: '',
    title: '',
    category: 'SOP' as DocumentItem['category'],
    version: '1.0',
    revision_number: 'Rev 00',
    effective_date: '',
    review_due_date: '',
    prepared_by: '',
    reviewed_by: '',
    approved_by: '',
    standard_ref: '',
    summary: '',
    remarks: '',
    status: 'Approved' as DocumentItem['status'],
  });

  // Staff Competency Form State
  const [staffForm, setStaffForm] = useState({
    staff_name: '',
    employee_id: '',
    designation: '',
    qualified_tests: '',
    training_topic: '',
    training_date: '',
    assessment_score: '',
    competency_status: 'Competent' as StaffItem['competency_status'],
    valid_until: '',
    trainer_name: '',
    certificate_ref: '',
    approved_by: '',
    notes: '',
  });

  const fetchResources = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/laboratory-resources?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMigrationRequired(Boolean(data.migrationRequired));
        setEquipment(data.equipment || []);
        setDocuments(data.documents || []);
        setStaff(data.staff || []);
      } else {
        setError(data.error || 'Could not load laboratory resources.');
      }
    } catch {
      setError('Network error while loading laboratory resources.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    let record: Record<string, any> = {};
    if (activeModule === 'equipment') {
      record = {
        ...eqForm,
        last_calibration_date: eqForm.last_calibration_date || null,
        next_calibration_date: eqForm.next_calibration_date || null,
      };
    } else if (activeModule === 'documents') {
      record = {
        ...docForm,
        effective_date: docForm.effective_date || null,
        review_due_date: docForm.review_due_date || null,
      };
    } else {
      record = {
        ...staffForm,
        training_date: staffForm.training_date || null,
        valid_until: staffForm.valid_until || null,
      };
    }

    try {
      const res = await fetch('/api/laboratory-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: activeModule, userId, record }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save record.');
        return;
      }

      setShowAddModal(false);
      setEqForm({
        equipment_code: '',
        name: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        location: '',
        last_calibration_date: '',
        next_calibration_date: '',
        calibration_agency: '',
        certificate_no: '',
        maintenance_notes: '',
        status: 'Active',
      });
      setDocForm({
        doc_code: '',
        title: '',
        category: 'SOP',
        version: '1.0',
        revision_number: 'Rev 00',
        effective_date: '',
        review_due_date: '',
        prepared_by: '',
        reviewed_by: '',
        approved_by: '',
        standard_ref: '',
        summary: '',
        remarks: '',
        status: 'Approved',
      });
      setStaffForm({
        staff_name: '',
        employee_id: '',
        designation: '',
        qualified_tests: '',
        training_topic: '',
        training_date: '',
        assessment_score: '',
        competency_status: 'Competent',
        valid_until: '',
        trainer_name: '',
        certificate_ref: '',
        approved_by: '',
        notes: '',
      });
      await fetchResources();
      showSuccess({
        type: 'create',
        title: 'Resource Record Added',
        message: 'Your laboratory resource record has been saved successfully.',
      });
    } catch {
      setError('Network error while saving record.');
    } finally {
      setSaving(false);
    }
  };

  const requestStatusChange = (
    resource: SubModule,
    id: string,
    itemLabel: string,
    field: string,
    fromValue: string,
    toValue: string
  ) => {
    if (!toValue || toValue === fromValue) return;
    setPendingStatusChange({ resource, id, itemLabel, field, fromValue, toValue });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange || confirmBusy) return;
    const change = pendingStatusChange;
    setConfirmBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/laboratory-resources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: change.resource,
          userId,
          id: change.id,
          updates: { [change.field]: change.toValue },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || 'Failed to update status.';
        setError(msg);
        showError({ title: 'Update Failed', message: msg });
        return;
      }
      setPendingStatusChange(null);
      await fetchResources();
      showSuccess({
        type: 'update',
        title: 'Status Updated',
        message: `${change.itemLabel} updated from ${change.fromValue} to ${change.toValue}.`,
      });
    } catch {
      setError('Network error while updating status.');
      showError({ title: 'Network Error', message: 'Network error while updating status.' });
    } finally {
      setConfirmBusy(false);
    }
  };

  const confirmDeleteRecord = async () => {
    if (!pendingDelete || confirmBusy) return;
    const delTarget = pendingDelete;
    setConfirmBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/laboratory-resources?resource=${delTarget.resource}&userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(delTarget.id)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || 'Failed to delete record.';
        setError(msg);
        showError({ title: 'Delete Failed', message: msg });
        return;
      }
      setPendingDelete(null);
      await fetchResources();
      showSuccess({
        type: 'delete',
        title: 'Record Deleted',
        message: `${delTarget.itemLabel} has been removed from Laboratory Resources.`,
      });
    } catch {
      setError('Network error while deleting record.');
      showError({ title: 'Network Error', message: 'Network error while deleting record.' });
    } finally {
      setConfirmBusy(false);
    }
  };

  const calDueCount = equipment.filter((item) => {
    const d = daysUntil(item.next_calibration_date);
    return item.status === 'Calibration Due' || (d !== null && d <= 30);
  }).length;

  const approvedDocsCount = documents.filter((d) => d.status === 'Approved').length;
  const competentStaffCount = staff.filter((s) => s.competency_status === 'Competent').length;

  const q = searchQuery.trim().toLowerCase();
  const filteredEquipment = equipment.filter(
    (item) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.equipment_code.toLowerCase().includes(q) ||
      (item.serial_number || '').toLowerCase().includes(q) ||
      (item.manufacturer || '').toLowerCase().includes(q) ||
      (item.model || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q) ||
      (item.calibration_agency || '').toLowerCase().includes(q) ||
      (item.maintenance_notes || '').toLowerCase().includes(q)
  );
  const filteredDocuments = documents.filter(
    (item) =>
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.doc_code.toLowerCase().includes(q) ||
      (item.standard_ref || '').toLowerCase().includes(q)
  );
  const filteredStaff = staff.filter(
    (item) =>
      !q ||
      item.staff_name.toLowerCase().includes(q) ||
      item.qualified_tests.toLowerCase().includes(q) ||
      item.training_topic.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#EAF3FF] border border-[#D6E8FF] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#2563EB]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#334155]">Laboratory Resources</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#CCFBF1] text-[#0F9D92]">
                ISO/IEC 17025 • NABL Ready
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Manage Equipment &amp; Calibration registers, Controlled SOPs &amp; Test Methods, and Staff Training &amp; Competency records.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchResources}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#334155] hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const count =
                activeModule === 'equipment'
                  ? filteredEquipment.length
                  : activeModule === 'documents'
                  ? filteredDocuments.length
                  : filteredStaff.length;
              if (count === 0) {
                showError({
                  title: 'No Records to Print',
                  message: 'Add or import records in this register before exporting to Excel.',
                });
                return;
              }
              const file = exportResourcesToExcel({
                module: activeModule,
                equipment: filteredEquipment,
                documents: filteredDocuments,
                staff: filteredStaff,
              });
              showSuccess({
                type: 'export',
                title: 'Excel Register Ready',
                message: `Exported ${count} records cleanly into ${file}.`,
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-xs font-semibold text-[#15803D] hover:bg-[#DCFCE7] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print in Excel</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const count =
                activeModule === 'equipment'
                  ? filteredEquipment.length
                  : activeModule === 'documents'
                  ? filteredDocuments.length
                  : filteredStaff.length;
              if (count === 0) {
                showError({
                  title: 'No Records to Print',
                  message: 'Add or import records in this register before generating a PDF.',
                });
                return;
              }
              const file = exportResourcesToPdf({
                module: activeModule,
                equipment: filteredEquipment,
                documents: filteredDocuments,
                staff: filteredStaff,
              });
              showSuccess({
                type: 'export',
                title: 'PDF Register Ready',
                message: `Generated landscape audit-ready register ${file}.`,
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#94A3B8] bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-100 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Print in PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#BFDBFE] bg-[#EAF3FF] text-xs font-semibold text-[#2563EB] hover:bg-[#D6E8FF] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] text-xs font-semibold text-white shadow-xs hover:bg-[#2563EB] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeModule === 'equipment'
                ? 'Add Equipment'
                : activeModule === 'documents'
                ? 'Add Document / SOP'
                : 'Add Training Record'}
            </span>
          </button>
        </div>
      </div>

      {/* Migration Notice if SQL not yet executed */}
      {migrationRequired && (
        <div className="rounded-xl border border-amber-200 bg-[#FEF3C7] p-4 flex items-start gap-3 text-xs text-[#B45309]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Database Migration Pending</p>
            <p className="mt-0.5">
              Run <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded">supabase/laboratory_resources_migration.sql</code> in your Supabase SQL Editor to persist Equipment, Documents, and Staff Competency records.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Equipment Register</p>
            <p className="text-2xl font-extrabold text-[#334155] mt-1">{equipment.length}</p>
            <p className="text-[11px] mt-1 text-[#64748B]">
              {calDueCount > 0 ? (
                <span className="text-[#B45309] font-semibold">{calDueCount} calibration due / ≤30d</span>
              ) : (
                <span className="text-[#15803D] font-semibold">All calibrations current</span>
              )}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] text-[#2563EB] flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Documents &amp; SOPs</p>
            <p className="text-2xl font-extrabold text-[#334155] mt-1">{documents.length}</p>
            <p className="text-[11px] mt-1 text-[#15803D] font-semibold">{approvedDocsCount} Approved &amp; Active</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0F9D92] flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Staff Competency</p>
            <p className="text-2xl font-extrabold text-[#334155] mt-1">{staff.length}</p>
            <p className="text-[11px] mt-1 text-[#15803D] font-semibold">{competentStaffCount} Qualified Personnel</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Module Switcher + Search */}
      <div className="bg-white rounded-2xl border-2 border-[#94A3B8] shadow-sm overflow-hidden">
        <div className="p-4 border-b-2 border-[#94A3B8] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F5F8FC]">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'equipment' as SubModule, label: 'Equipment & Calibration', icon: <Wrench className="w-4 h-4" /> },
              { id: 'documents' as SubModule, label: 'Documents & SOPs', icon: <FileCheck2 className="w-4 h-4" /> },
              { id: 'staff' as SubModule, label: 'Staff Training & Competency', icon: <Users className="w-4 h-4" /> },
            ].map((tab) => {
              const active = activeModule === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModule(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-[#D6E8FF] text-[#2563EB] ring-1 ring-[#3B82F6]/30'
                      : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#334155]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, name..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 py-2 text-xs text-[#334155] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
        </div>

        {/* Module 1: Equipment & Calibration */}
        {activeModule === 'equipment' && (
          <div className="overflow-x-auto">
            {filteredEquipment.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#64748B]">
                No equipment records logged yet. Click <strong>Add Equipment</strong> to register XRF, Blaine, Compression Testing Machine, or analytical balances.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse [&_th]:border-r [&_th]:border-[#94A3B8] [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-[#CBD5E1] [&_td:last-child]:border-r-0">
                <thead className="bg-[#DBEAFE] text-[#0F172A] border-b-2 border-[#94A3B8]">
                  <tr>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold whitespace-nowrap">Code</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold">Equipment &amp; Make</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold">Serial / Location</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold whitespace-nowrap">Last Cal.</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold whitespace-nowrap">Next Due</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold">Agency / Cert</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold">Technical Specs</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold">Status</th>
                    <th className="py-2.5 px-2.5 xl:px-3 font-bold text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#94A3B8]/80">
                  {filteredEquipment.map((item) => {
                    const remaining = daysUntil(item.next_calibration_date);
                    const specs = parseNotePairs(item.maintenance_notes);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 align-top">
                        <td className="py-2.5 px-2.5 xl:px-3 font-mono font-bold text-[#2563EB] whitespace-nowrap">{item.equipment_code}</td>
                        <td className="py-2.5 px-2.5 xl:px-3 min-w-[130px]">
                          <div className="font-semibold text-[#334155]">{item.name}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {[item.manufacturer, item.model].filter(Boolean).join(' • ') || '—'}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3 text-[#64748B] min-w-[110px]">
                          <div className="break-all">{item.serial_number || '—'}</div>
                          <div className="text-[11px]">{item.location || 'Main QA Lab'}</div>
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3 font-mono whitespace-nowrap">{item.last_calibration_date || '—'}</td>
                        <td className="py-2.5 px-2.5 xl:px-3 whitespace-nowrap">
                          <div className="font-mono">{item.next_calibration_date || '—'}</div>
                          {remaining !== null && (
                            <span
                              className={`text-[10px] font-semibold ${
                                remaining < 0
                                  ? 'text-red-600'
                                  : remaining <= 30
                                  ? 'text-[#B45309]'
                                  : 'text-[#15803D]'
                              }`}
                            >
                              {remaining < 0 ? `Overdue by ${Math.abs(remaining)}d` : `${remaining}d left`}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3 text-[#64748B]">
                          <div>{item.calibration_agency || '—'}</div>
                          <div className="text-[11px] font-mono">{item.certificate_no || ''}</div>
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3 min-w-[170px] max-w-[235px]">
                          {specs.length === 0 ? (
                            <span className="text-[#94A3B8]">—</span>
                          ) : (
                            <div className="space-y-1">
                              {specs.slice(0, 3).map((sp, i) => (
                                <div key={i} className="text-[11px] text-[#475569] leading-snug break-words">
                                  <span className="font-semibold text-[#1E293B]">{sp.label}:</span>{' '}
                                  <span>{sp.value}</span>
                                </div>
                              ))}
                              {specs.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedEquipment(item)}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#EAF3FF] border border-[#D6E8FF] px-2 py-0.5 text-[10px] font-bold text-[#2563EB] hover:bg-[#D6E8FF] transition-colors"
                                >
                                  +{specs.length - 3} more specs →
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3">
                          <select
                            value={item.status}
                            onChange={(e) =>
                              requestStatusChange(
                                'equipment',
                                item.id,
                                `${item.equipment_code} • ${item.name}`,
                                'status',
                                item.status,
                                e.target.value
                              )
                            }
                            className="rounded-lg border border-[#64748B] bg-white px-2 py-1 text-[11px] font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none max-w-[135px]"
                          >
                            <option value="Active">Active</option>
                            <option value="Calibration Due">Calibration Due</option>
                            <option value="Under Maintenance">Under Maintenance</option>
                            <option value="Out of Service">Out of Service</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedEquipment(item)}
                              className="p-1.5 rounded-lg text-[#2563EB] bg-[#EAF3FF]/80 hover:bg-[#D6E8FF] transition-colors"
                              title="View full equipment details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingDelete({
                                  resource: 'equipment',
                                  id: item.id,
                                  itemLabel: `${item.equipment_code} • ${item.name}`,
                                })
                              }
                              className="p-1.5 rounded-lg text-red-600 bg-red-50/80 hover:text-red-700 hover:bg-red-100 transition-colors"
                              title="Delete equipment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Module 2: Documents & SOPs */}
        {activeModule === 'documents' && (
          <div className="overflow-x-auto">
            {filteredDocuments.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#64748B]">
                No controlled documents or SOPs yet. Click <strong>Add Document / SOP</strong> to track ISO 17025 manuals, IS 4031 / ASTM C114 methods, and revision history.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse [&_th]:border-r [&_th]:border-[#94A3B8] [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-[#CBD5E1] [&_td:last-child]:border-r-0">
                <thead className="bg-[#DBEAFE] text-[#0F172A] border-b-2 border-[#94A3B8]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Doc Code</th>
                    <th className="py-3 px-4 font-bold">Title &amp; Standard Ref</th>
                    <th className="py-3 px-4 font-bold">Category</th>
                    <th className="py-3 px-4 font-bold">Version</th>
                    <th className="py-3 px-4 font-bold">Effective / Review Due</th>
                    <th className="py-3 px-4 font-bold">Approved By</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#94A3B8]/80">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-[#2563EB]">{doc.doc_code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#334155]">{doc.title}</div>
                        <div className="text-[11px] text-[#64748B]">{doc.standard_ref || doc.summary || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF3FF] text-[#2563EB]">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">v{doc.version}</td>
                      <td className="py-3 px-4 font-mono text-[#64748B]">
                        <div>{doc.effective_date || '—'}</div>
                        <div className="text-[11px]">Rev: {doc.review_due_date || '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-[#334155]">{doc.approved_by || '—'}</td>
                      <td className="py-3 px-4">
                        <select
                          value={doc.status}
                          onChange={(e) =>
                            requestStatusChange(
                              'documents',
                              doc.id,
                              `${doc.doc_code} • ${doc.title}`,
                              'status',
                              doc.status,
                              e.target.value
                            )
                          }
                          className="rounded-lg border border-[#64748B] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Approved">Approved</option>
                          <option value="Obsolete">Obsolete</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              resource: 'documents',
                              id: doc.id,
                              itemLabel: `${doc.doc_code} • ${doc.title}`,
                            })
                          }
                          className="p-1.5 rounded-lg text-red-600 bg-red-50/80 hover:text-red-700 hover:bg-red-100 transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Module 3: Staff Training & Competency */}
        {activeModule === 'staff' && (
          <div className="overflow-x-auto">
            {filteredStaff.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#64748B]">
                No staff competency records logged yet. Click <strong>Add Training Record</strong> to document analyst authorizations, training dates, and re-evaluation schedules.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse [&_th]:border-r [&_th]:border-[#94A3B8] [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-[#CBD5E1] [&_td:last-child]:border-r-0">
                <thead className="bg-[#DBEAFE] text-[#0F172A] border-b-2 border-[#94A3B8]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Staff &amp; Role</th>
                    <th className="py-3 px-4 font-bold">Qualified Tests</th>
                    <th className="py-3 px-4 font-bold">Training Topic</th>
                    <th className="py-3 px-4 font-bold">Date / Valid Until</th>
                    <th className="py-3 px-4 font-bold">Score / Trainer</th>
                    <th className="py-3 px-4 font-bold">Competency</th>
                    <th className="py-3 px-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#94A3B8]/80">
                  {filteredStaff.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#334155]">{person.staff_name}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {person.designation} {person.employee_id ? `• ${person.employee_id}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#334155]">{person.qualified_tests}</td>
                      <td className="py-3 px-4 text-[#64748B]">{person.training_topic}</td>
                      <td className="py-3 px-4 font-mono text-[#64748B]">
                        <div>{person.training_date || '—'}</div>
                        <div className="text-[11px]">Valid: {person.valid_until || '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        <div>{person.assessment_score || '—'}</div>
                        <div className="text-[11px]">{person.trainer_name || ''}</div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={person.competency_status}
                          onChange={(e) =>
                            requestStatusChange(
                              'staff',
                              person.id,
                              `${person.staff_name} (${person.designation})`,
                              'competency_status',
                              person.competency_status,
                              e.target.value
                            )
                          }
                          className="rounded-lg border border-[#64748B] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                        >
                          <option value="In Training">In Training</option>
                          <option value="Competent">Competent</option>
                          <option value="Re-evaluation Due">Re-evaluation Due</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              resource: 'staff',
                              id: person.id,
                              itemLabel: `${person.staff_name} (${person.designation})`,
                            })
                          }
                          className="p-1.5 rounded-lg text-red-600 bg-red-50/80 hover:text-red-700 hover:bg-red-100 transition-colors"
                          title="Delete training record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] !mt-0 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#EAF3FF] border-b border-[#D6E8FF]">
              <h3 className="text-base font-bold text-[#334155]">
                {activeModule === 'equipment'
                  ? 'Register Laboratory Equipment'
                  : activeModule === 'documents'
                  ? 'Add Controlled Document / SOP'
                  : 'Log Staff Training & Competency'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[#64748B] hover:bg-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-6 space-y-3.5 text-xs overflow-y-auto">
              {activeModule === 'equipment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Equipment Code *</label>
                    <input
                      required
                      value={eqForm.equipment_code}
                      onChange={(e) => setEqForm({ ...eqForm, equipment_code: e.target.value })}
                      placeholder="EQ-XRF-01"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Equipment Name *</label>
                    <input
                      required
                      value={eqForm.name}
                      onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })}
                      placeholder="XRF Spectrometer"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Manufacturer</label>
                    <input
                      value={eqForm.manufacturer}
                      onChange={(e) => setEqForm({ ...eqForm, manufacturer: e.target.value })}
                      placeholder="Malvern Panalytical"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Serial Number</label>
                    <input
                      value={eqForm.serial_number}
                      onChange={(e) => setEqForm({ ...eqForm, serial_number: e.target.value })}
                      placeholder="SN-84920"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Last Calibration Date</label>
                    <input
                      type="date"
                      value={eqForm.last_calibration_date}
                      onChange={(e) => setEqForm({ ...eqForm, last_calibration_date: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Next Calibration Due</label>
                    <input
                      type="date"
                      value={eqForm.next_calibration_date}
                      onChange={(e) => setEqForm({ ...eqForm, next_calibration_date: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Calibration Agency</label>
                    <input
                      value={eqForm.calibration_agency}
                      onChange={(e) => setEqForm({ ...eqForm, calibration_agency: e.target.value })}
                      placeholder="NABL Accredited Lab"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Certificate No.</label>
                    <input
                      value={eqForm.certificate_no}
                      onChange={(e) => setEqForm({ ...eqForm, certificate_no: e.target.value })}
                      placeholder="CAL-2026-104"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#334155] block mb-1">Maintenance History &amp; Remarks</label>
                    <textarea
                      rows={2}
                      value={eqForm.maintenance_notes}
                      onChange={(e) => setEqForm({ ...eqForm, maintenance_notes: e.target.value })}
                      placeholder="Manual maintenance log, servicing notes, or calibration remarks..."
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 resize-none"
                    />
                  </div>
                </div>
              )}

              {activeModule === 'documents' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Document ID *</label>
                    <input
                      required
                      value={docForm.doc_code}
                      onChange={(e) => setDocForm({ ...docForm, doc_code: e.target.value })}
                      placeholder="SOP-CHEM-01"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Category *</label>
                    <select
                      value={docForm.category}
                      onChange={(e) => setDocForm({ ...docForm, category: e.target.value as DocumentItem['category'] })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 bg-white"
                    >
                      <option value="SOP">SOP</option>
                      <option value="Quality Manual">Quality Manual</option>
                      <option value="Test Method">Test Method</option>
                      <option value="Work Instruction">Work Instruction</option>
                      <option value="Form / Record">Form / Record</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#334155] block mb-1">Document Title *</label>
                    <input
                      required
                      value={docForm.title}
                      onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                      placeholder="Determination of Free Lime & Chemical Oxides in Clinker"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Version *</label>
                    <input
                      required
                      value={docForm.version}
                      onChange={(e) => setDocForm({ ...docForm, version: e.target.value })}
                      placeholder="1.0"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Revision Number *</label>
                    <input
                      required
                      value={docForm.revision_number}
                      onChange={(e) => setDocForm({ ...docForm, revision_number: e.target.value })}
                      placeholder="Rev 00"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Effective Date</label>
                    <input
                      type="date"
                      value={docForm.effective_date}
                      onChange={(e) => setDocForm({ ...docForm, effective_date: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Review Date</label>
                    <input
                      type="date"
                      value={docForm.review_due_date}
                      onChange={(e) => setDocForm({ ...docForm, review_due_date: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Prepared By</label>
                    <input
                      value={docForm.prepared_by}
                      onChange={(e) => setDocForm({ ...docForm, prepared_by: e.target.value })}
                      placeholder="QA Engineer"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Reviewed By</label>
                    <input
                      value={docForm.reviewed_by}
                      onChange={(e) => setDocForm({ ...docForm, reviewed_by: e.target.value })}
                      placeholder="Lab Manager"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Approved By</label>
                    <input
                      value={docForm.approved_by}
                      onChange={(e) => setDocForm({ ...docForm, approved_by: e.target.value })}
                      placeholder="Quality Manager"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Standard Reference</label>
                    <input
                      value={docForm.standard_ref}
                      onChange={(e) => setDocForm({ ...docForm, standard_ref: e.target.value })}
                      placeholder="IS 4032 / ASTM C114"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#334155] block mb-1">SOP Details / Description</label>
                    <textarea
                      rows={3}
                      value={docForm.summary}
                      onChange={(e) => setDocForm({ ...docForm, summary: e.target.value })}
                      placeholder="Enter scope, procedure steps, or revision summary manually..."
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 resize-none"
                    />
                  </div>
                </div>
              )}

              {activeModule === 'staff' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Staff Name *</label>
                    <input
                      required
                      value={staffForm.staff_name}
                      onChange={(e) => setStaffForm({ ...staffForm, staff_name: e.target.value })}
                      placeholder="Amit Verma"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Employee ID</label>
                    <input
                      value={staffForm.employee_id}
                      onChange={(e) => setStaffForm({ ...staffForm, employee_id: e.target.value })}
                      placeholder="EMP-104"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Designation *</label>
                    <input
                      required
                      value={staffForm.designation}
                      onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                      placeholder="QC Chemist"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Trainer Name</label>
                    <input
                      value={staffForm.trainer_name}
                      onChange={(e) => setStaffForm({ ...staffForm, trainer_name: e.target.value })}
                      placeholder="Dr. R. K. Joshi"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#334155] block mb-1">Qualified Test Methods *</label>
                    <input
                      required
                      value={staffForm.qualified_tests}
                      onChange={(e) => setStaffForm({ ...staffForm, qualified_tests: e.target.value })}
                      placeholder="XRF Oxide Analysis, Blaine Fineness, Compressive Strength"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-[#334155] block mb-1">Training Topic *</label>
                    <input
                      required
                      value={staffForm.training_topic}
                      onChange={(e) => setStaffForm({ ...staffForm, training_topic: e.target.value })}
                      placeholder="ISO/IEC 17025:2017 Measurement Uncertainty & Calibration"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Training Date</label>
                    <input
                      type="date"
                      value={staffForm.training_date}
                      onChange={(e) => setStaffForm({ ...staffForm, training_date: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Valid Until</label>
                    <input
                      type="date"
                      value={staffForm.valid_until}
                      onChange={(e) => setStaffForm({ ...staffForm, valid_until: e.target.value })}
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Assessment Score / Result</label>
                    <input
                      value={staffForm.assessment_score}
                      onChange={(e) => setStaffForm({ ...staffForm, assessment_score: e.target.value })}
                      placeholder="92% (Passed)"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#334155] block mb-1">Certificate Ref. No. (Text)</label>
                    <input
                      value={staffForm.certificate_ref}
                      onChange={(e) => setStaffForm({ ...staffForm, certificate_ref: e.target.value })}
                      placeholder="TRN-17025-2026-09"
                      className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] font-semibold text-[#64748B] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] text-white font-semibold hover:bg-[#2563EB] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ExcelResourceImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        activeModule={activeModule}
        userId={userId}
        existingKeys={
          new Set(
            activeModule === 'equipment'
              ? equipment.map((e) => e.equipment_code.toLowerCase())
              : activeModule === 'documents'
              ? documents.map((d) => d.doc_code.toLowerCase())
              : staff.map((s) => s.staff_name.toLowerCase())
          )
        }
        onImported={fetchResources}
      />

      {/* Full Equipment Technical Specification & Calibration Modal */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-[100] !mt-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#EAF3FF] border-b border-[#D6E8FF]">
              <div>
                <span className="font-mono text-[11px] font-bold text-[#2563EB]">
                  {selectedEquipment.equipment_code}
                </span>
                <h3 className="text-base font-bold text-[#0F172A]">{selectedEquipment.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEquipment(null)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Manufacturer', value: selectedEquipment.manufacturer },
                  { label: 'Model', value: selectedEquipment.model },
                  { label: 'Serial Number', value: selectedEquipment.serial_number },
                  { label: 'Location', value: selectedEquipment.location },
                  { label: 'Last Calibration Date', value: selectedEquipment.last_calibration_date },
                  { label: 'Next Calibration Due', value: selectedEquipment.next_calibration_date },
                  { label: 'Calibration Agency', value: selectedEquipment.calibration_agency },
                  { label: 'Certificate No.', value: selectedEquipment.certificate_no },
                  { label: 'Status', value: selectedEquipment.status },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                      {f.label}
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A] mt-0.5 block">
                      {f.value || '—'}
                    </span>
                  </div>
                ))}
              </div>

              {parseNotePairs(selectedEquipment.maintenance_notes).length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                    Imported Technical Specifications &amp; Calibration Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {parseNotePairs(selectedEquipment.maintenance_notes).map((pair, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[#D6E8FF] bg-[#F5F9FF] px-3.5 py-2.5"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] block">
                          {pair.label}
                        </span>
                        <span className="text-xs font-medium text-[#0F172A] mt-0.5 block break-words">
                          {pair.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEquipment(null)}
                className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Status Update */}
      {pendingStatusChange && (
        <div className="fixed inset-0 z-[110] !mt-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-[#CBD5E1] bg-white shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 bg-[#EAF3FF] border-b border-[#D6E8FF] flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
                <AlertTriangle className="w-4 h-4 text-[#2563EB]" />
                <span>Confirm Status Change</span>
              </div>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setPendingStatusChange(null)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-[#334155]">
              <p className="leading-relaxed">
                Are you sure you want to change the status for{' '}
                <strong className="text-[#0F172A]">{pendingStatusChange.itemLabel}</strong>?
              </p>
              <div className="rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-3 flex items-center justify-center gap-2.5 font-semibold">
                <span className="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-[#475569]">
                  {pendingStatusChange.fromValue}
                </span>
                <span className="text-[#2563EB] font-bold">→</span>
                <span className="rounded-lg border border-[#BFDBFE] bg-[#EAF3FF] px-2.5 py-1 text-[#2563EB]">
                  {pendingStatusChange.toValue}
                </span>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={confirmBusy}
                  onClick={() => setPendingStatusChange(null)}
                  className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 font-semibold text-[#475569] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmBusy}
                  onClick={() => void confirmStatusChange()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {confirmBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm Change</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Delete */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[110] !mt-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white shadow-2xl overflow-hidden my-auto">
            <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-red-900">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Confirm Record Deletion</span>
              </div>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setPendingDelete(null)}
                className="text-red-500 hover:text-red-800 p-1 rounded-lg hover:bg-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-[#334155]">
              <p className="leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-[#0F172A]">{pendingDelete.itemLabel}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={confirmBusy}
                  onClick={() => setPendingDelete(null)}
                  className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 font-semibold text-[#475569] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmBusy}
                  onClick={() => void confirmDeleteRecord()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {confirmBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Delete Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
