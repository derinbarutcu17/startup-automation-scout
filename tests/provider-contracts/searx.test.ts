import { describe, expect, it } from "vitest";
import { parseSearxHtml, parseSearxJson } from "@/src/providers/searx-search";
import { FallbackSearchProvider } from "@/src/providers/fallback-search";

describe("SearXNG fallback", () => {
  it("parses the documented JSON result shape", () => {
    expect(parseSearxJson({ results: [{ title: "Example", url: "https://example.com", content: "A result" }, { title: "bad", url: "not-a-url" }] })).toEqual([{ title: "Example", url: "https://example.com", snippet: "A result", publishedAt: undefined }]);
  });

  it("parses HTML when a public instance disables JSON", () => {
    expect(parseSearxHtml('<a class="result_header" href="https://example.com">Example</a><div class="result-content">A result</div>')).toEqual([{ title: "Example", url: "https://example.com", snippet: "A result" }]);
    expect(parseSearxHtml('<h4 class="result_header"><a href="https://example.org">Example Org</a></h4><p class="result-content">Another result</p>')).toEqual([{ title: "Example Org", url: "https://example.org", snippet: "Another result" }]);
  });

  it("uses the fallback after a retryable DDG failure", async () => {
    const primary = { id: "ddg", searchWeb: async () => ({ ok: false as const, category: "rate_limited" as const, retryable: true, message: "blocked" }) };
    const fallback = { id: "searxng", searchWeb: async () => ({ ok: true as const, value: [{ title: "Example", url: "https://example.com", snippet: "" }], usage: { providerId: "searxng", operation: "search", requestCount: 1, latencyMs: 1 } }) };
    await expect(new FallbackSearchProvider(primary, fallback).searchWeb("Example")).resolves.toMatchObject({ ok: true, value: [{ title: "Example" }] });
  });
});
