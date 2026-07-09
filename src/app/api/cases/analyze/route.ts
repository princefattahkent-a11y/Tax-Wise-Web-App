import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateGeminiText, parseGeminiJson } from "@/lib/ai";
import { extractDocumentText, SUPPORTED_DOCUMENT_EXTENSIONS } from "@/lib/documentExtract";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("Supabase URL or Service Role Key is missing. Running in robust Demo / Sandbox mode.");
    return null;
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
  "applicableLaw": ["Act Section 1", "Act Section 2"],
  "libraryCase": {
    "case_number": "Generate a realistic unique Ugandan Tax Appeals Tribunal (TAT) case number matching the year of the dispute, e.g., 'TAT No. 125 of 2026'. Ensure it is highly realistic and unique.",
    "title": "Generate a realistic formal legal case title matching the context, e.g., 'Appellant Name vs Commissioner General, Uganda Revenue Authority'",
    "year": 2026,
    "tax_type": "The main tax category, e.g., 'VAT', 'Income Tax', 'PAYE', 'eFRIS Compliance', 'Customs Duty'",
    "outcome": "Allowed" | "Dismissed" | "Partial"
  }
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
      libraryCase?: {
        case_number?: string;
        title?: string;
        year?: number;
        tax_type?: string;
        outcome?: string;
      };
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
    
    let insertedCase = null;
    if (supabaseAdmin) {
      const { data, error: dbError } = await supabaseAdmin
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
      } else {
        insertedCase = data;
      }

      // Check if this is a new case (not loaded from existing Case Library)
      const isAlreadyInLibrary = textToAnalyze.includes("[Case Library:") || textToAnalyze.includes("[Case Library ");
      if (!isAlreadyInLibrary) {
        try {
          const libInfo = parsedResult.libraryCase || {};
          const yearVal = Number(libInfo.year) || new Date().getFullYear();
          let proposedNum = libInfo.case_number || `TAT No. ${Math.floor(100 + Math.random() * 900)} of ${yearVal}`;
          
          // Verify unique case number in tat_cases
          const { data: duplicate } = await supabaseAdmin
            .from("tat_cases")
            .select("id")
            .eq("case_number", proposedNum)
            .maybeSingle();

          if (duplicate) {
            proposedNum = `${proposedNum} (${Math.random().toString(36).substring(2, 6).toUpperCase()})`;
          }

          const mappedOutcome = ["Allowed", "Dismissed", "Partial"].includes(libInfo.outcome || "")
            ? libInfo.outcome
            : (parsedResult.risk === "high" ? "Dismissed" : parsedResult.risk === "medium" ? "Partial" : "Allowed");

          const taxTypeVal = libInfo.tax_type || (caseType === "TAT Ruling" ? "Income Tax" : caseType);

          const { error: libInsertError } = await supabaseAdmin
            .from("tat_cases")
            .insert({
              case_number: proposedNum,
              title: libInfo.title || title,
              year: yearVal,
              tax_type: taxTypeVal,
              outcome: mappedOutcome,
              summary: parsedResult.summary || "Case analyzed by TaxWise user.",
              full_text: textToAnalyze,
              ai_commentary: parsedResult.advice || "AI professional advice provided."
            });

          if (libInsertError) {
            console.error("Failed to auto-insert new case into tat_cases library:", libInsertError);
          } else {
            console.log("Successfully auto-inserted new analyzed case into tat_cases library:", proposedNum);
          }
        } catch (libErr) {
          console.error("Error running auto-insertion logic for Case Library:", libErr);
        }
      }
    } else {
      console.log("Skipping Supabase insert in Demo / Sandbox mode.");
      // Create a mock returned case record to satisfy frontend expectations if needed
      insertedCase = {
        id: `mock-case-${Date.now()}`,
        user_id: userId,
        title,
        input_text: textToAnalyze.slice(0, 100),
        pdf_path: file ? `pdfs/${userId}/${Date.now()}_${file.name}` : null,
        ai_summary: parsedResult,
        risk_level: parsedResult.risk || "medium",
        tags: parsedResult.tags || [],
        created_at: new Date().toISOString()
      };
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
