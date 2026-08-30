import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "PRODUCT.md",
  "DESIGN.md",
  "package.json",
  ".env.example",
  "docker-compose.yml",
  "app/layout.tsx",
  "app/(dashboard)/scout-runs/page.tsx",
  "src/application/orchestration.ts",
  "src/infrastructure/db/migrations/0000_aberrant_la_nuit.sql",
  "tests/e2e/scout-flow.spec.ts",
  "src/evaluation/run.ts",
];

const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
const scriptTargets = ["dev", "build", "worker", "db:migrate", "db:reset-test", "typecheck", "lint", "test", "test:integration", "test:providers", "test:security", "e2e", "evaluate", "audit", "verify"];
const missingScripts = scriptTargets.filter((name) => !packageJson.scripts?.[name]);

if (missing.length || missingScripts.length) {
  if (missing.length) console.error(`Missing required files: ${missing.join(", ")}`);
  if (missingScripts.length) console.error(`Missing package scripts: ${missingScripts.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "pass", checkedFiles: requiredFiles.length, checkedScripts: scriptTargets.length }));
}
