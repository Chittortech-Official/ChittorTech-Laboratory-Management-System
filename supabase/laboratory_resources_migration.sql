-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — PHASE 2: LABORATORY RESOURCES
-- ISO/IEC 17025 / NABL Quality & Resource Management Tables
-- Run this script manually in the Supabase SQL Editor after review.
-- NOTE: RLS is intentionally left disabled per project configuration.
-- ==============================================================================

-- 1. Equipment & Calibration Management
create table if not exists public.lab_equipment (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  equipment_code text not null,
  name text not null,
  manufacturer text,
  model text,
  serial_number text,
  location text,
  last_calibration_date date,
  next_calibration_date date,
  calibration_agency text,
  certificate_no text,
  maintenance_notes text,
  status text not null default 'Active' check (
    status in ('Active', 'Calibration Due', 'Under Maintenance', 'Out of Service')
  ),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lab_equipment_user on public.lab_equipment (user_id, created_at desc);
alter table public.lab_equipment disable row level security;
grant all on public.lab_equipment to anon, authenticated, service_role;

-- 2. Document & SOP Management
create table if not exists public.lab_documents (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  doc_code text not null,
  title text not null,
  category text not null default 'SOP' check (
    category in ('SOP', 'Quality Manual', 'Test Method', 'Work Instruction', 'Form / Record')
  ),
  version text not null default '1.0',
  revision_number text not null default 'Rev 00',
  effective_date date,
  review_due_date date,
  prepared_by text,
  reviewed_by text,
  approved_by text,
  standard_ref text,
  summary text,
  remarks text,
  status text not null default 'Approved' check (
    status in ('Draft', 'Under Review', 'Approved', 'Obsolete')
  ),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lab_documents_user on public.lab_documents (user_id, created_at desc);
alter table public.lab_documents disable row level security;
grant all on public.lab_documents to anon, authenticated, service_role;

-- 3. Staff Training & Competency Management
create table if not exists public.lab_staff_competency (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  staff_name text not null,
  employee_id text,
  designation text not null,
  qualified_tests text not null,
  training_topic text not null,
  training_date date,
  assessment_score text,
  competency_status text not null default 'Competent' check (
    competency_status in ('In Training', 'Competent', 'Re-evaluation Due')
  ),
  valid_until date,
  trainer_name text,
  certificate_ref text,
  approved_by text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lab_staff_user on public.lab_staff_competency (user_id, created_at desc);
alter table public.lab_staff_competency disable row level security;
grant all on public.lab_staff_competency to anon, authenticated, service_role;

-- Ensure columns exist if tables were created prior to manual-field additions
alter table public.lab_documents
  add column if not exists revision_number text not null default 'Rev 00',
  add column if not exists prepared_by text,
  add column if not exists reviewed_by text,
  add column if not exists remarks text;

alter table public.lab_staff_competency
  add column if not exists certificate_ref text,
  add column if not exists approved_by text;

notify pgrst, 'reload schema';
