import type { SearchProvider, SearchResult } from "@/src/providers/contracts";
import type { ProviderResult } from "@/src/domain/types";

export class FallbackSearchProvider implements SearchProvider {
  id: string;

  constructor(private readonly primary: SearchProvider, private readonly fallback: SearchProvider) {
    this.id = primary.id;
  }

  async searchWeb(query: string, options: { count?: number } = {}): Promise<ProviderResult<SearchResult[]>> {
    const primary = await this.primary.searchWeb(query, options);
    if (primary.ok) return primary;
    if (!primary.retryable) return primary;
    const fallback = await this.fallback.searchWeb(query, options);
    if (fallback.ok) return fallback;
    return { ...fallback, message: `${primary.message}; fallback: ${fallback.message}` };
  }
}
