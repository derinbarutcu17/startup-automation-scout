#!/usr/bin/env tsx
/* Generate README proof SVGs from docs/evidence.json. Numbers are never hand-typed. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BG = "#020617";
const PANEL = "#0f172a";
const GRID = "#1e293b";
const CYAN = "#22d3ee";
const EMERALD = "#34d399";
const VIOLET = "#a78bfa";
const AMBER = "#fbbf24";
const ROSE = "#fb7185";
const SLATE = "#94a3b8";
const WHITE = "#e2e8f0";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

interface Evidence {
  companiesResearched: number;
  excludedCompanies: number;
  opportunities: number;
  verifiedHighClaims: number;
  byCompany: Record<string, { sources: number; verifiedHigh: number }>;
}

const evidence: Evidence = JSON.parse(readFileSync("docs/evidence.json", "utf8"));
mkdirSync("assets", { recursive: true });

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function gridPattern(id: string): string {
  return `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="${GRID}" stroke-width="0.5"/></pattern>`;
}

function defsBlock(): string {
  return `<defs>${gridPattern("g")}<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${SLATE}"/></marker></defs>`;
}

// ---------------- hero banner ----------------
function hero(): string {
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240" viewBox="0 0 960 240" font-family="${MONO}">`,
    `<rect width="960" height="240" fill="${BG}"/>`,
    defsBlock(),
    `<rect width="960" height="240" fill="url(#g)"/>`,
    `<text x="48" y="76" font-size="38" font-weight="700" fill="${WHITE}">Evidence-first startup investigation</text>`,
    `<text x="48" y="112" font-size="18" fill="${SLATE}">from public sources to a reviewed opportunity, human in the loop.</text>`,
  ];
  const stats: Array<[string, string, string]> = [
    [`${evidence.companiesResearched}`, "investigated", CYAN],
    [`${evidence.verifiedHighClaims}`, "verified claims", EMERALD],
    [`${evidence.opportunities}`, "opportunities", VIOLET],
  ];
  let x = 48;
  for (const [num, label, color] of stats) {
    lines.push(`<rect x="${x}" y="144" width="272" height="64" rx="8" fill="${PANEL}"/>`);
    lines.push(`<text x="${x + 18}" y="182" font-size="24" font-weight="700" fill="${color}">${num}</text>`);
    lines.push(`<text x="${x + 92}" y="182" font-size="14" fill="${SLATE}">${esc(label)}</text>`);
    x += 288;
  }
  lines.push("</svg>");
  return lines.join("\n");
}

// ---------------- architecture ----------------
function architecture(): string {
  const stages = [
    ["01", "Seed", "SME CSV", CYAN],
    ["02", "Identity", "canonical", SLATE],
    ["03", "Eligibility", "excludes", AMBER],
    ["04", "Research", "sources", CYAN],
    ["05", "Evidence", "claims", EMERALD],
    ["06", "Opportunity", "hypothesis", VIOLET],
    ["07", "Review", "gate", AMBER],
  ];
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420" viewBox="0 0 960 420" font-family="${MONO}">`,
    `<rect width="960" height="420" fill="${BG}"/>`,
    defsBlock(),
    `<rect width="960" height="420" fill="url(#g)"/>`,
    `<text x="48" y="52" font-size="22" font-weight="700" fill="${WHITE}">Pipeline stages</text>`,
  ];
  const boxW = 120;
  const gap = 12;
  let x = 48;
  const y = 88;
  stages.forEach(([num, title, desc, color], i) => {
    lines.push(`<rect x="${x}" y="${y}" width="${boxW}" height="120" rx="6" fill="${PANEL}" stroke="${GRID}"/>`);
    lines.push(`<text x="${x + 12}" y="${y + 28}" font-size="12" fill="${color}">${num}</text>`);
    lines.push(`<text x="${x + 12}" y="${y + 52}" font-size="13" font-weight="700" fill="${WHITE}">${esc(title)}</text>`);
    lines.push(`<text x="${x + 12}" y="${y + 74}" font-size="11" fill="${SLATE}">${esc(desc)}</text>`);
    if (i < stages.length - 1) {
      const ax = x + boxW + 2;
      lines.push(`<line x1="${ax}" y1="${y + 60}" x2="${ax + gap - 4}" y2="${y + 60}" stroke="${SLATE}" stroke-width="1.5" marker-end="url(#arrow)"/>`);
    }
    x += boxW + gap;
  });
  // guardrails panel
  lines.push(`<rect x="48" y="240" width="864" height="132" rx="8" fill="${PANEL}" stroke="${ROSE}" stroke-opacity="0.5"/>`);
  lines.push(`<text x="72" y="272" font-size="14" font-weight="700" fill="${ROSE}">Guardrails (not draft-outsourcing)</text>`);
  lines.push(`<text x="72" y="300" font-size="12" fill="${SLATE}">source-backed evidence only · no guessed emails · no LinkedIn scraping · draft-only, human approval</text>`);
  lines.push(`<text x="72" y="322" font-size="12" fill="${SLATE}">budgeted provider calls · safe-HTTP fetcher · retry with backoff · per-company failure isolation</text>`);
  lines.push(`<text x="72" y="344" font-size="12" fill="${SLATE}">exclusion list blocks large companies · no email send path (Gmail drafts only)</text>`);
  lines.push("</svg>");
  return lines.join("\n");
}

// ---------------- per-company bar chart ----------------
function bars(): string {
  const entries = Object.entries(evidence.byCompany);
  const rows = entries.map(([name, { sources, verifiedHigh }]) => ({ name, sources, verifiedHigh }));
  const max = Math.max(...rows.map((r) => r.sources + r.verifiedHigh), 10);
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${180 + rows.length * 72}" viewBox="0 0 960 ${180 + rows.length * 72}" font-family="${MONO}">`,
    `<rect width="960" height="${180 + rows.length * 72}" fill="${BG}"/>`,
    defsBlock(),
    `<rect width="960" height="${180 + rows.length * 72}" fill="url(#g)"/>`,
    `<text x="48" y="52" font-size="22" font-weight="700" fill="${WHITE}">Live run evidence</text>`,
    `<text x="48" y="80" font-size="13" fill="${SLATE}">retrieved sources (cyan) and verified-high claims (emerald), per company</text>`,
  ];
  const chartX = 250;
  const chartW = 620;
  rows.forEach((row, i) => {
    const y = 110 + i * 72;
    const barH = 26;
    lines.push(`<text x="48" y="${y + 18}" font-size="14" fill="${WHITE}">${esc(row.name)}</text>`);
    const sw = (row.sources / max) * chartW;
    const vw = (row.verifiedHigh / max) * chartW;
    if (sw > 0) lines.push(`<rect x="${chartX}" y="${y}" width="${sw}" height="${barH}" rx="3" fill="${CYAN}"/>`);
    if (vw > 0) lines.push(`<rect x="${chartX + sw + 4}" y="${y}" width="${vw}" height="${barH}" rx="3" fill="${EMERALD}"/>`);
    lines.push(`<text x="${chartX + sw + vw + 12}" y="${y + 18}" font-size="12" fill="${SLATE}">${row.sources} + ${row.verifiedHigh}</text>`);
  });
  lines.push("</svg>");
  return lines.join("\n");
}

writeFileSync("assets/hero-banner.svg", hero());
writeFileSync("assets/architecture.svg", architecture());
writeFileSync("assets/live-evidence.svg", bars());
console.log("assets written:", ["hero-banner.svg", "architecture.svg", "live-evidence.svg"].join(", "));
