import Link from "next/link";
import { getDashboardReadModel } from "@/src/application/read-models";
import { ButtonLink, EmptyState, PageHeading, SectionHeading, ScoreMark, StatusBadge } from "@/src/ui/components";
import { Icon } from "@/src/ui/icons";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const data = await getDashboardReadModel();
  const passing = data.opportunities.filter((row) => row.gate?.passed && row.scorecard);
  const rejected = data.opportunities.filter((row) => row.gate && !row.gate.passed);
  return (
    <main className="page-shell">
      <PageHeading title="Opportunity ledger" description="A small set of evidence-backed automation hypotheses, with rejected ideas kept visible for audit." action={<ButtonLink href="/scout-runs" variant="primary"><Icon name="plus" size={15} />Research a company</ButtonLink>} />
      <div className="stat-strip" aria-label="Opportunity summary"><div className="stat-cell"><span className="stat-value">{passing.length}</span><span className="stat-label">quality gate passed</span></div><div className="stat-cell"><span className="stat-value">{rejected.length}</span><span className="stat-label">held by a gate</span></div><div className="stat-cell"><span className="stat-value">{passing.filter((row) => row.opportunity.rankingConfidence === "high").length}</span><span className="stat-label">high confidence</span></div><div className="stat-cell"><span className="stat-value">{passing.filter((row) => !data.reviewedOpportunityIds.has(row.opportunity.id)).length}</span><span className="stat-label">awaiting review</span></div></div>
      <section aria-labelledby="passing-title"><SectionHeading title="Ready for human review" detail="Passing the gate does not mean true. It means the evidence and proposal are inspectable." action={<span>{passing.length} opportunities</span>} />{passing.length ? <div className="opportunity-list">{passing.map((row) => <article className="opportunity-row" key={row.opportunity.id}><div><h2><Link href={`/opportunities/${row.opportunity.id}`}>{row.opportunity.proposedSystem}</Link></h2><p>{row.company.canonicalName} · {row.opportunity.measurableOutcome}</p></div><span className="opportunity-company">{row.opportunity.evidenceStrength} evidence</span><ScoreMark score={row.scorecard?.totalScore} confidence={row.opportunity.rankingConfidence} /><StatusBadge value={data.reviewedOpportunityIds.has(row.opportunity.id) ? "reviewed" : "needs review"} tone={data.reviewedOpportunityIds.has(row.opportunity.id) ? "neutral" : "warning"} /></article>)}</div> : <EmptyState title="No valid opportunities" description="A no-opportunity result is valid. Start a fixture run to exercise a specific evidence-backed proposal." />}</section>
      <section className="run-list" aria-labelledby="rejected-title"><SectionHeading title="Rejected by quality gate" detail="Failures stay visible so the system can be challenged." action={<span>{rejected.length} held</span>} />{rejected.length ? <div className="opportunity-list">{rejected.map((row) => <article className="opportunity-row" key={row.opportunity.id}><div><h2><Link href={`/opportunities/${row.opportunity.id}`}>{row.opportunity.proposedSystem}</Link></h2><p>{row.company.canonicalName} · {row.gate?.failureCodes.join(", ")}</p></div><span className="opportunity-company">{row.opportunity.genericnessStatus}</span><span className="table-subtitle">not ranked</span><StatusBadge value="rejected" tone="danger" /></article>)}</div> : <EmptyState title="No rejected proposals" description="Rejected ideas will appear here with the exact gate reasons." />}</section>
    </main>
  );
}
