import type { Metadata } from "next";
import { AppShell } from "@/src/ui/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Startup Automation Scout",
  description: "Evidence-first startup research for automation opportunities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* THESIS: Make the evidence trace visible as a working ledger, not a dashboard of opaque cards. OWN-WORLD: graphite/navy shell, paper-white research panels, cobalt and citron index marks, mono measurement labels, and ruled dividers. STORY: the owner sees what deserves attention, traces the evidence, and records a human decision. FIRST VIEWPORT: left navigation, current-run pulse, attention queue, and the one-URL research action share the opening frame. FORM: evidence ledger and provenance workbench, grounded direction 7, seed key 334165c0. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
