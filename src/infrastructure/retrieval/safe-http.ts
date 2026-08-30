import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import net from "node:net";
import type { ProviderResult } from "@/src/domain/types";
import type { RetrievedDocument, RetrievalProvider } from "@/src/providers/contracts";
import { getEnv } from "@/src/infrastructure/config/env";

function ipv4Blocked(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function ipv6Blocked(ip: string): boolean {
  const normalized = ip.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) return ipv4Blocked(mappedIpv4[1]);
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff");
}

export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  return family === 4 ? ipv4Blocked(ip) : family === 6 ? ipv6Blocked(ip) : true;
}

export async function validateOutboundUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("unsupported_protocol");
  if (url.username || url.password) throw new Error("credentialed_url_denied");
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase())) throw new Error("localhost_denied");
  if (net.isIP(url.hostname) && isBlockedIp(url.hostname)) throw new Error("private_network_denied");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((entry) => isBlockedIp(entry.address))) throw new Error("private_network_denied");
  return url;
}

function extractText(contentType: string, body: string): string {
  if (contentType.includes("html") || contentType.includes("xhtml")) {
    return body
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim();
  }
  return body.trim();
}

export class SafeHttpRetrievalProvider implements RetrievalProvider {
  id = "safe_http";

  async retrieveDocument(rawUrl: string): Promise<ProviderResult<RetrievedDocument>> {
    const env = getEnv();
    const started = Date.now();
    try {
      let current = await validateOutboundUrl(rawUrl);
      for (let redirect = 0; redirect <= 4; redirect += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), env.RETRIEVAL_TIMEOUT_MS);
        let response: Response;
        try {
          response = await fetch(current, { redirect: "manual", signal: controller.signal, headers: { "User-Agent": env.RETRIEVAL_USER_AGENT, Accept: "text/html,text/plain,application/xhtml+xml,application/json;q=0.5" } });
        } finally {
          clearTimeout(timer);
        }
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location) throw new Error("redirect_without_location");
          if (redirect === 4) throw new Error("too_many_redirects");
          current = await validateOutboundUrl(new URL(location, current).toString());
          continue;
        }
        if (!response.ok) return { ok: false, category: response.status === 401 || response.status === 403 ? "access_denied" : "network", retryable: response.status >= 500, message: `Retrieval HTTP ${response.status}`, usage: { providerId: this.id, operation: "retrieve", requestCount: 1, latencyMs: Date.now() - started } };
        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml+xml") && !contentType.includes("application/json")) return { ok: false, category: "access_denied", retryable: false, message: `Unsupported content type: ${contentType || "unknown"}`, usage: { providerId: this.id, operation: "retrieve", requestCount: 1, latencyMs: Date.now() - started } };
        const declared = Number(response.headers.get("content-length") ?? 0);
        if (declared > env.RETRIEVAL_MAX_BYTES) return { ok: false, category: "access_denied", retryable: false, message: "Response exceeds configured byte limit", usage: { providerId: this.id, operation: "retrieve", requestCount: 1, latencyMs: Date.now() - started } };
        const reader = response.body?.getReader();
        if (!reader) throw new Error("missing_response_body");
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > env.RETRIEVAL_MAX_BYTES) {
            await reader.cancel();
            return { ok: false, category: "access_denied", retryable: false, message: "Response exceeds configured byte limit", usage: { providerId: this.id, operation: "retrieve", requestCount: 1, latencyMs: Date.now() - started } };
          }
          chunks.push(value);
        }
        const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
        const text = extractText(contentType, body).slice(0, env.RETRIEVAL_MAX_BYTES);
        return { ok: true, value: { url: rawUrl, finalUrl: current.toString(), status: "retrieved", contentType, text, byteLength: total, fetchedAt: new Date().toISOString(), fingerprint: createHash("sha256").update(text).digest("hex"), sourceTier: "tier_2", diagnostics: { redirects: redirect } }, usage: { providerId: this.id, operation: "retrieve", requestCount: 1, latencyMs: Date.now() - started } };
      }
      return { ok: false, category: "access_denied", retryable: false, message: "Too many redirects" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Retrieval failed";
      const access = /unsupported_protocol|private_network|localhost|credentialed_url|redirect/.test(message);
      return { ok: false, category: access ? "access_denied" : message.includes("abort") ? "timeout" : "network", retryable: !access, message, usage: { providerId: this.id, operation: "retrieve", requestCount: 1, latencyMs: Date.now() - started } };
    }
  }
}
