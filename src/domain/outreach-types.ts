import { z } from "zod";

export const outreachAngleSchema = z.object({
  title: z.string().min(5),
  thesis: z.string().min(10),
  verifiedSignal: z.string().min(10),
  workflowHypothesis: z.string().min(10),
  relevanceReason: z.string().min(10),
  valueHypothesis: z.string().min(10),
  callToAction: z.string().min(10),
  evidenceIds: z.array(z.string()).default([]),
  claimIds: z.array(z.string()).default([]),
  personClaimIds: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  alternativeExplanations: z.array(z.string()).default([]),
  confirmationQuestions: z.array(z.string()).min(1),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});
export type OutreachAngleInput = z.infer<typeof outreachAngleSchema>;

export const draftComposeSchema = z.object({
  drafts: z.array(
    z.object({
      stepNumber: z.number().int().min(1).max(3),
      purpose: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(10),
      evidenceIds: z.array(z.string()).default([]),
      claimIds: z.array(z.string()).default([]),
      personalizationNotes: z.string().nullable().optional(),
    }),
  ).min(1).max(3),
});
export type DraftComposeOutput = z.infer<typeof draftComposeSchema>;

export const prospectDossierSchemaVersion = "prospect-dossier.v1" as const;

export interface HermesBundle {
  markdown: string;
  json: Record<string, unknown>;
  fingerprint: string;
  version: typeof prospectDossierSchemaVersion;
}
