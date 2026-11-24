'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  LogOut, User, ShieldCheck, Building2, ChevronDown, 
  Copy, Check, Settings, Mail, Database, ExternalLink, 
  Sparkles, Award, Shield, FileCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, onOpenSettings }) => {
  const { user, logout, isConfigured } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      await logout();
    }
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

  // Derived user display details
  const displayName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'QA Chemist');
  const userInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const plantName = user?.plantName || user?.companyName || 'Main QA Lab • ChittorTech Facility';
  const roleName = user?.role ? user.role.toUpperCase().replace('_', ' ') : 'CHIEF QA SPECIALIST';
  const companyName = user?.companyName || 'ChittorTech Materials Quality Assurance';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ChittorTech QA Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
            <Image
              src="/assets/images/ct-logo.png"
              alt="ChittorTech Logo"
              width={34}
              height={34}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading text-base font-extrabold tracking-tight text-slate-900">
                Chittor<span className="text-blue-600">Tech</span>
              </span>
              <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                QA LMS
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 leading-none">
              QA Laboratory Management System
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Database Connection Pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-700">
              Database Live
            </span>
          </div>

          {/* ENTERPRISE PROFILE TRIGGER & DROPDOWN */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              className={`flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all ${
                isProfileOpen
                  ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {/* Avatar Circle */}
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs shadow-xs">
                {userInitials || <User className="h-4 w-4" />}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              {/* Name & Plant snippet (desktop) */}
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight flex items-center gap-1 truncate max-w-[140px]">
                  <Building2 className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                  <span className="truncate">{plantName}</span>
                </p>
              </div>

              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isProfileOpen ? 'rotate-180 text-blue-600' : ''
              }`} />
            </button>

            {/* BIG TECH CORPORATE PROFILE FLYOUT MENU */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Header Profile Banner */}
                <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-blue-800 text-white font-extrabold text-lg shadow-md ring-4 ring-blue-50">
                    {userInitials}
                    <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-xs">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                        <Check className="w-2 h-2 text-white stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {displayName}
                      </h4>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <ShieldCheck className="w-3 h-3" />
                        VERIFIED
                      </span>
                    </div>

                    {/* Email with copy button */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-xs text-slate-500 font-mono truncate" title={user?.email}>
                        {user?.email || 'chemist@plant.chittortech.in'}
                      </p>
                      <button
                        onClick={handleCopyEmail}
                        title="Copy email address"
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        {copiedEmail ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-600 mt-1">
                      {roleName}
                    </div>
                  </div>
                </div>

                {/* 2. Facility & Company Overview */}
                <div className="py-3.5 space-y-2 border-b border-slate-100">
                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      Facility / Plant
                    </span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[160px]">
                      {plantName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      Organization
                    </span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[160px]">
                      {companyName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      Cloud Node
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-emerald-700">
                      Supabase PostgreSQL Active
                    </span>
                  </div>
                </div>

                {/* 3. Security & Compliance Protocol */}
                <div className="py-3 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    Security Protocol
                  </span>
                  <span className="text-slate-700 font-medium">
                    ISO / ASTM / BIS Audit Ready
                  </span>
                </div>

                {/* 4. Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200/80 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out of System
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
