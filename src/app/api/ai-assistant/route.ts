import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini client as per guidelines with appropriate User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const { query, history, currentPage, userName, userRole } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    // Construct a rich system instruction summarizing full platform context and Uganda tax regulations
    const systemInstruction = `You are the friendly, professional, and authoritative AI Assistant for the TaxWise Uganda platform.
Your purpose is to assist users (tax consultants, accountants, lawyers, business owners, and students in Uganda) by providing high-quality tax insights, explaining platform features, and helping them navigate.

Current User Details:
- Name: ${userName || "Valued Member"}
- Registered Role: ${userRole || "SaaS User"}
- Currently Viewing Page/Section: ${currentPage || "Dashboard"}

TaxWise Uganda Platform Features Overview:
1. Dashboard: Key metrics (cases analyzed, reports generated, courses completed), quick action shortcuts, and activity logs.
2. Case Analyzer: Pastes or uploads rulings (PDFs), extracting legal issues, outcomes, and tax risk metrics with custom report exports.
3. Case Library: A search engine for Uganda Tax Appeals Tribunal (TAT) rulings, offering filters for year, tax type (VAT, CIT, PAYE, etc.), outcome, and AI expert commentary.
4. Calculators: Tools for Pay-As-You-Earn (PAYE), VAT (18%), withholding tax (WHT), and corporate income tax.
5. Intelligence: In-depth research papers, dispute analytics, and trend reports on Uganda Revenue Authority (URA) cases.
6. Learning Hub: Certified interactive courses including "Uganda Tax Basics" (Beginner), "TAT Appeals Process" (Intermediate), and "URA eFRIS Mastery" (Professional), equipped with personal AI lessons tutors.
7. Compliance Checker: Direct self-audit checklists for eFRIS compliance, VAT filing prep, and PAYE bookkeeping to map penalty exposures.
8. Pricing: Flexible UGX plans (Free, Pro, Enterprise) integrated securely via Flutterwave for MTN Mobile Money, Airtel Money, and card payments.

Core Uganda Tax Context to Utilize:
- URA: Uganda Revenue Authority.
- eFRIS: Electronic Fiscal Receipting and Invoicing Solution. Standard penalty for failure to comply is 4,000,000 UGX or more.
- VAT: Standard rate is 18%. Mandatory registration threshold is 150 million UGX annual turnover. File by 15th of the next month.
- PAYE: Progressive rates (0%, 10%, 20%, 30%), with an additional 10% super tax on monthly income above 10 million UGX.
- NSSF: 5% employee, 10% employer deductions (total 15% contribution), filed by the 15th of the next month.

Rules for your response:
1. Be polite, highly knowledgeable, and contextual. If they are looking at a specific page (e.g., Compliance), naturally reference compliance checklists or eFRIS.
2. Structure your "answer" in clear markdown. Use bold text, small bullet points, and neat spacing to maintain readability.
3. Keep the "answer" relatively concise (under 250 words) so it fits beautifully in a chat bubble, but make sure it is rich with actual details.
4. Provide exactly 3 highly relevant, dynamic follow-up questions tailored to their query and the page they are on. Avoid repeating standard placeholder questions.
5. Do NOT include any code or JSON formatting inside the "answer" string; keep it clean markdown for the UI.`;

    // Map conversation history into parts
    const chatParts: { role: string; parts: { text: string }[] }[] = [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach((msg: { sender: "user" | "ai"; text: string }) => {
        chatParts.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    // Append current query
    chatParts.push({
      role: "user",
      parts: [{ text: query }],
    });

    // Call Gemini with a robust retry & fallback loop to handle 503 high-demand errors
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
    let responseText = "";
    let finalError: unknown = null;

    for (const modelName of modelsToTry) {
      let attempts = 0;
      const maxAttempts = 2;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts++;
        try {
          console.log(`AI Assistant calling ${modelName} (attempt ${attempts})...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: chatParts,
            config: {
              systemInstruction,
              temperature: 0.6,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  answer: {
                    type: Type.STRING,
                    description: "The Markdown-formatted response to the user's question, containing helpful, accurate info.",
                  },
                  suggestedQuestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                    description: "Exactly 3 dynamic, conversational suggested questions the user can click next.",
                  },
                },
                required: ["answer", "suggestedQuestions"],
              },
            },
          });

          if (response && response.text) {
            responseText = response.text;
            success = true;
            break;
          }
        } catch (err: unknown) {
          finalError = err;
          console.warn(`AI Assistant error with model ${modelName} on attempt ${attempts}:`, err);
          
          const errObj = err && typeof err === "object" ? (err as Record<string, unknown>) : null;
          const errMsg = err instanceof Error ? err.message : String(err);
          const isRetryable = 
            errObj?.status === 503 || 
            errObj?.status === 429 || 
            errObj?.code === 503 || 
            errObj?.code === 429 ||
            errMsg.includes("503") || 
            errMsg.includes("UNAVAILABLE") || 
            errMsg.includes("demand");

          if (isRetryable && attempts < maxAttempts) {
            console.log("Temporary server issue, waiting 500ms before retrying same model...");
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else {
            // Not retryable, or exceeded maxAttempts for this model. Switch to next model in list.
            break;
          }
        }
      }

      if (success) {
        break;
      }
    }

    if (!responseText) {
      throw finalError || new Error("All attempted Gemini models failed to generate a response.");
    }

    const parsedData = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      answer: parsedData.answer,
      suggestedQuestions: Array.isArray(parsedData.suggestedQuestions)
        ? parsedData.suggestedQuestions.slice(0, 3)
        : [],
    });
  } catch (error: unknown) {
    console.error("AI Assistant API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to communicate with AI Assistant service.",
        answer: "Apologies, I encountered an issue accessing my tax knowledge base. Please try asking your question again shortly.",
        suggestedQuestions: [
          "How does standard VAT work in Uganda?",
          "What are the penalties for eFRIS non-compliance?",
          "How do I use the Case Analyzer tool?",
        ],
      },
      { status: 500 }
    );
  }
}
