CREATE TYPE "public"."claim_evidence_relation" AS ENUM('supports', 'contradicts', 'motivates');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('verified', 'inferred', 'estimated', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."genericness_status" AS ENUM('specific', 'borderline', 'generic');--> statement-breakpoint
CREATE TYPE "public"."retrieval_status" AS ENUM('retrieved', 'unavailable', 'blocked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."review_decision_value" AS ENUM('reject', 'investigate', 'prototype', 'archive');--> statement-breakpoint
CREATE TYPE "public"."review_target_type" AS ENUM('company', 'claim', 'workflow_hypothesis', 'automation_opportunity');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('draft', 'queued', 'running', 'partially_succeeded', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."score_target_type" AS ENUM('company', 'automation_opportunity');--> statement-breakpoint
CREATE TYPE "public"."source_tier" AS ENUM('tier_1', 'tier_2', 'tier_3');--> statement-breakpoint
CREATE TYPE "public"."strength_level" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."work_stage" AS ENUM('identity', 'eligibility', 'research', 'evidence', 'workflow_hypothesis', 'opportunity', 'quality_gate', 'scoring');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('pending', 'running', 'succeeded', 'failed_retryable', 'failed_terminal', 'cancelled');--> statement-breakpoint
CREATE TABLE "automation_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_hypothesis_id" uuid NOT NULL,
	"proposed_system" text NOT NULL,
	"deterministic_steps" jsonb NOT NULL,
	"ai_required_steps" jsonb NOT NULL,
	"required_integrations" jsonb NOT NULL,
	"required_private_access" jsonb NOT NULL,
	"measurable_outcome" text NOT NULL,
	"buildability" "strength_level" NOT NULL,
	"evidence_strength" "strength_level" NOT NULL,
	"genericness_status" "genericness_status" NOT NULL,
	"risks" jsonb NOT NULL,
	"next_validation_step" text NOT NULL,
	"ranking_confidence" "confidence" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scout_run_id" uuid NOT NULL,
	"company_id" uuid,
	"work_item_id" uuid,
	"idempotency_key" text NOT NULL,
	"provider_id" text NOT NULL,
	"operation" text NOT NULL,
	"stage" text NOT NULL,
	"reserved_amount_eur" numeric(12, 4) DEFAULT '0' NOT NULL,
	"actual_amount_eur" numeric(12, 4) DEFAULT '0' NOT NULL,
	"search_requests" integer DEFAULT 0 NOT NULL,
	"model_spend_eur" numeric(12, 4) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	CONSTRAINT "budget_ledger_run_idempotency_unique" UNIQUE("scout_run_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"claim_id" uuid NOT NULL,
	"evidence_item_id" uuid NOT NULL,
	"relation" "claim_evidence_relation" NOT NULL,
	"strength" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "claim_evidence_claim_id_evidence_item_id_relation_pk" PRIMARY KEY("claim_id","evidence_item_id","relation")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"claim_text" text NOT NULL,
	"claim_type" "claim_type" NOT NULL,
	"confidence" "confidence" NOT NULL,
	"temporal_scope" text,
	"contradiction_status" text DEFAULT 'none' NOT NULL,
	"reasoning_summary" text,
	"alternative_explanation" text,
	"confirmation_question" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"canonical_domain" text NOT NULL,
	"normalized_location" text,
	"status" text DEFAULT 'active' NOT NULL,
	"identity_status" text DEFAULT 'resolved' NOT NULL,
	"first_discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_researched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_canonical_domain_unique" UNIQUE("canonical_domain")
);
--> statement-breakpoint
CREATE TABLE "company_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"alias_type" text NOT NULL,
	"normalized_value" text NOT NULL,
	"source_namespace" text DEFAULT 'manual' NOT NULL,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_aliases_identity_unique" UNIQUE("alias_type","normalized_value","source_namespace")
);
--> statement-breakpoint
CREATE TABLE "discovery_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scout_run_id" uuid,
	"company_id" uuid,
	"source_type" text NOT NULL,
	"source_url" text,
	"external_identifier" text,
	"raw_name" text,
	"raw_domain" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dossier_claims" (
	"dossier_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	CONSTRAINT "dossier_claims_dossier_id_claim_id_pk" PRIMARY KEY("dossier_id","claim_id")
);
--> statement-breakpoint
CREATE TABLE "dossier_signals" (
	"dossier_id" uuid NOT NULL,
	"recent_signal_id" uuid NOT NULL,
	CONSTRAINT "dossier_signals_dossier_id_recent_signal_id_pk" PRIMARY KEY("dossier_id","recent_signal_id")
);
--> statement-breakpoint
CREATE TABLE "dossier_source_documents" (
	"dossier_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	CONSTRAINT "dossier_source_documents_dossier_id_source_document_id_pk" PRIMARY KEY("dossier_id","source_document_id")
);
--> statement-breakpoint
CREATE TABLE "eligibility_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"scout_run_id" uuid NOT NULL,
	"eligible" boolean NOT NULL,
	"reason_codes" jsonb NOT NULL,
	"supporting_claim_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unresolved_checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policy_version" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eligibility_company_run_unique" UNIQUE("company_id","scout_run_id")
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_document_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"normalized_content" text NOT NULL,
	"source_locator" text NOT NULL,
	"extraction_method" text NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_diagnostics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scout_run_id" uuid,
	"company_id" uuid,
	"work_item_id" uuid,
	"provider_id" text NOT NULL,
	"operation" text NOT NULL,
	"ok" boolean NOT NULL,
	"category" text,
	"retryable" boolean DEFAULT false NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_eur" numeric(12, 4),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_gate_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"passed" boolean NOT NULL,
	"failure_codes" jsonb NOT NULL,
	"warning_codes" jsonb NOT NULL,
	"checked_evidence_item_ids" jsonb NOT NULL,
	"policy_version" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quality_gate_opportunity_unique" UNIQUE("opportunity_id")
);
--> statement-breakpoint
CREATE TABLE "recent_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"signal_type" text NOT NULL,
	"label" text NOT NULL,
	"occurred_at" timestamp with time zone,
	"claim_id" uuid,
	"evidence_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_dossiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"scout_run_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"known_unknowns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_coverage_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"research_completeness" numeric(5, 4) NOT NULL,
	"research_cost_eur" numeric(12, 4) DEFAULT '0' NOT NULL,
	"conclusion" text DEFAULT 'sufficient' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "research_dossiers_company_run_version_unique" UNIQUE("company_id","scout_run_id","version")
);
--> statement-breakpoint
CREATE TABLE "review_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "review_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"decision" "review_decision_value" NOT NULL,
	"reason_labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" text NOT NULL,
	"scheduled_for_utc" timestamp with time zone NOT NULL,
	"scout_run_id" uuid,
	"outcome" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_occurrence_unique" UNIQUE("schedule_id","scheduled_for_utc")
);
--> statement-breakpoint
CREATE TABLE "scorecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "score_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"rubric_version" text NOT NULL,
	"dimension_values" jsonb NOT NULL,
	"dimension_rationales" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_item_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_score" numeric(7, 3) NOT NULL,
	"gating_failures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scout_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "run_status" DEFAULT 'draft' NOT NULL,
	"current_stage" text DEFAULT 'CREATED' NOT NULL,
	"configuration" jsonb NOT NULL,
	"max_eur" numeric(12, 4) NOT NULL,
	"max_search_requests" integer NOT NULL,
	"max_model_spend_eur" numeric(12, 4) NOT NULL,
	"max_deep_companies" integer NOT NULL,
	"max_runtime_seconds" integer NOT NULL,
	"max_retries_per_work_item" integer NOT NULL,
	"actual_cost_eur" numeric(12, 4) DEFAULT '0' NOT NULL,
	"actual_search_requests" integer DEFAULT 0 NOT NULL,
	"actual_model_spend_eur" numeric(12, 4) DEFAULT '0' NOT NULL,
	"deep_companies_started" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"degradation_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diagnostics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schedule_occurrence_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scout_runs_schedule_occurrence_unique" UNIQUE("schedule_occurrence_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"canonical_url" text NOT NULL,
	"source_tier" "source_tier" NOT NULL,
	"title" text,
	"publisher" text,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_fingerprint" text NOT NULL,
	"retrieval_status" "retrieval_status" NOT NULL,
	"permitted_access_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"extracted_text" text,
	"byte_length" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_documents_version_unique" UNIQUE("company_id","canonical_url","content_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "work_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scout_run_id" uuid NOT NULL,
	"company_id" uuid,
	"stage" "work_stage" NOT NULL,
	"status" "work_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"input_fingerprint" text NOT NULL,
	"output_fingerprint" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_category" text,
	"last_error_message" text,
	"first_attempt_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" text,
	"claimed_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_items_idempotency_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "workflow_hypotheses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"research_dossier_id" uuid NOT NULL,
	"description" text NOT NULL,
	"actors" jsonb NOT NULL,
	"trigger" text NOT NULL,
	"likely_steps" jsonb NOT NULL,
	"pain_hypothesis" text NOT NULL,
	"evidence_item_ids" jsonb NOT NULL,
	"claim_ids" jsonb NOT NULL,
	"assumptions" jsonb NOT NULL,
	"confirmation_questions" jsonb NOT NULL,
	"alternative_explanation" text,
	"confidence" "confidence" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_opportunities" ADD CONSTRAINT "automation_opportunities_workflow_hypothesis_id_workflow_hypotheses_id_fk" FOREIGN KEY ("workflow_hypothesis_id") REFERENCES "public"."workflow_hypotheses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_ledger" ADD CONSTRAINT "budget_ledger_scout_run_id_scout_runs_id_fk" FOREIGN KEY ("scout_run_id") REFERENCES "public"."scout_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_ledger" ADD CONSTRAINT "budget_ledger_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_ledger" ADD CONSTRAINT "budget_ledger_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_evidence_item_id_evidence_items_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_records" ADD CONSTRAINT "discovery_records_scout_run_id_scout_runs_id_fk" FOREIGN KEY ("scout_run_id") REFERENCES "public"."scout_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_records" ADD CONSTRAINT "discovery_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_claims" ADD CONSTRAINT "dossier_claims_dossier_id_research_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."research_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_claims" ADD CONSTRAINT "dossier_claims_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_signals" ADD CONSTRAINT "dossier_signals_dossier_id_research_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."research_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_signals" ADD CONSTRAINT "dossier_signals_recent_signal_id_recent_signals_id_fk" FOREIGN KEY ("recent_signal_id") REFERENCES "public"."recent_signals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_source_documents" ADD CONSTRAINT "dossier_source_documents_dossier_id_research_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."research_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossier_source_documents" ADD CONSTRAINT "dossier_source_documents_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_decisions" ADD CONSTRAINT "eligibility_decisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_decisions" ADD CONSTRAINT "eligibility_decisions_scout_run_id_scout_runs_id_fk" FOREIGN KEY ("scout_run_id") REFERENCES "public"."scout_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_diagnostics" ADD CONSTRAINT "provider_diagnostics_scout_run_id_scout_runs_id_fk" FOREIGN KEY ("scout_run_id") REFERENCES "public"."scout_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_diagnostics" ADD CONSTRAINT "provider_diagnostics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_diagnostics" ADD CONSTRAINT "provider_diagnostics_work_item_id_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_results" ADD CONSTRAINT "quality_gate_results_opportunity_id_automation_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."automation_opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_signals" ADD CONSTRAINT "recent_signals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_signals" ADD CONSTRAINT "recent_signals_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_signals" ADD CONSTRAINT "recent_signals_evidence_item_id_evidence_items_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_dossiers" ADD CONSTRAINT "research_dossiers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_dossiers" ADD CONSTRAINT "research_dossiers_scout_run_id_scout_runs_id_fk" FOREIGN KEY ("scout_run_id") REFERENCES "public"."scout_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_occurrences" ADD CONSTRAINT "schedule_occurrences_scout_run_id_scout_runs_id_fk" FOREIGN KEY ("scout_run_id") REFERENCES "public"."scout_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_scout_run_id_scout_runs_id_fk" FOREIGN KEY ("scout_run_id") REFERENCES "public"."scout_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_hypotheses" ADD CONSTRAINT "workflow_hypotheses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_hypotheses" ADD CONSTRAINT "workflow_hypotheses_research_dossier_id_research_dossiers_id_fk" FOREIGN KEY ("research_dossier_id") REFERENCES "public"."research_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_opportunities_hypothesis_idx" ON "automation_opportunities" USING btree ("workflow_hypothesis_id");--> statement-breakpoint
CREATE INDEX "budget_ledger_run_idx" ON "budget_ledger" USING btree ("scout_run_id","created_at");--> statement-breakpoint
CREATE INDEX "claims_company_type_time_idx" ON "claims" USING btree ("company_id","claim_type","created_at");--> statement-breakpoint
CREATE INDEX "companies_domain_idx" ON "companies" USING btree ("canonical_domain");--> statement-breakpoint
CREATE INDEX "company_aliases_lookup_idx" ON "company_aliases" USING btree ("normalized_value","alias_type");--> statement-breakpoint
CREATE INDEX "discovery_records_run_time_idx" ON "discovery_records" USING btree ("scout_run_id","discovered_at");--> statement-breakpoint
CREATE INDEX "evidence_items_source_idx" ON "evidence_items" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "provider_diagnostics_run_idx" ON "provider_diagnostics" USING btree ("scout_run_id","created_at");--> statement-breakpoint
CREATE INDEX "recent_signals_company_time_idx" ON "recent_signals" USING btree ("company_id","occurred_at");--> statement-breakpoint
CREATE INDEX "research_dossiers_lookup_idx" ON "research_dossiers" USING btree ("company_id","scout_run_id","version");--> statement-breakpoint
CREATE INDEX "review_decisions_target_time_idx" ON "review_decisions" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "scorecards_target_rubric_idx" ON "scorecards" USING btree ("target_type","target_id","rubric_version");--> statement-breakpoint
CREATE INDEX "scout_runs_status_created_idx" ON "scout_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "source_documents_company_url_time_idx" ON "source_documents" USING btree ("company_id","canonical_url","fetched_at");--> statement-breakpoint
CREATE INDEX "source_documents_fingerprint_idx" ON "source_documents" USING btree ("content_fingerprint");--> statement-breakpoint
CREATE INDEX "work_items_claim_idx" ON "work_items" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "work_items_lease_idx" ON "work_items" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "work_items_run_idx" ON "work_items" USING btree ("scout_run_id","status");--> statement-breakpoint
CREATE INDEX "workflow_hypotheses_dossier_idx" ON "workflow_hypotheses" USING btree ("research_dossier_id");