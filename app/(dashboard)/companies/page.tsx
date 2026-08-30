import Link from "next/link";
import { getCompaniesReadModel } from "@/src/application/read-models";
import { ButtonLink, EmptyState, PageHeading, SectionHeading, StatusBadge, formatDate } from "@/src/ui/components";
import { Icon } from "@/src/ui/icons";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const rows = await getCompaniesReadModel();
  const eligibleCount = rows.filter((row) => row.eligibility?.eligible).length;
  const researchedCount = rows.filter((row) => row.dossier).length;
  return (
    <main className="page-shell">
      <PageHeading title="Company queue" description="See which candidates have enough signal to deserve deeper research, and which ones should stay unknown." action={<ButtonLink href="/scout-runs" variant="primary"><Icon name="plus" size={15} />New Scout Run</ButtonLink>} />
      <div className="stat-strip" aria-label="Company queue summary"><div className="stat-cell"><span className="stat-value">{rows.length}</span><span className="stat-label">companies in ledger</span></div><div className="stat-cell"><span className="stat-value">{eligibleCount}</span><span className="stat-label">currently eligible</span></div><div className="stat-cell"><span className="stat-value">{researchedCount}</span><span className="stat-label">with a dossier</span></div><div className="stat-cell"><span className="stat-value">{rows.filter((row) => row.dossier?.conclusion === "not_enough_evidence").length}</span><span className="stat-label">evidence gaps</span></div></div>
      <section aria-labelledby="company-queue-title"><SectionHeading title="Candidates" detail="Canonical identity, geography, evidence coverage, and next decision." action={<span>sorted by recent activity</span>} />{rows.length ? <div className="company-grid">{rows.map(({ company, eligibility, dossier, opportunities }) => { const valid = opportunities.find((row) => row.gate?.passed); return <article className="company-card" key={company.id}><div className="inline-meta"><StatusBadge value={eligibility ? (eligibility.eligible ? "eligible" : "rejected") : "unreviewed"} /><span className="table-subtitle">{dossier ? `${Math.round(Number(dossier.researchCompleteness) * 100)}% coverage` : "not researched"}</span></div><h2><Link href={`/companies/${company.id}`}>{company.canonicalName}</Link></h2><p className="domain">{company.canonicalDomain}</p>{dossier?.signals[0] ? <p className="queue-value">{dossier.signals[0].label}</p> : <p className="queue-value">No recent signal recorded.</p>}<div className="company-card-footer"><span className="table-subtitle">last researched {formatDate(company.lastResearchedAt)}</span>{valid ? <Link className="back-link" href={`/opportunities/${valid.opportunity.id}`}>Opportunity <Icon name="arrow" size={13} /></Link> : <Link className="back-link" href={`/companies/${company.id}`}>Inspect <Icon name="arrow" size={13} /></Link>}</div></article>; })}</div> : <EmptyState title="No companies yet" description="Start a Scout Run with a company URL. The canonical domain and discovery provenance will be kept together." />}</section>
      <p className="footer-note">Eligibility is deterministic. Unknown geography stays visible as unknown unless the configured target profile says to defer it.</p>
    </main>
  );
}
