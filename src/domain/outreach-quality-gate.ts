const preciseSavingsPattern = /(?:€|\$|£)\s?\d|\b\d+(?:\.\d+)?\s?%|\d+(?:\.\d+)?\s?(?:hours?|hrs?)\s+(?:saved|per\s+week|per\s+month|per\s+year)/i;
const falseFamiliarity = /(?:as you know|as we discussed|great chatting|following up on our call)/i;
const sensitivePattern = /(?:religion|politics|health|disability|sexual orientation|ethnicity|race)/i;

export interface OutreachGateContext {
  evidenceItemIds: string[];
  claimIds?: string[];
  personClaimIds?: string[];
  hasVerifiedCompanyClaim: boolean;
  verifiedEvidenceRefPresent: boolean;
  contactEligible: boolean;
  contactSuppressed?: boolean;
  contactStale?: boolean;
  unsupportedPreciseSavings?: boolean;
  sensitiveInference?: boolean;
  falseFamiliarity?: boolean;
  usesInferredAsVerified?: boolean;
  genericness?: "specific" | "borderline" | "generic";
  platformRestriction?: boolean;
  supportText: string; // combined subject+body for pattern checks
}

export interface OutreachGateResult {
  passed: boolean;
  failureCodes: string[];
  warningCodes: string[];
  checkedEvidenceItemIds: string[];
}

export function validateOutreachAngle(input: {
  evidenceIds: string[];
  claimIds: string[];
  verifiedSignal: string;
  supportText?: string;
  hasVerifiedCompanyClaim: boolean;
  genericness?: string;
}): OutreachGateResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  if (!input.hasVerifiedCompanyClaim) failures.push("no_company_verified_claim");
  if ((input.evidenceIds ?? []).length === 0) failures.push("no_evidence_reference");
  if ((input.claimIds ?? []).length === 0) failures.push("no_claim_reference");
  if (!input.verifiedSignal.trim()) failures.push("missing_verified_signal");
  if (input.supportText && preciseSavingsPattern.test(input.supportText)) failures.push("fabricated_precise_savings");
  if (input.supportText && sensitivePattern.test(input.supportText)) failures.push("sensitive_personal_inference");
  if (input.supportText && falseFamiliarity.test(input.supportText)) failures.push("false_familiarity");
  if (input.genericness === "generic") failures.push("generic_angle");
  if (input.genericness === "borderline") warnings.push("borderline_genericness");
  return { passed: failures.length === 0, failureCodes: [...new Set(failures)], warningCodes: [...new Set(warnings)], checkedEvidenceItemIds: [...new Set(input.evidenceIds)] };
}

export function validateDraftSequence(input: OutreachGateContext): OutreachGateResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!input.hasVerifiedCompanyClaim) failures.push("no_company_verified_claim");
  if (!input.verifiedEvidenceRefPresent || input.evidenceItemIds.length === 0) failures.push("no_evidence_reference");
  if (input.usesInferredAsVerified) failures.push("inferred_as_verified");
  if (!input.contactEligible) failures.push("contact_not_eligible");
  if (input.contactSuppressed) failures.push("contact_suppressed");
  if (input.contactStale) failures.push("contact_stale");
  if (input.unsupportedPreciseSavings || preciseSavingsPattern.test(input.supportText)) failures.push("fabricated_precise_savings");
  if (input.sensitiveInference || sensitivePattern.test(input.supportText)) failures.push("sensitive_personal_inference");
  if (input.falseFamiliarity || falseFamiliarity.test(input.supportText)) failures.push("false_familiarity");
  if (input.genericness === "generic") failures.push("generic_message");
  if (input.platformRestriction) failures.push("platform_access_restriction");

  if (input.genericness === "borderline") warnings.push("borderline_genericness");
  if (input.supportText.trim().split(/\s+/).length < 30) warnings.push("thin_personalization");

  return { passed: failures.length === 0, failureCodes: [...new Set(failures)], warningCodes: [...new Set(warnings)], checkedEvidenceItemIds: [...new Set(input.evidenceItemIds)] };
}

export function isGenericAngle(text: string): boolean {
  // Simple heuristic matching description: if company name and evidence removed, could send to 50 startups unchanged
  // We approximate by checking placeholder evidence tokens absent
  const hasPlaceholders = /\{\{|\[company|berlinflow|workflow_signal/i.test(text);
  return !hasPlaceholders && /generic|chatbot|lead gen/i.test(text);
}
