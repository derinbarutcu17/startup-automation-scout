import { getEnv } from "@/src/infrastructure/config/env";
import { SafeHttpRetrievalProvider } from "@/src/infrastructure/retrieval/safe-http";
import { FixtureModelProvider, FixtureRetrievalProvider, FixtureSearchProvider } from "@/src/providers/fixtures";
import { BraveSearchProvider } from "@/src/providers/live-search";
import { DdgSearchProvider } from "@/src/providers/ddg-search";
import { OpenAICompatibleModelProvider } from "@/src/providers/live-model";
import type { ModelProvider, RetrievalProvider, SearchProvider } from "@/src/providers/contracts";
import { SearchPeopleProvider } from "@/src/providers/live-people";
import { SearxSearchProvider } from "@/src/providers/searx-search";
import { FallbackSearchProvider } from "@/src/providers/fallback-search";

export interface Providers {
  search: SearchProvider;
  retrieval: RetrievalProvider;
  model: ModelProvider;
  people: SearchPeopleProvider | null;
}

export function getProviders(): Providers {
  const env = getEnv();
  const search = env.SEARCH_PROVIDER === "fixture" ? new FixtureSearchProvider() : env.SEARCH_PROVIDER === "ddg" ? new FallbackSearchProvider(new DdgSearchProvider(), new SearxSearchProvider()) : new BraveSearchProvider();
  const retrieval = env.SEARCH_PROVIDER === "fixture" ? new FixtureRetrievalProvider() : new SafeHttpRetrievalProvider();
  const model = env.MODEL_PROVIDER === "fixture" ? new FixtureModelProvider() : new OpenAICompatibleModelProvider();
  return {
    search,
    retrieval,
    model,
    people: env.SEARCH_PROVIDER === "fixture" && env.MODEL_PROVIDER === "fixture" ? null : new SearchPeopleProvider(search, retrieval, model),
  };
}
