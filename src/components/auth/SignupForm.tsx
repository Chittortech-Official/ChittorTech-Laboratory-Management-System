'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { useAuth } from '@/contexts/AuthContext';
import { AuthMode } from '@/types';

interface SignupFormProps {
  onSwitchMode: (mode: AuthMode) => void;
  onSuccess: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchMode, onSuccess }) => {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your complete name.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid laboratory or organizational email.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmation password is required.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match.';
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
      const result = await signup(fullName.trim(), email.trim(), password);
      if (result.success) {
        onSuccess();
      } else {
        setErrors({ general: result.error || 'Failed to create account. Please try again.' });
      }
    } catch {
      setErrors({ general: 'An unexpected connection error occurred during account creation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3.5" noValidate>
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
          Create Laboratory Account
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Register new authorized credentials for the management portal.
        </p>
      </div>

      {errors.general && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50/70 p-3 text-xs text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <p className="font-medium">{errors.general}</p>
        </div>
      )}

      <div className="space-y-3">
        <AuthInput
          id="signup-fullname"
          label="Full Name"
          type="text"
          autoComplete="name"
          placeholder="Dr. Rajesh Chittor"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          error={errors.fullName}
          icon={User}
          disabled={isSubmitting}
        />

        <AuthInput
          id="signup-email"
          label="Work Email"
          type="email"
          autoComplete="email"
          placeholder="officer@chittortech.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          icon={Mail}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AuthInput
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Min 6 chars"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            icon={Lock}
            disabled={isSubmitting}
          />

          <AuthInput
            id="signup-confirm-password"
            label="Confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            icon={Lock}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Registering account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <div className="pt-2 text-center border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Already registered?{' '}
          <button
            type="button"
            onClick={() => onSwitchMode('login')}
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Sign in here
          </button>
        </p>
      </div>
    </form>
  );
};

