import { getEnv } from "@/src/infrastructure/config/env";
import { SafeHttpRetrievalProvider } from "@/src/infrastructure/retrieval/safe-http";
import { FixtureModelProvider, FixtureRetrievalProvider, FixtureSearchProvider } from "@/src/providers/fixtures";
import { BraveSearchProvider } from "@/src/providers/live-search";
import { OpenAICompatibleModelProvider } from "@/src/providers/live-model";
import type { ModelProvider, RetrievalProvider, SearchProvider } from "@/src/providers/contracts";

export interface Providers {
  search: SearchProvider;
  retrieval: RetrievalProvider;
  model: ModelProvider;
}

export function getProviders(): Providers {
  const env = getEnv();
  return {
    search: env.SEARCH_PROVIDER === "fixture" ? new FixtureSearchProvider() : new BraveSearchProvider(),
    retrieval: env.SEARCH_PROVIDER === "fixture" ? new FixtureRetrievalProvider() : new SafeHttpRetrievalProvider(),
    model: env.MODEL_PROVIDER === "fixture" ? new FixtureModelProvider() : new OpenAICompatibleModelProvider(),
  };
}
