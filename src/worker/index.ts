import { randomUUID } from "node:crypto";
import { processWorkItem, StageProcessingError } from "@/src/application/orchestration";
import { reconcileRun } from "@/src/application/scout-service";
import { executeAngleGeneration, executeDraftGeneration, executePeopleResearch, exportProspectBundle } from "@/src/application/prospect-service";
import { runConfigurationSchema } from "@/src/domain/types";
import { getEnv } from "@/src/infrastructure/config/env";
import { closeDb } from "@/src/infrastructure/db/client";
import { getRun } from "@/src/infrastructure/db/repositories";
import { claimProspectJobs, completeProspectJob, failProspectJob, recoverExpiredProspectLeases } from "@/src/infrastructure/db/repositories-prospect";
import { workLogger } from "@/src/infrastructure/observability/logger";
import { claimWork, completeWork, failWork, recoverExpiredLeases } from "@/src/infrastructure/queue/postgres-queue";
import { getProviders } from "@/src/providers";

const once = process.argv.includes("--once");
const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
const providers = getProviders();
const concurrency = getEnv().WORKER_CONCURRENCY;

async function handleWorkItem(item: Awaited<ReturnType<typeof claimWork>>[number]) {
  const log = workLogger({
    runId: item.scoutRunId,
    companyId: item.companyId,
    workItemId: item.id,
    stage: item.stage,
    attempt: item.attemptCount,
  });
  try {
    const output = await processWorkItem(item, providers);
    await completeWork(item.id, output);
    log.info({ output }, "work_item_succeeded");
  } catch (error) {
    const run = await getRun(item.scoutRunId);
    const configuration = run ? runConfigurationSchema.parse(run.configuration) : null;
    const normalized = error instanceof StageProcessingError
      ? error
      : new StageProcessingError("unhandled", false, error instanceof Error ? error.message : String(error));
    await failWork(item.id, {
      category: normalized.category,
      message: normalized.message,
      retryable: normalized.retryable,
      maxRetries: configuration?.budget.maxRetriesPerWorkItem ?? 0,
    });
    log[normalized.retryable ? "warn" : "error"]({ err: normalized }, "work_item_failed");
  } finally {
    await reconcileRun(item.scoutRunId);
  }
}

function retryableProspectError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|network|rate_limited|temporar/i.test(message);
}

async function handleProspectJob(item: Awaited<ReturnType<typeof claimProspectJobs>>[number]) {
  const log = workLogger({
    companyId: item.companyId,
    workItemId: item.id,
    stage: `prospect:${item.jobType}`,
    attempt: item.attemptCount,
  });
  try {
    const metadata = item.metadata as Record<string, unknown>;
    let output: unknown;
    if (item.jobType === "people_research") {
      await executePeopleResearch(item.prospectDossierId);
      output = { jobType: item.jobType, dossierId: item.prospectDossierId };
    } else if (item.jobType === "angle_generation") {
      await executeAngleGeneration(item.prospectDossierId, typeof metadata.targetPersonId === "string" ? metadata.targetPersonId : null);
      output = { jobType: item.jobType, dossierId: item.prospectDossierId };
    } else if (item.jobType === "draft_generation") {
      if (typeof metadata.angleId !== "string" || typeof metadata.contactPointId !== "string") throw new Error("draft_job_metadata_missing");
      await executeDraftGeneration(item.prospectDossierId, metadata.angleId, metadata.contactPointId);
      output = { jobType: item.jobType, dossierId: item.prospectDossierId };
    } else {
      output = await exportProspectBundle(item.prospectDossierId, { includeContacts: false });
    }
    await completeProspectJob(item.id, output);
    log.info({ output: { jobType: item.jobType } }, "prospect_job_succeeded");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failProspectJob(item.id, {
      category: retryableProspectError(error) ? "retryable_provider_failure" : "prospect_job_failure",
      message,
      retryable: retryableProspectError(error),
      maxRetries: getEnv().DEFAULT_RUN_MAX_RETRIES,
    });
    log[retryableProspectError(error) ? "warn" : "error"]({ err: error }, "prospect_job_failed");
  }
}

export async function runWorker(options: { drain?: boolean } = {}) {
  await recoverExpiredLeases();
  await recoverExpiredProspectLeases();
  let processed = 0;
  for (;;) {
    const [items, prospectItems] = await Promise.all([
      claimWork(workerId, concurrency),
      claimProspectJobs(workerId, concurrency),
    ]);
    if (!items.length && !prospectItems.length) {
      if (once || options.drain) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await recoverExpiredLeases();
      await recoverExpiredProspectLeases();
      continue;
    }
    await Promise.all([
      ...items.map(handleWorkItem),
      ...prospectItems.map(handleProspectJob),
    ]);
    processed += items.length + prospectItems.length;
  }
  return processed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker()
    .then(async (processed) => {
      if (once) process.stdout.write(`${JSON.stringify({ processed })}\n`);
      await closeDb();
    })
    .catch(async (error) => {
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      await closeDb();
      process.exitCode = 1;
    });
}
