import { Finding } from "../validation/helpers";

export interface RiskSummary {
  status: "ready_to_file" | "review_required" | "high_risk";
  estimated_exposure: number;
  confidence: number;
}

/**
 * aggregates findings into overall status:
 * - any open critical → HIGH_RISK
 * - else any open warning → REVIEW_REQUIRED
 * - else → READY_TO_FILE
 * 
 * Also sums exposure across open findings and computes an overall confidence figure.
 */
export function calculateRisk(findings: Finding[]): RiskSummary {
  const openFindings = findings.filter(f => f.status === "open");

  let status: "ready_to_file" | "review_required" | "high_risk" = "ready_to_file";
  
  const hasCritical = openFindings.some(f => f.severity === "critical");
  const hasWarning = openFindings.some(f => f.severity === "warning");

  if (hasCritical) {
    status = "high_risk";
  } else if (hasWarning) {
    status = "review_required";
  }

  // Sum exposure across open findings
  const estimated_exposure = openFindings.reduce((sum, f) => sum + (f.exposure || 0), 0);

  // Compute overall confidence figure
  // Default is 100% if no findings.
  // Each open finding reduces overall filing confidence.
  // A critical finding reduces confidence by 15%, warning by 8%, info by 2%.
  // Minimum confidence is capped at 10%.
  let confidence = 100;
  openFindings.forEach(f => {
    if (f.severity === "critical") {
      confidence -= 15;
    } else if (f.severity === "warning") {
      confidence -= 8;
    } else {
      confidence -= 2;
    }
  });

  if (confidence < 10) confidence = 10;

  return {
    status,
    estimated_exposure,
    confidence
  };
}
