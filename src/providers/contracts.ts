import type { ProviderResult } from "@/src/domain/types";
import type { z } from "zod";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface SearchProvider {
  id: string;
  searchWeb(query: string, options?: { count?: number }): Promise<ProviderResult<SearchResult[]>>;
}

export interface RetrievedDocument {
  url: string;
  finalUrl: string;
  status: "retrieved" | "unavailable" | "blocked" | "failed";
  contentType?: string;
  title?: string;
  text?: string;
  byteLength: number;
  fetchedAt: string;
  fingerprint?: string;
  sourceTier: "tier_1" | "tier_2" | "tier_3";
  diagnostics?: Record<string, unknown>;
}

export interface RetrievalProvider {
  id: string;
  retrieveDocument(url: string): Promise<ProviderResult<RetrievedDocument>>;
}

export type StructuredTaskType = "extract_evidence" | "workflow_hypothesis" | "automation_opportunity" | "genericness_critic";

export interface ModelProvider {
  id: string;
  runStructuredModel<T>(taskType: StructuredTaskType, input: unknown, schema: z.ZodType<T>): Promise<ProviderResult<T>>;
}
