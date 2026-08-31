import type { SearchProvider, SearchResult } from "@/src/providers/contracts";
import type { ProviderResult } from "@/src/domain/types";
import { getEnv } from "@/src/infrastructure/config/env";

/**
 * Keyless DuckDuckGo HTML search provider.
 *
 * The Brave provider needs a paid API key. This provider serves the same
 * SearchProvider contract against the public DuckDuckGo HTML endpoint,
 * which requires no key, no credentials, and no payment. Results are
 * discovery material only; every claim still gets its evidence from the
 * retrieval provider, exactly like brave results do.
 *
 * No authentication, no cost, one request per query. Parsing stays
 * conservative: unmatched pages are skipped, and the provider never
 * fabricates results.
 */
export class DdgSearchProvider implements SearchProvider {
  id = "ddg";

  async searchWeb(query: string, options: { count?: number } = {}): Promise<ProviderResult<SearchResult[]>> {
    void getEnv();
    const started = Date.now();
    const count = Math.min(options.count ?? 5, 20);
    try {
      const body = new URLSearchParams({ q: query });
      const url = `https://html.duckduckgo.com/html/?${body.toString()}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12_000),
      });
      const latencyMs = Date.now() - started;
      if (response.status === 429 || response.status === 403) return { ok: false, category: "rate_limited", retryable: true, message: `DuckDuckGo rate limited (HTTP ${response.status})`, usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
      if (!response.ok) return { ok: false, category: "terminal_provider_failure", retryable: response.status >= 500, message: `DuckDuckGo HTTP ${response.status}`, usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
      const html = await response.text();
      if (/Unfortunately, bots use DuckDuckGo too/i.test(html)) return { ok: false, category: "rate_limited", retryable: true, message: "DuckDuckGo bot challenge", usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
      const results = parseDdgResults(html).slice(0, count);
      if (!results.length) return { ok: false, category: "rate_limited", retryable: true, message: "DuckDuckGo returned no usable results", usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
      return { ok: true, value: results, usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs } };
    } catch (error) {
      return {
        ok: false,
        category: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network",
        retryable: true,
        message: error instanceof Error ? error.message : "DuckDuckGo network error",
        usage: { providerId: this.id, operation: "search", requestCount: 1, latencyMs: Date.now() - started },
      };
    }
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

export function parseDdgResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  // Each result block anchors at a link with class "result__a".
  const blockPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockPattern.exec(html)) !== null && results.length < 20) {
    let href = blockMatch[1];
    const titleHtml = blockMatch[2];
    // DDG wraps real URLs in uddg= redirect params; decode them.
    const uddgMatch = /uddg=([^&]+)/.exec(href);
    if (uddgMatch) {
      try {
        href = decodeURIComponent(uddgMatch[1]);
      } catch {
        // keep raw href if decoding fails
      }
    }
    if (!/^https?:\/\//i.test(href)) continue;
    const title = decodeEntities(titleHtml.replace(/<[^>]+>/g, "").trim());
    if (!title) continue;
    // Description follows inside the next result__snippet element; take the
    // snippet only if it appears before the next result anchor.
    const afterLink = html.slice(blockMatch.index + blockMatch[0].length, blockMatch.index + blockMatch[0].length + 2000);
    const snippetMatch = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/.exec(afterLink);
    const snippet = snippetMatch ? decodeEntities(snippetMatch[1].replace(/<[^>]+>/g, "").trim()) : "";
    results.push({ title, url: href, snippet });
  }
  return results;
}
