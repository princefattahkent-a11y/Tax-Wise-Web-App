-- TAXWISE UGANDA DATABASE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. Create Tables
-- ==========================================

-- Users profile table (linked to Supabase Auth)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar unique not null,
  full_name varchar,
  role varchar default 'Student',
  plan varchar default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login timestamp with time zone
);

-- Cases analyzed by users
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title varchar not null,
  input_text text,
  pdf_path varchar,
  ai_summary jsonb,
  risk_level varchar check (risk_level in ('low', 'medium', 'high')),
  tags text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TAT Case Precedents Library
create table public.tat_cases (
  id uuid primary key default gen_random_uuid(),
  case_number varchar unique not null,
  title varchar not null,
  year integer not null,
  tax_type varchar not null,
  outcome varchar not null, -- Allowed, Dismissed, Partial
  summary text not null,
  full_text text,
  ai_commentary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Education Courses
create table public.courses (
  id serial primary key,
  title varchar not null,
  level varchar not null, -- Beginner, Intermediate, Professional
  emoji varchar,
  color varchar,
  accent_color varchar,
  description text,
  lessons jsonb default '[]'::jsonb, -- Array of lesson objects [{id, title, duration, content}]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Course Enrollments and Progress
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  course_id integer references public.courses(id) on delete cascade not null,
  progress integer default 0,
  completed_lessons text[] default '{}'::text[], -- e.g., ['1a', '1b']
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, course_id)
);

-- Compliance Check Reports
create table public.compliance_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  type varchar not null, -- efris, vat, paye
  responses jsonb not null, -- Map of checked item IDs
  risk_report text not null,
  score integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscriptions History
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  plan varchar not null, -- free, starter, professional, firm
  flutterwave_ref varchar,
  status varchar not null, -- active, expired, cancelled
  starts_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Site settings controlled by Admin
create table public.site_settings (
  key varchar primary key,
  value text not null
);

-- Audit log for Admin actions
create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  action varchar not null,
  performed_by uuid references public.users(id) on delete cascade not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 2. Row Level Security (RLS) & Helper Functions
-- ==========================================

-- Helper function to check if the current user is an Admin
-- security definer is critical to avoid RLS recursion on the users table.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'Admin'
  );
end;
$$;

alter table public.users enable row level security;
alter table public.cases enable row level security;
alter table public.tat_cases enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.compliance_reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_logs enable row level security;

-- Policies for public.users
create policy "Users can read own data or admin reads all" on public.users
  for select using (auth.uid() = id or public.is_admin());

create policy "Users can update own data or admin updates all" on public.users
  for update using (auth.uid() = id or public.is_admin());

create policy "Admins can delete users" on public.users
  for delete using (public.is_admin());

-- Policies for public.cases
create policy "Users can CRUD own cases" on public.cases
  for all using (auth.uid() = user_id or public.is_admin());

-- Policies for public.tat_cases (Publicly readable)
create policy "Anyone can read TAT precedents" on public.tat_cases
  for select using (true);

create policy "Admins can manage TAT precedents" on public.tat_cases
  for all using (public.is_admin());

-- Policies for public.courses (Publicly readable)
create policy "Anyone can read courses" on public.courses
  for select using (true);

create policy "Admins can manage courses" on public.courses
  for all using (public.is_admin());

-- Policies for public.enrollments
create policy "Users can CRUD own enrollments" on public.enrollments
  for all using (auth.uid() = user_id or public.is_admin());

-- Policies for public.compliance_reports
create policy "Users can CRUD own compliance reports" on public.compliance_reports
  for all using (auth.uid() = user_id or public.is_admin());

-- Policies for public.subscriptions
create policy "Users can read own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Admins can manage subscriptions" on public.subscriptions
  for all using (public.is_admin());

-- Policies for public.site_settings
create policy "Anyone can read site settings" on public.site_settings
  for select using (true);

create policy "Admins can manage site settings" on public.site_settings
  for all using (public.is_admin());

-- Policies for public.admin_logs
create policy "Admins can read admin logs" on public.admin_logs
  for select using (public.is_admin());

create policy "Admins can insert admin logs" on public.admin_logs
  for insert with check (public.is_admin());

-- ==========================================
-- 3. Automatic User Sync Trigger
-- ==========================================

-- Trigger function that automatically creates a public user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'Student'),
    'free'
  );
  return new;
end;
$$;

-- Bind trigger to auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 4. Seed Data
-- ==========================================

-- Seed TAT Case Precedents
insert into public.tat_cases (case_number, title, year, tax_type, outcome, summary, ai_commentary) values
('TAT No. 145 of 2025', 'Edward Mwanje v Uganda Revenue Authority', 2025, 'Jurisdiction', 'Dismissed', 
 'Appeal dismissed for lack of jurisdiction. Taxpayer filed 45 days after URA assessment notice, exceeding the mandatory 30-day filing window under Section 14 of the TAT Act.',
 'This case underscores the strictness of the statutory time limits under Section 14 of the TAT Act. The Tribunal cannot exercise discretion to extend the time if the application is filed late without a formal application for extension on strong legal grounds. Practitioners must diarize the 30-day window the moment an objection decision is received.'),

('TAT No. 112 of 2024', 'Kampala Hardware Ltd v URA', 2024, 'VAT', 'Allowed', 
 'Tribunal ruled in favour of taxpayer on input VAT claims for capital equipment imported for manufacturing. URA''s denial of credits was found to be inconsistent with the VAT Act provisions.',
 'A major win for manufacturers. The Tribunal clarified that input VAT on capital goods imported for business operations is fully claimable under Section 28 of the VAT Act. URA''s attempt to restrict credits based on timing or incomplete internal system records was rejected because physical custom declarations and invoices were intact.'),

('TAT No. 089 of 2024', 'Grace Tumwine v Commissioner General', 2024, 'Income Tax', 'Partial', 
 'Partial relief granted. Tribunal upheld URA''s assessment on business income but struck down penalties imposed without proper notice under Section 52 of the Income Tax Act.',
 'This ruling emphasizes that administrative penalties must comply with procedural fairness. While the underlying tax liability was upheld, the Tribunal struck down the penalties because URA failed to show detailed calculations and did not issue a warning notice. Taxpayers should always scrutinize the penalty assessment documents for procedural defects.'),

('TAT No. 067 of 2023', 'Nile Breweries Ltd v URA', 2023, 'Excise Duty', 'Dismissed', 
 'Appeal dismissed. Tribunal found that excise duty on locally manufactured beverages was correctly applied. Taxpayer''s argument on discriminatory treatment was not supported by evidence.',
 'Demonstrates that challenges based on constitutional arguments (like discrimination in excise tax rates) require a high standard of empirical proof. The Tribunal will defer to the policy intent of Parliament unless there is a clear, unconstitutional violation. Keep arguments focused on statutory interpretation of the Excise Duty Act.'),

('TAT No. 201 of 2024', 'MTN Uganda v Commissioner Domestic Taxes', 2024, 'WHT', 'Allowed', 
 'Withholding tax on cross-border digital services set aside. Tribunal found URA failed to issue proper notice and the assessment was statute-barred under the 5-year limitation rule.',
 'This sets a strong precedent regarding the statute of limitations. Under the Tax Procedures Code Act, URA is barred from raising new assessments after 5 years unless fraud is proven. Since URA could not show fraud, their assessment on cross-border services from 2018 was declared null and void.'),

('TAT No. 033 of 2023', 'Kiboga Farmers Cooperative v URA', 2023, 'PAYE', 'Partial', 
 'PAYE assessment partially upheld. Seasonal workers found to be employees for tax purposes, but penalties reduced due to taxpayer''s good faith reliance on professional advice.',
 'A crucial case on employment status. The Tribunal ruled that the frequency and integration of casual workers into the cooperative''s core business made them employees under the Income Tax Act. However, because the cooperative relied on written professional advice, the Tribunal waived the penal interest, showing that good faith compliance steps matter.')
on conflict (case_number) do nothing;

-- Seed Courses
insert into public.courses (id, title, level, emoji, color, accent_color, description, lessons) values
(1, 'Uganda Tax Fundamentals', 'Beginner', '📘', '#E6F5F2', '#1A7B6B', 
 'Master Income Tax, VAT, PAYE, and withholding tax from scratch. Built for new business owners and accounting students.',
 '[
   {
     "id": "1a",
     "title": "Introduction to Uganda''s Tax System",
     "duration": "15 min",
     "content": "Uganda''s tax system is administered by the Uganda Revenue Authority (URA), established under the Uganda Revenue Authority Act, Cap 196. The main taxes include: **Income Tax** (governed by the Income Tax Act, Cap 340), **Value Added Tax** (VAT Act, Cap 349), **Pay As You Earn** (PAYE — a form of Income Tax), **Withholding Tax**, and **Excise Duty**.\n\nThe URA is divided into the Domestic Taxes Department (handling income tax, VAT, PAYE) and the Customs Department (handling import/export duties).\n\n**Key Principle:** Tax is a legal obligation. Every person earning income above the threshold, every registered business, and every employer must comply with Uganda''s tax laws or face penalties and interest."
   },
   {
     "id": "1b",
     "title": "Income Tax — Who Pays & How Much",
     "duration": "20 min",
     "content": "**Individual Income Tax** applies to all income earned by residents and non-residents from Ugandan sources. Rates for individuals (2024/25):\n\n- Income up to UGX 2,820,000/year: **0% (exempt)**\n- UGX 2,820,001 – 4,920,000: **10%**\n- UGX 4,920,001 – 120,000,000: **20%**\n- Above UGX 120,000,000: **30%**\n\n**Corporate Tax** is charged at **30%** of chargeable income for resident companies. Agribusiness companies enjoy a reduced rate of **25%**.\n\n**Filing:** Individual tax returns are due by **30 June** each year. Corporate returns are due **6 months** after the end of the accounting period."
   },
   {
     "id": "1c",
     "title": "VAT — Registration, Rates & Filing",
     "duration": "25 min",
     "content": "**VAT Registration** is mandatory when taxable turnover exceeds **UGX 150 million** in any 12-month period. Voluntary registration is allowed below this threshold.\n\n**VAT Rates:**\n- Standard rate: **18%** on most goods and services\n- Zero-rated (0%): Exports, some foodstuffs, educational materials\n- Exempt: Medical services, financial services, residential accommodation\n\n**Input VAT:** Registered taxpayers can claim back VAT paid on business purchases (input tax) against VAT collected on sales (output tax). The difference is either paid to URA or refunded.\n\n**Filing:** VAT returns are due on the **15th of the following month**. Late filing attracts a penalty of **2% per month** on the outstanding tax."
   },
   {
     "id": "1d",
     "title": "PAYE — Employer Obligations",
     "duration": "20 min",
     "content": "**PAYE (Pay As You Earn)** requires every employer to deduct income tax from employees'' salaries and remit to URA by the **15th of the following month**.\n\n**Employer Duties:**\n1. Register with URA as an employer\n2. Obtain Tax Identification Numbers (TINs) for all employees\n3. Calculate tax on gross pay minus allowable deductions\n4. Deduct NSSF (10% employee, 10% employer)\n5. File PAYE return and pay by the 15th\n\n**Key Risk:** Failure to deduct and remit PAYE makes the **employer personally liable** for the tax plus 2% monthly interest plus penalties up to 20% of the tax due."
   }
 ]'::jsonb),

(2, 'TAT Appeals: Process & Strategy', 'Intermediate', '⚖️', '#FEF3CD', '#C8922A', 
 'Master the Tax Appeals Tribunal process — from objections to appeals, jurisdiction rules, and building a winning case.',
 '[
   {
     "id": "2a",
     "title": "The TAT — Structure & Jurisdiction",
     "duration": "20 min",
     "content": "The **Tax Appeals Tribunal (TAT)** was established under the Tax Appeals Tribunal Act, Cap 345. It provides an independent forum for taxpayers to challenge URA decisions without going to the High Court first.\n\n**Jurisdiction:** The TAT hears appeals against:\n- URA assessments and amended assessments\n- Refusal to grant refunds\n- Penalties and interest charges\n- Decisions on objections\n\n**Composition:** The TAT consists of a Chairperson (must be an advocate of 10+ years), Deputy Chairperson, and members appointed by the Minister of Finance.\n\n**Critical Limitation:** The TAT **cannot** hear matters where no objection was first filed with URA, or where the 30-day filing window has lapsed."
   },
   {
     "id": "2b",
     "title": "The 30-Day Rule — Uganda''s Most Critical Tax Deadline",
     "duration": "25 min",
     "content": "**Section 14 of the TAT Act** requires that any appeal must be filed **within 30 days** of receiving URA''s objection decision.\n\n**This is the most litigated issue in Uganda tax law.** Missing this deadline means:\n1. The TAT has **no jurisdiction** to hear your appeal\n2. The case will be **dismissed** regardless of its merits\n3. You lose the right to challenge the assessment at TAT level\n\n**Case Study — Edward Mwanje v URA (TAT No. 145/2025):** The taxpayer filed 45 days after receiving URA''s objection decision. The TAT dismissed the appeal for lack of jurisdiction. The merits of the case were never considered.\n\n**Practical Tips:**\n- Diarise the deadline the day you receive URA''s decision\n- File even a basic notice of appeal to preserve jurisdiction\n- Always request an acknowledgement of receipt from TAT"
   },
   {
     "id": "2c",
     "title": "Filing an Objection with URA",
     "duration": "20 min",
     "content": "Before going to TAT, you must first file an **objection with URA**. This is a mandatory pre-condition.\n\n**Objection Requirements (Section 101, Income Tax Act):**\n- Filed within **45 days** of receiving the assessment\n- Must state the **grounds of objection** in detail\n- Must be in **writing** addressed to the Commissioner\n- Must include all supporting documents\n\n**URA''s Response:** URA must issue an objection decision within **90 days**. If they fail to respond within 90 days, the taxpayer may proceed directly to TAT treating the silence as a deemed refusal.\n\n**Deposit Requirement:** Where the assessment is above UGX 50 million, URA may require a deposit of **30% of the disputed tax** before the objection is heard."
   }
 ]'::jsonb),

(3, 'URA eFRIS Mastery', 'Professional', '🖥️', '#E8EDF5', '#0F2044', 
 'Complete compliance guide for Uganda''s Electronic Fiscal Receipting & Invoicing System. For tax agents and business owners.',
 '[
   {
     "id": "3a",
     "title": "What is eFRIS and Who Must Use It",
     "duration": "15 min",
     "content": "**eFRIS (Electronic Fiscal Receipting and Invoicing Solution)** is URA''s system requiring businesses to issue electronic receipts for all taxable sales. It was rolled out in phases starting 2021.\n\n**Who Must Comply:**\n- All VAT-registered taxpayers\n- Businesses with turnover above UGX 50 million\n- Hotels, supermarkets, fuel stations, pharmacies (regardless of turnover)\n- Any business directed by URA to adopt eFRIS\n\n**How It Works:** A fiscal device (Electronic Receipting Device — ERD) is connected to your point of sale. Every sale is transmitted in real-time to URA''s central server and a QR-coded fiscal receipt is issued to the customer.\n\n**Non-Compliance Penalties:** Failure to issue fiscal receipts attracts a penalty of **UGX 2 million per day** of non-compliance."
   },
   {
     "id": "3b",
     "title": "eFRIS Registration & Setup",
     "duration": "20 min",
     "content": "**Step-by-Step eFRIS Registration:**\n\n1. Log in to URA''s TaxPro system (efris.ura.go.ug)\n2. Navigate to eFRIS → Business Registration\n3. Enter your TIN, business name, and branch details\n4. Select your ERD type (integrated VSDC or web-based)\n5. Submit and await URA approval (typically 2-5 business days)\n6. Collect or configure your fiscal device\n7. Test with URA before going live\n\n**Device Types:**\n- **VSDC (Virtual Sales Data Controller):** Software installed on your POS system\n- **Physical ERD:** Hardware device for businesses without POS software\n- **Web-based eFRIS:** Direct web interface for low-volume businesses\n\n**Important:** All devices must be activated by URA before first use. Do not issue receipts on unactivated devices."
   }
 ]'::jsonb)
on conflict (id) do update set
title = excluded.title,
level = excluded.level,
emoji = excluded.emoji,
color = excluded.color,
accent_color = excluded.accent_color,
description = excluded.description,
lessons = excluded.lessons;

-- Seed default site settings
insert into public.site_settings (key, value) values
('stat_cases', '4,200+'),
('stat_time_saved', '85%'),
('stat_practitioners', '350+'),
('stat_calculators', '6'),
('hero_badge_text', 'Built for Uganda Tax & Customs Professionals'),
('hero_title_line1', 'The tax intelligence'),
('hero_title_line2', 'platform your practice'),
('hero_title_line3', 'actually needs'),
('hero_subtitle', 'AI case analysis, TAT precedent research, live tax & import calculators, and compliance checking tools — purpose-built for Uganda''s tax ecosystem.'),
('topbar_text', '🇺🇬 Engineered for Uganda''s Tax & Customs Ecosystem'),
('topbar_email', 'hello@taxwise.cloud')
on conflict (key) do nothing;
