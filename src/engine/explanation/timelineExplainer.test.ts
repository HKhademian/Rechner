import {
  ledgerRowsFixture,
} from "../../../test/fixture/ledgerRows.ts";
import {
  lifecycleHouseholdTaxableIncome,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  getFieldExplanation,
  getActionFieldExplanation,
  getSpecialEventFieldExplanation,
  getRowExplanation,
  getActionRowExplanation,
  getSpecialEventRowExplanation,
} from "#engine/explanation/timelineExplainer";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  type PreexistingConditions,
  type PregnancyAction,
  type ActionRowItem,
  type SpecialEventItem,
  TaxClass,
  ScenarioId,
  ActionType,
  ActionCategory,
  SpecialEventType,
  SpecialEventCategory,
  FieldColumnKey,
  ExplanationFieldKey,
  ExplainerRowType,
  CliOutputFormat,
  toFieldColumnKey,
  toExplanationFieldKey,
  toExplainerRowType,
  toCliOutputFormat,
  toNetSalary,
  toEuroAmount,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toCalendarYear,
  toFullCalendarYear,
  toCalendarLabel,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toMonthId,
  toMonthRef,
  toPregnancyId,
  toActionId,
  toEventId,
  toStatutoryCitation,
} from "#engine/types";

describe("Timeline Explanation Engine (Field-Level & Full-Row Audits)", () => {
  const basePreexisting: PreexistingConditions = {
    // Explicit unverified assessment-net estimates for lifecycle tests.
    assumeManualNetIsAssessmentNet: true,
    householdTaxableIncome: lifecycleHouseholdTaxableIncome,
    startCalendarYear: toFullCalendarYear(2026),
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: toMonthDuration(60),
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(2895),
    husbandInitialClass5Net: toNetSalary(2191),
    husbandWeeklyHours: toWorkingHours(32),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1975),
    wifeInitialClass3FullTimeNet: toNetSalary(2603),
    wifeInitialPartTimeClass5Net: toNetSalary(1328),
    wifeInitialPartTimeClass3Net: toNetSalary(1648),
    wifeWeeklyHours: toWorkingHours(40),
    existingChildrenCount: toChildrenCount(0),
    kindergeldPerChild: toEuroAmount(250),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(6),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3),
  };

  const preg: PregnancyAction = {
    pregnancyId: toPregnancyId("PREG-1"),
    childIndex: toChildIndex(1),
    positiveTestCalendarMonth: toCalendarMonth(4),
    positiveTestCalendarYear: toFullCalendarYear(2026),
    positiveTestSimulationMonth: toSimulationMonth(4),
    calculatedDeliverySimulationMonth: toSimulationMonth(12),
    motherPostBirthPartTimeHours: toWorkingHours(24),
    motherPostBirthPartTimeClass5Net: toNetSalary(1328),
    motherPostBirthPartTimeClass3Net: toNetSalary(1648),
    fatherPartnerMonthsCount: toMonthDuration(4),
  };

  const simC = runScenarioBatches({
    scenarioKey: ScenarioId.C,
    preexisting: basePreexisting,
    pregnancies: [preg],
    taxClassSwitches: [],
    salaryRaises: [],
    financialEvents: [],
  });

  const simB = runScenarioBatches({
    scenarioKey: ScenarioId.B,
    preexisting: basePreexisting,
    pregnancies: [preg],
    taxClassSwitches: [],
    salaryRaises: [],
    financialEvents: [],
  });

  describe("Const Enums & Type Constructors (Rules 10, 11, 12)", () => {
    it("validates and constructs FieldColumnKey values", () => {
      assert.equal(toFieldColumnKey("month"), FieldColumnKey.Month);
      assert.equal(
        toFieldColumnKey("wifeElterngeld"),
        FieldColumnKey.WifeElterngeld,
      );
      assert.throws(
        () => toFieldColumnKey("invalid_column"),
        /Invalid FieldColumnKey/,
      );
    });

    it("validates and constructs ExplanationFieldKey values", () => {
      assert.equal(toExplanationFieldKey("title"), ExplanationFieldKey.Title);
      assert.equal(toExplanationFieldKey("amount"), ExplanationFieldKey.Amount);
      assert.throws(
        () => toExplanationFieldKey("invalid_field"),
        /Invalid ExplanationFieldKey/,
      );
    });

    it("validates and constructs ExplainerRowType values", () => {
      assert.equal(toExplainerRowType("MONTH"), ExplainerRowType.Month);
      assert.equal(toExplainerRowType("ACTION"), ExplainerRowType.Action);
      assert.equal(
        toExplainerRowType("SPECIAL_EVENT"),
        ExplainerRowType.SpecialEvent,
      );
      assert.throws(
        () => toExplainerRowType("invalid_row_type"),
        /Invalid ExplainerRowType/,
      );
    });

    it("validates and constructs CliOutputFormat values", () => {
      assert.equal(toCliOutputFormat("table"), CliOutputFormat.Table);
      assert.equal(toCliOutputFormat("JSON"), CliOutputFormat.Json);
      assert.throws(
        () => toCliOutputFormat("invalid_format"),
        /Invalid CliOutputFormat/,
      );
    });
  });

  describe("getFieldExplanation - All 12 Column Keys", () => {
    const allKeys: FieldColumnKey[] = [
      FieldColumnKey.Month,
      FieldColumnKey.Phase,
      FieldColumnKey.TaxClass,
      FieldColumnKey.HusbandSalary,
      FieldColumnKey.WifeSalary,
      FieldColumnKey.Mutterschutz,
      FieldColumnKey.WifeElterngeld,
      FieldColumnKey.HusbandElterngeld,
      FieldColumnKey.Kindergeld,
      FieldColumnKey.SpecialEvents,
      FieldColumnKey.NetInflow,
      FieldColumnKey.CumulativeTotal,
    ];

    it("generates valid explanations with formulas and citations for every column key in month 14 (ElterngeldPlus)", () => {
      const m14C = simC.months[13];
      const m14B = simB.months[13];

      for (const key of allKeys) {
        const exp = getFieldExplanation(key, m14C, m14B, ScenarioId.C);
        assert.ok(exp.fieldTitle, `fieldTitle must exist for ${key}`);
        assert.ok(exp.valueFormatted, `valueFormatted must exist for ${key}`);
        assert.ok(
          exp.explanation.length > 10,
          `explanation must be detailed for ${key}`,
        );
        assert.ok(exp.legalCitation, `legalCitation must exist for ${key}`);
      }
    });

    it("provides exact mathematical formula and step-by-step calculation for ElterngeldPlus column", () => {
      const m14C = simC.months[13];
      const exp = getFieldExplanation(
        FieldColumnKey.WifeElterngeld,
        m14C,
        undefined,
        ScenarioId.C,
      );
      assert.equal(exp.valueFormatted, "621\u00a0€");
      assert.ok(exp.derivationFormula?.includes(" - "));
      assert.ok(exp.explanation.includes("frozen pre-birth standardized net"));
      assert.ok(exp.contributingFactors && exp.contributingFactors.length >= 3);
      assert.ok(
        exp.contributingFactors.some((f) =>
          f.name.includes("claim cohorts")),
      );
      assert.ok(
        exp.contributingFactors.some((f) =>
          f.name.includes("Entitlement before overlap credits")),
      );
      assert.ok(exp.calculationSteps && exp.calculationSteps.length >= 2);
      assert.equal(exp.calculationSteps[0].stepNumber, 1);
      assert.ok(exp.calculationSteps[1].formula.includes("-"));
    });

    it("provides contributing factors and calculation steps for Father Partner Months (+150 €)", () => {
      const m14C = simC.months[13];
      const exp = getFieldExplanation(
        FieldColumnKey.HusbandElterngeld,
        m14C,
        undefined,
        ScenarioId.C,
      );
      assert.equal(exp.valueFormatted, "150\u00a0€");
      assert.ok(exp.contributingFactors && exp.contributingFactors.length >= 3);
      assert.ok(
        exp.contributingFactors.some((f) =>
          f.name.includes("claim cohorts")),
      );
      assert.ok(
        exp.contributingFactors.some((f) =>
          f.name.includes("Entitlement before overlap credits")),
      );
      assert.ok(exp.calculationSteps && exp.calculationSteps.length >= 2);
      assert.ok(exp.calculationSteps[1].formula.includes(" - "));
    });

    it("provides exact mathematical formula and steps for Mutterschutz column during protection window", () => {
      const m12C = simC.months[11]; // Delivery month
      const exp = getFieldExplanation(
        FieldColumnKey.Mutterschutz,
        m12C,
        undefined,
        ScenarioId.C,
      );
      assert.ok(m12C.mutterschutz > 0);
      assert.ok(exp.derivationFormula?.includes("Average regular cash wages"));
      assert.ok(exp.legalCitation?.includes("MuSchG"));
      assert.ok(exp.contributingFactors && exp.contributingFactors.length >= 3);
      assert.ok(exp.calculationSteps && exp.calculationSteps.length >= 2);
    });

    it("provides contributing factors and calculation steps for Net Inflow and Cumulative Total", () => {
      const m14C = simC.months[13];
      const m14B = simB.months[13];
      const netExp = getFieldExplanation(
        FieldColumnKey.NetInflow,
        m14C,
        m14B,
        ScenarioId.C,
      );
      assert.ok(
        netExp.contributingFactors && netExp.contributingFactors.length >= 4,
      );
      assert.ok(netExp.calculationSteps && netExp.calculationSteps.length >= 3);

      const cumExp = getFieldExplanation(
        FieldColumnKey.CumulativeTotal,
        m14C,
        m14B,
        ScenarioId.C,
      );
      assert.ok(
        cumExp.contributingFactors && cumExp.contributingFactors.length >= 2,
      );
      assert.ok(cumExp.calculationSteps && cumExp.calculationSteps.length >= 2);
    });
  });

  describe("getActionFieldExplanation & getActionRowExplanation", () => {
    it("generates valid explanations for pregnancy positive action row", () => {
      const act: ActionRowItem = {
        actionId: toActionId("ACT-PREG-1"),
        monthId: toMonthId(4, 2026),
        month: toSimulationMonth(4),
        calendarLabel: toCalendarLabel(4, 2026),
        relativeBirthLabel: toMonthRef("M0"),
        title: "ACTION: Positive Pregnancy Test (Child 1)",
        category: ActionCategory.Pregnancy,
        type: ActionType.PregnancyPositive,
        description: "Positive pregnancy test logged.",
      };

      const m4 = simC.months[3];
      const fieldExp = getActionFieldExplanation(
        ExplanationFieldKey.Title,
        act,
        m4,
      );
      assert.ok(fieldExp.fieldTitle.includes("Positive Pregnancy Test"));
      assert.ok(fieldExp.explanation.includes("preconditions"));

      const rowExp = getActionRowExplanation(act, m4, ScenarioId.C);
      assert.equal(rowExp.rowType, ExplainerRowType.Action);
      assert.ok(rowExp.title.includes("Positive Pregnancy Test"));
      assert.ok(rowExp.legalRuleKey);
    });

    it("generates valid explanations for tax class switch action row", () => {
      const act: ActionRowItem = {
        actionId: toActionId("ACT-SWAP-1"),
        monthId: toMonthId(4, 2026),
        month: toSimulationMonth(4),
        calendarLabel: toCalendarLabel(4, 2026),
        relativeBirthLabel: toMonthRef("M0"),
        title: "ACTION: Tax Class Switch (III / V Swap)",
        category: ActionCategory.TaxSwitch,
        type: ActionType.TaxClassSwitchEffective,
        description: "Prenatal spousal tax class optimization switch.",
        taxClassLabel: "III (Wife) / V (Husband)",
      };

      const m4 = simC.months[3];
      const fieldExp = getActionFieldExplanation(
        ExplanationFieldKey.TaxClass,
        act,
        m4,
      );
      assert.equal(fieldExp.valueFormatted, "III (Wife) / V (Husband)");
      assert.ok(fieldExp.legalCitation?.includes("EStG § 38b"));

      const rowExp = getActionRowExplanation(act, m4, ScenarioId.C);
      assert.equal(rowExp.taxClasses, "III (Wife) / V (Husband)");
      assert.ok(rowExp.legalCitation?.includes("BEEG § 2c(3)"));
    });
  });

  describe("getSpecialEventFieldExplanation & getSpecialEventRowExplanation (Tax Return Comprehensive Audit)", () => {
    it("explains stored annual tax credits and liability without parsing descriptive numbers", () => {
      const ev: SpecialEventItem = {
        eventId: toEventId("EV-TAX-REFUND-1"),
        monthId: toMonthId(3, 2027),
        type: SpecialEventType.TaxReturn,
        category: SpecialEventCategory.TaxOffice,
        statutory: toStatutoryCitation(
          "§ 26b & § 31 EStG (*Günstigerprüfung*)",
        ),
        taxClassLabel: "Joint Assessment (*Splitting*)",
        description:
          "Full refund of Tax Class V wage withholding deficit (+2.200 €) plus statutory deductions return (+850 €) plus § 31 EStG Kinderfreibetrag Günstigerprüfung bonus (+104 € over Kindergeld) for Tax Year 2026",
        amount: toEuroAmount(4569),
        taxSettlement: { calendarYear: toFullCalendarYear(2026),
          settlement: toEuroAmount(4569),
          creditedIncomeTax: toEuroAmount(9389),
          creditedSolidarity: toEuroAmount(0),
          totalLiability: toEuroAmount(4820) },
        month: toSimulationMonth(15),
        year: toCalendarYear(2),
        calendarYearNum: toFullCalendarYear(2027),
        calendarMonthNum: toCalendarMonth(3),
        calendarLabel: toCalendarLabel(3, 2027),
        relativeBirthLabel: toMonthRef(3),
        title: "Annual Tax Return (Tax Year 2026)",
      };

      const m15 = simC.months[14];
      const fieldExp = getSpecialEventFieldExplanation(
        ExplanationFieldKey.Amount,
        ev,
        m15,
        50000,
        3154,
      );

      assert.equal(fieldExp.valueFormatted, "4.569,00\u00a0€");
      assert.ok(fieldExp.fieldTitle.includes("Tax Settlement"));
      assert.ok(fieldExp.explanation.includes("Einkommensteuererklärung"));
      assert.ok(
        fieldExp.contributingFactors &&
          fieldExp.contributingFactors.length >= 3,
      );
      assert.ok(
        fieldExp.calculationSteps && fieldExp.calculationSteps.length === 2,
      );

      assert.equal(fieldExp.calculationSteps[0].result, "9.389,00\u00a0€");
      assert.equal(fieldExp.calculationSteps[1].result, "4.569,00\u00a0€");
      assert.ok(fieldExp.calculationSteps[1].formula.includes("4.820,00"));

      assert.ok(fieldExp.legalCitation?.includes("EStG § 26b"));
      assert.ok(fieldExp.legalCitation?.includes("§ 31"));
      const combined = getFieldExplanation(FieldColumnKey.SpecialEvents, { ...m15,
        specialEvents: [ev, { ...ev,
          eventId: toEventId("EXTRA-PAYMENT"),
          type: SpecialEventType.Bonus40,
          taxSettlement: undefined,
          amount: toEuroAmount(100.25) }],
        specialEventsTotal: toEuroAmount(4669.25) }, undefined, ScenarioId.C);
      assert.equal(combined.valueFormatted, "4.669,25\u00a0€");
      assert.equal(combined.calculationSteps?.at(-1)?.result, "4.669,25\u00a0€");
    });

    it("itemizes a repayment and keeps legacy unaudited tax cash explicit", () => {
      const ev: SpecialEventItem = {
        eventId: toEventId("EV-TAX-REFUND-1"),
        monthId: toMonthId(3, 2027),
        type: SpecialEventType.TaxReturn,
        category: SpecialEventCategory.TaxOffice,
        title: "Annual Tax Return (Tax Year 2026)",
        description:
          "Full refund of Tax Class V wage withholding deficit (+1.100 €) plus statutory deductions return (+850 €) for Tax Year 2026",
        amount: toEuroAmount(-560),
        taxSettlement: { calendarYear: toFullCalendarYear(2026),
          settlement: toEuroAmount(-560),
          creditedIncomeTax: toEuroAmount(4000),
          creditedSolidarity: toEuroAmount(0),
          totalLiability: toEuroAmount(4560) },
        taxClassLabel: "Joint Assessment (*Splitting*)",
        month: toSimulationMonth(15),
        year: toCalendarYear(2),
        calendarYearNum: toFullCalendarYear(2027),
        calendarMonthNum: toCalendarMonth(3),
        calendarLabel: toCalendarLabel(3, 2027),
        relativeBirthLabel: toMonthRef(3),
        statutory: toStatutoryCitation("§ 26b EStG"),
      };

      const m15 = simC.months[14];
      const rowExp = getSpecialEventRowExplanation(
        ev,
        m15,
        undefined,
        50000,
        ScenarioId.C,
      );
      assert.equal(rowExp.rowType, ExplainerRowType.SpecialEvent);
      assert.equal(rowExp.totalNetInflow, -560);
      assert.equal(rowExp.cumulatedTotal, 49440);
      assert.deepEqual(rowExp.streams.map((stream) => stream.value), [4000, 0, -4560]);
      assert.equal(rowExp.streams.reduce((sum, stream) => sum + stream.value, 0), -560);
      const legacy = getSpecialEventRowExplanation({ ...ev,
        taxSettlement: undefined }, m15, undefined, 50000, ScenarioId.C);
      assert.equal(legacy.streams.length, 1);
      assert.equal(legacy.streams[0].value, -560);
      assert.match(legacy.summaryDescription, /No assessment credits/);
      assert.ok(rowExp.legalCitation?.includes("EStG § 26b"));
    });

    it("does not invent a tax event when a manual-net scenario lacks an annual assessment", () => {
      const m15 = simC.months[14];
      const exp = getFieldExplanation(FieldColumnKey.SpecialEvents, m15, undefined, ScenarioId.C);
      assert.equal(m15.taxRefund, 0);
      assert.equal(m15.specialEvents.some((event) => event.type === SpecialEventType.TaxReturn), false);
      assert.equal(exp.fieldTitle, "Special Payments, Bonuses & Fiscal Events");
    });
  });

  describe("getRowExplanation - Full Monthly Audit", () => {
    it("generates itemized streams, totals, and variance for standard month", () => {
      const m14C = simC.months[13];
      const m14B = simB.months[13];

      const rowExp = getRowExplanation(m14C, m14B, ScenarioId.C);
      assert.equal(rowExp.rowType, ExplainerRowType.Month);
      assert.ok(
        rowExp.streams.length >= 4,
        "Must include multiple income streams",
      );
      assert.ok(rowExp.totalNetInflow > 0);
      assert.ok(rowExp.cumulatedTotal > 0);
      assert.ok(
        rowExp.diffVsBFormatted?.includes("+") ||
          rowExp.diffVsBFormatted === "0 €",
      );
      assert.ok(rowExp.summaryDescription.includes("Month 14"));
    });
  });
});


it("drills into a later same-title event using its stable ID and actual progressive balance", () => {
  const month = ledgerRowsFixture().months[1];
  const baseline = ledgerRowsFixture(90).months[1];
  const explanation = getSpecialEventRowExplanation(month.specialEvents[1], month, baseline, 999999);
  assert.equal(explanation.totalNetInflow, -50);
  assert.equal(explanation.cumulatedTotal, 1050);
  assert.equal(explanation.diffVsB, 0);
});


it("explains the configured Kindergeld rate and zero children without inventing a count", () => {
  const month = ledgerRowsFixture().months[0];
  const zero = getFieldExplanation(FieldColumnKey.Kindergeld, month, undefined, ScenarioId.A);
  assert.ok(zero.derivationFormula?.startsWith("0 Child(ren)"));
  assert.equal(zero.contributingFactors?.[1].value, "259 € / month");
  const two = getFieldExplanation(FieldColumnKey.Kindergeld, { ...month,
    kindergeld: toEuroAmount(518),
    kindergeldDetails: { ...month.kindergeldDetails!,
      children: toChildrenCount(2) } }, undefined, ScenarioId.C);
  assert.ok(two.derivationFormula?.startsWith("2 Child(ren)"));
  assert.equal(two.valueFormatted, "518 €");
  const legacy = getFieldExplanation(FieldColumnKey.Kindergeld, { ...month,
    kindergeldDetails: undefined }, undefined, ScenarioId.A);
  assert.equal(legacy.contributingFactors?.length, 0);
});
