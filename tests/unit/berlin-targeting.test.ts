import { describe, expect, it } from "vitest";
import { evaluateCompany } from "@/src/domain/eligibility";
import { filterRelevantSearchResults } from "@/src/domain/source-relevance";
import { parseProductHuntSeedCsv } from "@/src/modules/product-hunt-seeds";

const profile = { geographicScope: ["Berlin", "Germany"], companySizePolicy: "small_or_medium" as const, maxEmployeeCount: 500, requireCompanySizeEvidence: true, excludedCompanyNames: ["n8n"], excludedCompanyDomains: ["sumup.com"] };

function company(name: string, domain: string) { return { id: "1", canonicalName: name, canonicalDomain: domain, normalizedLocation: "Berlin, Germany", status: "active", identityStatus: "resolved" }; }

describe("Berlin startup targeting", () => {
  it("keeps a Berlin SME and excludes named or oversized companies", () => {
    expect(evaluateCompany(company("Small Co", "small.co"), { hasUsablePublicSource: true, employeeCount: 80, companySize: "medium" }, profile).eligible).toBe(true);
    expect(evaluateCompany(company("n8n", "n8n.io"), { hasUsablePublicSource: true, employeeCount: 300 }, profile).reasonCodes).toContain("company_explicitly_excluded");
    expect(evaluateCompany(company("Large Co", "large.co"), { hasUsablePublicSource: true, employeeCount: 501 }, profile).reasonCodes).toContain("company_too_large");
    expect(evaluateCompany(company("Unknown Co", "unknown.co"), { hasUsablePublicSource: true }, profile).reasonCodes).toContain("company_size_unknown");
  });

  it("rejects an unrelated search result", () => {
    const results = filterRelevantSearchResults([
      { title: "Taktile workflow platform", url: "https://taktile.com/product", snippet: "Taktile" },
      { title: "Keyence landing page", url: "https://keyence.eu/", snippet: "Industrial automation" },
    ], { canonicalName: "Taktile", canonicalDomain: "taktile.com" });
    expect(results).toHaveLength(1);
    expect(results[0]?.url).toContain("taktile.com");
  });

  it("parses Product Hunt seed metadata without inventing rows", () => {
    const rows = parseProductHuntSeedCsv('product_name,company_domain,location,employee_count,product_hunt_url\nExample,example.com,"Berlin, Germany",42,https://www.producthunt.com/products/example');
    expect(rows).toEqual([expect.objectContaining({ productName: "Example", companyDomain: "example.com", employeeCount: 42, companySize: "small" })]);
    expect(parseProductHuntSeedCsv("product_name,company_domain\n")).toEqual([]);
  });
});
