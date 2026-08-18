import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import unusedImports from "eslint-plugin-unused-imports";
import astroPlugin from "eslint-plugin-astro";

export default [
  // Global ignore patterns
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "node_modules/**",
      "package-lock.json",
      "coverage/**",
      ".agents/**",
    ],
  },

  // Base recommended JavaScript rules
  eslint.configs.recommended,

  // TypeScript and TSX files
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
  })),

  // Astro files recommended configuration
  ...astroPlugin.configs.recommended,

  // Comprehensive Stylistic & Code Quality Rules for TypeScript & JavaScript
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "@stylistic": stylistic,
      "unused-imports": unusedImports,
    },
    rules: {
      // 1. Line endings and indentation
      "@stylistic/linebreak-style": ["error", "unix"],
      "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],
      "@stylistic/no-mixed-spaces-and-tabs": "error",
      "@stylistic/eol-last": ["error", "always"],

      // 2. Quotes and Semicolons
      "@stylistic/quotes": [
        "error",
        "double",
        {
          avoidEscape: true,
          allowTemplateLiterals: "avoidEscape",
        },
      ],
      "@stylistic/jsx-quotes": ["error", "prefer-double"],
      "@stylistic/semi": ["error", "always"],

      // 3. Trailing commas
      "@stylistic/comma-dangle": ["error", "always-multiline"],

      // 4. Stroustrup Brace Style (else on new line) & Mandatory Blocks
      "@stylistic/brace-style": ["error", "stroustrup", { allowSingleLine: false }],
      "curly": ["error", "all"],

      // 5. Clean Imports & No Unused Imports
      "unused-imports/no-unused-imports": "error",
      "no-duplicate-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // 6. Inline Type Imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: false,
        },
      ],

      // 7. Multiline Import/Export (1 item per line)
      "@stylistic/object-curly-newline": [
        "error",
        {
          ImportDeclaration: { multiline: true, minProperties: 1 },
          ExportDeclaration: { multiline: true, minProperties: 1 },
        },
      ],
      "@stylistic/object-property-newline": [
        "error",
        { allowAllPropertiesOnSameLine: false },
      ],

      // 8. Function Parameters & Argument Wrapping
      "@stylistic/function-paren-newline": ["error", "multiline-arguments"],
      "@stylistic/function-call-argument-newline": ["error", "consistent"],
      "@stylistic/arrow-parens": ["error", "always"],

      // 9. Code Quality & Standards
      "eqeqeq": ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": ["error", "always"],
      "prefer-template": "error",
      "no-fallthrough": "error",
      "@stylistic/spaced-comment": ["error", "always", { markers: ["/"] }],
      "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
      "@stylistic/comma-spacing": ["error", { before: false, after: true }],
    },
  },

  // Stylistic Rules for Astro files
  {
    files: ["**/*.astro"],
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/linebreak-style": ["error", "unix"],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/brace-style": ["error", "stroustrup", { allowSingleLine: false }],
      "curly": ["error", "all"],
    },
  },

  // Test files relaxed any rule for negative testing / raw type verification
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
