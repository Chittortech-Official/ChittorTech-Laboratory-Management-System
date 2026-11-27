-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — DEMO REQUESTS & WEBHOOK LOG
-- Run this script manually in the Supabase SQL Editor after review.
-- NOTE: RLS is intentionally left disabled per project configuration.
-- ==============================================================================

-- 1. Demo Requests Table
create table if not exists public.demo_requests (
  id uuid default gen_random_uuid() primary key,
  demo_request_id text not null unique,
  full_name text not null,
  email text not null,
  mobile_number text not null,
  company_name text not null,
  plant_name text not null,
  designation text,
  city text not null,
  state text not null,
  message text,
  status text not null default 'Pending' check (
    status in ('Pending', 'Contacted', 'Demo Scheduled', 'Demo Completed', 'Cancelled')
  ),
  scheduled_demo_date date,
  scheduled_demo_time text,
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_demo_requests_demo_id on public.demo_requests (demo_request_id);
create index if not exists idx_demo_requests_status on public.demo_requests (status);
create index if not exists idx_demo_requests_created_at on public.demo_requests (created_at desc);

alter table public.demo_requests disable row level security;
grant all on public.demo_requests to anon, authenticated, service_role;

-- 2. Database-Backed Idempotency & Delivery Log for Demo Request Status Webhooks
create table if not exists public.demo_request_notifications_log (
  id uuid default gen_random_uuid() primary key,
  demo_request_id text not null,
  event_key text not null unique,
  event_type text not null,
  recipient_email text not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_demo_notif_demo_id on public.demo_request_notifications_log (demo_request_id);
create index if not exists idx_demo_notif_status on public.demo_request_notifications_log (status);

alter table public.demo_request_notifications_log disable row level security;
grant all on public.demo_request_notifications_log to anon, authenticated, service_role;

notify pgrst, 'reload schema';

