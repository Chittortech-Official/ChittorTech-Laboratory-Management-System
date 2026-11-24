'use client';

import React, { useState } from 'react';
import { CalendarPicker } from './CalendarPicker';
import { ArrowRight, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (dateStr: string) => void;
  onProceed: () => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onDateChange,
  onProceed,
}) => {
  const [error, setError] = useState<string | undefined>();

  const handleContinue = () => {
    if (!selectedDate) {
      setError('Please select a valid laboratory date before proceeding.');
      return;
    }
    setError(undefined);
    onProceed();
  };

  const handleDateSelect = (dateStr: string) => {
    onDateChange(dateStr);
    if (error && dateStr) {
      setError(undefined);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Title & Guidance */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
          <span>Step 1 of 2</span>
          <span>•</span>
          <span>Initial Entry Protocol</span>
        </div>
        <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Specify Laboratory Record Date
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          All subsequent specimen categories, diagnostic entries, and audit logs will be referenced to this clinical calendar date.
        </p>
      </div>

      {/* Date Picker Component Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-subtle space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Record / Specimen Collection Date <span className="text-red-500">*</span>
          </label>
          <CalendarPicker
            value={selectedDate}
            onChange={handleDateSelect}
            error={error}
          />
        </div>

        {/* Selected Date Confirmation Banner */}
        {selectedDate && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">
                Date locked for record creation:
              </p>
              <p className="text-emerald-800 font-mono text-[11px] mt-0.5">
                {selectedDate} (ISO 8601 clinical format)
              </p>
            </div>
          </div>
        )}

        {/* Informational Guidance */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600">
          <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <p className="leading-relaxed">
            Selecting this date preserves the entry context across all category configurations. You will be able to review and modify this date at any point prior to final laboratory submission.
          </p>
        </div>
      </div>

      {/* Action Navigation */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={handleContinue}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-50"
        >
          <span>Continue to Category Selection</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

