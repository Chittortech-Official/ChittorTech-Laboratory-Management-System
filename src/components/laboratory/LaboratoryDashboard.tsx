'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, PlusCircle, Database, BarChart3, 
  FileText, Mail, Settings, ShieldCheck, Beaker, 
  Layers, Calendar, Clock, ArrowRight, CheckCircle2, 
  Factory, User, AlertCircle, RefreshCw, Download, Sparkles, Zap
} from 'lucide-react';
import { DashboardTab, LaboratoryRecord } from '@/types';
import { NewEntryForm } from './NewEntryForm';
import { PreviousRecords } from './PreviousRecords';
import { AnalyticsView } from './AnalyticsView';
import { ReportsView } from './ReportsView';
import { LaboratoryResourcesView } from './LaboratoryResourcesView';
import { KnowledgeCentreView, type KnowledgeNavigationTarget } from '../knowledge/KnowledgeCentreView';
import { KnowledgeAssistant } from '../knowledge/KnowledgeAssistant';
import type { KnowledgeCitation } from '@/lib/knowledge/knowledgeRetrieval';
import { CHEMICAL_PARAMETERS } from '@/lib/laboratory/constants';
import { formatDateDDMMYYYY } from '@/lib/laboratory/exportService';
import { FolderKanban, BookOpen } from 'lucide-react';

interface LaboratoryDashboardProps {
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
}

export const LaboratoryDashboard: React.FC<LaboratoryDashboardProps> = ({
  activeTab: externalTab,
  onTabChange,
}) => {
  const { user, logout, isConfigured } = useAuth();
  const [internalTab, setInternalTab] = useState<DashboardTab>('dashboard');

  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const setActiveTab = onTabChange || setInternalTab;

  const userId = user?.id || 'plant-engineer-default';
  const userName = user?.fullName || 'QA Chemist';
  const userEmail = user?.email || 'contact@chittortech.in';
  const plantName = user?.plantName || user?.companyName || 'ChittorTech Materials QA Laboratory';

  // Fast recent records fetch for the overview dashboard
  const [recentRecords, setRecentRecords] = useState<LaboratoryRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [knowledgeTarget, setKnowledgeTarget] = useState<KnowledgeNavigationTarget | null>(null);

  const handleOpenKnowledgeSource = (citation: KnowledgeCitation) => {
    const targetSection =
      citation.sectionTarget && citation.sectionTarget !== 'assistant'
        ? citation.sectionTarget
        : 'home';
    setKnowledgeTarget({
      section: targetSection,
      testingSubTab: citation.testingSubTab,
      topicId: citation.topicId,
      nonce: Date.now(),
    });
    setActiveTab('knowledge_centre');
  };

  const fetchRecentSummary = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/records?userId=${encodeURIComponent(userId)}&limit=5`);
      const data = await res.json();
      if (res.ok && data.records) {
        setRecentRecords(data.records);
        setTotalCount(data.total || data.records.length);
      }
    } catch (e) {
      console.warn('Could not fetch recent records', e);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentSummary();
  }, [userId, activeTab]);

  const navItems: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'new_entry', label: 'New Laboratory Entry', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'previous_records', label: 'Previous Records', icon: <Database className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Downloads', icon: <FileText className="w-4 h-4" /> },
    { id: 'laboratory_resources', label: 'Laboratory Resources', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'knowledge_centre', label: 'Knowledge & Compliance Centre', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'ai_assistant', label: 'AI Assistant', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Full-Width Adaptive Soft Sky Blue Navigation Bar (Never clips long labels) */}
      <div className="w-full bg-[#EAF3FF] rounded-2xl border border-[#D6E8FF] shadow-2xs p-1.5 overflow-x-auto">
        <nav className="flex items-stretch gap-1 w-full min-w-max">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#D6E8FF] text-[#2563EB] shadow-2xs ring-1 ring-[#3B82F6]/25'
                    : 'text-[#64748B] hover:text-[#334155] hover:bg-white/60'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT */}

      {/* 1. MAIN DASHBOARD OVERVIEW TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Welcome & Plant Status Banner (Clean Light White Card with Soft Accents) */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 sm:p-7 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF3FF] text-[#2563EB] border border-[#D6E8FF]">
                  <Factory className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#15803D] border border-[#BBF7D0]">
                      QA Node Active
                    </span>
                    <span className="text-xs text-[#64748B] font-mono font-bold bg-[#F5F8FC] px-2 py-0.5 rounded border border-[#E2E8F0]">
                      {formatDateDDMMYYYY(new Date())}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#334155] mt-1.5">
                    {plantName}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                    Operator: <strong className="text-[#334155]">{userName}</strong> ({userEmail}) &bull; Ball Mill & Chemical Oxide Circuit
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('new_entry')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#2563EB] transition-colors"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>New Chemical Entry</span>
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#CCFBF1] bg-[#CCFBF1]/60 px-3.5 py-2.5 text-xs font-semibold text-[#0F9D92] hover:bg-[#CCFBF1] transition-colors"
                >
                  <Download className="h-4 w-4 text-[#0F9D92]" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid (White Cards with Subtle Light Pastel Accents) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Tests Logged</span>
                <div className="text-2xl font-bold text-[#334155] mt-1">{totalCount}</div>
                <span className="text-[11px] text-[#64748B]">Live Supabase Database</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#EAF3FF] text-[#2563EB] border border-[#D6E8FF] flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Monitored Oxides</span>
                <div className="text-2xl font-bold text-[#334155] mt-1">{CHEMICAL_PARAMETERS.length}</div>
                <span className="text-[11px] text-[#64748B]">LOI, IR, SO3, SiO2, Free Lime...</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#CCFBF1] text-[#0F9D92] border border-[#99F6E4] flex items-center justify-center">
                <Beaker className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Primary Category</span>
                <div className="text-lg font-bold text-[#334155] mt-1 truncate max-w-[140px]">Ball Mill</div>
                <span className="text-[11px] text-[#64748B]">Grinding circuit</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">QA Compliance</span>
                <div className="text-lg font-bold text-[#15803D] mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#15803D]" /> ASTM C114
                </div>
                <span className="text-[11px] text-[#64748B]">IS 4032 / EN 196-2</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Recent Records & Quick Nav Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Recent 5 Records (8 cols) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Laboratory Test Entries</h3>
                  <p className="text-xs text-slate-500">Latest batches recorded in the chemical testing node</p>
                </div>
                <button
                  onClick={() => setActiveTab('previous_records')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All Records <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingRecent ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading latest test batches...
                </div>
              ) : recentRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  <Beaker className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No test entries saved yet.</p>
                  <p className="text-slate-400 mt-0.5">Click below to record your first Ball Mill chemical test.</p>
                  <button
                    onClick={() => setActiveTab('new_entry')}
                    className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    + Add New Entry
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto border-t border-slate-300">
                  <table className="w-full min-w-[550px] text-left border-collapse border border-slate-300 text-xs shadow-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase text-[10px] font-extrabold tracking-wider border-b-2 border-slate-800">
                        <th className="py-3 px-3.5 border-r border-slate-700 font-bold">Date</th>
                        <th className="py-3 px-3 border-r border-slate-700 font-bold">Sample ID</th>
                        <th className="py-3 px-3 border-r border-slate-700 font-bold">Category</th>
                        <th className="py-3 px-3 text-right border-r border-slate-700 font-bold">Lime (CaO)</th>
                        <th className="py-3 px-3 text-right border-r border-slate-700 font-bold">Silica (SiO₂)</th>
                        <th className="py-3 px-3 text-right font-bold">SO₃</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentRecords.map((r) => (
                        <tr key={r.id} className="odd:bg-white even:bg-slate-50/70 hover:bg-blue-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold font-mono text-slate-900 border-r border-b border-slate-200 whitespace-nowrap">{formatDateDDMMYYYY(r.test_date)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700 border-r border-b border-slate-200">{r.sample_id}</td>
                          <td className="py-2.5 px-3 border-r border-b border-slate-200">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300/80">
                              {r.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-b border-slate-200">
                            {r.lime !== null ? `${r.lime.toFixed(2)}%` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-b border-slate-200">
                            {r.silica !== null ? `${r.silica.toFixed(2)}%` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-b border-slate-200">
                            {r.so3 !== null ? `${r.so3.toFixed(2)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Laboratory Navigation Shortcut Tiles (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div
                onClick={() => setActiveTab('new_entry')}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">New Laboratory Entry</h4>
                    <p className="text-[11px] text-slate-500">Record 9 oxide parameters</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => setActiveTab('analytics')}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Quality Analytics</h4>
                    <p className="text-[11px] text-slate-500">Trend curves & statistics</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => setActiveTab('reports')}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Reports & Downloads</h4>
                    <p className="text-[11px] text-slate-500">A4 PDF, CSV, Excel (XLSX)</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. NEW LABORATORY ENTRY TAB */}
      {activeTab === 'new_entry' && (
        <NewEntryForm
          user={user}
          onRecordSaved={() => {
            fetchRecentSummary();
            setActiveTab('previous_records');
          }}
        />
      )}

      {/* 3. PREVIOUS RECORDS TAB */}
      {activeTab === 'previous_records' && (
        <PreviousRecords
          userId={userId}
          userEmail={userEmail}
          userName={userName}
          plantName={plantName}
          onNavigateToNewEntry={() => setActiveTab('new_entry')}
        />
      )}

      {/* 4. ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <AnalyticsView userId={userId} />
      )}

      {/* 5. REPORTS & DOWNLOADS TAB */}
      {activeTab === 'reports' && (
        <ReportsView
          userId={userId}
          userName={userName}
          userEmail={userEmail}
          plantName={plantName}
        />
      )}

      {/* 5.5 LABORATORY RESOURCES TAB (PHASE 2 ISO/IEC 17025) */}
      {activeTab === 'laboratory_resources' && (
        <LaboratoryResourcesView userId={userId} />
      )}

      {/* 5.6 KNOWLEDGE & COMPLIANCE CENTRE TAB */}
      {activeTab === 'knowledge_centre' && (
        <KnowledgeCentreView
          userId={userId}
          userName={userName}
          userRole={user?.role}
          externalTarget={knowledgeTarget}
        />
      )}

      {/* 5.7 DEDICATED AI KNOWLEDGE & COMPLIANCE ASSISTANT TAB */}
      {activeTab === 'ai_assistant' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 sm:p-6 animate-in fade-in">
          <KnowledgeAssistant onOpenSource={handleOpenKnowledgeSource} />
        </div>
      )}

      {/* 6. ACCOUNT SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Laboratory Node & Account Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current authentication session and connected database node configuration.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-auto"
            >
              &larr; Back to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Operator Name</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{userName}</p>
              <p className="text-xs text-slate-500 font-mono">{userEmail}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Plant / Facility</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{plantName}</p>
              <p className="text-xs text-slate-500">Quality Assurance Department</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Database Architecture</span>
              <p className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Supabase Cloud DB Connected
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">znouayrbfheqqqhlqfuf.supabase.co</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">SMTP Relay Service</span>
              <p className="text-sm font-bold text-blue-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                GoDaddy Secure SMTP Relay (SSL: 465)
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">contact@chittortech.in</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              ChittorTech QA &bull; Industrial Laboratory Management System v2.0
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors"
            >
              Sign Out Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

