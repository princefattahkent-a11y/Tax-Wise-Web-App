import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateGeminiText, parseGeminiJson } from "@/lib/ai";
import {
  extractDocumentText,
  getDefaultMimeType,
  isSupportedDocument,
  MAX_DOCUMENT_SIZE_BYTES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from "@/lib/documentExtract";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase URL or Service Role Key is missing.");
  }
  return createClient(url, serviceKey);
}

const PRECEDENT_SYSTEM_PROMPT = `You are a Uganda tax law specialist. You will receive a Tax Appeals Tribunal (TAT) ruling or tax case document — either as extracted text or as an attached file (PDF, Word, scanned document, or image).
Extract the following fields and respond ONLY with valid JSON.

JSON format:
{
  "case_number": "The official TAT case number (e.g. 'TAT No. 05 of 2023')",
  "title": "Full case title (e.g. 'ABC Company Ltd v Uganda Revenue Authority')",
  "year": 2023,
  "tax_type": "One of: VAT | Income Tax | WHT | Excise Duty | Customs | Jurisdiction | Other",
  "outcome": "One of: Allowed | Dismissed | Partial",
  "summary": "2-4 sentence plain-English summary of the facts, legal issues, and Tribunal decision",
  "ai_commentary": "4-5 sentence practical legal commentary for Uganda tax practitioners. Include a clear takeaway, the main risk or precedent, cite relevant Acts or sections where possible, and add 3 short bullet points summarizing the key practical lessons.",
  "document_excerpt": "Up to 2000 characters of the most relevant case text from the document"
}

If a field cannot be determined from the document, use null for that field.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No document file provided." }, { status: 400 });
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds the 20 MB size limit." }, { status: 400 });
    }

    if (!isSupportedDocument(file.name)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Supported extensions include: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || getDefaultMimeType(file.name);

    let extraction;
    try {
      extraction = await extractDocumentText(buffer, file.name, contentType);
    } catch (extractErr) {
      return NextResponse.json(
        { error: extractErr instanceof Error ? extractErr.message : "Could not process this document." },
        { status: 422 }
      );
    }

    const { extractedText, geminiFile, sourceLabel } = extraction;

    if (!extractedText && !geminiFile) {
      return NextResponse.json(
        { error: "Could not extract readable content from this document." },
        { status: 422 }
      );
    }

    let storagePath: string | null = null;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uploadPath = `tat-cases/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("case-documents")
        .upload(uploadPath, buffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        console.warn("Supabase Storage upload warning:", uploadError.message);
      } else {
        storagePath = uploadPath;
      }
    } catch (storageErr) {
      console.warn("Storage upload skipped:", storageErr);
    }

    const userMessage = geminiFile
      ? `${sourceLabel}\n\nAnalyze the attached TAT case document and extract all requested metadata fields.`
      : `TAT CASE DOCUMENT TEXT:\n\n${extractedText.slice(0, 12000)}`;

    let rawResponse = "";
    try {
      rawResponse = await generateGeminiText({
        prompt: userMessage,
        systemPrompt: PRECEDENT_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 8192,
        jsonMode: true,
        file: geminiFile,
      });
    } catch (apiErr) {
      console.error("Gemini API call failed:", apiErr);
      return NextResponse.json(
        { error: apiErr instanceof Error ? apiErr.message : "Failed to connect to Google Gemini API." },
        { status: 502 }
      );
    }

    interface ExtractedPrecedent {
      case_number?: string;
      title?: string;
      year?: number;
      tax_type?: string;
      outcome?: string;
      summary?: string;
      ai_commentary?: string;
      document_excerpt?: string;
    }

    let extracted: ExtractedPrecedent;
    try {
      extracted = parseGeminiJson<ExtractedPrecedent>(rawResponse);
    } catch {
      console.error("Gemini JSON parse failed:", rawResponse);
      return NextResponse.json(
        { error: "AI extraction succeeded but returned an unreadable format. Please fill in the form manually." },
        { status: 500 }
      );
    }

    const fullText =
      extracted.document_excerpt?.trim() ||
      extractedText.slice(0, 5000) ||
      "";

    return NextResponse.json({
      success: true,
      storage_path: storagePath,
      extracted: {
        case_number: extracted.case_number ?? "",
        title: extracted.title ?? "",
        year: extracted.year ?? new Date().getFullYear(),
        tax_type: extracted.tax_type ?? "Other",
        outcome: extracted.outcome ?? "Allowed",
        summary: extracted.summary ?? "",
        ai_commentary: extracted.ai_commentary ?? "",
        full_text: fullText,
      },
    });
  } catch (error: unknown) {
    console.error("Admin parse-precedent API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
