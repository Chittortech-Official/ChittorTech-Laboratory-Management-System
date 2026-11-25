'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateDDMMYYYY } from '@/lib/laboratory/exportService';
import {
  ShieldCheck,
  CheckCircle2,
  Factory,
  Database,
  Lock,
  User,
  ArrowRight,
  LogOut,
  Building2,
  Cpu,
} from 'lucide-react';

export const ProtectedLanding: React.FC = () => {
  const { user, logout, isConfigured } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Session Verified Hero Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-subtle">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
                  Authenticated Session
                </span>
                <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {formatDateDDMMYYYY(new Date())}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Welcome, {user?.fullName || 'QA Specialist'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Authorized access confirmed for ChittorTech QA Laboratory Management System.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-subtle hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Session Telemetry & Credentials Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-subtle space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Industrial QA Session Parameters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <User className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Registered Personnel
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {user?.fullName || 'QA Engineer'}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <Factory className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Assigned Plant / Facility
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {user?.plantName || 'Integrated Cement Works'}
              </p>
              <p className="text-[11px] text-slate-500">
                {user?.companyName || 'Industrial QA Facility'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Access Authorization
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                {user?.role ? user.role.toUpperCase().replace('_', ' ') : 'QA ENGINEER'}
              </p>
              <p className="text-[11px] text-slate-500">
                {user?.designation || 'Quality Assurance Chemist'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <Database className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">
                Backend Architecture
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span>{isConfigured ? 'Live Cloud Database' : 'Local Storage'}</span>
              </p>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {isConfigured ? 'znouayrbfheqqhlqfuf' : 'Local Storage'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1 Completion & Workflow Standby Notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6 text-slate-800 shadow-subtle space-y-2">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-600" />
          <h4 className="text-sm font-bold text-blue-950">
            Phase 1 Completed — Authentication & Access Guard Active
          </h4>
        </div>
        <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
          The authentication layer, account request protocol, and protected application routing have been successfully established. As specified, the future laboratory workflows (batch testing, clinker/cement parameters, sample management, and quality compliance forms) are on standby and will be connected upon receiving your Phase 2 requirements.
        </p>
      </div>
    </div>
  );
};

