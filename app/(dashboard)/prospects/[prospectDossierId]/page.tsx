import Link from "next/link";
import { notFound } from "next/navigation";
import { getDossierById, getOpportunityDetail } from "@/src/infrastructure/db/repositories";
import { batchFingerprint, getProspectDossierDetail } from "@/src/infrastructure/db/repositories-prospect";
import { getEnv } from "@/src/infrastructure/config/env";
import { approveDraftsAction, confirmContactAction, createGmailDraftsAction, editDraftAction, generateAnglesAction, generateDraftsAction, inlinePeopleResearchAction, rejectContactAction } from "@/src/application/prospect-web-actions";
import { BackLink, EmptyState, EpistemicLabel, PageHeading, SectionHeading, SourceCitation, StatusBadge, formatDate, formatDateTime, isStale } from "@/src/ui/components";
import { Icon } from "@/src/ui/icons";
import { RefreshOnProgress } from "@/src/ui/refresh-on-progress";

export const dynamic = "force-dynamic";

function gmailResultStatus(providerResponse: unknown): string {
  if (typeof providerResponse !== "object" || providerResponse === null) return "unknown";
  const status = (providerResponse as Record<string, unknown>).status;
  return typeof status === "string" ? status : "unknown";
}

function gmailResultReason(providerResponse: unknown): string | null {
  if (typeof providerResponse !== "object" || providerResponse === null) return null;
  const reason = (providerResponse as Record<string, unknown>).reason;
  return typeof reason === "string" ? reason : null;
}

export default async function ProspectDetailPage({ params }: { params: Promise<{ prospectDossierId: string }> }) {
  const { prospectDossierId } = await params;
  const detail = await getProspectDossierDetail(prospectDossierId);
  if (!detail) notFound();
  const { dossier, persons, personClaims, personClaimEvidence, contacts, angles, drafts, approvals, gmailResults, jobs } = detail;
  const researchDossier = await getDossierById(dossier.researchDossierId);
  const opportunity = dossier.opportunityId ? await getOpportunityDetail(dossier.opportunityId) : null;
  const env = getEnv();
  const approvalRows = await Promise.all(approvals.map(async (approval) => {
    try {
      return { approval, currentFingerprint: await batchFingerprint(approval.draftBatchIds as string[]) };
    } catch {
      return { approval, currentFingerprint: null };
    }
  }));
  const activeJobs = jobs.some((job) => job.status === "pending" || job.status === "running" || job.status === "failed_retryable");

  return (
    <main className="page-shell">
      <BackLink href="/prospects">Prospect ledger</BackLink>
      <PageHeading
        title={`Prospect dossier v${dossier.version}`}
        description={<>{dossier.status} · {dossier.schemaVersion} · {formatDateTime(dossier.generatedAt)} {dossier.contentFingerprint && <><br />Fingerprint: <code>{dossier.contentFingerprint.slice(0, 12)}</code></>}<RefreshOnProgress active={activeJobs} /></>}
        action={<Link className="button button-quiet" href={`/companies/${dossier.companyId}`}>Company dossier</Link>}
      />
      <div className="detail-content">
        <div className="detail-main">
          <section className="detail-section">
            <SectionHeading title="1. Company and opportunity" detail="Selected automation context" />
            <div className="callout">
              <h3>{opportunity?.company.canonicalName ?? dossier.companyId}</h3>
              <p>{opportunity?.company.canonicalDomain ?? ""}</p>
              {opportunity && <><h3>Opportunity</h3><p>{opportunity.opportunity.proposedSystem}</p><p className="supporting-copy"><strong>Workflow:</strong> {opportunity.hypothesis.description}</p></>}
              <p className="supporting-copy">Research dossier: {researchDossier?.id.slice(0, 8) ?? "—"} · version {researchDossier?.version ?? "—"} · completeness {researchDossier ? Number(researchDossier.researchCompleteness).toFixed(2) : "—"}</p>
            </div>
          </section>

          <section className="detail-section">
            <SectionHeading title="2. Evidence-backed reason" detail="Why outreach may be relevant — not proof of pain" />
            {angles.length ? angles.map((a) => (
              <div key={a.id} className="evidence-line"><div className="evidence-marker" aria-hidden="true" /><div className="evidence-body"><EpistemicLabel type="inferred" /><p><strong>{a.title}</strong> — {a.thesis}</p>{a.targetPersonId && <p className="supporting-copy"><strong>Target:</strong> {persons.find((person) => person.id === a.targetPersonId)?.fullName ?? a.targetRole ?? "selected role"}</p>}<p className="supporting-copy"><strong>Signal:</strong> {a.verifiedSignal}</p><p className="supporting-copy"><strong>Workflow hypothesis:</strong> {a.workflowHypothesis}</p><p className="supporting-copy"><strong>Relevance:</strong> {a.relevanceReason}</p><p className="supporting-copy"><strong>Value:</strong> {a.valueHypothesis}</p><p className="supporting-copy"><strong>CTA:</strong> {a.callToAction}</p><div className="tag-row"><span className="tag">Evidence: {(a.evidenceIds as string[]).join(", ") || "—"}</span><span className="tag">Claims: {(a.claimIds as string[]).join(", ") || "—"}</span></div></div></div>
            )) : <EmptyState title="No angles yet" description="Generate angles from the research dossier. At least one verified claim is required." />}
            <form action={generateAnglesAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="prospectDossierId" value={prospectDossierId} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Target person (optional)</label>
                  <select name="targetPersonId" style={{ minWidth: 220, height: 36, border: "1px solid var(--line)", padding: "0 8px" }} defaultValue="">
                    <option value="">— auto (first person) —</option>
                    {persons.map((p) => <option key={p.id} value={p.id}>{p.fullName} {p.roleTitle ? `· ${p.roleTitle}` : ""}</option>)}
                  </select>
                </div>
                <button className="button button-secondary" type="submit">Generate angles</button>
              </div>
            </form>
          </section>

          <section className="detail-section">
            <SectionHeading title="3. Person profiles" detail="Source links and confidence — never personal inferences" />
            {persons.length ? persons.map((p) => (
              <div key={p.id} className="evidence-line">
                <div className="evidence-marker" aria-hidden="true" />
                <div className="evidence-body">
                  <p><strong>{p.fullName}</strong> {p.roleTitle ? `· ${p.roleTitle}` : ""} {p.function ? `· ${p.function}` : ""}</p>
                  <div className="inline-meta"><StatusBadge value={p.status} /><span className="tag">{p.discoveryMethod}</span>{p.lastVerifiedAt && <span className="tag">verified {formatDate(p.lastVerifiedAt)}</span>}</div>
                  {p.profileUrl && <SourceCitation url={p.profileUrl} title={p.profilePlatform ?? p.profileUrl} tier={p.lastVerifiedAt ? "tier_1" : "candidate"} fetchedAt={p.lastVerifiedAt} />}
                  {p.uncertaintyNotes && <p className="supporting-copy">Uncertainty: {p.uncertaintyNotes}</p>}
                  {personClaims.filter((claim) => claim.personProfileId === p.id).map((claim) => (
                    <div key={claim.id} className="callout" style={{ marginTop: 10 }}>
                      <div className="inline-meta"><EpistemicLabel type={claim.claimType} /><span className="tag">{claim.confidence}</span></div>
                      <p><strong>{claim.subject}:</strong> {claim.claimText}</p>
                      {claim.reasoningSummary && <p className="supporting-copy">Reasoning: {claim.reasoningSummary}</p>}
                      {claim.alternativeExplanation && <p className="supporting-copy">Alternative: {claim.alternativeExplanation}</p>}
                      {claim.confirmationQuestion && <p className="supporting-copy">Question: {claim.confirmationQuestion}</p>}
                      {personClaimEvidence.filter((link) => link.relation.personClaimId === claim.id).map((link) => <SourceCitation key={`${claim.id}-${link.relation.evidenceItemId}`} url={link.source.canonicalUrl} title={link.evidence.sourceLocator} tier={link.source.sourceTier} fetchedAt={link.source.fetchedAt} />)}
                    </div>
                  ))}
                </div>
              </div>
            )) : <EmptyState title="No persons yet" description="Run person research. At most 3 candidates are kept." />}
            <form action={inlinePeopleResearchAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="prospectDossierId" value={prospectDossierId} />
              <button className="button button-secondary" type="submit">Run person research</button>
            </form>
          </section>

          <section className="detail-section">
            <SectionHeading title="4. Contact points" detail="Source, freshness, status — never guessed" />
            {contacts.length ? contacts.map((c) => (
              <div key={c.id} className="evidence-line">
                <div className="evidence-marker" aria-hidden="true" />
                <div className="evidence-body">
                  <p><strong>{c.channelType}</strong> — {c.displayValue}</p>
                  <div className="inline-meta"><StatusBadge value={c.status} tone={c.status === "source_verified" || c.status === "user_confirmed" ? "success" : c.status === "stale" || c.status === "suppressed" ? "danger" : "warning"} /><span className="tag">{c.confidence}</span><span className="tag">{c.discoveryMethod}</span>{c.lastCheckedAt && <span className="tag">checked {formatDate(c.lastCheckedAt)} {isStale(c.lastCheckedAt) ? "(stale)" : ""}</span>}</div>
                  {c.restrictionNotes && <p className="supporting-copy">{c.restrictionNotes}</p>}
                  {c.status === "candidate" && <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}><form action={confirmContactAction}><input type="hidden" name="prospectDossierId" value={prospectDossierId} /><input type="hidden" name="contactPointId" value={c.id} /><button className="button button-quiet" type="submit">Confirm contact</button></form><form action={rejectContactAction}><input type="hidden" name="prospectDossierId" value={prospectDossierId} /><input type="hidden" name="contactPointId" value={c.id} /><button className="button button-quiet" type="submit">Reject</button></form></div>}
                </div>
              </div>
            )) : <EmptyState title="No contacts" description="Contacts are created from verified sources only. Check a person’s profile URL or public email." />}
          </section>

          <section className="detail-section">
            <SectionHeading title="5. Outreach angles" detail="With evidence and assumptions" />
            {angles.length ? angles.map((a) => (
              <div key={a.id} style={{ border: "1px solid var(--line)", background: "var(--paper-warm)", padding: 16, marginBottom: 12 }}>
                <h3>{a.title}</h3>
                <p className="supporting-copy">Assumptions: {(a.assumptions as string[]).join("; ") || "—"}</p>
                <p className="supporting-copy">Alt: {(a.alternativeExplanations as string[]).join("; ") || "—"}</p>
                <p className="supporting-copy">Q: {(a.confirmationQuestions as string[]).join(" · ") || "—"}</p>
              </div>
            )) : <p>No angles</p>}
          </section>

          <section className="detail-section">
            <SectionHeading title="6. Draft sequence" detail="Max 3 steps · one CTA each · review required" />
            {drafts.length ? drafts.map((d) => (
              <div key={d.id} style={{ borderTop: "1px solid var(--ink)", padding: "14px 0" }}>
                <div className="inline-meta"><StatusBadge value={d.state} /><span className="tag">Step {d.stepNumber}</span><span className="tag">{d.purpose}</span><span className="tag">{d.contentFingerprint.slice(0, 8)}</span></div>
                <h3>Subject: {d.subject}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{d.body}</p>
                {d.personalizationNotes && <p className="supporting-copy">Note: {d.personalizationNotes}</p>}
                <div className="tag-row"><span className="tag">Evidence: {(d.evidenceIds as string[]).join(", ") || "—"}</span><span className="tag">Claims: {(d.claimIds as string[]).join(", ") || "—"}</span></div>
                {d.state !== "gmail_draft_created" && dossier.status !== "gmail_draft_created" && <details style={{ marginTop: 10 }}><summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10 }}>Edit draft</summary><form action={editDraftAction} style={{ display: "grid", gap: 8, marginTop: 10 }}><input type="hidden" name="prospectDossierId" value={prospectDossierId} /><input type="hidden" name="draftId" value={d.id} /><label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Subject<input name="subject" defaultValue={d.subject} maxLength={200} required style={{ width: "100%", marginTop: 4 }} /></label><label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Body<textarea name="body" defaultValue={d.body} maxLength={20_000} required rows={8} style={{ width: "100%", marginTop: 4, resize: "vertical" }} /></label><button className="button button-secondary" type="submit">Save edit and invalidate approval</button></form></details>}
              </div>
            )) : <EmptyState title="No drafts" description="Choose an angle and a verified contact to compose drafts." />}
            {angles.length > 0 && contacts.some((c) => c.status === "source_verified" || c.status === "user_confirmed") && (
              <form action={generateDraftsAction} style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <input type="hidden" name="prospectDossierId" value={prospectDossierId} />
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Angle</label>
                  <select name="angleId" style={{ width: "100%", height: 36 }} required>
                    {angles.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontFamily: "var(--mono)", fontSize: 9 }}>Verified contact</label>
                  <select name="contactPointId" style={{ width: "100%", height: 36 }} required>
                    {contacts.filter((c) => c.status === "source_verified" || c.status === "user_confirmed").map((c) => <option key={c.id} value={c.id}>{c.channelType} · {c.displayValue} · {c.status}</option>)}
                  </select>
                </div>
                <button className="button button-primary" type="submit">Generate drafts</button>
              </form>
            )}
          </section>

          <section className="detail-section">
            <SectionHeading title="7. Job history" detail="Durable progress and failures" />
            {jobs.length ? jobs.map((job) => (
              <div key={job.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                <div className="inline-meta"><StatusBadge value={job.status} /><span className="tag">{job.jobType}</span><span className="tag">attempt {job.attemptCount}</span><span className="tag">{formatDateTime(job.createdAt)}</span></div>
                {job.lastErrorCategory && <p className="supporting-copy" style={{ marginTop: 6 }}>Last issue: {job.lastErrorCategory}{job.lastErrorMessage ? ` · ${job.lastErrorMessage}` : ""}</p>}
                {job.status === "failed_terminal" && <p className="supporting-copy" style={{ marginTop: 6 }}>This job can be retried by submitting the same research action again.</p>}
              </div>
            )) : <EmptyState title="No jobs recorded" description="Research and generation work will appear here as it runs." />}
          </section>

          <section className="detail-section">
            <SectionHeading title="8. Unknowns and questions to validate" />
            <ul className="unknown-list">
              {(dossier.knownUnknowns as string[]).map((u) => <li key={u}>{u}</li>)}
              {(dossier.openQuestions as string[]).map((q) => <li key={q}>{q}</li>)}
              {!((dossier.knownUnknowns as string[])?.length || (dossier.openQuestions as string[])?.length) && <li>No unknowns recorded — check research dossier.</li>}
            </ul>
          </section>

          <section className="detail-section">
            <SectionHeading title="9. Hermes export" detail="Markdown + JSON prospect-dossier.v1" />
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <a className="button button-secondary" href={`/api/prospects/${prospectDossierId}/export?format=markdown`}>Download Markdown</a>
              <a className="button button-quiet" href={`/api/prospects/${prospectDossierId}/export?format=json`}>Download JSON</a>
              {env.APP_ENV !== "production" && <><a className="button button-quiet" href={`/api/prospects/${prospectDossierId}/export?format=markdown&includeContacts=true`}>Private Markdown with verified contacts</a><a className="button button-quiet" href={`/api/prospects/${prospectDossierId}/export?format=json&includeContacts=true`}>Private JSON with verified contacts</a></>}
              <span className="queue-label" style={{ alignSelf: "center" }}>Default downloads redact contacts. Private variants include only fresh source-verified or owner-confirmed contacts.</span>
            </div>
            <p className="supporting-copy" style={{ marginTop: 10 }}>Fingerprint: <code>{dossier.contentFingerprint ?? "not exported yet"}</code></p>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 10 }}>Show redacted JSON preview</summary>
              <pre style={{ overflow: "auto", background: "var(--white)", border: "1px solid var(--line)", padding: 12, fontSize: 11 }}>{JSON.stringify({ dossierId: dossier.id, contacts: contacts.length, angles: angles.length, drafts: drafts.length }, null, 2)}</pre>
            </details>
          </section>

          <section className="detail-section">
            <SectionHeading title="10. Gmail draft creation + approvals" detail="Exact-content approval → freshness + suppression recheck → draft-only" />
            {drafts.length > 0 ? (
              <>
                <form action={approveDraftsAction} style={{ border: "1px solid var(--line)", padding: 16 }}>
                  <input type="hidden" name="prospectDossierId" value={prospectDossierId} />
                  <h3>Approve exact batch</h3>
                  <p className="supporting-copy">Select drafts whose subject + body you reviewed. Any edit invalidates approval.</p>
                  {drafts.map((d) => (
                    <label key={d.id} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                      <input type="checkbox" name="draftId" value={d.id} defaultChecked={drafts.length <= 2} />
                      <span>[Step {d.stepNumber}] {d.subject} · <code>{d.contentFingerprint.slice(0, 8)}</code></span>
                    </label>
                  ))}
                  <button className="button button-primary" type="submit" style={{ marginTop: 12 }}>Approve selected</button>
                </form>

                {approvals.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h3>Approval history</h3>
                    {approvalRows.map(({ approval: a, currentFingerprint }) => (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                        <span><code>{a.id.slice(0, 8)}</code> · {a.actionType} · {formatDateTime(a.createdAt)} · <code>{(a.contentFingerprint as string).slice(0, 8)}</code>{a.result && <> · <StatusBadge value={a.result} /></>}{a.rejectionReason && <small className="supporting-copy" style={{ display: "block" }}>{a.rejectionReason}</small>}</span>
                        {a.result === "invalidated" ? <span className="queue-label">Invalidated by draft edit</span> : a.result === "succeeded" ? <span className="queue-label">Gmail drafts created</span> : a.result === "uncertain" ? <span className="queue-label">Uncertain. Reconcile Gmail before retrying.</span> : currentFingerprint === a.contentFingerprint ? <form action={createGmailDraftsAction}><input type="hidden" name="approvalId" value={a.id} /><input type="hidden" name="prospectDossierId" value={prospectDossierId} /><button className="button button-secondary" type="submit">Create Gmail draft{env.GMAIL_PROVIDER === "fixture" ? " (fixture)" : ""}</button></form> : <span className="queue-label">Invalidated by draft edit</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : <EmptyState title="No drafts to approve" description="Drafts must be generated and reviewed before any Gmail draft can be created." />}
            {gmailResults.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3>Gmail result ledger</h3>
                {gmailResults.map((result) => {
                  const status = gmailResultStatus(result.providerResponse);
                  const succeeded = Array.isArray(result.succeededDraftIds) ? result.succeededDraftIds.length : 0;
                  const failed = Array.isArray(result.failedDraftIds) ? result.failedDraftIds.length : 0;
                  const requested = Array.isArray(result.requestedDraftIds) ? result.requestedDraftIds.length : 0;
                  const reason = gmailResultReason(result.providerResponse);
                  return <div key={result.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}><div className="inline-meta"><StatusBadge value={status} /><span className="tag">{succeeded}/{requested} succeeded</span>{failed > 0 && <span className="tag">{failed} failed</span>}<span className="tag">{formatDateTime(result.createdAt)}</span></div>{reason && <p className="supporting-copy" style={{ marginTop: 6 }}>{reason.replaceAll("_", " ")}</p>}{status === "uncertain" && <p className="supporting-copy" style={{ marginTop: 6 }}>External result is uncertain. Reconcile in Gmail before trying again, to avoid duplicate drafts.</p>}</div>;
                })}
              </div>
            )}
            <p className="supporting-copy" style={{ marginTop: 12 }}>Gmail adapter creates drafts only — no send, no scheduling, no mailbox reading. Suppressed or stale contacts are blocked even after approval.</p>
          </section>
        </div>

        <aside className="detail-aside">
          <section className="panel panel-dark">
            <div className="panel-header"><div><h2>Prospect status</h2><p>Draft-only outreach</p></div><Icon name="shield" size={18} /></div>
            <div className="panel-body">
              <div className="inline-meta"><StatusBadge value={dossier.status} /><span className="tag">{researchDossier?.conclusion ?? ""}</span></div>
              {dossier.readinessReason && <p className="dark-copy" style={{ marginTop: 12 }}>{dossier.readinessReason}</p>}
              <p className="dark-copy">This dossier never sends. It prepares source-linked angles and reviewed drafts for Hermes handoff and optional Gmail drafts after exact-content approval.</p>
            </div>
          </section>

          {researchDossier?.sources.length ? (
            <section className="detail-section"><SectionHeading title="Sources" detail={`${researchDossier.sources.length} documents`} /><div className="source-list">{researchDossier.sources.map((s) => <SourceCitation key={s.id} url={s.canonicalUrl} title={s.title} tier={s.sourceTier} fetchedAt={s.fetchedAt} stale={isStale(s.fetchedAt)} />)}</div></section>
          ) : null}

          <section className="detail-section"><SectionHeading title="Suppression + freshness" detail="Checked on every draft and Gmail action" /><p className="supporting-copy">Contacts must be source_verified or user_confirmed, not suppressed, and lastChecked within {env.CONTACT_FRESHNESS_DAYS} days.</p></section>
        </aside>
      </div>
    </main>
  );
}
