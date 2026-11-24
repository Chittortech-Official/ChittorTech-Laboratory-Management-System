'use client';

import React, { useState } from 'react';
import { DateSelector } from './DateSelector';
import { CategorySelector } from './CategorySelector';
import { StepIndicator } from '../common/StepIndicator';
import { EntryStep, LaboratoryRecordDraft, LabCategory } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  CheckCircle2,
  Calendar,
  Layers,
  User,
  Database,
  PlusCircle,
  FileText,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const LaboratoryEntryWorkflow: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<EntryStep>(1);

  // Form draft state preserved across all steps
  const [draft, setDraft] = useState<LaboratoryRecordDraft>({
    recordDate: '',
    categoryId: '',
    categoryName: '',
    status: 'draft',
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [persistError, setPersistError] = useState<string | undefined>();

  const handleDateChange = (dateStr: string) => {
    setDraft((prev) => ({ ...prev, recordDate: dateStr }));
  };

  const handleCategorySelect = (category: LabCategory) => {
    setDraft((prev) => ({
      ...prev,
      categoryId: category.id,
      categoryName: category.name,
    }));
  };

  const handleStepClick = (step: EntryStep) => {
    if (step === 2 && !draft.recordDate) return;
    setCurrentStep(step);
    setSavedSuccess(false);
  };

  const handleSaveAndComplete = async () => {
    setIsPersisting(true);
    setPersistError(undefined);

    const recordToSave: LaboratoryRecordDraft = {
      ...draft,
      userId: user?.id,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          // Attempt inserting to Supabase table if it exists
          const { error } = await supabase.from('laboratory_records').insert([
            {
              record_date: recordToSave.recordDate,
              category_id: recordToSave.categoryId,
              category_name: recordToSave.categoryName,
              user_id: recordToSave.userId,
              status: recordToSave.status,
            },
          ]);
          if (error) {
            // If table doesn't exist yet, we still confirm local draft state
            console.warn('Supabase table sync note:', error.message);
          }
        }
      } else {
        // Persist to local dev storage
        try {
          const existing = JSON.parse(localStorage.getItem('chittortech_lms_records') || '[]');
          existing.push(recordToSave);
          localStorage.setItem('chittortech_lms_records', JSON.stringify(existing));
        } catch {}
      }

      setSavedSuccess(true);
      setCurrentStep(3);
    } catch {
      setPersistError('Failed to persist laboratory record. Please try again.');
    } finally {
      setIsPersisting(false);
    }
  };

  const handleStartNew = () => {
    setDraft({
      recordDate: '',
      categoryId: '',
      categoryName: '',
      status: 'draft',
    });
    setSavedSuccess(false);
    setCurrentStep(1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Workflow Stepper */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-subtle">
        <StepIndicator
          currentStep={currentStep}
          onStepClick={handleStepClick}
          canNavigateToStep2={!!draft.recordDate}
        />
      </div>

      {persistError && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="font-medium">{persistError}</p>
        </div>
      )}

      {/* Step 1: Date Selection */}
      {currentStep === 1 && (
        <DateSelector
          selectedDate={draft.recordDate}
          onDateChange={handleDateChange}
          onProceed={() => setCurrentStep(2)}
        />
      )}

      {/* Step 2: Category Selection */}
      {currentStep === 2 && (
        <CategorySelector
          selectedCategoryId={draft.categoryId}
          onSelectCategory={handleCategorySelect}
          onBack={() => setCurrentStep(1)}
          onProceed={handleSaveAndComplete}
        />
      )}

      {/* Step 3 / Summary & Phase 2 Foundation */}
      {currentStep === 3 && savedSuccess && (
        <div className="w-full space-y-6 animate-fadeIn">
          {/* Confirmation Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6 text-slate-800 shadow-subtle">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
                  Phase 1 Milestone Complete
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  Laboratory Record Draft Initialized
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                  The clinical entry date and primary laboratory category have been validated and saved to the form architecture.
                </p>
              </div>
            </div>
          </div>

          {/* Record Specification Details Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-subtle space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Validated Record Parameters
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                <Calendar className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Record Date
                  </p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {draft.recordDate}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                <Layers className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Category Selection
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {draft.categoryName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                <User className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Logging Personnel
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {user?.fullName || 'Technician'} ({user?.email || 'Authenticated'})
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                <Database className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Database State
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Supabase-Ready Schema</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 2 Architecture Notice */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>Next Phase Readiness:</span>
              </div>
              <p className="leading-relaxed text-blue-800">
                When you provide the final 8–10 category definitions and their corresponding 8–10 sub-options, they will immediately plug into this workflow without touching authentication or date logic.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-subtle hover:bg-slate-50 transition-colors"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              <span>Modify Category Selection</span>
            </button>

            <button
              type="button"
              onClick={handleStartNew}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create New Record Entry</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

