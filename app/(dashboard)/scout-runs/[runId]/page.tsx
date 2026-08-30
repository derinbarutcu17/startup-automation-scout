import Link from "next/link";
import { notFound } from "next/navigation";
import { getRunReadModel } from "@/src/application/read-models";
import { cancelRunAction, startRunAction } from "@/src/application/web-actions";
import { stageSequence } from "@/src/domain/state-machine";
import { BackLink, ButtonLink, EmptyState, SectionHeading, StatusBadge, formatDate, formatDateTime } from "@/src/ui/components";
import { RefreshOnProgress } from "@/src/ui/refresh-on-progress";
import { Icon } from "@/src/ui/icons";

export const dynamic = "force-dynamic";

function scopeFor(configuration: Record<string, unknown>) {
  return Array.isArray(configuration.geographicScope) ? configuration.geographicScope.join(" / ") : "Berlin / Germany";
}

export default async function ScoutRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const data = await getRunReadModel(runId);
  if (!data) notFound();
  const { run } = data;
  const currentIndex = stageSequence.indexOf(run.currentStage as (typeof stageSequence)[number]);
  const isActive = run.status === "running" || run.status === "queued";
  const companyRows = data.companies.filter((row) => row.company);

  return (
    <main className="page-shell">
      <BackLink href="/scout-runs">All Scout Runs</BackLink>
      <div className="run-hero">
        <div><h1>Scout Run <span className="mono-light">{run.id.slice(0, 8)}</span></h1><p>{scopeFor(run.configuration)} · created {formatDateTime(run.createdAt)}</p><div className="run-status"><StatusBadge value={run.status} /><span className="table-subtitle">{run.degradationWarnings.length ? `${run.degradationWarnings.length} degradation warning` : "No degradation warnings"}</span></div><RefreshOnProgress active={isActive} /></div>
        <div className="run-actions">{run.status === "draft" && <form action={startRunAction}><input type="hidden" name="runId" value={run.id} /><button className="button button-primary" type="submit"><Icon name="play" size={15} />Start run</button></form>}{isActive && <form action={cancelRunAction}><input type="hidden" name="runId" value={run.id} /><button className="button button-danger" type="submit"><Icon name="pause" size={15} />Stop future work</button></form>}<ButtonLink href={`/reports/${run.id}`} variant="secondary"><Icon name="file" size={15} />Report</ButtonLink></div>
      </div>

      <div className="pipeline" aria-label="Run pipeline">
        {stageSequence.map((stage, index) => <div className={`pipeline-step${index < currentIndex ? " is-done" : ""}${index === currentIndex ? " is-current" : ""}`} key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage.replaceAll("_", " ")}</strong></div>)}
      </div>

      <div className="run-metrics" aria-label="Run metrics">
        <div className="run-metric"><strong>{companyRows.length}</strong><span>seed companies</span></div>
        <div className="run-metric"><strong>{data.stageCounts.research ?? 0}</strong><span>research jobs</span></div>
        <div className="run-metric"><strong>{data.statusCounts.succeeded ?? 0}</strong><span>completed work</span></div>
        <div className="run-metric"><strong>{run.actualCostEur} EUR</strong><span>of {run.maxEur} EUR used</span></div>
        <div className="run-metric"><strong>{run.actualSearchRequests}</strong><span>search requests</span></div>
      </div>

      <section aria-labelledby="run-companies-title">
        <SectionHeading title="Company lanes" detail="Every company progresses independently. A failed lane does not erase completed evidence." action={<span>{companyRows.length} in this run</span>} />
        {companyRows.length ? <div className="queue-list">{companyRows.map(({ company, eligibility, dossier, opportunities }) => { const opportunity = opportunities.find((row) => row.gate?.passed) ?? opportunities[0]; const completeness = dossier ? Math.round(Number(dossier.researchCompleteness) * 100) : 0; return <article className="queue-row" key={company!.id}><div><h3><Link href={`/companies/${company!.id}`}>{company!.canonicalName}</Link></h3><p>{company!.canonicalDomain}</p></div><div><span className="queue-label">Eligibility</span>{eligibility ? <StatusBadge value={eligibility.eligible ? "eligible" : "rejected"} /> : <span className="queue-value">Pending</span>}</div><div><span className="queue-label">Dossier</span><span className="queue-value">{dossier ? dossier.conclusion.replaceAll("_", " ") : "Pending"}</span>{dossier && <div className="progress-track" aria-label={`${completeness}% research completeness`}><span style={{ width: `${completeness}%` }} /></div>}</div><div><span className="queue-label">Opportunity</span><span className="queue-value">{opportunity ? <Link href={`/opportunities/${opportunity.opportunity.id}`}>{opportunity.opportunity.genericnessStatus === "generic" ? "Gate rejected" : "Ready to inspect"}</Link> : "Not generated"}</span></div><Link className="back-link" href={`/companies/${company!.id}`}>Open <Icon name="arrow" size={13} /></Link></article>; })}</div> : <EmptyState title="No company seeds" description="This run needs at least one company URL before it can start." />}
      </section>

      <section className="run-list" aria-labelledby="work-title">
        <SectionHeading title="Work ledger" detail="Durable stage execution, attempts, and failure categories." action={<span>{data.workItems.length} work items</span>} />
        {data.workItems.length ? <div className="run-table-wrap"><table className="data-table"><thead><tr><th>Stage</th><th>Status</th><th>Attempt</th><th>Last error</th><th>Updated</th></tr></thead><tbody>{data.workItems.map((item) => <tr key={item.id}><td><span className="table-title">{item.stage}</span><span className="table-subtitle">{item.companyId ? item.companyId.slice(0, 8) : "run-wide"}</span></td><td><StatusBadge value={item.status} /></td><td>{item.attemptCount}</td><td>{item.lastErrorCategory ? <span className="table-subtitle">{item.lastErrorCategory}: {item.lastErrorMessage}</span> : <span className="table-subtitle">No errors</span>}</td><td>{formatDate(item.updatedAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="Work has not been queued" description="Start the run to create durable work items for each company stage." />}
      </section>

      {run.degradationWarnings.length > 0 && <div className="callout callout-warning"><h3>Run limitations</h3>{run.degradationWarnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}
    </main>
  );
}
