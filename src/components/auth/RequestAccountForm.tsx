'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { AuthInput } from './AuthInput';
import { useAuth } from '@/contexts/AuthContext';
import { AuthMode, AccountRequestPayload } from '@/types';

interface RequestAccountFormProps {
  onSwitchMode: (mode: AuthMode) => void;
}

export const RequestAccountForm: React.FC<RequestAccountFormProps> = ({ onSwitchMode }) => {
  const { submitAccountRequest } = useAuth();

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

  const [errors, setErrors] = useState<Partial<Record<keyof AccountRequestPayload | 'general', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateField = (field: keyof AccountRequestPayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AccountRequestPayload, string>> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!formData.workEmail.trim()) {
      newErrors.workEmail = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail.trim())) {
      newErrors.workEmail = 'Enter a valid corporate email.';
    }
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required.';
    if (!formData.plantName.trim()) newErrors.plantName = 'Plant or facility name is required.';
    if (!formData.designation.trim()) newErrors.designation = 'Designation/role is required.';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Contact number is required.';
    } else if (formData.phone.replace(/[^0-9]/g, '').length < 8) {
      newErrors.phone = 'Enter a valid phone number.';
    }
    if (!formData.city.trim()) newErrors.city = 'City is required.';
    if (!formData.state.trim()) newErrors.state = 'State is required.';
    if (!formData.reason.trim()) newErrors.reason = 'Please state the testing/facility scope.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await submitAccountRequest(formData);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setErrors({ general: result.error || 'Unable to submit request. Please try again.' });
      }
    } catch {
      setErrors({ general: 'Connection error while contacting ChittorTech server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Confirmation State
  if (isSuccess) {
    return (
      <div className="w-full space-y-5 py-3 text-center animate-fadeIn">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-subtle">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <div>
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200">
            Request Logged
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
            Request Submitted Successfully
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Thank you. Your account request for <strong className="text-slate-900">{formData.companyName} ({formData.plantName})</strong> has been received by ChittorTech.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-left text-xs text-slate-600 space-y-2 max-w-md mx-auto">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Next Steps in Provisioning Workflow:</span>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-600">
            <li>ChittorTech administrators verify your plant and facility credentials.</li>
            <li>Upon approval, your login account will be generated.</li>
            <li>Official invitation and sign-in instructions will be delivered to <strong className="text-slate-800">{formData.workEmail}</strong>.</li>
          </ul>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onSwitchMode('login')}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3.5" noValidate>
      <div>
        <button
          type="button"
          onClick={() => onSwitchMode('login')}
          className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sign In</span>
        </button>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          Request Laboratory Access
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Provide plant details. Accounts are verified and provisioned by ChittorTech.
        </p>
      </div>

      {errors.general && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <p className="font-medium">{errors.general}</p>
        </div>
      )}

      {/* Form Fields: Grid Layout */}
      <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <AuthInput
            id="req-fullName"
            label="Full Name"
            placeholder="Er. Rajesh Sharma"
            value={formData.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            error={errors.fullName}
            icon={User}
            disabled={isSubmitting}
          />

          <AuthInput
            id="req-workEmail"
            label="Work Email"
            type="email"
            placeholder="r.sharma@cementcorp.com"
            value={formData.workEmail}
            onChange={(e) => updateField('workEmail', e.target.value)}
            error={errors.workEmail}
            icon={Mail}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <AuthInput
            id="req-company"
            label="Company / Enterprise"
            placeholder="e.g. UltraTech / Wonder Cement"
            value={formData.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            error={errors.companyName}
            icon={Building}
            disabled={isSubmitting}
          />

          <AuthInput
            id="req-plant"
            label="Plant / Facility Name"
            placeholder="e.g. Chittorgarh Integrated Works"
            value={formData.plantName}
            onChange={(e) => updateField('plantName', e.target.value)}
            error={errors.plantName}
            icon={Factory}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <AuthInput
            id="req-designation"
            label="Designation / Role"
            placeholder="e.g. QA Manager / QC Chemist"
            value={formData.designation}
            onChange={(e) => updateField('designation', e.target.value)}
            error={errors.designation}
            icon={Briefcase}
            disabled={isSubmitting}
          />

          <AuthInput
            id="req-phone"
            label="Contact Number"
            type="tel"
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            error={errors.phone}
            icon={Phone}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <AuthInput
            id="req-city"
            label="City"
            placeholder="e.g. Chittorgarh"
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            error={errors.city}
            icon={MapPin}
            disabled={isSubmitting}
          />

          <AuthInput
            id="req-state"
            label="State / Province"
            placeholder="e.g. Rajasthan"
            value={formData.state}
            onChange={(e) => updateField('state', e.target.value)}
            error={errors.state}
            icon={MapPin}
            disabled={isSubmitting}
          />
        </div>

        {/* Reason for access */}
        <div className="space-y-1 text-left">
          <label
            htmlFor="req-reason"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Testing Scope & Access Reason
          </label>
          <div className="relative">
            <textarea
              id="req-reason"
              rows={2}
              placeholder="e.g. Cement clinker testing, compressive strength logs, and chemical analysis QA workflows."
              value={formData.reason}
              onChange={(e) => updateField('reason', e.target.value)}
              disabled={isSubmitting}
              className={`
                block w-full rounded-md border text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 p-2.5
                ${
                  errors.reason
                    ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500'
                    : 'border-slate-300 bg-white hover:border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }
              `}
            />
          </div>
          {errors.reason && (
            <p className="text-xs text-red-600 font-medium">{errors.reason}</p>
          )}
        </div>
      </div>

      {/* Official Product Notice / Disclaimer */}
      <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3 text-left">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-blue-900">
            <strong className="font-semibold text-blue-950">Notice: </strong>
            Your account request will be submitted to ChittorTech for review. Once approved, your account will be created and the access/invitation details will be sent to the email address provided above.
          </p>
        </div>
      </div>

      {/* Submit Action */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Transmitting request...</span>
            </>
          ) : (
            <>
              <span>Submit Account Request</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

