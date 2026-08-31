import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  AutomationOpportunityInput,
  QualityGateResult,
  ReviewDecisionValue,
  RunConfiguration,
  WorkflowHypothesisInput,
} from "@/src/domain/types";
import { normalizeDomain, displayNameFromDomain, normalizeAlias } from "@/src/domain/identity";
import { getDb } from "@/src/infrastructure/db/client";
import {
  automationOpportunities,
  budgetLedger,
  claimEvidence,
  claims,
  companies,
  companyAliases,
  discoveryRecords,
  dossierClaims,
  dossierSignals,
  dossierSourceDocuments,
  eligibilityDecisions,
  evidenceItems,
  providerDiagnostics,
  qualityGateResults,
  recentSignals,
  researchDossiers,
  reviewDecisions,
  scheduleOccurrences,
  scorecards,
  scoutRuns,
  settings,
  sourceDocuments,
  workflowHypotheses,
  workItems,
} from "@/src/infrastructure/db/schema";

export async function createScoutRunRecord(configuration: RunConfiguration, scheduleOccurrenceId?: string) {
  const { db } = getDb();
  const budget = configuration.budget;
  const [run] = await db.insert(scoutRuns).values({
    configuration,
    maxEur: budget.maxEur.toFixed(4),
    maxSearchRequests: budget.maxSearchRequests,
    maxModelSpendEur: budget.maxModelSpendEur.toFixed(4),
    maxDeepCompanies: budget.maxDeepCompanies,
    maxRuntimeSeconds: budget.maxRuntimeSeconds,
    maxRetriesPerWorkItem: budget.maxRetriesPerWorkItem,
    scheduleOccurrenceId,
  }).returning();
  if (!run) throw new Error("Failed to create ScoutRun");
  return run;
}

export async function resolveCompanySeed(input: {
  urlOrDomain: string;
  scoutRunId?: string;
  sourceType?: string;
  sourceUrl?: string;
  externalIdentifier?: string;
  rawName?: string;
  metadata?: Record<string, unknown>;
}) {
  const urlOrDomain = input.urlOrDomain;
  const domain = normalizeDomain(urlOrDomain);
  const normalizedAlias = normalizeAlias(domain);
  const { db } = getDb();
  return db.transaction(async (tx) => {
    let created = false;
    let [company] = await tx.select().from(companies).where(eq(companies.canonicalDomain, domain)).limit(1);
    if (!company) {
      [company] = await tx.insert(companies).values({
        canonicalName: input.rawName?.trim() || displayNameFromDomain(domain),
        canonicalDomain: domain,
        normalizedLocation: typeof input.metadata?.location === "string" ? input.metadata.location : null,
      }).returning();
      if (!company) throw new Error("Failed to create Company");
      created = true;
      await tx.insert(companyAliases).values({
        companyId: company.id,
        aliasType: "domain",
        normalizedValue: normalizedAlias,
        sourceNamespace: "manual",
        provenance: { input: urlOrDomain },
      }).onConflictDoNothing();
    }

    const [record] = await tx.insert(discoveryRecords).values({
      scoutRunId: input.scoutRunId,
      companyId: company.id,
        sourceType: input.sourceType ?? "manual_url",
        sourceUrl: input.sourceUrl ?? (/^[a-z][a-z\d+.-]*:\/\//i.test(urlOrDomain) ? urlOrDomain : `https://${domain}`),
        externalIdentifier: input.externalIdentifier,
        rawName: input.rawName?.trim() || company.canonicalName,
        rawDomain: domain,
      metadata: { canonicalDomain: domain, ...(input.metadata ?? {}) },
    }).returning();
    if (!record) throw new Error("Failed to create DiscoveryRecord");
    return { company, discoveryRecord: record, created };
  });
}

export async function resolveManualCompany(urlOrDomain: string, scoutRunId?: string) {
  return resolveCompanySeed({ urlOrDomain, scoutRunId });
}

export async function listDiscoveryRecordsForCompany(companyId: string, scoutRunId?: string) {
  const { db } = getDb();
  const conditions = [eq(discoveryRecords.companyId, companyId)];
  if (scoutRunId) conditions.push(eq(discoveryRecords.scoutRunId, scoutRunId));
  return db.select().from(discoveryRecords).where(and(...conditions)).orderBy(desc(discoveryRecords.discoveredAt));
}

export async function listRunCompanyIds(runId: string): Promise<string[]> {
  const { db } = getDb();
  const rows = await db.selectDistinct({ companyId: discoveryRecords.companyId })
    .from(discoveryRecords)
    .where(and(eq(discoveryRecords.scoutRunId, runId), sql`${discoveryRecords.companyId} is not null`));
  return rows.flatMap((row) => row.companyId ? [row.companyId] : []);
}

export async function getRun(runId: string) {
  const { db } = getDb();
  const [run] = await db.select().from(scoutRuns).where(eq(scoutRuns.id, runId)).limit(1);
  return run ?? null;
}

export async function listRuns() {
  const { db } = getDb();
  return db.select().from(scoutRuns).orderBy(desc(scoutRuns.createdAt));
}

export async function listEligibilityDecisions() {
  const { db } = getDb();
  return db.select().from(eligibilityDecisions).orderBy(desc(eligibilityDecisions.decidedAt));
}

export async function listCompanyRows() {
  const { db } = getDb();
  return db.select().from(companies).orderBy(desc(companies.updatedAt));
}

export async function getCompany(companyId: string) {
  const { db } = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return null;
  const aliases = await db.select().from(companyAliases).where(eq(companyAliases.companyId, companyId)).orderBy(asc(companyAliases.createdAt));
  const discoveries = await db.select().from(discoveryRecords).where(eq(discoveryRecords.companyId, companyId)).orderBy(desc(discoveryRecords.discoveredAt));
  return { ...company, aliases, discoveries };
}

export async function updateCompanyResearchMetadata(companyId: string, input: { normalizedLocation?: string | null }) {
  const { db } = getDb();
  const [row] = await db.update(companies).set({
    normalizedLocation: input.normalizedLocation,
    lastResearchedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(companies.id, companyId)).returning();
  return row ?? null;
}

export async function saveEligibilityDecision(runId: string, decision: {
  companyId: string;
  eligible: boolean;
  reasonCodes: string[];
  supportingClaimIds: string[];
  unresolvedChecks: string[];
  policyVersion: string;
}) {
  const { db } = getDb();
  const [row] = await db.insert(eligibilityDecisions).values({
    scoutRunId: runId,
    companyId: decision.companyId,
    eligible: decision.eligible,
    reasonCodes: decision.reasonCodes,
    supportingClaimIds: decision.supportingClaimIds,
    unresolvedChecks: decision.unresolvedChecks,
    policyVersion: decision.policyVersion,
  }).onConflictDoUpdate({
    target: [eligibilityDecisions.companyId, eligibilityDecisions.scoutRunId],
    set: {
      eligible: decision.eligible,
      reasonCodes: decision.reasonCodes,
      supportingClaimIds: decision.supportingClaimIds,
      unresolvedChecks: decision.unresolvedChecks,
      policyVersion: decision.policyVersion,
      decidedAt: new Date(),
    },
  }).returning();
  return row;
}

export async function persistSourceDocument(input: {
  companyId: string;
  canonicalUrl: string;
  sourceTier: "tier_1" | "tier_2" | "tier_3";
  title?: string;
  fetchedAt: Date;
  contentFingerprint: string;
  retrievalStatus: "retrieved" | "unavailable" | "blocked" | "failed";
  extractedText?: string;
  byteLength: number;
  permittedAccessMetadata?: Record<string, unknown>;
}) {
  const { db } = getDb();
  return db.transaction(async (tx) => {
    const lockKey = `${input.companyId}|${input.canonicalUrl}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

    const [existing] = await tx.select().from(sourceDocuments).where(and(
      eq(sourceDocuments.companyId, input.companyId),
      eq(sourceDocuments.canonicalUrl, input.canonicalUrl),
      eq(sourceDocuments.contentFingerprint, input.contentFingerprint),
    )).limit(1);
    if (existing) return { document: existing, reused: true };

    const [latest] = await tx.select({ version: sourceDocuments.version }).from(sourceDocuments)
      .where(and(eq(sourceDocuments.companyId, input.companyId), eq(sourceDocuments.canonicalUrl, input.canonicalUrl)))
      .orderBy(desc(sourceDocuments.version)).limit(1);
    const [document] = await tx.insert(sourceDocuments).values({
      ...input,
      version: (latest?.version ?? 0) + 1,
    }).returning();
    if (!document) throw new Error("Failed to persist SourceDocument");
    return { document, reused: false };
  });
}

export async function listSourceDocumentsForCompany(companyId: string) {
  const { db } = getDb();
  return db.select().from(sourceDocuments)
    .where(eq(sourceDocuments.companyId, companyId))
    .orderBy(desc(sourceDocuments.fetchedAt), desc(sourceDocuments.version));
}

export async function getSourceDocumentsByIds(ids: string[]) {
  if (!ids.length) return [];
  const { db } = getDb();
  return db.select().from(sourceDocuments).where(inArray(sourceDocuments.id, [...new Set(ids)]));
}

export async function persistEvidenceItem(input: {
  sourceDocumentId: string;
  evidenceType: string;
  normalizedContent: string;
  sourceLocator: string;
  extractionMethod: string;
}) {
  const { db } = getDb();
  const values = {
    ...input,
    normalizedContent: input.normalizedContent.trim(),
    sourceLocator: input.sourceLocator.trim(),
  };
  const [created] = await db.insert(evidenceItems).values(values)
    .onConflictDoNothing({
      target: [evidenceItems.sourceDocumentId, evidenceItems.normalizedContent, evidenceItems.sourceLocator],
    })
    .returning();
  if (created) return { evidenceItem: created, reused: false };
  const [existing] = await db.select().from(evidenceItems).where(and(
    eq(evidenceItems.sourceDocumentId, values.sourceDocumentId),
    eq(evidenceItems.normalizedContent, values.normalizedContent),
    eq(evidenceItems.sourceLocator, values.sourceLocator),
  )).limit(1);
  if (!existing) throw new Error("Failed to persist EvidenceItem");
  return { evidenceItem: existing, reused: true };
}

export async function listEvidenceForCompany(companyId: string) {
  const { db } = getDb();
  return db.select({ evidence: evidenceItems, source: sourceDocuments })
    .from(evidenceItems)
    .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
    .where(eq(sourceDocuments.companyId, companyId))
    .orderBy(asc(evidenceItems.extractedAt));
}

export async function persistClaimWithEvidence(input: {
  companyId: string;
  subject: string;
  claimText: string;
  claimType: "verified" | "inferred" | "estimated" | "unknown";
  confidence: "high" | "medium" | "low";
  evidenceItemIds: string[];
  reasoningSummary?: string | null;
  alternativeExplanation?: string | null;
  confirmationQuestion?: string | null;
  contradictionStatus?: string;
}) {
  const uniqueEvidenceIds = [...new Set(input.evidenceItemIds)];
  if (input.claimType === "verified" && uniqueEvidenceIds.length === 0) {
    throw new Error("verified_claim_requires_evidence");
  }
  if (input.claimType === "inferred" && !input.reasoningSummary) {
    throw new Error("inferred_claim_requires_reasoning");
  }
  const { db } = getDb();
  return db.transaction(async (tx) => {
    if (uniqueEvidenceIds.length) {
      const rows = await tx.select({ id: evidenceItems.id, companyId: sourceDocuments.companyId })
        .from(evidenceItems)
        .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
        .where(inArray(evidenceItems.id, uniqueEvidenceIds));
      if (rows.length !== uniqueEvidenceIds.length || rows.some((row) => row.companyId !== input.companyId)) {
        throw new Error("claim_evidence_mismatch");
      }
    }
    const values = {
      companyId: input.companyId,
      subject: input.subject,
      claimText: input.claimText,
      claimType: input.claimType,
      confidence: input.confidence,
      reasoningSummary: input.reasoningSummary,
      alternativeExplanation: input.alternativeExplanation,
      confirmationQuestion: input.confirmationQuestion,
      contradictionStatus: input.contradictionStatus ?? "none",
    };
    const [created] = await tx.insert(claims).values(values)
      .onConflictDoNothing({ target: [claims.companyId, claims.subject, claims.claimText, claims.claimType] })
      .returning();
    const [claim] = created
      ? [created]
      : await tx.select().from(claims).where(and(
        eq(claims.companyId, input.companyId),
        eq(claims.subject, input.subject),
        eq(claims.claimText, input.claimText),
        eq(claims.claimType, input.claimType),
      )).limit(1);
    if (!claim) throw new Error("Failed to persist Claim");
    if (uniqueEvidenceIds.length) {
      await tx.insert(claimEvidence).values(uniqueEvidenceIds.map((evidenceItemId) => ({
        claimId: claim.id,
        evidenceItemId,
        relation: input.claimType === "verified" ? "supports" as const : "motivates" as const,
      }))).onConflictDoNothing();
    }
    return claim;
  });
}

export async function listClaimsForCompany(companyId: string) {
  const { db } = getDb();
  const rows = await db.select({ claim: claims }).from(claims)
    .where(eq(claims.companyId, companyId))
    .orderBy(asc(claims.createdAt));
  return rows.map((row) => row.claim);
}

export async function getClaimEvidenceLinks(claimIds: string[]) {
  if (!claimIds.length) return [];
  const { db } = getDb();
  return db.select({ link: claimEvidence, evidence: evidenceItems, source: sourceDocuments })
    .from(claimEvidence)
    .innerJoin(evidenceItems, eq(claimEvidence.evidenceItemId, evidenceItems.id))
    .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
    .where(inArray(claimEvidence.claimId, [...new Set(claimIds)]));
}

export async function markVerifiedContradictions(companyId: string, subject: string): Promise<string[]> {
  const { db } = getDb();
  return db.transaction(async (tx) => {
    const subjectClaims = await tx.select().from(claims).where(and(
      eq(claims.companyId, companyId),
      eq(claims.subject, subject),
      eq(claims.claimType, "verified"),
    ));
    const uniqueTexts = new Set(subjectClaims.map((claim) => claim.claimText.trim().toLowerCase()));
    if (subjectClaims.length < 2 || uniqueTexts.size < 2) return [];
    const ids = subjectClaims.map((claim) => claim.id);
    await tx.update(claims).set({ contradictionStatus: "disputed" }).where(inArray(claims.id, ids));
    const supporting = await tx.select().from(claimEvidence).where(and(
      inArray(claimEvidence.claimId, ids),
      eq(claimEvidence.relation, "supports"),
    ));
    const links: Array<{ claimId: string; evidenceItemId: string; relation: "contradicts" }> = [];
    for (const claim of subjectClaims) {
      for (const link of supporting) {
        if (link.claimId !== claim.id) links.push({ claimId: claim.id, evidenceItemId: link.evidenceItemId, relation: "contradicts" });
      }
    }
    if (links.length) await tx.insert(claimEvidence).values(links).onConflictDoNothing();
    return ids;
  });
}

export async function persistRecentSignal(input: {
  companyId: string;
  signalType: string;
  label: string;
  occurredAt?: Date | null;
  claimId?: string | null;
  evidenceItemId?: string | null;
}) {
  const { db } = getDb();
  const [created] = await db.insert(recentSignals).values(input)
    .onConflictDoNothing({ target: [recentSignals.companyId, recentSignals.signalType, recentSignals.label] })
    .returning();
  if (created) return { signal: created, reused: false };
  const [existing] = await db.select().from(recentSignals).where(and(
    eq(recentSignals.companyId, input.companyId),
    eq(recentSignals.signalType, input.signalType),
    eq(recentSignals.label, input.label),
  )).limit(1);
  if (!existing) throw new Error("Failed to persist RecentSignal");
  return { signal: existing, reused: true };
}

export async function persistResearchDossier(input: {
  companyId: string;
  scoutRunId: string;
  sourceDocumentIds: string[];
  claimIds: string[];
  recentSignalIds: string[];
  knownUnknowns: string[];
  sourceCoverageSummary: Record<string, unknown>;
  researchCompleteness: number;
  researchCostEur?: number;
  conclusion: string;
}) {
  const sourceIds = [...new Set(input.sourceDocumentIds)].sort();
  const claimIds = [...new Set(input.claimIds)].sort();
  const signalIds = [...new Set(input.recentSignalIds)].sort();
  const { db } = getDb();
  const latest = await getLatestDossier(input.companyId, input.scoutRunId);
  const same = latest
    && JSON.stringify(latest.sources.map((row) => row.id).sort()) === JSON.stringify(sourceIds)
    && JSON.stringify(latest.claims.map((row) => row.id).sort()) === JSON.stringify(claimIds)
    && JSON.stringify(latest.signals.map((row) => row.id).sort()) === JSON.stringify(signalIds)
    && JSON.stringify(latest.knownUnknowns) === JSON.stringify(input.knownUnknowns)
    && latest.conclusion === input.conclusion
    && Number(latest.researchCompleteness) === input.researchCompleteness;
  if (same) return { dossier: latest, reused: true };

  const createdDossier = await db.transaction(async (tx) => {
    if (sourceIds.length) {
      const rows = await tx.select({ id: sourceDocuments.id }).from(sourceDocuments)
        .where(and(eq(sourceDocuments.companyId, input.companyId), inArray(sourceDocuments.id, sourceIds)));
      if (rows.length !== sourceIds.length) throw new Error("dossier_source_company_mismatch");
    }
    if (claimIds.length) {
      const rows = await tx.select({ id: claims.id }).from(claims)
        .where(and(eq(claims.companyId, input.companyId), inArray(claims.id, claimIds)));
      if (rows.length !== claimIds.length) throw new Error("dossier_claim_company_mismatch");
    }
    const [latestVersion] = await tx.select({ version: researchDossiers.version }).from(researchDossiers)
      .where(and(eq(researchDossiers.companyId, input.companyId), eq(researchDossiers.scoutRunId, input.scoutRunId)))
      .orderBy(desc(researchDossiers.version)).limit(1);
    const [dossier] = await tx.insert(researchDossiers).values({
      companyId: input.companyId,
      scoutRunId: input.scoutRunId,
      version: (latestVersion?.version ?? 0) + 1,
      knownUnknowns: input.knownUnknowns,
      sourceCoverageSummary: input.sourceCoverageSummary,
      researchCompleteness: input.researchCompleteness.toFixed(4),
      researchCostEur: (input.researchCostEur ?? 0).toFixed(4),
      conclusion: input.conclusion,
    }).returning();
    if (!dossier) throw new Error("Failed to persist ResearchDossier");
    if (sourceIds.length) await tx.insert(dossierSourceDocuments).values(sourceIds.map((sourceDocumentId) => ({ dossierId: dossier.id, sourceDocumentId })));
    if (claimIds.length) await tx.insert(dossierClaims).values(claimIds.map((claimId) => ({ dossierId: dossier.id, claimId })));
    if (signalIds.length) await tx.insert(dossierSignals).values(signalIds.map((recentSignalId) => ({ dossierId: dossier.id, recentSignalId })));
    return dossier;
  });
  return { dossier: await hydrateDossier(createdDossier), reused: false };
}

export async function persistWorkflowHypothesis(input: {
  companyId: string;
  researchDossierId: string;
  hypothesis: WorkflowHypothesisInput;
}) {
  const dossier = await getDossierById(input.researchDossierId);
  if (!dossier || dossier.companyId !== input.companyId) throw new Error("workflow_dossier_company_mismatch");
  const allowedClaimIds = new Set(dossier.claims.map((claim) => claim.id));
  const allowedEvidenceIds = new Set(dossier.evidenceLinks.map((row) => row.evidence.id));
  if (input.hypothesis.claimIds.some((id) => !allowedClaimIds.has(id))) throw new Error("workflow_claim_outside_dossier");
  if (input.hypothesis.evidenceItemIds.some((id) => !allowedEvidenceIds.has(id))) throw new Error("workflow_evidence_outside_dossier");
  const { db } = getDb();
  const [created] = await db.insert(workflowHypotheses).values({
    companyId: input.companyId,
    researchDossierId: input.researchDossierId,
    ...input.hypothesis,
  }).onConflictDoNothing({ target: workflowHypotheses.researchDossierId }).returning();
  if (created) return { hypothesis: created, reused: false };
  const [existing] = await db.select().from(workflowHypotheses)
    .where(eq(workflowHypotheses.researchDossierId, input.researchDossierId)).limit(1);
  if (!existing) throw new Error("Failed to persist WorkflowHypothesis");
  return { hypothesis: existing, reused: true };
}

export async function getWorkflowHypothesis(id: string) {
  const { db } = getDb();
  const [row] = await db.select().from(workflowHypotheses).where(eq(workflowHypotheses.id, id)).limit(1);
  return row ?? null;
}

export async function persistAutomationOpportunity(workflowHypothesisId: string, opportunity: AutomationOpportunityInput) {
  const { db } = getDb();
  const [created] = await db.insert(automationOpportunities).values({ workflowHypothesisId, ...opportunity })
    .onConflictDoNothing({ target: automationOpportunities.workflowHypothesisId }).returning();
  if (created) return { opportunity: created, reused: false };
  const [existing] = await db.select().from(automationOpportunities)
    .where(eq(automationOpportunities.workflowHypothesisId, workflowHypothesisId)).limit(1);
  if (!existing) throw new Error("Failed to persist AutomationOpportunity");
  return { opportunity: existing, reused: true };
}

export async function getAutomationOpportunity(id: string) {
  const { db } = getDb();
  const [row] = await db.select().from(automationOpportunities).where(eq(automationOpportunities.id, id)).limit(1);
  return row ?? null;
}

export async function persistQualityGateResult(opportunityId: string, result: QualityGateResult) {
  const { db } = getDb();
  const [row] = await db.insert(qualityGateResults).values({ opportunityId, ...result })
    .onConflictDoUpdate({
      target: qualityGateResults.opportunityId,
      set: {
        passed: result.passed,
        failureCodes: result.failureCodes,
        warningCodes: result.warningCodes,
        checkedEvidenceItemIds: result.checkedEvidenceItemIds,
        policyVersion: result.policyVersion,
        checkedAt: new Date(),
      },
    }).returning();
  if (!row) throw new Error("Failed to persist QualityGateResult");
  return row;
}

export async function persistScorecard(input: {
  targetType: "company" | "automation_opportunity";
  targetId: string;
  rubricVersion: string;
  dimensionValues: Record<string, number>;
  dimensionRationales: Record<string, string>;
  evidenceItemIds: string[];
  totalScore: number;
  gatingFailures: string[];
}) {
  const { db } = getDb();
  const [row] = await db.insert(scorecards).values({
    ...input,
    totalScore: input.totalScore.toFixed(3),
  }).onConflictDoUpdate({
    target: [scorecards.targetType, scorecards.targetId, scorecards.rubricVersion],
    set: {
      dimensionValues: input.dimensionValues,
      dimensionRationales: input.dimensionRationales,
      evidenceItemIds: [...new Set(input.evidenceItemIds)],
      totalScore: input.totalScore.toFixed(3),
      gatingFailures: input.gatingFailures,
      scoredAt: new Date(),
    },
  }).returning();
  if (!row) throw new Error("Failed to persist Scorecard");
  return row;
}

export async function listProviderDiagnostics(runId?: string) {
  const { db } = getDb();
  return runId
    ? db.select().from(providerDiagnostics).where(eq(providerDiagnostics.scoutRunId, runId)).orderBy(desc(providerDiagnostics.createdAt))
    : db.select().from(providerDiagnostics).orderBy(desc(providerDiagnostics.createdAt));
}

export async function getSetting(key: string) {
  const { db } = getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row ?? null;
}

export async function setSetting(key: string, value: Record<string, unknown>) {
  const { db } = getDb();
  const [row] = await db.insert(settings).values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
    .returning();
  if (!row) throw new Error("Failed to persist setting");
  return row;
}

export async function createScheduleOccurrence(input: { scheduleId: string; scheduledForUtc: Date }) {
  const { db } = getDb();
  const [created] = await db.insert(scheduleOccurrences).values(input)
    .onConflictDoNothing({ target: [scheduleOccurrences.scheduleId, scheduleOccurrences.scheduledForUtc] })
    .returning();
  if (created) return { occurrence: created, created: true };
  const [existing] = await db.select().from(scheduleOccurrences).where(and(
    eq(scheduleOccurrences.scheduleId, input.scheduleId),
    eq(scheduleOccurrences.scheduledForUtc, input.scheduledForUtc),
  )).limit(1);
  if (!existing) throw new Error("Failed to resolve schedule occurrence");
  return { occurrence: existing, created: false };
}

export async function linkScheduleOccurrenceToRun(occurrenceId: string, runId: string, outcome = "started") {
  const { db } = getDb();
  const [row] = await db.update(scheduleOccurrences).set({ scoutRunId: runId, outcome })
    .where(eq(scheduleOccurrences.id, occurrenceId)).returning();
  return row ?? null;
}

export async function updateScheduleOccurrenceOutcome(occurrenceId: string, outcome: string) {
  const { db } = getDb();
  const [row] = await db.update(scheduleOccurrences).set({ outcome })
    .where(eq(scheduleOccurrences.id, occurrenceId)).returning();
  return row ?? null;
}

export async function listScheduleOccurrences(scheduleId?: string) {
  const { db } = getDb();
  return scheduleId
    ? db.select().from(scheduleOccurrences).where(eq(scheduleOccurrences.scheduleId, scheduleId)).orderBy(desc(scheduleOccurrences.scheduledForUtc))
    : db.select().from(scheduleOccurrences).orderBy(desc(scheduleOccurrences.scheduledForUtc));
}

export async function recordReviewDecision(input: {
  targetType: "company" | "claim" | "workflow_hypothesis" | "automation_opportunity";
  targetId: string;
  decision: ReviewDecisionValue;
  reasonLabels?: string[];
  note?: string;
}) {
  const { db } = getDb();
  const [row] = await db.insert(reviewDecisions).values({
    targetType: input.targetType,
    targetId: input.targetId,
    decision: input.decision,
    reasonLabels: input.reasonLabels ?? [],
    note: input.note,
  }).returning();
  if (!row) throw new Error("Failed to persist ReviewDecision");
  return row;
}

export async function listReviewHistory(targetId?: string) {
  const { db } = getDb();
  const query = db.select().from(reviewDecisions);
  return targetId
    ? query.where(eq(reviewDecisions.targetId, targetId)).orderBy(desc(reviewDecisions.createdAt))
    : query.orderBy(desc(reviewDecisions.createdAt));
}

async function hydrateDossier(dossier: typeof researchDossiers.$inferSelect) {
  const { db } = getDb();
  if (!dossier) return null;
  const sourceRows = await db.select({ source: sourceDocuments })
    .from(dossierSourceDocuments)
    .innerJoin(sourceDocuments, eq(dossierSourceDocuments.sourceDocumentId, sourceDocuments.id))
    .where(eq(dossierSourceDocuments.dossierId, dossier.id));
  const claimRows = await db.select({ claim: claims })
    .from(dossierClaims)
    .innerJoin(claims, eq(dossierClaims.claimId, claims.id))
    .where(eq(dossierClaims.dossierId, dossier.id));
  const signalRows = await db.select({ signal: recentSignals })
    .from(dossierSignals)
    .innerJoin(recentSignals, eq(dossierSignals.recentSignalId, recentSignals.id))
    .where(eq(dossierSignals.dossierId, dossier.id));
  const claimIds = claimRows.map((row) => row.claim.id);
  const evidenceLinks = claimIds.length
    ? await db.select({ link: claimEvidence, evidence: evidenceItems, source: sourceDocuments })
      .from(claimEvidence)
      .innerJoin(evidenceItems, eq(claimEvidence.evidenceItemId, evidenceItems.id))
      .innerJoin(sourceDocuments, eq(evidenceItems.sourceDocumentId, sourceDocuments.id))
      .where(inArray(claimEvidence.claimId, claimIds))
    : [];
  return {
    ...dossier,
    sources: sourceRows.map((row) => row.source),
    claims: claimRows.map((row) => row.claim),
    signals: signalRows.map((row) => row.signal),
    evidenceLinks,
  };
}

export async function getDossierById(dossierId: string) {
  const { db } = getDb();
  const [dossier] = await db.select().from(researchDossiers).where(eq(researchDossiers.id, dossierId)).limit(1);
  return dossier ? hydrateDossier(dossier) : null;
}

export async function getLatestDossier(companyId: string, runId?: string) {
  const { db } = getDb();
  const conditions = [eq(researchDossiers.companyId, companyId)];
  if (runId) conditions.push(eq(researchDossiers.scoutRunId, runId));
  const [dossier] = await db.select().from(researchDossiers).where(and(...conditions)).orderBy(desc(researchDossiers.generatedAt), desc(researchDossiers.version)).limit(1);
  return dossier ? hydrateDossier(dossier) : null;
}

export async function listOpportunityDetails() {
  const { db } = getDb();
  return db.select({
    opportunity: automationOpportunities,
    hypothesis: workflowHypotheses,
    gate: qualityGateResults,
    scorecard: scorecards,
    company: companies,
  }).from(automationOpportunities)
    .innerJoin(workflowHypotheses, eq(automationOpportunities.workflowHypothesisId, workflowHypotheses.id))
    .innerJoin(companies, eq(workflowHypotheses.companyId, companies.id))
    .leftJoin(qualityGateResults, eq(qualityGateResults.opportunityId, automationOpportunities.id))
    .leftJoin(scorecards, and(eq(scorecards.targetType, "automation_opportunity"), eq(scorecards.targetId, automationOpportunities.id)))
    .orderBy(desc(scorecards.totalScore), desc(automationOpportunities.createdAt));
}

export async function getOpportunityDetail(opportunityId: string) {
  const { db } = getDb();
  const [row] = await db.select({
    opportunity: automationOpportunities,
    hypothesis: workflowHypotheses,
    gate: qualityGateResults,
    scorecard: scorecards,
    company: companies,
  }).from(automationOpportunities)
    .innerJoin(workflowHypotheses, eq(automationOpportunities.workflowHypothesisId, workflowHypotheses.id))
    .innerJoin(companies, eq(workflowHypotheses.companyId, companies.id))
    .leftJoin(qualityGateResults, eq(qualityGateResults.opportunityId, automationOpportunities.id))
    .leftJoin(scorecards, and(eq(scorecards.targetType, "automation_opportunity"), eq(scorecards.targetId, automationOpportunities.id)))
    .where(eq(automationOpportunities.id, opportunityId)).limit(1);
  if (!row) return null;
  const dossier = await getDossierById(row.hypothesis.researchDossierId);
  const reviews = await listReviewHistory(opportunityId);
  return { ...row, dossier, reviews };
}

export async function saveProviderDiagnostic(input: {
  scoutRunId?: string;
  companyId?: string;
  workItemId?: string;
  providerId: string;
  operation: string;
  ok: boolean;
  category?: string;
  retryable?: boolean;
  latencyMs?: number;
  requestCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  costEur?: number;
  metadata?: Record<string, unknown>;
}) {
  const { db } = getDb();
  await db.insert(providerDiagnostics).values({
    ...input,
    costEur: input.costEur == null ? undefined : input.costEur.toFixed(4),
  });
}

export {
  automationOpportunities,
  budgetLedger,
  claimEvidence,
  claims,
  companies,
  discoveryRecords,
  dossierClaims,
  dossierSignals,
  dossierSourceDocuments,
  eligibilityDecisions,
  evidenceItems,
  qualityGateResults,
  recentSignals,
  researchDossiers,
  scheduleOccurrences,
  scorecards,
  scoutRuns,
  settings,
  sourceDocuments,
  workflowHypotheses,
  workItems,
};
