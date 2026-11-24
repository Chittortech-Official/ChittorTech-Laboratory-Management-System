'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, Search, Check, X } from 'lucide-react';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export const UNION_TERRITORIES = [
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const StateSelect: React.FC<StateSelectProps> = ({
  value,
  onChange,
  placeholder = 'Select your State / Union Territory',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filtered lists
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return INDIAN_STATES;
    const q = searchQuery.toLowerCase().trim();
    return INDIAN_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredUTs = useMemo(() => {
    if (!searchQuery.trim()) return UNION_TERRITORIES;
    const q = searchQuery.toLowerCase().trim();
    return UNION_TERRITORIES.filter((u) => u.toLowerCase().includes(q));
  }, [searchQuery]);

  const totalResults = filteredStates.length + filteredUTs.length;

  const handleSelect = (item: string) => {
    onChange(item);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between rounded-md border bg-white pl-9 pr-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/15 ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-600/15'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer shadow-subtle'}`}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <MapPin className="h-4 w-4" />
        </span>

        <span
          className={`block truncate ${
            value ? 'font-medium text-slate-900' : 'text-slate-400'
          }`}
        >
          {value || placeholder}
        </span>

        <span className="pointer-events-none ml-2 flex items-center text-slate-400">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-slate-200 bg-white shadow-elevated overflow-hidden animate-fadeIn">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search state or UT..."
                className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto py-1 text-xs">
            {totalResults === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                No matching state or union territory found
              </div>
            ) : (
              <>
                {/* 28 States */}
                {filteredStates.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60 sticky top-0">
                      States ({filteredStates.length})
                    </div>
                    {filteredStates.map((st) => {
                      const isSelected = value === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleSelect(st)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{st}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 8 Union Territories */}
                {filteredUTs.length > 0 && (
                  <div className="mt-1 border-t border-slate-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60 sticky top-0">
                      Union Territories ({filteredUTs.length})
                    </div>
                    {filteredUTs.map((ut) => {
                      const isSelected = value === ut;
                      return (
                        <button
                          key={ut}
                          type="button"
                          onClick={() => handleSelect(ut)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{ut}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
