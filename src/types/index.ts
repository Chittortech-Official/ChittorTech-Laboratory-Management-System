export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role?: 'qa_engineer' | 'qc_chemist' | 'lab_manager' | 'plant_head' | 'admin';
  companyName?: string;
  plantName?: string;
  designation?: string;
  createdAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
}

export type AuthMode = 'login' | 'request-account' | 'forgot-password' | 'request-success';

/**
 * Account Request Submission Payload for ChittorTech QA LMS
 */
export interface AccountRequestPayload {
  fullName: string;
  workEmail: string;
  companyName: string;
  plantName: string;
  designation: string;
  phone: string;
  city: string;
  state: string;
  reason: string;
}

export interface AccountRequestRecord extends AccountRequestPayload {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'archived';
  createdAt: string;
  adminNotes?: string;
}

/**
 * Laboratory Chemical Analysis Test Record
 */
export interface LaboratoryRecord {
  id: string;
  user_id: string;
  test_date: string; // YYYY-MM-DD
  category: string; // e.g. 'Ball Mill'
  sample_id?: string;
  shift?: 'General' | 'Shift A' | 'Shift B' | 'Shift C';
  loi: number | null; // Loss on Ignition (%)
  ir: number | null; // Insoluble Residue (%)
  so3: number | null; // Sulphur Trioxide (%)
  lime: number | null; // CaO (%)
  silica: number | null; // SiO2 (%)
  alumina: number | null; // Al2O3 (%)
  iron: number | null; // Fe2O3 (%)
  magnesia: number | null; // MgO (%)
  chloride: number | null; // Cl (%)
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type LaboratoryRecordPayload = Omit<LaboratoryRecord, 'id' | 'created_at' | 'updated_at'>;

export type ChemicalParameterKey =
  | 'loi'
  | 'ir'
  | 'so3'
  | 'lime'
  | 'silica'
  | 'alumina'
  | 'iron'
  | 'magnesia'
  | 'chloride';

export interface ParameterMetadata {
  key: ChemicalParameterKey;
  label: string;
  symbol: string;
  formula: string;
  unit: string;
  decimals: number;
  description: string;
}

export type DashboardTab =
  | 'dashboard'
  | 'new_entry'
  | 'previous_records'
  | 'analytics'
  | 'comparison'
  | 'reports'
  | 'email_reports'
  | 'settings';

export interface ParameterAnalysis {
  key: ChemicalParameterKey;
  label: string;
  symbol: string;
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
  change: number | null;
  stdDev: number | null;
}

export interface EmailDispatchHistory {
  id: string;
  recipient: string;
  subject: string;
  reportPeriod: string;
  recordCount: number;
  dispatchedAt: string;
  status: 'SENT' | 'FAILED';
}
