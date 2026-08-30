import { closeDb } from "@/src/infrastructure/db/client";
import { runSchedulerOnce } from "@/src/worker/scheduler";

runSchedulerOnce()
  .then(async (result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    await closeDb();
  })
  .catch(async (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    await closeDb();
    process.exitCode = 1;
  });
