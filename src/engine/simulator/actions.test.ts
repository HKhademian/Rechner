import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  runScenarioBatches, 
} from "#engine/simulator/timelineGenerator";
import {
  deriveSpousalNetSalaries, 
} from "#engine/tax/wageTax";
import {
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type WorkingHoursChangeAction,
  type FinancialEventAction,
  TaxClass,
  ScenarioId,
  TargetPerson,
  SalaryInputMode,
  SalaryPeriod,
  toGrossSalary,
  toNetSalary,
  toEuroAmount,
  toWorkingHours,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPercentageRate,
  toSimulationMonth,
  toCalendarMonth,
  toCalendarLabel,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toHoursChangeId,
  toFinancialEventId,
  toTaxFactor,
  FinancialEventCategory,
} from "#engine/types";

describe("Sandbox Unit Tests: Discrete Actions (Batches 1, 2, 3)", () => {
  const basePreexisting: PreexistingConditions = {
    startCalendarYear: toFullCalendarYear(2026),
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: toMonthDuration(60),
    husbandGross: toGrossSalary(4500),
    wifeGross: toGrossSalary(3000),
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(3184),
    husbandInitialClass5Net: toNetSalary(2398),
    husbandWeeklyHours: toWorkingHours(32),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1751),
    wifeInitialClass3FullTimeNet: toNetSalary(2295),
    wifeInitialPartTimeClass5Net: toNetSalary(1182),
    wifeInitialPartTimeClass3Net: toNetSalary(1413),
    wifeWeeklyHours: toWorkingHours(40),
    wifePostBirthWeeklyHours: toWorkingHours(24),
    existingChildrenCount: toChildrenCount(0),
    kindergeldPerChild: toEuroAmount(259),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3),
  };

  describe("Batch 1: Pregnancy Positive Decisions & Life Milestones", () => {
    it("accurately triggers Mutterschutz window 6 weeks pre-birth to 8 weeks post-birth", () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Mutterschutz months: M11 (pre-birth), M12 (delivery), M13 (post-birth)
      [11, 12, 13].forEach((mIdx) => {
        const m = res.months[mIdx - 1];
        assert.equal(
          m.isMutterschutz,
          true,
          `Month ${mIdx} must be in Mutterschutz`,
        );
        assert.equal(
          m.mutterschutz,
          1751,
          `Month ${mIdx} Mutterschutz in Scenario B must equal Class V FT Net`,
        );
        assert.equal(
          m.wifeSalary,
          0,
          "Wife working salary during Mutterschutz must be 0",
        );
      });

      // M14 onwards: ElterngeldPlus active
      const m14 = res.months[13];
      assert.equal(m14.isMutterschutz, false);
      assert.equal(m14.wifeSalary, 1182);
      // (1751 - 1182) * 0.65 = 369.85, below the personal ceiling.
      assert.equal(m14.wifeElterngeld, 369.85);
    });

    it("includes the final sibling-bonus month when the qualifying age is reached", () => {
      const testCases = [
        { spacing: 18,
          expectBonus: true }, // b2 = 30, EG starts M32 -> Child 1 is 20M (<36)
        { spacing: 24,
          expectBonus: true }, // b2 = 36, EG starts M38 -> Child 1 is 26M (<36)
        { spacing: 27,
          expectBonus: true }, // b2 = 39, EG starts M41 -> Child 1 is 29M (<36)
        { spacing: 33,
          expectBonus: true }, // b2 = 45, EG starts M47 -> Child 1 is 35M (<36)
        { spacing: 34,
          expectBonus: true }, // b2 = 46, EG starts M48 -> final eligible birthday month
        { spacing: 36,
          expectBonus: false }, // b2 = 48, EG starts M50 -> Child 1 is 38M (>36)
        { spacing: 40,
          expectBonus: false },
      ];

      for (const tc of testCases) {
        const b1 = 12;
        const b2 = b1 + tc.spacing;

        const pregnancies: PregnancyAction[] = [
          {
            pregnancyId: toPregnancyId("PREG-1"),
            childIndex: toChildIndex(1),
            positiveTestCalendarMonth: toCalendarMonth(4),
            positiveTestCalendarYear: toFullCalendarYear(2026),
            positiveTestSimulationMonth: toSimulationMonth(4),
            calculatedDeliverySimulationMonth: toSimulationMonth(b1),
            motherPostBirthPartTimeHours: toWorkingHours(24),
            motherPostBirthPartTimeClass5Net: toNetSalary(1182),
            motherPostBirthPartTimeClass3Net: toNetSalary(1413),
            fatherPartnerMonthsCount: toMonthDuration(4),
          },
          {
            pregnancyId: toPregnancyId("PREG-2"),
            childIndex: toChildIndex(2),
            positiveTestCalendarMonth: toCalendarMonth(1),
            positiveTestCalendarYear: toFullCalendarYear(2028),
            positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
            calculatedDeliverySimulationMonth: toSimulationMonth(b2),
            motherPostBirthPartTimeHours: toWorkingHours(24),
            motherPostBirthPartTimeClass5Net: toNetSalary(1182),
            motherPostBirthPartTimeClass3Net: toNetSalary(1413),
            fatherPartnerMonthsCount: toMonthDuration(4),
          },
        ];

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.C,
          preexisting: {
            ...basePreexisting,
            simulationDurationMonths: toMonthDuration(72),
          },
          pregnancies,
          taxClassSwitches: [],
          salaryRaises: [],
        });

        // Check first month of Child 2 Elterngeld (b2 + 2)
        const child2EgFirstMonth = res.months[b2 + 1];
        if (tc.expectBonus) {
          assert.equal(
            child2EgFirstMonth.hasSiblingBonus,
            true,
            `Spacing ${tc.spacing}M must qualify for Sibling Bonus at Month ${b2 + 2}`,
          );
        }
        else {
          assert.equal(
            child2EgFirstMonth.hasSiblingBonus,
            false,
            `Spacing ${tc.spacing}M must NOT qualify for Sibling Bonus at Month ${b2 + 2}`,
          );
        }
      }
    });

    it("dynamically shifts Child 2 Mutterschutz and delivery milestones when positive date is modified", () => {
      const p1Delivery = 12;
      const initialP2Positive = 14; // Delivery at M22 (spacing = 10M)
      const updatedP2Positive = 24; // Delivery at M32 (spacing = 20M)

      const basePregnancies: PregnancyAction[] = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(p1Delivery),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
        {
          pregnancyId: toPregnancyId("PREG-2"),
          childIndex: toChildIndex(2),
          positiveTestCalendarMonth: toCalendarMonth(2),
          positiveTestCalendarYear: toFullCalendarYear(2027),
          positiveTestSimulationMonth: toSimulationMonth(initialP2Positive),
          calculatedDeliverySimulationMonth: toSimulationMonth(
            initialP2Positive + 8,
          ),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ];

      // Run with initial Child 2 date (Delivery at M22)
      const resInitial = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: {
          ...basePreexisting,
          simulationDurationMonths: toMonthDuration(60),
        },
        pregnancies: basePregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // Delivery 2 at M22 -> Mutterschutz at M21, M22, M23
      assert.equal(resInitial.months[20].isMutterschutz, true);
      assert.equal(resInitial.months[21].isMutterschutz, true);
      assert.equal(resInitial.months[22].isMutterschutz, true);

      // Now dynamically update Child 2 positive date to M24 (Delivery at M32)
      const updatedPregnancies = basePregnancies.map((p) =>
        p.pregnancyId === "PREG-2"
          ? {
            ...p,
            positiveTestCalendarMonth: toCalendarMonth(12),
            positiveTestCalendarYear: toFullCalendarYear(2027),
            positiveTestSimulationMonth: toSimulationMonth(updatedP2Positive),
            calculatedDeliverySimulationMonth: toSimulationMonth(
              updatedP2Positive + 8,
            ),
          }
          : p);

      const resUpdated = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: {
          ...basePreexisting,
          simulationDurationMonths: toMonthDuration(60),
        },
        pregnancies: updatedPregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // M21 is now regular part-time (not Mutterschutz)
      assert.equal(resUpdated.months[20].isMutterschutz, false);
      // New delivery at M32 -> Mutterschutz at M31, M32, M33
      assert.equal(resUpdated.months[30].isMutterschutz, true);
      assert.equal(resUpdated.months[31].isMutterschutz, true);
      assert.equal(resUpdated.months[32].isMutterschutz, true);
    });
  });

  describe("Batch 2: Tax Class Switch Actions (§ 2b BEEG & § 26b EStG)", () => {
    it("accurately activates Tax Class III for Wife and Class V for Husband during swap window", () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ];

      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: toSwitchId("SWAP-1"),
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: toFullCalendarYear(2026),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason:
            "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
          revertSimulationMonth: toSimulationMonth(12),
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises: [],
      });

      // Months 1-3: Before Swap -> H: III (3184 €) | W: V (1751 €)
      for (const m of [1, 2, 3]) {
        const entry = res.months[m - 1];
        assert.equal(entry.isSwapActive, false);
        assert.equal(entry.husbandSalary, 3184);
        assert.equal(entry.wifeSalary, 1751);
      }

      // Months 4-10: Swap Active -> H: V (2398 €) | W: III (2295 €)
      for (const m of [4, 5, 6, 7, 8, 9, 10]) {
        const entry = res.months[m - 1];
        assert.equal(
          entry.isSwapActive,
          true,
          `Month ${m} must be swap active`,
        );
        assert.equal(entry.husbandSalary, 2398);
        assert.equal(entry.wifeSalary, 2295);
      }

      // Month 11: Pre-birth Mutterschutz -> H: V (2398 €), Wife Mutterschutz at Class III (2295 €)
      const m11 = res.months[10];
      assert.equal(m11.isSwapActive, true);
      assert.equal(m11.husbandSalary, 2398);
      assert.equal(m11.mutterschutz, 2295);

      // Month 12: Delivery (Reverted) -> H: III (3184 €), Wife Mutterschutz at Class III (2295 €)
      const m12 = res.months[11];
      assert.equal(m12.isSwapActive, false);
      assert.equal(m12.husbandSalary, 3184);
      assert.equal(m12.mutterschutz, 2295);
    });

    it("correctly calculates annual tax return refund reconciling withholding deficits", () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ];

      // 8 months of swap in 2026 (M4 to M11): net monthly deficit = (3184 - 2398) - (2295 - 1751) = 786 - 544 = 242 €/mo
      // Total 2026 deficit = 8 * 242 = 1.936 €
      // Tax return in March 2027 (M15) = 1.936 € + 850 € = 2.786 €
      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: toSwitchId("SWAP-1"),
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: toFullCalendarYear(2026),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: "Optimize § 2b BEEG",
          revertSimulationMonth: toSimulationMonth(12),
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises: [],
      });

      const m15 = res.months[14];
      assert.equal(m15.calendarLabel, toCalendarLabel("03.2027"));
      // 1.936 € swap deficit + 850 € base refund = 2.786 €
      assert.equal(m15.taxRefund, 2786);
    });
  });

  describe("Batch 3: Salary Raises & Career Progression", () => {
    it("applies percentage salary raises from the effective month onwards", () => {
      const salaryRaises: SalaryRaiseAction[] = [
        {
          raiseId: toRaiseId("RAISE-1"),
          effectiveSimulationMonth: toSimulationMonth(13),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: toFullCalendarYear(2027),
          targetPerson: TargetPerson.Both,
          percentageIncrease: toPercentageRate(0.1), // +10% raise
          reason: "Promotion to Staff Engineer",
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises,
      });

      // Months 1-12: Unadjusted salaries (3184 € and 1751 €)
      for (let m = 1; m <= 12; m++) {
        assert.equal(res.months[m - 1].husbandSalary, 3184);
        assert.equal(res.months[m - 1].wifeSalary, 1751);
      }

      // Months 13-24: +10% applied
      // Husband: 3184 * 1.10 = 3502.40 €
      // Wife: 1751 * 1.10 = 1926.10 €
      for (let m = 13; m <= 24; m++) {
        assert.equal(res.months[m - 1].husbandSalary, 3502.4);
        assert.equal(res.months[m - 1].wifeSalary, 1926.1);
      }
    });

    it("accurately integrates all 4 batches concurrently (Preexisting + Pregnancies + Switches + Raises)", () => {
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ];

      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: toSwitchId("SWAP-1"),
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: toFullCalendarYear(2026),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: "§ 2b BEEG",
          revertSimulationMonth: toSimulationMonth(12),
        },
      ];

      const salaryRaises: SalaryRaiseAction[] = [
        {
          raiseId: toRaiseId("RAISE-Y2"),
          effectiveSimulationMonth: toSimulationMonth(13),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: toFullCalendarYear(2027),
          targetPerson: TargetPerson.Both,
          percentageIncrease: toPercentageRate(0.05), // +5% in Year 2
          reason: "Tariff increase",
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises,
      });

      assert.equal(res.months.length, 60);

      // Verify grand total conservation
      const sumSalaries = res.summary.totalSalaries;
      const sumBenefits = res.summary.totalBenefits;
      const sumTax = res.summary.totalTaxRefunds;
      const grandTotal = res.summary.grandTotal;

      assert.equal(grandTotal, toEuroAmount(sumSalaries + sumBenefits + sumTax));
      assert.ok(
        grandTotal > 300000,
        `5-year grand total (${grandTotal} €) must exceed 300.000 €`,
      );
    });

    it("dynamically processes custom user-added 3rd child pregnancy, custom swap, and merit raises", () => {
      // 3 Pregnancies: Child 1 (M12), Child 2 (M36), Child 3 (M60)
      const pregnancies: PregnancyAction[] = [
        {
          pregnancyId: toPregnancyId("PREG-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(4),
          calculatedDeliverySimulationMonth: toSimulationMonth(12),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
        {
          pregnancyId: toPregnancyId("PREG-2"),
          childIndex: toChildIndex(2),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2028),
          positiveTestSimulationMonth: toSimulationMonth(28),
          calculatedDeliverySimulationMonth: toSimulationMonth(36),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
        {
          pregnancyId: toPregnancyId("PREG-3"),
          childIndex: toChildIndex(3),
          positiveTestCalendarMonth: toCalendarMonth(4),
          positiveTestCalendarYear: toFullCalendarYear(2030),
          positiveTestSimulationMonth: toSimulationMonth(52),
          calculatedDeliverySimulationMonth: toSimulationMonth(60),
          motherPostBirthPartTimeHours: toWorkingHours(24),
          motherPostBirthPartTimeClass5Net: toNetSalary(1182),
          motherPostBirthPartTimeClass3Net: toNetSalary(1413),
          fatherPartnerMonthsCount: toMonthDuration(4),
        },
      ];

      // 3 Custom Swaps
      const taxClassSwitches: TaxClassSwitchAction[] = [
        {
          switchId: toSwitchId("SWAP-1"),
          effectiveSimulationMonth: toSimulationMonth(4),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: toFullCalendarYear(2026),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: "Swap 1 (§ 2b BEEG)",
          revertSimulationMonth: toSimulationMonth(12),
        },
        {
          switchId: toSwitchId("SWAP-2"),
          effectiveSimulationMonth: toSimulationMonth(28),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: toFullCalendarYear(2028),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: "Swap 2 (§ 2b BEEG)",
          revertSimulationMonth: toSimulationMonth(36),
        },
        {
          switchId: toSwitchId("SWAP-3"),
          effectiveSimulationMonth: toSimulationMonth(52),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: toFullCalendarYear(2030),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason: "Swap 3 (§ 2b BEEG)",
          revertSimulationMonth: toSimulationMonth(60),
        },
      ];

      // Custom Raises
      const salaryRaises: SalaryRaiseAction[] = [
        {
          raiseId: toRaiseId("RAISE-HUSBAND-PROMOTION"),
          effectiveSimulationMonth: toSimulationMonth(25),
          effectiveCalendarMonth: toCalendarMonth(1),
          effectiveCalendarYear: toFullCalendarYear(2028),
          targetPerson: TargetPerson.Husband,
          percentageIncrease: toPercentageRate(0.1), // +10% Husband Promotion
          reason: "Senior Staff Promotion",
        },
        {
          raiseId: toRaiseId("RAISE-WIFE-PROMOTION"),
          effectiveSimulationMonth: toSimulationMonth(40),
          effectiveCalendarMonth: toCalendarMonth(4),
          effectiveCalendarYear: toFullCalendarYear(2029),
          targetPerson: TargetPerson.Wife,
          percentageIncrease: toPercentageRate(0.08), // +8% Wife Merit Step
          reason: "Wife Merit Step",
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies,
        taxClassSwitches,
        salaryRaises,
      });

      assert.equal(res.months.length, 60);

      // Verify Month 12 is Delivery 1
      assert.equal(res.months[11].monthId, "M12.2026");
      assert.equal(res.months[11].monthRef, "M9 (Birth 1)");
      assert.equal(res.months[11].monthSimRef, "Sim12");

      // Verify Month 25 husband salary has +10% raise
      const m24Husband = res.months[23].husbandSalary;
      const m25Husband = res.months[24].husbandSalary;
      assert.equal(m25Husband, toEuroAmount(m24Husband * 1.1));

      // Verify Month 52 is Swap 3 active
      assert.equal(res.months[51].isSwapActive, true);
      assert.match(res.months[51].taxClassLabel, /H: V/);
      assert.match(res.months[51].taxClassLabel, /W: III/);

      // Verify Month 60 is Delivery 3
      assert.equal(res.months[59].isMutterschutz, true);

      // Verify Action Milestone Rows placed immediately before the triggering month
      // Month 4 has Pregnancy 1 Positive and Swap 1 Effective
      assert.ok(
        res.months[3].startingActions &&
          res.months[3].startingActions.length >= 2,
      );
      const m4ActionTitles = res.months[3].startingActions!.map((a) => a.title);
      assert.ok(
        m4ActionTitles.some((t) =>
          t.includes("Positive Pregnancy Test (Child #1)")),
      );
      assert.ok(
        m4ActionTitles.some((t) => t.includes("Tax Class Switch Active")),
      );

      // Month 12 has Delivery 1 and Swap 1 Reversion
      assert.ok(
        res.months[11].startingActions &&
          res.months[11].startingActions.length >= 2,
      );
      const m12ActionTitles = res.months[11].startingActions!.map(
        (a) => a.title,
      );
      assert.ok(m12ActionTitles.some((t) => t.includes("Delivery & Birth")));
      assert.ok(m12ActionTitles.some((t) => t.includes("Tax Class Reversion")));

      // Month 25 has Husband Merit Promotion
      assert.ok(
        res.months[24].startingActions &&
          res.months[24].startingActions.length >= 1,
      );
      assert.ok(
        res.months[24].startingActions![0].title.includes(
          "Salary Raise Effective (HUSBAND +10%)",
        ),
      );
    });
  });

  describe("Batch 4: Financial Events (One-Off Costs, Expenses & Inflows)", () => {
    it("injects one-off family expense event into specialEvents and reduces monthlyTotal and grandTotal", () => {
      const financialEvents: FinancialEventAction[] = [
        {
          eventId: toFinancialEventId("FIN-EQUIPMENT-1"),
          effectiveSimulationMonth: toSimulationMonth(17),
          effectiveCalendarMonth: toCalendarMonth(5),
          effectiveCalendarYear: toFullCalendarYear(2027),
          title: "Baby Initial Equipment",
          amount: toEuroAmount(-1500),
          category: FinancialEventCategory.BabyEquipment,
          description: "Nursery crib and stroller",
        },
      ];

      const resBaseline = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents: [],
      });

      const resWithCost = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents,
      });

      const m17Baseline = resBaseline.months[16];
      const m17Cost = resWithCost.months[16];

      // Verify Special Event Item in Month 17
      assert.ok(
        m17Cost.specialEvents.some((e) => e.eventId === "FIN-EQUIPMENT-1"),
      );
      const ev = m17Cost.specialEvents.find(
        (e) => e.eventId === "FIN-EQUIPMENT-1",
      )!;
      assert.equal(ev.amount, -1500);

      // Verify monthly total is exactly -1500 less than baseline
      assert.equal(m17Cost.monthlyTotal, m17Baseline.monthlyTotal - 1500);

      // Verify 60-month grandTotal is reduced by 1500
      assert.equal(
        resWithCost.summary.grandTotal,
        resBaseline.summary.grandTotal - 1500,
      );
    });

    it("injects one-off inflow grant event into specialEvents and increases monthlyTotal and grandTotal", () => {
      const financialEvents: FinancialEventAction[] = [
        {
          eventId: toFinancialEventId("FIN-BONUS-GRANT"),
          effectiveSimulationMonth: toSimulationMonth(12),
          effectiveCalendarMonth: toCalendarMonth(12),
          effectiveCalendarYear: toFullCalendarYear(2026),
          title: "Employer Family Inflow Grant",
          amount: toEuroAmount(2500),
          category: FinancialEventCategory.CareerBonus,
          description: "Performance bonus grant",
        },
      ];

      const resBaseline = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents: [],
      });

      const resWithIncome = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents,
      });

      const m12Baseline = resBaseline.months[11];
      const m12Income = resWithIncome.months[11];

      // Verify Special Event Item in Month 12
      assert.ok(
        m12Income.specialEvents.some((e) => e.eventId === "FIN-BONUS-GRANT"),
      );
      const ev = m12Income.specialEvents.find(
        (e) => e.eventId === "FIN-BONUS-GRANT",
      )!;
      assert.equal(ev.amount, 2500);

      // Verify monthly total is exactly +2500 greater than baseline
      assert.equal(m12Income.monthlyTotal, m12Baseline.monthlyTotal + 2500);

      // Verify 60-month grandTotal is increased by 2500
      assert.equal(
        resWithIncome.summary.grandTotal,
        resBaseline.summary.grandTotal + 2500,
      );
    });

    it("supports scenario-specific financial events scoping when appliesToScenarios is set", () => {
      const financialEvents: FinancialEventAction[] = [
        {
          eventId: toFinancialEventId("FIN-SCENARIO-C-ONLY"),
          effectiveSimulationMonth: toSimulationMonth(20),
          effectiveCalendarMonth: toCalendarMonth(8),
          effectiveCalendarYear: toFullCalendarYear(2027),
          title: "Scenario C Specific Investment",
          amount: toEuroAmount(-3000),
          category: FinancialEventCategory.CustomSpecial,
          description: "Private childcare fund",
          appliesToScenarios: [ScenarioId.C],
        },
      ];

      const resB = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents,
      });

      const resC = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents,
      });

      // Scenario B should NOT have the event
      assert.ok(
        !resB.months[19].specialEvents.some(
          (e) => e.eventId === "FIN-SCENARIO-C-ONLY",
        ),
      );

      // Scenario C SHOULD have the event
      assert.ok(
        resC.months[19].specialEvents.some(
          (e) => e.eventId === "FIN-SCENARIO-C-ONLY",
        ),
      );
    });
  });

  describe("Statutory Working Hours & Benefit Qualification (§ 1 Abs. 1 Nr. 4 & § 4b BEEG)", () => {
    it("disqualifies mother from Elterngeld when part-time hours exceed 32h/week (0 € benefit paid)", () => {
      const highHoursPregnancy: PregnancyAction = {
        pregnancyId: toPregnancyId("PREG-HIGH-HOURS"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(4),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        positiveTestSimulationMonth: toSimulationMonth(4),
        calculatedDeliverySimulationMonth: toSimulationMonth(12),
        motherPostBirthPartTimeHours: toWorkingHours(35), // > 32h/week -> Disqualified under § 1 BEEG
        motherPostBirthPartTimeClass5Net: toNetSalary(1800),
        motherPostBirthPartTimeClass3Net: toNetSalary(2400),
        fatherPartnerMonthsCount: toMonthDuration(4),
      };

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies: [highHoursPregnancy],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents: [],
      });

      // Months 14..25 are post-Mutterschutz leave months
      for (let m = 14; m <= 25; m++) {
        const month = res.months[m - 1];
        // Zero Elterngeld for mother because hours > 32
        assert.equal(
          month.wifeElterngeld,
          0,
          `Month ${m} wifeElterngeld must be 0 for >32h`,
        );
        assert.ok(
          month.phaseLabel.includes(">32h: No EG"),
          `Phase label should indicate exclusion at month ${m}`,
        );
      }
    });

    it("denies Partnerschaftsbonus when mother works < 24h/week (outside 24-32h corridor § 4b BEEG)", () => {
      const lowHoursPregnancy: PregnancyAction = {
        pregnancyId: toPregnancyId("PREG-LOW-HOURS"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(4),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        positiveTestSimulationMonth: toSimulationMonth(4),
        calculatedDeliverySimulationMonth: toSimulationMonth(12),
        motherPostBirthPartTimeHours: toWorkingHours(20), // 20h < 24h -> Qualifies for EG+, but NOT Partnerschaftsbonus
        motherPostBirthPartTimeClass5Net: toNetSalary(1045),
        motherPostBirthPartTimeClass3Net: toNetSalary(1405),
        fatherPartnerMonthsCount: toMonthDuration(4),
      };

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies: [lowHoursPregnancy],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents: [],
      });

      // Half of rounded no-income Basis 2295 * 0.65 = 1491.75 -> 745.88.
      for (let m = 14; m <= 25; m++) {
        const month = res.months[m - 1];
        assert.equal(month.wifeElterngeld, 745.88);
      }

      // Months 26..29: Partnerschaftsbonus window -> denied because 20h < 24h
      for (let m = 26; m <= 29; m++) {
        const month = res.months[m - 1];
        assert.equal(month.isPartnerschaftsbonus, false);
        assert.equal(
          month.wifeElterngeld,
          0,
          `Month ${m} wifeElterngeld must be 0 for <24h during bonus window`,
        );
        assert.equal(
          month.husbandElterngeld,
          0,
          `Month ${m} husbandElterngeld must be 0 for <24h during bonus window`,
        );
        assert.ok(month.phaseLabel.includes("<24h: No PB"));
      }
    });

    it("grants full ElterngeldPlus AND Partnerschaftsbonus when working 24-32h/week", () => {
      const optimalHoursPregnancy: PregnancyAction = {
        pregnancyId: toPregnancyId("PREG-OPTIMAL-HOURS"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(4),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        positiveTestSimulationMonth: toSimulationMonth(4),
        calculatedDeliverySimulationMonth: toSimulationMonth(12),
        motherPostBirthPartTimeHours: toWorkingHours(24), // 24h -> in corridor 24-32h
        motherPostBirthPartTimeClass5Net: toNetSalary(1328),
        motherPostBirthPartTimeClass3Net: toNetSalary(1648),
        fatherPartnerMonthsCount: toMonthDuration(4),
      };

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies: [optimalHoursPregnancy],
        taxClassSwitches: [],
        salaryRaises: [],
        financialEvents: [],
      });

      // Income loss (2295 - 1328) * 0.65 = 628.55, below the ceiling.
      for (let m = 14; m <= 25; m++) {
        const month = res.months[m - 1];
        assert.equal(month.wifeElterngeld, 628.55);
      }

      // Months 26..29: Partnerschaftsbonus granted for both parents
      for (let m = 26; m <= 29; m++) {
        const month = res.months[m - 1];
        assert.equal(month.isPartnerschaftsbonus, true);
        assert.equal(month.wifeElterngeld, 628.55);
        assert.equal(month.husbandElterngeld, 150);
        assert.ok(
          month.phaseLabel.includes("Partnerschaftsbonus 1 (Both 24-32h)"),
        );
      }
    });

    it("evaluates generalized dynamic WorkingHoursChangeActions for both husband and wife across the timeline", () => {
      const pregnancy: PregnancyAction = {
        pregnancyId: toPregnancyId("PREG-DYNAMIC-SCHEDULE"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(4),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        positiveTestSimulationMonth: toSimulationMonth(4),
        calculatedDeliverySimulationMonth: toSimulationMonth(12),
        motherPostBirthPartTimeHours: toWorkingHours(0),
        motherPostBirthPartTimeClass5Net: toNetSalary(0),
        motherPostBirthPartTimeClass3Net: toNetSalary(0),
        fatherPartnerMonthsCount: toMonthDuration(4),
      };

      const workingHoursChanges: WorkingHoursChangeAction[] = [
        {
          changeId: toHoursChangeId("HOURS-WIFE-RETURN-M14"),
          effectiveSimulationMonth: toSimulationMonth(14),
          effectiveCalendarMonth: toCalendarMonth(2),
          effectiveCalendarYear: toFullCalendarYear(2027),
          targetPerson: TargetPerson.Wife,
          weeklyHours: toWorkingHours(24),
          reason: "Wife Part-Time Return (24h/wk)",
        },
        {
          changeId: toHoursChangeId("HOURS-HUSBAND-BONUS-M26"),
          effectiveSimulationMonth: toSimulationMonth(26),
          effectiveCalendarMonth: toCalendarMonth(2),
          effectiveCalendarYear: toFullCalendarYear(2028),
          targetPerson: TargetPerson.Husband,
          weeklyHours: toWorkingHours(32),
          reason: "Husband Partnerschaftsbonus Reduction (32h/wk)",
        },
        {
          changeId: toHoursChangeId("HOURS-WIFE-INCREASE-M36"),
          effectiveSimulationMonth: toSimulationMonth(36),
          effectiveCalendarMonth: toCalendarMonth(12),
          effectiveCalendarYear: toFullCalendarYear(2028),
          targetPerson: TargetPerson.Wife,
          weeklyHours: toWorkingHours(32),
          reason: "Wife Career Advancement Hours Increase (32h/wk)",
        },
      ];

      const res = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies: [pregnancy],
        taxClassSwitches: [],
        salaryRaises: [],
        workingHoursChanges,
      });

      // Month 14: Wife returns to work at 24h, startingAction created
      const m14 = res.months[13];
      assert.ok(m14.startingActions && m14.startingActions.length >= 1);
      assert.ok(
        m14.startingActions!.some((a) =>
          a.title.includes("Working Hours Adjustment (WIFE: 24 h/wk)")),
      );
      assert.equal(m14.wifeSalary > 0, true);

      // Month 26: Husband reduces to 32h, Partnerschaftsbonus active
      const m26 = res.months[25];
      assert.ok(m26.startingActions && m26.startingActions.length >= 1);
      assert.ok(
        m26.startingActions!.some((a) =>
          a.title.includes("Working Hours Adjustment (HUSBAND: 32 h/wk)")),
      );
      assert.equal(m26.isPartnerschaftsbonus, true);
      assert.equal(m26.husbandElterngeld, 150);

      // Month 36: Wife increases to 32h, startingAction created
      const m36 = res.months[35];
      assert.ok(m36.startingActions && m36.startingActions.length >= 1);
      assert.ok(
        m36.startingActions!.some((a) =>
          a.title.includes("Working Hours Adjustment (WIFE: 32 h/wk)")),
      );
    });

    describe("Batch 2: Arbitrary Tax Classes & Faktorverfahren (§ 39f EStG)", () => {
      it("simulates baseline Class IV / IV with Factor and formats labels accordingly", () => {
        const preexistingWithFactor: PreexistingConditions = {
          ...basePreexisting,
          husbandInitialTaxClass: TaxClass.IV,
          wifeInitialTaxClass: TaxClass.IV,
          initialUseTaxFactor: true,
          initialTaxFactor: toTaxFactor(0.905),
        };

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.A,
          preexisting: preexistingWithFactor,
          pregnancies: [],
          taxClassSwitches: [],
          salaryRaises: [],
          workingHoursChanges: [],
          financialEvents: [],
        });

        // Verify that Month 1 has the Factor tax class label
        const m1 = res.months[0];
        assert.equal(m1.taxClassLabel, "H: IV (F) | W: IV (F)");
      });

      it("handles switch from Class IV/IV with Factor to V/III and reversion", () => {
        const preexistingWithFactor: PreexistingConditions = {
          ...basePreexisting,
          husbandInitialTaxClass: TaxClass.IV,
          wifeInitialTaxClass: TaxClass.IV,
          initialUseTaxFactor: true,
          initialTaxFactor: toTaxFactor(0.905),
        };

        const taxClassSwitches: TaxClassSwitchAction[] = [
          {
            switchId: toSwitchId("SWAP-1"),
            effectiveSimulationMonth: toSimulationMonth(5),
            effectiveCalendarMonth: toCalendarMonth(5),
            effectiveCalendarYear: toFullCalendarYear(2026),
            targetHusbandTaxClass: TaxClass.V,
            targetWifeTaxClass: TaxClass.III,
            targetUseTaxFactor: false,
            revertHusbandTaxClass: TaxClass.IV,
            revertWifeTaxClass: TaxClass.IV,
            revertUseTaxFactor: true,
            statutoryReason:
              "Strategic pregnancy swap to Class III (§ 2b BEEG)",
            revertSimulationMonth: toSimulationMonth(12),
          },
        ];

        const res = runScenarioBatches({
          scenarioKey: ScenarioId.C,
          preexisting: preexistingWithFactor,
          pregnancies: [],
          taxClassSwitches,
          salaryRaises: [],
          workingHoursChanges: [],
          financialEvents: [],
        });

        // Month 1-4: Baseline IV (F)
        assert.equal(res.months[0].taxClassLabel, "H: IV (F) | W: IV (F)");

        // Month 5: Switch active V / III
        assert.equal(res.months[4].taxClassLabel, "H: V | W: III");
        assert.ok(
          res.months[4].startingActions!.some((a) =>
            a.title.includes("ACTION: Tax Class Switch Active")),
        );

        // Month 12: Revert back to IV (F)
        assert.equal(res.months[11].taxClassLabel, "H: IV (F) | W: IV (F)");
        assert.ok(
          res.months[11].startingActions!.some((a) =>
            a.title.includes("ACTION: Tax Class Reversion")),
        );
      });
    });
  });

  describe("Empty Scenario Simulation & Zero-Action Baseline", () => {
    it("simulates cleanly across Scenarios A, B, and C with 0 actions across all batches", () => {
      const resA = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        workingHoursChanges: [],
        financialEvents: [],
      });

      const resB = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        workingHoursChanges: [],
        financialEvents: [],
      });

      const resC = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting: basePreexisting,
        pregnancies: [],
        taxClassSwitches: [],
        salaryRaises: [],
        workingHoursChanges: [],
        financialEvents: [],
      });

      // 60 months generated for each scenario
      assert.equal(resA.months.length, 60);
      assert.equal(resB.months.length, 60);
      assert.equal(resC.months.length, 60);

      // Verify relative month labels have no pregnancy tags
      assert.equal(resB.months[0].monthRef, "M1");
      assert.equal(resB.months[11].monthRef, "M12");
      assert.equal(resB.months[0].phaseLabel, "Regular Baseline");
      assert.equal(resB.months[12].phaseLabel, "Regular Baseline");

      // Verify zero benefit replacement
      assert.equal(resB.summary.totalMutterschutz, 0);
      assert.equal(resB.summary.totalWifeElterngeld, 0);
      assert.equal(resB.summary.totalHusbandElterngeld, 0);
      assert.equal(resB.summary.totalKindergeld, 0);

      // Wife maintains regular full-time salary throughout (1751 €)
      for (let m = 0; m < 60; m++) {
        assert.equal(resB.months[m].wifeSalary, 1751);
        assert.equal(resB.months[m].isMutterschutz, false);
        assert.equal(resB.months[m].wifeElterngeld, 0);
        assert.equal(resB.months[m].husbandElterngeld, 0);
      }

      // Grand totals between A, B, and C should be identical with zero switches and zero benefits
      assert.equal(resA.summary.grandTotal, resB.summary.grandTotal);
      assert.equal(resB.summary.grandTotal, resC.summary.grandTotal);
    });

    it("demonstrates perfect annual tax neutrality for 72-month zero-pregnancy scenario with 13th salary bonus and temporary tax switch", () => {
      const spousal = deriveSpousalNetSalaries(
        toGrossSalary(4000),
        toGrossSalary(3000),
        toWorkingHours(32),
        toWorkingHours(40),
        0,
      );

      const preexisting: PreexistingConditions = {
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(72),
        salaryInputMode: SalaryInputMode.Gross,
        salaryPeriod: SalaryPeriod.Monthly,
        husbandGross: toGrossSalary(4000),
        wifeGross: toGrossSalary(3000),
        husbandInitialTaxClass: TaxClass.III,
        husbandInitialNet: toNetSalary(spousal.husbandClass3Net),
        husbandInitialClass5Net: toNetSalary(spousal.husbandClass5Net),
        husbandInitialClass4Net: toNetSalary(spousal.husbandClass4Net),
        husbandWeeklyHours: toWorkingHours(32),
        wifeInitialTaxClass: TaxClass.V,
        wifeInitialFullTimeNet: toNetSalary(spousal.wifeClass5FullTimeNet),
        wifeInitialClass3FullTimeNet: toNetSalary(
          spousal.wifeClass3FullTimeNet,
        ),
        wifeInitialClass4FullTimeNet: toNetSalary(
          spousal.wifeClass4FullTimeNet,
        ),
        wifeInitialPartTimeClass5Net: toNetSalary(
          spousal.wifeClass5PartTimeNet,
        ),
        wifeInitialPartTimeClass3Net: toNetSalary(
          spousal.wifeClass3PartTimeNet,
        ),
        wifeInitialPartTimeClass4Net: toNetSalary(
          spousal.wifeClass4PartTimeNet,
        ),
        wifeWeeklyHours: toWorkingHours(40),
        wifePostBirthWeeklyHours: toWorkingHours(32),
        initialUseTaxFactor: false,
        initialTaxFactor: spousal.taxFactor,
        annualBonusGross: toEuroAmount(0),
        annualBonusMonth: toCalendarMonth(12),
        investmentReturnMonthly: toEuroAmount(0),
        existingChildrenCount: toChildrenCount(0),
        kindergeldPerChild: toEuroAmount(259),
        enable13thSalary: true,
        bonus40Month: toCalendarMonth(5),
        bonus60Month: toCalendarMonth(11),
        taxReturnMonth: toCalendarMonth(3),
      };

      const customTaxClassSwitches = [
        {
          switchId: toSwitchId("SWAP-CHILD-1"),
          effectiveSimulationMonth: toSimulationMonth(6),
          effectiveCalendarMonth: toCalendarMonth(6),
          effectiveCalendarYear: toFullCalendarYear(2026),
          targetHusbandTaxClass: TaxClass.V,
          targetWifeTaxClass: TaxClass.III,
          statutoryReason:
            "Optimize Child 1 Elterngeld assessment baseline (§ 2b BEEG)",
          revertSimulationMonth: toSimulationMonth(12),
        },
      ];

      const customFinancialEvents = [
        {
          eventId: toFinancialEventId("FIN-CHILD1-EQUIPMENT"),
          effectiveSimulationMonth: toSimulationMonth(17),
          effectiveCalendarMonth: toCalendarMonth(5),
          effectiveCalendarYear: toFullCalendarYear(2027),
          title: "Child #1 Initial Equipment (*Erstausstattung*)",
          amount: toEuroAmount(-1500),
          category: FinancialEventCategory.BabyEquipment,
          description:
            "Crib, stroller, car seat, changing table, and initial newborn essentials",
        },
        {
          eventId: toFinancialEventId("FIN-CHILD1-KITA-DEPOSIT"),
          effectiveSimulationMonth: toSimulationMonth(26),
          effectiveCalendarMonth: toCalendarMonth(2),
          effectiveCalendarYear: toFullCalendarYear(2028),
          title: "Kita Childcare Enrollment & Equipment (*Kita-Start*)",
          amount: toEuroAmount(-600),
          category: FinancialEventCategory.ChildcareFees,
          description:
            "One-off daycare entrance fee, activity deposit, and outdoor gear",
        },
      ];

      const resA = runScenarioBatches({
        scenarioKey: ScenarioId.A,
        preexisting,
        pregnancies: [],
        taxClassSwitches: customTaxClassSwitches,
        salaryRaises: [],
        workingHoursChanges: [],
        financialEvents: customFinancialEvents,
      });

      const resC = runScenarioBatches({
        scenarioKey: ScenarioId.C,
        preexisting,
        pregnancies: [],
        taxClassSwitches: customTaxClassSwitches,
        salaryRaises: [],
        workingHoursChanges: [],
        financialEvents: customFinancialEvents,
      });

      // Exactly 72 months generated
      assert.equal(resA.months.length, 72);
      assert.equal(resC.months.length, 72);

      // Verify exact neutral parity under joint assessment (§ 26b EStG)
      // Independent cash-flow sum from the supplied net inputs and bonus schedule.
      // The existing assumed tax refund is removed by the later reconciliation fix.
      const monthly = spousal.husbandClass3Net + spousal.wifeClass5FullTimeNet;
      // The legacy enable13thSalary flag pays the husband only; wife bonuses require an explicit schedule.
      const bonus = Math.round(spousal.husbandClass3Net * 0.4) + Math.round(spousal.husbandClass3Net * 0.6);
      const expectedTotal = toEuroAmount(monthly * 72 + bonus * 6 + 850 * 6 - 1500 - 600);
      assert.equal(resA.summary.grandTotal, expectedTotal);
      assert.equal(resC.summary.grandTotal, expectedTotal);
      assert.equal(resC.summary.grandTotal - resA.summary.grandTotal, 0);
    });
  });
});
