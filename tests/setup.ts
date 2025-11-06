/**
 * Global test setup for Vitest
 *
 * This file is executed before all tests.
 * It configures the test environment, mocks, and global utilities.
 */

import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach } from "vitest";

import { cleanupTestDatabase } from "./helpers/test-db";
import { cleanupTestStorage } from "./helpers/test-storage";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.LOG_SILENT_TEST = "1"; // Silence logs during tests
process.env.MOCK_STORAGE = "true"; // Use local storage for tests

// Ensure required test environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for integration tests. Use a dedicated test database.");
}

beforeAll(async () => {
  console.log("[TEST SETUP] Initializing test environment...");

  // Clean up any existing test data
  await cleanupTestDatabase();
  await cleanupTestStorage();

  console.log("[TEST SETUP] Test environment ready");
});

afterEach(async () => {
  // Clean up after each test to ensure isolation
  await cleanupTestDatabase();
  await cleanupTestStorage();
});

afterAll(async () => {
  console.log("[TEST TEARDOWN] Cleaning up test environment...");

  // Final cleanup
  await cleanupTestDatabase();
  await cleanupTestStorage();

  console.log("[TEST TEARDOWN] Test environment cleaned up");
});
