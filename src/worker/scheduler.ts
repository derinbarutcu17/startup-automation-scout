import { z } from "zod";
import { defaultRunConfiguration } from "@/src/application/configuration";
import { createScoutRun, startScoutRun } from "@/src/application/scout-service";
import { getEnv } from "@/src/infrastructure/config/env";
import {
  createScheduleOccurrence,
  getSetting,
  linkScheduleOccurrenceToRun,
  listScheduleOccurrences,
  updateScheduleOccurrenceOutcome,
} from "@/src/infrastructure/db/repositories";

export const scheduleSettingSchema = z.object({
  enabled: z.boolean().default(false),
  scheduleId: z.string().min(1).default("weekly-scout"),
  timezone: z.string().min(1).default("Europe/Berlin"),
  weekday: z.number().int().min(0).max(6).default(1),
  hour: z.number().int().min(0).max(23).default(9),
  minute: z.number().int().min(0).max(59).default(0),
  catchUpHours: z.number().int().min(0).max(168).default(24),
  seeds: z.array(z.string().min(1)).default([]),
});

export type ScheduleSetting = z.infer<typeof scheduleSettingSchema>;

export async function loadScheduleSetting(): Promise<ScheduleSetting> {
  const row = await getSetting("weekly_scout_schedule");
  return scheduleSettingSchema.parse(row?.value ?? {});
}

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    second: Number(value("second")),
    weekday: weekdayMap[value("weekday")] ?? 0,
  };
}

function zonedLocalToUtc(input: { year: number; month: number; day: number; hour: number; minute: number }, timezone: string) {
  const target = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0, 0);
  let guess = target;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = zonedParts(new Date(guess), timezone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
    const delta = target - represented;
    guess += delta;
    if (Math.abs(delta) < 1000) break;
  }
  return new Date(guess);
}

function localDateShift(parts: ReturnType<typeof zonedParts>, days: number) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export function schedulerWindow(now: Date, setting: ScheduleSetting) {
  const local = zonedParts(now, setting.timezone);
  const daysSinceTarget = (local.weekday - setting.weekday + 7) % 7;
  const thisWeekDate = localDateShift(local, -daysSinceTarget);
  const thisWeek = zonedLocalToUtc({ ...thisWeekDate, hour: setting.hour, minute: setting.minute }, setting.timezone);
  const nextDate = localDateShift(zonedParts(thisWeek, setting.timezone), 7);
  const next = thisWeek > now
    ? thisWeek
    : zonedLocalToUtc({ ...nextDate, hour: setting.hour, minute: setting.minute }, setting.timezone);
  const ageMs = now.getTime() - thisWeek.getTime();
  const due = thisWeek <= now && ageMs <= setting.catchUpHours * 60 * 60 * 1000 ? thisWeek : null;
  return { due, next };
}

export async function getSchedulerStatus(now = new Date()) {
  const setting = await loadScheduleSetting();
  const occurrences = await listScheduleOccurrences(setting.scheduleId);
  const window = schedulerWindow(now, setting);
  return {
    environmentEnabled: getEnv().SCHEDULER_ENABLED,
    setting,
    nextOccurrenceUtc: window.next.toISOString(),
    dueOccurrenceUtc: window.due?.toISOString() ?? null,
    lastOccurrence: occurrences[0] ?? null,
  };
}

export async function runSchedulerOnce(now = new Date()) {
  const setting = await loadScheduleSetting();
  if (!getEnv().SCHEDULER_ENABLED || !setting.enabled) {
    return { status: "disabled" as const, ...(await getSchedulerStatus(now)) };
  }
  const { due, next } = schedulerWindow(now, setting);
  if (!due) return { status: "not_due" as const, nextOccurrenceUtc: next.toISOString() };
  const occurrenceResult = await createScheduleOccurrence({ scheduleId: setting.scheduleId, scheduledForUtc: due });
  if (!occurrenceResult.created) {
    return { status: "duplicate" as const, occurrence: occurrenceResult.occurrence, nextOccurrenceUtc: next.toISOString() };
  }
  if (!setting.seeds.length) {
    await updateScheduleOccurrenceOutcome(occurrenceResult.occurrence.id, "skipped_no_seeds");
    return { status: "skipped_no_seeds" as const, occurrence: occurrenceResult.occurrence, nextOccurrenceUtc: next.toISOString() };
  }
  try {
    const run = await createScoutRun(defaultRunConfiguration(), setting.seeds, { scheduleOccurrenceId: occurrenceResult.occurrence.id });
    await linkScheduleOccurrenceToRun(occurrenceResult.occurrence.id, run.id, "run_created");
    await startScoutRun(run.id);
    await linkScheduleOccurrenceToRun(occurrenceResult.occurrence.id, run.id, "run_started");
    return { status: "started" as const, runId: run.id, occurrenceId: occurrenceResult.occurrence.id, nextOccurrenceUtc: next.toISOString() };
  } catch (error) {
    await updateScheduleOccurrenceOutcome(occurrenceResult.occurrence.id, "failed");
    throw error;
  }
}
