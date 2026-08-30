import { getEnv } from "@/src/infrastructure/config/env";
import { SafeHttpRetrievalProvider } from "@/src/infrastructure/retrieval/safe-http";
import { FixtureModelProvider, FixtureRetrievalProvider, FixtureSearchProvider } from "@/src/providers/fixtures";
import { BraveSearchProvider } from "@/src/providers/live-search";
import { OpenAICompatibleModelProvider } from "@/src/providers/live-model";
import type { ModelProvider, RetrievalProvider, SearchProvider } from "@/src/providers/contracts";
import { SearchPeopleProvider } from "@/src/providers/live-people";

export interface Providers {
  search: SearchProvider;
  retrieval: RetrievalProvider;
  model: ModelProvider;
  people: SearchPeopleProvider | null;
}

export function getProviders(): Providers {
  const env = getEnv();
  const search = env.SEARCH_PROVIDER === "fixture" ? new FixtureSearchProvider() : new BraveSearchProvider();
  const retrieval = env.SEARCH_PROVIDER === "fixture" ? new FixtureRetrievalProvider() : new SafeHttpRetrievalProvider();
  const model = env.MODEL_PROVIDER === "fixture" ? new FixtureModelProvider() : new OpenAICompatibleModelProvider();
  return {
    search,
    retrieval,
    model,
    people: env.SEARCH_PROVIDER === "fixture" && env.MODEL_PROVIDER === "fixture" ? null : new SearchPeopleProvider(search, retrieval, model),
  };
}
