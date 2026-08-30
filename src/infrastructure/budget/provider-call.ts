import type { ProviderResult, WorkStage } from "@/src/domain/types";
import { BudgetDeniedError, reserveBudget, settleBudget } from "@/src/infrastructure/budget/budget-service";
import { saveProviderDiagnostic } from "@/src/infrastructure/db/repositories";

export interface ProviderReservation {
  amountEur: number;
  searchRequests?: number;
  modelSpendEur?: number;
}

export async function executeBudgetedProviderCall<T>(input: {
  scoutRunId: string;
  companyId?: string;
  workItemId: string;
  stage: WorkStage;
  callId: string;
  providerId: string;
  operation: string;
  reserve: ProviderReservation;
  invoke: () => Promise<ProviderResult<T>>;
}): Promise<ProviderResult<T>> {
  try {
    await reserveBudget({
      scoutRunId: input.scoutRunId,
      companyId: input.companyId,
      workItemId: input.workItemId,
      idempotencyKey: input.callId,
      providerId: input.providerId,
      operation: input.operation,
      stage: input.stage,
      amountEur: input.reserve.amountEur,
      searchRequests: input.reserve.searchRequests ?? 0,
      modelSpendEur: input.reserve.modelSpendEur ?? 0,
    });
  } catch (error) {
    if (!(error instanceof BudgetDeniedError)) throw error;
    await saveProviderDiagnostic({
      scoutRunId: input.scoutRunId,
      companyId: input.companyId,
      workItemId: input.workItemId,
      providerId: input.providerId,
      operation: input.operation,
      ok: false,
      category: "budget_denied",
      retryable: false,
      metadata: { reason: error.reason, callId: input.callId },
    });
    return { ok: false, category: "budget_denied", retryable: false, message: error.message };
  }

  const startedAt = Date.now();
  let result: ProviderResult<T>;
  try {
    result = await input.invoke();
  } catch (error) {
    result = {
      ok: false,
      category: "network",
      retryable: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }
  const usage = result.usage;
  const actualCost = usage?.costEur ?? 0;
  const isModel = input.reserve.modelSpendEur != null && input.reserve.modelSpendEur > 0;
  await settleBudget(input.scoutRunId, input.callId, {
    amountEur: actualCost,
    modelSpendEur: isModel ? actualCost : 0,
  });
  await saveProviderDiagnostic({
    scoutRunId: input.scoutRunId,
    companyId: input.companyId,
    workItemId: input.workItemId,
    providerId: usage?.providerId ?? input.providerId,
    operation: usage?.operation ?? input.operation,
    ok: result.ok,
    category: result.ok ? undefined : result.category,
    retryable: result.ok ? false : result.retryable,
    latencyMs: usage?.latencyMs ?? Date.now() - startedAt,
    requestCount: usage?.requestCount ?? 1,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    costEur: actualCost,
    metadata: { callId: input.callId },
  });
  return result;
}
