"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-shell error-shell">
      <div className="empty-state large-empty">
        <span className="empty-mark" aria-hidden="true">!</span>
        <h1>The Scout hit a runtime error.</h1>
        <p>Check that PostgreSQL is running and the database migrations are applied, then try the page again.</p>
        <button className="button button-primary" type="button" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
