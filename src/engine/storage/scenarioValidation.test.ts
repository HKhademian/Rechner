import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultPersistedState,
  getTestPersistedState,
  validateAndSanitizePersistedState,
  type ElterngeldPersistedState,
} from "#engine/storage/persistence";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  ScenarioId,
  TaxClass,
  SalaryInputMode,
  SalaryPeriod,
  toChildrenCount,
} from "#engine/types";
import defaultScenarioRaw from "../../data/defaultScenario.json" with { type: "json" };
import testScenarioRaw from "../../data/testScenario.json" with { type: "json" };
import presetsRaw from "../../data/scenarioPresets.json" with { type: "json" };

/**
 * Helper to build simulation parameters from any arbitrary persisted state.
 */
function buildParamsFromState(state: ElterngeldPersistedState, scenarioKey: ScenarioId) {
  return {
    scenarioKey,
    preexisting: {
      startCalendarYear: state.startCalendarYear,
      startCalendarMonth: state.startCalendarMonth,
      simulationDurationMonths: state.simulationDurationMonths,
      husbandGross: state.husbandGross,
      wifeGross: state.wifeGross,
      husbandInitialTaxClass: state.husbandInitialTaxClass ?? TaxClass.III,
      husbandInitialNet: state.husbandClass3Net,
      husbandInitialClass5Net: state.husbandClass5Net,
      husbandWeeklyHours: state.husbandHours,
      wifeInitialTaxClass: state.wifeInitialTaxClass ?? TaxClass.V,
      wifeInitialFullTimeNet: state.wifeClass5FullTimeNet,
      wifeInitialClass3FullTimeNet: state.wifeClass3FullTimeNet,
      wifeInitialPartTimeClass5Net: state.wifeClass5FullTimeNet,
      wifeInitialPartTimeClass3Net: state.wifeClass3FullTimeNet,
      wifeWeeklyHours: state.wifeInitialHours,
      wifePostBirthWeeklyHours: state.wifePostBirthHours,
      existingChildrenCount: toChildrenCount(0),
      kindergeldPerChild: state.kindergeldPerChild,
      enable13thSalary: state.enable13thSalary,
      bonus40Month: state.bonus40Month,
      bonus60Month: state.bonus60Month,
      taxReturnMonth: state.taxReturnMonth,
    },
    pregnancies: state.customPregnancies,
    taxClassSwitches: state.customTaxClassSwitches,
    salaryRaises: state.customSalaryRaises,
    workingHoursChanges: state.customWorkingHoursChanges || [],
    financialEvents: state.customFinancialEvents,
  };
}

describe("Scenario Integrity & Statutory Verifier Engine", () => {
  describe("Canonical testScenario.json Verification", () => {
    it("validates that testScenario.json is structurally complete and strongly-typed", () => {
      assert.ok(testScenarioRaw.metadata, "Metadata envelope must exist");
      assert.equal(testScenarioRaw.metadata.version, 1);
      assert.ok(testScenarioRaw.simulationState, "simulationState must exist");

      const testState = getTestPersistedState();
      assert.equal(testState.salaryInputMode, SalaryInputMode.Gross);
      assert.equal(testState.salaryPeriod, SalaryPeriod.Monthly);
      assert.ok(testState.husbandGross > 0);
      assert.ok(testState.wifeGross > 0);
      assert.ok(testState.simulationDurationMonths >= 24);
      assert.ok(testState.customPregnancies.length >= 2);
    });

    it("executes Scenario A, B, and C cleanly on testScenario state without invalid financial outputs", () => {
      const state = getTestPersistedState();
      for (const scenarioKey of [ScenarioId.A, ScenarioId.B, ScenarioId.C]) {
        const params = buildParamsFromState(state, scenarioKey);
        const res = runScenarioBatches(params);

        assert.equal(res.months.length, state.simulationDurationMonths);
        assert.ok(res.summary.grandTotal > 0);
        res.months.forEach((m) => {
          assert.ok(!Number.isNaN(m.monthlyTotal), `Month ${m.month} total must not be NaN`);
          assert.ok(m.husbandSalary >= 0, `Month ${m.month} husband salary must be non-negative`);
          assert.ok(m.wifeSalary >= 0, `Month ${m.month} wife salary must be non-negative`);
          assert.ok(m.mutterschutz >= 0, `Month ${m.month} mutterschutz must be non-negative`);
          assert.ok(m.wifeElterngeld >= 0, `Month ${m.month} wifeElterngeld must be non-negative`);
          assert.ok(m.husbandElterngeld >= 0, `Month ${m.month} husbandElterngeld must be non-negative`);
        });
      }
    });
  });

  describe("User-Provided defaultScenario.json Verification", () => {
    it("validates that defaultScenario.json parses and sanitizes without throwing", () => {
      const sanitized = validateAndSanitizePersistedState(defaultScenarioRaw);
      assert.ok(sanitized, "Sanitized state must be produced");
      assert.ok(sanitized.husbandGross >= 0);
      assert.ok(sanitized.wifeGross >= 0);
      assert.ok(sanitized.simulationDurationMonths >= 12);
      assert.ok(sanitized.startCalendarYear >= 2000);
      assert.ok(sanitized.startCalendarMonth >= 1 && sanitized.startCalendarMonth <= 12);
    });

    it("verifies chronological order and validity of custom pregnancies in defaultScenario.json", () => {
      const state = getDefaultPersistedState();
      state.customPregnancies.forEach((preg, idx) => {
        assert.ok(
          preg.positiveTestSimulationMonth < preg.calculatedDeliverySimulationMonth,
          `Pregnancy #${idx + 1}: positiveTest (${preg.positiveTestSimulationMonth}) must precede delivery (${preg.calculatedDeliverySimulationMonth})`,
        );
        assert.ok(
          preg.calculatedDeliverySimulationMonth <= state.simulationDurationMonths,
          `Pregnancy #${idx + 1}: delivery month (${preg.calculatedDeliverySimulationMonth}) must be within duration (${state.simulationDurationMonths})`,
        );
      });
    });

    it("verifies chronological validity of tax class switches in defaultScenario.json", () => {
      const state = getDefaultPersistedState();
      state.customTaxClassSwitches.forEach((sw, idx) => {
        const revertMonth = sw.revertSimulationMonth ?? sw.effectiveSimulationMonth;
        assert.ok(
          sw.effectiveSimulationMonth <= revertMonth,
          `Tax switch #${idx + 1}: effective month (${sw.effectiveSimulationMonth}) must be <= revert month (${revertMonth})`,
        );
      });
    });

    it("executes Scenario A, B, and C simulation on defaultScenario.json without throwing or invalid outputs", () => {
      const state = getDefaultPersistedState();
      for (const scenarioKey of [ScenarioId.A, ScenarioId.B, ScenarioId.C]) {
        const params = buildParamsFromState(state, scenarioKey);
        const res = runScenarioBatches(params);

        assert.equal(res.months.length, state.simulationDurationMonths);
        assert.ok(res.summary.grandTotal > 0);
        res.months.forEach((m) => {
          assert.ok(!Number.isNaN(m.monthlyTotal), `Month ${m.month} monthlyTotal must not be NaN`);
        });
      }
    });
  });

  describe("Built-in Scenarios in src/data/scenarios/ Catalog Verification", () => {
    it("validates that all scenarios in BUILTIN_SCENARIO_CATALOG are valid, complete, and executable", async () => {
      const { BUILTIN_SCENARIO_CATALOG } = await import(
        "#data/scenarios/scenarioRegistry",
      );

      assert.ok(
        BUILTIN_SCENARIO_CATALOG.length >= 7,
        "Catalog must contain all built-in scenarios",
      );

      for (const item of BUILTIN_SCENARIO_CATALOG) {
        assert.ok(item.id, "Scenario item must have an id");
        assert.ok(item.name, `Scenario "${item.id}" must have a name`);

        assert.ok(
          item.description,
          `Scenario "${item.id}" must have a description`,
        );

        const sanitized = validateAndSanitizePersistedState(item.data);
        assert.ok(
          sanitized,
          `Scenario "${item.id}" must produce valid sanitized state`,
        );

        const params = buildParamsFromState(sanitized, ScenarioId.C);
        const res = runScenarioBatches(params);
        assert.equal(
          res.months.length,
          sanitized.simulationDurationMonths,
          `Scenario "${item.id}" must generate expected month count`,
        );
        assert.ok(
          res.summary.grandTotal > 0,
          `Scenario "${item.id}" must have positive grand total`,
        );
      }
    });
  });

  describe("Preset Scenarios in scenarioPresets.json Verification", () => {
    it("validates that all preset scenarios in scenarioPresets.json are valid and executable", () => {
      const presetsList = Object.values(presetsRaw);
      assert.ok(presetsList.length > 0, "Presets list must not be empty");

      presetsList.forEach((preset: any, idx: number) => {
        assert.ok(preset.id, `Preset #${idx + 1} must have an id`);
        assert.ok(preset.name, `Preset #${idx + 1} must have a name`);

        const sanitized = validateAndSanitizePersistedState(preset);
        assert.ok(sanitized, `Preset "${preset.name}" must produce sanitized state`);

        // Test simulation on preset state
        const params = buildParamsFromState(sanitized, ScenarioId.C);
        const res = runScenarioBatches(params);
        assert.ok(res.months.length > 0, `Preset "${preset.name}" must produce timeline months`);
        assert.ok(res.summary.grandTotal > 0, `Preset "${preset.name}" must have positive grand total`);
      });
    });
  });
});

