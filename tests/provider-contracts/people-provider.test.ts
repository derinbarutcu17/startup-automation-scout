import { describe, expect, it } from "vitest";
import { FixturePeopleProvider, FixtureGmailProvider } from "@/src/providers/people-fixtures";

describe("people provider contract", () => {
  it("fixture returns max 3 candidates for berlinflow and respects truncation", async () => {
    const p = new FixturePeopleProvider();
    const res = await p.findProfessionalCandidates({ name: "BerlinFlow", domain: "berlinflow.example" }, ["Who owns ops?"]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.length).toBeGreaterThan(0);
      expect(res.value.length).toBeLessThanOrEqual(3);
      // includes linkedin URL candidate
      expect(res.value.some((c) => c.profileUrl?.includes("linkedin.com"))).toBe(true);
      // includes source_verified email
      expect(res.value.some((c) => c.contactChannel === "public_professional_email" && c.contactValue?.includes("@berlinflow.example"))).toBe(true);
    }
  });

  it("sparse domain returns empty without error", async () => {
    const p = new FixturePeopleProvider();
    const res = await p.findProfessionalCandidates({ name: "QuietStack", domain: "quietstack.example" }, []);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.length).toBe(0);
  });

  it("gmail fixture creates draft deterministically and rejects suppressed", async () => {
    const g = new FixtureGmailProvider();
    const ok = await g.createDraft({ to: "ava@berlinflow.example", subject: "Hello", body: "Test" });
    expect(ok.ok).toBe(true);
    const suppressed = await g.createDraft({ to: "suppressed@berlinflow.example", subject: "Hello", body: "Test" });
    expect(suppressed.ok).toBe(false);
    expect((suppressed as { category: string }).category).toBe("access_denied");
  });

  it("gmail idempotency key prevents duplicate on retry", async () => {
    // This is covered by repository layer, but provider deterministic ids help
    const g = new FixtureGmailProvider();
    const r1 = await g.createDraft({ to: "ava@berlinflow.example", subject: "Same", body: "Same Body" });
    const r2 = await g.createDraft({ to: "ava@berlinflow.example", subject: "Same", body: "Same Body" });
    expect(r1.ok && r2.ok && (r1 as { value: { draftId: string } }).value.draftId).toBe((r2 as { value: { draftId: string } }).value.draftId);
  });
});
