import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/src/infrastructure/db/client";
import { budgetLedger, scoutRuns } from "@/src/infrastructure/db/schema";

export class BudgetDeniedError extends Error {
  constructor(public readonly reason: string) {
    super(`budget_denied:${reason}`);
  }
}

export async function reserveBudget(input: {
  scoutRunId: string;
  companyId?: string;
  workItemId?: string;
  idempotencyKey: string;
  providerId: string;
  operation: string;
  stage: string;
  amountEur?: number;
  searchRequests?: number;
  modelSpendEur?: number;
}) {
  const amountEur = input.amountEur ?? 0;
  const searchRequests = input.searchRequests ?? 0;
  const modelSpendEur = input.modelSpendEur ?? 0;
  const { db } = getDb();
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(budgetLedger).where(and(
      eq(budgetLedger.scoutRunId, input.scoutRunId),
      eq(budgetLedger.idempotencyKey, input.idempotencyKey),
    )).limit(1);
    if (existing[0]) return existing[0];

    const locked = await tx.execute(sql`SELECT * FROM scout_runs WHERE id = ${input.scoutRunId} FOR UPDATE`);
    const run = locked[0] as Record<string, unknown> | undefined;
    if (!run) throw new Error("ScoutRun not found");
    const actualCost = Number(run.actual_cost_eur ?? 0);
    const maxEur = Number(run.max_eur ?? 0);
    const actualSearch = Number(run.actual_search_requests ?? 0);
    const maxSearch = Number(run.max_search_requests ?? 0);
    const actualModel = Number(run.actual_model_spend_eur ?? 0);
    const maxModel = Number(run.max_model_spend_eur ?? 0);
    if (actualCost + amountEur > maxEur + 1e-9) throw new BudgetDeniedError("currency");
    if (actualSearch + searchRequests > maxSearch) throw new BudgetDeniedError("search_requests");
    if (actualModel + modelSpendEur > maxModel + 1e-9) throw new BudgetDeniedError("model_spend");

    const [ledger] = await tx.insert(budgetLedger).values({
      scoutRunId: input.scoutRunId,
      companyId: input.companyId,
      workItemId: input.workItemId,
      idempotencyKey: input.idempotencyKey,
      providerId: input.providerId,
      operation: input.operation,
      stage: input.stage,
      reservedAmountEur: amountEur.toFixed(4),
      searchRequests,
      modelSpendEur: modelSpendEur.toFixed(4),
      status: "reserved",
    }).returning();
    await tx.update(scoutRuns).set({
      actualCostEur: (actualCost + amountEur).toFixed(4),
      actualSearchRequests: actualSearch + searchRequests,
      actualModelSpendEur: (actualModel + modelSpendEur).toFixed(4),
      updatedAt: new Date(),
    }).where(eq(scoutRuns.id, input.scoutRunId));
    if (!ledger) throw new Error("Failed to reserve budget");
    return ledger;
  });
}

export async function settleBudget(scoutRunId: string, idempotencyKey: string, actual: { amountEur?: number; modelSpendEur?: number }) {
  const { db } = getDb();
  return db.transaction(async (tx) => {
    const locked = await tx.execute(sql`
      SELECT * FROM budget_ledger
      WHERE scout_run_id = ${scoutRunId} AND idempotency_key = ${idempotencyKey}
      FOR UPDATE
    `);
    const ledger = locked[0] as Record<string, unknown> | undefined;
    if (!ledger) throw new Error("Budget reservation not found");
    if (ledger.status === "settled") return ledger;

    const runLocked = await tx.execute(sql`SELECT * FROM scout_runs WHERE id = ${scoutRunId} FOR UPDATE`);
    const run = runLocked[0] as Record<string, unknown> | undefined;
    if (!run) throw new Error("ScoutRun not found");
    const reservedAmount = Number(ledger.reserved_amount_eur ?? 0);
    const reservedModel = Number(ledger.model_spend_eur ?? 0);
    const actualAmount = actual.amountEur ?? reservedAmount;
    const actualModel = actual.modelSpendEur ?? reservedModel;
    const nextCost = Number(run.actual_cost_eur ?? 0) - reservedAmount + actualAmount;
    const nextModel = Number(run.actual_model_spend_eur ?? 0) - reservedModel + actualModel;
    if (nextCost > Number(run.max_eur ?? 0) + 1e-9) throw new BudgetDeniedError("currency_settlement");
    if (nextModel > Number(run.max_model_spend_eur ?? 0) + 1e-9) throw new BudgetDeniedError("model_spend_settlement");
    await tx.update(budgetLedger).set({
      actualAmountEur: actualAmount.toFixed(4),
      modelSpendEur: actualModel.toFixed(4),
      status: "settled",
      settledAt: new Date(),
    }).where(eq(budgetLedger.id, String(ledger.id)));
    await tx.update(scoutRuns).set({
      actualCostEur: nextCost.toFixed(4),
      actualModelSpendEur: nextModel.toFixed(4),
      updatedAt: new Date(),
    }).where(eq(scoutRuns.id, scoutRunId));
    return { ...ledger, status: "settled", actual_amount_eur: actualAmount.toFixed(4), model_spend_eur: actualModel.toFixed(4) };
  });
}

export async function reserveDeepCompany(runId: string, companyId: string): Promise<void> {
  const { db } = getDb();
  await db.transaction(async (tx) => {
    const locked = await tx.execute(sql`SELECT * FROM scout_runs WHERE id = ${runId} FOR UPDATE`);
    const run = locked[0] as Record<string, unknown> | undefined;
    if (!run) throw new Error("ScoutRun not found");
    const idempotencyKey = `deep_company:${companyId}`;
    const [existing] = await tx.select({ id: budgetLedger.id }).from(budgetLedger).where(and(
      eq(budgetLedger.scoutRunId, runId),
      eq(budgetLedger.idempotencyKey, idempotencyKey),
    )).limit(1);
    if (existing) return;
    const started = Number(run.deep_companies_started ?? 0);
    const max = Number(run.max_deep_companies ?? 0);
    if (started + 1 > max) throw new BudgetDeniedError("deep_companies");
    await tx.insert(budgetLedger).values({
      scoutRunId: runId,
      companyId,
      idempotencyKey,
      providerId: "internal",
      operation: "deep_company",
      stage: "research",
      reservedAmountEur: "0.0000",
      actualAmountEur: "0.0000",
      searchRequests: 0,
      modelSpendEur: "0.0000",
      status: "settled",
      settledAt: new Date(),
    });
    await tx.update(scoutRuns).set({ deepCompaniesStarted: started + 1, updatedAt: new Date() }).where(eq(scoutRuns.id, runId));
  });
}
