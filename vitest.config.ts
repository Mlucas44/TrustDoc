import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "TrustDoc Integration Tests",
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/integration/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: ["tests/**/*.spec.ts", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts", "app/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/*.spec.ts",
        "**/*.test.ts",
      ],
    },
    testTimeout: 30000, // 30s for integration tests with LLM mocks
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
