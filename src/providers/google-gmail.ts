import type { ProviderResult } from "@/src/domain/types";
import { getEnv } from "@/src/infrastructure/config/env";
import { getGmailConnection, saveGmailConnection } from "@/src/infrastructure/db/repositories-prospect";
import type { GmailDraftInput, GmailDraftProvider, GmailDraftResult } from "@/src/providers/contracts";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function usage(latencyMs: number) {
  return { providerId: "google-gmail", operation: "gmail_create_draft", requestCount: 1, costEur: 0, latencyMs };
}

function invalid(message: string): ProviderResult<GmailDraftResult> {
  return { ok: false, category: "invalid_response", retryable: false, message, usage: usage(0) };
}

function buildRawMessage(input: GmailDraftInput): string {
  const headers = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    if (!/^[A-Za-z0-9-]+$/.test(name) || /[\r\n]/.test(value)) continue;
    if (/^(to|subject|mime-version|content-type|content-transfer-encoding)$/i.test(name)) continue;
    headers.push(`${name}: ${value}`);
  }
  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

async function accessToken(): Promise<string | null> {
  const env = getEnv();
  if (env.GMAIL_ACCESS_TOKEN) return env.GMAIL_ACCESS_TOKEN;
  const connection = await getGmailConnection("google");
  if (!connection) return null;
  if (!connection.scope.split(/\s+/).includes("https://www.googleapis.com/auth/gmail.compose")) return null;
  const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
  if (connection.accessToken && expiresAt > Date.now() + 60_000) return connection.accessToken;
  if (!connection.refreshToken || !env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET) return connection.accessToken;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: connection.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(env.GMAIL_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { access_token?: string; expires_in?: number; refresh_token?: string };
  if (!json.access_token) return null;
  await saveGmailConnection({
    provider: "google",
    email: connection.email,
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? connection.refreshToken,
    tokenExpiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    scope: connection.scope,
  });
  return json.access_token;
}

export class GoogleGmailDraftProvider implements GmailDraftProvider {
  id = "google-gmail";

  async createDraft(input: GmailDraftInput): Promise<ProviderResult<GmailDraftResult>> {
    if (getEnv().APP_ENV === "production") return invalid("Gmail requires an authenticated owner boundary before production use");
    if (!EMAIL_RE.test(input.to.trim())) return invalid("invalid_recipient");
    if (!input.subject.trim()) return invalid("subject_required");
    if (/[\r\n]/.test(input.to) || /[\r\n]/.test(input.subject)) return invalid("header_injection_denied");
    const started = Date.now();
    try {
      const token = await accessToken();
      if (!token) return { ok: false, category: "configuration", retryable: false, message: "Gmail is not connected", usage: usage(Date.now() - started) };
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { raw: Buffer.from(buildRawMessage(input), "utf8").toString("base64url") } }),
        signal: AbortSignal.timeout(getEnv().GMAIL_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - started;
      if (response.status === 401) return { ok: false, category: "authentication", retryable: false, message: "Gmail authorization expired", usage: usage(latencyMs) };
      if (response.status === 403) return { ok: false, category: "access_denied", retryable: false, message: "Gmail draft permission denied", usage: usage(latencyMs) };
      if (response.status === 429) return { ok: false, category: "rate_limited", retryable: true, message: "Gmail rate limited", usage: usage(latencyMs) };
      if (!response.ok) return { ok: false, category: "terminal_provider_failure", retryable: response.status >= 500, message: `Gmail draft request failed (${response.status})`, usage: usage(latencyMs) };
      const json = (await response.json()) as { id?: string; message?: { id?: string } };
      if (!json.id) return { ok: false, category: "invalid_response", retryable: false, message: "Gmail returned no draft id", usage: usage(latencyMs) };
      return { ok: true, value: { draftId: json.id, messageId: json.message?.id }, usage: usage(latencyMs) };
    } catch {
      return { ok: false, category: "network", retryable: true, message: "Gmail draft request failed", usage: usage(Date.now() - started) };
    }
  }
}
