"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { TaxPeriodBundle, Finding } from "../../lib/validation/helpers";
import { runComplianceEngine } from "../../lib/engine/complianceEngine";
import { calculateRisk } from "../../lib/engine/riskEngine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Robustly resolves the authenticated server-side user.
 * Falls back to a default demo-user when running in preview/sandbox mode.
 */
async function getServerUser() {
  if (!supabaseUrl || !serviceRoleKey) {
    // Sandbox Mode default user
    return { id: "demo-user", email: "demo.taxwise@example.com", full_name: "Demo Professional" };
  }

  try {
    const cookieStore = await cookies();
    // Search for Supabase authentication cookie
    const authCookie = cookieStore.getAll().find(c => c.name.includes("-auth-token"));

    if (authCookie) {
      const tokenData = JSON.parse(authCookie.value);
      const accessToken = tokenData.access_token;
      if (accessToken) {
        const client = createClient(supabaseUrl, anonKey);
        const { data: { user }, error } = await client.auth.getUser(accessToken);
        if (user && !error) {
          return {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
          };
        }
      }
    }
  } catch (err) {
    console.warn("Failed to retrieve server user via cookies, checking token direct:", err);
  }

  // Fallback if we cannot parse cookies but env variables are defined:
  // (We return null to enforce security in production, or demo-user if explicitly in dev)
  if (process.env.NODE_ENV === "development") {
    return { id: "demo-user", email: "demo.taxwise@example.com", full_name: "Demo Professional" };
  }
  return null;
}

/**
 * Gets a Supabase Admin client that bypasses RLS for service operations.
 */
function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

// ==========================================
// 1. Company / Tenancy Actions
// ==========================================

export async function getCompaniesAction() {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized: Please log in first.");

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Return mock companies
    return [
      { id: "c17bf7ee-3382-4467-88e3-ea6222bde971", name: "Uganda Premium Trade Ltd", created_at: new Date().toISOString() }
    ];
  }

  try {
    // Fetch companies user belongs to via company_members table
    const { data: members, error } = await admin
      .from("company_members")
      .select("company_id, role, companies(id, name, created_at)")
      .eq("user_id", user.id);

    if (error) {
      console.warn("Error fetching companies from DB, falling back to mock:", error);
      return [
        { id: "c17bf7ee-3382-4467-88e3-ea6222bde971", name: "Uganda Premium Trade Ltd", created_at: new Date().toISOString() }
      ];
    }

    if (!members || members.length === 0) {
      // User is logged in but has no companies, return a default mock company for a better preview experience
      return [
        { id: "c17bf7ee-3382-4467-88e3-ea6222bde971", name: "Uganda Premium Trade Ltd", created_at: new Date().toISOString() }
      ];
    }

    return (members || [])
      .map((m: any) => m.companies ? ({
        id: m.companies.id,
        name: m.companies.name,
        created_at: m.companies.created_at,
        role: m.role
      }) : null)
      .filter(Boolean);
  } catch (err) {
    console.warn("Exception fetching companies, falling back to mock:", err);
    return [
      { id: "c17bf7ee-3382-4467-88e3-ea6222bde971", name: "Uganda Premium Trade Ltd", created_at: new Date().toISOString() }
    ];
  }
}

export async function createCompanyAction(name: string) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Mock insert
    return { id: `mock-company-${Date.now()}`, name, created_at: new Date().toISOString() };
  }

  // Insert company
  const { data: company, error: compErr } = await admin
    .from("companies")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (compErr) {
    console.error("Error creating company:", compErr);
    throw new Error(compErr.message);
  }

  // Insert membership
  const { error: memErr } = await admin
    .from("company_members")
    .insert({
      company_id: company.id,
      user_id: user.id,
      role: "Admin"
    });

  if (memErr) {
    console.error("Error creating company membership:", memErr);
    throw new Error(memErr.message);
  }

  return company;
}

// ==========================================
// 2. Tax Period Actions
// ==========================================

export async function getTaxPeriodsAction(companyId: string) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  if (!admin) {
    return [];
  }

  try {
    const { data, error } = await admin
      .from("tax_periods")
      .select("*")
      .eq("company_id", companyId)
      .order("period_name", { ascending: false });

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn("Error fetching tax periods, falling back to mock:", error);
      }
      return [
        {
          id: "mock-period-2026-06",
          company_id: companyId,
          period_name: "2026-06",
          vat_declared_output: 15450000,
          vat_declared_input: 4200000,
          efris_sales_total: 98500000,
          vat_input_invalid_tin: 1200000,
          payroll_register_count: 12,
          payroll_register_gross: 24000000,
          paye_schedule_count: 10,
          paye_schedule_tax: 3600000,
          financial_gross_margin: 0.12,
          financial_sales: 115000000,
          supplier_tins_total_count: 12,
          supplier_tins_invalid_count: 3,
          nssf_contribution_total: 3600000,
          is_nil_return: false,
          supporting_documents_present: false,
          duplicate_invoices_count: 3,
          negative_balances_present: true,
          created_at: new Date().toISOString()
        },
        {
          id: "mock-period-2026-07",
          company_id: companyId,
          period_name: "2026-07",
          vat_declared_output: 18200000,
          vat_declared_input: 5100000,
          efris_sales_total: 110000000,
          vat_input_invalid_tin: 800000,
          payroll_register_count: 14,
          payroll_register_gross: 28000000,
          paye_schedule_count: 14,
          paye_schedule_tax: 4200000,
          financial_gross_margin: 0.15,
          financial_sales: 122000000,
          supplier_tins_total_count: 15,
          supplier_tins_invalid_count: 2,
          nssf_contribution_total: 4200000,
          is_nil_return: false,
          supporting_documents_present: true,
          duplicate_invoices_count: 1,
          negative_balances_present: false,
          created_at: new Date().toISOString()
        }
      ];
    }

    return data;
  } catch (err) {
    console.warn("Exception fetching tax periods, falling back to mock:", err);
    return [
      {
        id: "mock-period-2026-06",
        company_id: companyId,
        period_name: "2026-06",
        vat_declared_output: 15450000,
        vat_declared_input: 4200000,
        efris_sales_total: 98500000,
        vat_input_invalid_tin: 1200000,
        payroll_register_count: 12,
        payroll_register_gross: 24000000,
        paye_schedule_count: 10,
        paye_schedule_tax: 3600000,
        financial_gross_margin: 0.12,
        financial_sales: 115000000,
        supplier_tins_total_count: 12,
        supplier_tins_invalid_count: 3,
        nssf_contribution_total: 3600000,
        is_nil_return: false,
        supporting_documents_present: false,
        duplicate_invoices_count: 3,
        negative_balances_present: true,
        created_at: new Date().toISOString()
      }
    ];
  }
}

export async function saveTaxPeriodAction(
  companyId: string,
  periodName: string,
  bundle: Partial<TaxPeriodBundle>
) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { success: true, mock: true };
  }

  const record = {
    company_id: companyId,
    period_name: periodName,
    vat_declared_output: bundle.vat_declared_output ?? 0,
    vat_declared_input: bundle.vat_declared_input ?? 0,
    efris_sales_total: bundle.efris_sales_total ?? 0,
    vat_input_invalid_tin: bundle.vat_input_invalid_tin ?? 0,
    payroll_register_count: bundle.payroll_register_count ?? 0,
    payroll_register_gross: bundle.payroll_register_gross ?? 0,
    paye_schedule_count: bundle.paye_schedule_count ?? 0,
    paye_schedule_tax: bundle.paye_schedule_tax ?? 0,
    financial_gross_margin: bundle.financial_gross_margin ?? 0,
    financial_sales: bundle.financial_sales ?? 0,
    supplier_tins_total_count: bundle.supplier_tins_total_count ?? 0,
    supplier_tins_invalid_count: bundle.supplier_tins_invalid_count ?? 0,
    nssf_contribution_total: bundle.nssf_contribution_total ?? 0,
    is_nil_return: bundle.is_nil_return ?? false,
    supporting_documents_present: bundle.supporting_documents_present ?? true,
    duplicate_invoices_count: bundle.duplicate_invoices_count ?? 0,
    negative_balances_present: bundle.negative_balances_present ?? false
  };

  const { data, error } = await admin
    .from("tax_periods")
    .upsert(record, { onConflict: "company_id,period_name" })
    .select()
    .single();

  if (error) {
    console.error("Error saving tax period:", error);
    throw new Error(error.message);
  }

  return { success: true, data };
}

// ==========================================
// 3. Compliance Review & Narrative Actions
// ==========================================

export async function runComplianceReviewAction(
  companyId: string,
  periodName: string,
  enableAi: boolean = true
) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Return mock run for Sandbox mode
    const mockBundle: TaxPeriodBundle = {
      period_name: periodName,
      vat_declared_output: 15000000,
      vat_declared_input: 4000000,
      efris_sales_total: 100000000,
      vat_input_invalid_tin: 1200000,
      payroll_register_count: 12,
      payroll_register_gross: 24000000,
      paye_schedule_count: 10,
      paye_schedule_tax: 3600000,
      financial_gross_margin: 0.12,
      financial_sales: 115000000,
      supplier_tins_total_count: 12,
      supplier_tins_invalid_count: 3,
      nssf_contribution_total: 3600000,
      is_nil_return: false,
      supporting_documents_present: false,
      duplicate_invoices_count: 3,
      negative_balances_present: true,
      historicalPeriods: [
        { financial_gross_margin: 0.35 } as any,
        { financial_gross_margin: 0.37 } as any
      ]
    };
    const result = await runComplianceEngine(mockBundle, enableAi);
    return {
      review: {
        id: `mock-review-${periodName}`,
        company_id: companyId,
        period: periodName,
        status: result.risk.status,
        estimated_exposure: result.risk.estimated_exposure,
        confidence: result.risk.confidence,
        ai_summary: result.professionalSummary,
        reviewed_at: new Date().toISOString()
      },
      findings: result.findings.map((f, i) => ({ id: `mock-finding-${i}`, ...f }))
    };
  }

  // 1. Fetch current tax period record
  const { data: currentPeriod, error: periodErr } = await admin
    .from("tax_periods")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_name", periodName)
    .single();

  if (periodErr || !currentPeriod) {
    throw new Error(`Tax period data for "${periodName}" does not exist. Please save raw figures first.`);
  }

  // 2. Fetch historical tax periods for gross margin calculations
  const { data: historicalPeriods } = await admin
    .from("tax_periods")
    .select("*")
    .eq("company_id", companyId)
    .neq("period_name", periodName)
    .order("period_name", { ascending: false })
    .limit(3);

  // Map into TaxPeriodBundle format
  const bundle: TaxPeriodBundle = {
    ...currentPeriod,
    historicalPeriods: historicalPeriods || []
  };

  // 3. Run validation engines & calculate risk
  const result = await runComplianceEngine(bundle, enableAi);

  // 4. Upsert Compliance Review
  const reviewRecord = {
    company_id: companyId,
    period: periodName,
    status: result.risk.status,
    estimated_exposure: result.risk.estimated_exposure,
    confidence: result.risk.confidence,
    ai_summary: result.professionalSummary,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id
  };

  const { data: review, error: revErr } = await admin
    .from("compliance_reviews")
    .upsert(reviewRecord, { onConflict: "company_id,period" })
    .select()
    .single();

  if (revErr) {
    console.error("Error saving compliance review:", revErr);
    throw new Error(revErr.message);
  }

  // 5. Clear old findings for this review to prevent duplicates
  await admin.from("findings").delete().eq("review_id", review.id);

  // 6. Bulk insert findings
  const findingsToInsert = result.findings.map(f => ({
    review_id: review.id,
    code: f.code,
    severity: f.severity,
    area: f.area,
    title: f.title,
    description: f.description,
    reason: f.reason,
    impact: f.impact,
    recommendation: f.recommendation,
    legislation_ref: f.legislation_ref || null,
    exposure: f.exposure,
    confidence: f.confidence,
    status: "open"
  }));

  if (findingsToInsert.length > 0) {
    const { data: insertedFindings, error: findErr } = await admin
      .from("findings")
      .insert(findingsToInsert)
      .select();

    if (findErr) {
      console.error("Error inserting findings:", findErr);
      throw new Error(findErr.message);
    }

    return { review, findings: insertedFindings };
  }

  return { review, findings: [] };
}

// ==========================================
// 4. Resolve / Audit Action Trails
// ==========================================

export async function updateFindingStatusAction(
  reviewId: string,
  findingId: string,
  action: "resolve" | "ignore" | "reopen",
  notes?: string
) {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Return mock resolved in Sandbox mode
    return { success: true, mock: true };
  }

  const mappedStatus = action === "reopen" ? "open" : action === "resolve" ? "resolved" : "ignored";

  // 1. Update finding status
  const { data: finding, error: findErr } = await admin
    .from("findings")
    .update({ status: mappedStatus })
    .eq("id", findingId)
    .select()
    .single();

  if (findErr) {
    console.error("Error updating finding status:", findErr);
    throw new Error(findErr.message);
  }

  // 2. Insert Audit Action Trail
  const { error: actErr } = await admin
    .from("finding_actions")
    .insert({
      finding_id: findingId,
      action_by: user.id,
      action,
      notes: notes || null
    });

  if (actErr) {
    console.error("Error inserting finding audit action:", actErr);
    // Proceed anyway as the status is updated
  }

  // 3. Fetch all remaining findings for this review to recalculate risk
  const { data: allFindings, error: fetchErr } = await admin
    .from("findings")
    .select("*")
    .eq("review_id", reviewId);

  if (fetchErr) {
    console.error("Error fetching review findings for recalculation:", fetchErr);
    throw new Error(fetchErr.message);
  }

  // 4. Re-calculate risk score
  const risk = calculateRisk(allFindings);

  // 5. Update compliance review record
  const { data: updatedReview, error: revErr } = await admin
    .from("compliance_reviews")
    .update({
      status: risk.status,
      estimated_exposure: risk.estimated_exposure,
      confidence: risk.confidence
    })
    .eq("id", reviewId)
    .select()
    .single();

  if (revErr) {
    console.error("Error updating review risk aggregation:", revErr);
    throw new Error(revErr.message);
  }

  return {
    success: true,
    review: updatedReview,
    finding,
    findings: allFindings
  };
}
