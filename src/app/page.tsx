'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Header } from '@/components/common/Header';
import { LaboratoryEntryWorkflow } from '@/components/lab/LaboratoryEntryWorkflow';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const [justAuthenticated, setJustAuthenticated] = useState(false);

  // During initial session check
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Loading Laboratory System...
        </p>
      </div>
    );
  }

  // If not logged in, render the official Authentication experience
  if (!user && !justAuthenticated) {
    return (
      <AuthLayout
        onAuthSuccess={() => {
          setJustAuthenticated(true);
        }}
      />
    );
  }

  // Once authenticated, redirect immediately to the Laboratory Entry flow
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col justify-between">
      <Header
        onLogout={async () => {
          setJustAuthenticated(false);
          await logout();
        }}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <LaboratoryEntryWorkflow />
      </main>

      <footer className="w-full border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} ChittorTech Laboratory Management System. Official Clinical Enterprise Build.</p>
          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span>Phase 1: Auth & Date → Category Flow</span>
            <span>•</span>
            <button
              onClick={async () => {
                setJustAuthenticated(false);
                await logout();
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Switch Account
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

