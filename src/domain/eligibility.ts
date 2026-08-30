import type { EligibilityDecision } from "@/src/domain/types";

export interface EligibilityCompany {
  id: string;
  normalizedLocation: string | null;
  status: string;
  identityStatus: string;
}

export interface EligibilitySignals {
  hasUsablePublicSource: boolean;
  prohibitedOnlySourcePath?: boolean;
  automationRelevant?: boolean;
}

export interface TargetProfile {
  geographicScope: string[];
  deferUnknownGeography?: boolean;
}

export function evaluateCompany(
  company: EligibilityCompany,
  knownSignals: EligibilitySignals,
  targetProfile: TargetProfile,
  now = new Date(),
): EligibilityDecision {
  const failures: string[] = [];
  const unresolved: string[] = [];
  const location = company.normalizedLocation?.toLowerCase() ?? null;
  const scopes = targetProfile.geographicScope.map((value) => value.toLowerCase());

  if (company.identityStatus !== "resolved") failures.push("identity_unresolved");
  if (company.status === "closed" || company.status === "inactive") failures.push("company_inactive");
  if (!knownSignals.hasUsablePublicSource) failures.push("no_usable_public_source");
  if (knownSignals.prohibitedOnlySourcePath) failures.push("prohibited_access_dependency");
  if (knownSignals.automationRelevant === false) failures.push("automation_irrelevant");
  if (location) {
    const matches = scopes.some((scope) => location.includes(scope));
    if (!matches) failures.push("outside_geography");
  } else {
    unresolved.push("geography_unknown");
    if (targetProfile.deferUnknownGeography) failures.push("geography_unresolved");
  }

  return {
    companyId: company.id,
    eligible: failures.length === 0,
    reasonCodes: failures.length ? failures : ["eligible"],
    supportingClaimIds: [],
    unresolvedChecks: unresolved,
    policyVersion: "eligibility-v1",
    decidedAt: now.toISOString(),
  };
}
