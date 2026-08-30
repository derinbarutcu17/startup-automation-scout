"use client";

import { useFormStatus } from "react-dom";
import { reviewOpportunityAction } from "@/src/application/web-actions";
import { Icon } from "@/src/ui/icons";

function SubmitButton({ decision }: { decision: string }) {
  const { pending } = useFormStatus();
  return <button className={`button ${decision === "reject" ? "button-danger" : "button-primary"}`} type="submit" disabled={pending}><Icon name={pending ? "clock" : decision === "reject" ? "x" : "check"} size={15} />{pending ? "Saving..." : decision.charAt(0).toUpperCase() + decision.slice(1)}</button>;
}

export function ReviewForm({ opportunityId, currentDecision }: { opportunityId: string; currentDecision?: string | null }) {
  return (
    <form className="review-form" action={reviewOpportunityAction}>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div className="review-options" role="group" aria-label="Review decision">
        {(["reject", "investigate", "prototype", "archive"] as const).map((decision) => <div className="review-option" key={decision}><input id={`decision-${decision}`} type="radio" name="decision" value={decision} defaultChecked={currentDecision === decision} required /><label htmlFor={`decision-${decision}`}>{decision}</label></div>)}
      </div>
      <label htmlFor="note">Reviewer note <span>(optional)</span></label>
      <textarea id="note" name="note" rows={3} placeholder="What should be remembered about this decision?" />
      <div className="review-submit-row"><SubmitButton decision={currentDecision ?? "save"} /><span>History is append-only. Nothing is deleted.</span></div>
    </form>
  );
}
