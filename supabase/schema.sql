-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — DATABASE FOUNDATION
-- Project: ChittorTech-Laboratory-Management-System (znouayrbfheqqhlqfuf)
-- Domain: Industrial Quality Assurance / Quality Control
-- 
-- NOTE: RLS is intentionally being left disabled during this initial development/setup phase.
-- ==============================================================================

-- 1. Account Requests Table
-- Stores user access requests for review by ChittorTech administrators.
create table if not exists public.account_requests (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  work_email text not null,
  company_name text not null,
  plant_name text not null,
  designation text not null,
  phone text not null,
  city text not null,
  state text not null,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'archived')),
  admin_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for quick lookup by status and work email
create index if not exists idx_account_requests_status on public.account_requests (status);
create index if not exists idx_account_requests_email on public.account_requests (work_email);


-- ==============================================================================
-- 2. Laboratory Test Records Table
-- Stores 9 standard cement & materials chemical oxide testing parameters.
-- ==============================================================================
create table if not exists public.laboratory_records (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  test_date date not null,
  category text not null default 'Ball Mill',
  sample_id text default 'Sample-1',
  shift text default 'General',
  loi numeric(6, 2),
  ir numeric(6, 2),
  so3 numeric(6, 2),
  lime numeric(6, 2),
  silica numeric(6, 2),
  alumina numeric(6, 2),
  iron numeric(6, 2),
  magnesia numeric(6, 2),
  chloride numeric(6, 3),
  total_oxides numeric(6, 2),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_lab_records_user on public.laboratory_records (user_id);
create index if not exists idx_lab_records_date on public.laboratory_records (test_date desc);
create index if not exists idx_lab_records_category on public.laboratory_records (category);
create index if not exists idx_lab_records_sample on public.laboratory_records (sample_id);

alter table public.laboratory_records disable row level security;
grant all on public.laboratory_records to anon, authenticated, service_role;
notify pgrst, 'reload schema';
