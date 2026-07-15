-- AI COMPLIANCE REVIEW FEATURE SCHEMA MIGRATION
-- Target: Supabase (PostgreSQL)

-- 1. Enable UUID Extension if not exists
create extension if not exists "uuid-ossp";

-- 2. Create Companies Table
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.users(id) on delete set null
);

-- 3. Create Company Members Table (Tenancy / Membership)
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role varchar default 'Member' not null, -- 'Admin', 'Member'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (company_id, user_id)
);

-- 4. Create Tax Periods Table (Holding figures for validation checks)
create table public.tax_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  period_name varchar not null, -- e.g., "2026-06"
  
  -- VAT Figures
  vat_declared_output numeric default 0 not null,
  vat_declared_input numeric default 0 not null,
  efris_sales_total numeric default 0 not null,
  vat_input_invalid_tin numeric default 0 not null,
  
  -- PAYE Figures
  payroll_register_count integer default 0 not null,
  payroll_register_gross numeric default 0 not null,
  paye_schedule_count integer default 0 not null,
  paye_schedule_tax numeric default 0 not null,
  
  -- Income Tax & Financial Figures
  financial_gross_margin numeric default 0 not null, -- Gross profit percentage (e.g., 0.35)
  financial_sales numeric default 0 not null,
  supplier_tins_total_count integer default 0 not null,
  supplier_tins_invalid_count integer default 0 not null,
  
  -- Cross-check & Math Validation
  nssf_contribution_total numeric default 0 not null,
  is_nil_return boolean default false not null,
  supporting_documents_present boolean default true not null,
  duplicate_invoices_count integer default 0 not null,
  negative_balances_present boolean default false not null,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (company_id, period_name)
);

-- 5. Create Compliance Reviews Table
create table public.compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  period varchar not null, -- e.g., "2026-06"
  status varchar not null check (status in ('ready_to_file', 'review_required', 'high_risk')),
  estimated_exposure numeric default 0 not null,
  confidence numeric default 100 not null,
  ai_summary text, -- Nullable professional summary
  reviewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_by uuid references public.users(id) on delete set null
);

-- 6. Create Findings Table
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references public.compliance_reviews(id) on delete cascade not null,
  code varchar not null, -- e.g., "XVAL-003"
  severity varchar not null check (severity in ('critical', 'warning', 'info')),
  area varchar not null, -- e.g., "VAT", "PAYE", "Income Tax", "Cross-Check", "Historical", "Math"
  title varchar not null,
  description text not null,
  reason text not null,
  impact text not null, -- Must use strict hedged-language phrasings
  recommendation text not null,
  legislation_ref varchar,
  exposure numeric default 0 not null,
  confidence numeric default 100 not null,
  status varchar default 'open' not null check (status in ('open', 'resolved', 'ignored')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Create Finding Actions Table (Audit Trail)
create table public.finding_actions (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid references public.findings(id) on delete cascade not null,
  action_by uuid references public.users(id) on delete cascade not null,
  action varchar not null check (action in ('resolve', 'ignore', 'reopen')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- Row Level Security (RLS) & Helper Functions
-- ==========================================

-- Helper function to check company membership (Security Definer avoids recursive RLS)
create or replace function public.is_company_member(cid uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.company_members
    where company_id = cid and user_id = auth.uid()
  );
end;
$$;

-- Enable RLS on all newly created tables
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.tax_periods enable row level security;
alter table public.compliance_reviews enable row level security;
alter table public.findings enable row level security;
alter table public.finding_actions enable row level security;

-- Policies for public.companies
create policy "Users can view companies they are members of" on public.companies
  for select using (public.is_company_member(id) or public.is_admin());

create policy "Users can update companies they are members of" on public.companies
  for update using (public.is_company_member(id) or public.is_admin());

create policy "Users can insert companies" on public.companies
  for insert with check (auth.uid() is not null);

-- Policies for public.company_members
create policy "Users can view members of companies they are members of" on public.company_members
  for select using (public.is_company_member(company_id) or public.is_admin());

create policy "Users can insert company members" on public.company_members
  for insert with check (auth.uid() is not null);

create policy "Users can manage company members" on public.company_members
  for all using (public.is_company_member(company_id) or public.is_admin());

-- Policies for public.tax_periods
create policy "Users can view tax periods of companies they are members of" on public.tax_periods
  for select using (public.is_company_member(company_id) or public.is_admin());

create policy "Users can manage tax periods of companies they are members of" on public.tax_periods
  for all using (public.is_company_member(company_id) or public.is_admin());

-- Policies for public.compliance_reviews
create policy "Users can view compliance reviews of companies they are members of" on public.compliance_reviews
  for select using (public.is_company_member(company_id) or public.is_admin());

create policy "Users can manage compliance reviews of companies they are members of" on public.compliance_reviews
  for all using (public.is_company_member(company_id) or public.is_admin());

-- Policies for public.findings
create policy "Users can view findings associated with their company reviews" on public.findings
  for select using (
    exists (
      select 1 from public.compliance_reviews r
      where r.id = review_id and (public.is_company_member(r.company_id) or public.is_admin())
    )
  );

create policy "Users can manage findings associated with their company reviews" on public.findings
  for all using (
    exists (
      select 1 from public.compliance_reviews r
      where r.id = review_id and (public.is_company_member(r.company_id) or public.is_admin())
    )
  );

-- Policies for public.finding_actions
create policy "Users can view finding actions associated with their company reviews" on public.finding_actions
  for select using (
    exists (
      select 1 from public.findings f
      join public.compliance_reviews r on f.review_id = r.id
      where f.id = finding_id and (public.is_company_member(r.company_id) or public.is_admin())
    )
  );

create policy "Users can manage finding actions associated with their company reviews" on public.finding_actions
  for all using (
    exists (
      select 1 from public.findings f
      join public.compliance_reviews r on f.review_id = r.id
      where f.id = finding_id and (public.is_company_member(r.company_id) or public.is_admin())
    )
  );

-- ==========================================
-- Seed Data for Testing & Demo Mode
-- ==========================================

-- Insert a demo company and memberships
insert into public.companies (id, name) values
('c17bf7ee-3382-4467-88e3-ea6222bde971', 'Uganda Premium Trade Ltd')
on conflict (id) do nothing;

-- Ensure membership is seeded during runtime based on active users or demo user.
