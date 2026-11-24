'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ShieldCheck, Database, Factory, Award } from 'lucide-react';
import gsap from 'gsap';
import { AuthMode } from '@/types';
import { LoginForm } from './LoginForm';
import { RequestAccountForm } from './RequestAccountForm';
import { ForgotPasswordView } from './ForgotPasswordView';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { BlossomPetals } from '@/components/common/BlossomPetals';

interface AuthLayoutProps {
  onAuthSuccess: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [supabaseReady, setSupabaseReady] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const brandingRef = useRef<HTMLDivElement>(null);
  const formBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupabaseReady(isSupabaseConfigured());

    // Respect reduced-motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        brandingRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
      gsap.fromTo(
        formBoxRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.1, ease: 'power2.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    if (formBoxRef.current) {
      gsap.fromTo(
        formBoxRef.current,
        { opacity: 0.6, y: 6 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-[100dvh] w-full bg-slate-50 flex flex-col justify-between p-3 sm:p-5 lg:p-7 overflow-x-hidden"
    >
      {/* Background Subtle Blossom Falling Petals Animation */}
      <BlossomPetals />

      {/* Top minimal status bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-500 py-1">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">ChittorTech Industrial Node</span>
          <span className="text-slate-300">|</span>
          <span className="hidden sm:inline text-slate-500">Quality Assurance Management System</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <span>{supabaseReady ? 'Database Connected' : 'Database Ready'}</span>
          </span>
          <span className="text-slate-400 text-[11px] font-mono">v1.2.0-QA</span>
        </div>
      </header>

      {/* Main Responsive Grid Container */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left / Branding Section */}
          <div
            ref={brandingRef}
            className="lg:col-span-6 flex flex-col justify-center space-y-4 px-2 sm:px-4"
          >
            {/* ChittorTech Emblem & Identity */}
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-white border border-slate-200 p-2 shadow-subtle flex items-center justify-center shrink-0">
                <Image
                  src="/assets/images/ct-logo.png"
                  alt="ChittorTech Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
                    Chittor<span className="text-blue-600">Tech</span>
                  </h1>
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                    QA LAB
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  QA Laboratory Management System
                </p>
              </div>
            </div>

            {/* Core Mission Tagline */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
                Secure quality assurance laboratory operations, testing records, and industrial quality workflows.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                Engineered for cement manufacturing plants, industrial materials laboratories, and manufacturing quality control teams requiring precision testing logs, strict batch traceability, and verified audit standards.
              </p>
            </div>

            {/* Enterprise Highlights / Trust Signals */}
            <div className="grid grid-cols-2 gap-3 pt-1 max-w-md">
              <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-white p-2.5 shadow-subtle">
                <Factory className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Plant & Material QA</div>
                  <div className="text-[11px] text-slate-500">Cement & batch testing</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-white p-2.5 shadow-subtle">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Audit-Ready Logs</div>
                  <div className="text-[11px] text-slate-500">ISO / ASTM / BIS ready</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-white p-2.5 shadow-subtle">
                <Database className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Database Connected</div>
                  <div className="text-[11px] text-slate-500">Live cloud database</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-white p-2.5 shadow-subtle">
                <Award className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Controlled Access</div>
                  <div className="text-[11px] text-slate-500">Verified plant personnel</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Authentication Section */}
          <div className="lg:col-span-6 flex justify-center w-full">
            <div
              ref={formBoxRef}
              className={`w-full ${mode === 'request-account' ? 'max-w-lg' : 'max-w-md'} rounded-lg border border-slate-200 bg-white p-5 sm:p-7 shadow-elevated transition-all`}
            >
              {mode === 'login' && (
                <LoginForm
                  onSwitchMode={handleSwitchMode}
                  onSuccess={onAuthSuccess}
                />
              )}

              {mode === 'request-account' && (
                <RequestAccountForm onSwitchMode={handleSwitchMode} />
              )}

              {mode === 'forgot-password' && (
                <ForgotPasswordView onSwitchMode={handleSwitchMode} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer minimal info */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-2 text-[11px] text-slate-400 py-1">
        <p>© {new Date().getFullYear()} ChittorTech. All rights reserved. Industrial Quality Assurance Suite.</p>
        <p className="flex items-center gap-3">
          <span className="hover:text-slate-600 cursor-pointer">Security Protocol</span>
          <span>•</span>
          <span className="hover:text-slate-600 cursor-pointer">Compliance Policy</span>
          <span>•</span>
          <span className="hover:text-slate-600 cursor-pointer">Technical Support</span>
        </p>
      </footer>
    </div>
  );
};
