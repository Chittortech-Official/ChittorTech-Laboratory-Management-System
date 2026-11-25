'use client';

import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ConfirmationOperationType } from '@/contexts/ConfirmationModalContext';

interface CentralConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ConfirmationOperationType;
  title: string;
  message: string;
  description?: string;
  duration?: number;
}

export const CentralConfirmationModal: React.FC<CentralConfirmationModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  description,
  duration = 2800,
}) => {
  const modalCardRef = useRef<HTMLDivElement>(null);
  const isError = type === 'error';

  // Keyboard accessibility: Escape closes the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-message"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Subtle Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      {/* Centered Modal Card */}
      <div
        ref={modalCardRef}
        className="relative z-10 w-full max-w-sm sm:max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-900/15 p-6 sm:p-8 text-center overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Central Animated Icon */}
        <div className="flex justify-center mb-5">
          {isError ? (
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-rose-50 border-2 border-rose-100 text-rose-600 shadow-sm">
              <span className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping opacity-30" />
              <AlertTriangle className="w-10 h-10 sm:w-11 sm:h-11 relative z-10 stroke-[2.2]" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-emerald-50 border-2 border-emerald-100 text-emerald-600 shadow-sm">
              {/* Subtle success pulse / glow ring */}
              <span className="absolute inset-0 rounded-full bg-emerald-400/25 success-glow-ring pointer-events-none" />

              {/* Enterprise Animated SVG Checkmark */}
              <svg
                className="w-11 h-11 sm:w-12 sm:h-12 text-emerald-600 relative z-10"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Circular path drawing */}
                <circle
                  className="success-circle-draw"
                  cx="26"
                  cy="26"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                {/* Smooth check drawing */}
                <path
                  className="success-check-draw"
                  d="M15 27L23 35L37 19"
                  stroke="currentColor"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Status Pill Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5 bg-slate-50 border border-slate-200">
          <ShieldCheck className={`w-3.5 h-3.5 ${isError ? 'text-rose-500' : 'text-emerald-600'}`} />
          <span className={isError ? 'text-rose-700' : 'text-emerald-700'}>
            {isError ? 'Action Error' : 'ChittorTech QA Verified'}
          </span>
        </div>

        {/* Modal Heading */}
        <h3
          id="confirmation-modal-title"
          className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-2"
        >
          {title}
        </h3>

        {/* Contextual Success Message */}
        <p
          id="confirmation-modal-message"
          className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed max-w-xs mx-auto"
        >
          {message}
        </p>

        {/* Optional Secondary Detail */}
        {description && (
          <p className="mt-2 text-xs text-slate-400 font-medium font-mono px-3 py-1 bg-slate-50 rounded-lg inline-block max-w-full truncate">
            {description}
          </p>
        )}

        {/* Dismiss / Action Button */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto min-w-[130px] px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-2 ${
              isError
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-400/40'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400/40'
            }`}
          >
            {isError ? 'Close' : 'Continue'}
          </button>
        </div>

        {/* Subtle auto-dismiss progress bar at the bottom */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
            <div
              className={`h-full ${isError ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{
                animation: `successProgress ${duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
