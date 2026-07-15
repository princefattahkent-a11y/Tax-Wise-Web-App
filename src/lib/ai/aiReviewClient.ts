import { generateGeminiText } from "../ai";
import { Finding, IMPACT_PHRASES } from "../validation/helpers";

/**
 * Generates a short, client-readable professional summary paragraph of the compliance findings.
 * Input: Deterministic findings produced by the validation rules engine.
 * Output: Plain text narrative summary utilizing strictly hedged, cautious language.
 */
export async function generateReviewSummary(findings: Finding[]): Promise<string | null> {
  if (findings.length === 0) {
    return "All statutory checks cleared. No issues were detected. The tax period data is fully consistent and ready for filing.";
  }

  // Format the findings into a concise string for the model prompt
  const findingsSummaryText = findings
    .map(
      (f, idx) =>
        `${idx + 1}. [${f.code} - ${f.area}] ${f.title}\n` +
        `   Severity: ${f.severity}\n` +
        `   Description: ${f.description}\n` +
        `   Reason: ${f.reason}\n` +
        `   Exposure: UGX ${f.exposure.toLocaleString()}`
    )
    .join("\n\n");

  const systemPrompt = `You are a senior tax compliance consultant in Uganda. Your job is to draft a concise, client-readable executive summary (1 paragraph, 3-4 sentences maximum) based on the technical tax findings provided.

CRITICAL NON-NEGOTIABLE COMPLIANCE RULES:
1. You must write in a professional, constructive, and cautious tone.
2. You MUST use heavily hedged language. You are strictly forbidden from asserting that the Uganda Revenue Authority (URA) will definitely audit, inspect, prosecute, or penalize.
3. Every potential issue or risk must be described strictly using one of these concepts:
   - "${IMPACT_PHRASES.POSSIBLE_INCONSISTENCY}"
   - "${IMPACT_PHRASES.FURTHER_REVIEW}"
   - "${IMPACT_PHRASES.UNUSUAL_VERIFY}"
   - "${IMPACT_PHRASES.VERIFY_BEFORE_FILING}"
4. You must NOT invent any new findings, nor alter or dispute the severity, exposure, or confidence of the provided findings.
5. Do not output any markdown formatting, bullet points, headers, or introductions. Return ONLY the plain text paragraph.`;

  const prompt = `Here is the list of compliance findings produced by our validation rules engine:\n\n${findingsSummaryText}\n\nPlease generate the executive summary paragraph:`;

  try {
    const response = await generateGeminiText({
      systemPrompt,
      prompt,
      temperature: 0.2,
      maxTokens: 300,
    });
    return response;
  } catch (error) {
    console.error("Failed to generate compliance review AI narrative summary:", error);
    return null;
  }
}
