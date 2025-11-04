import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      import: importPlugin,
      "unused-imports": unusedImportsPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/self-closing-comp": "warn",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],

      // TypeScript
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // Imports
      "unused-imports/no-unused-imports": "warn",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "warn",

      // General
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "warn",

      // Prettier
      "prettier/prettier": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
  },
  {
    // Scripts and Prisma: disable parserOptions.project and allow console.log
    // These files are excluded from tsconfig.json (not part of Next.js build)
    files: ["scripts/**/*.{js,ts}", "prisma/**/*.{js,ts}"],
    languageOptions: {
      parserOptions: {
        project: null, // Disable project-based linting for these files
      },
    },
    rules: {
      "no-console": "off",
      // Disable TypeScript rules that require type information
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ignores: [
      ".next/*",
      "node_modules/*",
      "playwright-report/*",
      "test-results/*",
      "coverage/*",
      "dist/*",
      "build/*",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "src/services/idempotency.ts",
      "src/services/pipeline/run-analysis.ts",
    ],
  },
];
