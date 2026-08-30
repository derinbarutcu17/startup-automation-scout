import { getSettingsReadModel } from "@/src/application/read-models";
import { ButtonLink, PageHeading, SectionHeading, StatusBadge, formatDateTime } from "@/src/ui/components";
import { SenderProfileForm, SettingsForm } from "@/src/ui/settings-form";
import { Icon } from "@/src/ui/icons";
import { getGmailConnectionMetadata, listSuppressions } from "@/src/infrastructure/db/repositories-prospect";
import { addSuppressionAction, removeSuppressionAction } from "@/src/application/prospect-web-actions";
import { getSenderProfile } from "@/src/application/prospect-service";
import { getEnv } from "@/src/infrastructure/config/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const env = getEnv();
  const [data, suppressions, gmailConnection, sender] = await Promise.all([getSettingsReadModel(), listSuppressions(), getGmailConnectionMetadata(), getSenderProfile()]);
  return (
    <main className="page-shell">
      <PageHeading title="Settings" description="Keep scope, provider mode, budgets, and scheduling explicit. Secrets never appear here." action={<ButtonLink href="/scout-runs" variant="secondary"><Icon name="pulse" size={15} />Run control room</ButtonLink>} />
      <div className="settings-grid">
        <section className="panel" aria-labelledby="schedule-title"><div className="panel-header"><div><h2 id="schedule-title">Weekly schedule</h2><p>Opt-in orchestration trigger. Manual runs use the same path.</p></div><Icon name="clock" size={18} /></div><div className="panel-body"><SettingsForm schedule={data.schedule} /></div></section>
        <aside className="detail-aside"><section className="panel panel-dark"><div className="panel-header"><div><h2>Provider boundary</h2><p>Safe, explicit, no silent fallback.</p></div><Icon name="shield" size={18} /></div><div className="panel-body"><div className="config-list"><div className="config-row"><span>search</span><strong>{data.providers.search}</strong></div><div className="config-row"><span>model</span><strong>{data.providers.model}</strong></div><div className="config-row"><span>extraction</span><strong>{data.providers.extractionModel}</strong></div><div className="config-row"><span>reasoning</span><strong>{data.providers.reasoningModel}</strong></div><div className="config-row"><span>inline demo worker</span><strong>{data.providers.inlineWorker ? "enabled" : "off"}</strong></div></div><p className="dark-copy">API keys are read from environment variables and are never stored in this page model.</p></div></section><section className="detail-section"><SectionHeading title="Schedule status" detail="Computed from the stored timezone and current time." /><div className="inline-meta"><StatusBadge value={data.schedule.enabled && data.status.environmentEnabled ? "enabled" : "disabled"} tone={data.schedule.enabled && data.status.environmentEnabled ? "success" : "neutral"} /></div><div className="config-list"><div className="config-row"><span>next occurrence</span><strong>{formatDateTime(data.nextOccurrenceUtc)}</strong></div><div className="config-row"><span>environment gate</span><strong>{data.status.environmentEnabled ? "on" : "off"}</strong></div><div className="config-row"><span>last outcome</span><strong>{data.status.lastOccurrence?.outcome ?? "none"}</strong></div></div></section></aside>
      </div>
      <section className="run-list"><SectionHeading title="Launch guardrails" detail="These are product constraints, not optional polish." /><div className="guardrail-grid"><div><StatusBadge value="research only" tone="success" /><p>No email, social messages, CRM writes, purchases, or private target-company access.</p></div><div><StatusBadge value="evidence first" tone="info" /><p>Every verified claim shown in the UI links to a retained source document.</p></div><div><StatusBadge value="bounded spend" tone="warning" /><p>Currency, search, model, deep-company, runtime, and retry ceilings are enforced by the worker.</p></div></div></section>
      <section className="run-list">
        <SectionHeading title="Suppression list" detail="Company domains, contact values, and manual do-not-contact entries. Checked before any draft or Gmail draft." />
        <form action={addSuppressionAction} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 16 }}>
          <div><label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Scope</label><select name="scope" defaultValue="company_domain" style={{ width: "100%", height: 36 }}><option value="company_domain">company_domain</option><option value="contact_value">contact_value</option><option value="person">person</option><option value="manual">manual</option></select></div>
          <div><label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Value (domain or email)</label><input name="value" placeholder="berlinflow.example or ava@berlinflow.example" style={{ width: "100%", height: 36 }} required /></div>
          <div><label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Reason</label><input name="reason" placeholder="do not contact" style={{ width: "100%", height: 36 }} required /></div>
          <button className="button button-secondary" type="submit">Add suppression</button>
        </form>
        <div className="run-table-wrap">
          <table className="data-table">
            <thead><tr><th>Scope</th><th>Value</th><th>Reason</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {suppressions.length ? suppressions.map((s) => (
                <tr key={s.id}><td><StatusBadge value={s.scope} tone="neutral" /></td><td className="queue-value">{s.scope === "contact_value" ? "protected contact" : s.normalizedValue}</td><td>{s.reason}</td><td>{formatDateTime(s.createdAt)}</td><td><form action={removeSuppressionAction}><input type="hidden" name="id" value={s.id} /><button className="button button-quiet" type="submit">Remove</button></form></td></tr>
              )) : <tr><td colSpan={5} style={{ padding: 16, color: "var(--ink-faint)" }}>No suppressions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="run-list">
        <SectionHeading title="Outreach settings" detail="Sender identity and export controls." />
        <SenderProfileForm sender={sender} />
        <div className="guardrail-grid"><div><StatusBadge value="draft-only" tone="info" /><p>Gmail integration creates drafts only after exact-content approval. No send path exists.</p></div><div><StatusBadge value="encrypted" tone="success" /><p>Professional emails are encrypted at rest, never logged, never in URLs or provider diagnostics.</p></div><div><StatusBadge value="freshness" tone="warning" /><p>Contacts become stale after {env.CONTACT_FRESHNESS_DAYS} days. Suppressed contacts never pass draft or Gmail gates.</p></div></div>
      </section>
      <section className="run-list">
        <SectionHeading title="Gmail connection" detail="Optional Google OAuth for creating reviewed drafts only." />
        {env.GMAIL_PROVIDER === "google" ? <div className="callout"><p><strong>{gmailConnection ? gmailConnection.email ?? "Connected Google account" : "Not connected"}</strong>{gmailConnection ? ` · ${gmailConnection.status}` : ""}</p><p className="supporting-copy">The app requests the Gmail compose permission. It cannot send messages or read your mailbox.</p>{!gmailConnection && <a className="button button-secondary" href="/api/gmail/connect">Connect Gmail</a>}</div> : <div className="callout"><p>Fixture Gmail mode is active. Set <code>GMAIL_PROVIDER=google</code> to connect a Google account.</p></div>}
      </section>
    </main>
  );
}
