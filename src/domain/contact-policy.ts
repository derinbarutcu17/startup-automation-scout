import { getEnv } from "@/src/infrastructure/config/env";

export type ContactChannel = "public_professional_email" | "public_profile_url" | "company_contact_form" | "other";
export type ContactStatus = "candidate" | "source_verified" | "user_confirmed" | "rejected" | "stale" | "suppressed";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Detects guessed email patterns like first.last@company.com derived from name without source
// The policy forbids inferred status; we detect names that look like first/last pattern without source verification
const GUESSED_LOCAL_PATTERN = /^[a-z]+\.[a-z]+$/i;

export function normalizeContactValue(channel: ContactChannel, value: string): string {
  void channel;
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password && Boolean(url.hostname);
  } catch {
    return false;
  }
}

// Returns true if contact should be rejected as guessed/inferred
export function isGuessedEmail(value: string, context: { status: ContactStatus; discoveryMethod?: string; sourceDocumentId?: string | null; userSupplied?: boolean }): boolean {
  // Any email with status inferred is blocked, but we don't support inferred status; treat candidate without source as weak
  // If discoveryMethod contains "pattern" or "guess" or no sourceDocument and not user_supplied, treat as guessed
  const method = (context.discoveryMethod ?? context.status ?? "").toLowerCase();
  if (method.includes("guess") || method.includes("pattern") || method.includes("inferred")) return true;
  // If status is candidate and no source document, but email looks like first.last pattern, flag as guessed (heuristic)
  if (!context.userSupplied && !context.sourceDocumentId && statusIsCandidate(context.status) && GUESSED_LOCAL_PATTERN.test(value.split("@")[0] ?? "")) return true;
  return false;
}

function statusIsCandidate(status: ContactStatus) {
  return status === "candidate";
}

export interface ContactValidationContext {
  channelType: ContactChannel;
  normalizedValue: string;
  status: ContactStatus;
  discoveryMethod: string;
  sourceDocumentId?: string | null;
  userSupplied?: boolean;
  lastCheckedAt?: Date | null;
}

export function validateContactPoint(ctx: ContactValidationContext): { ok: boolean; reason?: string } {
  if (ctx.status === "source_verified" && !ctx.sourceDocumentId) return { ok: false, reason: "source_verified_requires_source" };
  if (ctx.channelType === "public_professional_email") {
    if (!isValidEmail(ctx.normalizedValue)) return { ok: false, reason: "invalid_email_format" };
    if (isGuessedEmail(ctx.normalizedValue, { status: ctx.status, discoveryMethod: ctx.discoveryMethod, sourceDocumentId: ctx.sourceDocumentId ?? null, userSupplied: ctx.userSupplied })) {
      return { ok: false, reason: "guessed_email_rejected" };
    }
  } else if (ctx.channelType === "public_profile_url" || ctx.channelType === "company_contact_form") {
    if (!isValidHttpUrl(ctx.normalizedValue)) return { ok: false, reason: "invalid_public_url" };
  }
  return { ok: true };
}

export function isContactEligibleForDraft(ctx: ContactValidationContext): { eligible: boolean; reason?: string } {
  if (ctx.channelType !== "public_professional_email") {
    return { eligible: false, reason: "contact_channel_not_email" };
  }
  if (ctx.status !== "source_verified" && ctx.status !== "user_confirmed") {
    return { eligible: false, reason: "contact_not_verified" };
  }
  const freshnessDays = getEnv().CONTACT_FRESHNESS_DAYS;
  if (ctx.lastCheckedAt) {
    const ageDays = (Date.now() - ctx.lastCheckedAt.getTime()) / (24 * 60 * 60 * 1000);
    if (!Number.isFinite(ageDays) || ageDays < 0 || ageDays > freshnessDays) return { eligible: false, reason: "contact_stale" };
  } else {
    return { eligible: false, reason: "contact_never_checked" };
  }
  if (ctx.status === "source_verified" && !ctx.sourceDocumentId) {
    return { eligible: false, reason: "contact_source_missing" };
  }
  const valid = validateContactPoint(ctx);
  if (!valid.ok) return { eligible: false, reason: valid.reason };
  return { eligible: true };
}

export function isStaleContact(lastCheckedAt: Date | null, freshnessDays = getEnv().CONTACT_FRESHNESS_DAYS): boolean {
  if (!lastCheckedAt) return true;
  const age = Date.now() - lastCheckedAt.getTime();
  return !Number.isFinite(age) || age < 0 || age > freshnessDays * 24 * 60 * 60 * 1000;
}
