import { getEnv } from "@/src/infrastructure/config/env";
import { validateContactPoint } from "@/src/domain/contact-policy";
import {
  createContactPoint,
  createPersonClaim,
  createPersonProfile,
} from "@/src/infrastructure/db/repositories-prospect";
import type { PeopleProvider, PersonCandidate } from "@/src/providers/contracts";
import type { ProviderResult } from "@/src/domain/types";

export interface PersonResearchBudget {
  maxPeople: number;
  maxSearchRequests: number;
  maxModelSpendEur: number;
  maxRuntimeSeconds: number;
}

export interface CandidateSourceResolution {
  sourceDocumentId?: string | null;
  evidenceItemIds?: string[];
  roleVerified?: boolean;
  contactVerified?: boolean;
}

export interface PersonResearchResult {
  persons: Awaited<ReturnType<typeof createPersonProfile>>["profile"][];
  contacts: Awaited<ReturnType<typeof createContactPoint>>["point"][];
  warnings: string[];
  costEur: number;
}

function dedupCandidates(candidates: PersonCandidate[]): PersonCandidate[] {
  const seen = new Set<string>();
  const out: PersonCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.fullName.trim().toLowerCase()}|${(candidate.profileUrl ?? "").toLowerCase()}|${(candidate.contactValue ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

function isLinkedInProfileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password && (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com"));
  } catch {
    return false;
  }
}

function failure(provider: PeopleProvider, message: string): ProviderResult<PersonResearchResult> {
  return {
    ok: false,
    category: "budget_denied",
    retryable: false,
    message,
    usage: { providerId: provider.id, operation: "people_search", requestCount: 0, costEur: 0, latencyMs: 0 },
  };
}

export async function researchPeople(
  company: { id: string; canonicalName: string; canonicalDomain: string },
  _dossier: { claims: Array<{ id: string; claimType: string; subject: string }> },
  peopleProvider: PeopleProvider,
  opts?: {
    budget?: Partial<PersonResearchBudget>;
    resolveSource?: (candidate: PersonCandidate) => Promise<CandidateSourceResolution>;
  },
): Promise<ProviderResult<PersonResearchResult>> {
  const budget: PersonResearchBudget = {
    maxPeople: opts?.budget?.maxPeople ?? getEnv().PROSPECT_MAX_PEOPLE,
    maxSearchRequests: opts?.budget?.maxSearchRequests ?? getEnv().PROSPECT_BUDGET_MAX_SEARCH_REQUESTS,
    maxModelSpendEur: opts?.budget?.maxModelSpendEur ?? getEnv().PROSPECT_BUDGET_MAX_MODEL_SPEND,
    maxRuntimeSeconds: opts?.budget?.maxRuntimeSeconds ?? getEnv().PROSPECT_BUDGET_MAX_RUNTIME_SECONDS,
  };
  const roleQuestions = [
    `Who owns operations or logistics workflow at ${company.canonicalName}?`,
    "Who leads carrier or exception handling?",
    "What public team page shows Operations roles?",
  ];
  const startedAt = Date.now();
  const result = await peopleProvider.findProfessionalCandidates(
    { name: company.canonicalName, domain: company.canonicalDomain },
    roleQuestions,
  );
  if (!result.ok) return result as ProviderResult<PersonResearchResult>;

  const costEur = result.usage?.costEur ?? 0;
  const requestCount = result.usage?.requestCount ?? 0;
  if (requestCount > budget.maxSearchRequests) return failure(peopleProvider, "people_search_budget_exceeded");
  if (costEur > budget.maxModelSpendEur) return failure(peopleProvider, "people_model_budget_exceeded");

  const deduped = dedupCandidates(result.value);
  const candidates = deduped.slice(0, budget.maxPeople);
  const warnings: string[] = [];
  if (deduped.length > budget.maxPeople) warnings.push("truncated_to_max_people");
  if (candidates.length === 0) warnings.push("no_public_person_found");

  const persons: PersonResearchResult["persons"] = [];
  const contacts: PersonResearchResult["contacts"] = [];

  for (const candidate of candidates) {
    if (Date.now() - startedAt > budget.maxRuntimeSeconds * 1000) {
      warnings.push("runtime_budget_exceeded_partial");
      break;
    }

    let source: CandidateSourceResolution = {};
    if (opts?.resolveSource && candidate.sourceUrl) {
      try {
        source = await opts.resolveSource(candidate);
      } catch (error) {
        warnings.push(`source_failed:${candidate.fullName}:${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      const evidenceItemIds = [...new Set(source.evidenceItemIds ?? [])];
      const created = await createPersonProfile({
        companyId: company.id,
        fullName: candidate.fullName,
        roleTitle: candidate.roleTitle ?? null,
        function: candidate.function ?? null,
        seniority: candidate.seniority ?? null,
        profileUrl: candidate.profileUrl ?? null,
        profilePlatform: candidate.profilePlatform ?? null,
        discoveryMethod: candidate.sourceUrl ? `people_provider:${peopleProvider.id}` : `people_provider:${peopleProvider.id}:no_source`,
        sourceDocumentIds: source.sourceDocumentId ? [source.sourceDocumentId] : [],
        evidenceItemIds,
      });

      if (candidate.roleTitle) {
        if (source.roleVerified && evidenceItemIds.length) {
          await createPersonClaim({
            personProfileId: created.profile.id,
            companyId: company.id,
            subject: "role",
            claimText: candidate.roleTitle,
            claimType: "verified",
            confidence: candidate.confidence ?? "medium",
            evidenceItemIds,
          });
        } else {
          await createPersonClaim({
            personProfileId: created.profile.id,
            companyId: company.id,
            subject: "role",
            claimText: candidate.roleTitle,
            claimType: "inferred",
            confidence: candidate.confidence ?? "medium",
            reasoningSummary: "The provider returned this role, but a retained source did not verify it.",
            evidenceItemIds: [],
          });
        }
      }
      persons.push(created.profile);

      if (candidate.contactValue && candidate.contactChannel) {
        const normalized = candidate.contactValue.trim().toLowerCase();
        const status: "source_verified" | "candidate" = source.contactVerified && source.sourceDocumentId
          ? "source_verified"
          : "candidate";
        const discoveryMethod = `people_provider:${peopleProvider.id}`;
        const validation = validateContactPoint({
          channelType: candidate.contactChannel,
          normalizedValue: normalized,
          status,
          discoveryMethod,
          sourceDocumentId: source.sourceDocumentId ?? null,
          userSupplied: false,
        });
        if (!validation.ok) {
          warnings.push(`contact_rejected:${candidate.fullName}:${validation.reason}`);
        } else {
          const point = await createContactPoint({
            personProfileId: created.profile.id,
            channelType: candidate.contactChannel,
            normalizedValue: normalized,
            displayValue: candidate.contactValue,
            sourceDocumentId: source.sourceDocumentId ?? null,
            userSupplied: false,
            status,
            confidence: candidate.confidence ?? "medium",
            discoveryMethod,
          });
          contacts.push(point.point);
        }
      } else if (candidate.profileUrl && isLinkedInProfileUrl(candidate.profileUrl)) {
        const point = await createContactPoint({
          personProfileId: created.profile.id,
          channelType: "public_profile_url",
          normalizedValue: candidate.profileUrl.trim().toLowerCase(),
          displayValue: candidate.profileUrl,
          sourceDocumentId: source.sourceDocumentId ?? null,
          userSupplied: false,
          status: "candidate",
          confidence: candidate.confidence ?? "medium",
          discoveryMethod: `people_provider:${peopleProvider.id}:profile_url`,
        });
        contacts.push(point.point);
      }
    } catch (error) {
      warnings.push(`person_failed:${candidate.fullName}:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { ok: true, value: { persons, contacts, warnings, costEur }, usage: result.usage };
}
