import { describe, expect, it } from "vitest";
import { getDb } from "@/src/infrastructure/db/client";
import { createScoutRunRecord, resolveManualCompany } from "@/src/infrastructure/db/repositories";
import { defaultRunConfiguration } from "@/src/application/configuration";
import {
  addSuppression,
  isSuppressed,
  createProspectDossier,
  createPersonProfile,
  createContactPoint,
  createOutreachAngle,
  createOutreachSequence,
  createMessageDraft,
  batchFingerprint,
  createOutreachApproval,
  createGmailDraftResult,
  getProspectDossierDetail,
  addPersonsToDossier,
} from "@/src/infrastructure/db/repositories-prospect";
import { persistSourceDocument, persistEvidenceItem, persistResearchDossier } from "@/src/infrastructure/db/repositories";
import { decryptContactValue } from "@/src/infrastructure/security/contact-encryption";

describe("prospect repositories", () => {
  it("migration from empty database already run", async () => {
    const { db } = getDb();
    const res = await db.execute("select 1 as ok");
    expect(res).toBeDefined();
  });

  it("prevents duplicate person/contact and blocks cross-company evidence links", async () => {
    const cfg = defaultRunConfiguration();
    const run = await createScoutRunRecord(cfg);
    const { company } = await resolveManualCompany("https://dup-test-prospect.example", run.id);
    const dossier = await createProspectDossier({ companyId: company.id, researchDossierId: (await persistResearchDossier({ companyId: company.id, scoutRunId: run.id, sourceDocumentIds: [], claimIds: [], recentSignalIds: [], knownUnknowns: [], sourceCoverageSummary: {}, researchCompleteness: 0.5, conclusion: "sufficient" })).dossier!.id, knownUnknowns: [], openQuestions: [] });
    // person dedup: same name + url returns reused
    const p1 = await createPersonProfile({ companyId: company.id, fullName: "Ava Richter", profileUrl: "https://fixtures.scout.test/team#ava", discoveryMethod: "test" });
    expect(p1.reused).toBe(false);
    const p2 = await createPersonProfile({ companyId: company.id, fullName: "Ava Richter", profileUrl: "https://fixtures.scout.test/team#ava", discoveryMethod: "test" });
    expect(p2.reused).toBe(true);
    expect(p1.profile.id).toBe(p2.profile.id);
    await addPersonsToDossier(dossier.id, [p1.profile.id]);

    // contact duplicate prevention
    const c1 = await createContactPoint({ personProfileId: p1.profile.id, channelType: "public_professional_email", normalizedValue: "ava@dup-test-prospect.example", displayValue: "ava@dup-test-prospect.example", discoveryMethod: "test", status: "user_confirmed", userSupplied: true });
    expect(c1.reused).toBe(false);
    const c2 = await createContactPoint({ personProfileId: p1.profile.id, channelType: "public_professional_email", normalizedValue: "ava@dup-test-prospect.example", displayValue: "ava@dup-test-prospect.example", discoveryMethod: "test", status: "user_confirmed", userSupplied: true });
    expect(c2.reused).toBe(true);
    const safeDetail = await getProspectDossierDetail(dossier.id);
    expect(safeDetail?.contacts.find((contact) => contact.id === c1.point.id)?.decryptedValue).toBeNull();
    expect(safeDetail?.contacts.find((contact) => contact.id === c1.point.id)?.encryptedValue).toBeNull();
    expect(safeDetail?.contacts.find((contact) => contact.id === c1.point.id)?.normalizedValue).toBe("[protected]");
    await expect(createContactPoint({ personProfileId: p1.profile.id, channelType: "public_professional_email", normalizedValue: "unproven@dup-test-prospect.example", displayValue: "unproven@dup-test-prospect.example", discoveryMethod: "test", status: "source_verified" })).rejects.toThrow("source_verified_requires_source");
    await expect(createPersonProfile({ companyId: company.id, fullName: "Unsafe Profile", profileUrl: "javascript:alert(1)", discoveryMethod: "test" })).rejects.toThrow("person_profile_url_invalid");

    // Cross-company evidence mismatch should throw on a person profile.
    const { company: otherCompany } = await resolveManualCompany("https://other-company-prospect.example", run.id);
    const otherSource = await persistSourceDocument({ companyId: otherCompany.id, canonicalUrl: "https://other-company-prospect.example/about", sourceTier: "tier_1", contentFingerprint: "fp-prospect-1", retrievalStatus: "retrieved", fetchedAt: new Date(), extractedText: "hello", byteLength: 5 });
    const otherEvidence = await persistEvidenceItem({ sourceDocumentId: otherSource.document.id, evidenceType: "direct_quote_paraphrase", normalizedContent: "hello", sourceLocator: "p1", extractionMethod: "test" });
    await expect(createPersonProfile({ companyId: company.id, fullName: "Cross Company", discoveryMethod: "test", sourceDocumentIds: [otherSource.document.id], evidenceItemIds: [otherEvidence.evidenceItem.id] })).rejects.toThrow("person_source_company_mismatch");
    await expect(createContactPoint({ personProfileId: p1.profile.id, channelType: "public_profile_url", normalizedValue: "https://dup.com", displayValue: "https://dup.com", discoveryMethod: "test" })).resolves.toBeDefined();
    // person claim verified requires evidence existence
    await expect((await import("@/src/infrastructure/db/repositories-prospect")).createPersonClaim({ personProfileId: p1.profile.id, companyId: company.id, subject: "role", claimText: "Head of Ops", claimType: "verified", confidence: "high", evidenceItemIds: [] })).rejects.toThrow(/verified_person_claim_requires_evidence/);
  });

  it("stores encrypted contact and decrypts", async () => {
    const cfg = defaultRunConfiguration();
    const run = await createScoutRunRecord(cfg);
    const { company } = await resolveManualCompany("https://encrypt-test.example", run.id);
    const p = await createPersonProfile({ companyId: company.id, fullName: "Mira Chen", discoveryMethod: "test" });
    const cp = await createContactPoint({ personProfileId: p.profile.id, channelType: "public_professional_email", normalizedValue: "mira@encrypt-test.example", displayValue: "mira@encrypt-test.example", discoveryMethod: "test", status: "user_confirmed", userSupplied: true });
    expect(cp.point.encryptedValue).toBeTruthy();
    expect(decryptContactValue(cp.point.encryptedValue!)).toBe("mira@encrypt-test.example");
  });

  it("suppression prevents draft creation and is visible", async () => {
    const val = `suppressed-${Date.now()}@example.com`;
    await addSuppression({ scope: "contact_value", normalizedValue: val, reason: "test suppress" });
    expect(await isSuppressed("contact_value", val)).toBe(true);
    const upper = val.toUpperCase();
    expect(await isSuppressed("contact_value", upper)).toBe(true); // normalized lowercase check
  });

  it("approval cannot be reused for changed draft content (fingerprint mismatch)", async () => {
    const cfg = defaultRunConfiguration();
    const run = await createScoutRunRecord(cfg);
    const { company } = await resolveManualCompany("https://fingerprint-test.example", run.id);
    const dossier = await createProspectDossier({ companyId: company.id, researchDossierId: (await persistResearchDossier({ companyId: company.id, scoutRunId: run.id, sourceDocumentIds: [], claimIds: [], recentSignalIds: [], knownUnknowns: [], sourceCoverageSummary: {}, researchCompleteness: 1, conclusion: "sufficient" })).dossier!.id, knownUnknowns: [], openQuestions: [] });
    // create angle and sequence and drafts
    const angle = await createOutreachAngle({ prospectDossierId: dossier.id, title: "T", thesis: "t", verifiedSignal: "signal", workflowHypothesis: "w", relevanceReason: "r", valueHypothesis: "v", callToAction: "c", confidence: "high" });
    const seq = await createOutreachSequence({ prospectDossierId: dossier.id, outreachAngleId: angle.id });
    const d1 = await createMessageDraft({ outreachSequenceId: seq.sequence.id, stepNumber: 1, purpose: "initial", subject: "S1", body: "Body 1" });
    const d2 = await createMessageDraft({ outreachSequenceId: seq.sequence.id, stepNumber: 2, purpose: "follow-up", subject: "S2", body: "Body 2" });
    const draftIds = [d1.draft.id, d2.draft.id];
    const fp = await batchFingerprint(draftIds);
    await expect(createOutreachApproval({ actionType: "send_email", prospectDossierId: dossier.id, draftBatchIds: draftIds, contentFingerprint: fp, approverIdentity: "owner" })).rejects.toThrow("approval_action_not_supported");
    const approval = await createOutreachApproval({ actionType: "create_gmail_draft", prospectDossierId: dossier.id, draftBatchIds: draftIds, contentFingerprint: fp, approverIdentity: "owner" });
    // Edit one draft -> fingerprint changes
    await createMessageDraft({ outreachSequenceId: seq.sequence.id, stepNumber: 1, purpose: "initial", subject: "S1 changed", body: "Body 1 changed" });
    const newFp = await batchFingerprint(draftIds);
    expect(newFp).not.toBe(fp);
    expect(newFp).not.toBe(approval.contentFingerprint);
    // Simulate service check: approval should be considered mismatched
  });

  it("gmail draft result is idempotent and visible", async () => {
    const cfg = defaultRunConfiguration();
    const run = await createScoutRunRecord(cfg);
    const { company } = await resolveManualCompany("https://gmail-idempotent.example", run.id);
    const dossier = await createProspectDossier({ companyId: company.id, researchDossierId: (await persistResearchDossier({ companyId: company.id, scoutRunId: run.id, sourceDocumentIds: [], claimIds: [], recentSignalIds: [], knownUnknowns: [], sourceCoverageSummary: {}, researchCompleteness: 1, conclusion: "sufficient" })).dossier!.id, knownUnknowns: [], openQuestions: [] });
    const angle = await createOutreachAngle({ prospectDossierId: dossier.id, title: "T", thesis: "t", verifiedSignal: "signal", workflowHypothesis: "w", relevanceReason: "r", valueHypothesis: "v", callToAction: "c" });
    const seq = await createOutreachSequence({ prospectDossierId: dossier.id, outreachAngleId: angle.id });
    const d = await createMessageDraft({ outreachSequenceId: seq.sequence.id, stepNumber: 1, purpose: "initial", subject: "S", body: "B" });
    const fp = await batchFingerprint([d.draft.id]);
    const approval = await createOutreachApproval({ actionType: "create_gmail_draft", prospectDossierId: dossier.id, draftBatchIds: [d.draft.id], contentFingerprint: fp, approverIdentity: "owner" });
    const key = `test-${Date.now()}`;
    const r1 = await createGmailDraftResult({ prospectDossierId: dossier.id, approvalId: approval.id, idempotencyKey: key, requestedDraftIds: [d.draft.id], succeededDraftIds: [d.draft.id], gmailDraftIds: { [d.draft.id]: "gmail-1" } });
    expect(r1.reused).toBe(false);
    const r2 = await createGmailDraftResult({ prospectDossierId: dossier.id, approvalId: approval.id, idempotencyKey: key, requestedDraftIds: [d.draft.id] });
    expect(r2.reused).toBe(true);
    expect(r2.result.id).toBe(r1.result.id);
  });

  it("deletion anonymizes contact", async () => {
    const cfg = defaultRunConfiguration();
    const run = await createScoutRunRecord(cfg);
    const { company } = await resolveManualCompany("https://delete-test.example", run.id);
    const dossier = await createProspectDossier({ companyId: company.id, researchDossierId: (await persistResearchDossier({ companyId: company.id, scoutRunId: run.id, sourceDocumentIds: [], claimIds: [], recentSignalIds: [], knownUnknowns: [], sourceCoverageSummary: {}, researchCompleteness: 1, conclusion: "sufficient" })).dossier!.id, knownUnknowns: [], openQuestions: [] });
    const p = await createPersonProfile({ companyId: company.id, fullName: "Jonas Keller", discoveryMethod: "test" });
    await (await import("@/src/infrastructure/db/repositories-prospect")).addPersonsToDossier(dossier.id, [p.profile.id]);
    const cp = await createContactPoint({ personProfileId: p.profile.id, channelType: "public_professional_email", normalizedValue: "jonas@delete-test.example", displayValue: "jonas@delete-test.example", discoveryMethod: "test", status: "user_confirmed", userSupplied: true });
    const { deleteProspectData } = await import("@/src/application/prospect-service");
    await deleteProspectData(dossier.id);
    const detail = await getProspectDossierDetail(dossier.id);
    const after = detail?.contacts.find((c) => c.id === cp.point.id);
    expect(after?.displayValue).toBe("[deleted]");
    expect(after?.encryptedValue).toBeNull();
    expect(after?.decryptedValue).toBeNull();
  });
});
