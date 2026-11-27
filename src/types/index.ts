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
  shift?: 'Night Shift' | 'General' | 'Shift B' | 'Shift A' | 'Shift C' | string;
  loi: number | null; // Loss on Ignition (%)
  ir: number | null; // Insoluble Residue (%)
  so3: number | null; // Sulphur Trioxide (%)
  silica: number | null; // SiO2 (%)
  alumina: number | null; // Al2O3 (%)
  iron: number | null; // Fe2O3 (%)
  lime: number | null; // CaO (%)
  magnesia: number | null; // MgO (%)
  k2o?: number | null; // K2O (%)
  na2o?: number | null; // Na2O (%)
  na2o_eq?: number | null; // Total Equivalent Alkalis = Na2O + 0.658 * K2O (%)
  chloride: number | null; // Cl (%)
  free_lime?: number | null; // Free Lime (%)
  cv?: number | null; // Coating Value
  lv?: number | null; // Liquid Value
  total_oxides?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type LaboratoryRecordPayload = Omit<LaboratoryRecord, 'id' | 'created_at' | 'updated_at'>;

export type ChemicalParameterKey =
  | 'loi'
  | 'ir'
  | 'so3'
  | 'silica'
  | 'alumina'
  | 'iron'
  | 'lime'
  | 'magnesia'
  | 'k2o'
  | 'na2o'
  | 'chloride'
  | 'free_lime';

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
  | 'reports'
  | 'laboratory_resources'
  | 'knowledge_centre'
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

export interface ChangedFieldDiff {
  field: string;
  label: string;
  old_value: string | number | null;
  new_value: string | number | null;
}

export interface AuditLogEntry {
  id: string;
  record_id: string;
  sample_id?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  changed_by_id: string;
  changed_by_name: string;
  changed_by_email?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  changed_fields?: ChangedFieldDiff[] | null;
  reason: string;
  created_at: string;
}

export type MechanicalParameterKey =
  | 'residue_45'
  | 'residue_90'
  | 'residue_212'
  | 'nc_pct'
  | 'blaine_m2_kg'
  | 'ist_min'
  | 'fst_min'
  | 'soundness_le_chat'
  | 'soundness_autoclv'
  | 'cs_1d'
  | 'cs_3d'
  | 'cs_7d'
  | 'cs_28d';

export interface MechanicalTestRecord {
  id?: string;
  user_id: string;
  test_date: string;
  category: string;
  shift?: string;
  residue_45: number | null;
  residue_90: number | null;
  residue_212: number | null;
  nc_pct: number | null;
  blaine_m2_kg: number | null;
  ist_min: number | null;
  fst_min: number | null;
  soundness_le_chat: number | null;
  soundness_autoclv: number | null;
  cs_1d: number | null;
  cs_3d: number | null;
  cs_7d: number | null;
  cs_28d: number | null;
}

export interface CoalTestRecord {
  id?: string;
  user_id: string;
  test_date: string;
  coal_stream: 'Kiln Coal' | 'PC Coal' | 'MIXED' | 'NKiln Coal' | 'NPC Coal' | 'NMIXED' | string;
  im_pct: number | null;
  vm_pct: number | null;
  ash_pct: number | null;
  gcv: number | null;
  fc_pct: number | null;
  uhv: number | null;
}

export type SupportIssueCategory =
  | 'Bug / Technical Issue'
  | 'Website Glitch'
  | 'Login / Authentication Problem'
  | 'Data Entry Issue'
  | 'Calculation / Formula Issue'
  | 'Report / Export Issue'
  | 'Performance / Loading Issue'
  | 'Feature Request'
  | 'General Inquiry'
  | 'Other';

export type SupportPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type SupportTicketStatus =
  | 'Open'
  | 'In Progress'
  | 'Awaiting User Response'
  | 'Resolved'
  | 'Closed';

export interface SupportTicket {
  id: string;
  ticket_id: string;
  user_id: string;
  full_name: string;
  email: string;
  issue_category: SupportIssueCategory | string;
  issue_title: string;
  description: string;
  affected_module: string;
  priority: SupportPriority;
  status: SupportTicketStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}
