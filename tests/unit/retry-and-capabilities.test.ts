import { describe, expect, it } from "vitest";
import { retryDelayMs } from "@/src/infrastructure/queue/postgres-queue";
import { recommendDerinCapabilities } from "@/src/modules/derin-capabilities";

describe("resilience and dossier capability recommendations", () => {
  it("uses increasing capped retry delays", () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(2)).toBe(2_000);
    expect(retryDelayMs(8)).toBe(120_000);
    expect(retryDelayMs(100)).toBe(120_000);
  });

  it("always provides Derin's four capability lanes with proof links", () => {
    const offers = recommendDerinCapabilities({ proposedSystem: "AI agent workflow dashboard for review and analytics" });
    expect(offers.map((offer) => offer.capability)).toEqual(expect.arrayContaining(["Product design", "AI and ML workflows", "Agent-native tools", "Data visualization"]));
    expect(offers.every((offer) => offer.proofLinks.length > 0)).toBe(true);
    expect(offers.some((offer) => offer.capability === "Agent-native tools" && offer.proofLinks.some((link) => link.includes("costmaxx")))).toBe(true);
  });
});
