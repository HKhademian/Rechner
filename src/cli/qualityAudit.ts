import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// Set Telemetry and Tracking disabled in runner environment
process.env.ASTRO_TELEMETRY_DISABLED = "1";
process.env.DO_NOT_TRACK = "1";

interface DiagnosticMessage {
  readonly type: "ERROR" | "WARN" | "INFO";
  readonly category: string;
  readonly file?: string;
  readonly line?: number;
  readonly message: string;
}

const diagnostics: DiagnosticMessage[] = [];

function logSection(title: string): void {
  console.log(`\n========================================================`);
  console.log(`🔍  ${title}`);
  console.log(`========================================================`);
}

function addDiagnostic(
  type: "ERROR" | "WARN" | "INFO",
  category: string,
  message: string,
  file?: string,
  line?: number,
): void {
  diagnostics.push({ type, category, message, file, line });
  const icon = type === "ERROR" ? "❌" : type === "WARN" ? "⚠️ " : "ℹ️ ";
  const loc = file ? (line ? ` [${file}:${line}]` : ` [${file}]`) : "";
  console.log(`${icon} [${type}] ${category}${loc}: ${message}`);
}

function runCommand(cmd: string, args: string[], category: string): boolean {
  const result = spawnSync(cmd, args, {
    stdio: "pipe",
    encoding: "utf-8",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", DO_NOT_TRACK: "1" },
  });

  if (result.status !== 0) {
    const errorOutput = (result.stdout + "\n" + result.stderr).trim();
    addDiagnostic(
      "ERROR",
      category,
      errorOutput || `Command failed with exit code ${result.status}`,
    );
    return false;
  }
  return true;
}

// 1. Static Rule Scans (Rule 19, Rule 20, Rule 18)
function scanSourceFiles(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== "node_modules" &&
        entry.name !== "dist" &&
        entry.name !== ".git"
      ) {
        scanSourceFiles(fullPath);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        const trimmed = lineText.trim();

        // Check for forbidden playful gradient strings
        if (
          trimmed.includes("linear-gradient(") &&
          (trimmed.includes("#ff00") ||
            trimmed.includes("fuchsia") ||
            trimmed.includes("pink"))
        ) {
          addDiagnostic(
            "WARN",
            "DesignSystem (Rule 19)",
            "Detected non-institutional gradient. Use Slate/Cobalt tokens instead.",
            fullPath,
            lineNum,
          );
        }

        // Check for raw single quotes in imports
        if (
          trimmed.startsWith("import ") &&
          trimmed.includes("'") &&
          !trimmed.includes("//")
        ) {
          addDiagnostic(
            "WARN",
            "CodeStyle (Rule 20)",
            'Single quotes detected in import. Use double quotes (").',
            fullPath,
            lineNum,
          );
        }

        // Rule 22: Centralized Icons & No Inline SVG / Raw Emojis in UI components
        if (
          entry.name.endsWith(".tsx") &&
          entry.name !== "Icons.tsx" &&
          entry.name !== "TimelineChart.tsx"
        ) {
          if (trimmed.includes("<svg") || trimmed.includes("</svg>")) {
            addDiagnostic(
              "WARN",
              "IconsArchitecture (Rule 22)",
              "Inline <svg> detected in component. Move all SVG icons to src/components/Icons.tsx.",
              fullPath,
              lineNum,
            );
          }
        }
      });
    }
  }
}

// ============================================================================
// Main Quality Audit Execution Flow
// ============================================================================
async function runQualityAudit(): Promise<void> {
  console.log(
    `\n🛡️  GERMAN NET SALARY & BENEFIT SIMULATOR — CODE QUALITY AUDIT`,
  );
  console.log(
    `   Running comprehensive compiler, style, rule & test diagnostics...\n`,
  );

  // Step 1: Prettier Code Style Formatting Check
  logSection("1. Prettier Code Style & Formatting Verification (Rule 20)");
  const prettierBin = path.resolve(process.cwd(), "node_modules/.bin/prettier");
  const formatOk = runCommand(
    prettierBin,
    ["--check", "src/**/*.{ts,tsx,css}", "test/**/*.ts"],
    "FormatCheck",
  );
  if (formatOk) {
    console.log(
      "✓ All source and test files strictly match Prettier code style.",
    );
  } else {
    console.log(
      "💡 Run 'npm run fix' or 'npm run format' to auto-format files.",
    );
  }

  // Step 2: TypeScript Compiler Diagnostics (Compiler Assisted Programming)
  logSection("2. TypeScript Compiler Diagnostics (Rule 10 & Rule 12)");
  const tscBin = path.resolve(process.cwd(), "node_modules/.bin/tsc");
  const typecheckOk = runCommand(tscBin, ["--noEmit"], "Typecheck");
  if (typecheckOk) {
    console.log(
      "✓ TypeScript Compiler passed with 0 errors and nominal type integrity.",
    );
  }

  // Step 3: Static Analysis & Repository Rules Compliance
  logSection("3. Repository Architectural Rules Compliance Scanner");
  scanSourceFiles(path.resolve(process.cwd(), "src"));
  scanSourceFiles(path.resolve(process.cwd(), "test"));
  console.log("✓ Repository structural rule scan completed.");

  // Step 4: Unit and Multi-Year Scenario Test Suites
  logSection("4. Automated Unit & Scenario Test Suite Execution");
  const isInsideTestRunner =
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    Boolean(process.env.QUALITY_AUDIT_NESTED) ||
    process.argv.includes("--skip-tests");

  if (isInsideTestRunner) {
    console.log(
      "ℹ️  Invoked inside parent test runner; skipping recursive test suite execution.",
    );
  } else {
    const testOk = runCommand(
      "node",
      ["--test", "test/**/*.test.ts"],
      "TestSuites",
    );
    if (testOk) {
      console.log("✓ All unit and scenario tests passed cleanly.");
    }
  }

  // Summary Report
  logSection("Quality Audit Summary Report");
  const errorCount = diagnostics.filter((d) => d.type === "ERROR").length;
  const warnCount = diagnostics.filter((d) => d.type === "WARN").length;

  console.log(
    `Total Errors:   ${errorCount === 0 ? "0 (Clean) ✓" : errorCount}`,
  );
  console.log(`Total Warnings: ${warnCount === 0 ? "0 (Clean) ✓" : warnCount}`);

  if (errorCount > 0) {
    console.log(
      `\n❌ Quality Audit FAILED with ${errorCount} error(s). Please resolve them before proceeding.`,
    );
    process.exit(1);
  } else if (warnCount > 0) {
    console.log(`\n⚠️  Quality Audit PASSED with ${warnCount} warning(s).`);
    process.exit(0);
  } else {
    console.log(
      `\n✅ Quality Audit PASSED with 100% excellence. Ready for deployment and git commit!`,
    );
    process.exit(0);
  }
}

runQualityAudit().catch((err) => {
  console.error("Fatal audit execution error:", err);
  process.exit(1);
});
