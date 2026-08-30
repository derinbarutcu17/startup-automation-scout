import { writeFile } from "node:fs/promises";
import { validateOpportunity } from "@/src/domain/quality-gate";
import { opportunityWeights, weightedScore } from "@/src/domain/scoring";
import type { AutomationOpportunityInput } from "@/src/domain/types";

const validOpportunity: AutomationOpportunityInput = {
  proposedSystem: "A rules-first exception triage assistant that classifies ambiguous carrier notes for operator confirmation.",
  deterministicSteps: ["Normalize carrier events", "Apply known rules", "Route ambiguous cases"],
  aiRequiredSteps: ["Classify ambiguous notes"],
  requiredIntegrations: ["Carrier event export"],
  requiredPrivateAccess: ["Production carrier feed"],
  measurableOutcome: "Measure median review time and correction-loop count before and after a synthetic-data pilot.",
  buildability: "high",
  evidenceStrength: "high",
  genericnessStatus: "specific",
  risks: ["Existing rules may already cover common exceptions."],
  nextValidationStep: "Validate exception categories with one operator and a synthetic event set.",
  rankingConfidence: "medium",
};

const cases = [
  {
    name: "evidence-backed specific proposal",
    expected: true,
    actual: validateOpportunity(validOpportunity, { evidenceItemIds: ["evidence-1"], hasVerifiedCompanyClaim: true }).passed,
  },
  {
    name: "generic proposal is held",
    expected: false,
    actual: validateOpportunity({ ...validOpportunity, genericnessStatus: "generic" }, { evidenceItemIds: ["evidence-1"], hasVerifiedCompanyClaim: true }).passed,
  },
  {
    name: "precise unsupported savings are held",
    expected: false,
    actual: validateOpportunity({ ...validOpportunity, measurableOutcome: "Save €5000 per month with this workflow." }, { evidenceItemIds: ["evidence-1"], hasVerifiedCompanyClaim: true }).passed,
  },
];

const dimensions = {
  evidenceStrength: 4,
  painPlausibility: 3,
  automationLeverage: 4,
  measurability: 4,
  buildability: 4,
  differentiation: 3,
  portfolioCareerSignal: 4,
};
const startedAt = Date.now();
const score = weightedScore(dimensions, opportunityWeights);
const passed = cases.every((test) => test.actual === test.expected);
const report = {
  evaluationVersion: "fixture-eval-v1",
  policyVersion: "evidence-v1",
  rubricVersion: "v0.1-prebuild",
  providerMode: "fixture",
  cases,
  metrics: {
    casesPassed: cases.filter((test) => test.actual === test.expected).length,
    caseCount: cases.length,
    qualityPassRate: cases.filter((test) => test.actual === test.expected).length / cases.length,
    referenceScore: score,
    latencyMs: Date.now() - startedAt,
    costEur: 0,
  },
  releaseNote: "This is a deterministic fixture regression harness, not the required 20-company human-reviewed golden set.",
};

async function main() {
  await writeFile("evaluation-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!passed) process.exitCode = 1;
}

void main();
