'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, Calendar, CheckCircle2, AlertTriangle, 
  Clock, Paperclip, FileText, User, ShieldCheck, RefreshCw, 
  History, ArrowRight, Eye
} from 'lucide-react';
import { LaboratoryRecord, EmailDispatchHistory } from '@/types';
import { PLANT_CATEGORIES } from '@/lib/laboratory/constants';
import { generateLaboratoryPdfBase64 } from '@/lib/laboratory/exportService';

interface EmailReportsViewProps {
  userId: string;
  userName?: string;
  userEmail?: string;
  plantName?: string;
}

type PeriodType = 'single_date' | 'current_month' | 'previous_month' | 'custom_range';

export const EmailReportsView: React.FC<EmailReportsViewProps> = ({
  userId,
  userName = 'QA Chemist',
  userEmail = 'chemist@plant.chittortech.in',
  plantName = 'ChittorTech Materials QA Laboratory',
}) => {
  // Email Form State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Report Period Selection
  const [periodType, setPeriodType] = useState<PeriodType>('current_month');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Matching records state
  const [records, setRecords] = useState<LaboratoryRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Dispatch state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Email sending history (stored in localStorage for persistence)
  const [history, setHistory] = useState<EmailDispatchHistory[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`chittortech_email_history_${userId}`);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load email history from storage', e);
    }
  }, [userId]);

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

  // Fetch records for preview
  const fetchMatchingRecords = async () => {
    setLoadingRecords(true);
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
      if (res.ok) {
        setRecords(data.records || []);
      }
    } catch (err: any) {
      console.warn('Notice fetching records for email report:', err?.message || err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchMatchingRecords();
  }, [userId, periodType, selectedDate, startDate, endDate, selectedCategory]);

  // Handle Send Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccess(null);
    setSendError(null);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      setSendError('Please enter a valid recipient email address.');
      return;
    }

    if (records.length === 0) {
      setSendError('No laboratory records found for the selected reporting period. Cannot send empty report.');
      return;
    }

    setIsSending(true);

    try {
      const periodLabel = getReportingPeriodLabel();
      const catLabel = selectedCategory === 'ALL' ? 'All Plant Categories' : selectedCategory;

      // 1. Generate PDF client-side as base64 string
      const pdfBase64 = generateLaboratoryPdfBase64(records, {
        reportingPeriod: periodLabel,
        category: catLabel,
        userName,
        userEmail,
        plantName,
      });

      // 2. Dispatch via server API route (SMTP GoDaddy contact@chittortech.in)
      const res = await fetch('/api/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          subject: subject.trim() || undefined,
          message: message.trim() || undefined,
          reportingPeriod: periodLabel,
          category: catLabel,
          pdfBase64,
          recordCount: records.length,
          senderName: userName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch email.');
      }

      // Add to local audit history
      const newHistoryItem: EmailDispatchHistory = {
        id: `DISP-${Date.now()}`,
        recipient: recipientEmail,
        subject: subject.trim() || `ChittorTech QA Laboratory Report - ${periodLabel}`,
        reportPeriod: periodLabel,
        recordCount: records.length,
        dispatchedAt: new Date().toLocaleString(),
        status: 'SENT',
      };

      const updatedHistory = [newHistoryItem, ...history.slice(0, 19)];
      setHistory(updatedHistory);
      try {
        localStorage.setItem(`chittortech_email_history_${userId}`, JSON.stringify(updatedHistory));
      } catch (e) {
        // ignore
      }

      setSendSuccess(`Laboratory report successfully emailed to ${recipientEmail} with PDF attachment!`);
      setRecipientEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error('Email send error:', err);
      setSendError(err.message || 'Error dispatching email report.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Mail className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Direct Email Report Dispatch</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Securely send official chemical quality reports with attached A4 PDF directly to plant managers, clients, or auditors.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            GoDaddy Corporate SMTP Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Email Composition & Scope (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            Compose & Dispatch Report
          </h3>

          {sendSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{sendSuccess}</span>
            </div>
          )}

          {sendError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          <form onSubmit={handleSendEmail} className="space-y-4">
            {/* Recipient Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Recipient Email Address *
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. manager@cementplant.com, auditor@bis.gov.in"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reporting Scope *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPeriodType('current_month')}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                    periodType === 'current_month'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('previous_month')}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                    periodType === 'previous_month'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Previous Month
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('single_date')}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                    periodType === 'single_date'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Single Date
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('custom_range')}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                    periodType === 'custom_range'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {/* Date Specific Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {periodType === 'single_date' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800"
                  />
                </div>
              )}

              {periodType === 'custom_range' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800"
                    />
                  </div>
                </>
              )}

              <div className={periodType === 'single_date' ? '' : 'sm:col-span-2'}>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800 font-semibold"
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

            {/* Optional Subject */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Subject <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`ChittorTech QA Laboratory Report - ${getReportingPeriodLabel()}`}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            </div>

            {/* Optional Custom Message */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Custom Message / Cover Note <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add special instructions, plant remarks, or recipient greetings..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            </div>

            {/* Attachment preview note */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/60 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span>
                  Attached: <strong>ChittorTech_QA_Report.pdf</strong> ({records.length} records)
                </span>
              </div>
              <span className="text-[11px] text-blue-600 font-semibold">A4 Industrial Layout</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSending || records.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating PDF & Dispatching via SMTP...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Dispatch Report to Recipient
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Panel: Report Live Preview & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Report Live Preview Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-500" />
              Live Report Attachment Preview
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Period:</span>
                <span className="font-bold text-slate-800">{getReportingPeriodLabel()}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-800">{selectedCategory}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Batch Records:</span>
                <span className="font-mono font-bold text-blue-600">{records.length} entries</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sender:</span>
                <span className="font-medium text-slate-700">{userName} ({userEmail})</span>
              </div>
            </div>

            {records.length === 0 && !loadingRecords && (
              <p className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                No saved chemical entries match this period. Add entries or pick a different date range.
              </p>
            )}
          </div>

          {/* Email Dispatch History */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Dispatch Audit Log
              </h3>
              <span className="text-[10px] text-slate-400">{history.length} logged</span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No email reports dispatched yet during this session.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-1 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate max-w-[180px]">{item.recipient}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        SENT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{item.subject}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{item.reportPeriod} ({item.recordCount} records)</span>
                      <span>{item.dispatchedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

