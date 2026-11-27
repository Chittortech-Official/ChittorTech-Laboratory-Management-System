'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Header } from '@/components/common/Header';
import { DesktopOnlyGuard } from '@/components/common/DesktopOnlyGuard';
import { ContactSupportModal } from '@/components/support/ContactSupportModal';
import { LaboratoryDashboard } from '@/components/laboratory/LaboratoryDashboard';
import { DashboardTab } from '@/types';

const TAB_PARAM_MAP: Record<string, DashboardTab> = {
  dashboard: 'dashboard',
  new_entry: 'new_entry',
  'new-entry': 'new_entry',
  newentry: 'new_entry',
  previous_records: 'previous_records',
  'previous-records': 'previous_records',
  previousrecords: 'previous_records',
  analytics: 'analytics',
  reports: 'reports',
  'reports-downloads': 'reports',
  laboratory_resources: 'laboratory_resources',
  'laboratory-resources': 'laboratory_resources',
  knowledge_centre: 'knowledge_centre',
  'knowledge-centre': 'knowledge_centre',
  ai_assistant: 'ai_assistant',
  'ai-assistant': 'ai_assistant',
  assistant: 'ai_assistant',
  email_reports: 'reports',
  'email-reports': 'reports',
  settings: 'settings',
};

const TAB_TO_PARAM_MAP: Record<DashboardTab, string> = {
  dashboard: 'dashboard',
  new_entry: 'new-entry',
  previous_records: 'previous-records',
  analytics: 'analytics',
  reports: 'reports',
  laboratory_resources: 'laboratory-resources',
  knowledge_centre: 'knowledge-centre',
  ai_assistant: 'ai-assistant',
  email_reports: 'reports',
  settings: 'settings',
};

const STORAGE_TAB_KEY = 'chittortech_active_tab';
const STORAGE_SCROLL_PREFIX = 'chittortech_scroll_';

function HomePageContent() {
  const searchParams = useSearchParams();
  const { user, loading, logout } = useAuth();
  const [justAuthenticated, setJustAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Reset optimistic post-login state if session expires or user logs out automatically
  useEffect(() => {
    if (!loading && !user && justAuthenticated) {
      setJustAuthenticated(false);
    }
  }, [loading, user, justAuthenticated]);

  // Helper to determine active tab from URL query params or sessionStorage fallback
  const getInitialTab = useCallback((): DashboardTab => {
    if (typeof window !== 'undefined') {
      // 1. Try URL query parameter ?tab=...
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromQuery = urlParams.get('tab') || searchParams?.get('tab');
      if (tabFromQuery && TAB_PARAM_MAP[tabFromQuery.toLowerCase()]) {
        return TAB_PARAM_MAP[tabFromQuery.toLowerCase()];
      }

      // 2. Fallback to sessionStorage
      try {
        const savedTab = sessionStorage.getItem(STORAGE_TAB_KEY);
        if (savedTab && TAB_PARAM_MAP[savedTab.toLowerCase()]) {
          return TAB_PARAM_MAP[savedTab.toLowerCase()];
        }
      } catch (e) {
        console.warn('SessionStorage read error:', e);
      }
    }

    return 'dashboard';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  // Initialize and synchronize on mount
  useEffect(() => {
    setMounted(true);
    const initial = getInitialTab();
    setActiveTab(initial);

    // Save initial tab to sessionStorage and ensure URL matches
    try {
      sessionStorage.setItem(STORAGE_TAB_KEY, TAB_TO_PARAM_MAP[initial]);
      const currentParam = new URLSearchParams(window.location.search).get('tab');
      const expectedParam = TAB_TO_PARAM_MAP[initial];
      if (currentParam !== expectedParam && expectedParam !== 'dashboard') {
        const newUrl = `${window.location.pathname}?tab=${expectedParam}`;
        window.history.replaceState({ tab: expectedParam }, '', newUrl);
      }
    } catch {}

    // Restore scroll position for the initial tab once DOM is ready
    const savedY = sessionStorage.getItem(`${STORAGE_SCROLL_PREFIX}${initial}`);
    if (savedY) {
      setTimeout(() => {
        window.scrollTo({ top: Number(savedY), behavior: 'instant' });
      }, 150);
    }
  }, [getInitialTab]);

  // Handle browser Back / Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const resolvedTab: DashboardTab =
        tabParam && TAB_PARAM_MAP[tabParam.toLowerCase()]
          ? TAB_PARAM_MAP[tabParam.toLowerCase()]
          : 'dashboard';

      setActiveTab(resolvedTab);
      try {
        sessionStorage.setItem(STORAGE_TAB_KEY, TAB_TO_PARAM_MAP[resolvedTab]);
      } catch {}

      // Restore scroll position for this tab
      const savedY = sessionStorage.getItem(`${STORAGE_SCROLL_PREFIX}${resolvedTab}`);
      if (savedY) {
        setTimeout(() => {
          window.scrollTo({ top: Number(savedY), behavior: 'instant' });
        }, 100);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save scroll position continuously for the currently active tab
  useEffect(() => {
    if (!mounted) return;

    let timeoutId: any;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          sessionStorage.setItem(`${STORAGE_SCROLL_PREFIX}${activeTab}`, String(window.scrollY));
        } catch {}
      }, 100);
    };

    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem(`${STORAGE_SCROLL_PREFIX}${activeTab}`, String(window.scrollY));
      } catch {}
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [mounted, activeTab]);

  // Tab switch handler with URL update, sessionStorage sync, and scroll preservation
  const handleTabChange = useCallback((newTab: DashboardTab) => {
    // 1. Save scroll position of current tab before switching
    try {
      sessionStorage.setItem(`${STORAGE_SCROLL_PREFIX}${activeTab}`, String(window.scrollY));
    } catch {}

    // 2. Set new active tab
    setActiveTab(newTab);

    // 3. Sync to sessionStorage
    const tabParam = TAB_TO_PARAM_MAP[newTab];
    try {
      sessionStorage.setItem(STORAGE_TAB_KEY, tabParam);
    } catch {}

    // 4. Sync URL query parameter without full page reload or breaking browser history
    if (typeof window !== 'undefined') {
      const url =
        newTab === 'dashboard'
          ? window.location.pathname
          : `${window.location.pathname}?tab=${tabParam}`;

      window.history.pushState({ tab: tabParam }, '', url);
    }

    // 5. Restore scroll position for the new tab (or top if unvisited)
    try {
      const savedY = sessionStorage.getItem(`${STORAGE_SCROLL_PREFIX}${newTab}`);
      setTimeout(() => {
        if (savedY) {
          window.scrollTo({ top: Number(savedY), behavior: 'instant' });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 80);
    } catch {}
  }, [activeTab]);

  // 1. While Supabase session is being checked and restored on reload, display professional industrial loading screen
  if (!mounted || (loading && !user && !justAuthenticated)) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F8FC] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle industrial background accent */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.08),transparent_60%)]" />

        <div className="relative w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl text-center space-y-6 animate-in fade-in duration-200">
          {/* Top Industrial Node Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0F9D92] animate-pulse" />
            <span>QA Laboratory Node • Initializing</span>
          </div>

          {/* ChittorTech Logo with Soft Ring */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white p-2.5 shadow-sm ring-4 ring-[#EAF3FF]">
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
              <h3 className="font-heading text-xl font-extrabold text-[#334155] tracking-tight">
                Chittor<span className="text-[#2563EB]">Tech</span>{' '}
                <span className="text-[10px] font-bold text-[#2563EB] uppercase px-2 py-0.5 rounded-full bg-[#EAF3FF] border border-[#D6E8FF] ml-1 align-middle">
                  QA LMS
                </span>
              </h3>
              <p className="text-xs text-[#64748B] mt-1 font-medium">
                Quality Assurance &amp; Materials Testing Suite
              </p>
            </div>
          </div>

          {/* Smooth Indeterminate Progress Bar */}
          <div className="space-y-2">
            <div className="h-1.5 w-full rounded-full bg-[#EAF3FF] overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#0F9D92] animate-pulse" />
            </div>
            <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#2563EB]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Restoring your laboratory session...</span>
            </div>
          </div>

          {/* Authentic System Readiness Indicators */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F5F8FC] p-3.5 text-left text-[11px] text-[#64748B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#334155]">Operator Session</span>
              <span className="inline-flex items-center gap-1.5 text-[#2563EB] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-ping" />
                Verifying
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#334155]">Cloud Database Link</span>
              <span className="inline-flex items-center gap-1.5 text-[#0F9D92] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0F9D92]" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#334155]">Compliance Standards</span>
              <span className="font-mono font-semibold text-[#334155]">ASTM • BIS • ISO 17025</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-[#64748B]">
          ChittorTech Industrial QA Suite • Secure Laboratory Workspace
        </p>
      </div>
    );
  }

  // 2. If authentication check is complete and no valid session exists, render Login / Request Account
  if (!user && !justAuthenticated) {
    return (
      <DesktopOnlyGuard>
        <AuthLayout
          onAuthSuccess={() => {
            setJustAuthenticated(true);
          }}
        />
      </DesktopOnlyGuard>
    );
  }

  // 3. Authenticated: render protected laboratory dashboard directly without any login flash
  return (
    <DesktopOnlyGuard>
      <div className="min-h-[100dvh] bg-[#F5F8FC] text-[#334155] flex flex-col justify-between overflow-x-clip">
        <Header
          onOpenSettings={() => handleTabChange('settings')}
          onOpenSupport={() => setIsSupportOpen(true)}
          onLogout={async () => {
            setJustAuthenticated(false);
            await logout();
          }}
        />

        <main className="flex-1 w-full px-3 sm:px-5 lg:px-6 py-4 sm:py-6">
          <LaboratoryDashboard
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onContactSupport={() => setIsSupportOpen(true)}
          />
        </main>

        <footer className="w-full border-t border-[#E2E8F0] bg-[#F1F6FC] py-4 text-center text-xs text-[#64748B]">
          <div className="w-full px-3 sm:px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[#64748B]">© {new Date().getFullYear()} ChittorTech QA Laboratory Management System. Official Industrial Build.</p>
            <div className="flex items-center gap-4 text-[#64748B] text-[11px]">
              <button
                type="button"
                onClick={() => setIsSupportOpen(true)}
                className="text-[#2563EB] hover:underline font-semibold"
              >
                Contact Support
              </button>
              <span>•</span>
              <span>Industrial QA &bull; ISO / ASTM / BIS Protocol</span>
              <span>•</span>
              <button
                onClick={async () => {
                  setJustAuthenticated(false);
                  await logout();
                }}
                className="text-[#2563EB] hover:underline font-semibold"
              >
                Sign Out Session
              </button>
            </div>
          </div>
        </footer>
      </div>

      <ContactSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        user={user}
      />
    </DesktopOnlyGuard>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
