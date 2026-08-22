import { expect, test } from "@playwright/test";

/**
 * Public-page smoke suite — no auth required.
 *
 * Selector policy:
 *   - Role/label locators first (survive redesigns).
 *   - Placeholder fallback where the app renders visual-only <label> elements
 *     without htmlFor/id associations (see crs-calculator).
 *   - One structural XPath escape hatch for the CRS score readout, which has no
 *     accessible name, testid, or stable role. Flagged inline below.
 *
 * All waits are web-first (`expect(...)` auto-retries); zero hard sleeps.
 */

test.describe("ImmigDesk smoke — public pages", () => {
  test("home page loads with hero and CTA", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /Immigration Case Management Software/i
    );
    await expect(page.getByRole("link", { name: "Start free trial" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();

    // No server-rendered error surface (Next.js prod error pages / overlays).
    await expect(
      page.getByText(/Application error|Internal Server Error/i)
    ).toHaveCount(0);
  });

  test("/login renders email and password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    // exact:true — a regex would substring-match "Sign in with Google" too.
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true })
    ).toBeVisible();
  });

  test("/signup renders organization name field", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel(/Organization name/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
  });

  test("CRS calculator renders and shows a live numeric score", async ({ page }) => {
    await page.goto("/crs-calculator");
    await expect(
      page.getByRole("heading", { name: /CRS Score Calculator/i })
    ).toBeVisible();

    // The lead-capture inputs have visual-only labels (no htmlFor), so the
    // placeholder is the resilient handle. exact:true prevents the
    // case-insensitive "john" substring from colliding with the email field.
    await page.getByPlaceholder("John", { exact: true }).fill("Test");
    await page.getByPlaceholder("Doe", { exact: true }).fill("User");
    await page.getByPlaceholder("john@example.com").fill("test@example.com");

    // Escape hatch: the score readout is an unlabeled <p> sibling of the
    // "Estimated CRS Score" caption — no accessible name or testid exists yet.
    const scoreValue = page.locator(
      "xpath=//p[normalize-space()='Estimated CRS Score']/following-sibling::p[1]"
    );

    // Web-first: retries until the client-side calculation renders a number.
    await expect(scoreValue).toHaveText(/^\d+$/);
    const score = Number((await scoreValue.textContent())?.trim());
    expect(Number.isFinite(score)).toBeTruthy();
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test("/knowledge gates anonymous users behind /login", async ({ page }) => {
    await page.goto("/knowledge");
    // requireAuth() 307-redirects to /login; Playwright follows the chain.
    await expect(page).toHaveURL(/\/login/);
  });

  test("/portal/not-a-real-token renders an expired-link view, not a crash", async ({
    page,
  }) => {
    const response = await page.goto("/portal/not-a-real-token");
    expect(response?.status() ?? 0).toBeLessThan(500);
    await expect(
      page.getByRole("heading", { name: /Link Expired or Invalid/i })
    ).toBeVisible();
  });
});
