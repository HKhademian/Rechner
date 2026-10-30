import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  type PreexistingConditions,
  type PregnancyAction,
  ScenarioId,
  TaxClass,
  SalaryPeriod,
  SpecialEventType,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toEuroAmount,
  toCalendarMonth,
  toSimulationMonth,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPregnancyId,
} from "#engine/types";
import {
  type ChildYearPresence,
  computeKinderfreibetragGuenstigerpruefung,
} from "#engine/tax/jointAssessment";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";

describe("Statutory Child Allowance Günstigerprüfung (§ 31, § 32 Abs. 6 EStG)", () => {
  describe("computeKinderfreibetragGuenstigerpruefung Core Tariff Tests", () => {
    it("Scenario 1: Low-income couple (< 70k zvE) where Kindergeld is more favorable", () => {
      // 40.000 € joint taxable income (20k each in splitting)
      const children: ChildYearPresence[] = [
        {
          childIndex: toChildIndex(1),
          birthCalendarYear: toFullCalendarYear(2025),
          birthCalendarMonth: toCalendarMonth(1),
        },
      ];
      const result = computeKinderfreibetragGuenstigerpruefung(
        40000,
        children,
        2026,
        259,
      );

      assert.equal(result.jointAnnualZvE, 40000);
      assert.equal(result.totalKinderfreibetrag, 9756);
      assert.equal(result.totalKindergeldReceived, 3108); // 259 * 12
      // Tax savings is lower than 3.108 € at low marginal rates
      assert.equal(result.isKinderfreibetragFavorable, false);
      assert.equal(result.extraTaxRefund, 0); // No clawback, parents retain 100% of Kindergeld
    });

    it("Scenario 2: Baseline middle-to-high income couple (~95k zvE) where Kinderfreibetrag is favorable", () => {
      // 95.000 € joint taxable income (~47.5k each in splitting -> ~35-37% marginal rate)
      const children: ChildYearPresence[] = [
        {
          childIndex: toChildIndex(1),
          birthCalendarYear: toFullCalendarYear(2025),
          birthCalendarMonth: toCalendarMonth(1),
        },
      ];
      const result = computeKinderfreibetragGuenstigerpruefung(
        95000,
        children,
        2026,
        259,
      );

      assert.equal(result.totalKinderfreibetrag, 9756);
      assert.equal(result.totalKindergeldReceived, 3108);
      assert.equal(result.isKinderfreibetragFavorable, true);
      assert.ok(
        result.taxSavingsFromAllowance > 3108,
        "Tax savings should exceed Kindergeld",
      );
      assert.ok(result.extraTaxRefund > 0, "Extra refund should be positive");
      assert.equal(
        result.extraTaxRefund,
        result.taxSavingsFromAllowance - result.totalKindergeldReceived,
      );
    });

    it("Scenario 3: High-income couple (160k zvE, 42% bracket) achieving maximum statutory tax relief", () => {
      // 160.000 € joint taxable income (80k each in splitting -> 42% Spitzensteuersatz)
      const children: ChildYearPresence[] = [
        {
          childIndex: toChildIndex(1),
          birthCalendarYear: toFullCalendarYear(2025),
          birthCalendarMonth: toCalendarMonth(1),
        },
      ];
      const result = computeKinderfreibetragGuenstigerpruefung(
        160000,
        children,
        2026,
        259,
      );

      assert.equal(result.isKinderfreibetragFavorable, true);
      // EStG §31 excludes solidarity: 44928 -40830 -3108 =990.
      assert.ok(result.taxSavingsFromAllowance >= 4000);
      assert.equal(result.taxSavingsFromAllowance, 4098);
      assert.equal(result.extraTaxRefund, 990);
    });

    it("Scenario 4: Prorated birth year calculation (§ 32 Abs. 6 Satz 5 EStG)", () => {
      // Child born in May (Month 5) -> Alive for 8 months of the year (May to Dec = 8/12)
      const children: ChildYearPresence[] = [
        {
          childIndex: toChildIndex(1),
          birthCalendarYear: toFullCalendarYear(2026),
          birthCalendarMonth: toCalendarMonth(5),
        },
      ];
      const result = computeKinderfreibetragGuenstigerpruefung(
        120000,
        children,
        2026,
        259,
      );

      const expectedAllowance = Math.round((8 / 12) * 9756); // 6.504 €
      const expectedKg = 259 * 8; // 2.072 €
      assert.equal(result.totalKinderfreibetrag, expectedAllowance);
      assert.equal(result.totalKindergeldReceived, expectedKg);
      assert.equal(result.isKinderfreibetragFavorable, true);
      assert.ok(result.extraTaxRefund > 0);
    });

    it("Scenario 5: Multiple children scaling (2 children)", () => {
      const children: ChildYearPresence[] = [
        {
          childIndex: toChildIndex(1),
          birthCalendarYear: toFullCalendarYear(2024),
          birthCalendarMonth: toCalendarMonth(1),
        },
        {
          childIndex: toChildIndex(2),
          birthCalendarYear: toFullCalendarYear(2025),
          birthCalendarMonth: toCalendarMonth(1),
        },
      ];
      const result = computeKinderfreibetragGuenstigerpruefung(
        120000,
        children,
        2026,
        259,
      );

      assert.equal(result.totalKinderfreibetrag, 9756 * 2); // 19.512 €
      assert.equal(result.totalKindergeldReceived, 3108 * 2); // 6.216 €
      assert.equal(result.isKinderfreibetragFavorable, true);
      assert.ok(result.extraTaxRefund > 500);
    });

    it("Scenario 6: Edge case - 0 children or 0 taxable income", () => {
      const res0Kids = computeKinderfreibetragGuenstigerpruefung(
        100000,
        [],
        2026,
        259,
      );
      assert.equal(res0Kids.totalKinderfreibetrag, 0);
      assert.equal(res0Kids.extraTaxRefund, 0);
      assert.equal(res0Kids.isKinderfreibetragFavorable, false);

      const res0Income = computeKinderfreibetragGuenstigerpruefung(
        0,
        [
          {
            childIndex: toChildIndex(1),
            birthCalendarYear: toFullCalendarYear(2025),
            birthCalendarMonth: toCalendarMonth(1),
          },
        ],
        2026,
        259,
      );
      assert.equal(res0Income.extraTaxRefund, 0);
      assert.equal(res0Income.isKinderfreibetragFavorable, false);
    });
  });

  describe("Simulation Timeline Tax Reconciliation Integration", () => {
    const basePreexisting: PreexistingConditions = {
      startCalendarYear: toFullCalendarYear(2026),
      startCalendarMonth: toCalendarMonth(1),
      simulationDurationMonths: toMonthDuration(48),
      salaryPeriod: SalaryPeriod.Monthly,
      husbandGross: toGrossSalary(7000),
      wifeGross: toGrossSalary(5000),
      husbandInitialTaxClass: TaxClass.III,
      husbandInitialNet: toNetSalary(4719),
      husbandInitialClass5Net: toNetSalary(3475),
      husbandWeeklyHours: toWorkingHours(32),
      wifeInitialTaxClass: TaxClass.V,
      wifeInitialFullTimeNet: toNetSalary(2597),
      wifeInitialClass3FullTimeNet: toNetSalary(3471),
      wifeInitialPartTimeClass5Net: toNetSalary(1751),
      wifeInitialPartTimeClass3Net: toNetSalary(2295),
      wifeWeeklyHours: toWorkingHours(40),
      wifePostBirthWeeklyHours: toWorkingHours(24),
      existingChildrenCount: toChildrenCount(0),
      kindergeldPerChild: toEuroAmount(259),
      enable13thSalary: true,
      bonus40Month: toCalendarMonth(5),
      bonus60Month: toCalendarMonth(11),
      taxReturnMonth: toCalendarMonth(3),
    };

    const dummyPregnancies: PregnancyAction[] = [
      {
        pregnancyId: toPregnancyId("PREG-1"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(9),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        positiveTestSimulationMonth: toSimulationMonth(9),
        calculatedDeliverySimulationMonth: toSimulationMonth(17), // May 2027 (Month 5 of 2027)
        motherPostBirthPartTimeHours: toWorkingHours(24),
        motherPostBirthPartTimeClass5Net: toNetSalary(1751),
        motherPostBirthPartTimeClass3Net: toNetSalary(2295),
        fatherPartnerMonthsCount: toMonthDuration(4),
      },
    ];

    it("Scenario B: Enhances tax return refund after child birth via Günstigerprüfung", () => {
      const result = runScenarioBatches({
        scenarioKey: ScenarioId.B,
        preexisting: basePreexisting,
        pregnancies: dummyPregnancies,
        taxClassSwitches: [],
        salaryRaises: [],
      });

      // No-child year has no variance or fixed deduction refund.
      const m15 = result.months[14];
      assert.equal(m15.month, 15);
      assert.equal(m15.taxRefund, 0);

      // Month 27 (March 2028) -> Reconciles Tax Year 2027 (Child 1 born in May 2027 -> 8 months prorated Günstigerprüfung bonus of +354 €)
      const m27 = result.months[26];
      assert.equal(m27.month, 27);
      // Independently checked §32a 2026 arithmetic on the current model's
      // BMF annual payroll bases 67354 + 35461 (see payroll2026.json):
      // the legacy monthly conversion gives 102814.92; a 6504 allowance saves 2278;
      // minus 2072 Kindergeld = 206. No fixed deduction refund is added.
      assert.equal(m27.taxRefund, 206);

      const taxEventM27 = m27.specialEvents.find(
        (e) => e.type === SpecialEventType.TaxReturn,
      );
      assert.ok(taxEventM27, "Tax return event must be present in month 27");
      assert.ok(
        taxEventM27.description.includes("Günstigerprüfung"),
        "Description must cite Günstigerprüfung",
      );

      // Month 39 (March 2029) -> Reconciles Tax Year 2028 (Full 12 months with Child 1 -> Full Günstigerprüfung bonus!)
      const m39 = result.months[38];
      assert.equal(m39.month, 39);
      // BMF annual bases 67354 + 27480; monthly legacy conversion gives 94833.96.
      // A 9756 legacy allowance saves 3256;
      // minus 3108 Kindergeld = 148. Child allowance and actual refund are fixed later.
      assert.equal(m39.taxRefund, 148);

      const taxEventM39 = m39.specialEvents.find(
        (e) => e.type === SpecialEventType.TaxReturn,
      );
      assert.ok(taxEventM39, "Tax return event must be present in month 39");
      assert.ok(taxEventM39.title.includes("Child Allowance Bonus"));
      assert.ok(
        taxEventM39.description.includes("Günstigerprüfung"),
        "Description must cite Günstigerprüfung",
      );
    });
  });
});

it("selects published child values for the assessment year without assuming the latest year", () => {
  // 2025 §32a: 2×(floor(.42×80000 -10911.92) -floor(.42×75200 -10911.92))=4032.
  // Published allowance9600, Kindergeld255×12=3060; excess972.
  const child = { childIndex: toChildIndex(1),
    birthCalendarYear: toFullCalendarYear(2024),
    birthCalendarMonth: toCalendarMonth(1) };
  const result = computeKinderfreibetragGuenstigerpruefung(160000, [child], 2025);
  assert.equal(result.totalKinderfreibetrag, 9600);
  assert.equal(result.totalKindergeldReceived, 3060);
  assert.equal(result.taxSavingsFromAllowance, 4032);
  assert.equal(result.extraTaxRefund, 972);
  assert.throws(() => computeKinderfreibetragGuenstigerpruefung(160000, [child], 2024), /No verified tax rules/);
});

it("compares child relief using each progression-adjusted income-tax liability", () => {
  const child = { childIndex: toChildIndex(1),
    birthCalendarYear: toFullCalendarYear(2025),
    birthCalendarMonth: toCalendarMonth(1) };
  // Independent §32a/§32b arithmetic: hypothetical14418 on80000 gives18.0225% ×60000 ->10813.
  // After9756 allowance: hypothetical11412 on70244 gives16.2462% ×50244 ->8162.
  const result = computeKinderfreibetragGuenstigerpruefung(60000, [child], 2026, undefined, toEuroAmount(20000));
  assert.equal(result.jointTaxWithoutAllowance, 10813);
  assert.equal(result.jointTaxWithAllowance, 8162);
  assert.equal(result.taxSavingsFromAllowance, 2651);
  assert.equal(result.isKinderfreibetragFavorable, false);
  assert.equal(result.extraTaxRefund, 0);
});
