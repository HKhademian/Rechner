import {
  ledgerRowsFixture,
} from "../../../test/fixture/ledgerRows.ts";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  exportStateToJson,
  importStateFromJson,
  exportStateToTextReport,
  exportScenarioToCsv,
  exportStateToZip,
  EXPORT_SCHEMA_VERSION,
  APPLICATION_NAME,
} from "#engine/storage/exportImport";
import {
  getTestPersistedState, 
} from "#engine/storage/persistence";
import {
  runScenarioBatches, 
} from "#engine/simulator/timelineGenerator";
import {
  type PreexistingConditions,
  type SimulationResult,
  ScenarioId,
  SalaryInputMode,
  TaxClass,
  toGrossSalary,
  toWorkingHours,
  toFullCalendarYear,
  toChildrenCount,
  toMonthDuration,
  toCalendarMonth,
  toNetSalary,
} from "#engine/types";

describe("User Data Export & Import Engine", () => {
  const defaultState = getTestPersistedState();

  describe("JSON Export and Serialization (exportStateToJson)", () => {
    it("serializes state into versioned metadata envelope with standard JSON formatting", () => {
      const jsonStr = exportStateToJson(defaultState);
      assert.ok(typeof jsonStr === "string");
      assert.ok(jsonStr.length > 100);

      const parsed = JSON.parse(jsonStr);
      assert.equal(parsed.metadata.version, EXPORT_SCHEMA_VERSION);
      assert.equal(parsed.metadata.application, APPLICATION_NAME);
      assert.equal(parsed.metadata.format, "JSON");
      assert.ok(parsed.metadata.exportedAt);
      assert.ok(parsed.simulationState);
      assert.equal(
        parsed.simulationState.husbandGross,
        defaultState.husbandGross,
      );
      assert.equal(parsed.simulationState.wifeGross, defaultState.wifeGross);
    });
  });

  describe("JSON Import and Safe Deserialization (importStateFromJson)", () => {
    it("successfully imports and parses a valid JSON envelope", () => {
      const jsonStr = exportStateToJson(defaultState);
      const res = importStateFromJson(jsonStr);

      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.state.husbandGross, defaultState.husbandGross);
        assert.equal(res.state.wifeGross, defaultState.wifeGross);
        assert.equal(res.state.husbandHours, defaultState.husbandHours);
        assert.equal(res.state.wifeInitialHours, defaultState.wifeInitialHours);
        assert.equal(
          res.state.customPregnancies.length,
          defaultState.customPregnancies.length,
        );
        assert.equal(
          res.state.customTaxClassSwitches.length,
          defaultState.customTaxClassSwitches.length,
        );
      }
    });

    it("successfully imports a raw unenveloped state object", () => {
      const rawJson = JSON.stringify({
        husbandGross: 7000,
        wifeGross: 4200,
        husbandHours: 35,
        wifeInitialHours: 38,
        husbandInitialTaxClass: "IV",
        wifeInitialTaxClass: "IV",
        useInitialTaxFactor: true,
        simulationDurationMonths: 60,
      });

      const res = importStateFromJson(rawJson);
      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.state.husbandGross, 7000);
        assert.equal(res.state.wifeGross, 4200);
        assert.equal(res.state.husbandHours, 35);
        assert.equal(res.state.wifeInitialHours, 38);
        assert.equal(res.state.husbandInitialTaxClass, TaxClass.IV);
        assert.equal(res.state.wifeInitialTaxClass, TaxClass.IV);
        assert.equal(res.state.useInitialTaxFactor, true);
      }
    });

    it("clamps out-of-range numerical values and generates warnings", () => {
      const dirtyJson = JSON.stringify({
        husbandGross: 5000000, // exceeds max limit
        husbandHours: 120, // exceeds max 60h limit
        wifeInitialHours: -10, // negative hours clamped to 0
      });

      const res = importStateFromJson(dirtyJson);
      assert.equal(res.success, true);
      if (res.success) {
        assert.equal(res.state.husbandGross, 1000000);
        assert.equal(res.state.husbandHours, 60);
        assert.equal(res.state.wifeInitialHours, 0);
        assert.ok(res.warnings.length >= 2);
      }
    });

    it("rejects invalid, empty, or malformed JSON payloads", () => {
      assert.equal(importStateFromJson("").success, false);
      assert.equal(importStateFromJson("   ").success, false);
      assert.equal(importStateFromJson("{ invalid json }").success, false);
      assert.equal(importStateFromJson("12345").success, false);
      assert.equal(importStateFromJson("null").success, false);
    });
  });

  describe("Plaintext / Markdown Financial Report (exportStateToTextReport)", () => {
    it("generates structured audit report with comparison matrix and legal basis", () => {
      const preexisting: PreexistingConditions = {
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: defaultState.startCalendarMonth,
        husbandGross: toGrossSalary(4500),
        wifeGross: toGrossSalary(3000),
        husbandWeeklyHours: toWorkingHours(40),
        wifeWeeklyHours: toWorkingHours(40),
        wifePostBirthWeeklyHours: toWorkingHours(24),
        husbandInitialTaxClass: TaxClass.III,
        wifeInitialTaxClass: TaxClass.V,
        husbandInitialNet: defaultState.husbandClass3Net,
        husbandInitialClass5Net: defaultState.husbandClass5Net,
        wifeInitialFullTimeNet: defaultState.wifeClass5FullTimeNet,
        wifeInitialClass3FullTimeNet: defaultState.wifeClass3FullTimeNet,
        wifeInitialPartTimeClass5Net: defaultState.wifeClass5FullTimeNet,
        wifeInitialPartTimeClass3Net: defaultState.wifeClass3FullTimeNet,
        annualBonusGross: defaultState.annualBonusGross,
        annualBonusMonth: defaultState.annualBonusMonth,
        investmentReturnMonthly: defaultState.investmentReturnMonthly,
        existingChildrenCount: toChildrenCount(0),
        kindergeldPerChild: defaultState.kindergeldPerChild,
        enable13thSalary: defaultState.enable13thSalary,
        bonus40Month: defaultState.bonus40Month,
        bonus60Month: defaultState.bonus60Month,
        taxReturnMonth: defaultState.taxReturnMonth,
        simulationDurationMonths: defaultState.simulationDurationMonths,
      };

      const resA = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: defaultState.customPregnancies,
        taxClassSwitches: defaultState.customTaxClassSwitches,
        salaryRaises: defaultState.customSalaryRaises,
      });
      const resB = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting,
        pregnancies: defaultState.customPregnancies,
        taxClassSwitches: defaultState.customTaxClassSwitches,
        salaryRaises: defaultState.customSalaryRaises,
      });
      const resC = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting,
        pregnancies: defaultState.customPregnancies,
        taxClassSwitches: defaultState.customTaxClassSwitches,
        salaryRaises: defaultState.customSalaryRaises,
      });

      const timelines: Record<ScenarioId, SimulationResult> = {
        [ScenarioId.A]: resA,
        [ScenarioId.B]: resB,
        [ScenarioId.C]: resC,
      };

      const report = exportStateToTextReport(defaultState, timelines);

      assert.ok(
        report.includes(
          "GERMAN ELTERNGELD & PARENTAL LEAVE FINANCIAL FORECAST & AUDIT REPORT",
        ),
      );
      assert.ok(
        report.includes(
          "1. HOUSEHOLD STARTING PROFILE & PREEXISTING CONDITIONS (Sim1)",
        ),
      );
      assert.ok(
        report.includes("2. EXECUTIVE 3-SCENARIO FINANCIAL OUTCOME COMPARISON"),
      );
      assert.ok(report.includes("Scenario A"));
      assert.ok(report.includes("Scenario B"));
      assert.ok(report.includes("Scenario C"));
      assert.ok(report.includes("3. YEAR-BY-YEAR FINANCIAL INFLOW SCHEDULE"));
      assert.ok(report.includes("4. DISCRETE MILESTONE ACTION AUDIT LOG"));
      assert.ok(report.includes("5. STATUTORY FRAMEWORK & LEGAL CITATIONS"));
      assert.ok(report.includes("BEEG § 1"));
      assert.ok(report.includes("BEEG § 2c"));
      assert.ok(report.includes("MuSchG § 3, § 19"));
      assert.ok(report.includes("EStG § 32a, § 38b, § 39f"));
    });
  });

  describe("CSV Scenario Ledger Export (exportScenarioToCsv)", () => {
    it("generates standard semicolon-delimited CSV ledger spreadsheet", () => {
      const preexisting: PreexistingConditions = {
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: defaultState.startCalendarMonth,
        husbandGross: toGrossSalary(4500),
        wifeGross: toGrossSalary(3000),
        husbandWeeklyHours: toWorkingHours(40),
        wifeWeeklyHours: toWorkingHours(40),
        wifePostBirthWeeklyHours: toWorkingHours(24),
        husbandInitialTaxClass: TaxClass.III,
        wifeInitialTaxClass: TaxClass.V,
        husbandInitialNet: defaultState.husbandClass3Net,
        husbandInitialClass5Net: defaultState.husbandClass5Net,
        wifeInitialFullTimeNet: defaultState.wifeClass5FullTimeNet,
        wifeInitialClass3FullTimeNet: defaultState.wifeClass3FullTimeNet,
        wifeInitialPartTimeClass5Net: defaultState.wifeClass5FullTimeNet,
        wifeInitialPartTimeClass3Net: defaultState.wifeClass3FullTimeNet,
        annualBonusGross: defaultState.annualBonusGross,
        annualBonusMonth: defaultState.annualBonusMonth,
        investmentReturnMonthly: defaultState.investmentReturnMonthly,
        existingChildrenCount: toChildrenCount(0),
        kindergeldPerChild: defaultState.kindergeldPerChild,
        enable13thSalary: defaultState.enable13thSalary,
        bonus40Month: defaultState.bonus40Month,
        bonus60Month: defaultState.bonus60Month,
        taxReturnMonth: defaultState.taxReturnMonth,
        simulationDurationMonths: defaultState.simulationDurationMonths,
      };

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting,
        pregnancies: defaultState.customPregnancies,
        taxClassSwitches: defaultState.customTaxClassSwitches,
        salaryRaises: defaultState.customSalaryRaises,
      });

      const csv = exportScenarioToCsv(res);
      assert.ok(typeof csv === "string");
      assert.ok(csv.startsWith("CSV Schema;Entry Type;Row ID;Month ID;"));
      const lines = csv.split("\r\n");
      const monthRows = lines.filter((line) => line.startsWith("2;MONTH_BASE;"));
      assert.equal(monthRows.length, defaultState.simulationDurationMonths);
      assert.ok(monthRows[0].startsWith("2;MONTH_BASE;M01.2026;M01.2026;M-8;Sim1;1;"));
      assert.ok(monthRows[8].startsWith("2;MONTH_BASE;M09.2026;M09.2026;M1 (Pregnancy Positive);Sim9;9;"));
      assert.ok(monthRows[16].startsWith("2;MONTH_BASE;M05.2027;M05.2027;M9 (Birth 1);Sim17;17;"));
      assert.equal(lines.filter((line) => line.startsWith("2;ACTION;")).length, res.months.reduce((sum, month) => sum + (month.startingActions?.length ?? 0), 0));
      assert.equal(lines.filter((line) => line.startsWith("2;FINANCIAL_EVENT;")).length, res.months.reduce((sum, month) => sum + month.specialEvents.length, 0));
    });
  });

  describe("Zero-Dependency Micro PKZIP Archiver (exportStateToZip)", () => {
    it("packages multiple files into a binary compliant ZIP archive with valid signatures", () => {
      const files: Record<string, string> = {
        "test_config.json": JSON.stringify({ hello: "world" }),
        "report.txt": "Financial Report Content",
        "ledger.csv": "Month;Value\nM1;100",
      };

      const zipBytes = exportStateToZip(files);
      assert.ok(zipBytes instanceof Uint8Array);
      assert.ok(zipBytes.length > 200);

      // Verify Local File Header signature (0x02895b50) at position 0
      const view = new DataView(zipBytes.buffer);
      const localHeaderSig = view.getUint32(0, true);
      assert.equal(localHeaderSig, 0x02895b50);

      // Verify presence of End of Central Directory signature (0x06054b50)
      const eocdSig = view.getUint32(zipBytes.length - 22, true);
      assert.equal(eocdSig, 0x06054b50);

      // Verify entry count in EOCD
      const entryCount = view.getUint16(zipBytes.length - 22 + 8, true);
      assert.equal(entryCount, 3);
    });
  });
});


it("reports all actual calendar years for a 72-month horizon starting in September", () => {
  const result = runScenarioBatches({ scenarioKey: ScenarioId.A,
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [],
    preexisting: { ...standardPreexistingConditions,
      startCalendarMonth: toCalendarMonth(9),
      simulationDurationMonths: toMonthDuration(72),
      husbandInitialNet: toNetSalary(1000),
      wifeInitialFullTimeNet: toNetSalary(0),
      enable13thSalary: false } });
  const report = exportStateToTextReport({ ...getTestPersistedState(),
    simulationDurationMonths: toMonthDuration(72),
    startCalendarMonth: toCalendarMonth(9) }, {
    [ScenarioId.A]: result,
    [ScenarioId.B]: { ...result,
      scenarioKey: ScenarioId.B },
    [ScenarioId.C]: { ...result,
      scenarioKey: ScenarioId.C },
  });
  assert.ok(report.includes("Simulation Horizon: 72 Months (2026 - 2032)"));
  assert.match(report, /Year 1 \(2026\): Total Net Inflow: 4\.000/);
  assert.match(report, /Year 7 \(2032\): Total Net Inflow: 8\.000/);
  assert.doesNotMatch(report, /60-Month|60-MONTH|5-YEAR/);
});


function reportWithResults(a: SimulationResult, b = a, c = b): string {
  return exportStateToTextReport({ ...getTestPersistedState(),
    simulationDurationMonths: toMonthDuration(a.months.length) }, {
    [ScenarioId.A]: { ...a,
      scenarioKey: ScenarioId.A },
    [ScenarioId.B]: { ...b,
      scenarioKey: ScenarioId.B },
    [ScenarioId.C]: { ...c,
      scenarioKey: ScenarioId.C },
  });
}

it("retains cents in text and print report totals", () => {
  const report = reportWithResults(ledgerRowsFixture(100.25));
  assert.ok(report.includes("36.060,25"));
  assert.ok(report.includes("12.060,25"));
});


it("keeps negative text-report comparisons signed without promising an optimal outcome", () => {
  const report = reportWithResults(ledgerRowsFixture(100), ledgerRowsFixture(90), ledgerRowsFixture(80));
  const comparison = report.split("\n").find((line) => line.includes("Difference to Baseline"))!;
  assert.match(comparison, /-10,00/);
  assert.match(comparison, /-20,00/);
  assert.doesNotMatch(report, /\+-|Maximum Legal Strategy|Strategic Tax Swap \(Class III/);
});


it("discloses unavailable report calculations and outside-horizon tax timing", () => {
  const manual = reportWithResults(ledgerRowsFixture());
  assert.ok(manual.includes("payroll incomplete; annual tax incomplete"));
  assert.ok(manual.includes("totals are partial"));
  assert.ok(manual.includes("M03.2029, outside the cash horizon"));
  const gross = runScenarioBatches({ scenarioKey: ScenarioId.A,
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [],
    preexisting: { ...standardPreexistingConditions,
      householdTaxableIncome: undefined,
      salaryInputMode: SalaryInputMode.Gross,
      husbandInitialTaxClass: TaxClass.I,
      husbandGross: toGrossSalary(5000),
      wifeGross: toGrossSalary(0),
      enable13thSalary: false,
      simulationDurationMonths: toMonthDuration(24) } });
  const report = reportWithResults(gross);
  assert.ok(report.includes("Tax year 2026: 4.569,00"));
  assert.ok(report.includes("Payroll profile 2027: source 2026 (projected)"));
  assert.ok(report.includes("M03.2028, outside the cash horizon"));
  assert.ok(report.includes("HOUSEHOLD STARTING PROFILE & PREEXISTING CONDITIONS (Sim1)"));
  assert.doesNotMatch(report, /Split 40% in M5/);
});
