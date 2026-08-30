CREATE TYPE "public"."contact_channel_type" AS ENUM('public_professional_email', 'public_profile_url', 'company_contact_form', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_point_status" AS ENUM('candidate', 'source_verified', 'user_confirmed', 'rejected', 'stale', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."draft_state" AS ENUM('generated', 'reviewed', 'approved', 'rejected', 'withdrawn', 'gmail_draft_created');--> statement-breakpoint
CREATE TYPE "public"."person_profile_status" AS ENUM('candidate', 'reviewed', 'rejected', 'stale', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."prospect_job_status" AS ENUM('pending', 'running', 'succeeded', 'failed_retryable', 'failed_terminal', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."prospect_job_type" AS ENUM('people_research', 'angle_generation', 'draft_generation', 'handoff_export');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('not_started', 'person_research_requested', 'person_research_ready', 'angle_review', 'drafts_ready', 'approved_for_gmail_draft', 'gmail_draft_created', 'suppressed', 'stale', 'failed');--> statement-breakpoint
CREATE TABLE "contact_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_profile_id" uuid,
	"company_id" uuid,
	"channel_type" "contact_channel_type" NOT NULL,
	"normalized_value" text NOT NULL,
	"display_value" text NOT NULL,
	"encrypted_value" text,
	"source_document_id" uuid,
	"user_supplied" boolean DEFAULT false NOT NULL,
	"status" "contact_point_status" DEFAULT 'candidate' NOT NULL,
	"confidence" "confidence" DEFAULT 'medium' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone,
	"discovery_method" text NOT NULL,
	"restriction_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_points_person_value_unique" UNIQUE("person_profile_id","normalized_value")
);
--> statement-breakpoint
CREATE TABLE "gmail_draft_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_dossier_id" uuid NOT NULL,
	"approval_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"requested_draft_ids" jsonb NOT NULL,
	"succeeded_draft_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failed_draft_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gmail_draft_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_response" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gmail_draft_results_idempotency_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "message_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outreach_sequence_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"purpose" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"contact_point_id" uuid,
	"evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"claim_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"personalization_notes" text,
	"state" "draft_state" DEFAULT 'generated' NOT NULL,
	"model_version" text,
	"prompt_version" text,
	"content_fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_drafts_sequence_step_unique" UNIQUE("outreach_sequence_id","step_number")
);
--> statement-breakpoint
CREATE TABLE "outreach_angles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_dossier_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"target_person_id" uuid,
	"target_role" text,
	"title" text NOT NULL,
	"thesis" text NOT NULL,
	"verified_signal" text NOT NULL,
	"workflow_hypothesis" text NOT NULL,
	"relevance_reason" text NOT NULL,
	"value_hypothesis" text NOT NULL,
	"call_to_action" text NOT NULL,
	"evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"claim_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"person_claim_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alternative_explanations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmation_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" "confidence" DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"review_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" text NOT NULL,
	"prospect_dossier_id" uuid NOT NULL,
	"draft_batch_ids" jsonb NOT NULL,
	"content_fingerprint" text NOT NULL,
	"approver_identity" text NOT NULL,
	"result" text,
	"rejection_reason" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_approvals_fingerprint_unique" UNIQUE("prospect_dossier_id","content_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "outreach_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_dossier_id" uuid NOT NULL,
	"outreach_angle_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_sequences_dossier_angle_unique" UNIQUE("prospect_dossier_id","outreach_angle_id")
);
--> statement-breakpoint
CREATE TABLE "person_claim_evidence" (
	"person_claim_id" uuid NOT NULL,
	"evidence_item_id" uuid NOT NULL,
	"relation" "claim_evidence_relation" NOT NULL,
	CONSTRAINT "person_claim_evidence_person_claim_id_evidence_item_id_relation_pk" PRIMARY KEY("person_claim_id","evidence_item_id","relation")
);
--> statement-breakpoint
CREATE TABLE "person_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_profile_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"claim_text" text NOT NULL,
	"claim_type" "claim_type" NOT NULL,
	"confidence" "confidence" NOT NULL,
	"reasoning_summary" text,
	"alternative_explanation" text,
	"confirmation_question" text,
	"contradiction_status" text DEFAULT 'none' NOT NULL,
	"freshness_status" text DEFAULT 'fresh' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_claims_person_subject_text_type_unique" UNIQUE("person_profile_id","subject","claim_text","claim_type")
);
--> statement-breakpoint
CREATE TABLE "person_profile_evidence" (
	"person_profile_id" uuid NOT NULL,
	"evidence_item_id" uuid NOT NULL,
	CONSTRAINT "person_profile_evidence_person_profile_id_evidence_item_id_pk" PRIMARY KEY("person_profile_id","evidence_item_id")
);
--> statement-breakpoint
CREATE TABLE "person_profile_sources" (
	"person_profile_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	CONSTRAINT "person_profile_sources_person_profile_id_source_document_id_pk" PRIMARY KEY("person_profile_id","source_document_id")
);
--> statement-breakpoint
CREATE TABLE "person_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"role_title" text,
	"function" text,
	"seniority" text,
	"profile_url" text,
	"profile_platform" text,
	"status" "person_profile_status" DEFAULT 'candidate' NOT NULL,
	"discovery_method" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_verified_at" timestamp with time zone,
	"uncertainty_notes" text,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_profiles_company_name_url_unique" UNIQUE("company_id","normalized_name","profile_url")
);
--> statement-breakpoint
CREATE TABLE "prospect_dossier_persons" (
	"prospect_dossier_id" uuid NOT NULL,
	"person_profile_id" uuid NOT NULL,
	CONSTRAINT "prospect_dossier_persons_prospect_dossier_id_person_profile_id_pk" PRIMARY KEY("prospect_dossier_id","person_profile_id")
);
--> statement-breakpoint
CREATE TABLE "prospect_dossiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"research_dossier_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"version" integer NOT NULL,
	"schema_version" text DEFAULT 'prospect-dossier.v1' NOT NULL,
	"status" "prospect_status" DEFAULT 'not_started' NOT NULL,
	"readiness_reason" text,
	"target_role" text,
	"outreach_objective" text,
	"known_unknowns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"open_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_coverage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"freshness_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_fingerprint" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_dossiers_company_version_unique" UNIQUE("company_id","research_dossier_id","version")
);
--> statement-breakpoint
CREATE TABLE "prospect_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_dossier_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"opportunity_id" uuid,
	"job_type" "prospect_job_type" NOT NULL,
	"status" "prospect_job_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"input_fingerprint" text NOT NULL,
	"output_fingerprint" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_category" text,
	"last_error_message" text,
	"lease_owner" text,
	"claimed_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approval_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospect_jobs_idempotency_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "suppression_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"normalized_value" text NOT NULL,
	"reason" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppression_scope_value_unique" UNIQUE("scope","normalized_value")
);
--> statement-breakpoint
ALTER TABLE "contact_points" ADD CONSTRAINT "contact_points_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_points" ADD CONSTRAINT "contact_points_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_points" ADD CONSTRAINT "contact_points_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_draft_results" ADD CONSTRAINT "gmail_draft_results_prospect_dossier_id_prospect_dossiers_id_fk" FOREIGN KEY ("prospect_dossier_id") REFERENCES "public"."prospect_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gmail_draft_results" ADD CONSTRAINT "gmail_draft_results_approval_id_outreach_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."outreach_approvals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_drafts" ADD CONSTRAINT "message_drafts_outreach_sequence_id_outreach_sequences_id_fk" FOREIGN KEY ("outreach_sequence_id") REFERENCES "public"."outreach_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_drafts" ADD CONSTRAINT "message_drafts_contact_point_id_contact_points_id_fk" FOREIGN KEY ("contact_point_id") REFERENCES "public"."contact_points"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_angles" ADD CONSTRAINT "outreach_angles_prospect_dossier_id_prospect_dossiers_id_fk" FOREIGN KEY ("prospect_dossier_id") REFERENCES "public"."prospect_dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_angles" ADD CONSTRAINT "outreach_angles_opportunity_id_automation_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."automation_opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_angles" ADD CONSTRAINT "outreach_angles_target_person_id_person_profiles_id_fk" FOREIGN KEY ("target_person_id") REFERENCES "public"."person_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_approvals" ADD CONSTRAINT "outreach_approvals_prospect_dossier_id_prospect_dossiers_id_fk" FOREIGN KEY ("prospect_dossier_id") REFERENCES "public"."prospect_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequences" ADD CONSTRAINT "outreach_sequences_prospect_dossier_id_prospect_dossiers_id_fk" FOREIGN KEY ("prospect_dossier_id") REFERENCES "public"."prospect_dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_sequences" ADD CONSTRAINT "outreach_sequences_outreach_angle_id_outreach_angles_id_fk" FOREIGN KEY ("outreach_angle_id") REFERENCES "public"."outreach_angles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_claim_evidence" ADD CONSTRAINT "person_claim_evidence_person_claim_id_person_claims_id_fk" FOREIGN KEY ("person_claim_id") REFERENCES "public"."person_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_claim_evidence" ADD CONSTRAINT "person_claim_evidence_evidence_item_id_evidence_items_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_claims" ADD CONSTRAINT "person_claims_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_claims" ADD CONSTRAINT "person_claims_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_profile_evidence" ADD CONSTRAINT "person_profile_evidence_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_profile_evidence" ADD CONSTRAINT "person_profile_evidence_evidence_item_id_evidence_items_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_profile_sources" ADD CONSTRAINT "person_profile_sources_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_profile_sources" ADD CONSTRAINT "person_profile_sources_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_profiles" ADD CONSTRAINT "person_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_dossier_persons" ADD CONSTRAINT "prospect_dossier_persons_prospect_dossier_id_prospect_dossiers_id_fk" FOREIGN KEY ("prospect_dossier_id") REFERENCES "public"."prospect_dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_dossier_persons" ADD CONSTRAINT "prospect_dossier_persons_person_profile_id_person_profiles_id_fk" FOREIGN KEY ("person_profile_id") REFERENCES "public"."person_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_dossiers" ADD CONSTRAINT "prospect_dossiers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_dossiers" ADD CONSTRAINT "prospect_dossiers_research_dossier_id_research_dossiers_id_fk" FOREIGN KEY ("research_dossier_id") REFERENCES "public"."research_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_dossiers" ADD CONSTRAINT "prospect_dossiers_opportunity_id_automation_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."automation_opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_jobs" ADD CONSTRAINT "prospect_jobs_prospect_dossier_id_prospect_dossiers_id_fk" FOREIGN KEY ("prospect_dossier_id") REFERENCES "public"."prospect_dossiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_jobs" ADD CONSTRAINT "prospect_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_jobs" ADD CONSTRAINT "prospect_jobs_opportunity_id_automation_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."automation_opportunities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_jobs" ADD CONSTRAINT "prospect_jobs_approval_id_outreach_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."outreach_approvals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_points_person_idx" ON "contact_points" USING btree ("person_profile_id","status");--> statement-breakpoint
CREATE INDEX "contact_points_company_idx" ON "contact_points" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "contact_points_normalized_idx" ON "contact_points" USING btree ("normalized_value");--> statement-breakpoint
CREATE INDEX "gmail_draft_results_dossier_idx" ON "gmail_draft_results" USING btree ("prospect_dossier_id","created_at");--> statement-breakpoint
CREATE INDEX "message_drafts_sequence_idx" ON "message_drafts" USING btree ("outreach_sequence_id","step_number");--> statement-breakpoint
CREATE INDEX "outreach_angles_dossier_idx" ON "outreach_angles" USING btree ("prospect_dossier_id","status");--> statement-breakpoint
CREATE INDEX "outreach_angles_opportunity_idx" ON "outreach_angles" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "outreach_approvals_dossier_idx" ON "outreach_approvals" USING btree ("prospect_dossier_id","created_at");--> statement-breakpoint
CREATE INDEX "outreach_sequences_dossier_idx" ON "outreach_sequences" USING btree ("prospect_dossier_id");--> statement-breakpoint
CREATE INDEX "person_claims_company_idx" ON "person_claims" USING btree ("company_id","claim_type");--> statement-breakpoint
CREATE INDEX "person_profiles_company_idx" ON "person_profiles" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "prospect_dossiers_company_status_idx" ON "prospect_dossiers" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "prospect_dossiers_opportunity_idx" ON "prospect_dossiers" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "prospect_jobs_claim_idx" ON "prospect_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "prospect_jobs_lease_idx" ON "prospect_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "prospect_jobs_dossier_idx" ON "prospect_jobs" USING btree ("prospect_dossier_id","status");--> statement-breakpoint
CREATE INDEX "suppression_value_idx" ON "suppression_records" USING btree ("normalized_value");