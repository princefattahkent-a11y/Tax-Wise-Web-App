import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateGeminiText } from "@/lib/ai";

// Helper to get Supabase Admin client dynamically at request time
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase URL or Service Role Key is missing from environment variables.");
  }
  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { complianceType, score, gaps, userId, responses } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing user identity" }, { status: 401 });
    }

    if (!complianceType || gaps === undefined) {
      return NextResponse.json({ error: "Missing compliance checker parameters" }, { status: 400 });
    }

    const systemPrompt = `You are a Uganda tax compliance auditor. Based on the compliance gaps provided, generate a professional, structured risk report.
Format the report beautifully in markdown. Do not include introductory conversational filler. Start directly with the report.
Include:
1. **Overall Risk Assessment** (Analyze the overall score and threat level)
2. **Top Priority Action Items** (Provide 3 detailed, concrete remediation steps)
3. **Potential Penalties & Interest** (Detail specific penalties under Uganda tax laws: e.g., UGX 2M/day for eFRIS failure, 2% monthly interest for late VAT/PAYE, personal liability for PAYE). Use actual statutory references (e.g. Tax Procedures Code Act, VAT Act).`;

    const userMessage = `Compliance Area: ${complianceType.toUpperCase()}
Current Compliance Score: ${score}%
Unchecked Compliance Items (Gaps):
${(gaps as string[]).length > 0 ? (gaps as string[]).map((g: string) => `• ${g}`).join("\n") : "No outstanding gaps. Fully compliant."}`;

    let responseText = "";
    try {
      responseText = await generateGeminiText({
        prompt: userMessage,
        systemPrompt,
        maxTokens: 1000,
        temperature: 0.3,
      });
    } catch (apiErr) {
      console.error("Gemini API call failed for compliance checker:", apiErr);
      return NextResponse.json(
        { error: apiErr instanceof Error ? apiErr.message : "Failed to connect to Google Gemini API." },
        { status: 502 }
      );
    }

    // Save report to compliance_reports table
    const { data: insertedReport, error: dbError } = await supabaseAdmin
      .from("compliance_reports")
      .insert({
        user_id: userId,
        type: complianceType,
        responses: responses || {},
        risk_report: responseText,
        score: score,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase DB error saving compliance report:", dbError);
    }

    return NextResponse.json({
      success: true,
      report: responseText,
      record: insertedReport,
    });
  } catch (error: unknown) {
    console.error("Compliance checker API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate compliance report." }, { status: 500 });
  }
}
