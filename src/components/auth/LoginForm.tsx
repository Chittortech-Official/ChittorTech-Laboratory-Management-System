'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Building2, Clock, ShieldAlert } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { TurnstileWidget } from './TurnstileWidget';
import { useAuth } from '@/contexts/AuthContext';
import { AuthMode } from '@/types';

interface LoginFormProps {
  onSwitchMode: (mode: AuthMode) => void;
  onSuccess: () => void;
}

const LOCKOUT_STORAGE_KEY = 'chittortech_login_lockout_v1';

interface StoredLockoutUI {
  emailNorm: string;
  lockedUntil: number;
  message: string;
}

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchMode, onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    captcha?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Turnstile CAPTCHA state
  const [turnstileConfig, setTurnstileConfig] = useState<{
    loaded: boolean;
    configured: boolean;
    siteKey: string;
    isTestMode: boolean;
  }>({ loaded: false, configured: true, siteKey: '', isTestMode: false });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  // Lockout countdown state (persisted across page refresh via localStorage, enforced authoritatively on server)
  const [activeLockout, setActiveLockout] = useState<StoredLockoutUI | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/login', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setTurnstileConfig({
          loaded: true,
          configured: Boolean(data.configured),
          siteKey: data.turnstileSiteKey || '',
          isTestMode: Boolean(data.isTestMode),
        });
      })
      .catch(() => {
        if (mounted) {
          setTurnstileConfig((prev) => ({ ...prev, loaded: true }));
        }
      });

    // Restore any active lockout state from localStorage across page reloads
    try {
      const raw = window.localStorage.getItem(LOCKOUT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredLockoutUI;
        if (parsed?.lockedUntil && parsed.lockedUntil > Date.now()) {
          setActiveLockout(parsed);
          if (parsed.emailNorm && !email) {
            setEmail(parsed.emailNorm);
          }
          setRemainingSeconds(Math.max(1, Math.ceil((parsed.lockedUntil - Date.now()) / 1000)));
        } else {
          window.localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        }
      }
    } catch {
      // ignore storage errors
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Countdown timer ticker
  useEffect(() => {
    if (!activeLockout) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const secs = Math.ceil((activeLockout.lockedUntil - Date.now()) / 1000);
      if (secs <= 0) {
        setActiveLockout(null);
        setRemainingSeconds(0);
        setTurnstileResetKey((k) => k + 1);
        try {
          window.localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        } catch {
          // ignore
        }
      } else {
        setRemainingSeconds(secs);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeLockout]);

  const normalizedInputEmail = email.trim().toLowerCase();
  const isAccountLockedInUi = Boolean(
    activeLockout &&
      remainingSeconds > 0 &&
      (!normalizedInputEmail || activeLockout.emailNorm === normalizedInputEmail)
  );

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string; captcha?: string } = {};

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

    if (!captchaToken) {
      newErrors.captcha = 'Please complete the security CAPTCHA check before signing in.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAccountLockedInUi) return;

    setErrors({});
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password, captchaToken || '');
      if (result.success) {
        try {
          window.localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        } catch {
          // ignore
        }
        setActiveLockout(null);
        onSuccess();
        return;
      }

      // Reset single-use Turnstile token on every unsuccessful response
      setCaptchaToken(null);
      setTurnstileResetKey((k) => k + 1);

      if (result.locked) {
        const until =
          typeof result.lockedUntil === 'number' && result.lockedUntil > Date.now()
            ? result.lockedUntil
            : Date.now() + (result.remainingSeconds || 300) * 1000;
        const lockObj: StoredLockoutUI = {
          emailNorm: email.trim().toLowerCase(),
          lockedUntil: until,
          message:
            result.error ||
            'Too many unsuccessful login attempts. Your account has been temporarily locked for 5 minutes. Please try again later.',
        };
        setActiveLockout(lockObj);
        setRemainingSeconds(Math.max(1, Math.ceil((until - Date.now()) / 1000)));
        try {
          window.localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(lockObj));
        } catch {
          // ignore
        }
        return;
      }

      if (result.code?.startsWith('CAPTCHA')) {
        setErrors({
          captcha: result.error || 'CAPTCHA verification failed. Please complete the challenge again.',
        });
      } else {
        setErrors({
          general: result.error || 'Invalid work email or password.',
        });
      }
    } catch {
      setCaptchaToken(null);
      setTurnstileResetKey((k) => k + 1);
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

      {/* 5-Minute Account Lockout Alert + Live Countdown */}
      {isAccountLockedInUi && activeLockout && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-2"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p className="font-semibold leading-relaxed">{activeLockout.message}</p>
          </div>
          <div className="flex items-center justify-between rounded bg-white/80 border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-800">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-red-600" />
              <span>Account temporarily locked</span>
            </span>
            <span className="font-mono font-bold text-red-700 tabular-nums">
              Retry in {formatCountdown(remainingSeconds)}
            </span>
          </div>
        </div>
      )}

      {!isAccountLockedInUi && errors.general && (
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
          disabled={isSubmitting || isAccountLockedInUi}
        />
      </div>

      {/* Cloudflare Turnstile CAPTCHA (Login Only) */}
      {turnstileConfig.loaded && (
        <TurnstileWidget
          siteKey={turnstileConfig.siteKey}
          configured={turnstileConfig.configured}
          isTestMode={turnstileConfig.isTestMode}
          resetKey={turnstileResetKey}
          error={errors.captcha}
          onTokenChange={(tok) => {
            setCaptchaToken(tok);
            if (tok && errors.captcha) {
              setErrors((prev) => ({ ...prev, captcha: undefined }));
            }
          }}
          onScriptError={(msg) => setErrors((prev) => ({ ...prev, captcha: msg }))}
        />
      )}

      <div className="flex items-center pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-600">Remember device</span>
        </label>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting || isAccountLockedInUi || (turnstileConfig.loaded && !turnstileConfig.configured)}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAccountLockedInUi ? (
            <>
              <Clock className="h-4 w-4" />
              <span className="font-mono">Locked ({formatCountdown(remainingSeconds)})</span>
            </>
          ) : isSubmitting ? (
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

      {/* Account Request Trigger (NO public signup — unchanged) */}
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
