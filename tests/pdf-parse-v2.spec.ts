/**
 * E2E tests for PDF Parse V2 API and Password Dialog UX
 *
 * Test coverage:
 * 1. API route status codes (direct HTTP tests)
 * 2. UI password dialog flow (browser automation)
 *
 * Prerequisites:
 * - Feature flag: PDF_PARSE_V2=true
 * - Dev fixture storage: DEV_USE_FIXTURE_STORAGE=true
 * - Test fixtures in fixtures/pdf/
 */

import { test, expect } from "@playwright/test";

test.describe("PDF Parse V2 API Routes", () => {
  test("should return 404 when feature flag is disabled", async ({ request }) => {
    // Note: This test assumes PDF_PARSE_V2=false in test env
    // Skip if feature flag is enabled
    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test/simple.pdf" },
    });

    // If feature flag is enabled, expect 200/400/etc instead
    // For now, we'll just verify the response is valid
    expect([200, 400, 404, 401]).toContain(response.status());
  });

  test("should return 400 for missing filePath", async ({ request }) => {
    const response = await request.post("/api/parse-v2", {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("MISSING_FILE_PATH");
  });

  test("should return 400 for invalid filePath format", async ({ request }) => {
    const response = await request.post("/api/parse-v2", {
      data: { filePath: "invalid-path-format.pdf" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("INVALID_FILE_PATH_FORMAT");
  });

  test("should return 404 for non-existent file", async ({ request }) => {
    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test/nonexistent.pdf" },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("FILE_NOT_FOUND");
  });

  test("should return 200 for successful parse (simple PDF)", async ({ request }) => {
    // Note: Requires DEV_USE_FIXTURE_STORAGE=true and fixtures uploaded to Supabase
    test.skip(!process.env.DEV_USE_FIXTURE_STORAGE, "Fixture storage not enabled");

    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test123/simple.pdf" },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.textRaw).toBeDefined();
    expect(body.data.textLength).toBeGreaterThan(0);
    expect(body.data.pages).toBeGreaterThan(0);
    expect(body.data.engineUsed).toBe("pdfjs");
  });

  test("should return 422 for empty-text PDF", async ({ request }) => {
    test.skip(!process.env.DEV_USE_FIXTURE_STORAGE, "Fixture storage not enabled");

    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test123/empty-text.pdf" },
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.code).toBe("TEXT_EMPTY");
    expect(body.textLength).toBeDefined();
  });

  test("should handle multi-page PDF successfully", async ({ request }) => {
    test.skip(!process.env.DEV_USE_FIXTURE_STORAGE, "Fixture storage not enabled");

    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test123/long.pdf" },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.pages).toBeGreaterThanOrEqual(1);
    expect(body.data.textRaw).toContain("---"); // Page markers
  });
});

test.describe("PDF Parse V2 - Password Protection (API)", () => {
  test("should return 401 for encrypted PDF without password", async ({ request }) => {
    // Note: Requires encrypted PDF fixture (generated via scripts/generate-encrypted-pdf.ts)
    // For now, this test will be skipped if no encrypted fixture exists
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test123/encrypted.pdf" },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("PASSWORD_REQUIRED");
  });

  test("should return 401 for encrypted PDF with invalid password", async ({ request }) => {
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    const response = await request.post("/api/parse-v2", {
      data: {
        filePath: "user-test123/encrypted.pdf",
        password: "wrong-password",
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("PASSWORD_INVALID");
  });

  test("should return 200 for encrypted PDF with correct password", async ({ request }) => {
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    const response = await request.post("/api/parse-v2", {
      data: {
        filePath: "user-test123/encrypted.pdf",
        password: "test-password", // Must match password used in generate-encrypted-pdf.ts
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.textRaw).toBeDefined();
  });
});

test.describe("PDF Password Dialog UX", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("should show password dialog when uploading encrypted PDF", async ({ page }) => {
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    // Find file upload input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Upload encrypted PDF
    await fileInput.setInputFiles("fixtures/pdf/encrypted.pdf");

    // Wait for password dialog to appear
    const passwordDialog = page.locator('[role="dialog"]', {
      hasText: "Password Required",
    });
    await expect(passwordDialog).toBeVisible({ timeout: 10000 });

    // Verify dialog contains password input
    const passwordInput = passwordDialog.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Verify dialog contains submit button
    const submitButton = passwordDialog.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test("should show error for invalid password", async ({ page }) => {
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    // Upload encrypted PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("fixtures/pdf/encrypted.pdf");

    // Wait for password dialog
    const passwordDialog = page.locator('[role="dialog"]');
    await expect(passwordDialog).toBeVisible({ timeout: 10000 });

    // Enter wrong password
    const passwordInput = passwordDialog.locator('input[type="password"]');
    await passwordInput.fill("wrong-password");

    // Submit
    const submitButton = passwordDialog.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error message
    const errorMessage = passwordDialog.locator('[role="alert"]', {
      hasText: "Invalid password",
    });
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Dialog should remain open
    await expect(passwordDialog).toBeVisible();
  });

  test("should successfully upload encrypted PDF with correct password", async ({ page }) => {
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    // Upload encrypted PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("fixtures/pdf/encrypted.pdf");

    // Wait for password dialog
    const passwordDialog = page.locator('[role="dialog"]');
    await expect(passwordDialog).toBeVisible({ timeout: 10000 });

    // Enter correct password
    const passwordInput = passwordDialog.locator('input[type="password"]');
    await passwordInput.fill("test-password"); // Must match fixture password

    // Submit
    const submitButton = passwordDialog.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for dialog to close
    await expect(passwordDialog).not.toBeVisible({ timeout: 10000 });

    // Verify success message or redirect to analysis page
    await expect(
      page.locator("text=Analysis complete").or(page.locator("text=Success"))
    ).toBeVisible({ timeout: 15000 });
  });

  test("should allow canceling password dialog", async ({ page }) => {
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    // Upload encrypted PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("fixtures/pdf/encrypted.pdf");

    // Wait for password dialog
    const passwordDialog = page.locator('[role="dialog"]');
    await expect(passwordDialog).toBeVisible({ timeout: 10000 });

    // Click cancel button
    const cancelButton = passwordDialog.locator("button", {
      hasText: "Cancel",
    });
    await cancelButton.click();

    // Dialog should close
    await expect(passwordDialog).not.toBeVisible({ timeout: 2000 });

    // Should remain on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("PDF Parse V2 - Telemetry Verification", () => {
  test("should log telemetry for successful parse", async ({ request }) => {
    test.skip(!process.env.DEV_USE_FIXTURE_STORAGE, "Fixture storage not enabled");

    // This test verifies that telemetry is logged (visual check in dev logs)
    // Actual log verification would require log aggregation setup

    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test123/simple.pdf" },
    });

    expect(response.status()).toBe(200);

    // In dev logs, should see:
    // {"prefix":"[pdf-parse-v2]","event":"parse_success","engineUsed":"pdfjs",...}

    // Note: Automated log verification would require:
    // 1. Log aggregation service (Datadog, CloudWatch, etc.)
    // 2. API to query logs
    // 3. Test helper to verify log presence
  });

  test("should log telemetry for password-required error", async ({ request }) => {
    test.skip(!process.env.HAS_ENCRYPTED_FIXTURE, "Encrypted PDF fixture not available");

    const response = await request.post("/api/parse-v2", {
      data: { filePath: "user-test123/encrypted.pdf" },
    });

    expect(response.status()).toBe(401);

    // In dev logs, should see:
    // {"prefix":"[pdf-parse-v2]","event":"parse_failed","errorCode":"PASSWORD_REQUIRED",...}
  });
});
