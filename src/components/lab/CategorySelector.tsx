'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Activity,
  FlaskConical,
  Microscope,
  ShieldCheck,
  Dna,
  Layers,
  Droplets,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Sparkles,
} from 'lucide-react';
import { LABORATORY_CATEGORIES } from '@/data/categories';
import { LabCategory } from '@/types';

// Map icon string names to actual Lucide component
const ICON_MAP: Record<string, React.ElementType> = {
  Activity,
  FlaskConical,
  Microscope,
  ShieldCheck,
  Dna,
  Layers,
  Droplets,
  AlertCircle,
  FileSpreadsheet,
};

interface CategorySelectorProps {
  selectedCategoryId: string;
  onSelectCategory: (category: LabCategory) => void;
  onBack: () => void;
  onProceed: () => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onSelectCategory,
  onBack,
  onProceed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const filteredCategories = LABORATORY_CATEGORIES.filter((cat) => {
    if (!cat.active) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.code.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      (cat.badge && cat.badge.toLowerCase().includes(q))
    );
  });

  const handleSelect = (category: LabCategory) => {
    onSelectCategory(category);
    if (validationError) setValidationError(undefined);
  };

  const handleContinue = () => {
    if (!selectedCategoryId) {
      setValidationError('Please select one of the laboratory categories to proceed.');
      return;
    }
    setValidationError(undefined);
    onProceed();
  };

  const selectedCategory = LABORATORY_CATEGORIES.find((c) => c.id === selectedCategoryId);

  return (
    <div className="w-full space-y-6">
      {/* Step Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
          <span>Step 2 of 2</span>
          <span>•</span>
          <span>Diagnostic Classification</span>
        </div>
        <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Select Laboratory Test Category
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Categorize the entry under the appropriate clinical division. Each category will unlock tailored test parameters in Phase 2.
        </p>
      </div>

      {/* Search / Filter toolbar & Centralized Config Indicator */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories (e.g. Hematology, Culture)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none shadow-subtle"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
          <span>Configurable in:</span>
          <code className="font-mono text-slate-700 bg-white px-1 py-0.5 rounded border border-slate-200">
            src/data/categories.ts
          </code>
        </div>
      </div>

      {validationError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
          <p className="font-medium">{validationError}</p>
        </div>
      )}

      {/* Grid of Categories (supports 8-10 options responsively) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5">
        {filteredCategories.map((category) => {
          const isSelected = category.id === selectedCategoryId;
          const IconComponent = ICON_MAP[category.iconName] || Activity;

          return (
            <div
              key={category.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => handleSelect(category)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleSelect(category);
                }
              }}
              className={`
                group relative flex flex-col justify-between rounded-lg border p-4 text-left cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30 shadow-subtle'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-subtle'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`
                      flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors
                      ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300 group-hover:bg-slate-100'
                      }
                    `}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                        {category.code}
                      </span>
                      {category.badge && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 border border-slate-200">
                          {category.badge}
                        </span>
                      )}
                    </div>
                    <h3
                      className={`text-sm font-bold tracking-tight mt-0.5 ${
                        isSelected ? 'text-blue-950' : 'text-slate-900'
                      }`}
                    >
                      {category.name}
                    </h3>
                  </div>
                </div>

                <div
                  className={`
                    flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all
                    ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                    }
                  `}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>

              <p className="mt-2.5 text-xs text-slate-500 leading-relaxed pl-13">
                {category.description}
              </p>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">No categories found matching &quot;{searchQuery}&quot;</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search term.</p>
        </div>
      )}

      {/* Selected category summary box */}
      {selectedCategory && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-semibold text-blue-950">Active Selection: </span>
              <span className="text-blue-900 font-medium">{selectedCategory.name}</span>
              <span className="text-blue-500 font-mono ml-2">({selectedCategory.code})</span>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-blue-700 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-blue-200">
            Ready for persistence
          </span>
        </div>
      )}

      {/* Form Navigation Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-subtle hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Date</span>
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all"
        >
          <span>Save Record & View Summary</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

