import type { SearchResult } from "@/src/providers/contracts";

function clean(value: string): string {
  return value.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function filterRelevantSearchResults(results: SearchResult[], company: { canonicalName: string; canonicalDomain: string }): SearchResult[] {
  const name = clean(company.canonicalName);
  const domain = clean(company.canonicalDomain).replace(/ /g, "");
  return results.filter((result) => {
    try {
      const host = clean(new URL(result.url).hostname).replace(/ /g, "");
      if (host === domain || host.endsWith(`.${domain}`)) return true;
      const searchable = clean(`${result.title} ${result.snippet} ${result.url}`);
      return name.length >= 3 && searchable.includes(name);
    } catch {
      return false;
    }
  });
}
