import { and, desc, eq, inArray } from "drizzle-orm";
import { runConfigurationSchema, type RunConfiguration, type ReviewDecisionValue } from "@/src/domain/types";
import { stageSequence, type RunStage } from "@/src/domain/state-machine";
import { getDb } from "@/src/infrastructure/db/client";
import { scoutRuns, workItems } from "@/src/infrastructure/db/schema";
import { cancelPendingWork, enqueueWork } from "@/src/infrastructure/queue/postgres-queue";
import {
  createScoutRunRecord,
  getCompany,
  getLatestDossier,
  getOpportunityDetail,
  getRun,
  listCompanyRows,
  listOpportunityDetails,
  listReviewHistory,
  listRunCompanyIds,
  listRuns,
  recordReviewDecision,
  resolveManualCompany,
} from "@/src/infrastructure/db/repositories";
import { defaultRunConfiguration } from "@/src/application/configuration";
import { importProductHuntSeeds } from "@/src/modules/product-hunt-seeds";

export async function createScoutRun(
  configuration: RunConfiguration = defaultRunConfiguration(),
  seeds: string[] = [],
  options: { scheduleOccurrenceId?: string } = {},
) {
  const parsed = runConfigurationSchema.parse(configuration);
  const run = await createScoutRunRecord(parsed, options.scheduleOccurrenceId);
  for (const seed of seeds) await resolveManualCompany(seed, run.id);
  return run;
}

export async function addCompanySeed(urlOrSeed: string, runId?: string) {
  if (runId && !(await getRun(runId))) throw new Error("ScoutRun not found");
  return resolveManualCompany(urlOrSeed, runId);
}

export async function importCompanyCsv(csvText: string, runId?: string) {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = lines[0]?.toLowerCase() ?? "";
  const body = first.includes("url") || first.includes("domain") ? lines.slice(1) : lines;
  const seeds = body.map((line) => line.split(",")[0]?.trim()).filter((value): value is string => Boolean(value));
  const results = [];
  for (const seed of seeds) results.push(await addCompanySeed(seed, runId));
  return results;
}

export async function importBerlinProductHuntSeeds(csvText: string, runId: string) {
  if (!(await getRun(runId))) throw new Error("ScoutRun not found");
  return importProductHuntSeeds(csvText, runId);
}

export async function startScoutRun(runId: string) {
  const run = await getRun(runId);
  if (!run) throw new Error("ScoutRun not found");
  if (["running", "queued", "partially_succeeded", "succeeded", "cancelled"].includes(run.status)) return run;
  const companyIds = await listRunCompanyIds(runId);
  if (!companyIds.length) throw new Error("ScoutRun requires at least one company seed");
  const { db } = getDb();
  await db.update(scoutRuns).set({ status: "running", currentStage: "DISCOVERING", startedAt: new Date(), updatedAt: new Date() }).where(eq(scoutRuns.id, runId));
  for (const companyId of companyIds) await enqueueWork({ scoutRunId: runId, companyId, stage: "identity", payload: { companyId } });
  await advanceRunStage(runId, "RESOLVING");
  return getRun(runId);
}

export async function cancelScoutRun(runId: string) {
  const { db } = getDb();
  await cancelPendingWork(runId);
  const [run] = await db.update(scoutRuns).set({ status: "cancelled", finishedAt: new Date(), updatedAt: new Date() }).where(eq(scoutRuns.id, runId)).returning();
  if (!run) throw new Error("ScoutRun not found");
  return run;
}

export async function advanceRunStage(runId: string, target: RunStage) {
  const run = await getRun(runId);
  if (!run) throw new Error("ScoutRun not found");
  const currentIndex = stageSequence.indexOf(run.currentStage as RunStage);
  const targetIndex = stageSequence.indexOf(target);
  if (targetIndex < 0) throw new Error(`Unknown target stage: ${target}`);
  if (targetIndex <= currentIndex) return run;
  const { db } = getDb();
  const [updated] = await db.update(scoutRuns).set({ currentStage: target, updatedAt: new Date() }).where(eq(scoutRuns.id, runId)).returning();
  return updated;
}

export async function reconcileRun(runId: string) {
  const { db } = getDb();
  const run = await getRun(runId);
  if (!run || run.status === "cancelled") return run;
  const unfinished = await db.select({ id: workItems.id }).from(workItems).where(and(
    eq(workItems.scoutRunId, runId),
    inArray(workItems.status, ["pending", "running", "failed_retryable"]),
  )).limit(1);
  if (unfinished.length) return run;
  const terminalFailures = await db.select({ id: workItems.id }).from(workItems).where(and(
    eq(workItems.scoutRunId, runId), eq(workItems.status, "failed_terminal"),
  ));
  await advanceRunStage(runId, "READY_FOR_REVIEW");
  const [updated] = await db.update(scoutRuns).set({
    status: terminalFailures.length ? "partially_succeeded" : "succeeded",
    currentStage: "READY_FOR_REVIEW",
    finishedAt: new Date(),
    degradationWarnings: terminalFailures.length ? [`${terminalFailures.length} work item(s) failed terminally`] : [],
    updatedAt: new Date(),
  }).where(eq(scoutRuns.id, runId)).returning();
  return updated;
}

export async function getScoutRun(runId: string) {
  const run = await getRun(runId);
  if (!run) return null;
  const { db } = getDb();
  const work = await db.select().from(workItems).where(eq(workItems.scoutRunId, runId)).orderBy(desc(workItems.createdAt));
  const companies = await listRunCompanyIds(runId);
  return { ...run, workItems: work, companyIds: companies };
}

export const listScoutRuns = listRuns;
export const listCompanies = listCompanyRows;
export const getCompanyDetail = getCompany;
export const getResearchDossier = getLatestDossier;
export const listOpportunities = listOpportunityDetails;
export const getOpportunity = getOpportunityDetail;
export const listReviews = listReviewHistory;

export async function reviewTarget(targetId: string, decision: ReviewDecisionValue, reasons: string[] = [], note?: string, targetType: "automation_opportunity" | "company" | "claim" | "workflow_hypothesis" = "automation_opportunity") {
  return recordReviewDecision({ targetId, targetType, decision, reasonLabels: reasons, note });
}
