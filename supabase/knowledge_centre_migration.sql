-- ==============================================================================
-- CHITTORTECH QA LABORATORY MANAGEMENT SYSTEM — KNOWLEDGE & COMPLIANCE CENTRE
-- 13 Independent Knowledge, Standards, Learning, Quiz & Checklist Tables
-- Run this script manually in the Supabase SQL Editor after review.
-- NOTE: RLS is intentionally left disabled per project configuration.
-- ==============================================================================

-- 1. Knowledge Categories
create table if not exists public.knowledge_categories (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  name text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Knowledge Articles (Content Management Foundation — Text Only)
create table if not exists public.knowledge_articles (
  id uuid default gen_random_uuid() primary key,
  article_code text not null unique,
  category_id uuid references public.knowledge_categories(id) on delete set null,
  category_slug text not null,
  subcategory text not null,
  title text not null,
  short_description text not null,
  detailed_content text not null,
  related_standards text,
  related_clauses text,
  related_equipment text,
  related_parameters text,
  official_source_url text,
  edition_revision text,
  publication_date text,
  last_verified_date date,
  reviewer text,
  content_status text not null default 'Published' check (
    content_status in ('Draft', 'Under Review', 'Published', 'Needs Update', 'Archived')
  ),
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Knowledge Article Revisions (Immutable Revision History)
create table if not exists public.knowledge_article_revisions (
  id uuid default gen_random_uuid() primary key,
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  revision_number integer not null,
  title text not null,
  short_description text not null,
  detailed_content text not null,
  edition_revision text,
  content_status text not null,
  change_summary text,
  edited_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Standard References (BIS / NABL / ISO)
create table if not exists public.knowledge_standard_references (
  id uuid default gen_random_uuid() primary key,
  authority text not null check (authority in ('BIS', 'NABL', 'ISO', 'ASTM')),
  standard_number text not null unique,
  title text not null,
  subject_category text not null,
  applicable_material text,
  scope_purpose text not null,
  related_parameters text,
  related_methods text,
  related_equipment text,
  edition_info text,
  amendment_info text,
  status text not null default 'Current' check (
    status in ('Current', 'Superseded', 'Under Verification')
  ),
  official_url text not null,
  last_verified_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Compliance Reference Mappings
create table if not exists public.knowledge_compliance_mappings (
  id uuid default gen_random_uuid() primary key,
  laboratory_activity text not null,
  reference_document text not null,
  clause_section text not null,
  requirement_summary text not null,
  practical_explanation text not null,
  related_records text not null,
  official_source text not null,
  applicability_notes text,
  last_verified_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Technical Glossary
create table if not exists public.knowledge_glossary (
  id uuid default gen_random_uuid() primary key,
  term text not null unique,
  full_form text not null,
  simple_meaning text not null,
  technical_explanation text not null,
  practical_example text,
  related_topics text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Learning Paths
create table if not exists public.knowledge_learning_paths (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  track_type text not null check (track_type in ('Beginner', 'Practical', 'Role-Based')),
  target_role text,
  title text not null,
  description text not null,
  topics jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Quiz Questions
create table if not exists public.knowledge_quiz_questions (
  id uuid default gen_random_uuid() primary key,
  topic_slug text not null,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Quiz Attempts
create table if not exists public.knowledge_quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  topic_slug text not null,
  score integer not null,
  total_questions integer not null,
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Quality Assurance Checklists
create table if not exists public.knowledge_checklists (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  purpose text not null,
  applicable_activity text not null,
  guidance_type text not null default 'ChittorTech Operational Guidance',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Checklist Items
create table if not exists public.knowledge_checklist_items (
  id uuid default gen_random_uuid() primary key,
  checklist_id uuid not null references public.knowledge_checklists(id) on delete cascade,
  item_order integer not null,
  item_text text not null,
  reference_note text
);

-- 12. Checklist Responses
create table if not exists public.knowledge_checklist_responses (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  checklist_slug text not null,
  checklist_title text not null,
  responsible_person text not null,
  completion_date date not null,
  review_status text not null default 'Completed' check (
    review_status in ('Draft', 'Completed', 'Reviewed')
  ),
  items jsonb not null default '[]'::jsonb,
  remarks text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. User Learning Progress
create table if not exists public.knowledge_user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  item_type text not null check (item_type in ('article', 'learning_topic', 'nabl_step')),
  item_key text not null,
  completed boolean not null default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, item_type, item_key)
);

-- Indexes
create index if not exists idx_kc_articles_cat_status on public.knowledge_articles (category_slug, content_status);
create index if not exists idx_kc_articles_title on public.knowledge_articles (title);
create index if not exists idx_kc_revisions_article on public.knowledge_article_revisions (article_id, revision_number desc);
create index if not exists idx_kc_standards_auth on public.knowledge_standard_references (authority, status);
create index if not exists idx_kc_quiz_attempts_user on public.knowledge_quiz_attempts (user_id, completed_at desc);
create index if not exists idx_kc_checklist_resp_user on public.knowledge_checklist_responses (user_id, created_at desc);
create index if not exists idx_kc_progress_user on public.knowledge_user_progress (user_id, item_type);

-- Disable RLS & grant permissions per project configuration
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'knowledge_categories',
    'knowledge_articles',
    'knowledge_article_revisions',
    'knowledge_standard_references',
    'knowledge_compliance_mappings',
    'knowledge_glossary',
    'knowledge_learning_paths',
    'knowledge_quiz_questions',
    'knowledge_quiz_attempts',
    'knowledge_checklists',
    'knowledge_checklist_items',
    'knowledge_checklist_responses',
    'knowledge_user_progress'
  ])
  loop
    execute format('alter table public.%I disable row level security;', t);
    execute format('grant all on public.%I to anon, authenticated, service_role;', t);
  end loop;
end $$;

notify pgrst, 'reload schema';

