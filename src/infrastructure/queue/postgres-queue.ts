import { createHash } from "node:crypto";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import type { WorkStage } from "@/src/domain/types";
import { getDb } from "@/src/infrastructure/db/client";
import { workItems } from "@/src/infrastructure/db/schema";

export function workIdentity(runId: string, companyId: string | null, stage: WorkStage, input: unknown): { idempotencyKey: string; inputFingerprint: string } {
  const payload = JSON.stringify(input);
  const inputFingerprint = createHash("sha256").update(payload).digest("hex");
  return {
    idempotencyKey: `${runId}:${companyId ?? "run"}:${stage}:${inputFingerprint}`,
    inputFingerprint,
  };
}

export async function enqueueWork(input: {
  scoutRunId: string;
  companyId?: string | null;
  stage: WorkStage;
  payload?: Record<string, unknown>;
  availableAt?: Date;
}) {
  const { db } = getDb();
  const identity = workIdentity(input.scoutRunId, input.companyId ?? null, input.stage, input.payload ?? {});
  const [row] = await db.insert(workItems).values({
    scoutRunId: input.scoutRunId,
    companyId: input.companyId ?? null,
    stage: input.stage,
    idempotencyKey: identity.idempotencyKey,
    inputFingerprint: identity.inputFingerprint,
    metadata: input.payload ?? {},
    availableAt: input.availableAt ?? new Date(),
  }).onConflictDoNothing({ target: workItems.idempotencyKey }).returning();
  if (row) return row;
  const [existing] = await db.select().from(workItems).where(eq(workItems.idempotencyKey, identity.idempotencyKey)).limit(1);
  if (!existing) throw new Error("Failed to enqueue work");
  return existing;
}

export async function claimWork(workerId: string, limit: number, leaseMs = 30_000) {
  const { db } = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx.execute(sql`
      SELECT id
      FROM work_items
      WHERE status IN ('pending', 'failed_retryable')
        AND available_at <= now()
      ORDER BY available_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `);
    const ids = rows.map((row) => String(row.id));
    if (!ids.length) return [];
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);
    return tx.update(workItems).set({
      status: "running",
      leaseOwner: workerId,
      claimedAt: now,
      leaseExpiresAt,
      firstAttemptAt: sql`coalesce(${workItems.firstAttemptAt}, now())`,
      lastAttemptAt: now,
      attemptCount: sql`${workItems.attemptCount} + 1`,
      updatedAt: now,
    }).where(inArray(workItems.id, ids)).returning();
  });
}

export async function recoverExpiredLeases(now = new Date()): Promise<number> {
  const { db } = getDb();
  const rows = await db.update(workItems).set({
    status: "failed_retryable",
    leaseOwner: null,
    leaseExpiresAt: null,
    claimedAt: null,
    lastErrorCategory: "lease_expired",
    lastErrorMessage: "Worker lease expired before completion",
    availableAt: now,
    updatedAt: now,
  }).where(and(eq(workItems.status, "running"), lte(workItems.leaseExpiresAt, now))).returning({ id: workItems.id });
  return rows.length;
}

export async function completeWork(workItemId: string, output: unknown = {}) {
  const { db } = getDb();
  const fingerprint = createHash("sha256").update(JSON.stringify(output)).digest("hex");
  const [row] = await db.update(workItems).set({
    status: "succeeded",
    outputFingerprint: fingerprint,
    leaseOwner: null,
    leaseExpiresAt: null,
    updatedAt: new Date(),
  }).where(eq(workItems.id, workItemId)).returning();
  return row;
}

export async function failWork(workItemId: string, input: {
  category: string;
  message: string;
  retryable: boolean;
  maxRetries: number;
  retryDelayMs?: number;
}) {
  const { db } = getDb();
  const [current] = await db.select().from(workItems).where(eq(workItems.id, workItemId)).limit(1);
  if (!current) return null;
  const mayRetry = input.retryable && current.attemptCount <= input.maxRetries;
  const [row] = await db.update(workItems).set({
    status: mayRetry ? "failed_retryable" : "failed_terminal",
    lastErrorCategory: input.category,
    lastErrorMessage: input.message.slice(0, 2000),
    leaseOwner: null,
    leaseExpiresAt: null,
    availableAt: mayRetry ? new Date(Date.now() + (input.retryDelayMs ?? Math.min(30_000, current.attemptCount * 500))) : current.availableAt,
    updatedAt: new Date(),
  }).where(eq(workItems.id, workItemId)).returning();
  return row;
}

export async function cancelPendingWork(runId: string): Promise<number> {
  const { db } = getDb();
  const rows = await db.update(workItems).set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(workItems.scoutRunId, runId), inArray(workItems.status, ["pending", "failed_retryable"])))
    .returning({ id: workItems.id });
  return rows.length;
}
