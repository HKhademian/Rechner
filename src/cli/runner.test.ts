import {
  ledgerRowsFixture,
} from "../../test/fixture/ledgerRows.ts";
import {
  computeGrossToNetBreakdown,
  deriveSpousalNetSalaries,
} from "#engine/tax/wageTax";
import {
  TaxClass,
  SalaryPeriod,
  toGrossSalary,
  FieldColumnKey,
} from "#engine/types";
import {
  mock,
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  execFile,
} from "node:child_process";
import {
  promisify,
} from "node:util";
import {
  printLedgerTable,
  printSummaryScorecard,
  normalizeCliGross,
  parseMonthArg,
  parseFieldArg,
} from "#cli/runner";

const rawExecFileAsync = promisify(execFile);
const execFileAsync = (cmd: string, args: readonly string[]) =>
  rawExecFileAsync(cmd, args, {
    // Multi-scenario JSON includes itemized monthly payroll audit records.
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env,
      NODE_ENV: "test",
      SIMULATOR_TEST_MODE: "true" },
  });

describe("Headless CLI Scenario Runner & Explainer (src/cli/runner.ts)", () => {
  describe("Argument Parsers (parseMonthArg & parseFieldArg)", () => {
    it("parses various month string formats cleanly", () => {
      assert.equal(parseMonthArg("Sim21"), 21);
      assert.equal(parseMonthArg("sim21"), 21);
      assert.equal(parseMonthArg("M21"), 21);
      assert.equal(parseMonthArg("m21"), 21);
      assert.equal(parseMonthArg("21"), 21);
      assert.equal(parseMonthArg("Month 14"), 14);
      assert.equal(parseMonthArg("M09.2027"), "M09.2027");
      assert.equal(parseMonthArg("M092027"), "M09.2027");
      assert.equal(parseMonthArg("m01.2027"), "M01.2027");
      assert.equal(parseMonthArg("M1"), 1);
      assert.equal(parseMonthArg("M-8"), "M-8");
      assert.throws(() => parseMonthArg(""), /Missing month argument/);
    });

    it("resolves field aliases to canonical FieldColumnKeys", () => {
      assert.equal(parseFieldArg("partner"), FieldColumnKey.HusbandElterngeld);
      assert.equal(parseFieldArg("father"), FieldColumnKey.HusbandElterngeld);
      assert.equal(
        parseFieldArg("husbandElterngeld"),
        FieldColumnKey.HusbandElterngeld,
      );
      assert.equal(parseFieldArg("mother"), FieldColumnKey.WifeElterngeld);
      assert.equal(
        parseFieldArg("wifeElterngeld"),
        FieldColumnKey.WifeElterngeld,
      );
      assert.equal(parseFieldArg("egplus"), FieldColumnKey.WifeElterngeld);
      assert.equal(parseFieldArg("mutterschutz"), FieldColumnKey.Mutterschutz);
      assert.equal(parseFieldArg("maternity"), FieldColumnKey.Mutterschutz);
      assert.equal(parseFieldArg("husband"), FieldColumnKey.HusbandSalary);
      assert.equal(parseFieldArg("wife"), FieldColumnKey.WifeSalary);
      assert.equal(parseFieldArg("taxClass"), FieldColumnKey.TaxClass);
      assert.equal(parseFieldArg("kindergeld"), FieldColumnKey.Kindergeld);
      assert.equal(parseFieldArg("special"), FieldColumnKey.SpecialEvents);
      assert.equal(parseFieldArg("net"), FieldColumnKey.NetInflow);
      assert.equal(parseFieldArg("cumulative"), FieldColumnKey.CumulativeTotal);
      assert.throws(
        () => parseFieldArg("unknown_field"),
        /Unknown explanation field/,
      );
    });
  });

  describe("CLI Execution", () => {
    it("executes full headless comparison simulation via CLI and returns 0 exit code", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "-f",
        "summary",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("GERMAN ELTERNGELD SIMULATION KPI SCORECARD"));
      assert.ok(stdout.includes("Scenario A (Status Quo)"));
      assert.ok(stdout.includes("Scenario B (Unoptimized)"));
      assert.ok(stdout.includes("Scenario C (Optimized)"));
      assert.ok(
        stdout.includes("Cash-flow difference (Scenario C vs B)"),
      );
    });

    it("outputs valid, structured JSON ledger when --format json is provided", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "--format",
        "json",
        "-d",
        "24",
      ]);
      assert.equal(stderr, "");

      const data = JSON.parse(stdout);
      assert.equal(data.options.duration, 24);
      assert.ok(data.scenarioA);
      assert.ok(data.scenarioB);
      assert.ok(data.scenarioC);
      assert.equal(data.scenarioC.months.length, 24);
      assert.ok(data.scenarioC.summary.grandTotal > 0);
    });

    it("supports custom salary raises and displays milestone breakdown", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "-s",
        "C",
        "-r",
        "0.05",
        "-d",
        "36",
        "-f",
        "milestones",
      ]);
      assert.equal(stderr, "");
      assert.ok(
        stdout.includes(
          "Key Life Milestones & Special Events Timeline (36 Months)",
        ),
      );
      assert.ok(stdout.includes("Mutterschutz"));
    });

    it('explains full monthly audit when "explain M21" command is invoked', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "explain",
        "M21",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("FULL MONTHLY AUDIT: Month 21"));
      assert.ok(stdout.includes("Monthly Net Inflow:"));
      assert.ok(stdout.includes("Itemized Cash Flow Breakdown:"));
      assert.ok(
        stdout.includes("Husband's Net Salary") ||
          stdout.includes("Husband's Salary"),
      );
      assert.ok(
        stdout.includes("Mother's Elterngeld / ElterngeldPlus") ||
          stdout.includes("Mother's Elterngeld"),
      );
      assert.ok(
        stdout.includes("Father's Partner Months / Bonus") ||
          stdout.includes("Father's Elterngeld"),
      );
      assert.ok(stdout.includes("Kindergeld"));
    });

    it('explains monthly audit using nominal MonthId "explain M09.2026"', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "explain",
        "M09.2026",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("FULL MONTHLY AUDIT:"));
      assert.ok(stdout.includes("M09.2026"));
      assert.ok(stdout.includes("Sim9"));
      assert.ok(stdout.includes("M1 (Pregnancy Positive)"));
    });

    it('explains monthly audit using nominal MonthSimRef "explain Sim9"', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "explain",
        "Sim9",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("FULL MONTHLY AUDIT:"));
      assert.ok(stdout.includes("M09.2026"));
      assert.ok(stdout.includes("Sim9"));
      assert.ok(stdout.includes("M1 (Pregnancy Positive)"));
    });

    it("prints ledger table with Rel. Month, Month ID, and Sim Ref columns", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "-f",
        "table",
        "-d",
        "12",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("Rel. Month"));
      assert.ok(stdout.includes("Month ID"));
      assert.ok(stdout.includes("Sim Ref"));
      assert.ok(stdout.includes("M01.2026"));
      assert.ok(stdout.includes("M09.2026"));
      assert.ok(stdout.includes("Sim1"));
      assert.ok(stdout.includes("Sim9"));
      assert.ok(stdout.includes("M-8"));
      assert.ok(stdout.includes("M1 (Pregnancy Positive)"));
    });

    it('explains specific field step-by-step calculation when "explain M21 field partner" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "explain",
        "M21",
        "field",
        "partner",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("FIELD EXPLANATION: Father's ElterngeldPlus"));
      assert.ok(stdout.includes("Value:"));
      assert.ok(stdout.includes("Overlap credits"));
      assert.ok(stdout.includes("Legal Citation:"));
      assert.ok(stdout.includes("BEEG §§"));
      assert.ok(stdout.includes("Contributing Parameters / Factors:"));
      assert.ok(stdout.includes("Step-by-Step Calculation Breakdown:"));
    });

    it('explains Mother ElterngeldPlus replacement calculation when "explain M19 field mother" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "explain",
        "M19",
        "field",
        "mother",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("FIELD EXPLANATION: Mother's ElterngeldPlus"));
      assert.ok(stdout.includes("claim cohorts"));
      assert.ok(stdout.includes("Entitlement before overlap credits"));
      assert.ok(stdout.includes("Overlap credits"));
      assert.ok(stdout.includes("Step-by-Step Calculation Breakdown:"));
    });

    it('outputs structured JSON when "explain M21 field partner -f json" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "explain",
        "M21",
        "field",
        "partner",
        "-f",
        "json",
      ]);
      assert.equal(stderr, "");

      const parsed = JSON.parse(stdout);
      assert.equal(parsed.simulationMonth, 21);
      assert.equal(parsed.fieldKey, "husbandElterngeld");
      assert.ok(parsed.explanation.valueFormatted.includes("150"));
      assert.ok(parsed.explanation.contributingFactors.length >= 3);
      assert.ok(parsed.explanation.calculationSteps.length >= 2);
    });

    it('executes "gross-to-net -g 4500 -c III" and returns itemized tax breakdown', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "gross-to-net",
        "-g",
        "4500",
        "-c",
        "III",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("STATUTORY GROSS-TO-NET BREAKDOWN"));
      assert.ok(stdout.includes("4.500 €"));
      assert.ok(stdout.includes("Health Insurance (GKV"));
      assert.ok(stdout.includes("Pension Insurance (GRV"));
      assert.ok(stdout.includes("Monthly Net Take-Home Pay:"));
      assert.ok(stdout.includes("Regular Net Excluding Bonuses:"));
      assert.ok(!stdout.includes("Elterngeld Synthetic Net (§ 2c):"));
    });

    it('executes "gross-to-net -g 3000 -c V -b 2000" with Sonstige Bezüge bonus taxation', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "gross-to-net",
        "-g",
        "3000",
        "-c",
        "V",
        "-b",
        "2000",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("Non-Recurrent Bonus:"));
      assert.ok(stdout.includes("2.000 €"));
      assert.ok(stdout.includes("Bonus Tax (Annual Differential):"));
      assert.ok(stdout.includes("Sonstige Bezüge § 39b EStG"));
    });

    it('executes "spousal-net --husband-gross 4500 --wife-gross 3000 --wife-hours 24" and outputs comparison set', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "spousal-net",
        "--husband-gross",
        "4500",
        "--wife-gross",
        "3000",
        "--wife-hours",
        "24",
      ]);
      assert.equal(stderr, "");
      assert.ok(
        stdout.includes("SPOUSAL HOUSEHOLD GROSS-TO-NET COMPARISON SET"),
      );
      assert.ok(stdout.includes("Tax Class III (Default):"));
      assert.ok(stdout.includes("Tax Class V (Prenatal Swap):"));
      assert.ok(stdout.includes("Wife Full-Time (40h) Salary Breakdown:"));
      assert.ok(
        stdout.includes("Wife Post-Birth Part-Time (24h) Salary Breakdown:"),
      );
      assert.ok(stdout.includes("Monthly Temporary Tax Gap:"));
    });

    it('runs simulation with dynamic gross parameters "--husband-gross 4500 --wife-gross 3000"', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "--husband-gross",
        "4500",
        "--wife-gross",
        "3000",
        "-f",
        "summary",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("GERMAN ELTERNGELD SIMULATION KPI SCORECARD"));
      assert.ok(
        stdout.includes("Cash-flow difference (Scenario C vs B)"),
      );
    });

    it('executes "spousal-net --husband-gross 54000 --wife-gross 36000 --yearly" with annual totals', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "spousal-net",
        "--husband-gross",
        "54000",
        "--wife-gross",
        "36000",
        "--yearly",
      ]);
      assert.equal(stderr, "");
      assert.ok(
        stdout.includes(
          "SPOUSAL HOUSEHOLD GROSS-TO-NET COMPARISON SET (ANNUAL",
        ),
      );
      assert.ok(stdout.includes("54.000 €"));
      assert.ok(stdout.includes("36.000 €"));
      // CLI adapter must display the engine result; statutory fixtures live in tax tests.
      const expected = deriveSpousalNetSalaries(toGrossSalary(4500), toGrossSalary(3000));
      const formatAnnual = (amount: number) => `${(amount * 12).toLocaleString("de-DE")} €`;
      assert.ok(stdout.includes(formatAnnual(expected.husbandClass3Net)));
      assert.ok(stdout.includes(formatAnnual(expected.husbandClass5Net)));
      assert.ok(stdout.includes(formatAnnual(expected.wifeClass5FullTimeNet)));
      assert.ok(stdout.includes("Elterngeld Booster!"));
      assert.ok(stdout.includes("Annual Temporary Tax Gap:"));
      assert.ok(stdout.includes(formatAnnual(-((expected.husbandClass3Net - expected.husbandClass5Net) - (expected.wifeClass3FullTimeNet - expected.wifeClass5FullTimeNet)))));
    });

    it('executes "gross-to-net -g 54000 -c III -y" with annual deductions breakdown', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "gross-to-net",
        "-g",
        "54000",
        "-c",
        "III",
        "-y",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("STATUTORY GROSS-TO-NET BREAKDOWN (ANNUAL"));
      assert.ok(stdout.includes("Annual Gross Salary:"));
      assert.ok(stdout.includes("54.000 €"));
      assert.ok(stdout.includes("Total Social Security:"));
      const expected = computeGrossToNetBreakdown(toGrossSalary(4500), TaxClass.III);
      const formatAnnual = (amount: number) => `${(amount * 12).toLocaleString("de-DE")} €`;
      assert.ok(stdout.includes(formatAnnual(expected.totalSocialSecurity)));
      assert.ok(stdout.includes("Total Tax Withholding:"));
      assert.ok(stdout.includes(formatAnnual(expected.totalTaxWithholding)));
      assert.ok(stdout.includes("Annual Net Take-Home Pay:"));
      assert.ok(stdout.includes(formatAnnual(expected.monthlyNetTakeHome)));
    });

    it('outputs structured JSON with period property when "-f json --yearly" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "spousal-net",
        "--husband-gross",
        "54000",
        "--wife-gross",
        "36000",
        "--period",
        "yearly",
        "-f",
        "json",
      ]);
      assert.equal(stderr, "");
      const parsed = JSON.parse(stdout);
      assert.equal(parsed.period, "YEARLY");
      assert.equal(parsed.husbandGross, 4500);
      assert.equal(parsed.wifeGrossFullTime, 3000);
      const expected = deriveSpousalNetSalaries(toGrossSalary(4500), toGrossSalary(3000));
      assert.equal(parsed.husbandClass3Net, expected.husbandClass3Net);
      assert.equal(parsed.wifeClass3FullTimeNet, expected.wifeClass3FullTimeNet);
    });

    it('explains tax return month with statutory § 31 Günstigerprüfung when "explain M27 field special" is invoked', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "explain",
        "M27",
        "field",
        "special",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("Annual Tax Settlement & Special Fiscal Events"));
      assert.ok(stdout.includes("Günstigerprüfung"));
      assert.ok(stdout.includes("Kinderfreibetrag"));
      assert.ok(stdout.includes("EStG § 26b") && stdout.includes("§ 31"));
    });

    it('executes CLI simulation with "--scenario-file src/data/testScenario.json"', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "--scenario-file",
        "src/data/testScenario.json",
        "-f",
        "summary",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("GERMAN ELTERNGELD SIMULATION KPI SCORECARD"));
      assert.ok(stdout.includes("Scenario C (Optimized)"));
    });

    it('executes CLI simulation with "-i src/data/testScenario.json -f json"', async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "-i",
        "src/data/testScenario.json",
        "-f",
        "json",
      ]);
      assert.equal(stderr, "");
      const parsed = JSON.parse(stdout);
      assert.ok(parsed.scenarioC);
      assert.equal(parsed.scenarioC.months.length, 72);
      assert.ok(parsed.scenarioC.summary.grandTotal > 0);
    });

    it("fails with helpful error message when specified --scenario-file does not exist", async () => {
      try {
        await execFileAsync("node", [
          "src/cli/runner.ts",
          "--scenario-file",
          "non_existent_file.json",
        ]);
        assert.fail("Should have thrown exit error");
      }
      catch (err: any) {
        assert.ok(
          err.stderr.includes("Specified scenario file not found") ||
            err.stderr.includes("not found as built-in preset"),
        );
      }
    });

    it("lists all built-in scenarios when --list-scenarios is invoked", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "--list-scenarios",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("AVAILABLE SCENARIOS CATALOG"));
      assert.ok(stdout.includes("empty"));
      assert.ok(stdout.includes("standard_3_children"));
      assert.ok(stdout.includes("high_earner_household"));
      assert.ok(stdout.includes("Default / Base"));
    });

    it("runs simulation with built-in scenario by identifier (-s standard_3_children)", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "-s",
        "standard_3_children",
        "-f",
        "json",
      ]);
      assert.equal(stderr, "");
      const parsed = JSON.parse(stdout);
      assert.ok(parsed.scenarioC);
      assert.equal(parsed.scenarioC.months.length, 72);
      assert.ok(parsed.scenarioC.summary.grandTotal > 0);
    });

    it("runs simulation with base empty scenario (-s empty)", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/runner.ts",
        "-s",
        "empty",
        "-f",
        "json",
      ]);
      assert.equal(stderr, "");
      const parsed = JSON.parse(stdout);
      assert.ok(parsed.scenarioC);
      assert.equal(parsed.scenarioC.months.length, 72);
      // In empty scenario with no actions, Scenario C equals Scenario B
      assert.equal(
        parsed.scenarioC.summary.grandTotal,
        parsed.scenarioB.summary.grandTotal,
      );
    });

    it("loads and executes untracked *.local.json scenario files seamlessly", async () => {
      const fsModule = await import("node:fs");
      const pathModule = await import("node:path");
      const testLocalPath = pathModule.resolve(
        process.cwd(),
        "src/data/scenarios/test_sample.local.json",
      );

      const sampleData = {
        metadata: {
          version: 1,
          id: "test_sample_local",
          name: "Test Local Scenario",
          description: "Temporary local untracked test scenario",
        },
        simulationState: {
          husbandGross: 5000,
          wifeGross: 3000,
          simulationDurationMonths: 48,
          customPregnancies: [],
          customTaxClassSwitches: [],
        },
      };

      try {
        fsModule.writeFileSync(
          testLocalPath,
          JSON.stringify(sampleData, null, 2),
          "utf-8",
        );

        const { stdout, stderr } = await execFileAsync("node", [
          "src/cli/runner.ts",
          "-s",
          "test_sample.local.json",
          "-f",
          "json",
        ]);
        assert.equal(stderr, "");
        const parsed = JSON.parse(stdout);
        assert.ok(parsed.scenarioC);
        assert.equal(parsed.scenarioC.months.length, 48);
      }
      finally {
        if (fsModule.existsSync(testLocalPath)) {
          fsModule.unlinkSync(testLocalPath);
        }
      }
    });

    it("executes quality audit runner cleanly and verifies repo integrity", async () => {
      const { stdout, stderr } = await execFileAsync("node", [
        "src/cli/qualityAudit.ts",
      ]);
      assert.equal(stderr, "");
      assert.ok(stdout.includes("CODE QUALITY AUDIT"));
      assert.ok(stdout.includes("ESLint Code Style & Static Analysis"));
      assert.ok(stdout.includes("TypeScript Compiler Diagnostics"));
      assert.ok(stdout.includes("Quality Audit PASSED"));
    });
  });
});

it("uses explicit CLI salary units, preserves cents and accepts zero", () => {
  const fallback = toGrossSalary(4000);
  assert.equal(normalizeCliGross(24000, SalaryPeriod.Monthly, fallback), 24000);
  assert.equal(normalizeCliGross(24000, SalaryPeriod.Yearly, fallback), 2000);
  assert.equal(normalizeCliGross(50000, SalaryPeriod.Yearly, fallback), 4166.67);
  assert.equal(normalizeCliGross(0, SalaryPeriod.Monthly, fallback), 0);
  assert.equal(normalizeCliGross(undefined, SalaryPeriod.Yearly, fallback), fallback);
  assert.throws(() => normalizeCliGross(Number.NaN, SalaryPeriod.Monthly, fallback), TypeError);
});

it("prints repayments as tax milestones and keeps later balances outside cash totals", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "calculator-tax-cli-"));
  const scenario = path.join(directory, "scenario.json");
  try {
    fs.writeFileSync(scenario, JSON.stringify({ salaryInputMode: "GROSS",
      salaryPeriod: "MONTHLY",
      husbandGross: 5000,
      wifeGross: 0,
      startCalendarYear: 2026,
      startCalendarMonth: 1,
      simulationDurationMonths: 24,
      customPregnancies: [],
      customSalaryRaises: [],
      customTaxClassSwitches: [{ switchId: "SUPPLIED-ZERO-FACTOR",
        effectiveSimulationMonth: 1,
        effectiveCalendarMonth: 1,
        effectiveCalendarYear: 2026,
        targetHusbandTaxClass: "IV",
        targetWifeTaxClass: "IV",
        targetUseTaxFactor: true,
        targetTaxFactor: 0,
        statutoryReason: "Supplied factor after income changed" }] }));
    const { stdout, stderr } = await execFileAsync("node", ["src/cli/runner.ts", "--scenario-file", scenario, "--scenario", "C", "--no-13th", "--format", "milestones"]);
    assert.equal(stderr, "");
    assert.match(stdout, /Tax Settlement \(§ 36 EStG: [^\n]*-4\.820/);
    assert.ok(stdout.includes("M03.2028, outside the cash horizon"));
  }
  finally {
    fs.rmSync(directory, { recursive: true,
      force: true });
  }
});


it("forwards supplied household taxable income from a CLI scenario file", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "calculator-income-cli-"));
  try {
    const fixture = JSON.parse(fs.readFileSync("src/data/scenarios/standard_3_children.json", "utf8"));
    fixture.simulationState.simulationDurationMonths = 36;
    fixture.simulationState.customPregnancies = fixture.simulationState.customPregnancies.slice(0, 1);
    fixture.simulationState.householdTaxableIncome = [{ calendarYear: 2026,
      taxableIncome: 175000.01 }];
    const file = path.join(directory, "scenario.json");
    fs.writeFileSync(file, JSON.stringify(fixture));
    const { stdout } = await execFileAsync("node", ["src/cli/runner.ts", "--scenario-file", file, "--format", "json"]);
    const result = JSON.parse(stdout).scenarioC;
    assert.equal(result.summary.totalWifeElterngeld, 0);
    assert.equal(result.benefitAssessments[0].incomeEligibility.taxableIncome, 175000.01);
  }
  finally {
    fs.rmSync(directory, { recursive: true,
      force: true });
  }
});


it("prints the shared five-event stream without paying events again in base rows", () => {
  const result = ledgerRowsFixture();
  const lines: string[] = [];
  const capture = mock.method(console, "log", (...values: unknown[]) => lines.push(values.join(" ")));
  try {
    printLedgerTable(result);
  }
  finally {
    capture.mock.restore();
  }
  const table = lines.filter((line) => line.startsWith("| ")).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  const [headers, ...rows] = table;
  const at = (row: string[], name: string) => row[headers.indexOf(name)];
  assert.equal(rows.length, 42); // 36 base months, one action, five financial events.
  assert.equal(rows.filter((row) => at(row, "Row ID").includes("ROW-EVENT")).length, 5);
  const action = rows.find((row) => at(row, "Row ID").includes("ROW-ACTION"))!;
  assert.equal(at(action, "Monthly Total"), "—");
  assert.equal(at(action, "Cum. Total"), "—");
  const february = rows.find((row) => at(row, "Row ID") === "M02.2026")!;
  assert.equal(at(february, "Monthly Total"), "1000.00");
  assert.equal(at(february, "Cum. Total"), "2060.00");
  assert.equal(at(february, "Bonuses"), "—");
  assert.equal(rows.reduce((sum, row) => sum + (at(row, "Monthly Total") === "—" ? 0 : Number(at(row, "Monthly Total"))), 0), 36060);
});


it("reports a negative scenario difference without a false positive prefix", () => {
  const lines: string[] = [];
  const capture = mock.method(console, "log", (...values: unknown[]) => lines.push(values.join(" ")));
  try {
    printSummaryScorecard(ledgerRowsFixture(100), ledgerRowsFixture(90), ledgerRowsFixture(80));
  }
  finally {
    capture.mock.restore();
  }
  const difference = lines.find((line) => line.includes("Cash-flow difference (Scenario C vs B)"))!;
  assert.match(difference, /-10/);
  assert.doesNotMatch(difference, /\+-/);
  assert.ok(!lines.some((line) => line.includes("Maxed EG+")));
});
