import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    // Include only .test.ts files, exclude Playwright .spec.ts files
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/*.spec.{ts,tsx}", // Exclude Playwright tests
    ],
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
