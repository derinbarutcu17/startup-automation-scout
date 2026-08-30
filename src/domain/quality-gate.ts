import type { AutomationOpportunityInput, QualityGateResult } from "@/src/domain/types";

const preciseSavingsPattern = /(?:€|\$|£)\s?\d|\d+(?:\.\d+)?\s?(?:hours?|hrs?)\s+(?:saved|per\s+week|per\s+month|per\s+year)/i;

export interface QualityGateContext {
  evidenceItemIds: string[];
  hasVerifiedCompanyClaim: boolean;
  unsupportedVerifiedFacts?: boolean;
  inaccessiblePrivateAccess?: boolean;
  duplicatesExistingCapability?: boolean;
  platformRestriction?: boolean;
}

export function validateOpportunity(
  opportunity: AutomationOpportunityInput,
  context: QualityGateContext,
  policyVersion = "evidence-v1",
): QualityGateResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const joined = [opportunity.proposedSystem, opportunity.measurableOutcome, ...opportunity.risks].join(" ");
  if (!context.hasVerifiedCompanyClaim || context.evidenceItemIds.length === 0) failures.push("no_company_specific_evidence");
  if (opportunity.genericnessStatus === "generic") failures.push("generic_suggestion");
  if (!opportunity.measurableOutcome.trim()) failures.push("missing_measurable_outcome");
  if (preciseSavingsPattern.test(joined)) failures.push("fabricated_precise_savings");
  if (context.unsupportedVerifiedFacts) failures.push("unsupported_verified_fact");
  if (context.inaccessiblePrivateAccess) failures.push("inaccessible_private_access");
  if (context.duplicatesExistingCapability) failures.push("duplicates_existing_capability");
  if (context.platformRestriction) failures.push("platform_access_restriction");
  if (opportunity.genericnessStatus === "borderline") warnings.push("borderline_genericness");
  if (opportunity.requiredPrivateAccess.length > 0) warnings.push("private_access_requires_validation");
  return {
    passed: failures.length === 0,
    failureCodes: [...new Set(failures)],
    warningCodes: [...new Set(warnings)],
    checkedEvidenceItemIds: [...new Set(context.evidenceItemIds)],
    policyVersion,
  };
}
