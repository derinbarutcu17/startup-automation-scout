import Link from "next/link";
import { getReviewsReadModel } from "@/src/application/read-models";
import { ButtonLink, EmptyState, PageHeading, SectionHeading, StatusBadge, formatDateTime } from "@/src/ui/components";
import { Icon } from "@/src/ui/icons";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const data = await getReviewsReadModel();
  return (
    <main className="page-shell">
      <PageHeading title="Review history" description="Human decisions become a durable feedback trail. They never rewrite the underlying evidence." action={<ButtonLink href="/opportunities" variant="secondary"><Icon name="spark" size={15} />Open opportunities</ButtonLink>} />
      <div className="stat-strip" aria-label="Review summary"><div className="stat-cell"><span className="stat-value">{data.reviews.length}</span><span className="stat-label">decisions recorded</span></div><div className="stat-cell"><span className="stat-value">{data.reviews.filter((row) => row.decision === "prototype").length}</span><span className="stat-label">sent to prototype</span></div><div className="stat-cell"><span className="stat-value">{data.reviews.filter((row) => row.decision === "reject").length}</span><span className="stat-label">rejected</span></div><div className="stat-cell"><span className="stat-value">{new Set(data.reviews.map((row) => row.targetId)).size}</span><span className="stat-label">targets touched</span></div></div>
      <section aria-labelledby="review-list-title"><SectionHeading title="Decision ledger" detail="Newest decision first. A target can have many review events." />{data.entries.length ? <div className="decision-list">{data.entries.map(({ review, opportunity, company }) => <article className="decision-row" key={review.id}><time dateTime={review.createdAt.toISOString()}>{formatDateTime(review.createdAt)}</time><div><h2>{opportunity ? <Link className="text-link" href={`/opportunities/${opportunity.opportunity.id}`}>{company?.canonicalName ?? "Unknown company"}</Link> : company?.canonicalName ?? `${review.targetType} ${review.targetId.slice(0, 8)}`}</h2><p>{review.note || "No reviewer note added."}</p>{review.reasonLabels.length > 0 && <div className="tag-row">{review.reasonLabels.map((reason) => <span className="tag" key={reason}>{reason}</span>)}</div>}</div><StatusBadge value={review.decision} /></article>)}</div> : <EmptyState title="No decisions yet" description="Open a passing opportunity and record the first human review decision." />}</section>
      <p className="footer-note">Review decisions are internal only. They do not send email, change CRM records, publish claims, or contact a company.</p>
    </main>
  );
}
