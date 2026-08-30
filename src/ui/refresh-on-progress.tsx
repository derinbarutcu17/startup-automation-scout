"use client";

import { useEffect } from "react";

export function RefreshOnProgress({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => window.location.reload(), 2500);
    return () => window.clearInterval(timer);
  }, [active]);
  if (!active) return null;
  return <p className="refresh-note" aria-live="polite"><span className="status-dot status-dot-live" aria-hidden="true" /> Worker active · this view refreshes automatically</p>;
}
