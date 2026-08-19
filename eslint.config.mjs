import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import unusedImports from "eslint-plugin-unused-imports";
import astroPlugin from "eslint-plugin-astro";

const localPlugin = {
  rules: {
    "type-imports-first": {
      meta: {
        type: "layout",
        docs: {
          description: "Enforce type imports and exports before value imports/exports and one specifier per line.",
        },
        fixable: "code",
        schema: [],
        messages: {
          typeImportsFirst: "Type import '{{name}}' must be placed before value imports in named import list.",
          typeExportsFirst: "Type export '{{name}}' must be placed before value exports in named export list.",
          oneImportPerLine: "Import specifier '{{name}}' must be placed on its own line (strictly one element per line).",
          oneExportPerLine: "Export specifier '{{name}}' must be placed on its own line (strictly one element per line).",
        },
      },
      create(context) {
        function checkSpecifiers(node, isExport = false) {
          const specifiers = node.specifiers;
          if (!specifiers || specifiers.length === 0) {
            return;
          }

          const namedSpecs = specifiers.filter(
            (s) => s.type === (isExport ? "ExportSpecifier" : "ImportSpecifier"),
          );
          if (namedSpecs.length === 0) {
            return;
          }

          const sourceCode = context.sourceCode || context.getSourceCode();
          const firstSpec = namedSpecs[0];
          const lastSpec = namedSpecs[namedSpecs.length - 1];
          const openBrace = sourceCode.getTokenBefore(firstSpec, (t) => t.value === "{");
          const closeBrace = sourceCode.getTokenAfter(lastSpec, (t) => t.value === "}");

          if (!openBrace || !closeBrace) {
            return;
          }

          let seenValue = false;
          let orderViolation = null;
          let sameLineViolation = null;

          // Check if opening brace or closing brace shares line with a specifier
          if (openBrace.loc.end.line === firstSpec.loc.start.line) {
            sameLineViolation = firstSpec;
          }
          if (closeBrace.loc.start.line === lastSpec.loc.end.line) {
            sameLineViolation = lastSpec;
          }

          const linesSeen = new Set();
          for (const spec of namedSpecs) {
            const isType = spec.exportKind === "type" || spec.importKind === "type";
            if (isType) {
              if (seenValue && !orderViolation) {
                orderViolation = spec;
              }
            }
            else {
              seenValue = true;
            }

            if (linesSeen.has(spec.loc.start.line) && !sameLineViolation) {
              sameLineViolation = spec;
            }
            linesSeen.add(spec.loc.start.line);
          }

          if (orderViolation || sameLineViolation) {
            const violationNode = orderViolation || sameLineViolation;
            const name = (violationNode.imported || violationNode.local)?.name || "specifier";
            const messageId = orderViolation
              ? (isExport ? "typeExportsFirst" : "typeImportsFirst")
              : (isExport ? "oneExportPerLine" : "oneImportPerLine");

            context.report({
              node: violationNode,
              messageId,
              data: { name },
              fix(fixer) {
                const typeSpecs = namedSpecs.filter(
                  (s) => (s.exportKind === "type" || s.importKind === "type"),
                );
                const valueSpecs = namedSpecs.filter(
                  (s) => !(s.exportKind === "type" || s.importKind === "type"),
                );

                const sortedSpecs = [...typeSpecs, ...valueSpecs];
                const specTexts = sortedSpecs.map((s) => sourceCode.getText(s));

                const replacement = `\n  ${specTexts.join(",\n  ")},\n`;
                return fixer.replaceTextRange([openBrace.range[1], closeBrace.range[0]], replacement);
              },
            });
          }
        }

        return {
          ImportDeclaration(node) {
            checkSpecifiers(node, false);
          },
          ExportNamedDeclaration(node) {
            if (node.specifiers && node.specifiers.length > 0) {
              checkSpecifiers(node, true);
            }
          },
        };
      },
    },
  },
};

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
      "local": localPlugin,
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

      // 6. Inline Type Imports & Types on Top
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "local/type-imports-first": "error",

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
      "local": localPlugin,
    },
    rules: {
      "@stylistic/linebreak-style": ["error", "unix"],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/brace-style": ["error", "stroustrup", { allowSingleLine: false }],
      "curly": ["error", "all"],
      "local/type-imports-first": "error",
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
