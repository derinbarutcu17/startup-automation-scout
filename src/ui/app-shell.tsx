import Link from "next/link";
import { Icon } from "@/src/ui/icons";
import { NavLinks } from "@/src/ui/nav-links";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/scout-runs" aria-label="Startup Automation Scout home">
          <span className="brand-mark" aria-hidden="true"><Icon name="stack" size={19} /></span>
          <span className="brand-copy"><strong>Scout</strong><small>automation research</small></span>
        </Link>
        <NavLinks />
        <div className="sidebar-bottom">
          <div className="mode-note">
            <span className="status-dot status-dot-live" aria-hidden="true" />
            <div><span>Local workspace</span><small>Fixture providers active</small></div>
          </div>
          <div className="sidebar-rule" />
          <span className="version-stamp">v0.1 / evidence-v1</span>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-context"><span className="topbar-mark" aria-hidden="true"><Icon name="terminal" size={15} /></span><span>research control room</span></div>
          <div className="topbar-meta"><span className="privacy-note"><Icon name="shield" size={14} /> Research only</span><span className="topbar-user">DB</span></div>
        </header>
        {children}
      </div>
    </div>
  );
}
