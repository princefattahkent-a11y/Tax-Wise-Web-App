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

    // Check if the API key is missing or is the default placeholder
    const apiKey = process.env.GEMINI_API_KEY;
    const isMockMode = !apiKey || apiKey === "your-gemini-api-key" || apiKey.trim() === "";

    if (isMockMode) {
      let mockAnswer = "";
      let mockSuggestions: string[] = [];

      const queryLower = query.toLowerCase();
      if (queryLower.includes("efris") || queryLower.includes("fiscal")) {
        mockAnswer = `### URA eFRIS System Guidelines
The **Electronic Fiscal Receipting and Invoicing Solution (eFRIS)** is mandatory for all businesses registered for VAT in Uganda.

**Key Compliance Rules:**
- **Invoices:** All transactions must be fiscalized with a URA-generated QR code.
- **Penalties:** Failure to issue a fiscal receipt carries a standard penalty of **4,000,000 UGX** (or more depending on the tax value).
- **Offline Mode:** If your internet or device fails, you must record sales manually and transmit them within 24 hours of connection recovery.`;
        mockSuggestions = [
          "How do I apply for an eFRIS waiver?",
          "What is the penalty for using a non-approved device?",
          "How to reconcile sales with URA monthly report?"
        ];
      } else if (queryLower.includes("vat") || queryLower.includes("value added")) {
        mockAnswer = `### Uganda VAT Regulations
Value Added Tax (VAT) is standard-rated at **18%** in Uganda on taxable supplies.

**Important Details:**
- **Registration Threshold:** Annual turnover of **150,000,000 UGX** makes VAT registration compulsory.
- **Filing Deadline:** Returns must be filed and paid by the **15th day of the following month**.
- **Input VAT:** Ensure all claims are backed by official eFRIS fiscal invoices. Non-fiscalized receipts are generally disallowed.`;
        mockSuggestions = [
          "What items are zero-rated or exempt from VAT?",
          "How do I claim input VAT on imported services?",
          "What is the process for VAT refunds?"
        ];
      } else if (queryLower.includes("paye") || queryLower.includes("income tax") || queryLower.includes("salary")) {
        mockAnswer = `### PAYE & Employment Taxes
Pay-As-You-Earn (PAYE) is a progressive tax deducted from employee salaries monthly in Uganda.

**Current Rates:**
- Monthly income up to **235,000 UGX**: 0%
- Income between **235,000 - 335,000 UGX**: 10%
- Income between **335,000 - 410,000 UGX**: 20% + 10,000 UGX
- Income above **410,000 UGX**: 30% + 25,000 UGX
- **Super Tax:** An additional **10%** surcharge applies on monthly income exceeding **10,000,000 UGX**.`;
        mockSuggestions = [
          "How is NSSF calculated and split?",
          "What benefits-in-kind are taxable under PAYE?",
          "How do I file the monthly PAYE return?"
        ];
      } else {
        mockAnswer = `### Hello from TaxWise Assistant!
I am currently operating in **Local Mock Mode** because a valid \`GEMINI_API_KEY\` was not detected in your local \`.env\` configuration.

However, I can still answer questions about the **${currentPage || "Dashboard"}** section or general Ugandan tax policies.

To enable full AI capabilities, please add a valid Gemini API Key from Google AI Studio to your local \`.env\` file.`;
        mockSuggestions = [
          "Tell me about eFRIS compliance penalties.",
          "What are the standard VAT rules in Uganda?",
          "How is PAYE calculated for local employees?"
        ];
      }

      return NextResponse.json({
        success: true,
        answer: mockAnswer,
        suggestedQuestions: mockSuggestions
      });
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
    const errMsg = error instanceof Error ? error.message : String(error);
    const isApiKeyError = errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("key is invalid") || errMsg.includes("API key");

    if (isApiKeyError) {
      return NextResponse.json({
        success: true,
        answer: `### ⚠️ Invalid API Key Configured
The Gemini API key configured in your local \`.env\` file is invalid or has expired.

**How to Fix This:**
1. Generate a free API key at [Google AI Studio](https://aistudio.google.com/).
2. Open the \`.env\` file in your project root.
3. Update the \`GEMINI_API_KEY\` variable with your new key:
   \`\`\`bash
   GEMINI_API_KEY=your_actual_api_key_here
   \`\`\`
4. Restart your local server (\`npm run dev\`).`,
        suggestedQuestions: [
          "Tell me about eFRIS compliance penalties.",
          "What are the standard VAT rules in Uganda?",
          "How is PAYE calculated for local employees?"
        ]
      });
    }

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
