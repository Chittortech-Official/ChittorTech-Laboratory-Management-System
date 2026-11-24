export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role?: 'technician' | 'pathologist' | 'admin' | 'supervisor';
  createdAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
}

export type AuthMode = 'login' | 'signup' | 'forgot-password';

/**
 * Laboratory Record Entry types
 */
export interface LaboratoryRecordDraft {
  id?: string;
  userId?: string;
  recordDate: string; // ISO string format YYYY-MM-DD
  categoryId: string; // Identifier matching LabCategory.id
  categoryName: string;
  categoryOptionId?: string; // Phase 1 Step 3 placeholder
  notes?: string;
  status: 'draft' | 'submitted';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Configurable category definition for centralized management
 */
export interface LabCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  iconName: string; // Lucide icon identifier
  badge?: string;
  active: boolean;
}

export type EntryStep = 1 | 2 | 3;

export interface StepConfig {
  step: EntryStep;
  label: string;
  sublabel: string;
  description: string;
}

