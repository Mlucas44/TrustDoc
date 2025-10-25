import { test, expect } from "@playwright/test";

test.describe("TrustDoc Application", () => {
  test("homepage displays TrustDoc title", async ({ page }) => {
    await page.goto("/");

    // Verify the title is present
    const heading = page.locator("h1");
    await expect(heading).toHaveText("TrustDoc");
  });

  test("health endpoint returns ok status", async ({ request }) => {
    const response = await request.get("/api/health");

    // Verify status code
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify response body
    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });
});
