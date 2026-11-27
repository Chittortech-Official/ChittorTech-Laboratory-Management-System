-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — CONTACT SUPPORT & BUG TICKETS
-- Run this script in the Supabase SQL Editor after review & approval.
-- NOTE: RLS is intentionally left disabled per project configuration.
-- ==============================================================================

create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  ticket_id text not null unique,
  user_id text not null,
  full_name text not null,
  email text not null,
  issue_category text not null,
  issue_title text not null,
  description text not null,
  affected_module text not null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'Open' check (
    status in ('Open', 'In Progress', 'Awaiting User Response', 'Resolved', 'Closed')
  ),
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_support_tickets_user on public.support_tickets (user_id, created_at desc);
create index if not exists idx_support_tickets_ticket_id on public.support_tickets (ticket_id);
create index if not exists idx_support_tickets_status on public.support_tickets (status);

alter table public.support_tickets disable row level security;
grant all on public.support_tickets to anon, authenticated, service_role;

notify pgrst, 'reload schema';

