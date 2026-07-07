# TaxWise Uganda — Full Project Documentation

**Document Type:** Comprehensive Project Record  
**Platform:** TaxWise Uganda — AI-Powered Tax SaaS Platform  
**Date Range:** June 9, 2026  
**Prepared by:** Claude (Anthropic) — Session Summary  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Vision & Goals](#2-vision--goals)
3. [Design Philosophy](#3-design-philosophy)
4. [Platform Features Built](#4-platform-features-built)
5. [Technology Stack](#5-technology-stack)
6. [Infrastructure & Cost Estimate](#6-infrastructure--cost-estimate)
7. [Database Schema](#7-database-schema)
8. [API Specification](#8-api-specification)
9. [AI Integration](#9-ai-integration)
10. [PDF Processing](#10-pdf-processing)
11. [Authentication & Security](#11-authentication--security)
12. [Payments Integration](#12-payments-integration)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Deployment Plan](#14-deployment-plan)
15. [Build Timeline](#15-build-timeline)
16. [Admin Portal](#16-admin-portal)
17. [Error Handling](#17-error-handling)
18. [Future Roadmap](#18-future-roadmap)
19. [Files Produced](#19-files-produced)
20. [Developer Handoff Summary](#20-developer-handoff-summary)

---

## 1. Project Overview

**TaxWise Uganda** is a commercial Software-as-a-Service (SaaS) platform designed to serve tax professionals, accountants, and businesses in Uganda. The platform leverages AI (Anthropic Claude API) to analyze tax cases, summarize legal rulings, support tax education, and generate compliance reports — all in a cost-effective and accessible manner.

### Target Users

| User Type | Description |
|---|---|
| Tax Consultants | Professionals handling URA disputes and TAT appeals |
| Accountants | SME and corporate accountants needing compliance tools |
| Lawyers | Legal practitioners dealing with tax litigation |
| Students | Individuals studying taxation and finance in Uganda |
| Businesses | SMEs and corporates managing eFRIS, VAT, PAYE compliance |

---

## 2. Vision & Goals

### Primary Goals

- Provide AI-powered analysis of Tax Appeals Tribunal (TAT) rulings
- Summarize complex tax cases into affordable, professional reports
- Enable structured tax education (beginner to professional level)
- Offer compliance checking tools for eFRIS, VAT, and PAYE obligations
- Create a searchable library of real TAT precedent cases

### Initial Request (User Brief)

> *"I want to build a website that works with tax professionals to analyze cases, summarize them in a way that is cheaper. And also enable tax education."*

The project evolved from a simple landing page concept into a **full commercial SaaS platform** encompassing:

- Authentication
- Database
- AI integrations
- PDF processing
- TAT case search engine
- Education platform
- Compliance engine
- Report generation
- Payment processing
- Admin portal

---

## 3. Design Philosophy

### Look & Feel Direction

> *"Something that's so easy to use, however giving details to users, plus also professional."*

### Design Decisions

| Element | Choice | Rationale |
|---|---|---|
| Primary Color | Navy | Professional, authoritative |
| Accent Color | Teal | Approachable, modern |
| Highlight Color | Gold | Premium, Uganda-resonant |
| Heading Font | Playfair Display | Authoritative, editorial |
| Body Font | Inter | Highly readable, clean |
| Tone | Uganda-specific | URA eFRIS, TAT, UGX pricing throughout |

### Guiding Principle

Clean, approachable, yet detail-rich and professional — not cold corporate. Every screen provides enough context for a tax professional to act, while remaining accessible to non-experts.

---

## 4. Platform Features Built

### 4.1 Authentication Flow

- Full signup form: name, email, role selection (Consultant / Accountant / Student / Business)
- Login with email and password
- Session management (simulated; Supabase Auth in production)

### 4.2 Dashboard

- Summary statistics: cases analyzed, reports generated, courses completed
- Quick action buttons
- Recent activity feed

### 4.3 AI Case Analyzer

- **Text input:** Paste any TAT ruling, URA decision, or tax scenario
- **PDF upload:** Upload scanned or digital PDFs of case files
- **AI output:** Structured summary containing:
  - Key legal issues identified
  - Verdict / outcome
  - Risk level assessment
  - Relevant tags (e.g., VAT, withholding tax, transfer pricing)
- **Report download:** Export analysis as a formatted report

### 4.4 TAT Case Library

- 6 real Uganda TAT cases loaded
- Full-text search
- Filterable by tax type, year, outcome
- AI-generated expert commentary per case

### 4.5 Education Hub

- **3 full courses:**
  1. Uganda Tax Basics (Beginner)
  2. TAT Appeals Process (Intermediate)
  3. URA eFRIS Mastery (Professional)
- Real lesson content per course
- AI tutor chat embedded in each lesson

### 4.6 Compliance Checker

- Checklists for:
  - eFRIS (Electronic Fiscal Receipting and Invoicing Solution)
  - VAT compliance
  - PAYE compliance
- AI-generated risk report based on responses

### 4.7 Pricing Page

- 3 subscription plans displayed in **UGX**
- Payment display for MTN MoMo, Airtel Money, and card
- Plan comparison table

### 4.8 Admin Portal

- User management table
- Monthly Recurring Revenue (MRR) statistics
- Platform-wide overview metrics

---

## 5. Technology Stack

### Recommended Production Stack

```
Frontend:   React + Tailwind CSS
Backend:    Node.js + Express  OR  Supabase Edge Functions
Database:   Supabase (PostgreSQL + Auth + Storage)
AI Engine:  Anthropic Claude API (claude-sonnet-4)
PDF:        pdf-parse (Node.js) + Supabase Storage
Payments:   Flutterwave API (MTN MoMo + Airtel Money + Card)
Email:      Resend
Hosting:    Vercel (frontend) + Railway (backend)
```

### Why Supabase?

Supabase provides three critical services in a single platform:
1. **Auth** — User registration, login, session management
2. **Database** — PostgreSQL with Row Level Security (RLS)
3. **File Storage** — PDF uploads, report storage

This means a **first version can launch with no custom backend**, significantly reducing development time and cost.

---

## 6. Infrastructure & Cost Estimate

### Monthly Running Costs (Uganda Context)

| Layer | Tool | Monthly Cost |
|---|---|---|
| Frontend Hosting | Vercel | Free |
| Backend | Railway or Render | ~$5–$20 |
| Database | Supabase (PostgreSQL) | Free → $25 |
| AI (Anthropic) | Pay per use | ~$50–$200 |
| PDF Processing | pdf-parse / PDF.co | ~$20 |
| Payments | Flutterwave | % per transaction |
| Email | Resend | Free → $20 |
| **Total** | | **~$100–$300/month** |

### Recommended Domain

`taxwise.ug` — estimated cost ~$30–$50/year via a Ugandan domain registrar.

---

## 7. Database Schema

### Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | VARCHAR | Unique |
| full_name | VARCHAR | |
| role | ENUM | consultant, accountant, student, business |
| plan | ENUM | free, basic, professional |
| created_at | TIMESTAMP | |
| last_login | TIMESTAMP | |

#### `cases`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id |
| title | VARCHAR | |
| input_text | TEXT | Raw pasted or extracted text |
| pdf_path | VARCHAR | Supabase Storage path |
| ai_summary | JSONB | Structured AI output |
| risk_level | ENUM | low, medium, high |
| tags | TEXT[] | Array of tax type tags |
| created_at | TIMESTAMP | |

#### `tat_cases`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| case_number | VARCHAR | Official TAT reference |
| title | VARCHAR | |
| year | INT | |
| tax_type | VARCHAR | VAT, income tax, etc. |
| outcome | ENUM | taxpayer_won, ura_won, partial |
| summary | TEXT | |
| full_text | TEXT | |
| ai_commentary | TEXT | |

#### `courses`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | VARCHAR | |
| level | ENUM | beginner, intermediate, professional |
| lessons | JSONB | Array of lesson objects |
| created_at | TIMESTAMP | |

#### `enrollments`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id |
| course_id | UUID | FK → courses.id |
| progress | INT | 0–100 percentage |
| completed_at | TIMESTAMP | Nullable |

#### `compliance_reports`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id |
| type | ENUM | efris, vat, paye |
| responses | JSONB | Checklist answers |
| risk_report | TEXT | AI-generated output |
| created_at | TIMESTAMP | |

#### `subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id |
| plan | ENUM | free, basic, professional |
| flutterwave_ref | VARCHAR | Payment reference |
| status | ENUM | active, expired, cancelled |
| starts_at | TIMESTAMP | |
| expires_at | TIMESTAMP | |

#### `admin_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| action | VARCHAR | |
| performed_by | UUID | FK → users.id |
| metadata | JSONB | |
| created_at | TIMESTAMP | |

---

## 8. API Specification

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | None | Register new user |
| POST | `/auth/login` | None | Login, returns JWT |
| POST | `/auth/logout` | JWT | Invalidate session |
| GET | `/auth/me` | JWT | Get current user profile |

### Case Analyzer Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/cases/analyze` | JWT | Submit text for AI analysis |
| POST | `/cases/upload` | JWT | Upload PDF for analysis |
| GET | `/cases` | JWT | List user's cases |
| GET | `/cases/:id` | JWT | Get single case detail |
| DELETE | `/cases/:id` | JWT | Delete a case |

### TAT Library Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/tat-cases` | JWT | List all TAT cases (paginated) |
| GET | `/tat-cases/search?q=` | JWT | Full-text search |
| GET | `/tat-cases/:id` | JWT | Get case + AI commentary |

### Education Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/courses` | JWT | List all courses |
| GET | `/courses/:id` | JWT | Get course + lessons |
| POST | `/courses/:id/enroll` | JWT | Enroll user |
| PATCH | `/enrollments/:id/progress` | JWT | Update lesson progress |
| POST | `/ai-tutor` | JWT | Chat with AI tutor |

### Compliance Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/compliance/check` | JWT | Submit checklist, get AI risk report |
| GET | `/compliance/reports` | JWT | List user's reports |

### Payments Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/payments/initiate` | JWT | Start Flutterwave payment |
| POST | `/payments/webhook` | HMAC | Flutterwave payment callback |
| GET | `/subscriptions/status` | JWT | Check subscription status |

### Admin Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin JWT | List all users |
| GET | `/admin/stats` | Admin JWT | MRR, signups, usage |
| DELETE | `/admin/users/:id` | Admin JWT | Suspend/delete user |

---

## 9. AI Integration

### Model Configuration

```javascript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  temperature: 0.3  // Low for consistent legal summaries
}
```

### System Prompts

#### Case Analyzer Prompt
```
You are a Uganda tax law expert with 20 years of experience at the Tax Appeals Tribunal. 
Analyze the provided tax case or ruling and return a structured JSON response with:
- key_issues: array of main legal questions
- verdict: outcome summary
- risk_level: "low" | "medium" | "high"
- tags: relevant tax type tags
- summary: 200-word professional summary
- recommendations: actionable advice for the taxpayer
Respond ONLY in valid JSON.
```

#### AI Tutor Prompt
```
You are a friendly Uganda tax education tutor. 
The student is studying: {course_title}, Lesson: {lesson_title}.
Answer questions in plain English. Use Uganda-specific examples (URA, eFRIS, TAT, UGX).
Keep answers concise (under 150 words) unless asked to elaborate.
```

#### Compliance Risk Prompt
```
You are a Uganda tax compliance auditor. Based on the following checklist responses for {compliance_type}, 
generate a professional risk report. Identify gaps, assign a risk score (1-10), 
and provide 3-5 specific remediation steps. Use Uganda regulatory references (Income Tax Act, VAT Act, EFRIS regulations).
```

### Cost Controls

- Max tokens per request: 1,000
- Rate limit per user: 20 AI requests/day (free plan), 100/day (basic), unlimited (professional)
- Cache identical case inputs for 24 hours to reduce duplicate API calls

---

## 10. PDF Processing

### Upload Flow

1. User selects PDF in the Case Analyzer
2. Frontend sends file to `/cases/upload` as `multipart/form-data`
3. Backend uploads PDF to **Supabase Storage** at path: `pdfs/{user_id}/{timestamp}.pdf`
4. Backend extracts text using `pdf-parse` (Node.js)
5. Extracted text is sent to the Anthropic Claude API
6. Structured analysis JSON is saved to the `cases` table
7. Report is returned to the frontend for display and download

### Storage Structure (Supabase)

```
/pdfs
  /{user_id}
    /uploads/        ← raw uploaded PDFs
    /reports/        ← generated report PDFs
/avatars
  /{user_id}.jpg
```

### PDF Report Generation

- Generated reports are formatted using a Node PDF library (e.g., `pdfkit`)
- Reports include: case title, date, AI summary, risk level, recommendations, TaxWise branding
- Saved to `/reports/` in Supabase Storage and URL returned to user

---

## 11. Authentication & Security

### Supabase Auth Flow

1. User submits signup form
2. Supabase creates user, sends verification email (via Resend)
3. User verifies email, session JWT is issued
4. JWT included in all API requests as `Authorization: Bearer {token}`
5. Backend verifies JWT on every protected route

### Row Level Security (RLS) Policies

```sql
-- Users can only read their own cases
CREATE POLICY "Users see own cases" ON cases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own progress
CREATE POLICY "Users update own enrollments" ON enrollments
  FOR UPDATE USING (auth.uid() = user_id);
```

### Security Middleware

- All API routes: JWT validation
- Admin routes: additional `role = 'admin'` check
- Payment webhook: HMAC signature verification (Flutterwave secret)
- File uploads: file type validation (PDF only), max size 10MB
- Input sanitization on all text fields before AI submission

---

## 12. Payments Integration

### Supported Methods (Uganda)

| Method | Provider | Notes |
|---|---|---|
| MTN Mobile Money | Flutterwave | Most common in Uganda |
| Airtel Money | Flutterwave | Second largest mobile money |
| Visa / Mastercard | Flutterwave | For corporates |

### Flutterwave Payment Flow

1. User selects plan on Pricing page
2. Frontend calls `/payments/initiate` with plan and user details
3. Backend calls Flutterwave API, gets payment link
4. User redirects to Flutterwave checkout (MoMo prompt on phone)
5. Flutterwave sends webhook to `/payments/webhook`
6. Backend verifies HMAC signature, updates `subscriptions` table
7. User is upgraded to selected plan

### Subscription Plans (UGX)

| Plan | Monthly Price | Features |
|---|---|---|
| Free | UGX 0 | 5 cases/month, 1 course |
| Basic | UGX 50,000 | 30 cases/month, all courses, compliance checker |
| Professional | UGX 150,000 | Unlimited cases, all features, priority AI, PDF exports |

---

## 13. Frontend Architecture

### Routes

| Path | Component | Auth Required |
|---|---|---|
| `/` | LandingPage | No |
| `/login` | LoginPage | No |
| `/signup` | SignupPage | No |
| `/dashboard` | Dashboard | Yes |
| `/analyzer` | CaseAnalyzer | Yes |
| `/library` | TATLibrary | Yes |
| `/education` | EducationHub | Yes |
| `/education/:courseId` | CoursePage | Yes |
| `/compliance` | ComplianceChecker | Yes |
| `/pricing` | PricingPage | No |
| `/admin` | AdminPortal | Admin only |

### State Management

- React `useState` / `useContext` for UI state
- Supabase client handles auth state globally
- React Query (TanStack Query) recommended for server state and caching

### Key Components

- `<AIAnalyzer />` — text/PDF input + AI result display
- `<CaseCard />` — TAT case summary card with expand/commentary
- `<LessonPlayer />` — lesson content + AI tutor chat sidebar
- `<ComplianceForm />` — dynamic checklist with risk score display
- `<SubscriptionGate />` — wraps premium features, shows upgrade prompt
- `<AdminTable />` — paginated user/stats table

---

## 14. Deployment Plan

### Frontend — Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd taxwise-frontend
vercel --prod
```

Environment variables needed:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=
```

### Backend — Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway init
railway up
```

Environment variables needed:
```
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_HASH=
RESEND_API_KEY=
```

### Domain Setup

1. Purchase `taxwise.ug` from a Ugandan registrar
2. Point DNS A record to Vercel IP
3. Add custom domain in Vercel dashboard
4. Enable HTTPS (automatic via Vercel)

---

## 15. Build Timeline

### Phase 1 — Foundation (Weeks 1–2)
- Supabase project setup (auth, database, storage)
- User authentication (signup, login, email verification)
- Basic dashboard shell

### Phase 2 — Core AI Features (Weeks 3–5)
- Case Analyzer (text + PDF upload)
- Anthropic API integration
- Report generation + PDF export

### Phase 3 — Content & Education (Weeks 6–8)
- TAT Case Library (seed with real cases)
- Education Hub (courses + AI tutor)
- Compliance Checker

### Phase 4 — Payments & Subscriptions (Weeks 9–10)
- Flutterwave integration (MoMo + Airtel + card)
- Subscription gate on premium features
- Email notifications (Resend)

### Phase 5 — Admin & Launch (Weeks 11–12)
- Admin portal (user management, MRR stats)
- Performance testing
- Domain setup + production deployment
- Launch

---

## 16. Admin Portal

### Features

| Feature | Description |
|---|---|
| User Table | List all users, filter by plan, role, join date |
| Suspend User | Disable access without deleting account |
| MRR Dashboard | Monthly Recurring Revenue by plan |
| AI Usage Stats | API calls per day/user, cost tracking |
| Case Volume | Cases analyzed per day/week/month |
| Education Stats | Enrollments, completion rates per course |
| Compliance Reports | Reports generated, risk levels distribution |
| Export | Download user list or stats as CSV |

---

## 17. Error Handling

### API Error Codes

| Code | HTTP Status | Trigger |
|---|---|---|
| `AUTH_001` | 401 | Invalid or expired JWT |
| `AUTH_002` | 403 | Insufficient plan for feature |
| `CASE_001` | 400 | No text or PDF provided |
| `CASE_002` | 413 | PDF exceeds 10MB limit |
| `CASE_003` | 422 | PDF text extraction failed |
| `AI_001` | 503 | Anthropic API unavailable |
| `AI_002` | 429 | User daily AI limit exceeded |
| `PAY_001` | 402 | Flutterwave payment initiation failed |
| `PAY_002` | 400 | Invalid webhook signature |
| `DB_001` | 500 | Supabase query error |

---

## 18. Future Roadmap (Phase 2+)

| Feature | Description |
|---|---|
| OCR Support | Scan and extract text from image-based PDFs |
| Semantic Search | AI-powered similarity search across TAT case library |
| Mobile App | React Native app (iOS + Android) |
| URA API Integration | Direct connection to URA eFRIS API for real-time compliance |
| Bulk Case Upload | Upload and analyze multiple cases at once |
| Team Accounts | Multi-user workspaces for law firms and accounting firms |
| White-labelling | Resell platform under custom branding |
| Offline Mode | Download cases and lessons for offline reading |

---

## 19. Files Produced

### Artifact 1 — Initial Landing Page

**Description:** First version of the TaxWise platform. A single-page website with:
- Hero section
- AI Case Analyzer (live Claude API call)
- Learning Hub with 3 course cards
- Featured tools: Compliance Checker, Precedent Finder, Deadline Tracker
- Uganda-specific design and content (URA, TAT, UGX)

**Stack:** React + Tailwind CSS (single JSX artifact)

---

### Artifact 2 — Full SaaS Platform (React)

**Description:** Complete multi-page SaaS platform with all features. A large React artifact with:
- Login / Signup pages
- Dashboard with stats and activity
- Case Analyzer (PDF + text input + AI output)
- TAT Case Library (6 cases, search, filter, AI commentary)
- Education Hub (3 courses, lesson content, AI tutor)
- Compliance Checker (eFRIS / VAT / PAYE checklists)
- Pricing page (3 plans in UGX)
- Admin Portal (users, MRR, stats)

**Stack:** React + Tailwind CSS + Anthropic Claude API  
**Storage:** In-memory simulation (no real backend)

---

### Artifact 3 — Technical Specification Document (DOCX)

**Description:** Professional Word document (.docx) covering 14 sections for developer handoff.

**File:** `TaxWise_Uganda_Technical_Specification.docx`  
**Generated via:** `docx` Node.js library, built and compiled in the Claude container  
**Sections:**
1. Executive Summary
2. System Architecture
3. Database Schema (8 tables)
4. API Specification (all endpoints)
5. AI Integration (prompts, model config, cost controls)
6. PDF Processing
7. Auth & Security (Supabase Auth, RLS policies)
8. Payments (Flutterwave flow)
9. Frontend Architecture (routes, components, state)
10. Deployment (Vercel + Railway, env vars, cost)
11. Build Timeline (5 phases, 12 weeks)
12. Admin Portal features
13. Error Handling (all error codes)
14. Future Roadmap

---

### Artifact 4 — This Documentation File

**Description:** The document you are reading. Full project record compiled as a Markdown file.

**File:** `TaxWise_Uganda_Full_Documentation.md`

---

## 20. Developer Handoff Summary

### What Is Complete

| Deliverable | Status |
|---|---|
| Full frontend (React, all pages) | ✅ Done |
| Live AI integration (Claude API) | ✅ Done |
| Technical specification (DOCX) | ✅ Done |
| Database schema | ✅ Specified |
| API endpoint list | ✅ Specified |
| Deployment instructions | ✅ Specified |
| Payment flow design | ✅ Specified |

### What a Developer Still Needs to Build

| Task | Estimated Time |
|---|---|
| Supabase setup (auth, DB, storage) | 3–5 days |
| Backend API (Node.js + Express) | 1–2 weeks |
| Flutterwave payment integration | 3–5 days |
| PDF processing pipeline | 2–3 days |
| Email notifications (Resend) | 1–2 days |
| Production deployment | 1–2 days |
| **Total** | **~3–4 weeks** |

### Recommended Developer Profile

- **Frontend:** React developer (the frontend is done — they only need to swap mock data for real API calls)
- **Backend:** Node.js / Supabase developer familiar with REST APIs
- **Optional:** A developer with Flutterwave Uganda payment experience is strongly preferred

---

*Documentation compiled by Claude (Anthropic) — June 2026*  
*TaxWise Uganda — Empowering Tax Professionals with AI*
