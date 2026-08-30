import type { GmailDraftInput, GmailDraftResult, GmailDraftProvider, PeopleProvider, PersonCandidate } from "@/src/providers/contracts";
import type { ProviderResult } from "@/src/domain/types";

export const HAPPY_PERSON_DOMAIN = "berlinflow.example";

const happyCandidates: PersonCandidate[] = [
  {
    fullName: "Ava Richter",
    roleTitle: "Head of Operations",
    function: "operations",
    seniority: "head",
    profileUrl: "https://fixtures.scout.test/berlinflow/team#ava-richter",
    profilePlatform: "company_team_page",
    sourceUrl: "https://fixtures.scout.test/berlinflow/team",
    sourceTier: "tier_1",
    contactValue: "ava.richter@berlinflow.example",
    contactChannel: "public_professional_email",
    confidence: "high",
  },
  {
    fullName: "Jonas Keller",
    roleTitle: "Logistics Lead",
    function: "logistics",
    seniority: "lead",
    profileUrl: "https://www.linkedin.com/in/jonas-keller-berlinflow",
    profilePlatform: "linkedin",
    sourceUrl: "https://fixtures.scout.test/berlinflow/team",
    sourceTier: "tier_1",
    contactValue: null,
    contactChannel: null,
    confidence: "medium",
  },
  {
    fullName: "Mira Chen",
    roleTitle: "Carrier Ops Manager",
    function: "carrier_operations",
    seniority: "manager",
    profileUrl: "https://fixtures.scout.test/berlinflow/team#mira-chen",
    profilePlatform: "company_team_page",
    sourceUrl: "https://fixtures.scout.test/berlinflow/team",
    sourceTier: "tier_1",
    contactValue: null,
    contactChannel: null,
    confidence: "medium",
  },
];

const sparseCandidates: PersonCandidate[] = [];
const contradictoryCandidates: PersonCandidate[] = [
  {
    fullName: "Samir Patel",
    roleTitle: "Finance Lead",
    function: "finance",
    seniority: "lead",
    profileUrl: "https://fixtures.scout.test/contradictpay/team#samir",
    profilePlatform: "company_team_page",
    sourceUrl: "https://fixtures.scout.test/contradictpay/company",
    sourceTier: "tier_1",
    contactValue: null,
    contactChannel: null,
    confidence: "low",
  },
];

function usage(providerId: string, operation: string, costEur = 0, latencyMs = 1) {
  return { providerId, operation, requestCount: 1, costEur, latencyMs };
}

export class FixturePeopleProvider implements PeopleProvider {
  id = "fixture";

  async findProfessionalCandidates(company: { name: string; domain: string }, roleQuestions?: string[]): Promise<ProviderResult<PersonCandidate[]>> {
    void roleQuestions;
    const domain = company.domain.toLowerCase();
    if (domain.includes(HAPPY_PERSON_DOMAIN) || domain.includes("berlinflow")) {
      return { ok: true, value: happyCandidates, usage: usage(this.id, "people_search", 0.02) };
    }
    if (domain.includes("quietstack") || domain.includes("sparse")) {
      return { ok: true, value: sparseCandidates, usage: usage(this.id, "people_search", 0.01) };
    }
    if (domain.includes("contradictpay")) {
      return { ok: true, value: contradictoryCandidates, usage: usage(this.id, "people_search", 0.01) };
    }
    if (domain.includes("timeout")) {
      return { ok: false, category: "timeout", retryable: true, message: "Fixture people timeout", usage: usage(this.id, "people_search") };
    }
    if (domain.includes("budget_denied")) {
      return { ok: false, category: "budget_denied", retryable: false, message: "Fixture budget denied", usage: usage(this.id, "people_search") };
    }
    return { ok: true, value: [], usage: usage(this.id, "people_search", 0.01) };
  }
}

export class ManualPeopleProvider implements PeopleProvider {
  id = "manual";
  async findProfessionalCandidates(): Promise<ProviderResult<PersonCandidate[]>> {
    return { ok: true, value: [], usage: { providerId: this.id, operation: "people_search", requestCount: 0, costEur: 0, latencyMs: 0 } };
  }
}

export class FixtureGmailProvider implements GmailDraftProvider {
  id = "fixture-gmail";
  async createDraft(input: GmailDraftInput): Promise<ProviderResult<GmailDraftResult>> {
    if (input.to.includes("suppressed") || input.to.includes("blocked")) {
      return { ok: false, category: "access_denied", retryable: false, message: "Contact suppressed", usage: { providerId: this.id, operation: "gmail_create_draft", requestCount: 1, latencyMs: 5, costEur: 0 } };
    }
    if (input.subject.includes("INJECT_FAIL") || input.body.includes("INJECT_FAIL")) {
      return { ok: false, category: "invalid_response", retryable: false, message: "Fixture invalid draft", usage: { providerId: this.id, operation: "gmail_create_draft", requestCount: 1, latencyMs: 5, costEur: 0 } };
    }
    const fakeId = `gmail-draft-${Buffer.from(input.to + input.subject).toString("base64").slice(0, 12)}`;
    return { ok: true, value: { draftId: fakeId, messageId: `msg-${fakeId}` }, usage: { providerId: this.id, operation: "gmail_create_draft", requestCount: 1, latencyMs: 5, costEur: 0 } };
  }
}
