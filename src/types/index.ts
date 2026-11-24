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
