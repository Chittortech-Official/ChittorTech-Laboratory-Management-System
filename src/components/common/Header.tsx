'use client';

import React from 'react';
import Image from 'next/image';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { user, logout, isConfigured } = useAuth();

  const handleSignOut = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-subtle">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ChittorTech Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white p-1.5 shadow-subtle">
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
              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200 uppercase">
                LMS
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-none">
              Laboratory Management System
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Connection Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
            <span
              className={`h-2 w-2 rounded-full ${
                isConfigured ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-medium">
              {isConfigured ? 'Supabase Live' : 'Sandbox Storage'}
            </span>
          </div>

          {/* User profile dropdown or indicator */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.fullName || 'Clinical User'}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-blue-500" />
                <span>Authorized Staff</span>
              </p>
            </div>
          </div>

          {/* Sign Out CTA */}
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out of laboratory session"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-subtle hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

