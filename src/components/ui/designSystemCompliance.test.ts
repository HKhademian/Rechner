import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import {
  join,
} from "node:path";
import {
  describe,
  it,
} from "node:test";
import ts from "typescript";
import {
  THEME_PALETTE_OPTIONS,
  THEME_STYLE_OPTIONS,
} from "#utils/themeConfig";

const ROUTE_COMPONENTS: readonly string[] = [
  "src/components/CalculatorCatalog.tsx",
  "src/components/Calculator.tsx",
  "src/components/elterngeld/ElterngeldDashboard.tsx",
  "src/components/LifeProfileSummaryPage.tsx",
  "src/components/laws/LawReferencePage.tsx",
  "src/apps/company-car/CompanyCarCalculator.tsx",
  "src/apps/housing/HousingCalculator.tsx",
  "src/apps/solar-energy/SolarEnergyCalculator.tsx",
  "src/apps/visa/VisaCalculator.tsx",
  "src/apps/girocode/GiroCodeGenerator.tsx",
  "src/apps/kita/KitaCalculator.tsx",
  "src/apps/minijob-midijob/MinijobMidijobCalculator.tsx",
  "src/apps/commuter-allowance/CommuterAllowanceCalculator.tsx",
  "src/apps/expense-planner/ExpensePlannerCalculator.tsx",
  "src/apps/resignation-runway/ResignationRunwayCalculator.tsx",
  "src/apps/permanent-residency/PermanentResidencyCalculator.tsx",
  "src/apps/citizenship/CitizenshipCalculator.tsx",
  "src/apps/family-milestones/FamilyMilestonesCalculator.tsx",
  "src/apps/childcare-planner/ChildcarePlannerCalculator.tsx",
  "src/apps/travel-planner/TravelPlannerCalculator.tsx",
  "src/apps/tax-class-switch/TaxClassSwitchCalculator.tsx",
  "src/apps/asset-affordability/AssetAffordabilityCalculator.tsx",
  "src/apps/planning-dashboard/PlanningDashboardCalculator.tsx",
  "src/apps/mutterschutz/MutterschutzCalculator.tsx",
  "src/apps/progression-tax/ProgressionTaxCalculator.tsx",
  "src/apps/kindergeld-comparison/KindergeldComparisonCalculator.tsx",
  "src/apps/elterngeld-quick/ElterngeldQuickCalculator.tsx",
  "src/apps/salary-raise/SalaryRaiseCalculator.tsx",
  "src/apps/kalte-progression/KalteProgressionCalculator.tsx",
  "src/apps/cash-reconciliation/CashReconciliationCalculator.tsx",
  "src/apps/age-relief/AgeReliefCalculator.tsx",
];

function walkFiles(
  dir: string,
  extensions: readonly string[],
  out: string[] = [],
): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, out);
    }
    else if (extensions.some((ext) => fullPath.endsWith(ext))) {
      out.push(fullPath);
    }
  }
  return out;
}

describe("design system and layout architecture compliance", () => {
  it("all non-redirect Astro pages wrap their document in BaseDocument.astro", () => {
    const astroPages = walkFiles("src/pages", [".astro"]).filter(
      (file) => file !== "src/pages/elterngeld.astro",
    );
    assert.ok(astroPages.length >= 11, `Expected >= 11 Astro pages, found ${astroPages.length}`);

    for (const page of astroPages) {
      const content = readFileSync(page, "utf8");
      assert.equal(
        content.includes("BaseDocument"),
        true,
        `${page} must import BaseDocument.astro`,
      );
      assert.equal(
        /<BaseDocument[\s>]/.test(content),
        true,
        `${page} must render <BaseDocument>`,
      );
    }
  });

  it("all 10 route components import and render the shared AppShell layout", () => {
    for (const routeFile of ROUTE_COMPONENTS) {
      const sourceText = readFileSync(routeFile, "utf8");
      const sourceFile = ts.createSourceFile(
        routeFile,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      let importsAppShell = false;
      let rendersAppShell = false;

      const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          if (node.moduleSpecifier.text === "#components/ui/AppShell") {
            const named = node.importClause?.namedBindings;
            if (named && ts.isNamedImports(named)) {
              importsAppShell = named.elements.some((el) => el.name.text === "AppShell");
            }
          }
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = ts.isIdentifier(node.tagName) ? node.tagName.text : "";
          if (tag === "AppShell") {
            rendersAppShell = true;
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      assert.equal(importsAppShell, true, `${routeFile} must import AppShell`);
      assert.equal(rendersAppShell, true, `${routeFile} must render <AppShell>`);
    }
  });

  it("defines full light, dark, typography, spacing, z-index, 4 palette, and 3 style token sets in global.css with zero undefined CSS variables", () => {
    const globalCss = readFileSync("src/styles/global.css", "utf8");

    assert.equal(globalCss.includes("[data-theme=\"light\"]"), true);
    assert.equal(globalCss.includes("[data-theme=\"dark\"]"), true);
    assert.equal(globalCss.includes("color-scheme: light;"), true);
    assert.equal(globalCss.includes("color-scheme: dark;"), true);

    const requiredTokens = [
      "--font-family:",
      "--font-display:",
      "--font-mono:",
      "--font-size-2xs:",
      "--font-size-xs:",
      "--font-size-sm:",
      "--font-size-base:",
      "--font-size-md:",
      "--font-size-lg:",
      "--font-size-xl:",
      "--font-size-2xl:",
      "--font-size-hero:",
      "--font-weight-regular:",
      "--font-weight-medium:",
      "--font-weight-semibold:",
      "--font-weight-bold:",
      "--font-weight-extrabold:",
      "--line-height-tight:",
      "--line-height-normal:",
      "--space-1:",
      "--space-2:",
      "--space-3:",
      "--space-4:",
      "--space-5:",
      "--space-6:",
      "--space-8:",
      "--container-default:",
      "--container-wide:",
      "--control-height-sm:",
      "--control-height-md:",
      "--control-height-lg:",
      "--z-sticky:",
      "--z-header:",
      "--z-popover:",
      "--z-modal:",
      "--radius-card:",
      "--radius-control:",
      "--radius-pill:",
      "--shadow-card:",
      "--bg-input:",
      "--border-input:",
      "prefers-reduced-motion",
    ];
    for (const token of requiredTokens) {
      assert.equal(globalCss.includes(token), true, `Missing design token ${token}`);
    }

    for (const option of THEME_PALETTE_OPTIONS) {
      assert.equal(
        globalCss.includes(`[data-palette="${option.value}"]`),
        true,
        `Missing palette selector for ${option.value}`,
      );
      assert.equal(
        globalCss.includes(`[data-theme="dark"][data-palette="${option.value}"]`),
        true,
        `Missing dark mode palette selector for ${option.value}`,
      );
    }

    for (const option of THEME_STYLE_OPTIONS) {
      assert.equal(
        globalCss.includes(`[data-style="${option.value}"]`),
        true,
        `Missing style selector for ${option.value}`,
      );
      assert.equal(
        globalCss.includes(`[data-theme="dark"][data-style="${option.value}"]`),
        true,
        `Missing dark mode style selector for ${option.value}`,
      );
    }

    const definedTokens = new Set<string>();
    for (const file of walkFiles("src", [".css", ".ts", ".tsx"])) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
        definedTokens.add(match[1]);
      }
    }

    const undefinedRefs: string[] = [];
    for (const file of walkFiles("src", [".css", ".ts", ".tsx", ".astro"])) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const match of line.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
          if (!definedTokens.has(match[1])) {
            undefinedRefs.push(`${file}:${index + 1} (${match[1]})`);
          }
        }
      });
    }
    assert.deepEqual(undefinedRefs, [], `Undefined CSS variables found: ${undefinedRefs.join(", ")}`);
  });

  it("contains zero unauthorized hardcoded color literals in UI TSX and CSS files", () => {
    const allowedGiroCodeQrLines = new Set([
      "const QR_PAPER_LIGHT_HEX = \"#ffffff\";",
      "const QR_INK_DARK_HEX = \"#0f172a\";",
    ]);

    const violations: string[] = [];
    for (const file of walkFiles("src", [".tsx", ".css"])) {
      if (file === "src/styles/global.css" || file === "src/components/Icons.tsx") {
        continue;
      }
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (file === "src/apps/girocode/GiroCodeGenerator.tsx" && allowedGiroCodeQrLines.has(trimmed)) {
          return;
        }
        if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|color:\s*["']?white\b|background:\s*["']?white\b/.test(line)) {
          violations.push(`${file}:${index + 1}: ${trimmed}`);
        }
      });
    }

    assert.deepEqual(violations, [], `Unauthorized color literals: ${violations.join("\n")}`);
  });

  it("guards persisted island signals with useHydrated in ThemeToggle, ParameterObserverSection, and GiroCodeGenerator", () => {
    const guardedComponents: readonly string[] = [
      "src/components/ThemeToggle.tsx",
      "src/components/parameters/ParameterObserverSection.tsx",
      "src/apps/girocode/GiroCodeGenerator.tsx",
    ];

    for (const filePath of guardedComponents) {
      const sourceText = readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      let importsUseHydrated = false;
      let callsUseHydrated = false;

      const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          if (node.moduleSpecifier.text === "#/components/ui/useHydrated.ts") {
            const named = node.importClause?.namedBindings;
            if (named && ts.isNamedImports(named)) {
              importsUseHydrated = named.elements.some((el) => el.name.text === "useHydrated");
            }
          }
        }
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "useHydrated"
        ) {
          callsUseHydrated = true;
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      assert.equal(importsUseHydrated, true, `${filePath} must import useHydrated`);
      assert.equal(callsUseHydrated, true, `${filePath} must call useHydrated()`);
    }
  });

  it("stabilizes root scrollbar gutter and locks modal scroll via lockBodyScroll with [open] dependency only", () => {
    const globalCss = readFileSync("src/styles/global.css", "utf8");
    assert.equal(globalCss.includes("scrollbar-gutter: stable;"), true);
    assert.equal(globalCss.includes("--scrollbar-compensation: 0px;"), true);

    const modalPath = "src/components/ui/ModalDialog.tsx";
    const modalSourceText = readFileSync(modalPath, "utf8");
    const modalSource = ts.createSourceFile(
      modalPath,
      modalSourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    let importsLockBodyScroll = false;
    let callsLockBodyScrollInLayoutEffect = false;
    let hasOnlyOpenDep = false;

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        if (node.moduleSpecifier.text === "#utils/uiHelpers") {
          const named = node.importClause?.namedBindings;
          if (named && ts.isNamedImports(named)) {
            importsLockBodyScroll = named.elements.some((el) => el.name.text === "lockBodyScroll");
          }
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "useLayoutEffect" &&
        node.arguments.length === 2
      ) {
        const [effectCallback, depsArg] = node.arguments;
        if (ts.isArrayLiteralExpression(depsArg) && depsArg.elements.length === 1) {
          const onlyDep = depsArg.elements[0];
          if (ts.isIdentifier(onlyDep) && onlyDep.text === "open") {
            hasOnlyOpenDep = true;
          }
        }
        const inspectEffect = (child: ts.Node): void => {
          if (
            ts.isCallExpression(child) &&
            ts.isIdentifier(child.expression) &&
            child.expression.text === "lockBodyScroll"
          ) {
            callsLockBodyScrollInLayoutEffect = true;
          }
          ts.forEachChild(child, inspectEffect);
        };
        inspectEffect(effectCallback);
      }
      ts.forEachChild(node, visit);
    };

    visit(modalSource);
    assert.equal(importsLockBodyScroll, true, "ModalDialog must import lockBodyScroll");
    assert.equal(
      callsLockBodyScrollInLayoutEffect,
      true,
      "ModalDialog must call lockBodyScroll inside useLayoutEffect",
    );
    assert.equal(
      hasOnlyOpenDep,
      true,
      "ModalDialog scroll-lock useLayoutEffect must depend only on [open]",
    );
  });

  it("keeps THIRD_PARTY_NOTICES aligned with installed dependencies without removed libraries", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      readonly dependencies: Readonly<Record<string, string>>;
    };
    const noticesTxt = readFileSync("public/THIRD_PARTY_NOTICES.txt", "utf8");
    const noticesMd = readFileSync("THIRD_PARTY_NOTICES.md", "utf8");

    for (const noticeContent of [noticesTxt, noticesMd]) {
      for (const forbidden of ["qrcode-generator", "kazuhikoarase", "denso-wave"]) {
        assert.equal(
          noticeContent.toLowerCase().includes(forbidden),
          false,
          `Third-party notices must not reference removed package or URL: ${forbidden}`,
        );
      }

      for (const dep of Object.keys(pkg.dependencies)) {
        assert.equal(
          noticeContent.includes(dep),
          true,
          `Third-party notices must document runtime dependency: ${dep}`,
        );
      }

      const listedPackages = [...noticeContent.matchAll(/(@?[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)?)\s*`?\s*\(\d+\.\d+\.\d+/g)]
        .map((match) => match[1].replace(/`/g, ""));
      assert.ok(listedPackages.length >= 5, "Expected third-party notices to list installed packages");

      for (const listedPkg of listedPackages) {
        const installed =
          existsSync(join("node_modules", listedPkg, "package.json")) ||
          existsSync(join("node_modules", listedPkg.toLowerCase(), "package.json"));
        assert.equal(
          installed,
          true,
          `Notice package ${listedPkg} must be installed in node_modules`,
        );
      }
    }
  });
});
