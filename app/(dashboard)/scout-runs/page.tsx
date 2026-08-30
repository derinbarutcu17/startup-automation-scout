import Link from "next/link";
import { getDashboardReadModel } from "@/src/application/read-models";
import { ButtonLink, EmptyState, PageHeading, ScoreMark, SectionHeading, StatusBadge, formatDate, formatDateTime } from "@/src/ui/components";
import { NewRunForm } from "@/src/ui/new-run-form";
import { Icon } from "@/src/ui/icons";

export const dynamic = "force-dynamic";

function scopeFor(configuration: Record<string, unknown>) {
  return Array.isArray(configuration.geographicScope) ? configuration.geographicScope.join(" / ") : "Configured scope";
}

export default async function ScoutRunsPage() {
  const data = await getDashboardReadModel();
  const attention = data.validOpportunities.slice(0, 3);

  return (
    <main className="page-shell">
      <PageHeading title="Research control room" description="A bounded queue for deciding which startup deserves your attention next, and why." action={<ButtonLink href="/companies" variant="secondary"><Icon name="building" size={15} />Browse companies</ButtonLink>} />

      <div className="stat-strip" aria-label="Workspace summary">
        <div className="stat-cell"><span className="stat-value">{data.stats.pendingReviewCount}</span><span className="stat-label">opportunities to review</span></div>
        <div className="stat-cell"><span className="stat-value">{data.stats.companyCount}</span><span className="stat-label">companies in ledger</span></div>
        <div className="stat-cell"><span className="stat-value">{data.stats.runCount}</span><span className="stat-label">bounded runs</span></div>
        <div className="stat-cell"><span className="stat-value">{data.stats.reviewCount}</span><span className="stat-label">review decisions</span></div>
      </div>

      <div className="workspace-grid">
        <section className="panel panel-dark new-run-panel" aria-labelledby="new-run-title">
          <div className="panel-header"><div><h2 id="new-run-title">Start a bounded run</h2><p>Paste one company URL. The worker handles the evidence trail.</p></div><Icon name="plus" size={19} /></div>
          <div className="panel-body"><NewRunForm /></div>
        </section>

        <section className="panel" aria-labelledby="latest-run-title">
          <div className="panel-header"><div><h2 id="latest-run-title">Latest run</h2><p>Current state of the most recent Scout Run.</p></div><Icon name="clock" size={18} /></div>
          <div className="panel-body">
            {data.latestRun ? <>
              <div className="inline-meta"><StatusBadge value={data.latestRun.status} /><span className="table-subtitle">{formatDateTime(data.latestRun.createdAt)}</span></div>
              <h3 className="latest-run-title"><Link href={`/scout-runs/${data.latestRun.id}`}>Run {data.latestRun.id.slice(0, 8)}</Link></h3>
              <p className="latest-run-copy">{data.latestRun.currentStage.replaceAll("_", " ")} · {data.latestRun.actualCostEur} EUR used of {data.latestRun.maxEur} EUR.</p>
              <ButtonLink href={`/scout-runs/${data.latestRun.id}`} variant="quiet">Open run <Icon name="arrow" size={14} /></ButtonLink>
            </> : <EmptyState title="No runs yet" description="Use the fixture seed or paste a real startup URL to create the first evidence trail." />}
          </div>
        </section>

        <section className="panel attention-panel" aria-labelledby="attention-title">
          <div className="panel-header"><div><h2 id="attention-title">Attention queue</h2><p>Valid opportunities with deterministic scores. Rejected suggestions stay inspectable.</p></div><ButtonLink href="/opportunities" variant="quiet">View all <Icon name="arrow" size={14} /></ButtonLink></div>
          {attention.length ? <div className="attention-list">{attention.map((row) => <article className="attention-item" key={row.opportunity.id}><Link href={`/opportunities/${row.opportunity.id}`}><div className="item-meta"><StatusBadge value={row.opportunity.rankingConfidence} tone="info" /><span>{row.company.canonicalName}</span></div><h3>{row.opportunity.proposedSystem}</h3><p>{row.opportunity.measurableOutcome}</p><div className="attention-foot"><ScoreMark score={row.scorecard?.totalScore} confidence={row.opportunity.rankingConfidence} /><small>{row.gate?.warningCodes.length ? `${row.gate.warningCodes.length} warning` : "gate passed"}</small></div></Link></article>)}</div> : <div className="panel-body"><EmptyState title="Nothing ready for review" description="Run BerlinFlow in fixture mode to see the full evidence-to-opportunity path, or add a company to begin research." /></div>}
        </section>
      </div>

      <section className="run-list" aria-labelledby="run-list-title">
        <SectionHeading title="Scout Runs" detail="Each run keeps its own budget, source configuration, and work history." action={<span>{data.runs.length} total</span>} />
        {data.runs.length ? <div className="run-table-wrap"><table className="data-table"><thead><tr><th>Run</th><th>Status</th><th>Stage</th><th>Budget used</th><th>Created</th><th /></tr></thead><tbody>{data.runs.map((run) => <tr key={run.id}><td><Link className="table-title" href={`/scout-runs/${run.id}`}>Run {run.id.slice(0, 8)}</Link><span className="table-subtitle">{scopeFor(run.configuration)}</span></td><td><StatusBadge value={run.status} /></td><td><span className="table-subtitle">{run.currentStage.replaceAll("_", " ")}</span></td><td><span className="table-title">{run.actualCostEur} / {run.maxEur} EUR</span><span className="table-subtitle">{run.actualSearchRequests} search requests</span></td><td>{formatDate(run.createdAt)}</td><td><Link className="back-link" href={`/scout-runs/${run.id}`}>Open <Icon name="arrow" size={13} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="Your run ledger is empty" description="Start with a company URL above. Every input is normalized and kept as discovery provenance." />}
      </section>

      <p className="footer-note">Evidence is stored with source provenance. Search results locate pages; original permitted sources support claims. The worker never sends outreach.</p>
    </main>
  );
}
