import { describe, expect, it } from "vitest";
import { defaultRunConfiguration } from "@/src/application/configuration";
import { createScoutRun } from "@/src/application/scout-service";
import { persistClaimWithEvidence, persistEvidenceItem, persistSourceDocument, recordReviewDecision, resolveManualCompany } from "@/src/infrastructure/db/repositories";

describe("repository invariants", () => {
  it("rejects a verified claim without evidence and accepts the supported path", async () => {
    const run = await createScoutRun(defaultRunConfiguration());
    const { company } = await resolveManualCompany(`https://repo-invariant-${run.id}.example`, run.id);
    const source = await persistSourceDocument({ companyId: company.id, canonicalUrl: `https://repo-invariant-${run.id}.example/about`, sourceTier: "tier_1", title: "Invariant source", fetchedAt: new Date(), contentFingerprint: `fingerprint-${run.id}-1`, retrievalStatus: "retrieved", extractedText: "A bounded source.", byteLength: 17 });
    await expect(persistClaimWithEvidence({ companyId: company.id, subject: "product", claimText: "Unsupported fact", claimType: "verified", confidence: "high", evidenceItemIds: [] })).rejects.toThrow("verified_claim_requires_evidence");
    const evidence = await persistEvidenceItem({ sourceDocumentId: source.document.id, evidenceType: "direct_quote_paraphrase", normalizedContent: "The product has a public workflow.", sourceLocator: "paragraph 1", extractionMethod: "integration-test" });
    const claim = await persistClaimWithEvidence({ companyId: company.id, subject: "product", claimText: "The product has a public workflow.", claimType: "verified", confidence: "high", evidenceItemIds: [evidence.evidenceItem.id] });
    expect(claim.id).toBeTruthy();
  });

  it("keeps changed source versions and review decisions append-only", async () => {
    const run = await createScoutRun(defaultRunConfiguration());
    const { company } = await resolveManualCompany(`https://versioned-${run.id}.example`, run.id);
    const first = await persistSourceDocument({ companyId: company.id, canonicalUrl: `https://versioned-${run.id}.example/about`, sourceTier: "tier_1", fetchedAt: new Date(), contentFingerprint: "version-a", retrievalStatus: "retrieved", extractedText: "A", byteLength: 1 });
    const second = await persistSourceDocument({ companyId: company.id, canonicalUrl: `https://versioned-${run.id}.example/about`, sourceTier: "tier_1", fetchedAt: new Date(), contentFingerprint: "version-b", retrievalStatus: "retrieved", extractedText: "B", byteLength: 1 });
    expect(first.document.version).toBe(1);
    expect(second.document.version).toBe(2);
    const firstReview = await recordReviewDecision({ targetType: "company", targetId: company.id, decision: "investigate", note: "First pass" });
    const secondReview = await recordReviewDecision({ targetType: "company", targetId: company.id, decision: "prototype", note: "Second pass" });
    expect(secondReview.id).not.toBe(firstReview.id);
  });
});
