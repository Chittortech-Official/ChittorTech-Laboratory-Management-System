'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Header } from '@/components/common/Header';
import { ProtectedLanding } from '@/components/common/ProtectedLanding';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const [justAuthenticated, setJustAuthenticated] = useState(false);

  // Initial session check
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Loading ChittorTech QA System...
        </p>
      </div>
    );
  }

  // If not logged in, render the official Authentication experience (Login / Request Account / Forgot Password)
  if (!user && !justAuthenticated) {
    return (
      <AuthLayout
        onAuthSuccess={() => {
          setJustAuthenticated(true);
        }}
      />
    );
  }

  // Once authenticated, render protected landing state
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col justify-between">
      <Header
        onLogout={async () => {
          setJustAuthenticated(false);
          await logout();
        }}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <ProtectedLanding />
      </main>

      <footer className="w-full border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} ChittorTech QA Laboratory Management System. Official Industrial Build.</p>
          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span>Phase 1: Industrial QA Authentication & Request Flow</span>
            <span>•</span>
            <button
              onClick={async () => {
                setJustAuthenticated(false);
                await logout();
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              Sign Out Session
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
