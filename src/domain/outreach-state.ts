export type ProspectStatus =
  | "not_started"
  | "person_research_requested"
  | "person_research_ready"
  | "angle_review"
  | "drafts_ready"
  | "approved_for_gmail_draft"
  | "gmail_draft_created"
  | "suppressed"
  | "stale"
  | "failed";

const allowed: Record<ProspectStatus, ProspectStatus[]> = {
  not_started: ["person_research_requested", "suppressed", "failed"],
  person_research_requested: ["person_research_ready", "suppressed", "stale", "failed"],
  person_research_ready: ["angle_review", "suppressed", "stale", "failed"],
  angle_review: ["drafts_ready", "suppressed", "stale", "failed"],
  drafts_ready: ["approved_for_gmail_draft", "suppressed", "stale", "failed"],
  approved_for_gmail_draft: ["drafts_ready", "gmail_draft_created", "suppressed", "stale", "failed"],
  gmail_draft_created: ["suppressed", "stale"],
  suppressed: [],
  stale: ["not_started", "person_research_requested", "failed"],
  failed: ["not_started", "person_research_requested"],
};

export function canTransition(from: ProspectStatus, to: ProspectStatus): boolean {
  return (allowed[from] ?? []).includes(to);
}

export function assertTransition(from: ProspectStatus, to: ProspectStatus): void {
  if (!canTransition(from, to)) throw new Error(`invalid_prospect_transition:${from}->${to}`);
}

// Enforces that person_research_ready -> drafts_ready is invalid without intermediate angle_review + evidence checks
export function validateStateJump(from: ProspectStatus, to: ProspectStatus, context?: { hasAngle?: boolean; hasEvidence?: boolean; reviewed?: boolean }): void {
  assertTransition(from, to);
  if (to === "approved_for_gmail_draft") {
    if (!context?.hasAngle || !context?.hasEvidence || !context?.reviewed) {
      throw new Error("approval_requires_angle_evidence_review");
    }
  }
}
