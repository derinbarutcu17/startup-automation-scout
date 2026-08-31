import type { EligibilityDecision } from "@/src/domain/types";

export interface EligibilityCompany {
  id: string;
  canonicalName?: string;
  canonicalDomain?: string;
  normalizedLocation: string | null;
  status: string;
  identityStatus: string;
}

export interface EligibilitySignals {
  hasUsablePublicSource: boolean;
  prohibitedOnlySourcePath?: boolean;
  automationRelevant?: boolean;
  location?: string | null;
  employeeCount?: number | null;
  companySize?: "small" | "medium" | "large" | "unknown" | null;
  sizeEvidenceSource?: string | null;
}

export interface TargetProfile {
  geographicScope: string[];
  deferUnknownGeography?: boolean;
  companySizePolicy?: "any" | "small_or_medium";
  maxEmployeeCount?: number;
  requireCompanySizeEvidence?: boolean;
  excludedCompanyNames?: string[];
  excludedCompanyDomains?: string[];
}

export function evaluateCompany(
  company: EligibilityCompany,
  knownSignals: EligibilitySignals,
  targetProfile: TargetProfile,
  now = new Date(),
): EligibilityDecision {
  const failures: string[] = [];
  const unresolved: string[] = [];
  const location = (knownSignals.location ?? company.normalizedLocation)?.toLowerCase() ?? null;
  const scopes = targetProfile.geographicScope.map((value) => value.toLowerCase());
  const canonicalName = company.canonicalName?.trim().toLowerCase();
  const canonicalDomain = company.canonicalDomain?.trim().toLowerCase().replace(/^www\./, "");
  const excludedNames = (targetProfile.excludedCompanyNames ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
  const excludedDomains = (targetProfile.excludedCompanyDomains ?? []).map((value) => value.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean);

  if (company.identityStatus !== "resolved") failures.push("identity_unresolved");
  if (company.status === "closed" || company.status === "inactive") failures.push("company_inactive");
  if (!knownSignals.hasUsablePublicSource) failures.push("no_usable_public_source");
  if (knownSignals.prohibitedOnlySourcePath) failures.push("prohibited_access_dependency");
  if (knownSignals.automationRelevant === false) failures.push("automation_irrelevant");
  if ((canonicalName && excludedNames.includes(canonicalName)) || (canonicalDomain && excludedDomains.some((domain) => canonicalDomain === domain || canonicalDomain.endsWith(`.${domain}`)))) failures.push("company_explicitly_excluded");
  if (targetProfile.companySizePolicy === "small_or_medium") {
    if (knownSignals.employeeCount != null && knownSignals.employeeCount > (targetProfile.maxEmployeeCount ?? 500)) failures.push("company_too_large");
    else if (knownSignals.companySize === "large") failures.push("company_too_large");
    else if (targetProfile.requireCompanySizeEvidence && knownSignals.employeeCount == null && (!knownSignals.companySize || knownSignals.companySize === "unknown")) {
      unresolved.push("company_size_unknown");
      failures.push("company_size_unknown");
    }
  }
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
