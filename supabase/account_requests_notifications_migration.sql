-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — ACCOUNT REQUEST NOTIFICATION LOG
-- Provides idempotency / duplicate-event protection for Supabase Webhooks
-- Run this script manually in the Supabase SQL Editor after review.
-- NOTE: RLS is intentionally left disabled per project configuration.
-- ==============================================================================

create table if not exists public.account_request_notifications_log (
  id uuid default gen_random_uuid() primary key,
  account_request_id uuid not null,
  event_key text not null unique,
  event_type text not null check (event_type in ('INSERT', 'UPDATE_APPROVED', 'UPDATE_REJECTED')),
  recipient_email text not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_acc_req_notif_request_id
  on public.account_request_notifications_log (account_request_id);

create index if not exists idx_acc_req_notif_status
  on public.account_request_notifications_log (status);

alter table public.account_request_notifications_log disable row level security;
grant all on public.account_request_notifications_log to anon, authenticated, service_role;

notify pgrst, 'reload schema';

