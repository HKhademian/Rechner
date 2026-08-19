import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  synthesizeOptimalTaxSwitches,
  synthesizeStrategyBatches,
} from "#engine/simulator/strategySynthesizer";
import {
  SimulationStrategy,
  TaxClass,
  SalaryInputMode,
  SalaryPeriod,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type ScenarioActionBatches,
  type PreexistingConditions,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toWorkingHours,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toChildrenCount,
  toChildIndex,
  toPregnancyId,
  toSwitchId,
  toMonthDuration,
} from "#engine/types";

describe("Strategy Synthesizer & Auto-Optimization Engine", () => {
  const samplePreexisting: PreexistingConditions = {
    startCalendarYear: toFullCalendarYear(2026),
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: toMonthDuration(60),
    salaryInputMode: SalaryInputMode.Gross,
    salaryPeriod: SalaryPeriod.Monthly,
    husbandGross: toGrossSalary(5000),
    wifeGross: toGrossSalary(3000),
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(3500),
    husbandInitialClass5Net: toNetSalary(2600),
    husbandWeeklyHours: toWorkingHours(40),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1800),
    wifeInitialClass3FullTimeNet: toNetSalary(2400),
    wifeInitialPartTimeClass5Net: toNetSalary(1080),
    wifeInitialPartTimeClass3Net: toNetSalary(1440),
    wifeWeeklyHours: toWorkingHours(40),
    annualBonusGross: toEuroAmount(0),
    annualBonusMonth: toCalendarMonth(12),
    investmentReturnMonthly: toEuroAmount(0),
    existingChildrenCount: toChildrenCount(0),
    kindergeldPerChild: toEuroAmount(259),
    taxReturnMonth: toCalendarMonth(5),
  };

  const samplePregnancy1: PregnancyAction = {
    pregnancyId: toPregnancyId("PREG-1"),
    childIndex: toChildIndex(1),
    positiveTestCalendarMonth: toCalendarMonth(1),
    positiveTestCalendarYear: toFullCalendarYear(2026),
    positiveTestSimulationMonth: toSimulationMonth(1),
    calculatedDeliverySimulationMonth: toSimulationMonth(9),
    motherPostBirthPartTimeHours: toWorkingHours(24),
    motherPostBirthPartTimeClass5Net: toNetSalary(1080),
    motherPostBirthPartTimeClass3Net: toNetSalary(1440),
    fatherPartnerMonthsCount: toMonthDuration(2),
  };

  const samplePregnancy2: PregnancyAction = {
    pregnancyId: toPregnancyId("PREG-2"),
    childIndex: toChildIndex(2),
    positiveTestCalendarMonth: toCalendarMonth(2),
    positiveTestCalendarYear: toFullCalendarYear(2028),
    positiveTestSimulationMonth: toSimulationMonth(26),
    calculatedDeliverySimulationMonth: toSimulationMonth(34),
    motherPostBirthPartTimeHours: toWorkingHours(24),
    motherPostBirthPartTimeClass5Net: toNetSalary(1080),
    motherPostBirthPartTimeClass3Net: toNetSalary(1440),
    fatherPartnerMonthsCount: toMonthDuration(2),
  };

  describe("synthesizeOptimalTaxSwitches", () => {
    it("returns empty array when no pregnancies exist", () => {
      const switches = synthesizeOptimalTaxSwitches([], samplePreexisting);
      assert.deepEqual(switches, []);
    });

    it("auto-synthesizes optimal § 2b BEEG tax switch for single child (Delivery Month 9)", () => {
      const switches = synthesizeOptimalTaxSwitches([samplePregnancy1], samplePreexisting);
      assert.equal(switches.length, 1);

      const sw = switches[0];
      assert.equal(sw.switchId, "SWAP-AUTO-CHILD-1");
      // Delivery = 9, effective = max(1, 9 - 8) = 1
      assert.equal(sw.effectiveSimulationMonth, 1);
      assert.equal(sw.effectiveCalendarMonth, 1);
      assert.equal(sw.effectiveCalendarYear, 2026);
      assert.equal(sw.targetHusbandTaxClass, TaxClass.V);
      assert.equal(sw.targetWifeTaxClass, TaxClass.III);
      assert.equal(sw.revertSimulationMonth, 9);
      assert.equal(sw.revertHusbandTaxClass, TaxClass.III);
      assert.equal(sw.revertWifeTaxClass, TaxClass.V);
    });

    it("auto-synthesizes optimal § 2b BEEG tax switches for 2 children spaced apart", () => {
      const switches = synthesizeOptimalTaxSwitches(
        [samplePregnancy1, samplePregnancy2],
        samplePreexisting,
      );
      assert.equal(switches.length, 2);

      // Child 1: Delivery 9 -> Switch Month 1, Revert Month 9
      assert.equal(switches[0].effectiveSimulationMonth, 1);
      assert.equal(switches[0].revertSimulationMonth, 9);

      // Child 2: Delivery 34 -> Switch Month 26 (34 - 8), Revert Month 34
      assert.equal(switches[1].effectiveSimulationMonth, 26);
      assert.equal(switches[1].revertSimulationMonth, 34);
      assert.equal(switches[1].effectiveCalendarMonth, 2); // Month 26 in Jan 2026 start = Feb 2028
      assert.equal(switches[1].effectiveCalendarYear, 2028);
    });
  });

  describe("synthesizeStrategyBatches", () => {
    const baseBatches: ScenarioActionBatches = {
      scenarioKey: SimulationStrategy.StatutoryOptimized,
      preexisting: samplePreexisting,
      pregnancies: [samplePregnancy1, samplePregnancy2],
      taxClassSwitches: [],
      salaryRaises: [],
      workingHoursChanges: [],
      financialEvents: [],
    };

    it("StatusQuo: strips all pregnancies and tax switches for continuous career baseline", () => {
      const result = synthesizeStrategyBatches(baseBatches, SimulationStrategy.StatusQuo);
      assert.equal(result.scenarioKey, SimulationStrategy.StatusQuo);
      assert.equal(result.pregnancies.length, 0);
      assert.equal(result.taxClassSwitches.length, 0);
    });

    it("UnoptimizedBaseline: keeps pregnancies but removes tax switches to hold static withholding", () => {
      const result = synthesizeStrategyBatches(baseBatches, SimulationStrategy.UnoptimizedBaseline);
      assert.equal(result.scenarioKey, SimulationStrategy.UnoptimizedBaseline);
      assert.equal(result.pregnancies.length, 2);
      assert.equal(result.taxClassSwitches.length, 0);
    });

    it("StatutoryOptimized: auto-synthesizes § 2b BEEG switches when input has zero switches", () => {
      const result = synthesizeStrategyBatches(baseBatches, SimulationStrategy.StatutoryOptimized);
      assert.equal(result.scenarioKey, SimulationStrategy.StatutoryOptimized);
      assert.equal(result.pregnancies.length, 2);
      assert.equal(result.taxClassSwitches.length, 2);
      assert.equal(result.taxClassSwitches[0].targetWifeTaxClass, TaxClass.III);
      assert.equal(result.taxClassSwitches[1].targetWifeTaxClass, TaxClass.III);
    });

    it("StatutoryOptimized: preserves explicit user-defined tax switches if already provided", () => {
      const manualSwitch: TaxClassSwitchAction = {
        switchId: toSwitchId("SWAP-MANUAL-1"),
        effectiveSimulationMonth: toSimulationMonth(4),
        effectiveCalendarMonth: toCalendarMonth(4),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetHusbandTaxClass: TaxClass.IV,
        targetWifeTaxClass: TaxClass.IV,
        statutoryReason: "Manual custom switch test",
      };

      const batchesWithManual: ScenarioActionBatches = {
        ...baseBatches,
        taxClassSwitches: [manualSwitch],
      };

      const result = synthesizeStrategyBatches(
        batchesWithManual,
        SimulationStrategy.StatutoryOptimized,
      );
      assert.equal(result.taxClassSwitches.length, 1);
      assert.equal(result.taxClassSwitches[0].switchId, "SWAP-MANUAL-1");
      assert.equal(result.taxClassSwitches[0].targetWifeTaxClass, TaxClass.IV);
    });
  });
});
