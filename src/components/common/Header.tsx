'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  LogOut, User, ShieldCheck, Building2, ChevronDown, 
  Copy, Check, Settings, Mail, Database, Edit3, 
  Sparkles, Award, Shield, X, RefreshCw, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmationModal } from '@/contexts/ConfirmationModalContext';

interface HeaderProps {
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, onOpenSettings }) => {
  const { user, logout, isConfigured, updateProfile } = useAuth();
  const { showSuccess, showError } = useConfirmationModal();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Edit Profile Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPlantName, setEditPlantName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Open Edit Profile Modal with current values
  const handleOpenEdit = () => {
    setEditFullName(user?.fullName || (user?.email ? user.email.split('@')[0] : 'QA Chemist'));
    setEditDesignation(user?.designation || 'Quality Assurance Specialist');
    setEditPlantName(user?.plantName || 'Main QA Lab - Chittor Plant');
    setEditCompanyName(user?.companyName || 'ChittorTech Materials Ltd');
    setSaveSuccess(false);
    setIsProfileOpen(false);
    setIsEditingProfile(true);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        fullName: editFullName.trim(),
        designation: editDesignation.trim(),
        plantName: editPlantName.trim(),
        companyName: editCompanyName.trim(),
      });
      setIsSaving(false);
      setSaveSuccess(true);
      showSuccess({
        type: 'profile',
        title: 'Profile Updated',
        message: 'Your profile has been successfully updated.',
        description: `${editFullName.trim()} • ${editPlantName.trim()}`,
      });
      setTimeout(() => {
        setIsEditingProfile(false);
        setSaveSuccess(false);
      }, 900);
    } catch (err: any) {
      setIsSaving(false);
      showError({
        title: 'Profile Update Failed',
        message: err?.message || 'Failed to update profile details.',
      });
    }
  };

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      await logout();
    }
  };

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.email) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(user.email);
      }
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.warn('Clipboard write notice:', err);
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
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'QA';

  const plantName = user?.plantName || 'Main QA Lab • ChittorTech Facility';
  const roleName = user?.designation || (user?.role ? user.role.toUpperCase().replace('_', ' ') : 'QA ENGINEER');
  const companyName = user?.companyName || 'ChittorTech Materials Quality Assurance';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="flex h-16 w-full items-center justify-between px-3 sm:px-5 lg:px-6">
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
          <div className="flex items-center gap-2.5 sm:gap-3">
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

            {/* ENTERPRISE PROFILE TRIGGER & DROPDOWN (Settings is accessible inside) */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                  isProfileOpen
                    ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Avatar Circle with robust solid background */}
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-xs shadow-xs shrink-0">
                  <span>{userInitials}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>

                {/* Name & Plant snippet (desktop) */}
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[220px]">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight flex items-center gap-1 truncate max-w-[220px]">
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
                    {/* Big Branded Avatar Circle */}
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white font-extrabold text-xl shadow-md ring-4 ring-blue-50">
                      <span>{userInitials}</span>
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

                      <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
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
                  <div className="py-2.5 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      Security Protocol
                    </span>
                    <span className="text-slate-700 font-medium">
                      ISO / ASTM / BIS Audit Ready
                    </span>
                  </div>

                  {/* 4. Action Buttons (Edit Profile + Settings + Sign Out) */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200/80 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Profile & Facility Info
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenSettings?.();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      Account & Laboratory Node Settings
                    </button>

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

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Edit3 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">Edit Profile & Facility</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-4">
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name / Operator *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Kush Sharma"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
                />
              </div>

              {/* Designation / Role */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  placeholder="e.g. Quality Assurance Chemist / Lab Incharge"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
                />
              </div>

              {/* Plant / Facility Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Plant / Facility Name
                </label>
                <input
                  type="text"
                  value={editPlantName}
                  onChange={(e) => setEditPlantName(e.target.value)}
                  placeholder="e.g. Main QA Lab - Ball Mill Circuit"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
                />
              </div>

              {/* Company / Organization Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="e.g. ChittorTech Materials Ltd"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
                />
              </div>

              {/* Read-only email notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Work Email:</span> {user?.email} (managed via Supabase Auth)
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
