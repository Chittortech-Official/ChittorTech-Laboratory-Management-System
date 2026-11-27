'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  ArrowLeft,
  ArrowRight,
  Edit2,
} from 'lucide-react';
import gsap from 'gsap';
import { StateSelect } from '@/components/common/StateSelect';

interface RequestDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOTAL_STEPS = 8; // Steps 1..8, Step 9 = Final Review

export const RequestDemoModal: React.FC<RequestDemoModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

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

  const stepContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto-focus active input on step change
  useEffect(() => {
    if (!isOpen || submittedResult) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, [currentStep, isOpen, submittedResult]);

  // GSAP horizontal sliding animation matching RequestAccountForm
  useEffect(() => {
    if (!isOpen || !stepContainerRef.current) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const inX = direction === 'forward' ? 20 : -20;
    gsap.fromTo(
      stepContainerRef.current,
      { x: inX, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }
    );
  }, [currentStep, direction, isOpen]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setCurrentStep(1);
    setDirection('forward');
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

  const validateStep = (step: number): boolean => {
    setError(null);
    switch (step) {
      case 1:
        if (!fullName.trim() || fullName.trim().length < 2) {
          setError('Please enter your full name.');
          return false;
        }
        return true;
      case 2:
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setError('Please enter a valid official email address.');
          return false;
        }
        return true;
      case 3: {
        const digits = mobileNumber.replace(/[^0-9]/g, '');
        if (digits.length < 10 || digits.length > 15) {
          setError('Please enter a valid 10-digit mobile number.');
          return false;
        }
        return true;
      }
      case 4:
        if (!companyName.trim()) {
          setError('Please enter your company or organization name.');
          return false;
        }
        return true;
      case 5:
        if (!plantName.trim()) {
          setError('Please enter your plant or facility name.');
          return false;
        }
        return true;
      case 6:
        // Designation is optional
        return true;
      case 7:
        if (!city.trim()) {
          setError('Please enter your city.');
          return false;
        }
        if (!state.trim()) {
          setError('Please select your State / Union Territory.');
          return false;
        }
        return true;
      case 8:
        // Message is optional
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setDirection('forward');
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS + 1));
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 1) {
      resetAndClose();
      return;
    }
    setDirection('backward');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const jumpToStep = (step: number) => {
    setError(null);
    setDirection(step < currentStep ? 'backward' : 'forward');
    setCurrentStep(step);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && currentStep < 8) {
      // Allow Enter in StateSelect dropdown without jumping prematurely if needed,
      // or advance cleanly on text inputs
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'button') return;
      e.preventDefault();
      handleNext();
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setError(null);
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

  const progressPercent =
    currentStep <= TOTAL_STEPS ? Math.round((currentStep / TOTAL_STEPS) * 100) : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-demo-title"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
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

        {/* Success View */}
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
          <div className="p-5 sm:p-6 flex flex-col justify-between min-h-[340px]" onKeyDown={handleKeyDown}>
            {/* Step Progress Header */}
            <div className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {currentStep <= TOTAL_STEPS ? `Step ${currentStep} of ${TOTAL_STEPS}` : 'Final Review'}
                </span>
                <span className="text-[11px] font-semibold text-[#2563EB]">{progressPercent}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Animated Sliding Step Content */}
            <div className="py-5 flex-1 flex flex-col justify-center">
              <div ref={stepContainerRef} key={currentStep} className="space-y-3">
                {currentStep === 1 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">
                      What is your full name? <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500">Enter your name for the product demonstration.</p>
                    <div className="relative">
                      <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">
                      What is your official email address? <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500">We will send your demo confirmation and schedule here.</p>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="name@company.com"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">
                      What is your mobile number? <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500">Our team will coordinate your preferred demo slot.</p>
                    <div className="relative">
                      <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => {
                          setMobileNumber(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">
                      Company / Organization Name <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500">Enter the name of your industrial group or company.</p>
                    <div className="relative">
                      <Building className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="e.g. Shree Cement Ltd."
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">
                      Plant Name <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500">Specify the plant or QA laboratory unit.</p>
                    <div className="relative">
                      <Factory className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={plantName}
                        onChange={(e) => {
                          setPlantName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="e.g. Chittorgarh Unit II"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">
                      Your Designation <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <p className="text-xs text-slate-500">You can enter your role or press Continue to skip.</p>
                    <div className="relative">
                      <Briefcase className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. QC Manager / Lab Head"
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 7 && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-1">
                        Plant Location <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-slate-500 mb-2">Enter city and select your State / Union Territory.</p>
                      <div className="relative mb-3">
                        <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          type="text"
                          value={city}
                          onChange={(e) => {
                            setCity(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="City (e.g. Chittorgarh)"
                          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        />
                      </div>
                      <StateSelect
                        value={state}
                        onChange={(val) => {
                          setState(val);
                          if (error) setError(null);
                        }}
                        placeholder="Select State / Union Territory"
                        placement="auto"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 8 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-900">
                      Message / Additional Requirements <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <p className="text-xs text-slate-500">Share any specific workflows (XRF, Bogue, Coal, NABL audit) you want covered.</p>
                    <div className="relative">
                      <MessageSquare className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                      <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Optional message..."
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 9 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">Review Your Demo Request</h3>
                    <div className="rounded-lg border border-slate-200 bg-[#F5F8FC] p-3.5 text-xs space-y-2 max-h-60 overflow-y-auto">
                      {[
                        { label: 'Full Name', value: fullName, step: 1 },
                        { label: 'Official Email', value: email, step: 2 },
                        { label: 'Mobile Number', value: mobileNumber, step: 3 },
                        { label: 'Company', value: companyName, step: 4 },
                        { label: 'Plant Name', value: plantName, step: 5 },
                        { label: 'Designation', value: designation || 'Not specified', step: 6 },
                        { label: 'Location', value: `${city}, ${state}`, step: 7 },
                        { label: 'Message', value: message || 'None', step: 8 },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-200 last:border-b-0 last:pb-0">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">{item.label}</span>
                            <span className="font-semibold text-slate-800 break-words">{item.value}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => jumpToStep(item.step)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline font-semibold shrink-0"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Controls */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
              </button>

              {currentStep <= TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
