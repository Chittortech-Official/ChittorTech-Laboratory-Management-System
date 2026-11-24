'use client';

import React from 'react';
import { Calendar, Layers, CheckCircle2, ChevronRight, Sliders } from 'lucide-react';
import { EntryStep } from '@/types';

interface StepIndicatorProps {
  currentStep: EntryStep;
  onStepClick?: (step: EntryStep) => void;
  canNavigateToStep2?: boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
  canNavigateToStep2,
}) => {
  const steps = [
    {
      step: 1 as EntryStep,
      title: 'Record Date',
      description: 'Select specimen/entry date',
      icon: Calendar,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'upcoming',
    },
    {
      step: 2 as EntryStep,
      title: 'Lab Category',
      description: 'Choose category option',
      icon: Layers,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'upcoming',
    },
    {
      step: 3 as EntryStep,
      title: 'Specifications',
      description: 'Category options (Phase 2)',
      icon: Sliders,
      status: 'upcoming',
      isFuture: true,
    },
  ];

  return (
    <nav aria-label="Laboratory record creation workflow" className="w-full">
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          const isActive = item.status === 'active';
          const isCompleted = item.status === 'completed';
          const isClickable =
            (item.step === 1 && currentStep !== 1) ||
            (item.step === 2 && currentStep !== 2 && canNavigateToStep2);

          return (
            <li key={item.step} className="relative">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick && onStepClick(item.step)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                  ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30 shadow-subtle'
                      : isCompleted
                      ? 'border-slate-300 bg-white hover:border-slate-400 cursor-pointer shadow-subtle'
                      : 'border-slate-200 bg-slate-50/60 opacity-70 cursor-not-allowed'
                  }
                `}
              >
                <div
                  className={`
                    flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-semibold text-xs transition-colors
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                      Step {item.step}
                    </span>
                    {item.isFuture && (
                      <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-medium text-slate-500">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isActive ? 'text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.description}
                  </p>
                </div>

                {idx < steps.length - 1 && (
                  <ChevronRight className="hidden md:block h-4 w-4 text-slate-300 shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

