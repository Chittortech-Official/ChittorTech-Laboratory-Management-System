'use client';

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { useAuth } from '@/contexts/AuthContext';
import { AuthMode } from '@/types';

interface LoginFormProps {
  onSwitchMode: (mode: AuthMode) => void;
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchMode, onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Work email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid work or corporate email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        onSuccess();
      } else {
        setErrors({ general: result.error || 'Invalid laboratory credentials or unauthorized access.' });
      }
    } catch {
      setErrors({ general: 'Network connection failure. Please verify connectivity to the QA server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      <div>
        <div className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200 mb-1.5">
          <Building2 className="h-3 w-3 text-blue-600" />
          <span>Industrial QA Portal</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Sign In to System
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter authorized credentials to access plant testing logs and QA records.
        </p>
      </div>

      {errors.general && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50/80 p-3 text-xs text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <p className="font-medium">{errors.general}</p>
        </div>
      )}

      <div className="space-y-3.5">
        <AuthInput
          id="login-email"
          label="Work Email Address"
          type="email"
          autoComplete="email"
          placeholder="engineer@plant.cementcorp.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          icon={Mail}
          disabled={isSubmitting}
        />

        <AuthInput
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          icon={Lock}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-600">Remember device</span>
        </label>
        <button
          type="button"
          onClick={() => onSwitchMode('forgot-password')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Forgot password?
        </button>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying authorization...</span>
            </>
          ) : (
            <>
              <span>Sign In to System</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Account Request Trigger (NO public signup) */}
      <div className="pt-3 text-center border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Need access for your plant or testing facility?{' '}
          <button
            type="button"
            onClick={() => onSwitchMode('request-account')}
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Request an Account
          </button>
        </p>
      </div>
    </form>
  );
};
