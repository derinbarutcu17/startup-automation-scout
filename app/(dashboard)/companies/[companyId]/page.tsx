import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyReadModel } from "@/src/application/read-models";
import { BackLink, ButtonLink, EmptyState, EvidenceLine, PageHeading, SectionHeading, SourceCitation, StatusBadge, formatDate, formatDateTime, isStale } from "@/src/ui/components";
import { Icon } from "@/src/ui/icons";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const data = await getCompanyReadModel(companyId);
  if (!data) notFound();
  const { company, dossier, opportunities, reviews } = data;
  const verified = dossier?.claims.filter((claim) => claim.claimType === "verified") ?? [];
  const inferred = dossier?.claims.filter((claim) => claim.claimType === "inferred") ?? [];
  const evidenceFor = (claimId: string) => dossier?.evidenceLinks.filter((row) => row.link.claimId === claimId) ?? [];
  return (
    <main className="page-shell">
      <BackLink href="/companies">Company queue</BackLink>
      <PageHeading title={company.canonicalName} description={`${company.canonicalDomain} · identity ${company.identityStatus} · last researched ${formatDate(company.lastResearchedAt)}`} action={<ButtonLink href="/scout-runs" variant="secondary"><Icon name="plus" size={15} />Research in new run</ButtonLink>} />
      <div className="detail-content">
        <div className="detail-main">
          <section className="detail-section" aria-labelledby="verified-title"><SectionHeading title="What is verified" detail={`${verified.length} claims with source evidence`} />{verified.length ? <div className="claim-grid">{verified.map((claim) => <EvidenceLine key={claim.id} claimType={claim.claimType} sourceUrl={evidenceFor(claim.id)[0]?.source.canonicalUrl} sourceTitle={evidenceFor(claim.id)[0]?.source.title} sourceTier={evidenceFor(claim.id)[0]?.source.sourceTier} fetchedAt={evidenceFor(claim.id)[0]?.source.fetchedAt} stale={isStale(evidenceFor(claim.id)[0]?.source.fetchedAt)}>{claim.claimText}{claim.contradictionStatus !== "none" && <span className="claim-warning"> Contradicted by another source.</span>}</EvidenceLine>)}</div> : <EmptyState title="No verified claims yet" description="This company has not completed a dossier with supported factual claims." />}</section>

          <section className="detail-section" aria-labelledby="inferred-title"><SectionHeading title="What we infer" detail={`${inferred.length} hypotheses kept separate from facts`} />{inferred.length ? <div className="claim-grid">{inferred.map((claim) => <div className="inference-block" key={claim.id}><EvidenceLine claimType={claim.claimType} sourceUrl={evidenceFor(claim.id)[0]?.source.canonicalUrl} sourceTitle={evidenceFor(claim.id)[0]?.source.title} sourceTier={evidenceFor(claim.id)[0]?.source.sourceTier} fetchedAt={evidenceFor(claim.id)[0]?.source.fetchedAt}>{claim.claimText}</EvidenceLine>{claim.reasoningSummary && <p className="supporting-copy"><strong>Reasoning:</strong> {claim.reasoningSummary}</p>}{claim.alternativeExplanation && <p className="supporting-copy"><strong>Alternative:</strong> {claim.alternativeExplanation}</p>}{claim.confirmationQuestion && <p className="supporting-copy"><strong>Ask next:</strong> {claim.confirmationQuestion}</p>}</div>)}</div> : <EmptyState title="No inferences recorded" description="A quiet dossier is better than a confident story. The Scout only creates hypotheses from extracted evidence." />}</section>

          <section className="detail-section" aria-labelledby="opportunities-title"><SectionHeading title="Opportunities" detail="Each proposal must point back to this dossier." />{opportunities.length ? <div className="opportunity-list">{opportunities.map((row) => <article className="opportunity-row" key={row.opportunity.id}><div><h2><Link href={`/opportunities/${row.opportunity.id}`}>{row.opportunity.proposedSystem}</Link></h2><p>{row.opportunity.measurableOutcome}</p></div><span className="opportunity-company">{row.opportunity.genericnessStatus}</span>{row.scorecard ? <span className="table-title">{row.scorecard.totalScore} / 100</span> : <span className="table-subtitle">unscored</span>}<StatusBadge value={row.gate?.passed ? "passed" : row.gate ? "rejected" : "pending"} /></article>)}</div> : <EmptyState title="No opportunity generated" description={dossier?.conclusion === "not_enough_evidence" ? "The dossier explicitly stopped because the public evidence was not sufficient." : "Opportunity analysis has not completed for this company."} />}</section>
        </div>
        <aside className="detail-aside">
          <section className="panel panel-dark"><div className="panel-header"><div><h2>Research dossier</h2><p>Version {dossier?.version ?? "--"} · generated {formatDateTime(dossier?.generatedAt)}</p></div><Icon name="file" size={18} /></div><div className="panel-body">{dossier ? <><div className="inline-meta"><StatusBadge value={dossier.conclusion === "sufficient" ? "sufficient" : "not enough evidence"} tone={dossier.conclusion === "sufficient" ? "success" : "warning"} /><span className="table-subtitle">{Math.round(Number(dossier.researchCompleteness) * 100)}% complete</span></div><p className="dark-copy">{dossier.sources.length} sources · {dossier.claims.length} claims · {dossier.researchCostEur} EUR research cost.</p></> : <p className="dark-copy">No dossier has been compiled yet.</p>}</div></section>
          <section className="detail-section" aria-labelledby="signals-title"><SectionHeading title="Recent signals" detail="Time-bound reasons to look now." />{dossier?.signals.length ? <ul className="signal-list">{dossier.signals.map((signal) => <li key={signal.id}><strong>{signal.label}</strong><small>{signal.signalType} · {formatDate(signal.occurredAt, "date unknown")}</small></li>)}</ul> : <EmptyState title="No recent signals" description="No dated funding, hiring, release, or market signal was extracted." />}</section>
          <section className="detail-section" aria-labelledby="unknowns-title"><SectionHeading title="What we do not know" detail="Open questions are part of the output." />{dossier?.knownUnknowns.length ? <ul className="unknown-list">{dossier.knownUnknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul> : <p className="queue-value">No unknowns recorded. Check the source coverage before treating that as certainty.</p>}</section>
          <section className="detail-section" aria-labelledby="sources-title"><SectionHeading title="Sources" detail={`${dossier?.sources.length ?? 0} retained source documents`} />{dossier?.sources.length ? <div className="source-list">{dossier.sources.map((source) => <SourceCitation key={source.id} url={source.canonicalUrl} title={source.title} tier={source.sourceTier} fetchedAt={source.fetchedAt} stale={isStale(source.fetchedAt)} />)}</div> : <EmptyState title="No sources" description="Source documents appear here after the research worker runs." />}</section>
          {reviews.length > 0 && <section className="detail-section"><SectionHeading title="Review trace" detail="Latest decisions remain append-only." />{reviews.map((review) => <div className="decision-row" key={review.id}><time>{formatDateTime(review.createdAt)}</time><span><StatusBadge value={review.decision} /></span><span className="table-subtitle">{review.note || "No note"}</span></div>)}</section>}
        </aside>
      </div>
    </main>
  );
}
