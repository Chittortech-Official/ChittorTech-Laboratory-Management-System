'use client';

import React, { useState } from 'react';
import {
  Crown,
  Lock,
  Sparkles,
  BookOpen,
  ShieldCheck,
  FlaskConical,
  Languages,
  ArrowRight,
  CheckCircle2,
  Building2,
  LayoutDashboard,
  Clock,
  X,
} from 'lucide-react';

interface AiAssistantComingSoonProps {
  onOpenKnowledgeCentre: () => void;
  onBackToDashboard: () => void;
  onRequestUpgrade?: () => void;
}

const ENTERPRISE_ENTITLEMENTS = [
  'Instant lookup across BIS Cement & Material Standards (IS 269, IS 1489, IS 455, IS 4031, IS 4032)',
  'Clause-by-clause NABL & ISO/IEC 17025:2017 audit readiness guidance (NABL 131, 141, 142, 163)',
  'Cement QA diagnostics for LOI, Bogue phases, LSF, Blaine fineness & CTM strength',
  'Natural English, Hindi & Hinglish queries built for plant-floor chemists',
  'Traceable official source citations formatted for NABL assessment reviews',
  'Organization-wide multi-chemist licensing with dedicated SLA support',
];

const CAPABILITY_PREVIEWS = [
  {
    icon: <BookOpen className="w-5 h-5 text-[#2563EB]" />,
    badge: 'BIS Standards Engine',
    title: 'Cement & Clinker Specifications',
    description:
      'Verified cross-referencing across OPC, PPC, PSC specifications, chemical methods, and physical test parts.',
    accentBg: 'bg-[#EAF3FF] border-[#D6E8FF]',
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-[#0F9D92]" />,
    badge: 'NABL & ISO 17025',
    title: 'Accreditation & Audit Intelligence',
    description:
      'Structured answers on calibration traceability, PT/ILC z-scores, measurement uncertainty, and CAPA closure.',
    accentBg: 'bg-[#CCFBF1]/60 border-[#99F6E4]',
  },
  {
    icon: <FlaskConical className="w-5 h-5 text-[#2563EB]" />,
    badge: 'QA Lab Diagnostics',
    title: 'Root-Cause & Formula Support',
    description:
      'Fast operational guidance for curing drift, autoclave expansion, Vicat needle anomalies, and XRF checks.',
    accentBg: 'bg-[#EAF3FF] border-[#D6E8FF]',
  },
  {
    icon: <Languages className="w-5 h-5 text-[#0F9D92]" />,
    badge: 'Multilingual Desk',
    title: 'English, Hindi & Hinglish',
    description:
      'Designed so senior quality managers and shift laboratory technicians get clear answers in their preferred language.',
    accentBg: 'bg-[#CCFBF1]/60 border-[#99F6E4]',
  },
];

export const AiAssistantComingSoon: React.FC<AiAssistantComingSoonProps> = ({
  onOpenKnowledgeCentre,
  onBackToDashboard,
  onRequestUpgrade,
}) => {
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Enterprise Upgrade Hero — Unified ChittorTech Light Industrial Palette */}
      <div className="relative overflow-hidden rounded-2xl border border-[#D6E8FF] bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column — Enterprise Gate Message & CTAs */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-gradient-to-br from-white via-[#FAFCFF] to-[#F5F9FF] space-y-6">
            <div className="space-y-4">
              {/* Top Tier Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  Enterprise Premium Required
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[11px] font-semibold text-[#475569]">
                  <Lock className="w-3 h-3 text-[#64748B]" />
                  Locked on Standard Plan
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-bold uppercase tracking-widest text-[#2563EB]">
                  ChittorTech Enterprise QA Intelligence
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F172A] leading-tight">
                  Premium Subscription Required for{' '}
                  <span className="text-[#2563EB]">
                    ChittorTech BIS &amp; NABL AI Assistant
                  </span>
                </h2>
                <p className="text-sm text-[#475569] leading-relaxed max-w-2xl">
                  The <strong>ChittorTech BIS &amp; NABL AI Assistant</strong> is an enterprise capability engineered for accredited cement and materials testing laboratories. Upgrade your laboratory license to unlock real-time standards intelligence, NABL audit guidance, and plant-wide AI QA support.
                </p>
              </div>
            </div>

            {/* Action Buttons + Note */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeNotice(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:from-[#1D4ED8] hover:to-[#1E40AF] transition-all"
                >
                  <Crown className="w-4 h-4 text-amber-200" />
                  <span>Upgrade to Enterprise Premium</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onOpenKnowledgeCentre}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-[#1E293B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse Knowledge &amp; Compliance Centre</span>
                </button>

                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#475569]">
                <Building2 className="w-4 h-4 text-[#0F9D92] shrink-0" />
                <span>
                  All laboratory entries, calculations, reports, resources, and the verified <strong>Knowledge &amp; Compliance Centre</strong> remain fully active on your current plan.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column — Soft Ice-Blue & Teal Enterprise Entitlements Panel */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#D6E8FF] bg-gradient-to-br from-[#EFF6FF] via-[#F5F9FF] to-[#F0FDFA] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#3B82F6]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#0F9D92]/10 blur-3xl" />

            <div className="relative space-y-5">
              <div className="flex items-center justify-between gap-2 border-b border-[#D6E8FF] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#D6E8FF] shadow-sm">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-wide text-[#0F172A]">
                      ChittorTech Enterprise AI Suite
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      BIS &amp; NABL Intelligence Add-On
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 shadow-sm">
                  Premium
                </span>
              </div>

              <ul className="space-y-3">
                {ENTERPRISE_ENTITLEMENTS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-[#334155] leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-[#0F9D92] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mt-6 pt-4 border-t border-[#D6E8FF] flex items-center justify-between gap-3 text-[11px] text-[#64748B]">
              <span className="font-medium">Current Plan: Standard QA Lab</span>
              <span className="inline-flex items-center gap-1 font-bold text-[#2563EB]">
                <Lock className="w-3 h-3" />
                License Upgrade Needed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Included Capabilities Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
            Included in ChittorTech BIS &amp; NABL AI Premium
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <Crown className="w-3 h-3" />
            Enterprise Module
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAPABILITY_PREVIEWS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm flex items-start gap-4"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${item.accentBg}`}
              >
                {item.icon}
              </div>
              <div className="space-y-1">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  {item.badge}
                </span>
                <h4 className="text-sm font-bold text-[#0F172A]">{item.title}</h4>
                <p className="text-xs text-[#475569] leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Modal on Upgrade Click */}
      {showUpgradeNotice && (
        <div className="fixed inset-0 z-[100] !mt-0 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-[#D6E8FF] bg-white shadow-2xl overflow-hidden my-auto">
            <div className="bg-gradient-to-r from-[#EAF3FF] via-[#F5F9FF] to-[#CCFBF1]/40 border-b border-[#D6E8FF] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#D6E8FF] shadow-sm">
                  <Crown className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Coming Soon
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    ChittorTech Enterprise AI Upgrade
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeNotice(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-white hover:text-[#0F172A] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Enterprise Billing &amp; Activation — Coming Soon</p>
                  <p className="leading-relaxed">
                    Self-serve subscription upgrades for the <strong>ChittorTech BIS &amp; NABL AI Assistant</strong> are launching shortly. Your laboratory workspace will be notified as soon as Enterprise AI plans go live.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                {onRequestUpgrade && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpgradeNotice(false);
                      onRequestUpgrade();
                    }}
                    className="rounded-xl border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                  >
                    Contact Support
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowUpgradeNotice(false)}
                  className="rounded-xl bg-[#2563EB] px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
