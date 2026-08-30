import { domainToASCII } from "node:url";

export function normalizeDomain(input: string): string {
  const raw = input.trim();
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP(S) company URLs are supported");
  const ascii = domainToASCII(url.hostname.toLowerCase());
  if (!ascii) throw new Error("Invalid domain");
  return ascii.replace(/^www\./, "");
}

export function displayNameFromDomain(domain: string): string {
  const stem = domain.split(".")[0] ?? domain;
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC").replace(/\s+/g, " ");
}
