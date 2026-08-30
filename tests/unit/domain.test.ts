import { describe, expect, it } from "vitest";
import { evaluateCompany } from "@/src/domain/eligibility";
import { displayNameFromDomain, normalizeAlias, normalizeDomain } from "@/src/domain/identity";
import { validateOpportunity } from "@/src/domain/quality-gate";
import { opportunityWeights, rankWithUncertainty, weightedScore } from "@/src/domain/scoring";
import { canTransitionRunStage, transitionRunStage } from "@/src/domain/state-machine";
import type { AutomationOpportunityInput } from "@/src/domain/types";

describe("identity", () => {
  it("normalizes URLs, www prefixes, case, and IDNA", () => {
    expect(normalizeDomain(" HTTPS://WWW.Example.COM/path ")).toBe("example.com");
    expect(normalizeDomain("https://münich.example")).toBe("xn--mnich-kva.example");
    expect(displayNameFromDomain("north-star.example")).toBe("North Star");
    expect(normalizeAlias("  North   Star  ")).toBe("north star");
  });

  it("rejects unsupported protocols", () => {
    expect(() => normalizeDomain("file:///etc/passwd")).toThrow(/HTTP\(S\)/);
  });
});

describe("eligibility", () => {
  const baseCompany = { id: "company-1", normalizedLocation: "Berlin, Germany", status: "active", identityStatus: "resolved" };
  const profile = { geographicScope: ["Berlin", "Germany"] };

  it("passes a resolved Berlin company with a usable public source", () => {
    const decision = evaluateCompany(baseCompany, { hasUsablePublicSource: true }, profile, new Date("2026-08-30T00:00:00Z"));
    expect(decision.eligible).toBe(true);
    expect(decision.reasonCodes).toEqual(["eligible"]);
  });

  it("keeps unknown geography explicit without fabricating rejection by default", () => {
    const decision = evaluateCompany({ ...baseCompany, normalizedLocation: null }, { hasUsablePublicSource: true }, profile);
    expect(decision.eligible).toBe(true);
    expect(decision.unresolvedChecks).toContain("geography_unknown");
  });

  it("rejects verified outside geography and prohibited-only access", () => {
    const decision = evaluateCompany(
      { ...baseCompany, normalizedLocation: "Paris, France" },
      { hasUsablePublicSource: true, prohibitedOnlySourcePath: true },
      profile,
    );
    expect(decision.eligible).toBe(false);
    expect(decision.reasonCodes).toEqual(expect.arrayContaining(["outside_geography", "prohibited_access_dependency"]));
  });
});

describe("run state machine", () => {
  it("allows only the next canonical stage", () => {
    expect(canTransitionRunStage("CREATED", "DISCOVERING")).toBe(true);
    expect(canTransitionRunStage("CREATED", "SCREENING")).toBe(false);
    expect(transitionRunStage("RANKING", "READY_FOR_REVIEW")).toBe("READY_FOR_REVIEW");
    expect(() => transitionRunStage("CREATED", "RESEARCHING")).toThrow(/Illegal run stage transition/);
  });
});

describe("deterministic scoring", () => {
  it("calculates the canonical weighted score reproducibly", () => {
    const dimensions = {
      evidenceStrength: 4,
      painPlausibility: 3,
      automationLeverage: 4,
      measurability: 4,
      buildability: 3,
      differentiation: 3,
      portfolioCareerSignal: 4,
    };
    expect(weightedScore(dimensions, opportunityWeights)).toBe(91.25);
    expect(weightedScore(dimensions, opportunityWeights)).toBe(91.25);
  });

  it("rejects scores outside the 0-4 ordinal rubric", () => {
    const invalidDimensions = { ...Object.fromEntries(Object.keys(opportunityWeights).map((key) => [key, 4])), buildability: 5 } as unknown as typeof opportunityWeights;
    expect(() => weightedScore(invalidDimensions, opportunityWeights)).toThrow(/Invalid 0-4 score/);
  });

  it("uses confidence inside the uncertainty band and stable ids for exact ties", () => {
    const ranked = rankWithUncertainty([
      { item: { id: "b" }, score: 91, confidence: "high" },
      { item: { id: "a" }, score: 92, confidence: "medium" },
      { item: { id: "c" }, score: 80, confidence: "high" },
    ]);
    expect(ranked.map((row) => row.item.id)).toEqual(["b", "a", "c"]);

    const ties = rankWithUncertainty([
      { item: { id: "z" }, score: 90, confidence: "medium" },
      { item: { id: "a" }, score: 90, confidence: "medium" },
    ], 0);
    expect(ties.map((row) => row.item.id)).toEqual(["a", "z"]);
  });
});

describe("quality gate", () => {
  const validOpportunity: AutomationOpportunityInput = {
    proposedSystem: "Route incoming implementation requests into a structured triage queue tied to the observed integration workflow.",
    deterministicSteps: ["Capture request", "Validate required fields"],
    aiRequiredSteps: ["Classify ambiguous implementation context"],
    requiredIntegrations: ["Existing public API"],
    requiredPrivateAccess: [],
    measurableOutcome: "Measure median request-to-triage time and rework rate during a pilot.",
    buildability: "high",
    evidenceStrength: "high",
    genericnessStatus: "specific",
    risks: ["Private workflow shape still requires confirmation"],
    nextValidationStep: "Confirm the current triage handoff with one operator.",
    rankingConfidence: "high",
  };

  it("passes evidence-backed, measurable, specific opportunities", () => {
    const result = validateOpportunity(validOpportunity, {
      evidenceItemIds: ["evidence-1"],
      hasVerifiedCompanyClaim: true,
    });
    expect(result.passed).toBe(true);
    expect(result.failureCodes).toEqual([]);
  });

  it("rejects generic, unsupported, fabricated savings and inaccessible access", () => {
    const result = validateOpportunity({
      ...validOpportunity,
      proposedSystem: "Generic chatbot that saves €5000 per month.",
      genericnessStatus: "generic",
      requiredPrivateAccess: ["Production CRM admin"],
    }, {
      evidenceItemIds: [],
      hasVerifiedCompanyClaim: false,
      inaccessiblePrivateAccess: true,
    });

    expect(result.passed).toBe(false);
    expect(result.failureCodes).toEqual(expect.arrayContaining([
      "no_company_specific_evidence",
      "generic_suggestion",
      "fabricated_precise_savings",
      "inaccessible_private_access",
    ]));
  });
});
