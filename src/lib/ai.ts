export interface GenerateGeminiOptions {
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  file?: {
    mimeType: string;
    data: string;
  };
}

export async function generateGeminiText(options: GenerateGeminiOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add your Google Gemini API key to your environment variables on Railway or in your local .env.local file."
    );
  }

  // Use gemini-2.5-flash as the default high-performance, cost-effective model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const parts: Record<string, unknown>[] = [{ text: options.prompt }];
  if (options.file) {
    parts.unshift({
      inlineData: {
        mimeType: options.file.mimeType,
        data: options.file.data,
      },
    });
  }

  const payload: Record<string, unknown> = {
    contents: [
      {
        parts,
      },
    ],
  };

  if (options.systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  const generationConfig: Record<string, unknown> = {};
  if (options.temperature !== undefined) {
    generationConfig.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    generationConfig.maxOutputTokens = options.maxTokens;
  }
  if (options.jsonMode) {
    generationConfig.responseMimeType = "application/json";
    // Disable Gemini 2.5 Flash's built-in thinking for JSON extraction.
    // Thinking tokens count against maxOutputTokens and leave very little
    // budget for actual JSON output, causing MAX_TOKENS truncation.
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  if (Object.keys(generationConfig).length > 0) {
    payload.generationConfig = generationConfig;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // Not JSON
    }

    const message =
      errorJson?.error?.message ||
      `Gemini API responded with status ${res.status}: ${res.statusText}`;
    throw new Error(`Google Gemini Error: ${message}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  
  if (!candidate) {
    throw new Error("Google Gemini returned no candidates/responses.");
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
    throw new Error(`Google Gemini generation finished with reason: ${candidate.finishReason}`);
  }

  // If jsonMode is on and the response was truncated, the JSON will be incomplete and unparseable.
  if (options.jsonMode && candidate.finishReason === "MAX_TOKENS") {
    throw new Error(
      "Google Gemini response was truncated (MAX_TOKENS). The JSON output is incomplete. Try increasing maxTokens or reducing input length."
    );
  }

  const responseText = candidate.content?.parts?.[0]?.text;
  if (responseText === undefined || responseText === null) {
    throw new Error("Google Gemini response format was unexpected or empty.");
  }

  return responseText.trim();
}

/**
 * Robustly parses a JSON string returned by Gemini, stripping any potential markdown code fences or whitespace.
 */
export function parseGeminiJson<T>(text: string): T {
  let clean = text.trim();

  // Strip markdown code fences if present
  // Matches ```json ... ``` or ``` ... ``` (case insensitive, multiline)
  const codeBlockRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = clean.match(codeBlockRegex);
  if (match) {
    clean = match[1].trim();
  }

  try {
    return JSON.parse(clean) as T;
  } catch (firstError) {
    // If that fails, try to extract the JSON object using boundary matching of { and }
    const startIdx = clean.indexOf("{");
    const endIdx = clean.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const extracted = clean.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(extracted) as T;
      } catch {
        console.error("Failed to parse extracted JSON block:", extracted);
      }
    }
    throw firstError;
  }
}

