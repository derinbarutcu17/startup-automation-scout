import { describe, expect, it } from "vitest";
import { isBlockedIp, validateOutboundUrl } from "@/src/infrastructure/retrieval/safe-http";

describe("safe retrieval boundary", () => {
  it.each(["127.0.0.1", "10.2.3.4", "172.16.0.4", "192.168.1.2", "169.254.4.2", "::1", "fc00::1", "fe80::1"]) ("blocks private target %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it("keeps a public address eligible", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("2001:4860:4860::8888")).toBe(false);
  });

  it.each(["file:///etc/passwd", "http://localhost/health", "http://127.0.0.1/admin", "https://user:pass@example.com/secret"]) ("rejects unsafe URL %s", async (url) => {
    await expect(validateOutboundUrl(url)).rejects.toThrow();
  });
});
