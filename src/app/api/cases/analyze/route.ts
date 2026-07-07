import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateGeminiText, parseGeminiJson } from "@/lib/ai";
import { extractDocumentText, SUPPORTED_DOCUMENT_EXTENSIONS } from "@/lib/documentExtract";

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string || "";
    const caseType = formData.get("caseType") as string || "TAT Ruling";
    const userId = formData.get("userId") as string || "";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing user identity" }, { status: 401 });
    }

    let textToAnalyze = rawText;
    let geminiFileOption: { mimeType: string; data: string } | undefined = undefined;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const extraction = await extractDocumentText(buffer, file.name, file.type);
        geminiFileOption = extraction.geminiFile;

        if (extraction.extractedText) {
          textToAnalyze = `[${extraction.sourceLabel}]\n\n${extraction.extractedText}\n\n${rawText}`;
        } else {
          textToAnalyze = `[${extraction.sourceLabel}]\n\n${rawText}`;
        }
      } catch (extractErr) {
        return NextResponse.json(
          {
            error: extractErr instanceof Error
              ? extractErr.message
              : `Unsupported file type. Supported extensions include: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    if (!textToAnalyze.trim() && !geminiFileOption) {
      return NextResponse.json({ error: "No text content or file was provided for analysis." }, { status: 400 });
    }

    const systemPrompt = `You are TaxWise, an AI specializing in Uganda tax law (URA, TAT, Income Tax Act, VAT Act, PAYE, eFRIS). Analyze the case/scenario. Respond ONLY in valid JSON.
JSON format:
{
  "summary": "2-3 sentence plain summary",
  "keyIssues": ["issue1", "issue2", "issue3"],
  "verdict": "outcome or likely outcome",
  "risk": "low" | "medium" | "high",
  "riskNote": "one sentence on key risk",
  "tags": ["tag1", "tag2", "tag3"],
  "advice": "2-3 sentences of practical advice for the taxpayer or professional",
  "applicableLaw": ["Act Section 1", "Act Section 2"]
}`;

    const userMessage = `Case Type: ${caseType}\n\nCase Text/Details:\n${textToAnalyze}`;

    let responseText = "";
    try {
      responseText = await generateGeminiText({
        prompt: userMessage,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 4000,
        jsonMode: true,
        file: geminiFileOption,
      });
    } catch (apiErr) {
      console.error("Gemini API call failed for case analyzer:", apiErr);
      return NextResponse.json(
        { error: apiErr instanceof Error ? apiErr.message : "Failed to connect to Google Gemini API." },
        { status: 502 }
      );
    }

    interface ExtractedAnalysis {
      summary?: string;
      keyIssues?: string[];
      verdict?: string;
      risk?: "low" | "medium" | "high";
      riskNote?: string;
      tags?: string[];
      advice?: string;
      applicableLaw?: string[];
    }

    let parsedResult: ExtractedAnalysis;
    try {
      parsedResult = parseGeminiJson<ExtractedAnalysis>(responseText);
    } catch {
      console.error("Failed to parse JSON response from Gemini:", responseText);
      return NextResponse.json(
        { error: "AI analysis was successfully generated but failed to parse into structured format." },
        { status: 500 }
      );
    }

    const title = file ? `File Analysis: ${file.name}` : (rawText.split("\n")[0]?.slice(0, 80) || `Tax Scenario Analysis (${new Date().toLocaleDateString()})`);
    
    const { data: insertedCase, error: dbError } = await supabaseAdmin
      .from("cases")
      .insert({
        user_id: userId,
        title,
        input_text: textToAnalyze.slice(0, 100000),
        pdf_path: file ? `pdfs/${userId}/${Date.now()}_${file.name}` : null,
        ai_summary: parsedResult,
        risk_level: parsedResult.risk || "medium",
        tags: parsedResult.tags || [],
      })
      .select()
      .single();

    if (dbError) {
      console.error("Supabase DB error saving case:", dbError);
    }

    return NextResponse.json({
      success: true,
      case: insertedCase,
      analysis: parsedResult,
    });
  } catch (error: unknown) {
    console.error("General case analyzer API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "An unexpected error occurred during analysis." }, { status: 500 });
  }
}
