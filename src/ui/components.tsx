import Link from "next/link";
import { Icon } from "@/src/ui/icons";

export function StatusBadge({ value, tone }: { value: string; tone?: "success" | "warning" | "danger" | "neutral" | "info" }) {
  const computed = tone ?? (value.includes("succeed") || value === "eligible" || value === "passed" || value === "prototype" ? "success" : value.includes("fail") || value === "rejected" || value === "reject" ? "danger" : value.includes("run") || value === "investigate" ? "info" : "warning");
  return <span className={`status-badge status-${computed}`}><span className="status-dot" aria-hidden="true" />{value.replaceAll("_", " ")}</span>;
}

export function EpistemicLabel({ type }: { type: string }) {
  const tone = type === "verified" ? "success" : type === "inferred" ? "info" : type === "estimated" ? "warning" : "neutral";
  return <span className={`epistemic-label epistemic-${tone}`}>{type}</span>;
}

export function ScoreMark({ score, confidence }: { score: string | number | null | undefined; confidence?: string | null }) {
  const parsed = score == null ? null : Number(score);
  return <div className="score-mark"><strong>{parsed == null || Number.isNaN(parsed) ? "--" : parsed.toFixed(1)}</strong><span>/ 100</span>{confidence && <small>{confidence} confidence</small>}</div>;
}

export function PageHeading({ title, description, action }: { title: string; description: React.ReactNode; action?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{action}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-mark" aria-hidden="true"><Icon name="inbox" size={19} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function SourceCitation({ url, title, tier, fetchedAt, stale = false }: { url: string; title?: string | null; tier?: string; fetchedAt?: Date | string | null; stale?: boolean }) {
  const date = fetchedAt ? new Date(fetchedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "undated";
  return <a className="source-citation" href={url} target="_blank" rel="noreferrer"><span className="source-icon"><Icon name="link" size={13} /></span><span className="source-copy"><strong>{title || new URL(url).hostname}</strong><small>{tier?.replace("tier_", "tier ") ?? "source"} · fetched {date}{stale ? " · stale" : ""}</small></span><Icon name="arrow" size={14} /></a>;
}

export function EvidenceLine({ children, sourceUrl, sourceTitle, sourceTier, fetchedAt, claimType, stale = false }: { children: React.ReactNode; sourceUrl?: string; sourceTitle?: string | null; sourceTier?: string; fetchedAt?: Date | string | null; claimType?: string; stale?: boolean }) {
  return <div className="evidence-line"><div className="evidence-marker" aria-hidden="true" /><div className="evidence-body">{claimType && <EpistemicLabel type={claimType} />}<p>{children}</p>{sourceUrl && <SourceCitation url={sourceUrl} title={sourceTitle} tier={sourceTier} fetchedAt={fetchedAt} stale={stale} />}</div></div>;
}

export function BackLink({ href, children = "Back" }: { href: string; children?: React.ReactNode }) {
  return <Link className="back-link" href={href}><Icon name="chevron" size={15} />{children}</Link>;
}

export function ButtonLink({ href, children, variant = "secondary" }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" | "quiet" }) {
  return <Link className={`button button-${variant}`} href={href}>{children}</Link>;
}

export function formatDate(value: Date | string | null | undefined, fallback = "Not researched") {
  if (!value) return fallback;
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: Date | string | null | undefined, fallback = "Not recorded") {
  if (!value) return fallback;
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function isStale(value: Date | string | null | undefined, days = 90) {
  return Boolean(value && Date.now() - new Date(value).getTime() > days * 24 * 60 * 60 * 1000);
}
