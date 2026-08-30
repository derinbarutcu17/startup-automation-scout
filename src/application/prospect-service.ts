import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { isGenericAngle, validateDraftSequence, validateOutreachAngle } from "@/src/domain/outreach-quality-gate";
import { isContactEligibleForDraft, isStaleContact, type ContactChannel } from "@/src/domain/contact-policy";
import { canTransition, type ProspectStatus } from "@/src/domain/outreach-state";
import { getEnv } from "@/src/infrastructure/config/env";
import { getDb } from "@/src/infrastructure/db/client";
import {
  getCompany,
  getDossierById,
  getOpportunityDetail,
  persistEvidenceItem,
  persistSourceDocument,
} from "@/src/infrastructure/db/repositories";
import {
  addPersonsToDossier,
  batchFingerprint,
  createGmailDraftResult,
  createMessageDraft,
  createOutreachAngle,
  createOutreachApproval,
  createOutreachSequence,
  createProspectDossier,
  enqueueProspectJob,
  getGmailDraftResultByIdempotencyKey,
  getProspectDossier,
  getProspectDossierDetail,
  getProspectDossierDetailWithProtectedValues,
  invalidateApprovalsForDraft,
  isContactSuppressed,
  isSuppressed,
  listProspectDossiers,
  updateDraftState,
  updateOutreachApprovalResult,
  updateGmailDraftResult,
  updateProspectStatus,
} from "@/src/infrastructure/db/repositories-prospect";
import { contactPoints, messageDrafts, prospectDossiers } from "@/src/infrastructure/db/schema";
import { researchPeople, type CandidateSourceResolution } from "@/src/modules/person-research";
import { generateOutreachAngles } from "@/src/modules/outreach-analysis";
import { composeDraftSequence } from "@/src/modules/draft-composer";
import { exportProspectDossier } from "@/src/modules/hermes-export";
import { getProviders } from "@/src/providers";
import { FixtureGmailProvider, FixturePeopleProvider } from "@/src/providers/people-fixtures";
import { GoogleGmailDraftProvider } from "@/src/providers/google-gmail";
import type { PersonCandidate } from "@/src/providers/contracts";
import type { HermesBundle } from "@/src/domain/outreach-types";
import { hashContactValue } from "@/src/infrastructure/security/contact-encryption";

type ProspectDetail = NonNullable<Awaited<ReturnType<typeof getProspectDossierDetailWithProtectedValues>>>;
type ProspectDraft = ProspectDetail["drafts"][number];

export interface SenderProfile {
  name: string;
  email: string;
  signature?: string;
}

export async function getSenderProfile(): Promise<SenderProfile> {
  const { getSetting } = await import("@/src/infrastructure/db/repositories");
  const row = await getSetting("sender_profile");
  if (row?.value && typeof row.value === "object") {
    const value = row.value as Record<string, unknown>;
    if (typeof value.name === "string" && typeof value.email === "string") {
      return { name: value.name, email: value.email, signature: typeof value.signature === "string" ? value.signature : undefined };
    }
  }
  return { name: "Scout Owner", email: process.env.SENDER_EMAIL ?? "owner@example.com", signature: "" };
}

function dossierStatus(value: string): ProspectStatus {
  return value as ProspectStatus;
}

function assertProspectModelBudget(costEur: number | undefined): void {
  if ((costEur ?? 0) > getEnv().PROSPECT_BUDGET_MAX_MODEL_SPEND) throw new Error("prospect_model_budget_exceeded");
}

function assertTargetContactMatches(angle: { targetPersonId?: string | null }, contact: { personProfileId?: string | null }): void {
  if (angle.targetPersonId && angle.targetPersonId !== contact.personProfileId) throw new Error("draft_contact_target_mismatch");
}

function isFirstPartyUrl(rawUrl: string, domain: string): boolean {
  try {
    const url = new URL(rawUrl);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
    return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
  } catch {
    return false;
  }
}

function sourceDate(value: string | undefined): Date {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function sourceResolver(input: {
  companyId: string;
  companyDomain: string;
  providerId: string;
  retrieval: ReturnType<typeof getProviders>["retrieval"];
}): (candidate: PersonCandidate) => Promise<CandidateSourceResolution> {
  const documents = new Map<string, Promise<{ documentId: string; text: string } | null>>();
  const getDocument = (url: string) => {
    const cached = documents.get(url);
    if (cached) return cached;
    const pending = (async () => {
      if (input.providerId !== "fixture" && !isFirstPartyUrl(url, input.companyDomain)) return null;
      const retrieved = await input.retrieval.retrieveDocument(url);
      if (!retrieved.ok || retrieved.value.status !== "retrieved" || !retrieved.value.text) return null;
      if (input.providerId !== "fixture" && !isFirstPartyUrl(retrieved.value.finalUrl, input.companyDomain)) return null;
      const text = retrieved.value.text;
      const persisted = await persistSourceDocument({
        companyId: input.companyId,
        canonicalUrl: retrieved.value.finalUrl,
        sourceTier: retrieved.value.sourceTier,
        title: retrieved.value.title,
        fetchedAt: sourceDate(retrieved.value.fetchedAt),
        contentFingerprint: retrieved.value.fingerprint ?? createHash("sha256").update(text).digest("hex"),
        retrievalStatus: "retrieved",
        extractedText: text,
        byteLength: retrieved.value.byteLength,
        permittedAccessMetadata: { purpose: "professional_person_research", provider: input.retrieval.id },
      });
      return { documentId: persisted.document.id, text };
    })();
    documents.set(url, pending);
    return pending;
  };

  return async (candidate) => {
    if (!candidate.sourceUrl) return {};
    const document = await getDocument(candidate.sourceUrl);
    if (!document) return {};
    const sourceText = document.text.toLowerCase().replace(/\s+/g, " ");
    const name = candidate.fullName.toLowerCase().replace(/\s+/g, " ");
    const role = candidate.roleTitle?.toLowerCase().replace(/\s+/g, " ");
    const contact = candidate.contactValue?.trim().toLowerCase();
    const evidenceItemIds: string[] = [];
    let roleVerified = false;
    let contactVerified = false;
    if (sourceText.includes(name)) {
      const identityEvidence = await persistEvidenceItem({
        sourceDocumentId: document.documentId,
        evidenceType: "person_identity",
        normalizedContent: role && sourceText.includes(role)
          ? `Public source lists ${candidate.fullName} as ${candidate.roleTitle}.`
          : `Public source lists ${candidate.fullName}.`,
        sourceLocator: candidate.sourceLocator ?? `public source: ${candidate.sourceUrl}`,
        extractionMethod: "bounded_people_provider",
      });
      evidenceItemIds.push(identityEvidence.evidenceItem.id);
      roleVerified = Boolean(role && sourceText.includes(role));
    }
    if (contact && sourceText.includes(contact)) {
      const contactEvidence = await persistEvidenceItem({
        sourceDocumentId: document.documentId,
        evidenceType: "professional_contact",
        normalizedContent: `Public source publishes a professional email for ${candidate.fullName}.`,
        sourceLocator: candidate.sourceLocator ?? `public source: ${candidate.sourceUrl}`,
        extractionMethod: "bounded_people_provider",
      });
      evidenceItemIds.push(contactEvidence.evidenceItem.id);
      contactVerified = true;
    }
    return { sourceDocumentId: document.documentId, evidenceItemIds, roleVerified, contactVerified };
  };
}

export async function prepareOutreach(companyId: string, opportunityId: string): Promise<{ dossierId: string; created: boolean }> {
  const opportunity = await getOpportunityDetail(opportunityId);
  if (!opportunity || opportunity.company.id !== companyId) throw new Error("opportunity_company_mismatch");
  if (!opportunity.gate?.passed) throw new Error("opportunity_quality_gate_required");
  const latestReview = opportunity.reviews.find((review) => review.targetType === "automation_opportunity" && review.targetId === opportunityId);
  if (!latestReview || !["investigate", "prototype"].includes(latestReview.decision)) throw new Error("opportunity_review_required");
  const researchDossier = await getDossierById(opportunity.hypothesis.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");
  const existing = await listProspectDossiers(companyId);
  const match = existing.find((dossier) => dossier.researchDossierId === researchDossier.id && dossier.opportunityId === opportunityId);
  let dossierId: string;
  let created = false;
  if (match) {
    dossierId = match.id;
  } else {
    const dossier = await createProspectDossier({
      companyId,
      researchDossierId: researchDossier.id,
      opportunityId,
      knownUnknowns: researchDossier.knownUnknowns,
      openQuestions: opportunity.hypothesis.confirmationQuestions,
      sourceCoverage: researchDossier.sourceCoverageSummary as Record<string, unknown>,
      freshnessSummary: {},
    });
    dossierId = dossier.id;
    created = true;
  }
  const current = await getProspectDossier(dossierId);
  if (!current) throw new Error("prospect_dossier_not_found");
  if (["not_started", "failed", "stale"].includes(current.status)) {
    await updateProspectStatus(dossierId, "person_research_requested", "awaiting_person_research");
  }
  await enqueueProspectJob({
    prospectDossierId: dossierId,
    companyId,
    opportunityId,
    jobType: "people_research",
    payload: { dossierId: researchDossier.id, opportunityId },
  });
  return { dossierId, created };
}

async function companyForProspect(prospectDossierId: string) {
  const detail = await getProspectDossierDetailWithProtectedValues(prospectDossierId);
  if (!detail) throw new Error("prospect_dossier_not_found");
  const company = await getCompany(detail.dossier.companyId);
  if (!company) throw new Error("company_not_found");
  return { detail, company };
}

async function ensureNotSuppressed(companyDomain: string, contact: { decryptedValue?: string | null; personProfileId?: string | null }, persons: Array<{ id: string; normalizedName: string }>) {
  if (await isSuppressed("company_domain", companyDomain)) throw new Error("company_domain_suppressed");
  const contactValue = contact.decryptedValue;
  if (contactValue && await isContactSuppressed(contactValue)) throw new Error("contact_suppressed");
  if (contact.personProfileId) {
    const person = persons.find((candidate) => candidate.id === contact.personProfileId);
    if (person && (await isSuppressed("person", person.id) || await isSuppressed("person", person.normalizedName))) throw new Error("person_suppressed");
  }
}

function validateAngleRecord(angle: {
  evidenceIds: unknown;
  claimIds: unknown;
  personClaimIds: unknown;
  verifiedSignal: string;
  thesis: string;
  workflowHypothesis: string;
  relevanceReason: string;
  valueHypothesis: string;
  callToAction: string;
}, researchDossier: Awaited<ReturnType<typeof getDossierById>>, detailPersonClaimIds: Set<string>) {
  if (!researchDossier) return { passed: false, failureCodes: ["research_dossier_missing"], warningCodes: [], checkedEvidenceItemIds: [] };
  const evidenceIds = Array.isArray(angle.evidenceIds) ? angle.evidenceIds.filter((id): id is string => typeof id === "string") : [];
  const claimIds = Array.isArray(angle.claimIds) ? angle.claimIds.filter((id): id is string => typeof id === "string") : [];
  const personClaimIds = Array.isArray(angle.personClaimIds) ? angle.personClaimIds.filter((id): id is string => typeof id === "string") : [];
  const allowedEvidence = new Set(researchDossier.evidenceLinks.map((link) => link.evidence.id));
  const allowedClaims = new Map(researchDossier.claims.map((claim) => [claim.id, claim.claimType]));
  if (evidenceIds.some((id) => !allowedEvidence.has(id))) return { passed: false, failureCodes: ["angle_evidence_reference_out_of_scope"], warningCodes: [], checkedEvidenceItemIds: evidenceIds };
  if (claimIds.some((id) => !allowedClaims.has(id))) return { passed: false, failureCodes: ["angle_claim_reference_out_of_scope"], warningCodes: [], checkedEvidenceItemIds: evidenceIds };
  if (personClaimIds.some((id) => !detailPersonClaimIds.has(id))) return { passed: false, failureCodes: ["angle_person_claim_reference_out_of_scope"], warningCodes: [], checkedEvidenceItemIds: evidenceIds };
  const supportText = [angle.thesis, angle.verifiedSignal, angle.workflowHypothesis, angle.relevanceReason, angle.valueHypothesis, angle.callToAction].join(" ");
  return validateOutreachAngle({
    evidenceIds,
    claimIds,
    verifiedSignal: angle.verifiedSignal,
    supportText,
    hasVerifiedCompanyClaim: claimIds.some((id) => allowedClaims.get(id) === "verified"),
    genericness: isGenericAngle(supportText) ? "generic" : "specific",
  });
}

export async function executePeopleResearch(prospectDossierId: string): Promise<void> {
  const { detail, company } = await companyForProspect(prospectDossierId);
  const current = dossierStatus(detail.dossier.status);
  if (current === "suppressed") return;
  if (["not_started", "failed", "stale"].includes(current)) await updateProspectStatus(prospectDossierId, "person_research_requested", "awaiting_person_research");
  if (!["person_research_requested", "person_research_ready"].includes(current) && !["not_started", "failed", "stale"].includes(current)) throw new Error(`invalid_research_status:${current}`);
  if (await isSuppressed("company_domain", company.canonicalDomain)) {
    await updateProspectStatus(prospectDossierId, "suppressed", "company_domain_suppressed");
    return;
  }
  const researchDossier = await getDossierById(detail.dossier.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");
  const providers = getProviders();
  const peopleProvider = providers.people ?? new FixturePeopleProvider();
  const result = await researchPeople(
    { id: company.id, canonicalName: company.canonicalName, canonicalDomain: company.canonicalDomain },
    { claims: researchDossier.claims.map((claim) => ({ id: claim.id, claimType: claim.claimType, subject: claim.subject })) },
    peopleProvider,
    {
      budget: {
        maxPeople: getEnv().PROSPECT_MAX_PEOPLE,
        maxSearchRequests: getEnv().PROSPECT_BUDGET_MAX_SEARCH_REQUESTS,
        maxModelSpendEur: getEnv().PROSPECT_BUDGET_MAX_MODEL_SPEND,
        maxRuntimeSeconds: getEnv().PROSPECT_BUDGET_MAX_RUNTIME_SECONDS,
      },
      resolveSource: sourceResolver({ companyId: company.id, companyDomain: company.canonicalDomain, providerId: peopleProvider.id, retrieval: providers.retrieval }),
    },
  );
  if (!result.ok) {
    await updateProspectStatus(prospectDossierId, "failed", result.message);
    throw new Error(result.message);
  }
  if (result.value.persons.length) await addPersonsToDossier(prospectDossierId, result.value.persons.map((person) => person.id));
  const { db } = getDb();
  await db.update(prospectDossiers).set({
    sourceCoverage: { ...(detail.dossier.sourceCoverage as Record<string, unknown>), peopleProvider: peopleProvider.id, peopleWarnings: result.value.warnings },
    freshnessSummary: { ...(detail.dossier.freshnessSummary as Record<string, unknown>), peopleResearchAt: new Date().toISOString() },
    updatedAt: new Date(),
  }).where(eq(prospectDossiers.id, prospectDossierId));
  await updateProspectStatus(prospectDossierId, "person_research_ready", result.value.persons.length ? `found_${result.value.persons.length}` : "no_persons_found");
}

export async function executeAngleGeneration(prospectDossierId: string, targetPersonId?: string | null): Promise<void> {
  const { detail, company } = await companyForProspect(prospectDossierId);
  const status = dossierStatus(detail.dossier.status);
  if (status === "angle_review" && detail.angles.length && !targetPersonId) return;
  if (status !== "angle_review" && !canTransition(status, "angle_review")) throw new Error(`invalid_transition:${status}->angle_review`);
  const researchDossier = await getDossierById(detail.dossier.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");
  const opportunity = detail.dossier.opportunityId ? await getOpportunityDetail(detail.dossier.opportunityId) : null;
  const target = targetPersonId
    ? detail.persons.find((person) => person.id === targetPersonId) ?? null
    : detail.persons[0] ?? null;
  if (targetPersonId && !target) throw new Error("target_person_not_in_dossier");
  const providers = getProviders();
  const result = await generateOutreachAngles({
    company: { id: company.id, canonicalName: company.canonicalName, canonicalDomain: company.canonicalDomain },
    opportunity: opportunity ? { id: opportunity.opportunity.id, proposedSystem: opportunity.opportunity.proposedSystem, workflowHypothesisId: opportunity.hypothesis.id } : null,
    dossier: {
      id: researchDossier.id,
      claims: researchDossier.claims.map((claim) => ({ id: claim.id, claimText: claim.claimText, claimType: claim.claimType, subject: claim.subject })),
      evidenceLinks: researchDossier.evidenceLinks.map((link) => ({ evidence: { id: link.evidence.id, normalizedContent: link.evidence.normalizedContent }, source: { canonicalUrl: link.source.canonicalUrl } })),
      knownUnknowns: researchDossier.knownUnknowns as string[],
      personClaims: detail.personClaims
        .filter((claim) => !target || claim.personProfileId === target.id)
        .map((claim) => ({ id: claim.id, personProfileId: claim.personProfileId, subject: claim.subject, claimText: claim.claimText, claimType: claim.claimType, confidence: claim.confidence })),
    },
    targetPerson: target ? { id: target.id, fullName: target.fullName, roleTitle: target.roleTitle } : null,
  }, providers.model);
  if (!result.ok) throw new Error(result.message);
  assertProspectModelBudget(result.usage?.costEur);
  const existingKeys = new Set(detail.angles.map((angle) => `${angle.targetPersonId ?? ""}|${angle.title.toLowerCase()}|${angle.thesis.toLowerCase()}`));
  let createdCount = 0;
  for (const angle of result.value) {
    const key = `${target?.id ?? ""}|${angle.title.toLowerCase()}|${angle.thesis.toLowerCase()}`;
    if (existingKeys.has(key)) continue;
    await createOutreachAngle({
      prospectDossierId,
      opportunityId: detail.dossier.opportunityId,
      targetPersonId: target?.id ?? null,
      targetRole: target?.roleTitle ?? detail.dossier.targetRole ?? null,
      title: angle.title,
      thesis: angle.thesis,
      verifiedSignal: angle.verifiedSignal,
      workflowHypothesis: angle.workflowHypothesis,
      relevanceReason: angle.relevanceReason,
      valueHypothesis: angle.valueHypothesis,
      callToAction: angle.callToAction,
      evidenceIds: angle.evidenceIds,
      claimIds: angle.claimIds,
      personClaimIds: angle.personClaimIds,
      assumptions: angle.assumptions,
      alternativeExplanations: angle.alternativeExplanations,
      confirmationQuestions: angle.confirmationQuestions,
      confidence: angle.confidence,
    });
    existingKeys.add(key);
    createdCount += 1;
  }
  await updateProspectStatus(prospectDossierId, "angle_review", `generated_${createdCount}_angles`);
}

export async function executeDraftGeneration(prospectDossierId: string, angleId: string, contactPointId: string): Promise<void> {
  const { detail, company } = await companyForProspect(prospectDossierId);
  const status = dossierStatus(detail.dossier.status);
  if (status !== "angle_review" && status !== "drafts_ready") throw new Error(`invalid_transition:${status}->drafts_ready`);
  const angle = detail.angles.find((candidate) => candidate.id === angleId);
  if (!angle) throw new Error("angle_not_found");
  const contact = detail.contacts.find((candidate) => candidate.id === contactPointId);
  if (!contact) throw new Error("contact_not_found");
  assertTargetContactMatches(angle, contact);
  const rawContact = contact.decryptedValue;
  if (!rawContact) throw new Error("contact_value_unavailable");
  await ensureNotSuppressed(company.canonicalDomain, { decryptedValue: rawContact, personProfileId: contact.personProfileId }, detail.persons.map((person) => ({ id: person.id, normalizedName: person.normalizedName })));
  const contactEligibility = isContactEligibleForDraft({
    channelType: contact.channelType as ContactChannel,
    normalizedValue: rawContact,
    status: contact.status,
    discoveryMethod: contact.discoveryMethod,
    sourceDocumentId: contact.sourceDocumentId,
    userSupplied: contact.userSupplied,
    lastCheckedAt: contact.lastCheckedAt ? new Date(contact.lastCheckedAt) : null,
  });
  if (!contactEligibility.eligible) throw new Error(`contact_not_eligible:${contactEligibility.reason}`);
  if (isStaleContact(contact.lastCheckedAt ? new Date(contact.lastCheckedAt) : null)) throw new Error("contact_stale");
  const researchDossier = await getDossierById(detail.dossier.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");
  const angleGate = validateAngleRecord(angle, researchDossier, new Set(detail.personClaims.map((claim) => claim.id)));
  if (!angleGate.passed) throw new Error(`angle_gate_failed:${angleGate.failureCodes.join(",")}`);
  const providers = getProviders();
  const sender = await getSenderProfile();
  const composed = await composeDraftSequence({
    angle: {
      id: angle.id,
      title: angle.title,
      thesis: angle.thesis,
      verifiedSignal: angle.verifiedSignal,
      workflowHypothesis: angle.workflowHypothesis,
      valueHypothesis: angle.valueHypothesis,
      callToAction: angle.callToAction,
      evidenceIds: angle.evidenceIds as string[],
      claimIds: angle.claimIds as string[],
      personClaimIds: angle.personClaimIds as string[],
    },
    contact: {
      id: contact.id,
      channelType: contact.channelType,
      normalizedValue: rawContact,
      displayValue: contact.displayValue,
      status: contact.status,
      lastCheckedAt: contact.lastCheckedAt ? new Date(contact.lastCheckedAt) : null,
      discoveryMethod: contact.discoveryMethod,
      sourceDocumentId: contact.sourceDocumentId,
      userSupplied: contact.userSupplied,
    },
    targetPerson: contact.personProfileId
      ? (() => {
          const person = detail.persons.find((candidate) => candidate.id === contact.personProfileId);
          return person ? { fullName: person.fullName, roleTitle: person.roleTitle } : null;
        })()
      : null,
      sender,
      personClaims: detail.personClaims
        .filter((claim) => (angle.personClaimIds as string[]).includes(claim.id))
        .map((claim) => ({ id: claim.id, personProfileId: claim.personProfileId, subject: claim.subject, claimText: claim.claimText, claimType: claim.claimType, confidence: claim.confidence })),
      dossierVerified: researchDossier.claims.some((claim) => claim.claimType === "verified"),
    verifiedEvidenceRefPresent: (angle.evidenceIds as string[]).some((id) => researchDossier.evidenceLinks.some((link) => link.evidence.id === id)),
  }, providers.model);
  if (!composed.ok) throw new Error(composed.message);
  assertProspectModelBudget(composed.usage?.costEur);
  const sequence = await createOutreachSequence({ prospectDossierId, outreachAngleId: angleId });
  for (const draft of composed.value.drafts) {
    await createMessageDraft({
      outreachSequenceId: sequence.sequence.id,
      stepNumber: draft.stepNumber,
      purpose: draft.purpose,
      subject: draft.subject,
      body: draft.body,
      contactPointId: contact.id,
      evidenceIds: draft.evidenceIds,
      claimIds: draft.claimIds,
      personalizationNotes: draft.personalizationNotes ?? null,
      modelVersion: providers.model.id,
      promptVersion: "v1",
    });
  }
  await updateProspectStatus(prospectDossierId, "drafts_ready", `drafts_generated_${composed.value.drafts.length}`);
}

export async function exportProspectBundle(prospectDossierId: string, opts?: { includeContacts?: boolean }): Promise<HermesBundle> {
  const env = getEnv();
  const includeContacts = opts?.includeContacts ?? !env.HERMES_EXPORT_REDACT_CONTACTS;
  if (env.APP_ENV === "production" && includeContacts) throw new Error("private_export_requires_owner_auth");
  const { detail, company } = await companyForProspect(prospectDossierId);
  const researchDossier = await getDossierById(detail.dossier.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");
  const opportunity = detail.dossier.opportunityId ? await getOpportunityDetail(detail.dossier.opportunityId) : null;
  const bundle = exportProspectDossier({
    dossier: {
      id: detail.dossier.id,
      companyId: detail.dossier.companyId,
      researchDossierId: detail.dossier.researchDossierId,
      opportunityId: detail.dossier.opportunityId,
      version: detail.dossier.version,
      schemaVersion: detail.dossier.schemaVersion,
      status: detail.dossier.status,
      targetRole: detail.dossier.targetRole,
      knownUnknowns: detail.dossier.knownUnknowns as string[],
      openQuestions: detail.dossier.openQuestions as string[],
      sourceCoverage: detail.dossier.sourceCoverage as Record<string, unknown>,
      freshnessSummary: detail.dossier.freshnessSummary as Record<string, unknown>,
      contentFingerprint: detail.dossier.contentFingerprint,
      generatedAt: detail.dossier.generatedAt.toISOString(),
    },
    company: { id: company.id, canonicalName: company.canonicalName, canonicalDomain: company.canonicalDomain },
    opportunity: opportunity ? { id: opportunity.opportunity.id, proposedSystem: opportunity.opportunity.proposedSystem } : null,
    persons: detail.persons.map((person) => ({ id: person.id, fullName: person.fullName, roleTitle: person.roleTitle, profileUrl: person.profileUrl, status: person.status, lastVerifiedAt: person.lastVerifiedAt ? new Date(person.lastVerifiedAt).toISOString() : null })),
    personClaims: detail.personClaims.map((claim) => ({
      id: claim.id,
      personProfileId: claim.personProfileId,
      subject: claim.subject,
      claimText: claim.claimText,
      claimType: claim.claimType,
      confidence: claim.confidence,
      reasoningSummary: claim.reasoningSummary,
      alternativeExplanation: claim.alternativeExplanation,
      confirmationQuestion: claim.confirmationQuestion,
      evidenceIds: detail.personClaimEvidence.filter((link) => link.relation.personClaimId === claim.id).map((link) => link.relation.evidenceItemId),
    })),
    contacts: detail.contacts.map((contact) => ({ id: contact.id, channelType: contact.channelType, displayValue: contact.decryptedValue ?? contact.displayValue, normalizedValue: contact.decryptedValue ?? contact.displayValue, status: contact.status, lastCheckedAt: contact.lastCheckedAt ? new Date(contact.lastCheckedAt).toISOString() : null })),
    angles: detail.angles.map((angle) => ({ id: angle.id, title: angle.title, thesis: angle.thesis, verifiedSignal: angle.verifiedSignal, workflowHypothesis: angle.workflowHypothesis, relevanceReason: angle.relevanceReason, valueHypothesis: angle.valueHypothesis, callToAction: angle.callToAction, evidenceIds: angle.evidenceIds as string[], claimIds: angle.claimIds as string[], personClaimIds: angle.personClaimIds as string[], confidence: angle.confidence })),
    drafts: detail.drafts.map((draft) => ({ id: draft.id, stepNumber: draft.stepNumber, purpose: draft.purpose, subject: draft.subject, body: draft.body, state: draft.state, contentFingerprint: draft.contentFingerprint, evidenceIds: draft.evidenceIds as string[], claimIds: draft.claimIds as string[] })),
    evidences: researchDossier.evidenceLinks.map((link) => ({ evidence: { id: link.evidence.id, normalizedContent: link.evidence.normalizedContent, sourceLocator: link.evidence.sourceLocator }, source: { canonicalUrl: link.source.canonicalUrl, sourceTier: link.source.sourceTier } })),
    claims: researchDossier.claims.map((claim) => ({ id: claim.id, claimText: claim.claimText, claimType: claim.claimType, confidence: claim.confidence })),
    gmailResults: detail.gmailResults.map((result) => ({
      id: result.id,
      approvalId: result.approvalId,
      requestedDraftIds: result.requestedDraftIds as string[],
      succeededDraftIds: result.succeededDraftIds as string[],
      failedDraftIds: result.failedDraftIds as string[],
      providerResponse: result.providerResponse as Record<string, unknown>,
      createdAt: new Date(result.createdAt).toISOString(),
    })),
    approvals: detail.approvals.map((approval) => ({ id: approval.id, actionType: approval.actionType, createdAt: new Date(approval.createdAt).toISOString(), contentFingerprint: approval.contentFingerprint, result: approval.result, rejectionReason: approval.rejectionReason })),
    options: { ...opts, includeContacts },
  });
  const { db } = getDb();
  await db.update(prospectDossiers).set({ contentFingerprint: bundle.fingerprint, updatedAt: new Date() }).where(eq(prospectDossiers.id, prospectDossierId));
  return bundle;
}

async function validateDraftForExternalAction(draft: ProspectDraft, detail: ProspectDetail, companyDomain: string, researchDossier: NonNullable<Awaited<ReturnType<typeof getDossierById>>>) {
  const contact = draft.contactPointId ? detail.contacts.find((candidate) => candidate.id === draft.contactPointId) : null;
  if (!contact?.decryptedValue) throw new Error("draft_missing_contact");
  await ensureNotSuppressed(companyDomain, { decryptedValue: contact.decryptedValue, personProfileId: contact.personProfileId }, detail.persons.map((person) => ({ id: person.id, normalizedName: person.normalizedName })));
  const eligible = isContactEligibleForDraft({ channelType: contact.channelType as ContactChannel, normalizedValue: contact.decryptedValue, status: contact.status, discoveryMethod: contact.discoveryMethod, sourceDocumentId: contact.sourceDocumentId, userSupplied: contact.userSupplied, lastCheckedAt: contact.lastCheckedAt ? new Date(contact.lastCheckedAt) : null });
  if (!eligible.eligible) throw new Error(`contact_not_eligible:${eligible.reason}`);
  const sequence = detail.sequences.find((candidate) => candidate.id === draft.outreachSequenceId);
  const angle = sequence ? detail.angles.find((candidate) => candidate.id === sequence.outreachAngleId) : null;
  if (!angle) throw new Error("draft_angle_missing");
  assertTargetContactMatches(angle, contact);
  const angleGate = validateAngleRecord(angle, researchDossier, new Set(detail.personClaims.map((claim) => claim.id)));
  if (!angleGate.passed) throw new Error(`angle_gate_failed:${angleGate.failureCodes.join(",")}`);
  const draftGate = validateDraftSequence({
    evidenceItemIds: draft.evidenceIds as string[],
    claimIds: draft.claimIds as string[],
    hasVerifiedCompanyClaim: researchDossier.claims.some((claim) => claim.claimType === "verified"),
    verifiedEvidenceRefPresent: (draft.evidenceIds as string[]).some((id) => researchDossier.evidenceLinks.some((link) => link.evidence.id === id)),
    contactEligible: eligible.eligible,
    contactSuppressed: false,
    contactStale: isStaleContact(contact.lastCheckedAt ? new Date(contact.lastCheckedAt) : null),
    supportText: `${draft.subject} ${draft.body}`,
    genericness: isGenericAngle(`${draft.subject} ${draft.body}`) ? "generic" : "specific",
  });
  if (!draftGate.passed) throw new Error(`draft_gate_failed:${draftGate.failureCodes.join(",")}`);
}

export async function editProspectDraft(prospectDossierId: string, draftId: string, subject: string, body: string): Promise<void> {
  if (!subject.trim()) throw new Error("draft_subject_required");
  if (subject.length > 200) throw new Error("draft_subject_too_long");
  if (!body.trim()) throw new Error("draft_body_required");
  if (body.length > 20_000) throw new Error("draft_body_too_long");

  const { detail, company } = await companyForProspect(prospectDossierId);
  if (detail.dossier.status === "gmail_draft_created") throw new Error("gmail_draft_content_immutable");
  if (detail.dossier.status !== "drafts_ready" && detail.dossier.status !== "approved_for_gmail_draft") {
    throw new Error(`invalid_edit_status:${detail.dossier.status}`);
  }
  const current = detail.drafts.find((draft) => draft.id === draftId);
  if (!current) throw new Error("draft_not_found");
  const researchDossier = await getDossierById(detail.dossier.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");

  await validateDraftForExternalAction({ ...current, subject: subject.trim(), body: body.trim() }, detail, company.canonicalDomain, researchDossier);
  await createMessageDraft({
    outreachSequenceId: current.outreachSequenceId,
    stepNumber: current.stepNumber,
    purpose: current.purpose,
    subject: subject.trim(),
    body: body.trim(),
    contactPointId: current.contactPointId,
    evidenceIds: current.evidenceIds as string[],
    claimIds: current.claimIds as string[],
    personalizationNotes: current.personalizationNotes,
    modelVersion: current.modelVersion ?? "manual_edit",
    promptVersion: current.promptVersion,
  });
  await invalidateApprovalsForDraft(prospectDossierId, draftId, "draft_edited_approval_invalidated");
  if (detail.dossier.status === "approved_for_gmail_draft") {
    await updateProspectStatus(prospectDossierId, "drafts_ready", "draft_edited_approval_invalidated");
  }
}

export async function approveDraftBatch(prospectDossierId: string, draftIds: string[], approver = "owner"): Promise<string> {
  if (!draftIds.length || new Set(draftIds).size !== draftIds.length) throw new Error("approval_batch_invalid");
  const { detail, company } = await companyForProspect(prospectDossierId);
  if (dossierStatus(detail.dossier.status) !== "drafts_ready") throw new Error(`invalid_approval_status:${detail.dossier.status}`);
  const drafts = draftIds.map((id) => detail.drafts.find((draft) => draft.id === id));
  if (drafts.some((draft) => !draft)) throw new Error("draft_batch_not_in_dossier");
  const researchDossier = await getDossierById(detail.dossier.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");
  for (const draft of drafts) {
    if (!draft) continue;
    if (["rejected", "withdrawn", "gmail_draft_created"].includes(draft.state)) throw new Error("draft_not_approvable");
    await validateDraftForExternalAction(draft, detail, company.canonicalDomain, researchDossier);
  }
  const fingerprint = await batchFingerprint(draftIds);
  const approval = await createOutreachApproval({
    actionType: "create_gmail_draft",
    prospectDossierId,
    draftBatchIds: draftIds,
    contentFingerprint: fingerprint,
    approverIdentity: approver,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  for (const id of draftIds) await updateDraftState(id, "approved");
  await updateProspectStatus(prospectDossierId, "approved_for_gmail_draft", `approved_batch:${approval.id}`, { hasAngle: true, hasEvidence: true, reviewed: true });
  return approval.id;
}

function gmailProvider() {
  return getEnv().GMAIL_PROVIDER === "google" ? new GoogleGmailDraftProvider() : new FixtureGmailProvider();
}

export async function createGmailDraftsForApproval(prospectDossierId: string, approvalId: string): Promise<{ succeeded: string[]; failed: string[]; gmailIds: Record<string, string> }> {
  const { detail, company } = await companyForProspect(prospectDossierId);
  const dossierState = dossierStatus(detail.dossier.status);
  if (dossierState !== "approved_for_gmail_draft" && dossierState !== "gmail_draft_created") throw new Error(`invalid_gmail_draft_status:${detail.dossier.status}`);
  const approval = detail.approvals.find((candidate) => candidate.id === approvalId);
  if (!approval) throw new Error("approval_not_found");
  if (approval.actionType !== "create_gmail_draft") throw new Error("approval_action_not_gmail_draft");
  if (approval.result === "invalidated") throw new Error("approval_invalidated");
  const draftIds = approval.draftBatchIds as string[];
  const currentFingerprint = await batchFingerprint(draftIds);
  if (currentFingerprint !== approval.contentFingerprint) throw new Error("approval_fingerprint_mismatch_draft_changed");
  if (approval.expiresAt && new Date(approval.expiresAt) < new Date()) throw new Error("approval_expired");
  const researchDossier = await getDossierById(detail.dossier.researchDossierId);
  if (!researchDossier) throw new Error("research_dossier_missing");
  for (const id of draftIds) {
    const draft = detail.drafts.find((candidate) => candidate.id === id);
    if (!draft) throw new Error("draft_batch_not_in_dossier");
    if (draft.state !== "approved" && draft.state !== "gmail_draft_created") throw new Error("draft_not_approved");
    await validateDraftForExternalAction(draft, detail, company.canonicalDomain, researchDossier);
  }
  const provider = gmailProvider();
  const idempotencyKey = createHash("sha256").update(`${prospectDossierId}:${approvalId}:${approval.contentFingerprint}`).digest("hex");
  const existing = await getGmailDraftResultByIdempotencyKey(idempotencyKey);
  const existingStatus = existing && typeof existing.providerResponse === "object" && existing.providerResponse !== null && "status" in existing.providerResponse
    ? String((existing.providerResponse as Record<string, unknown>).status)
    : null;
  if (existing && existingStatus === "running" && Date.now() - new Date(existing.createdAt).getTime() < 10 * 60 * 1000) throw new Error("gmail_creation_in_progress");
  if (existing && existingStatus === "uncertain") throw new Error("gmail_creation_uncertain_manual_reconciliation");
  if (existing && existingStatus === "running") {
    await updateGmailDraftResult(existing.id, {
      succeededDraftIds: existing.succeededDraftIds as string[],
      failedDraftIds: draftIds.filter((id) => !(existing.succeededDraftIds as string[]).includes(id)),
      gmailDraftIds: (existing.gmailDraftIds ?? {}) as Record<string, string>,
      providerResponse: { provider: provider.id, status: "uncertain", reason: "stale_running_result" },
    });
    await updateOutreachApprovalResult(approvalId, "uncertain", "gmail_creation_uncertain_manual_reconciliation");
    throw new Error("gmail_creation_uncertain_manual_reconciliation");
  }
  const succeeded = new Set(existing?.succeededDraftIds as string[] | undefined);
  const gmailIds = { ...((existing?.gmailDraftIds ?? {}) as Record<string, string>) };
  const pending = existing ?? (await createGmailDraftResult({
    prospectDossierId,
    approvalId,
    idempotencyKey,
    requestedDraftIds: draftIds,
    providerResponse: { provider: provider.id, status: "running" },
  })).result;

  const saveProgress = (status: "running" | "partial" | "succeeded" | "failed" | "uncertain", metadata: Record<string, unknown> = {}) => updateGmailDraftResult(pending.id, {
    succeededDraftIds: draftIds.filter((id) => succeeded.has(id)),
    failedDraftIds: draftIds.filter((id) => !succeeded.has(id)),
    gmailDraftIds: gmailIds,
    providerResponse: { provider: provider.id, status, ...metadata },
  });

  for (const draftId of draftIds) {
    if (succeeded.has(draftId)) continue;
    const draft = detail.drafts.find((candidate) => candidate.id === draftId);
    const contact = draft?.contactPointId ? detail.contacts.find((candidate) => candidate.id === draft.contactPointId) : null;
    const to = contact?.decryptedValue;
    if (!draft || !to) {
      await saveProgress("running");
      continue;
    }
    const result = await provider.createDraft({ to, subject: draft.subject, body: draft.body });
    if (result.ok) {
      succeeded.add(draftId);
      gmailIds[draftId] = result.value.draftId;
      await saveProgress("running");
      await updateDraftState(draftId, "gmail_draft_created");
    } else {
      await saveProgress("running");
      if (result.retryable) {
        await saveProgress("uncertain", { reason: "retryable_external_result", failureCategory: result.category, uncertainDraftIds: draftIds.filter((id) => !succeeded.has(id)) });
        await updateOutreachApprovalResult(approvalId, "uncertain", "gmail_creation_uncertain_manual_reconciliation");
        return { succeeded: draftIds.filter((id) => succeeded.has(id)), failed: draftIds.filter((id) => !succeeded.has(id)), gmailIds };
      }
    }
  }
  const succeededIds = draftIds.filter((id) => succeeded.has(id));
  const failedIds = draftIds.filter((id) => !succeeded.has(id));
  const status = succeededIds.length === draftIds.length ? "succeeded" : succeededIds.length ? "partial" : "failed";
  await updateGmailDraftResult(pending.id, { succeededDraftIds: succeededIds, failedDraftIds: failedIds, gmailDraftIds: gmailIds, providerResponse: { provider: provider.id, status } });
  await updateOutreachApprovalResult(approvalId, status, status === "succeeded" ? null : `gmail_draft_creation_${status}`);
  if (status === "succeeded") {
    await updateProspectStatus(prospectDossierId, "gmail_draft_created", `gmail_${succeededIds.length}_created`);
  }
  return { succeeded: succeededIds, failed: failedIds, gmailIds };
}

export async function deleteProspectData(prospectDossierId: string): Promise<void> {
  const detail = await getProspectDossierDetail(prospectDossierId);
  if (!detail) return;
  const { db } = getDb();
  for (const contact of detail.contacts) {
    await db.update(contactPoints).set({ encryptedValue: null, normalizedValue: hashContactValue(contact.channelType, `deleted:${contact.id}`), displayValue: "[deleted]", status: "rejected", updatedAt: new Date() }).where(eq(contactPoints.id, contact.id));
  }
  for (const draft of detail.drafts) {
    await db.update(messageDrafts).set({ subject: "[deleted]", body: "[deleted]", personalizationNotes: null, state: "withdrawn", updatedAt: new Date() }).where(eq(messageDrafts.id, draft.id));
  }
  await db.update(prospectDossiers).set({ status: "failed", readinessReason: "deleted", updatedAt: new Date() }).where(eq(prospectDossiers.id, prospectDossierId));
}
