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
