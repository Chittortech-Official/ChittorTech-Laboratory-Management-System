'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Check
} from 'lucide-react';

interface CalendarPickerProps {
  value: string; // ISO format 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  error?: string;
  disabled?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  value,
  onChange,
  error,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view date based on value or today
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      const parsed = new Date(value + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Calendar calculations
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const prevMonthDays = (year: number, month: number) => new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDate = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const formatted = `${year}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formatted = `${today.getFullYear()}-${mm}-${dd}`;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
  };

  // Build calendar matrix
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const prevTotal = prevMonthDays(viewYear, viewMonth);

  const cells = [];

  // Previous month trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevTotal - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    cells.push({ day: i, month: viewMonth, year: viewYear, isCurrentMonth: true });
  }

  // Next month leading days (fill 42 cells grid = 6 rows)
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: i, month: m, year: y, isCurrentMonth: false });
  }

  // Format display string
  const formatDisplay = (val: string) => {
    if (!val) return '';
    try {
      const d = new Date(val + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return val;
    }
  };

  // Year choices for dropdown
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Clickable Google-Calendar Style Input trigger */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`
          flex w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 sm:py-3 text-left shadow-subtle cursor-pointer transition-all
          ${
            isOpen
              ? 'border-blue-600 ring-2 ring-blue-600/15'
              : error
              ? 'border-red-400 bg-red-50/20'
              : 'border-slate-300 hover:border-slate-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="truncate">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Laboratory Record Date
            </p>
            <p className={`text-sm font-semibold truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
              {value ? formatDisplay(value) : 'Click to select calendar date...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              aria-label="Clear selected date"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors">
            {isOpen ? 'Close' : 'Select'}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600" />
          {error}
        </p>
      )}

      {/* Google Calendar-Style Popup Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Date Picker"
          className="absolute left-0 z-50 mt-2 w-full max-w-[340px] sm:max-w-[360px] rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xl"
        >
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 pt-3 text-center">
            {DAYS_SHORT.map((day) => (
              <span
                key={day}
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-2">
            {cells.map((cell, idx) => {
              const cellStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const isSelected = value === cellStr;
              const isToday = todayStr === cellStr;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cell.year, cell.month, cell.day)}
                  className={`
                    flex h-8 sm:h-9 w-full items-center justify-center rounded-md text-xs font-medium transition-all
                    ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : isToday
                        ? 'border border-blue-500 font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Calendar Quick Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={handleSelectToday}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              <Clock className="h-3 w-3" />
              <span>Jump to Today</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

