ALTER TABLE "automation_opportunities" ADD CONSTRAINT "automation_opportunities_hypothesis_unique" UNIQUE("workflow_hypothesis_id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_company_subject_text_type_unique" UNIQUE("company_id","subject","claim_text","claim_type");--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_source_content_locator_unique" UNIQUE("source_document_id","normalized_content","source_locator");--> statement-breakpoint
ALTER TABLE "recent_signals" ADD CONSTRAINT "recent_signals_company_type_label_unique" UNIQUE("company_id","signal_type","label");--> statement-breakpoint
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_target_rubric_unique" UNIQUE("target_type","target_id","rubric_version");--> statement-breakpoint
ALTER TABLE "workflow_hypotheses" ADD CONSTRAINT "workflow_hypotheses_dossier_unique" UNIQUE("research_dossier_id");