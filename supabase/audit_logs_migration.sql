-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — NABL / ISO 17025 CLAUSE 7.5
-- IMMUTABLE AUDIT TRAIL & SOFT-DELETE DATA INTEGRITY MIGRATION
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Create Immutable Audit Log Table
create table if not exists public.laboratory_audit_logs (
  id uuid default gen_random_uuid() primary key,
  record_id uuid not null,
  sample_id text,
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE', 'RESTORE')),
  changed_by_id text not null,
  changed_by_name text not null,
  changed_by_email text,
  old_values jsonb,
  new_values jsonb,
  changed_fields jsonb,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for fast NABL audit trail lookups
create index if not exists idx_audit_logs_record_id on public.laboratory_audit_logs (record_id);
create index if not exists idx_audit_logs_user_id on public.laboratory_audit_logs (changed_by_id);
create index if not exists idx_audit_logs_created_at on public.laboratory_audit_logs (created_at desc);
create index if not exists idx_audit_logs_action on public.laboratory_audit_logs (action);

-- Enforce append-only immutability (no updates or deletes allowed on audit logs)
alter table public.laboratory_audit_logs disable row level security;
grant select, insert on public.laboratory_audit_logs to anon, authenticated, service_role;
revoke update, delete on public.laboratory_audit_logs from anon, authenticated;

-- 2. Add Soft-Delete Columns to laboratory_records (Preserves original record in DB)
alter table public.laboratory_records
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists deleted_by text,
  add column if not exists delete_reason text;

create index if not exists idx_lab_records_not_deleted on public.laboratory_records (is_deleted) where is_deleted = false;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
