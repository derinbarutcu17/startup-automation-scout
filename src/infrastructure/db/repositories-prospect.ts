import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "@/src/infrastructure/db/client";
import type { ProspectStatus } from "@/src/domain/outreach-state";
import { validateStateJump } from "@/src/domain/outreach-state";
import { isValidHttpUrl, validateContactPoint, type ContactChannel, type ContactStatus } from "@/src/domain/contact-policy";
import {
  automationOpportunities,
  claims,
  companies,
  contactPoints,
  evidenceItems,
  gmailDraftResults,
  gmailConnections,
  messageDrafts,
  outreachAngles,
  outreachApprovals,
  outreachSequences,
  personClaimEvidence,
  personClaims,
  personProfileEvidence,
  personProfileSources,
  personProfiles,
  prospectDossierPersons,
  prospectDossiers,
  prospectJobs,
  researchDossiers,
  sourceDocuments,
  suppressionRecords,
  workflowHypotheses,
} from "@/src/infrastructure/db/schema";
import { decryptContactValue, encryptContactValue, hashContactValue, maskContactValue } from "@/src/infrastructure/security/contact-encryption";
import { decryptSecretValue, encryptSecretValue } from "@/src/infrastructure/security/secret-encryption";

// Helpers
function contentFingerprintForDossier(input: {
  companyId: string;
  researchDossierId: string;
  opportunityId?: string | null;
  knownUnknowns: string[];
  openQuestions: string[];
  targetRole?: string | null;
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

function fingerprintForDraft(subject: string, body: string): string {
  return createHash("sha256").update(`${subject}\n---\n${body}`).digest("hex");
}

const prospectStatuses = [
  "not_started",
  "person_research_requested",
  "person_research_ready",
  "angle_review",
  "drafts_ready",
  "approved_for_gmail_draft",
  "gmail_draft_created",
  "suppressed",
  "stale",
  "failed",
] as const satisfies readonly ProspectStatus[];

type DraftState = "generated" | "reviewed" | "approved" | "rejected" | "withdrawn" | "gmail_draft_created";
type PersonProfileStatus = "candidate" | "reviewed" | "rejected" | "stale" | "suppressed";
type ContactPointInput = {
  personProfileId?: string | null;
  companyId?: string | null;
  channelType: ContactChannel;
  normalizedValue: string;
  displayValue: string;
  sourceDocumentId?: string | null;
  userSupplied?: boolean;
  status?: ContactStatus;
  confidence?: "high" | "medium" | "low";
  discoveryMethod: string;
  restrictionNotes?: string | null;
};

function isProspectStatus(value: string): value is ProspectStatus {
  return (prospectStatuses as readonly string[]).includes(value);
}

function uniqueIds(ids: string[] | undefined): string[] {
  return [...new Set(ids ?? [])];
}

function statusRank(status: ContactStatus): number {
  return { candidate: 0, source_verified: 2, user_confirmed: 3, rejected: 4, stale: 1, suppressed: 4 }[status];
}

const suppressionScopes = ["company_domain", "contact_value", "person", "manual"] as const;
const personProfileStatuses = ["candidate", "reviewed", "rejected", "stale", "suppressed"] as const;
const gmailComposeScope = "https://www.googleapis.com/auth/gmail.compose";

// Prospect Dossiers
export async function createProspectDossier(input: {
  companyId: string;
  researchDossierId: string;
  opportunityId?: string | null;
  targetRole?: string | null;
  outreachObjective?: string | null;
  knownUnknowns?: string[];
  openQuestions?: string[];
  sourceCoverage?: Record<string, unknown>;
  freshnessSummary?: Record<string, unknown>;
}) {
  const { db } = getDb();
  const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, input.companyId)).limit(1);
  if (!company) throw new Error("company_not_found");
  const [researchDossier] = await db.select({ companyId: researchDossiers.companyId }).from(researchDossiers).where(eq(researchDossiers.id, input.researchDossierId)).limit(1);
  if (!researchDossier || researchDossier.companyId !== input.companyId) throw new Error("research_dossier_company_mismatch");
  if (input.opportunityId) {
    const [opportunity] = await db.select({ companyId: workflowHypotheses.companyId, researchDossierId: workflowHypotheses.researchDossierId })
      .from(automationOpportunities)
      .innerJoin(workflowHypotheses, eq(automationOpportunities.workflowHypothesisId, workflowHypotheses.id))
      .where(eq(automationOpportunities.id, input.opportunityId))
      .limit(1);
    if (!opportunity || opportunity.companyId !== input.companyId || opportunity.researchDossierId !== input.researchDossierId) throw new Error("dossier_opportunity_mismatch");
  }
  const knownUnknowns = input.knownUnknowns ?? [];
  const openQuestions = input.openQuestions ?? [];
  const fingerprint = contentFingerprintForDossier({
    companyId: input.companyId,
    researchDossierId: input.researchDossierId,
    opportunityId: input.opportunityId ?? null,
    knownUnknowns,
    openQuestions,
    targetRole: input.targetRole ?? null,
  });
  // Find latest version
  const [latest] = await db
    .select({ version: prospectDossiers.version })
    .from(prospectDossiers)
    .where(and(eq(prospectDossiers.companyId, input.companyId), eq(prospectDossiers.researchDossierId, input.researchDossierId)))
    .orderBy(desc(prospectDossiers.version))
    .limit(1);
  const nextVersion = (latest?.version ?? 0) + 1;
  const [row] = await db
    .insert(prospectDossiers)
    .values({
      companyId: input.companyId,
      researchDossierId: input.researchDossierId,
      opportunityId: input.opportunityId ?? null,
      version: nextVersion,
      targetRole: input.targetRole ?? null,
      outreachObjective: input.outreachObjective ?? null,
      knownUnknowns,
      openQuestions,
      sourceCoverage: input.sourceCoverage ?? {},
      freshnessSummary: input.freshnessSummary ?? {},
      contentFingerprint: fingerprint,
      status: "not_started",
    })
    .returning();
  if (!row) throw new Error("Failed to create prospect dossier");
  return row;
}

export async function getProspectDossier(id: string) {
  const { db } = getDb();
  const [row] = await db.select().from(prospectDossiers).where(eq(prospectDossiers.id, id)).limit(1);
  return row ?? null;
}

export async function listProspectDossiers(companyId?: string) {
  const { db } = getDb();
  if (companyId) return db.select().from(prospectDossiers).where(eq(prospectDossiers.companyId, companyId)).orderBy(desc(prospectDossiers.createdAt));
  return db.select().from(prospectDossiers).orderBy(desc(prospectDossiers.createdAt));
}

export async function updateProspectStatus(
  id: string,
  status: ProspectStatus,
  readinessReason?: string,
  context?: { hasAngle?: boolean; hasEvidence?: boolean; reviewed?: boolean },
) {
  const { db } = getDb();
  if (!isProspectStatus(status)) throw new Error(`invalid_prospect_status:${status}`);
  const [current] = await db.select({ status: prospectDossiers.status }).from(prospectDossiers).where(eq(prospectDossiers.id, id)).limit(1);
  if (!current) return null;
  if (current.status === status) {
    const [same] = await db
      .update(prospectDossiers)
      .set({ readinessReason, updatedAt: new Date(), lastReviewedAt: new Date() })
      .where(eq(prospectDossiers.id, id))
      .returning();
    return same ?? null;
  }
  validateStateJump(current.status, status, context);
  const [row] = await db
    .update(prospectDossiers)
    .set({ status, readinessReason, updatedAt: new Date(), lastReviewedAt: new Date() })
    .where(eq(prospectDossiers.id, id))
    .returning();
  return row ?? null;
}

export async function addPersonsToDossier(prospectDossierId: string, personProfileIds: string[]) {
  const { db } = getDb();
  const ids = uniqueIds(personProfileIds);
  if (!ids.length) return;
  const [dossier] = await db.select({ companyId: prospectDossiers.companyId }).from(prospectDossiers).where(eq(prospectDossiers.id, prospectDossierId)).limit(1);
  if (!dossier) throw new Error("prospect_dossier_not_found");
  const profiles = await db.select({ id: personProfiles.id, companyId: personProfiles.companyId }).from(personProfiles).where(inArray(personProfiles.id, ids));
  if (profiles.length !== ids.length || profiles.some((profile) => profile.companyId !== dossier.companyId)) {
    throw new Error("person_dossier_company_mismatch");
  }
  await db.insert(prospectDossierPersons).values(ids.map((personProfileId) => ({ prospectDossierId, personProfileId }))).onConflictDoNothing();
}

async function loadProspectDossierDetail(id: string, includeProtectedValues: boolean) {
  const { db } = getDb();
  const dossier = await getProspectDossier(id);
  if (!dossier) return null;
  const persons = await db
    .select({ person: personProfiles })
    .from(prospectDossierPersons)
    .innerJoin(personProfiles, eq(prospectDossierPersons.personProfileId, personProfiles.id))
    .where(eq(prospectDossierPersons.prospectDossierId, id));
  const contacts = await db
    .select()
    .from(contactPoints)
    .where(
      or(
        eq(contactPoints.companyId, dossier.companyId),
        persons.length ? inArray(contactPoints.personProfileId, persons.map((p) => p.person.id)) : sql`false`,
      ),
    );
  const personProfileIds = persons.map((p) => p.person.id);
  const personClaimRows = personProfileIds.length
    ? await db
        .select()
        .from(personClaims)
        .where(and(eq(personClaims.companyId, dossier.companyId), inArray(personClaims.personProfileId, personProfileIds)))
        .orderBy(asc(personClaims.createdAt))
    : [];
  const personClaimEvidenceRows = personClaimRows.length
    ? await db
        .select({ relation: personClaimEvidence, evidence: evidenceItems, source: sourceDocuments })
        .from(personClaimEvidence)
        .innerJoin(evidenceItems, eq(personClaimEvidence.evidenceItemId, evidenceItems.id))
        .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
        .where(inArray(personClaimEvidence.personClaimId, personClaimRows.map((claim) => claim.id)))
    : [];
  const angles = await db.select().from(outreachAngles).where(eq(outreachAngles.prospectDossierId, id)).orderBy(asc(outreachAngles.createdAt));
  const sequences = await db.select().from(outreachSequences).where(eq(outreachSequences.prospectDossierId, id));
  const drafts = sequences.length
    ? await db
        .select()
        .from(messageDrafts)
        .where(inArray(messageDrafts.outreachSequenceId, sequences.map((s) => s.id)))
      .orderBy(asc(messageDrafts.stepNumber))
    : [];
  const approvals = await db.select().from(outreachApprovals).where(eq(outreachApprovals.prospectDossierId, id)).orderBy(desc(outreachApprovals.createdAt));
  const gmailResults = await db.select().from(gmailDraftResults).where(eq(gmailDraftResults.prospectDossierId, id)).orderBy(desc(gmailDraftResults.createdAt));
  const jobs = await db.select().from(prospectJobs).where(eq(prospectJobs.prospectDossierId, id)).orderBy(desc(prospectJobs.createdAt));
  const decryptedContacts = contacts.map((c) => ({
    ...c,
    // Do not let ciphertext or keyed hashes escape the repository read boundary.
    encryptedValue: null,
    normalizedValue: "[protected]",
    decryptedValue: includeProtectedValues && c.encryptedValue ? decryptContactValue(c.encryptedValue) : null,
  }));
  return {
    dossier,
    persons: persons.map((p) => p.person),
    personClaims: personClaimRows,
    personClaimEvidence: personClaimEvidenceRows,
    contacts: decryptedContacts,
    angles,
    sequences,
    drafts,
    approvals,
    gmailResults,
    jobs,
  };
}

export function getProspectDossierDetail(id: string) {
  return loadProspectDossierDetail(id, false);
}

export function getProspectDossierDetailWithProtectedValues(id: string) {
  return loadProspectDossierDetail(id, true);
}

// Person Profiles
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function createPersonProfile(input: {
  companyId: string;
  fullName: string;
  roleTitle?: string | null;
  function?: string | null;
  seniority?: string | null;
  profileUrl?: string | null;
  profilePlatform?: string | null;
  discoveryMethod: string;
  sourceDocumentIds?: string[];
  evidenceItemIds?: string[];
}) {
  const { db } = getDb();
  const normalizedName = normalizeName(input.fullName);
  if (!normalizedName) throw new Error("person_name_required");
  const profileUrl = input.profileUrl?.trim() || null;
  if (profileUrl && !isValidHttpUrl(profileUrl)) throw new Error("person_profile_url_invalid");
  const sourceIds = uniqueIds(input.sourceDocumentIds);
  const evidenceIds = uniqueIds(input.evidenceItemIds);
  if (sourceIds.length) {
    const sourceRows = await db.select({ id: sourceDocuments.id, companyId: sourceDocuments.companyId }).from(sourceDocuments).where(inArray(sourceDocuments.id, sourceIds));
    if (sourceRows.length !== sourceIds.length || sourceRows.some((source) => source.companyId !== input.companyId)) throw new Error("person_source_company_mismatch");
  }
  if (evidenceIds.length) {
    const evidenceRows = await db.select({ id: evidenceItems.id, companyId: sourceDocuments.companyId })
      .from(evidenceItems)
      .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
      .where(inArray(evidenceItems.id, evidenceIds));
    if (evidenceRows.length !== evidenceIds.length || evidenceRows.some((evidence) => evidence.companyId !== input.companyId)) throw new Error("person_evidence_company_mismatch");
  }
  const existing = await db
    .select()
    .from(personProfiles)
    .where(and(eq(personProfiles.companyId, input.companyId), eq(personProfiles.normalizedName, normalizedName)))
    .limit(10);
  const duplicate = existing.find((p) => (p.profileUrl ?? null) === profileUrl);
  if (duplicate) {
    if (sourceIds.length) {
      await db.insert(personProfileSources).values(sourceIds.map((sourceDocumentId) => ({ personProfileId: duplicate.id, sourceDocumentId }))).onConflictDoNothing();
    }
    if (evidenceIds.length) {
      await db.insert(personProfileEvidence).values(evidenceIds.map((evidenceItemId) => ({ personProfileId: duplicate.id, evidenceItemId }))).onConflictDoNothing();
    }
    const [updated] = await db.update(personProfiles).set({
      roleTitle: input.roleTitle ?? duplicate.roleTitle,
      function: input.function ?? duplicate.function,
      seniority: input.seniority ?? duplicate.seniority,
      profilePlatform: input.profilePlatform ?? duplicate.profilePlatform,
      lastVerifiedAt: evidenceIds.length ? new Date() : duplicate.lastVerifiedAt,
      updatedAt: new Date(),
    }).where(eq(personProfiles.id, duplicate.id)).returning();
    return { profile: updated ?? duplicate, reused: true };
  }

  const [profile] = await db
    .insert(personProfiles)
    .values({
      companyId: input.companyId,
      fullName: input.fullName.trim(),
      normalizedName,
      roleTitle: input.roleTitle ?? null,
      function: input.function ?? null,
      seniority: input.seniority ?? null,
      profileUrl,
      profilePlatform: input.profilePlatform ?? null,
      discoveryMethod: input.discoveryMethod,
      lastVerifiedAt: evidenceIds.length ? new Date() : null,
    })
    .returning();
  if (!profile) throw new Error("Failed to create person profile");
  if (sourceIds.length) {
    await db
      .insert(personProfileSources)
      .values(sourceIds.map((sourceDocumentId) => ({ personProfileId: profile.id, sourceDocumentId })))
      .onConflictDoNothing();
  }
  if (evidenceIds.length) {
    await db
      .insert(personProfileEvidence)
      .values(evidenceIds.map((evidenceItemId) => ({ personProfileId: profile.id, evidenceItemId })))
      .onConflictDoNothing();
  }
  return { profile, reused: false };
}

export async function listPersonProfiles(companyId: string) {
  const { db } = getDb();
  return db.select().from(personProfiles).where(eq(personProfiles.companyId, companyId)).orderBy(desc(personProfiles.createdAt));
}

export async function updatePersonProfileStatus(id: string, status: PersonProfileStatus, reviewNotes?: string) {
  const { db } = getDb();
  if (!(personProfileStatuses as readonly string[]).includes(status)) throw new Error("invalid_person_profile_status");
  const [row] = await db.update(personProfiles).set({ status, reviewNotes, updatedAt: new Date(), lastVerifiedAt: status === "reviewed" ? new Date() : undefined }).where(eq(personProfiles.id, id)).returning();
  return row ?? null;
}

// Person Claims
export async function createPersonClaim(input: {
  personProfileId: string;
  companyId: string;
  subject: string;
  claimText: string;
  claimType: "verified" | "inferred" | "estimated" | "unknown";
  confidence: "high" | "medium" | "low";
  reasoningSummary?: string | null;
  alternativeExplanation?: string | null;
  confirmationQuestion?: string | null;
  evidenceItemIds?: string[];
}) {
  const { db } = getDb();
  const [profile] = await db.select({ companyId: personProfiles.companyId }).from(personProfiles).where(eq(personProfiles.id, input.personProfileId)).limit(1);
  if (!profile) throw new Error("person_profile_not_found");
  if (profile.companyId !== input.companyId) throw new Error("person_claim_company_mismatch");
  if (input.claimType === "verified" && (!input.evidenceItemIds || input.evidenceItemIds.length === 0)) {
    throw new Error("verified_person_claim_requires_evidence");
  }
  if (input.claimType === "inferred" && !input.reasoningSummary) {
    throw new Error("inferred_person_claim_requires_reasoning");
  }
  const evidenceIds = uniqueIds(input.evidenceItemIds);
  if (evidenceIds.length) {
    const evidenceRows = await db.select({ id: evidenceItems.id, companyId: sourceDocuments.companyId })
      .from(evidenceItems)
      .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
      .where(inArray(evidenceItems.id, evidenceIds));
    if (evidenceRows.length !== evidenceIds.length || evidenceRows.some((evidence) => evidence.companyId !== input.companyId)) throw new Error("person_claim_evidence_company_mismatch");
  }
  const [claim] = await db
    .insert(personClaims)
    .values({
      personProfileId: input.personProfileId,
      companyId: input.companyId,
      subject: input.subject,
      claimText: input.claimText,
      claimType: input.claimType,
      confidence: input.confidence,
      reasoningSummary: input.reasoningSummary ?? null,
      alternativeExplanation: input.alternativeExplanation ?? null,
      confirmationQuestion: input.confirmationQuestion ?? null,
    })
    .onConflictDoNothing({
      target: [personClaims.personProfileId, personClaims.subject, personClaims.claimText, personClaims.claimType],
    })
    .returning();
  let persisted = claim;
  if (!persisted) {
    const [existing] = await db
      .select()
      .from(personClaims)
      .where(
        and(
          eq(personClaims.personProfileId, input.personProfileId),
          eq(personClaims.subject, input.subject),
          eq(personClaims.claimText, input.claimText),
          eq(personClaims.claimType, input.claimType),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Failed to persist person claim");
    persisted = existing;
  }
  if (evidenceIds.length) {
    await db
      .insert(personClaimEvidence)
      .values(
        evidenceIds.map((evidenceItemId) => ({
          personClaimId: persisted.id,
          evidenceItemId,
          relation: input.claimType === "verified" ? ("supports" as const) : ("motivates" as const),
        })),
      )
      .onConflictDoNothing();
  }
  return persisted;
}

// Contact Points
export async function createContactPoint(input: ContactPointInput) {
  if ((input.personProfileId ? 1 : 0) + (input.companyId ? 1 : 0) !== 1) {
    throw new Error("contact_requires_exactly_one_owner");
  }
  const normalizedValue = input.normalizedValue.trim().toLowerCase();
  const status = input.status ?? "candidate";
  const validation = validateContactPoint({
    channelType: input.channelType,
    normalizedValue,
    status,
    discoveryMethod: input.discoveryMethod,
    sourceDocumentId: input.sourceDocumentId ?? null,
    userSupplied: input.userSupplied ?? false,
  });
  if (!validation.ok) throw new Error(validation.reason ?? "invalid_contact_point");

  const { db } = getDb();
  if (input.personProfileId) {
    const [profile] = await db.select({ companyId: personProfiles.companyId }).from(personProfiles).where(eq(personProfiles.id, input.personProfileId)).limit(1);
    if (!profile) throw new Error("person_profile_not_found");
    if (input.companyId && profile.companyId !== input.companyId) throw new Error("contact_person_company_mismatch");
  }
  if (input.companyId) {
    const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, input.companyId)).limit(1);
    if (!company) throw new Error("company_not_found");
  }
  if (input.sourceDocumentId) {
    const ownerCompanyId = input.companyId ?? (input.personProfileId
      ? (await db.select({ companyId: personProfiles.companyId }).from(personProfiles).where(eq(personProfiles.id, input.personProfileId)).limit(1))[0]?.companyId
      : undefined);
    const [source] = await db.select({ companyId: sourceDocuments.companyId }).from(sourceDocuments).where(eq(sourceDocuments.id, input.sourceDocumentId)).limit(1);
    if (!source || !ownerCompanyId || source.companyId !== ownerCompanyId) throw new Error("contact_source_company_mismatch");
  }

  const valueHash = hashContactValue(input.channelType, normalizedValue);
  const encryptedValue = encryptContactValue(normalizedValue);
  const displayValue = maskContactValue(
    input.channelType,
    input.channelType === "public_professional_email" ? normalizedValue : (input.displayValue || normalizedValue),
  );
  const ownerWhere = input.personProfileId
    ? eq(contactPoints.personProfileId, input.personProfileId)
    : eq(contactPoints.companyId, input.companyId!);
  const existingRows = await db.select().from(contactPoints).where(ownerWhere);
  const existing = existingRows.find((row) => row.encryptedValue && decryptContactValue(row.encryptedValue)?.trim().toLowerCase() === normalizedValue);
  if (existing) {
    if (statusRank(status) > statusRank(existing.status as ContactStatus)) {
      const [updated] = await db.update(contactPoints).set({
        encryptedValue,
        normalizedValue: valueHash,
        displayValue,
        sourceDocumentId: input.sourceDocumentId ?? existing.sourceDocumentId,
        status,
        confidence: input.confidence ?? existing.confidence,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(contactPoints.id, existing.id)).returning();
      return { point: updated ?? existing, reused: true };
    }
    return { point: existing, reused: true };
  }
  const [point] = await db
    .insert(contactPoints)
    .values({
      personProfileId: input.personProfileId ?? null,
      companyId: input.companyId ?? null,
      channelType: input.channelType,
      normalizedValue: valueHash,
      displayValue,
      encryptedValue,
      sourceDocumentId: input.sourceDocumentId ?? null,
      userSupplied: input.userSupplied ?? false,
      status,
      confidence: input.confidence ?? "medium",
      discoveryMethod: input.discoveryMethod,
      restrictionNotes: input.restrictionNotes ?? null,
      lastCheckedAt: status === "source_verified" || status === "user_confirmed" || input.userSupplied ? new Date() : null,
    })
    .returning();
  if (!point) throw new Error("Failed to create contact point");
  return { point, reused: false };
}

export async function listContactPointsForPerson(personProfileId: string) {
  const { db } = getDb();
  const rows = await db.select().from(contactPoints).where(eq(contactPoints.personProfileId, personProfileId)).orderBy(desc(contactPoints.createdAt));
  return rows.map((r) => ({ ...r, encryptedValue: null, normalizedValue: "[protected]", decryptedValue: null }));
}

export async function listContactPointsForPersonWithProtectedValues(personProfileId: string) {
  const { db } = getDb();
  const rows = await db.select().from(contactPoints).where(eq(contactPoints.personProfileId, personProfileId)).orderBy(desc(contactPoints.createdAt));
  return rows.map((r) => ({ ...r, encryptedValue: null, normalizedValue: "[protected]", decryptedValue: r.encryptedValue ? decryptContactValue(r.encryptedValue) : null }));
}

export async function updateContactPointStatus(id: string, status: ContactStatus) {
  const { db } = getDb();
  const [current] = await db
    .select({
      channelType: contactPoints.channelType,
      normalizedValue: contactPoints.normalizedValue,
      encryptedValue: contactPoints.encryptedValue,
      sourceDocumentId: contactPoints.sourceDocumentId,
      userSupplied: contactPoints.userSupplied,
      discoveryMethod: contactPoints.discoveryMethod,
    })
    .from(contactPoints)
    .where(eq(contactPoints.id, id))
    .limit(1);
  if (!current) return null;
  const normalizedValue = current.encryptedValue ? decryptContactValue(current.encryptedValue) : null;
  if (!normalizedValue) throw new Error("contact_value_unavailable");
  const validation = validateContactPoint({
    channelType: current.channelType as ContactChannel,
    normalizedValue,
    status,
    discoveryMethod: current.discoveryMethod,
    sourceDocumentId: current.sourceDocumentId,
    userSupplied: current.userSupplied,
  });
  if (!validation.ok) throw new Error(validation.reason ?? "invalid_contact_point");
  const [row] = await db.update(contactPoints).set({ status, lastCheckedAt: new Date(), updatedAt: new Date() }).where(eq(contactPoints.id, id)).returning();
  return row ?? null;
}

// Outreach Angles
export async function createOutreachAngle(input: {
  prospectDossierId: string;
  opportunityId?: string | null;
  targetPersonId?: string | null;
  targetRole?: string | null;
  title: string;
  thesis: string;
  verifiedSignal: string;
  workflowHypothesis: string;
  relevanceReason: string;
  valueHypothesis: string;
  callToAction: string;
  evidenceIds?: string[];
  claimIds?: string[];
  personClaimIds?: string[];
  assumptions?: string[];
  alternativeExplanations?: string[];
  confirmationQuestions?: string[];
  confidence?: "high" | "medium" | "low";
}) {
  const { db } = getDb();
  const [dossier] = await db.select({ companyId: prospectDossiers.companyId, opportunityId: prospectDossiers.opportunityId })
    .from(prospectDossiers)
    .where(eq(prospectDossiers.id, input.prospectDossierId))
    .limit(1);
  if (!dossier) throw new Error("prospect_dossier_not_found");
  if (input.opportunityId && input.opportunityId !== dossier.opportunityId) throw new Error("angle_opportunity_mismatch");
  if (input.targetPersonId) {
    const [target] = await db.select({ companyId: personProfiles.companyId }).from(personProfiles).where(eq(personProfiles.id, input.targetPersonId)).limit(1);
    if (!target || target.companyId !== dossier.companyId) throw new Error("angle_target_company_mismatch");
    const [linked] = await db.select().from(prospectDossierPersons).where(and(eq(prospectDossierPersons.prospectDossierId, input.prospectDossierId), eq(prospectDossierPersons.personProfileId, input.targetPersonId))).limit(1);
    if (!linked) throw new Error("angle_target_not_in_dossier");
  }
  const evidenceIds = uniqueIds(input.evidenceIds);
  if (evidenceIds.length) {
    const rows = await db.select({ id: evidenceItems.id, companyId: sourceDocuments.companyId })
      .from(evidenceItems)
      .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
      .where(inArray(evidenceItems.id, evidenceIds));
    if (rows.length !== evidenceIds.length || rows.some((row) => row.companyId !== dossier.companyId)) throw new Error("angle_evidence_company_mismatch");
  }
  const claimIds = uniqueIds(input.claimIds);
  if (claimIds.length) {
    const rows = await db.select({ id: claims.id, companyId: claims.companyId }).from(claims).where(inArray(claims.id, claimIds));
    if (rows.length !== claimIds.length || rows.some((row) => row.companyId !== dossier.companyId)) throw new Error("angle_claim_company_mismatch");
  }
  const personClaimIds = uniqueIds(input.personClaimIds);
  if (personClaimIds.length) {
    const rows = await db.select({ id: personClaims.id, companyId: personClaims.companyId, personProfileId: personClaims.personProfileId }).from(personClaims).where(inArray(personClaims.id, personClaimIds));
    if (rows.length !== personClaimIds.length || rows.some((row) => row.companyId !== dossier.companyId)) throw new Error("angle_person_claim_company_mismatch");
    const linked = await db
      .select({ personProfileId: prospectDossierPersons.personProfileId })
      .from(prospectDossierPersons)
      .where(and(eq(prospectDossierPersons.prospectDossierId, input.prospectDossierId), inArray(prospectDossierPersons.personProfileId, rows.map((row) => row.personProfileId))));
    const linkedIds = new Set(linked.map((row) => row.personProfileId));
    if (rows.some((row) => !linkedIds.has(row.personProfileId))) throw new Error("angle_person_claim_not_in_dossier");
    if (input.targetPersonId && rows.some((row) => row.personProfileId !== input.targetPersonId)) throw new Error("angle_person_claim_target_mismatch");
  }
  const [row] = await db
    .insert(outreachAngles)
    .values({
      prospectDossierId: input.prospectDossierId,
      opportunityId: input.opportunityId ?? null,
      targetPersonId: input.targetPersonId ?? null,
      targetRole: input.targetRole ?? null,
      title: input.title,
      thesis: input.thesis,
      verifiedSignal: input.verifiedSignal,
      workflowHypothesis: input.workflowHypothesis,
      relevanceReason: input.relevanceReason,
      valueHypothesis: input.valueHypothesis,
      callToAction: input.callToAction,
      evidenceIds,
      claimIds,
      personClaimIds,
      assumptions: input.assumptions ?? [],
      alternativeExplanations: input.alternativeExplanations ?? [],
      confirmationQuestions: input.confirmationQuestions ?? [],
      confidence: input.confidence ?? "medium",
    })
    .returning();
  if (!row) throw new Error("Failed to create outreach angle");
  return row;
}

export async function listOutreachAngles(prospectDossierId: string) {
  const { db } = getDb();
  return db.select().from(outreachAngles).where(eq(outreachAngles.prospectDossierId, prospectDossierId)).orderBy(asc(outreachAngles.createdAt));
}

// Sequences & Drafts
export async function createOutreachSequence(input: { prospectDossierId: string; outreachAngleId: string; status?: string }) {
  const { db } = getDb();
  const [angle] = await db.select({ prospectDossierId: outreachAngles.prospectDossierId }).from(outreachAngles).where(eq(outreachAngles.id, input.outreachAngleId)).limit(1);
  if (!angle) throw new Error("outreach_angle_not_found");
  if (angle.prospectDossierId !== input.prospectDossierId) throw new Error("sequence_angle_dossier_mismatch");
  const [existing] = await db
    .select()
    .from(outreachSequences)
    .where(and(eq(outreachSequences.prospectDossierId, input.prospectDossierId), eq(outreachSequences.outreachAngleId, input.outreachAngleId)))
    .limit(1);
  if (existing) return { sequence: existing, reused: true };
  const [seq] = await db.insert(outreachSequences).values({ prospectDossierId: input.prospectDossierId, outreachAngleId: input.outreachAngleId, status: input.status ?? "draft" }).returning();
  if (!seq) throw new Error("Failed to create outreach sequence");
  return { sequence: seq, reused: false };
}

export async function createMessageDraft(input: {
  outreachSequenceId: string;
  stepNumber: number;
  purpose: string;
  subject: string;
  body: string;
  contactPointId?: string | null;
  evidenceIds?: string[];
  claimIds?: string[];
  personalizationNotes?: string | null;
  modelVersion?: string | null;
  promptVersion?: string | null;
}) {
  if (input.stepNumber < 1 || input.stepNumber > 3) throw new Error("draft_step_out_of_bounds");
  if (!input.subject.trim()) throw new Error("draft_subject_required");
  if (input.subject.length > 200) throw new Error("draft_subject_too_long");
  if (!input.body.trim()) throw new Error("draft_body_required");
  if (input.body.length > 20_000) throw new Error("draft_body_too_long");
  const { db } = getDb();
  const [sequence] = await db.select({ prospectDossierId: outreachSequences.prospectDossierId }).from(outreachSequences).where(eq(outreachSequences.id, input.outreachSequenceId)).limit(1);
  if (!sequence) throw new Error("outreach_sequence_not_found");
  const [dossier] = await db.select({ companyId: prospectDossiers.companyId }).from(prospectDossiers).where(eq(prospectDossiers.id, sequence.prospectDossierId)).limit(1);
  if (!dossier) throw new Error("prospect_dossier_not_found");
  if (input.contactPointId) {
    const [contact] = await db.select({ companyId: contactPoints.companyId, personProfileId: contactPoints.personProfileId }).from(contactPoints).where(eq(contactPoints.id, input.contactPointId)).limit(1);
    if (!contact) throw new Error("contact_point_not_found");
    if (contact.companyId && contact.companyId !== dossier.companyId) throw new Error("draft_contact_company_mismatch");
    if (contact.personProfileId) {
      const [profile] = await db.select({ companyId: personProfiles.companyId }).from(personProfiles).where(eq(personProfiles.id, contact.personProfileId)).limit(1);
      if (!profile || profile.companyId !== dossier.companyId) throw new Error("draft_contact_company_mismatch");
      const [linked] = await db.select().from(prospectDossierPersons).where(and(eq(prospectDossierPersons.prospectDossierId, sequence.prospectDossierId), eq(prospectDossierPersons.personProfileId, contact.personProfileId))).limit(1);
      if (!linked) throw new Error("draft_contact_not_in_dossier");
    } else if (contact.companyId !== dossier.companyId) {
      throw new Error("draft_contact_company_mismatch");
    }
  }
  const evidenceIds = uniqueIds(input.evidenceIds);
  if (evidenceIds.length) {
    const rows = await db.select({ id: evidenceItems.id, companyId: sourceDocuments.companyId }).from(evidenceItems).innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id)).where(inArray(evidenceItems.id, evidenceIds));
    if (rows.length !== evidenceIds.length || rows.some((row) => row.companyId !== dossier.companyId)) throw new Error("draft_evidence_company_mismatch");
  }
  const claimIds = uniqueIds(input.claimIds);
  if (claimIds.length) {
    const rows = await db.select({ id: claims.id, companyId: claims.companyId }).from(claims).where(inArray(claims.id, claimIds));
    if (rows.length !== claimIds.length || rows.some((row) => row.companyId !== dossier.companyId)) throw new Error("draft_claim_company_mismatch");
  }
  const contentFingerprint = fingerprintForDraft(input.subject, input.body);
  const [existing] = await db
    .select()
    .from(messageDrafts)
    .where(and(eq(messageDrafts.outreachSequenceId, input.outreachSequenceId), eq(messageDrafts.stepNumber, input.stepNumber)))
    .limit(1);
  if (existing) {
    // If subject/body unchanged, reuse; else update and invalidate prior approval
    const existingFp = existing.contentFingerprint;
    if (existingFp === contentFingerprint && existing.subject === input.subject && existing.body === input.body) {
      return { draft: existing, reused: true };
    }
    if (existing.state === "gmail_draft_created") throw new Error("gmail_draft_content_immutable");
    const [updated] = await db
      .update(messageDrafts)
      .set({
        subject: input.subject,
        body: input.body,
        purpose: input.purpose,
        contactPointId: input.contactPointId ?? null,
        evidenceIds,
        claimIds,
        personalizationNotes: input.personalizationNotes ?? null,
        modelVersion: input.modelVersion ?? null,
        promptVersion: input.promptVersion ?? null,
        contentFingerprint,
        state: "generated",
        updatedAt: new Date(),
      })
      .where(eq(messageDrafts.id, existing.id))
      .returning();
    return { draft: updated!, reused: false, updated: true };
  }
  const [draft] = await db
    .insert(messageDrafts)
    .values({
      outreachSequenceId: input.outreachSequenceId,
      stepNumber: input.stepNumber,
      purpose: input.purpose,
      subject: input.subject,
      body: input.body,
      contactPointId: input.contactPointId ?? null,
      evidenceIds,
      claimIds,
      personalizationNotes: input.personalizationNotes ?? null,
      modelVersion: input.modelVersion ?? null,
      promptVersion: input.promptVersion ?? null,
      contentFingerprint,
    })
    .returning();
  if (!draft) throw new Error("Failed to create message draft");
  return { draft, reused: false };
}

export async function updateDraftState(id: string, state: DraftState) {
  const { db } = getDb();
  const [current] = await db.select({ state: messageDrafts.state }).from(messageDrafts).where(eq(messageDrafts.id, id)).limit(1);
  if (!current) return null;
  const transitions: Record<DraftState, DraftState[]> = {
    generated: ["reviewed", "approved", "rejected", "withdrawn"],
    reviewed: ["approved", "rejected", "withdrawn"],
    approved: ["withdrawn", "gmail_draft_created"],
    rejected: ["generated", "withdrawn"],
    withdrawn: ["generated"],
    gmail_draft_created: [],
  };
  if (current.state !== state && !transitions[current.state].includes(state)) throw new Error(`invalid_draft_transition:${current.state}->${state}`);
  const [row] = await db.update(messageDrafts).set({ state, updatedAt: new Date() }).where(eq(messageDrafts.id, id)).returning();
  return row ?? null;
}

export async function batchFingerprint(draftIds: string[]): Promise<string> {
  if (!draftIds.length || new Set(draftIds).size !== draftIds.length) throw new Error("draft_batch_invalid");
  const { db } = getDb();
  const rows = await db.select().from(messageDrafts).where(inArray(messageDrafts.id, draftIds));
  if (rows.length !== draftIds.length) throw new Error("draft_batch_incomplete");
  const sorted = rows.sort((a, b) => a.stepNumber - b.stepNumber || a.id.localeCompare(b.id)).map((r) => `${r.outreachSequenceId}:${r.stepNumber}:${r.contentFingerprint}`).join("|");
  return createHash("sha256").update(sorted).digest("hex");
}

// Approvals
export async function createOutreachApproval(input: {
  actionType: string;
  prospectDossierId: string;
  draftBatchIds: string[];
  contentFingerprint: string;
  approverIdentity: string;
  expiresAt?: Date | null;
}) {
  const { db } = getDb();
  if (input.actionType !== "create_gmail_draft") throw new Error("approval_action_not_supported");
  if (!input.draftBatchIds.length || new Set(input.draftBatchIds).size !== input.draftBatchIds.length) throw new Error("approval_batch_invalid");
  const rows = await db.select({ id: messageDrafts.id, state: messageDrafts.state })
    .from(messageDrafts)
    .innerJoin(outreachSequences, eq(messageDrafts.outreachSequenceId, outreachSequences.id))
    .where(and(eq(outreachSequences.prospectDossierId, input.prospectDossierId), inArray(messageDrafts.id, input.draftBatchIds)));
  if (rows.length !== input.draftBatchIds.length) throw new Error("approval_batch_not_in_dossier");
  if (rows.some((row) => row.state === "rejected" || row.state === "withdrawn" || row.state === "gmail_draft_created")) throw new Error("approval_batch_not_approvable");
  const expectedFingerprint = await batchFingerprint(input.draftBatchIds);
  if (expectedFingerprint !== input.contentFingerprint) throw new Error("approval_fingerprint_mismatch");
  const [row] = await db
    .insert(outreachApprovals)
    .values({
      actionType: input.actionType,
      prospectDossierId: input.prospectDossierId,
      draftBatchIds: input.draftBatchIds,
      contentFingerprint: input.contentFingerprint,
      approverIdentity: input.approverIdentity,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to create approval");
  return row;
}

export async function invalidateApprovalsForDraft(prospectDossierId: string, draftId: string, reason = "draft_edited") {
  const { db } = getDb();
  const approvals = await db
    .select({ id: outreachApprovals.id, draftBatchIds: outreachApprovals.draftBatchIds })
    .from(outreachApprovals)
    .where(eq(outreachApprovals.prospectDossierId, prospectDossierId));
  const affected = approvals.filter((approval) => (approval.draftBatchIds as string[]).includes(draftId));
  for (const approval of affected) {
    await db
      .update(outreachApprovals)
      .set({ result: "invalidated", rejectionReason: reason })
      .where(eq(outreachApprovals.id, approval.id));
  }
  return affected.map((approval) => approval.id);
}

export async function updateOutreachApprovalResult(id: string, result: string, rejectionReason?: string | null) {
  const { db } = getDb();
  const [row] = await db
    .update(outreachApprovals)
    .set({ result, rejectionReason: rejectionReason ?? null })
    .where(eq(outreachApprovals.id, id))
    .returning();
  return row ?? null;
}

export async function getOutreachApproval(id: string) {
  const { db } = getDb();
  const [row] = await db.select().from(outreachApprovals).where(eq(outreachApprovals.id, id)).limit(1);
  return row ?? null;
}

// Suppression
export function normalizeSuppressionValue(scope: string, value: string): string {
  if (scope === "company_domain" || scope === "contact_value" || scope === "person") return value.trim().toLowerCase();
  return value.trim().toLowerCase();
}

export async function addSuppression(input: { scope: string; normalizedValue: string; reason: string; source?: string; createdBy?: string | null }) {
  const { db } = getDb();
  if (!(suppressionScopes as readonly string[]).includes(input.scope)) throw new Error("invalid_suppression_scope");
  const normalizedValue = normalizeSuppressionValue(input.scope, input.normalizedValue);
  const storedValue = input.scope === "contact_value" ? hashContactValue("contact_value", normalizedValue) : normalizedValue;
  const [existing] = await db
    .select()
    .from(suppressionRecords)
    .where(and(eq(suppressionRecords.scope, input.scope), eq(suppressionRecords.normalizedValue, storedValue)))
    .limit(1);
  if (existing) return { record: existing, reused: true };
  const [row] = await db.insert(suppressionRecords).values({ scope: input.scope, normalizedValue: storedValue, reason: input.reason, source: input.source ?? "manual", createdBy: input.createdBy ?? null }).returning();
  if (!row) throw new Error("Failed to create suppression");
  return { record: row, reused: false };
}

export async function isSuppressed(scope: string, value: string): Promise<boolean> {
  const { db } = getDb();
  if (!(suppressionScopes as readonly string[]).includes(scope)) return false;
  const normalizedValue = normalizeSuppressionValue(scope, value);
  const storedValue = scope === "contact_value" ? hashContactValue("contact_value", normalizedValue) : normalizedValue;
  const [row] = await db.select().from(suppressionRecords).where(and(eq(suppressionRecords.scope, scope), eq(suppressionRecords.normalizedValue, storedValue))).limit(1);
  return !!row;
}

export async function isContactSuppressed(normalizedValue: string): Promise<boolean> {
  return isSuppressed("contact_value", normalizedValue);
}

export async function listSuppressions() {
  const { db } = getDb();
  return db.select().from(suppressionRecords).orderBy(desc(suppressionRecords.createdAt));
}

export async function removeSuppression(id: string) {
  const { db } = getDb();
  await db.delete(suppressionRecords).where(eq(suppressionRecords.id, id));
}

// Gmail draft results
export async function createGmailDraftResult(input: {
  prospectDossierId: string;
  approvalId: string;
  idempotencyKey: string;
  requestedDraftIds: string[];
  succeededDraftIds?: string[];
  failedDraftIds?: string[];
  gmailDraftIds?: Record<string, string>;
  providerResponse?: Record<string, unknown>;
}) {
  const { db } = getDb();
  if (!input.requestedDraftIds.length || new Set(input.requestedDraftIds).size !== input.requestedDraftIds.length) throw new Error("gmail_result_batch_invalid");
  const requested = new Set(input.requestedDraftIds);
  const succeeded = new Set(input.succeededDraftIds ?? []);
  const failed = new Set(input.failedDraftIds ?? []);
  if ([...succeeded, ...failed].some((draftId) => !requested.has(draftId)) || [...succeeded].some((draftId) => failed.has(draftId))) throw new Error("gmail_result_progress_invalid");
  if (Object.keys(input.gmailDraftIds ?? {}).some((draftId) => !succeeded.has(draftId))) throw new Error("gmail_result_ids_invalid");
  const [approval] = await db.select({ prospectDossierId: outreachApprovals.prospectDossierId, draftBatchIds: outreachApprovals.draftBatchIds, result: outreachApprovals.result })
    .from(outreachApprovals)
    .where(eq(outreachApprovals.id, input.approvalId))
    .limit(1);
  if (!approval || approval.prospectDossierId !== input.prospectDossierId) throw new Error("gmail_result_approval_mismatch");
  if (approval.result === "invalidated") throw new Error("approval_invalidated");
  const approvedDraftIds = new Set(approval.draftBatchIds as string[]);
  if (input.requestedDraftIds.some((id) => !approvedDraftIds.has(id))) throw new Error("gmail_result_batch_not_approved");
  const [existing] = await db.select().from(gmailDraftResults).where(eq(gmailDraftResults.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing) {
    const existingRequested = existing.requestedDraftIds as string[];
    if (existing.prospectDossierId !== input.prospectDossierId || existing.approvalId !== input.approvalId || existingRequested.length !== input.requestedDraftIds.length || existingRequested.some((id) => !input.requestedDraftIds.includes(id))) {
      throw new Error("gmail_result_idempotency_mismatch");
    }
    return { result: existing, reused: true };
  }
  const [row] = await db
    .insert(gmailDraftResults)
    .values({
      prospectDossierId: input.prospectDossierId,
      approvalId: input.approvalId,
      idempotencyKey: input.idempotencyKey,
      requestedDraftIds: input.requestedDraftIds,
      succeededDraftIds: input.succeededDraftIds ?? [],
      failedDraftIds: input.failedDraftIds ?? [],
      gmailDraftIds: input.gmailDraftIds ?? {},
      providerResponse: input.providerResponse ?? {},
    })
    .returning();
  if (!row) throw new Error("Failed to create gmail draft result");
  return { result: row, reused: false };
}

export async function getGmailDraftResultByIdempotencyKey(idempotencyKey: string) {
  const { db } = getDb();
  const [row] = await db.select().from(gmailDraftResults).where(eq(gmailDraftResults.idempotencyKey, idempotencyKey)).limit(1);
  return row ?? null;
}

export async function listGmailDraftResults(prospectDossierId: string) {
  const { db } = getDb();
  return db.select().from(gmailDraftResults).where(eq(gmailDraftResults.prospectDossierId, prospectDossierId)).orderBy(desc(gmailDraftResults.createdAt));
}

export async function updateGmailDraftResult(id: string, input: {
  succeededDraftIds: string[];
  failedDraftIds: string[];
  gmailDraftIds: Record<string, string>;
  providerResponse?: Record<string, unknown>;
}) {
  const { db } = getDb();
  const [current] = await db.select({ requestedDraftIds: gmailDraftResults.requestedDraftIds }).from(gmailDraftResults).where(eq(gmailDraftResults.id, id)).limit(1);
  if (!current) return null;
  const requested = new Set(current.requestedDraftIds as string[]);
  const succeeded = new Set(input.succeededDraftIds);
  const failed = new Set(input.failedDraftIds);
  if ([...succeeded, ...failed].some((draftId) => !requested.has(draftId)) || [...succeeded].some((draftId) => failed.has(draftId))) throw new Error("gmail_result_progress_invalid");
  const [row] = await db.update(gmailDraftResults).set({
    succeededDraftIds: input.succeededDraftIds,
    failedDraftIds: input.failedDraftIds,
    gmailDraftIds: input.gmailDraftIds,
    providerResponse: input.providerResponse ?? {},
  }).where(eq(gmailDraftResults.id, id)).returning();
  return row ?? null;
}

export async function saveGmailConnection(input: {
  provider?: string;
  email?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scope: string;
}) {
  const { db } = getDb();
  const scopes = new Set(input.scope.split(/\s+/).filter(Boolean));
  if (scopes.size !== 1 || !scopes.has(gmailComposeScope)) throw new Error("gmail_compose_scope_required");
  const provider = input.provider ?? "google";
  const [existing] = await db.select().from(gmailConnections).where(eq(gmailConnections.provider, provider)).limit(1);
  const [row] = existing
    ? await db.update(gmailConnections).set({
        email: input.email ?? existing.email,
        accessToken: input.accessToken ? encryptSecretValue(input.accessToken) : existing.accessToken,
        refreshToken: input.refreshToken ? encryptSecretValue(input.refreshToken) : existing.refreshToken,
        tokenExpiresAt: input.tokenExpiresAt ?? existing.tokenExpiresAt,
        scope: input.scope,
        status: "connected",
        updatedAt: new Date(),
      }).where(eq(gmailConnections.id, existing.id)).returning()
    : await db.insert(gmailConnections).values({
        provider,
        email: input.email ?? null,
        accessToken: input.accessToken ? encryptSecretValue(input.accessToken) : null,
        refreshToken: input.refreshToken ? encryptSecretValue(input.refreshToken) : null,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        scope: input.scope,
        status: "connected",
      }).returning();
  if (!row) throw new Error("Failed to save Gmail connection");
  return row;
}

export async function getGmailConnection(provider = "google") {
  const { db } = getDb();
  const [row] = await db.select().from(gmailConnections).where(and(eq(gmailConnections.provider, provider), eq(gmailConnections.status, "connected"))).limit(1);
  if (!row) return null;
  return {
    ...row,
    accessToken: decryptSecretValue(row.accessToken),
    refreshToken: decryptSecretValue(row.refreshToken),
  };
}

export async function getGmailConnectionMetadata(provider = "google") {
  const { db } = getDb();
  const [row] = await db.select({
    id: gmailConnections.id,
    provider: gmailConnections.provider,
    email: gmailConnections.email,
    tokenExpiresAt: gmailConnections.tokenExpiresAt,
    scope: gmailConnections.scope,
    status: gmailConnections.status,
    createdAt: gmailConnections.createdAt,
    updatedAt: gmailConnections.updatedAt,
  }).from(gmailConnections).where(and(eq(gmailConnections.provider, provider), eq(gmailConnections.status, "connected"))).limit(1);
  return row ?? null;
}

export async function disconnectGmailConnection(provider = "google") {
  const { db } = getDb();
  const [row] = await db.update(gmailConnections).set({ status: "disconnected", accessToken: null, refreshToken: null, updatedAt: new Date() }).where(eq(gmailConnections.provider, provider)).returning();
  return row ?? null;
}

// Prospect Jobs
export function prospectJobIdempotency(prospectDossierId: string, jobType: string, payload: unknown): { idempotencyKey: string; inputFingerprint: string } {
  const payloadStr = JSON.stringify(payload ?? {});
  const inputFingerprint = createHash("sha256").update(payloadStr).digest("hex");
  return { idempotencyKey: `${prospectDossierId}:${jobType}:${inputFingerprint}`, inputFingerprint };
}

export async function enqueueProspectJob(input: {
  prospectDossierId: string;
  companyId: string;
  opportunityId?: string | null;
  jobType: "people_research" | "angle_generation" | "draft_generation" | "handoff_export";
  payload?: Record<string, unknown>;
  availableAt?: Date;
  approvalId?: string | null;
}) {
  const { db } = getDb();
  const [dossier] = await db.select({ companyId: prospectDossiers.companyId, opportunityId: prospectDossiers.opportunityId, researchDossierId: prospectDossiers.researchDossierId }).from(prospectDossiers).where(eq(prospectDossiers.id, input.prospectDossierId)).limit(1);
  if (!dossier || dossier.companyId !== input.companyId || (input.opportunityId ?? null) !== dossier.opportunityId) throw new Error("prospect_job_dossier_mismatch");
  if (input.opportunityId) {
    const [opportunity] = await db.select({ companyId: workflowHypotheses.companyId, researchDossierId: workflowHypotheses.researchDossierId })
      .from(automationOpportunities)
      .innerJoin(workflowHypotheses, eq(automationOpportunities.workflowHypothesisId, workflowHypotheses.id))
      .where(eq(automationOpportunities.id, input.opportunityId))
      .limit(1);
    if (!opportunity || opportunity.companyId !== input.companyId || opportunity.researchDossierId !== dossier.researchDossierId) throw new Error("prospect_job_opportunity_mismatch");
  }
  const { idempotencyKey, inputFingerprint } = prospectJobIdempotency(input.prospectDossierId, input.jobType, input.payload ?? {});
  const [existing] = await db.select().from(prospectJobs).where(eq(prospectJobs.idempotencyKey, idempotencyKey)).limit(1);
  if (existing) {
    if (existing.status === "failed_terminal") {
      const [retried] = await db.update(prospectJobs).set({ status: "pending", attemptCount: 0, lastErrorCategory: null, lastErrorMessage: null, availableAt: new Date(), updatedAt: new Date() }).where(eq(prospectJobs.id, existing.id)).returning();
      return retried ?? existing;
    }
    return existing;
  }
  const [row] = await db
    .insert(prospectJobs)
    .values({
      prospectDossierId: input.prospectDossierId,
      companyId: input.companyId,
      opportunityId: input.opportunityId ?? null,
      jobType: input.jobType,
      idempotencyKey,
      inputFingerprint,
      metadata: input.payload ?? {},
      availableAt: input.availableAt ?? new Date(),
      approvalId: input.approvalId ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to enqueue prospect job");
  return row;
}

export async function claimProspectJobs(workerId: string, limit: number, leaseMs = 30_000) {
  const { db } = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx.execute(sql`
      SELECT id FROM prospect_jobs
      WHERE status IN ('pending','failed_retryable')
        AND available_at <= now()
      ORDER BY available_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `);
    const ids = (rows as unknown as Array<{ id: string }>).map((r) => String(r.id));
    if (!ids.length) return [];
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);
    return tx
      .update(prospectJobs)
      .set({
        status: "running",
        leaseOwner: workerId,
        claimedAt: now,
        leaseExpiresAt,
        attemptCount: sql`${prospectJobs.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(inArray(prospectJobs.id, ids))
      .returning();
  });
}

export async function completeProspectJob(id: string, output?: unknown) {
  const { db } = getDb();
  const fp = createHash("sha256").update(JSON.stringify(output ?? {})).digest("hex");
  const [row] = await db.update(prospectJobs).set({ status: "succeeded", outputFingerprint: fp, leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date() }).where(eq(prospectJobs.id, id)).returning();
  return row ?? null;
}

export async function failProspectJob(id: string, input: { category: string; message: string; retryable: boolean; maxRetries: number }) {
  const { db } = getDb();
  const [current] = await db.select().from(prospectJobs).where(eq(prospectJobs.id, id)).limit(1);
  if (!current) return null;
  const mayRetry = input.retryable && current.attemptCount <= input.maxRetries;
  const [row] = await db
    .update(prospectJobs)
    .set({
      status: mayRetry ? "failed_retryable" : "failed_terminal",
      lastErrorCategory: input.category,
      lastErrorMessage: input.message.slice(0, 2000),
      leaseOwner: null,
      leaseExpiresAt: null,
      availableAt: mayRetry ? new Date(Date.now() + Math.min(30_000, current.attemptCount * 500)) : current.availableAt,
      updatedAt: new Date(),
    })
    .where(eq(prospectJobs.id, id))
    .returning();
  return row ?? null;
}

export async function recoverExpiredProspectLeases(now = new Date()) {
  const { db } = getDb();
  const rows = await db
    .update(prospectJobs)
    .set({
      status: "failed_retryable",
      leaseOwner: null,
      leaseExpiresAt: null,
      claimedAt: null,
      lastErrorCategory: "lease_expired",
      lastErrorMessage: "Prospect job lease expired",
      availableAt: now,
      updatedAt: now,
    })
    .where(and(eq(prospectJobs.status, "running"), sql`${prospectJobs.leaseExpiresAt} <= ${now.toISOString()}::timestamptz`))
    .returning({ id: prospectJobs.id });
  return rows.length;
}

export { fingerprintForDraft, contentFingerprintForDossier };
