import { resolveCompanySeed } from "@/src/infrastructure/db/repositories";

export interface ProductHuntSeed {
  productName: string;
  companyDomain: string;
  location: string;
  employeeCount: number | null;
  companySize: "small" | "medium" | "large" | "unknown";
  productHuntUrl: string | null;
  tagline: string | null;
  launchDate: string | null;
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (const character of text.replace(/^\uFEFF/, "")) {
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r") continue;
      row.push(field.trim()); field = "";
      if (row.some(Boolean) && !row[0]?.startsWith("#")) rows.push(row);
      row = [];
    } else field += character;
  }
  row.push(field.trim());
  if (row.some(Boolean) && !row[0]?.startsWith("#")) rows.push(row);
  return rows;
}

const value = (row: Record<string, string>, ...keys: string[]) => keys.map((key) => row[key]?.trim()).find(Boolean) ?? "";

export function parseProductHuntSeedCsv(text: string): ProductHuntSeed[] {
  const rows = csvRows(text);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  const parsed: ProductHuntSeed[] = [];
  for (const cells of rows.slice(1)) {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const productName = value(row, "product_name", "name");
    const companyDomain = value(row, "company_domain", "domain", "website");
    if (!productName || !companyDomain) throw new Error("Product Hunt seed requires product_name and company_domain");
    const employeeText = value(row, "employee_count", "employees");
    const employeeCount = employeeText ? Number(employeeText) : null;
    if (employeeCount != null && (!Number.isInteger(employeeCount) || employeeCount < 0)) throw new Error(`Invalid employee_count for ${productName}`);
    const sizeRaw = value(row, "company_size", "size").toLowerCase();
    const companySize = sizeRaw === "small" || sizeRaw === "medium" || sizeRaw === "large" ? sizeRaw : employeeCount != null ? employeeCount > 500 ? "large" : employeeCount <= 50 ? "small" : "medium" : "unknown";
    parsed.push({
      productName,
      companyDomain,
      location: value(row, "location") || "Berlin, Germany",
      employeeCount,
      companySize,
      productHuntUrl: value(row, "product_hunt_url", "producthunt_url") || null,
      tagline: value(row, "tagline") || null,
      launchDate: value(row, "launch_date") || null,
    });
  }
  return parsed;
}

export async function importProductHuntSeeds(csvText: string, scoutRunId: string) {
  const seeds = parseProductHuntSeedCsv(csvText);
  const imported = [];
  for (const seed of seeds) {
    imported.push(await resolveCompanySeed({
      urlOrDomain: seed.companyDomain,
      scoutRunId,
      sourceType: "product_hunt_seed",
      sourceUrl: seed.productHuntUrl ?? undefined,
      externalIdentifier: seed.productHuntUrl ?? seed.productName,
      rawName: seed.productName,
      metadata: {
        location: seed.location,
        employeeCount: seed.employeeCount,
        companySize: seed.companySize,
        productHuntUrl: seed.productHuntUrl,
        tagline: seed.tagline,
        launchDate: seed.launchDate,
      },
    }));
  }
  return imported;
}
