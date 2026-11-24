'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { useAuth } from '@/contexts/AuthContext';
import { AuthMode } from '@/types';

interface ForgotPasswordViewProps {
  onSwitchMode: (mode: AuthMode) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onSwitchMode }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please provide a valid registered laboratory email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Unable to process reset request.');
      }
    } catch {
      setError('A connection error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full space-y-4 py-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Recovery Email Dispatched</h3>
          <p className="mt-1 text-xs text-slate-500">
            Instructions to securely reset your credentials have been forwarded to:
            <br />
            <strong className="text-slate-800">{email}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchMode('login')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      <div>
        <button
          type="button"
          onClick={() => onSwitchMode('login')}
          className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Login</span>
        </button>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Reset Password
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Enter your registered email to receive secure recovery instructions.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50/70 p-3 text-xs text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <AuthInput
        id="reset-email"
        label="Registered Email"
        type="email"
        placeholder="technician@chittortech.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        icon={Mail}
        disabled={isSubmitting}
      />

      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending instructions...</span>
            </>
          ) : (
            <>
              <span>Send Reset Instructions</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

