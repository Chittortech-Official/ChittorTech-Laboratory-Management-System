-- ==============================================================================
-- CHITTORTECH LABORATORY MANAGEMENT SYSTEM — PHASE 1 SUPABASE SCHEMA
-- Project: ChittorTech-Laboratory-Management-System (znouayrbfheqqhlqfuf)
-- ==============================================================================

-- 1. Create Profiles table (mirrors auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text default 'technician',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Create Laboratory Records table
create table if not exists public.laboratory_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  record_date date not null,
  category_id text not null,
  category_name text not null,
  category_option_id text,
  notes text,
  status text default 'draft' check (status in ('draft', 'submitted', 'archived')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Laboratory Records
alter table public.laboratory_records enable row level security;

create policy "Authenticated users can create laboratory records"
  on public.laboratory_records for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can view their own laboratory records"
  on public.laboratory_records for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own laboratory records"
  on public.laboratory_records for update
  to authenticated
  using (auth.uid() = user_id);

-- 3. Trigger to create user profile upon auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'technician'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

