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

  await page.getByRole("button", { name: /Prepare outreach/ }).click();
  await expect(page).toHaveURL(/\/prospects\/[0-9a-f-]+/);
  await expect(page.getByRole("heading", { name: /Prospect dossier v1/ })).toBeVisible();
  await expect(page.getByText(/person_research_ready/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Generate angles" }).click();
  await expect(page.getByText(/angle_review/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Generate drafts" }).click();
  await expect(page.getByText(/drafts_ready/)).toBeVisible({ timeout: 30_000 });

  await page.getByText("Edit draft", { exact: true }).first().click();
  const subject = page.locator('input[name="subject"]').first();
  const body = page.locator('textarea[name="body"]').first();
  await subject.fill(`${await subject.inputValue()} (reviewed)`);
  await body.fill(`${await body.inputValue()}\nReviewed in browser.`);
  await page.getByRole("button", { name: "Save edit and invalidate approval" }).first().click();
  await expect(page.getByText("(reviewed)").first()).toBeVisible();

  const draftCheckboxes = page.locator('input[type="checkbox"][name="draftId"]');
  await expect(draftCheckboxes).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await draftCheckboxes.nth(index).check();
  }
  await page.getByRole("button", { name: "Approve selected" }).click();
  await expect(page.getByText(/approved_for_gmail_draft/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Create Gmail draft (fixture)" }).first().click();
  await expect(page.getByText(/gmail_draft_created/)).toBeVisible({ timeout: 30_000 });

  await page.goto("/reviews");
  await expect(page.getByText("Prototype the deterministic routing first.").first()).toBeVisible();
});

test("mobile report keeps the trust surface readable", async ({ page }) => {
  await page.goto("/scout-runs");
  await expect(page.getByRole("heading", { name: "Research control room" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow-x", "visible");
});
