'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Mail,
  Phone,
  Building,
  Factory,
  Briefcase,
  MapPin,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { StateSelect } from '@/components/common/StateSelect';

interface RequestDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestDemoModal: React.FC<RequestDemoModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [plantName, setPlantName] = useState('');
  const [designation, setDesignation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    demoRequestId: string;
    emailSent: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setError(null);
    setSubmittedResult(null);
    setFullName('');
    setEmail('');
    setMobileNumber('');
    setCompanyName('');
    setPlantName('');
    setDesignation('');
    setCity('');
    setState('');
    setMessage('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (
      !fullName.trim() ||
      !email.trim() ||
      !mobileNumber.trim() ||
      !companyName.trim() ||
      !plantName.trim() ||
      !city.trim() ||
      !state.trim()
    ) {
      setError('Please complete all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid official email address.');
      return;
    }

    const digitsOnly = mobileNumber.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim(),
          companyName: companyName.trim(),
          plantName: plantName.trim(),
          designation: designation.trim(),
          city: city.trim(),
          state: state.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not submit demo request. Please try again.');
        return;
      }

      setSubmittedResult({
        demoRequestId: data.demoRequestId,
        emailSent: Boolean(data.emailSent),
      });
    } catch {
      setError('Network error while submitting demo request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-demo-title"
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#EAF3FF] border-b border-[#D6E8FF]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 id="request-demo-title" className="text-base sm:text-lg font-bold text-slate-900">
                Request a Product Demo
              </h2>
              <p className="text-xs text-slate-600">
                ChittorTech DG Database • QA Laboratory Management System
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close demo request modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/70 hover:text-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {submittedResult ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Demo Request Submitted
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Thank you, <strong>{fullName}</strong>. Your demo request has been saved and our team will contact you to arrange a demonstration.
              </p>
            </div>

            <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-[#F5F8FC] p-4 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Demo Request ID:</span>
                <span className="font-mono font-bold text-[#2563EB] bg-white px-2 py-0.5 rounded border border-blue-200">
                  {submittedResult.demoRequestId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Email Confirmation:</span>
                <span className={`font-semibold ${submittedResult.emailSent ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {submittedResult.emailSent
                    ? `Sent to ${email}`
                    : 'Saved in database (email delivery failed)'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. QC Manager / Lab Head"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Organization Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Shree Cement Ltd."
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plant Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Factory className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    placeholder="e.g. Chittorgarh Unit II"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Chittorgarh"
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State / Union Territory <span className="text-red-500">*</span>
                </label>
                <StateSelect
                  value={state}
                  onChange={setState}
                  placeholder="Select State / UT"
                  placement="auto"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message / Additional Requirements <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MessageSquare className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share preferred demo focus areas, number of labs, or questions..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Demo Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

