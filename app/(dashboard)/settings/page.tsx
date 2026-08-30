import { getSettingsReadModel } from "@/src/application/read-models";
import { ButtonLink, PageHeading, SectionHeading, StatusBadge, formatDateTime } from "@/src/ui/components";
import { SettingsForm } from "@/src/ui/settings-form";
import { Icon } from "@/src/ui/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getSettingsReadModel();
  return (
    <main className="page-shell">
      <PageHeading title="Settings" description="Keep scope, provider mode, budgets, and scheduling explicit. Secrets never appear here." action={<ButtonLink href="/scout-runs" variant="secondary"><Icon name="pulse" size={15} />Run control room</ButtonLink>} />
      <div className="settings-grid">
        <section className="panel" aria-labelledby="schedule-title"><div className="panel-header"><div><h2 id="schedule-title">Weekly schedule</h2><p>Opt-in orchestration trigger. Manual runs use the same path.</p></div><Icon name="clock" size={18} /></div><div className="panel-body"><SettingsForm schedule={data.schedule} /></div></section>
        <aside className="detail-aside"><section className="panel panel-dark"><div className="panel-header"><div><h2>Provider boundary</h2><p>Safe, explicit, no silent fallback.</p></div><Icon name="shield" size={18} /></div><div className="panel-body"><div className="config-list"><div className="config-row"><span>search</span><strong>{data.providers.search}</strong></div><div className="config-row"><span>model</span><strong>{data.providers.model}</strong></div><div className="config-row"><span>extraction</span><strong>{data.providers.extractionModel}</strong></div><div className="config-row"><span>reasoning</span><strong>{data.providers.reasoningModel}</strong></div><div className="config-row"><span>inline demo worker</span><strong>{data.providers.inlineWorker ? "enabled" : "off"}</strong></div></div><p className="dark-copy">API keys are read from environment variables and are never stored in this page model.</p></div></section><section className="detail-section"><SectionHeading title="Schedule status" detail="Computed from the stored timezone and current time." /><div className="inline-meta"><StatusBadge value={data.schedule.enabled && data.status.environmentEnabled ? "enabled" : "disabled"} tone={data.schedule.enabled && data.status.environmentEnabled ? "success" : "neutral"} /></div><div className="config-list"><div className="config-row"><span>next occurrence</span><strong>{formatDateTime(data.nextOccurrenceUtc)}</strong></div><div className="config-row"><span>environment gate</span><strong>{data.status.environmentEnabled ? "on" : "off"}</strong></div><div className="config-row"><span>last outcome</span><strong>{data.status.lastOccurrence?.outcome ?? "none"}</strong></div></div></section></aside>
      </div>
      <section className="run-list"><SectionHeading title="Launch guardrails" detail="These are product constraints, not optional polish." /><div className="guardrail-grid"><div><StatusBadge value="research only" tone="success" /><p>No email, social messages, CRM writes, purchases, or private target-company access.</p></div><div><StatusBadge value="evidence first" tone="info" /><p>Every verified claim shown in the UI links to a retained source document.</p></div><div><StatusBadge value="bounded spend" tone="warning" /><p>Currency, search, model, deep-company, runtime, and retry ceilings are enforced by the worker.</p></div></div></section>
    </main>
  );
}
