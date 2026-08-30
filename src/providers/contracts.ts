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

export type StructuredTaskType =
  | "extract_evidence"
  | "workflow_hypothesis"
  | "automation_opportunity"
  | "genericness_critic"
  | "people_candidates"
  | "outreach_angle"
  | "draft_compose";

export interface ModelProvider {
  id: string;
  runStructuredModel<T>(taskType: StructuredTaskType, input: unknown, schema: z.ZodType<T>): Promise<ProviderResult<T>>;
}

export interface PersonCandidate {
  fullName: string;
  roleTitle?: string | null;
  function?: string | null;
  seniority?: string | null;
  profileUrl?: string | null;
  profilePlatform?: string | null;
  sourceUrl?: string | null;
  sourceTier?: "tier_1" | "tier_2" | "tier_3";
  contactValue?: string | null;
  contactChannel?: "public_professional_email" | "public_profile_url" | "company_contact_form" | "other" | null;
  confidence?: "high" | "medium" | "low";
  sourceLocator?: string | null;
}

export interface PeopleProvider {
  id: string;
  findProfessionalCandidates(company: { name: string; domain: string }, roleQuestions: string[]): Promise<ProviderResult<PersonCandidate[]>>;
}

export interface GmailDraftInput {
  to: string;
  subject: string;
  body: string;
  headers?: Record<string, string>;
}

export interface GmailDraftResult {
  draftId: string;
  messageId?: string;
}

export interface GmailDraftProvider {
  id: string;
  createDraft(input: GmailDraftInput): Promise<ProviderResult<GmailDraftResult>>;
}
