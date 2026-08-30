import { randomUUID } from "node:crypto";
import { processWorkItem, StageProcessingError } from "@/src/application/orchestration";
import { reconcileRun } from "@/src/application/scout-service";
import { runConfigurationSchema } from "@/src/domain/types";
import { getEnv } from "@/src/infrastructure/config/env";
import { closeDb } from "@/src/infrastructure/db/client";
import { getRun } from "@/src/infrastructure/db/repositories";
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

export async function runWorker(options: { drain?: boolean } = {}) {
  await recoverExpiredLeases();
  let processed = 0;
  for (;;) {
    const items = await claimWork(workerId, concurrency);
    if (!items.length) {
      if (once || options.drain) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await recoverExpiredLeases();
      continue;
    }
    await Promise.all(items.map(handleWorkItem));
    processed += items.length;
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
