-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — DAILY WORKBOOK MIGRATION
-- Adds Free Lime %, C.V., L.V. to laboratory_records, plus Mechanical & Coal tables
-- Non-destructive migration: preserves all existing records. RLS remains disabled.
-- ==============================================================================

-- 1. Extend public.laboratory_records with Free Lime, C.V., and L.V.
alter table public.laboratory_records
  add column if not exists free_lime numeric(6, 2),
  add column if not exists cv numeric(8, 2),
  add column if not exists lv numeric(8, 2);

-- 2. Mechanical Analysis Table (Daily per Date & Category)
create table if not exists public.mechanical_test_records (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  test_date date not null,
  category text not null,
  shift text default 'General',
  residue_45 numeric(6, 2),
  residue_90 numeric(6, 2),
  residue_212 numeric(6, 2),
  nc_pct numeric(6, 2),
  blaine_m2_kg numeric(8, 2),
  ist_min integer,
  fst_min integer,
  soundness_le_chat numeric(6, 2),
  soundness_autoclv numeric(6, 3),
  cs_1d numeric(6, 2),
  cs_3d numeric(6, 2),
  cs_7d numeric(6, 2),
  cs_28d numeric(6, 2),
  is_deleted boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_mech_records_user_date on public.mechanical_test_records (user_id, test_date desc);
alter table public.mechanical_test_records disable row level security;
grant all on public.mechanical_test_records to anon, authenticated, service_role;

-- 3. Coal Analysis Table (Kiln Coal, PC Coal, MIXED, NKiln Coal, NPC Coal, NMIXED)
create table if not exists public.coal_test_records (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  test_date date not null,
  coal_stream text not null, -- 'Kiln Coal', 'PC Coal', 'MIXED', 'NKiln Coal', 'NPC Coal', 'NMIXED'
  im_pct numeric(6, 3),
  vm_pct numeric(6, 3),
  ash_pct numeric(6, 3),
  gcv numeric(8, 2),
  fc_pct numeric(6, 3),
  uhv numeric(8, 3),
  is_deleted boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_coal_records_user_date on public.coal_test_records (user_id, test_date desc);
alter table public.coal_test_records disable row level security;
grant all on public.coal_test_records to anon, authenticated, service_role;

notify pgrst, 'reload schema';

