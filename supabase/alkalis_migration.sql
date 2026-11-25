-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — DEDICATED ALKALI COLUMNS
-- Adds K2O, Na2O, and Total Equivalent Alkalis (Na2Oeq = Na2O + 0.658 * K2O)
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Add dedicated numeric columns for Alkalis
alter table public.laboratory_records
  add column if not exists k2o numeric(6, 2),
  add column if not exists na2o numeric(6, 2),
  add column if not exists na2o_eq numeric(6, 3);

-- 2. Backfill existing records that had [Alkalis: K2O=..., Na2O=...] stored in notes
update public.laboratory_records
set
  k2o = coalesce(
    k2o,
    nullif(substring(notes from 'K2O=([0-9]+\.?[0-9]*)'), '')::numeric(6, 2)
  ),
  na2o = coalesce(
    na2o,
    nullif(substring(notes from 'Na2O=([0-9]+\.?[0-9]*)'), '')::numeric(6, 2)
  )
where notes like '%[Alkalis:%';

-- 3. Compute na2o_eq = Na2O + 0.658 * K2O for all rows with alkali values
update public.laboratory_records
set na2o_eq = round((coalesce(na2o, 0) + 0.658 * coalesce(k2o, 0))::numeric, 3)
where (k2o is not null or na2o is not null);

-- 4. Index for Low-Alkali Cement SQL analytics & trending
create index if not exists idx_lab_records_na2o_eq on public.laboratory_records (na2o_eq);

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';

