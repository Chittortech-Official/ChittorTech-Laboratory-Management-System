'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Factory,
  Mail,
  User,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle2,
  Check,
  Edit2,
  Send,
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '@/contexts/AuthContext';
import { AuthMode, AccountRequestPayload } from '@/types';
import { StateSelect } from '@/components/common/StateSelect';

interface RequestAccountFormProps {
  onSwitchMode: (mode: AuthMode) => void;
}

const TOTAL_QUESTION_STEPS = 8; // Steps 1 to 8, followed by Step 9 (Review)

export const RequestAccountForm: React.FC<RequestAccountFormProps> = ({ onSwitchMode }) => {
  const { submitAccountRequest } = useAuth();

  // Current active step (1 to 9)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Complete persistent form data
  const [formData, setFormData] = useState<AccountRequestPayload>({
    fullName: '',
    workEmail: '',
    companyName: '',
    plantName: '',
    designation: '',
    phone: '',
    city: '',
    state: '',
    reason: '',
  });

  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);

  const stepContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto-focus input on step change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentStep]);

  // Step entrance animation on step change
  useEffect(() => {
    if (!stepContainerRef.current) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const inX = direction === 'forward' ? 18 : -18;
    gsap.fromTo(
      stepContainerRef.current,
      { x: inX, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }
    );
  }, [currentStep, direction]);

  const updateField = (field: keyof AccountRequestPayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (stepError) setStepError(null);
  };

  // Validate only the current active step
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.fullName.trim()) {
          setStepError('Please enter your full legal or professional name.');
          return false;
        }
        if (formData.fullName.trim().length < 3) {
          setStepError('Full name should be at least 3 characters.');
          return false;
        }
        break;
      case 2:
        if (!formData.workEmail.trim()) {
          setStepError('Please provide your corporate or plant work email.');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail.trim())) {
          setStepError('Please enter a valid work email address (e.g., name@company.com).');
          return false;
        }
        break;
      case 3:
        if (!formData.companyName.trim()) {
          setStepError('Please enter your enterprise or company name.');
          return false;
        }
        break;
      case 4:
        if (!formData.plantName.trim()) {
          setStepError('Please enter your specific plant or testing facility name.');
          return false;
        }
        break;
      case 5:
        if (!formData.designation.trim()) {
          setStepError('Please provide your job title or operational designation.');
          return false;
        }
        break;
      case 6:
        if (!formData.phone.trim()) {
          setStepError('Please enter your primary contact number.');
          return false;
        }
        if (formData.phone.replace(/[^0-9]/g, '').length < 8) {
          setStepError('Please enter a valid contact phone number.');
          return false;
        }
        break;
      case 7:
        if (!formData.city.trim()) {
          setStepError('Please enter the city where your facility is located.');
          return false;
        }
        if (!formData.state.trim()) {
          setStepError('Please select your State or Union Territory.');
          return false;
        }
        break;
      case 8:
        if (!formData.reason.trim()) {
          setStepError('Please specify the quality control testing scope or access reason.');
          return false;
        }
        if (formData.reason.trim().length < 10) {
          setStepError('Please provide a brief testing scope (minimum 10 characters).');
          return false;
        }
        break;
    }
    setStepError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < 9) {
      setDirection('forward');
      setCurrentStep((prev) => prev + 1);
      setStepError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection('backward');
      setCurrentStep((prev) => prev - 1);
      setStepError(null);
    } else {
      onSwitchMode('login');
    }
  };

  const jumpToStep = (stepNumber: number) => {
    setDirection(stepNumber < currentStep ? 'backward' : 'forward');
    setCurrentStep(stepNumber);
    setStepError(null);
  };

  // Keyboard navigation: Enter moves to next step (for single-line inputs)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (currentStep === 8) {
        // Textarea: allow regular enter for new line, Ctrl+Enter advances
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleNext();
        }
      } else if (currentStep < 9) {
        e.preventDefault();
        handleNext();
      }
    }
  };

  // Final Submission to Supabase
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setStepError(null);

    try {
      const result = await submitAccountRequest(formData);
      if (result.success) {
        setSubmittedRequestId(result.requestId || null);
        setIsSuccess(true);
      } else {
        setStepError(result.error || 'Failed to submit account request. Please verify connection.');
      }
    } catch {
      setStepError('An unexpected network error occurred while transmitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Confirmation Screen
  if (isSuccess) {
    return (
      <div className="w-full space-y-5 py-4 text-center animate-fadeIn">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-subtle">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <div>
          <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
            Request Transmitted
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
            Request Submitted Successfully
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Your Account Request has been submitted successfully. A confirmation email will be sent to your registered work email address.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-left text-xs text-slate-600 space-y-2 max-w-md mx-auto shadow-subtle">
          {submittedRequestId && (
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-700">Request Reference ID:</span>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                {submittedRequestId}
              </span>
            </div>
          )}
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Review &amp; Provisioning Notice:</span>
          </p>
          <p className="leading-relaxed text-slate-600">
            Submitting a request does not mean an account has already been approved. Our team will review your application and notify your registered work email address:
          </p>
          <p className="font-mono font-semibold text-slate-900 bg-white p-2 rounded border border-slate-200 break-all">
            {formData.workEmail}
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            Facility: {formData.companyName} • {formData.plantName} ({formData.city}, {formData.state})
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onSwitchMode('login')}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  // Progress percentage calculation
  const progressPercent = currentStep <= TOTAL_QUESTION_STEPS
    ? Math.round((currentStep / TOTAL_QUESTION_STEPS) * 100)
    : 100;

  return (
    <div className="w-full flex flex-col justify-between min-h-[380px] sm:min-h-[420px]" onKeyDown={handleKeyDown}>
      {/* Top Header: Navigation back + Subtle Progress Indicator */}
      <div className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{currentStep === 1 ? 'Back to Sign In' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {currentStep <= TOTAL_QUESTION_STEPS
                ? `Question ${currentStep} of ${TOTAL_QUESTION_STEPS}`
                : 'Final Review'}
            </span>
          </div>
        </div>

        {/* Sleek Progress Bar */}
        <div className="mt-2.5 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Animated Question Area */}
      <div className="py-6 flex-1 flex flex-col justify-center">
        <div ref={stepContainerRef} className="w-full space-y-4">
          {/* STEP 1: Full Name */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 1 • Personnel Identification
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  What is your full name?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Your full legal name as it appears on plant credentials and authorization logs.
                </p>
              </div>

              <div className="pt-2">
                <div className="relative rounded-md shadow-subtle">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="e.g. Er. Rajesh Sharma"
                    className="block w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Work Email */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 2 • Corporate Communications
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  What is your work email address?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  We will transmit your approved login invitation and verification credentials to this address.
                </p>
              </div>

              <div className="pt-2">
                <div className="relative rounded-md shadow-subtle">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="email"
                    value={formData.workEmail}
                    onChange={(e) => updateField('workEmail', e.target.value)}
                    placeholder="r.sharma@cementcorp.com"
                    className="block w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Company / Organization */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 3 • Organization Profile
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  Which company or organization do you represent?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  The primary corporate or manufacturing entity operating the testing laboratory.
                </p>
              </div>

              <div className="pt-2">
                <div className="relative rounded-md shadow-subtle">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Building className="h-5 w-5" />
                  </div>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="e.g. Wonder Cement / UltraTech / J.K. Cement"
                    className="block w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Plant / Facility Name */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 4 • Industrial Facility
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  Which plant or facility are you associated with?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Specific manufacturing plant, grinding unit, or material QA laboratory location.
                </p>
              </div>

              <div className="pt-2">
                <div className="relative rounded-md shadow-subtle">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Factory className="h-5 w-5" />
                  </div>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={formData.plantName}
                    onChange={(e) => updateField('plantName', e.target.value)}
                    placeholder="e.g. Chittorgarh Integrated Works - Unit 1"
                    className="block w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Designation / Role */}
          {currentStep === 5 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 5 • Professional Role
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  What is your role or designation?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Your official operational role within the quality control and assurance team.
                </p>
              </div>

              <div className="pt-2">
                <div className="relative rounded-md shadow-subtle">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={formData.designation}
                    onChange={(e) => updateField('designation', e.target.value)}
                    placeholder="e.g. Quality Assurance Manager / Senior QC Chemist"
                    className="block w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Contact Number */}
          {currentStep === 6 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 6 • Direct Contact
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  What is your direct contact number?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  For administrative verification and security multi-factor setup.
                </p>
              </div>

              <div className="pt-2">
                <div className="relative rounded-md shadow-subtle">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="block w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Location (City & State) */}
          {currentStep === 7 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 7 • Facility Geographical Location
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  Where is your facility located?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Specify the city and state or province of the physical laboratory.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md shadow-subtle">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="e.g. Chittorgarh"
                      className="block w-full rounded-md border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    State / Union Territory <span className="text-red-500">*</span>
                  </label>
                  <StateSelect
                    value={formData.state}
                    onChange={(val) => updateField('state', val)}
                    placeholder="Select your State / Union Territory"
                    placement="up"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Reason & Testing Scope */}
          {currentStep === 8 && (
            <div className="space-y-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase">
                  Step 8 • Operational Testing Scope
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  Why would you like access to ChittorTech QA LMS?
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Briefly specify your laboratory testing domain (e.g. cement clinker analysis, compressive strength, batch quality tracking).
                </p>
              </div>

              <div className="pt-2">
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => updateField('reason', e.target.value)}
                  placeholder="e.g. Managing cement quality testing records, kiln clinker reports, raw material analysis, and compliance audit logs."
                  className="block w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-colors shadow-subtle"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tip: Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-600">Ctrl + Enter</kbd> to continue to review.
                </p>
              </div>
            </div>
          )}

          {/* STEP 9: Final Review Screen */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <div>
                <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 uppercase">
                  Final Step • Verification
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
                  Review Your Account Request
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Confirm the parameters below before official submission to ChittorTech.
                </p>
              </div>

              {/* Review Summary Grid */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs max-h-[38vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Full Name</span>
                    <p className="font-bold text-slate-900 text-sm">{formData.fullName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(1)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Work Email</span>
                    <p className="font-bold text-slate-900 font-mono">{formData.workEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(2)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Organization & Facility</span>
                    <p className="font-bold text-slate-900">{formData.companyName} • {formData.plantName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(3)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Designation & Contact</span>
                    <p className="font-semibold text-slate-800">{formData.designation} ({formData.phone})</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(5)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Location</span>
                    <p className="font-semibold text-slate-800">{formData.city}, {formData.state}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(7)}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Testing Scope</span>
                    <button
                      type="button"
                      onClick={() => jumpToStep(8)}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <p className="text-slate-700 italic mt-0.5 leading-relaxed">{formData.reason}</p>
                </div>
              </div>

              {/* Official Product Notice / Disclaimer */}
              <div className="rounded-md border border-blue-100 bg-blue-50/70 p-3 text-left">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-blue-900">
                    <strong className="font-semibold text-blue-950">Notice: </strong>
                    Your account request will be submitted to ChittorTech for review. Once approved, your account will be created and the access/invitation details will be sent to the email address provided above.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation Error Feedback */}
          {stepError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 animate-fadeIn"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <p className="font-medium">{stepError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-subtle hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
        </button>

        {currentStep < 9 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinalSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Transmitting to ChittorTech...</span>
              </>
            ) : (
              <>
                <span>Submit Account Request</span>
                <Send className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
