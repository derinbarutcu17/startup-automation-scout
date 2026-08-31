import type { SearchProvider, SearchResult } from "@/src/providers/contracts";
import type { ProviderResult } from "@/src/domain/types";
import { getEnv } from "@/src/infrastructure/config/env";

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : "";
}

export function parseSearxJson(body: unknown): SearchResult[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { results?: unknown }).results)) return [];
  return (body as { results: unknown[] }).results.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const title = text(row.title);
    const url = text(row.url);
    if (!title || !/^https?:\/\//i.test(url)) return [];
    return [{ title, url, snippet: text(row.content), publishedAt: typeof row.publishedDate === "string" ? row.publishedDate : undefined }];
  });
}

export function parseSearxHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const patterns = [
    /<a[^>]+class="[^"]*result_header[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    /<h[34][^>]+class="[^"]*result_header[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null && results.length < 20) {
      const url = match[1];
      const title = text(match[2]);
      if (!url || !title || !/^https?:\/\//i.test(url)) continue;
      const after = html.slice(match.index + match[0].length, match.index + match[0].length + 1500);
      const snippet = text(/class="[^"]*result-content[^"]*"[^>]*>([\s\S]*?)<\//i.exec(after)?.[1]);
      results.push({ title, url, snippet });
    }
  }
  return results;
}

export class SearxSearchProvider implements SearchProvider {
  id = "searxng";

  async searchWeb(query: string, options: { count?: number } = {}): Promise<ProviderResult<SearchResult[]>> {
    const env = getEnv();
    const count = Math.min(options.count ?? 5, 20);
    const instances = env.SEARXNG_INSTANCE_URLS.split(",").map((value) => value.trim()).filter(Boolean);
    let lastMessage = "No SearXNG instance returned results";
    for (const instance of instances) {
      try {
        const base = new URL(instance);
        if (base.protocol !== "https:" || base.username || base.password) continue;
        const url = new URL("/search", base);
        url.searchParams.set("q", query);
        url.searchParams.set("language", "en");
        url.searchParams.set("categories", "general");
        url.searchParams.set("format", "json");
        const started = Date.now();
        const response = await fetch(url, { headers: { "User-Agent": env.RETRIEVAL_USER_AGENT, Accept: "application/json, text/html;q=0.9" }, signal: AbortSignal.timeout(10_000) });
        const latencyMs = Date.now() - started;
        if (!response.ok && response.status === 403) {
          url.searchParams.set("format", "html");
          const htmlResponse = await fetch(url, { headers: { "User-Agent": env.RETRIEVAL_USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(10_000) });
          if (!htmlResponse.ok) { lastMessage = `${base.hostname} HTTP ${htmlResponse.status}`; continue; }
          const htmlResults = parseSearxHtml(await htmlResponse.text());
          if (htmlResults.length) return { ok: true, value: htmlResults.slice(0, count), usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs: Date.now() - started } };
          lastMessage = `${base.hostname} returned no HTML results`;
          continue;
        }
        if (!response.ok) { lastMessage = `${base.hostname} HTTP ${response.status}`; continue; }
        const contentType = response.headers.get("content-type") ?? "";
        const parsed = contentType.includes("json") ? parseSearxJson(await response.json()) : parseSearxHtml(await response.text());
        if (parsed.length) return { ok: true, value: parsed.slice(0, count), usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
        lastMessage = `${base.hostname} returned no results`;
      } catch (error) {
        lastMessage = error instanceof Error ? error.message : "SearXNG network error";
      }
    }
    return { ok: false, category: "network", retryable: true, message: lastMessage, usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs: 0 } };
  }
}
