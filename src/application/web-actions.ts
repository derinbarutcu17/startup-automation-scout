"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addCompanySeed, cancelScoutRun, createScoutRun, reviewTarget, startScoutRun } from "@/src/application/scout-service";
import { defaultRunConfiguration } from "@/src/application/configuration";
import { scheduleSettingSchema } from "@/src/worker/scheduler";
import { getEnv } from "@/src/infrastructure/config/env";
import { getSetting, setSetting } from "@/src/infrastructure/db/repositories";

export interface ActionState {
  error?: string;
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required`);
  return value.trim();
}

function friendlyError(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.map((issue) => issue.message).join("; ");
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

async function maybeRunInlineWorker() {
  if (!getEnv().RUN_INLINE_WORKER) return;
  const { runWorker } = await import("@/src/worker/index");
  await runWorker({ drain: true });
}

export async function createAndStartRunAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  let runId: string;
  try {
    const seed = requiredString(formData, "seed");
    const run = await createScoutRun(defaultRunConfiguration(), [seed]);
    runId = run.id;
    await startScoutRun(run.id);
    await maybeRunInlineWorker();
    revalidatePath("/scout-runs");
    revalidatePath("/companies");
    revalidatePath("/opportunities");
  } catch (error) {
    return { error: friendlyError(error) };
  }
  redirect(`/scout-runs/${runId}`);
}

export async function addSeedAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await addCompanySeed(requiredString(formData, "seed"), formData.get("runId")?.toString());
    revalidatePath("/companies");
    return {};
  } catch (error) {
    return { error: friendlyError(error) };
  }
}

export async function startRunAction(formData: FormData) {
  const runId = requiredString(formData, "runId");
  await startScoutRun(runId);
  await maybeRunInlineWorker();
  revalidatePath("/scout-runs");
  revalidatePath(`/scout-runs/${runId}`);
  redirect(`/scout-runs/${runId}`);
}

export async function cancelRunAction(formData: FormData) {
  const runId = requiredString(formData, "runId");
  await cancelScoutRun(runId);
  revalidatePath("/scout-runs");
  revalidatePath(`/scout-runs/${runId}`);
  redirect(`/scout-runs/${runId}`);
}

export async function reviewOpportunityAction(formData: FormData) {
  const opportunityId = requiredString(formData, "opportunityId");
  const decision = z.enum(["reject", "investigate", "prototype", "archive"]).parse(requiredString(formData, "decision"));
  const note = formData.get("note")?.toString().trim() || undefined;
  const reasons = formData.getAll("reason").flatMap((value) => typeof value === "string" && value ? [value] : []);
  await reviewTarget(opportunityId, decision, reasons, note);
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/reviews");
  redirect(`/opportunities/${opportunityId}`);
}

export async function updateScheduleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const current = await getSetting("weekly_scout_schedule");
    const currentValue = scheduleSettingSchema.parse(current?.value ?? {});
    const next = scheduleSettingSchema.parse({
      ...currentValue,
      enabled: formData.get("enabled") === "on",
      timezone: requiredString(formData, "timezone"),
      weekday: Number(requiredString(formData, "weekday")),
      hour: Number(requiredString(formData, "hour")),
      minute: Number(requiredString(formData, "minute")),
      catchUpHours: Number(requiredString(formData, "catchUpHours")),
      seeds: formData.get("seeds")?.toString().split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean) ?? [],
    });
    await setSetting("weekly_scout_schedule", next);
    revalidatePath("/settings");
    return {};
  } catch (error) {
    return { error: friendlyError(error) };
  }
}
