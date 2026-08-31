import { readFile } from "node:fs/promises";
import { defaultRunConfiguration } from "@/src/application/configuration";
import { createScoutRun, importBerlinProductHuntSeeds, startScoutRun } from "@/src/application/scout-service";

async function main() {
  const csvPath = process.argv.slice(2).find((arg) => arg !== "--" && arg !== "-");
  if (!csvPath) {
    console.error("Usage: pnpm scout:product-hunt -- path/to/product-hunt-berlin.csv");
    process.exit(2);
  }

  const configuration = defaultRunConfiguration();
  const run = await createScoutRun({
    ...configuration,
    geographicScope: ["Berlin", "Germany"],
    enabledDiscoverySources: [...new Set([...configuration.enabledDiscoverySources, "product_hunt_seed"])],
    companySizePolicy: "small_or_medium",
    maxEmployeeCount: 500,
    requireCompanySizeEvidence: true,
  }, []);
  const imported = await importBerlinProductHuntSeeds(await readFile(csvPath, "utf8"), run.id);
  await startScoutRun(run.id);
  console.log(JSON.stringify({ runId: run.id, imported: imported.length, companies: imported.map((item) => item.company.canonicalName) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
