import Link from "next/link";
import { listProspectDossiers } from "@/src/infrastructure/db/repositories-prospect";
import { listCompanyRows } from "@/src/infrastructure/db/repositories";
import { listOpportunityDetails } from "@/src/infrastructure/db/repositories";
import { EmptyState, PageHeading, StatusBadge, formatDateTime } from "@/src/ui/components";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const [prospects, companies, opportunities] = await Promise.all([
    listProspectDossiers(),
    listCompanyRows(),
    listOpportunityDetails(),
  ]);
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const opportunityMap = new Map(opportunities.map((o) => [o.opportunity.id, o]));
  return (
    <main className="page-shell">
      <PageHeading
        title="Prospect dossiers"
        description="Company + opportunity preparation for outreach. Email remains draft-only; Telegram PDF delivery is owner-triggered."
      />
      {prospects.length ? (
        <div className="run-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company / Opportunity</th>
                <th>Status</th>
                <th>Version</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => {
                const company = companyMap.get(p.companyId);
                const opp = p.opportunityId ? opportunityMap.get(p.opportunityId) : null;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="table-title">{company?.canonicalName ?? p.companyId.slice(0, 8)}</span>
                      <span className="table-subtitle">{company?.canonicalDomain ?? ""} {opp ? `· ${opp.opportunity.proposedSystem.slice(0, 48)}…` : ""}</span>
                    </td>
                    <td><StatusBadge value={p.status} /></td>
                    <td className="queue-value">v{p.version} / {p.schemaVersion}</td>
                    <td className="queue-value">{formatDateTime(p.updatedAt)}</td>
                    <td><Link className="button button-secondary" href={`/prospects/${p.id}`}>Open</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No prospect dossiers yet" description="Open an opportunity and use Prepare outreach to create the first dossier. Each dossier is versioned and holds persons, contacts, angles and drafts." action={<Link className="button button-primary" href="/opportunities">Go to opportunities</Link>} />
      )}
    </main>
  );
}
