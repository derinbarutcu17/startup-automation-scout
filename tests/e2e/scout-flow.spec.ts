import { expect, test } from "@playwright/test";

test("fixture seed reaches a reviewable opportunity", async ({ page }) => {
  await page.goto("/scout-runs");
  await expect(page.getByRole("heading", { name: "Research control room" })).toBeVisible();
  await page.getByRole("button", { name: "Use BerlinFlow fixture" }).click();
  await page.getByRole("button", { name: "Research company" }).click();
  await expect(page).toHaveURL(/\/scout-runs\/[0-9a-f-]+/, { timeout: 20_000 });
  await expect(page.locator(".run-status .status-badge")).toHaveText("succeeded", { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Company lanes" })).toBeVisible();
  const opportunityLink = page.getByRole("link", { name: /Ready to inspect|Opportunity/ }).first();
  await expect(opportunityLink).toBeVisible();
  await opportunityLink.click();
  await expect(page).toHaveURL(/\/opportunities\/[0-9a-f-]+/);
  await page.locator('label[for="decision-prototype"]').click();
  await page.getByRole("textbox", { name: "Reviewer note (optional)" }).fill("Prototype the deterministic routing first.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Prototype" })).toBeVisible();
  await page.goto("/reviews");
  await expect(page.getByText("Prototype the deterministic routing first.").first()).toBeVisible();
});

test("mobile report keeps the trust surface readable", async ({ page }) => {
  await page.goto("/scout-runs");
  await expect(page.getByRole("heading", { name: "Research control room" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow-x", "visible");
});
