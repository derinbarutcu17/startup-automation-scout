import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell error-shell">
      <div className="empty-state large-empty">
        <span className="empty-mark" aria-hidden="true">?</span>
        <h1>That record is not in the ledger.</h1>
        <p>It may have been removed from the current run or the link is out of date.</p>
        <Link className="button button-primary" href="/scout-runs">Back to Scout Runs</Link>
      </div>
    </main>
  );
}
