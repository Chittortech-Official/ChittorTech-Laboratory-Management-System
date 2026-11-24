-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — DATABASE SCHEMA
-- Project: ChittorTech-Laboratory-Management-System (znouayrbfheqqhlqfuf)
-- Domain: Industrial Quality Assurance / Quality Control (Cement, Manufacturing, Materials)
-- ==============================================================================

-- 1. Create Account Requests Table
-- Public users submit requests here for ChittorTech review and approval.
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
  reviewed_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on Account Requests
alter table public.account_requests enable row level security;

-- Policy: Anyone (unauthenticated public) can submit a request
create policy "Allow public insert for account requests"
  on public.account_requests
  for insert
  to anon, authenticated
  with check (true);

-- Policy: Only authenticated users with admin privileges can view requests
-- (Regular users or anonymous public cannot select, read, update, or delete requests)
create policy "Admin review access for account requests"
  on public.account_requests
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'chittortech_superadmin')
    )
  );

create policy "Admin update access for account requests"
  on public.account_requests
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role in ('admin', 'chittortech_superadmin')
    )
  );

-- 2. Create Profiles Table (Authorized Personnel only)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  company_name text,
  plant_name text,
  designation text,
  role text default 'qa_engineer' check (role in ('qa_engineer', 'qc_chemist', 'lab_manager', 'plant_head', 'admin', 'chittortech_superadmin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 3. Trigger to populate profiles when ChittorTech creates an approved auth user
create or replace function public.handle_new_qa_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, company_name, plant_name, designation, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'plant_name',
    new.raw_user_meta_data->>'designation',
    coalesce(new.raw_user_meta_data->>'role', 'qa_engineer')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_qa_user();
