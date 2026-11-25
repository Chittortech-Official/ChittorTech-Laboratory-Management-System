'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Header } from '@/components/common/Header';
import { LaboratoryDashboard } from '@/components/laboratory/LaboratoryDashboard';
import { DashboardTab } from '@/types';

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const [justAuthenticated, setJustAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  // 1. While Supabase session is being checked and restored on reload, display professional centered loading screen
  if (loading && !user && !justAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center max-w-sm text-center space-y-4 animate-in fade-in duration-200">
          {/* ChittorTech Logo Card */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-md">
            <Image
              src="/assets/images/ct-logo.png"
              alt="ChittorTech Logo"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>

          <div>
            <h3 className="font-heading text-lg font-extrabold text-slate-900 tracking-tight">
              Chittor<span className="text-blue-600">Tech</span>{' '}
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 ml-1">
                QA LMS
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Restoring your session...
            </p>
          </div>

          {/* Subtle loading spinner */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50/80 px-4 py-2 rounded-full border border-blue-200/60 shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Loading your laboratory dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. If authentication check is complete and no valid session exists, render Login / Request Account
  if (!user && !justAuthenticated) {
    return (
      <AuthLayout
        onAuthSuccess={() => {
          setJustAuthenticated(true);
        }}
      />
    );
  }

  // 3. Authenticated: render protected laboratory dashboard directly without any login flash
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col justify-between">
      <Header
        onOpenSettings={() => setActiveTab('settings')}
        onLogout={async () => {
          setJustAuthenticated(false);
          await logout();
        }}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <LaboratoryDashboard
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
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
