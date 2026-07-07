# Supabase Project Setup Guide

This guide will walk you through setting up a free Supabase backend for the **TaxWise Uganda** platform.

---

## Step 1: Create a Supabase Account & Project

1. Go to [supabase.com](https://supabase.com) and click **Sign Up** or **Sign In** (you can sign in with GitHub).
2. Once on your dashboard, click the **New project** button.
3. Select your organization and configure the project:
   - **Name:** `TaxWise Uganda`
   - **Database Password:** *Choose a secure password and save it somewhere safe.*
   - **Region:** Choose `EU (Ireland)` or `US East (N. Virginia)` for optimal speed.
   - **Pricing Plan:** Select **Free** (this is fully sufficient for development and testing).
4. Click **Create new project** and wait a few minutes for the database to provision.

---

## Step 2: Initialize the Database Schema & Seed Data

1. Once your project dashboard loads, look at the left-hand sidebar and click on the **SQL Editor** icon (represented by `SQL`).
2. Click **New query** (or the **+** icon) to open an empty SQL editor worksheet.
3. Open the file [schema.sql](file:///c:/Users/PFK/Documents/TaxWise/schema.sql) in your workspace and copy all of its contents.
4. Paste the copied SQL code into the Supabase SQL editor window.
5. Click the **Run** button at the top-right of the editor.
6. Verify that it says **"Success. No rows returned"** or similar, indicating that all tables, triggers, and Row Level Security (RLS) policies have been successfully created, and the cases & courses have been seeded.

---

## Step 3: Configure Supabase Authentication

Supabase Auth is active by default. We just need to make sure user signup uses the metadata we expect.

1. In the Supabase sidebar, click on the **Authentication** icon (the user key icon).
2. Go to **Providers** and confirm that the **Email** provider is **Enabled**.
3. Under Email Provider settings:
   - Confirm **Confirm email** is enabled (if you want real email verification). For fast local testing, you can disable **Confirm email** so that newly registered accounts are instantly active without needing email verification.
4. Go to **URL Configuration** and set the **Site URL** to your local dev address: `http://localhost:3000`.

---

## Step 4: Retrieve API Keys and Connection Credentials

1. In the Supabase sidebar, click on the **Project Settings** icon (the gear icon at the bottom).
2. Click on the **API** tab.
3. Locate the following keys under the **API Keys** and **Project URL** sections:
   - **Project URL:** Look for `URL`. It will look like `https://xxxxxx.supabase.co`.
   - **Anon Key:** Look for `Project API keys` -> `anon public`. It will be a long string starting with `eyJ...`.
   - **Service Role Key:** Look for `Project API keys` -> `service_role secret` (Click reveal to see it). *Keep this secret; it bypasses RLS and should only be used by Next.js API Routes!*
4. Create a `.env.local` file in your project root and copy these values into it:

```env
# Public Supabase Keys (Exposed to the client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Secret API Keys (Server-only, NEVER expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
ANTHROPIC_API_KEY=your-anthropic-api-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
FLUTTERWAVE_WEBHOOK_HASH=your-flutterwave-webhook-hash
```

---

## Step 5: Configure Supabase Auth to use Resend (Custom SMTP)

By default, Supabase sends registration and verification emails using its built-in mail server. This has a strict rate limit of 3 emails per hour and often lands in Spam/Junk folders. 

To route all Supabase authentication emails (verification codes, invites, and password resets) through Resend:

1. Go to your [Supabase Dashboard](https://supabase.com).
2. Select your project, and navigate to **Settings** (gear icon) -> **Auth** (under project settings).
3. Scroll down to the **SMTP Configuration** section.
4. Toggle **Enable Custom SMTP** to **ON**.
5. Fill in the following details:
   - **Sender Email**: `onboarding@resend.dev` (for sandbox testing) OR `your-verified-email@taxwise.cloud` (once domain is verified in Resend)
   - **Sender Name**: `TaxWise`
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `587` (or `465`)
   - **SMTP Username**: `resend` (literal string `resend`)
   - **SMTP Password**: Your Resend API key (`re_Kn365pij_64Pi5nFhLxGagwfW9tJiNveq`)
   - **Secure Connection**: `STARTTLS` (if using port `587`) or `SSL/TLS` (if using port `465`)
6. Click **Save** at the bottom of the section.

Now, all authentication verification codes and links will be dispatched directly through your Resend service.

