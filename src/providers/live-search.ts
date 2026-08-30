import type { SearchProvider, SearchResult } from "@/src/providers/contracts";
import type { ProviderResult } from "@/src/domain/types";
import { getEnv } from "@/src/infrastructure/config/env";

export class BraveSearchProvider implements SearchProvider {
  id = "brave";

  async searchWeb(query: string, options: { count?: number } = {}): Promise<ProviderResult<SearchResult[]>> {
    const env = getEnv();
    if (!env.SEARCH_API_KEY) return { ok: false, category: "configuration", retryable: false, message: "SEARCH_API_KEY is not configured" };
    const started = Date.now();
    try {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query);
      url.searchParams.set("count", String(Math.min(options.count ?? 5, 20)));
      const response = await fetch(url, { headers: { Accept: "application/json", "X-Subscription-Token": env.SEARCH_API_KEY } });
      const latencyMs = Date.now() - started;
      if (response.status === 401 || response.status === 403) return { ok: false, category: "authentication", retryable: false, message: "Search authentication failed", usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
      if (response.status === 429) return { ok: false, category: "rate_limited", retryable: true, message: "Search rate limited", usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
      if (!response.ok) return { ok: false, category: "terminal_provider_failure", retryable: response.status >= 500, message: `Search HTTP ${response.status}`, usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
      const json = (await response.json()) as { web?: { results?: Array<{ title?: string; url?: string; description?: string; page_age?: string }> } };
      const results = (json.web?.results ?? []).flatMap((item) => item.url ? [{ title: item.title ?? item.url, url: item.url, snippet: item.description ?? "", publishedAt: item.page_age }] : []);
      return { ok: true, value: results, usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
    } catch (error) {
      return { ok: false, category: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network", retryable: true, message: error instanceof Error ? error.message : "Search network error", usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs: Date.now() - started } };
    }
  }
}
