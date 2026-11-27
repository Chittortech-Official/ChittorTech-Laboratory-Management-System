'use client';

import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Mail,
  Phone,
  Bug,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Shield,
} from 'lucide-react';
import {
  SupportIssueCategory,
  SupportPriority,
  SupportTicket,
  SupportTicketStatus,
  UserProfile,
} from '@/types';
import { formatDateDDMMYYYY } from '@/lib/laboratory/exportService';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const ISSUE_CATEGORIES: SupportIssueCategory[] = [
  'Bug / Technical Issue',
  'Website Glitch',
  'Login / Authentication Problem',
  'Data Entry Issue',
  'Calculation / Formula Issue',
  'Report / Export Issue',
  'Performance / Loading Issue',
  'Feature Request',
  'General Inquiry',
  'Other',
];

const APP_MODULES = [
  'Dashboard',
  'New Entry — Daily Excel Sheet (19 Categories)',
  'New Entry — Single Sample Entry',
  'Chemical Analysis',
  'Mechanical Analysis',
  'Coal Analysis',
  'Previous Records & Audit Trail',
  'Analytics',
  'Multi-Line Comparison',
  'Reports & Downloads (PDF / Excel / CSV)',
  'Login / Authentication',
  'Profile & Account Settings',
  'Other',
];

const PRIORITIES: SupportPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_OPTIONS: SupportTicketStatus[] = ['Open', 'In Progress', 'Awaiting User Response', 'Resolved', 'Closed'];

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({ isOpen, onClose, user }) => {
  const [activeView, setActiveView] = useState<'form' | 'my_tickets' | 'admin'>('form');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [issueCategory, setIssueCategory] = useState<SupportIssueCategory>('Bug / Technical Issue');
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedModule, setAffectedModule] = useState(APP_MODULES[1]);
  const [priority, setPriority] = useState<SupportPriority>('Medium');

  // Submission & Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedConfirmation, setSubmittedConfirmation] = useState<{
    ticket: SupportTicket;
    emailSent: boolean;
    emailError?: string | null;
  } | null>(null);

  // Tickets List State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsTableMissing, setTicketsTableMissing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Always lock & sync Full Name and Email from logged-in user
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
    }
  }, [isOpen, user]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  const fetchTickets = async () => {
    if (!user?.id) return;
    setLoadingTickets(true);
    try {
      const res = await fetch(
        `/api/support-tickets?userId=${encodeURIComponent(user.id)}&role=${encodeURIComponent(user.role || 'qa_engineer')}`
      );
      const data = await res.json();
      setTicketsTableMissing(Boolean(data.tableMissing));
      if (res.ok && data.tickets) {
        setTickets(data.tickets);
      }
    } catch {} finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen && (activeView === 'my_tickets' || activeView === 'admin')) {
      fetchTickets();
    }
  }, [isOpen, activeView]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    if (fullName.trim().length < 2) {
      setFormError('Please enter your Full Name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid Email Address.');
      return;
    }
    if (issueTitle.trim().length < 4) {
      setFormError('Please enter an Issue Title (minimum 4 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Please provide a Detailed Description (minimum 10 characters) explaining what happened and what you expected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 'anonymous',
          full_name: fullName.trim(),
          email: email.trim(),
          issue_category: issueCategory,
          issue_title: issueTitle.trim(),
          description: description.trim(),
          affected_module: affectedModule,
          priority,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.ticket) {
        throw new Error(data.error || 'Failed to submit support request.');
      }

      setSubmittedConfirmation({
        ticket: data.ticket,
        emailSent: Boolean(data.emailSent),
        emailError: data.emailError,
      });
      setIssueTitle('');
      setDescription('');
    } catch (err: any) {
      setFormError(err.message || 'Unable to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminStatusUpdate = async (id: string, status: SupportTicketStatus) => {
    if (!isAdmin) return;
    setUpdatingId(id);
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, role: user?.role }),
      });
      if (res.ok) {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeClass = (st: SupportTicketStatus) => {
    if (st === 'Resolved' || st === 'Closed') return 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';
    if (st === 'In Progress') return 'bg-[#EAF3FF] text-[#2563EB] border-[#D6E8FF]';
    if (st === 'Awaiting User Response') return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    return 'bg-[#F1F6FC] text-[#334155] border-[#E2E8F0]';
  };

  const visibleTickets = isAdmin && activeView === 'admin' ? tickets : tickets.filter((t) => t.user_id === user?.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#EAF3FF] text-[#2563EB] border border-[#D6E8FF]">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#334155]">ChittorTech Support &amp; Bug Reporting</h2>
              <p className="text-xs text-[#64748B]">Official Technical Assistance &amp; Issue Tracking Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#334155] hover:bg-[#F5F8FC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Official Contact Channels Strip */}
        <div className="px-6 py-3 bg-[#F1F6FC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="mailto:business@chittortech.in"
              className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
            >
              <Mail className="w-3.5 h-3.5" />
              business@chittortech.in
            </a>
            <a
              href="mailto:contact@chittortech.in"
              className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:underline"
            >
              <Mail className="w-3.5 h-3.5" />
              contact@chittortech.in
            </a>
            <a
              href="tel:+917597451057"
              className="inline-flex items-center gap-1.5 font-semibold text-[#0F9D92] hover:underline font-mono"
            >
              <Phone className="w-3.5 h-3.5" />
              +91 75974 51057
            </a>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="inline-flex bg-[#EAF3FF] p-1 rounded-xl border border-[#D6E8FF] gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveView('form');
                setSubmittedConfirmation(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeView === 'form' ? 'bg-[#D6E8FF] text-[#2563EB]' : 'text-[#64748B] hover:text-[#334155]'
              }`}
            >
              Report Issue
            </button>
            <button
              type="button"
              onClick={() => setActiveView('my_tickets')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeView === 'my_tickets' ? 'bg-[#D6E8FF] text-[#2563EB]' : 'text-[#64748B] hover:text-[#334155]'
              }`}
            >
              My Tickets
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView('admin')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                  activeView === 'admin' ? 'bg-[#CCFBF1] text-[#0F9D92]' : 'text-[#64748B] hover:text-[#334155]'
                }`}
              >
                <Shield className="w-3 h-3" />
                Manage All Tickets
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#F5F8FC] space-y-5">
          {/* VIEW 1: SUBMIT FORM OR CONFIRMATION */}
          {activeView === 'form' && (
            submittedConfirmation ? (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 text-center space-y-5 max-w-xl mx-auto shadow-2xs">
                <div className="w-14 h-14 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#334155]">
                    Your support request has been submitted successfully.
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1">
                    The ChittorTech support team will review your request and respond as soon as possible.
                  </p>
                </div>

                <div className="bg-[#F5F8FC] border border-[#E2E8F0] rounded-xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-semibold">Ticket ID:</span>
                    <span className="font-mono font-bold text-[#2563EB]">{submittedConfirmation.ticket.ticket_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-semibold">Issue Category:</span>
                    <span className="font-semibold text-[#334155]">{submittedConfirmation.ticket.issue_category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-semibold">Submitted At:</span>
                    <span className="font-mono text-[#334155]">
                      {formatDateDDMMYYYY(submittedConfirmation.ticket.created_at.split('T')[0])}{' '}
                      {new Date(submittedConfirmation.ticket.created_at).toLocaleTimeString('en-IN', { hour12: false })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B] font-semibold">Email Acknowledgement:</span>
                    <span className={`font-semibold ${submittedConfirmation.emailSent ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
                      {submittedConfirmation.emailSent
                        ? `Queued for ${submittedConfirmation.ticket.email}`
                        : 'Saved in database (SMTP not configured on server)'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmittedConfirmation(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#334155] bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl hover:bg-[#F5F8FC]"
                  >
                    Submit Another Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('my_tickets')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-xl"
                  >
                    View My Tickets
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="p-3 rounded-xl bg-[#EAF3FF] border border-[#D6E8FF] text-xs text-[#334155] flex items-start gap-2.5">
                  <Bug className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#2563EB]">Reporting a Bug or Glitch?</span> Include what steps you took, what actually happened, and what you expected to happen.
                  </div>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155]">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      {user && (
                        <span className="text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                          Locked (Logged-in User)
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      readOnly={Boolean(user)}
                      value={fullName}
                      onChange={(e) => {
                        if (!user) setFullName(e.target.value);
                      }}
                      placeholder="Your full name"
                      className={`w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs font-semibold focus:outline-none ${
                        user
                          ? 'bg-[#F1F6FC] text-[#475569] cursor-not-allowed'
                          : 'bg-[#FFFFFF] text-[#334155] focus:border-[#3B82F6]'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155]">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      {user && (
                        <span className="text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                          Verified Account
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      readOnly={Boolean(user)}
                      value={email}
                      onChange={(e) => {
                        if (!user) setEmail(e.target.value);
                      }}
                      placeholder="your.email@plant.in"
                      className={`w-full h-10 px-3 rounded-xl border border-[#E2E8F0] text-xs font-semibold focus:outline-none ${
                        user
                          ? 'bg-[#F1F6FC] text-[#475569] cursor-not-allowed'
                          : 'bg-[#FFFFFF] text-[#334155] focus:border-[#3B82F6]'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
                      Issue Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={issueCategory}
                      onChange={(e) => setIssueCategory(e.target.value as SupportIssueCategory)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#334155] focus:border-[#3B82F6] focus:outline-none"
                    >
                      {ISSUE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
                      Page / Module <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={affectedModule}
                      onChange={(e) => setAffectedModule(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#334155] focus:border-[#3B82F6] focus:outline-none"
                    >
                      {APP_MODULES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
                      Priority <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as SupportPriority)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#334155] focus:border-[#3B82F6] focus:outline-none"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
                    Issue Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="Short summary of the issue or inquiry (e.g. Excel export missing Free Lime column)"
                    className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#334155] focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#334155] mb-1">
                    Detailed Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe step-by-step what happened, what you expected to happen, and any error message displayed..."
                    className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-xs text-[#334155] focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-[#64748B] bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl hover:bg-[#F5F8FC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-xl shadow-2xs disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isSubmitting ? 'Submitting Ticket...' : 'Submit Support Request'}</span>
                  </button>
                </div>
              </form>
            )
          )}

          {/* VIEW 2 & 3: MY TICKETS / ADMIN TICKET MANAGEMENT */}
          {(activeView === 'my_tickets' || activeView === 'admin') && (
            <div className="space-y-3">
              {ticketsTableMissing && (
                <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#B45309]">
                  <strong>SQL Migration Required:</strong> Run <code className="font-mono bg-white px-1.5 py-0.5 rounded">supabase/support_tickets_migration.sql</code> in Supabase SQL Editor to store and view support tickets.
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#334155]">
                  {activeView === 'admin' ? 'All Organization Support Tickets (Admin)' : 'My Submitted Support Tickets'}
                </h3>
                <button
                  type="button"
                  onClick={fetchTickets}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl text-[#334155] hover:bg-[#EAF3FF]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin text-[#2563EB]' : ''}`} />
                  Refresh
                </button>
              </div>

              {loadingTickets ? (
                <div className="py-12 text-center text-xs text-[#64748B]">Loading support tickets...</div>
              ) : visibleTickets.length === 0 ? (
                <div className="py-12 text-center bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B]">
                  No support tickets found yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleTickets.map((t) => (
                    <div key={t.id} className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-4 space-y-2 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#2563EB] bg-[#EAF3FF] px-2 py-0.5 rounded border border-[#D6E8FF]">
                            {t.ticket_id}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusBadgeClass(t.status)}`}>
                            {t.status}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#F5F8FC] border border-[#E2E8F0] text-[#334155]">
                            {t.priority}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateDDMMYYYY(t.created_at.split('T')[0])}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-[#334155]">{t.issue_title}</h4>
                      <p className="text-xs text-[#64748B]">{t.description}</p>
                      <div className="text-[11px] text-[#64748B] flex flex-wrap gap-3 pt-1">
                        <span>Category: <strong className="text-[#334155]">{t.issue_category}</strong></span>
                        <span>Module: <strong className="text-[#334155]">{t.affected_module}</strong></span>
                        {activeView === 'admin' && (
                          <span>Reporter: <strong className="text-[#334155]">{t.full_name} ({t.email})</strong></span>
                        )}
                      </div>

                      {activeView === 'admin' && isAdmin && (
                        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                          <span className="text-[11px] font-semibold text-[#64748B]">Update Status:</span>
                          <select
                            value={t.status}
                            disabled={updatingId === t.id}
                            onChange={(e) => handleAdminStatusUpdate(t.id, e.target.value as SupportTicketStatus)}
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-[#E2E8F0] bg-[#F5F8FC] text-[#334155]"
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

