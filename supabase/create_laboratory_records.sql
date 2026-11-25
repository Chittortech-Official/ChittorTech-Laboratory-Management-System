-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — LABORATORY RECORDS TABLE
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/znouayrbfheqqqhlqfuf/sql
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
  chloride numeric(8, 4),
  total_oxides numeric(6, 2),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Performance Indexes for Fast Filtering by User, Category, and Date
create index if not exists idx_lab_records_user on public.laboratory_records (user_id);
create index if not exists idx_lab_records_date on public.laboratory_records (test_date desc);
create index if not exists idx_lab_records_category on public.laboratory_records (category);
create index if not exists idx_lab_records_sample on public.laboratory_records (sample_id);

-- Disable Row Level Security during active setup phase as instructed
alter table public.laboratory_records disable row level security;

-- Grant Full Access to All System Roles
grant all on public.laboratory_records to anon, authenticated, service_role;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';

