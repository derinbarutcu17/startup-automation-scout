import { describe, expect, it } from "vitest";
import { createProspectDossierPdfs } from "@/src/modules/prospect-pdf";
import { exportProspectDossier } from "@/src/modules/hermes-export";

describe("prospect PDF export", () => {
  it("creates both redacted PDF files", async () => {
    const bundle = exportProspectDossier({
      dossier: { id: "d1", companyId: "c1", researchDossierId: "r1", version: 1, schemaVersion: "prospect-dossier.v1", status: "drafts_ready", knownUnknowns: ["Confirm owner"], openQuestions: [], sourceCoverage: {}, freshnessSummary: {}, generatedAt: new Date().toISOString() },
      company: { id: "c1", canonicalName: "BerlinFlow", canonicalDomain: "berlinflow.example" },
      opportunity: { id: "o1", proposedSystem: "Lead intake automation" },
      capabilityOffers: [{ capability: "Product design", whatDerinCanDo: "Design a clear workflow.", whyItMayFit: "The intake process needs clarity.", proofLinks: ["https://derinb.vercel.app/"] }],
      persons: [{ id: "p1", fullName: "Ava Richter", roleTitle: "Head of Operations", profileUrl: "https://berlinflow.example/team", status: "reviewed", lastVerifiedAt: new Date().toISOString() }],
      contacts: [{ id: "contact-1", channelType: "public_professional_email", displayValue: "ava@berlinflow.example", normalizedValue: "ava@berlinflow.example", status: "source_verified", lastCheckedAt: new Date().toISOString() }],
      angles: [{ id: "a1", title: "Intake handoff", thesis: "A focused workflow hypothesis", verifiedSignal: "The public site describes a growing operation.", workflowHypothesis: "Requests may be triaged manually.", relevanceReason: "The role owns operations.", valueHypothesis: "A shorter handoff could reduce delay.", callToAction: "Open to a short review?", evidenceIds: ["e1"], claimIds: ["c1"], confidence: "medium" }],
      drafts: [{ id: "m1", stepNumber: 1, purpose: "Initial note", subject: "A question about intake", body: "Would a short workflow review be useful?", state: "generated", contentFingerprint: "abc12345", evidenceIds: ["e1"], claimIds: ["c1"] }],
      evidences: [{ evidence: { id: "e1", normalizedContent: "Public source data.", sourceLocator: "team page" }, source: { canonicalUrl: "https://berlinflow.example/team", sourceTier: "tier_1" } }],
      claims: [{ id: "c1", claimText: "Verified claim", claimType: "verified", confidence: "high" }],
      approvals: [],
      options: { includeContacts: false },
    });
    const pdfs = await createProspectDossierPdfs(bundle);
    expect(pdfs.dossier.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfs.outreach.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfs.dossier.length).toBeGreaterThan(1000);
    expect(pdfs.outreach.length).toBeGreaterThan(1000);
    expect(pdfs.dossier.toString("latin1")).not.toContain("ava@berlinflow.example");
    expect(pdfs.outreach.toString("latin1")).not.toContain("ava@berlinflow.example");
    expect(bundle.json).toMatchObject({ capabilityOffers: [expect.objectContaining({ capability: "Product design" })] });
  });
});
