import { afterEach, describe, expect, it, vi } from "vitest";
import { DdgSearchProvider, parseDdgResults } from "@/src/providers/ddg-search";

describe("DuckDuckGo provider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses redirect URLs and snippets", () => {
    const html = '<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fabout">Example</a><a class="result__snippet">About Example</a>';
    expect(parseDdgResults(html)).toEqual([{ title: "Example", url: "https://example.com/about", snippet: "About Example" }]);
  });

  it("maps an HTTP failure to a provider result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    await expect(new DdgSearchProvider().searchWeb("Berlin startup")).resolves.toMatchObject({ ok: false, category: "rate_limited", retryable: true });
  });

  it("recognizes DuckDuckGo's bot challenge even when it returns HTTP 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Unfortunately, bots use DuckDuckGo too.")));
    await expect(new DdgSearchProvider().searchWeb("Berlin startup")).resolves.toMatchObject({ ok: false, category: "rate_limited", retryable: true });
  });
});
