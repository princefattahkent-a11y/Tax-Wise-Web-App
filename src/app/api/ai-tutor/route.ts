import { NextRequest, NextResponse } from "next/server";
import { generateGeminiText } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { courseTitle, lessonTitle, question } = await req.json();

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Missing question query" }, { status: 400 });
    }

    const systemPrompt = `You are a friendly Uganda tax education tutor.
The student is studying the course: "${courseTitle || "Uganda Taxation"}", Lesson: "${lessonTitle || "Tax Basics"}".
Answer questions in plain, easy-to-understand English. Always use Uganda-specific examples (URA, eFRIS, TAT, UGX, local businesses).
Reference the Income Tax Act, VAT Act, or relevant TAT precedents where helpful.
Keep answers concise (under 200 words) and direct, unless specifically asked to elaborate.`;

    let responseText = "";
    try {
      responseText = await generateGeminiText({
        prompt: question,
        systemPrompt,
        maxTokens: 600,
        temperature: 0.5,
      });
    } catch (apiErr) {
      console.error("Gemini API call failed for AI tutor:", apiErr);
      return NextResponse.json(
        { error: apiErr instanceof Error ? apiErr.message : "Failed to communicate with Google Gemini API." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      answer: responseText,
    });
  } catch (error: unknown) {
    console.error("AI Tutor API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to communicate with AI Tutor." }, { status: 500 });
  }
}
