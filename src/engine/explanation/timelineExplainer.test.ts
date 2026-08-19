import {
  describe, it, 
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
      assert.equal(exp.valueFormatted, "829\u00a0€");
      assert.ok(exp.derivationFormula?.includes("65%"));
      assert.ok(exp.explanation.includes("Class III"));
      assert.ok(exp.contributingFactors && exp.contributingFactors.length >= 4);
      assert.ok(
        exp.contributingFactors.some((f) =>
          f.name.includes("Pre-Birth Assessment Net")),
      );
      assert.ok(
        exp.contributingFactors.some((f) =>
          f.name.includes("Statutory Replacement Rate")),
      );
      assert.ok(exp.calculationSteps && exp.calculationSteps.length >= 3);
      assert.equal(exp.calculationSteps[0].stepNumber, 1);
      assert.ok(exp.calculationSteps[0].formula.includes("-"));
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
          f.name.includes("Father Post-Birth Hours")),
      );
      assert.ok(
        exp.contributingFactors.some((f) =>
          f.name.includes("Statutory Minimum Allowance Floor")),
      );
      assert.ok(exp.calculationSteps && exp.calculationSteps.length >= 2);
      assert.ok(exp.calculationSteps[1].formula.includes("Max(150"));
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
      assert.ok(exp.derivationFormula?.includes("100% Net"));
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
      assert.ok(rowExp.legalCitation?.includes("BFH VI R 2/13"));
    });
  });

  describe("getSpecialEventFieldExplanation & getSpecialEventRowExplanation (Tax Return Comprehensive Audit)", () => {
    it("generates complete 4-step calculation and itemized contributing factors for Tax Return field explanation", () => {
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
        amount: toEuroAmount(3154),
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

      assert.equal(fieldExp.valueFormatted, "3.154\u00a0€");
      assert.ok(fieldExp.fieldTitle.includes("Tax Return Refund"));
      assert.ok(fieldExp.explanation.includes("Einkommensteuererklärung"));
      assert.ok(
        fieldExp.contributingFactors &&
          fieldExp.contributingFactors.length >= 3,
      );
      assert.ok(
        fieldExp.calculationSteps && fieldExp.calculationSteps.length === 4,
      );

      assert.equal(fieldExp.calculationSteps[0].stepNumber, 1);
      assert.equal(fieldExp.calculationSteps[0].result, "+2.200 €");
      assert.equal(fieldExp.calculationSteps[1].stepNumber, 2);
      assert.equal(fieldExp.calculationSteps[1].result, "+850 €");
      assert.equal(fieldExp.calculationSteps[2].stepNumber, 3);
      assert.equal(fieldExp.calculationSteps[2].result, "+104 €");
      assert.equal(fieldExp.calculationSteps[3].stepNumber, 4);
      assert.equal(fieldExp.calculationSteps[3].result, "3.154\u00a0€");

      assert.ok(fieldExp.legalCitation?.includes("EStG § 26b"));
      assert.ok(fieldExp.legalCitation?.includes("§ 31"));
    });

    it("generates itemized streams and statutory breakdown for Tax Return row explanation", () => {
      const ev: SpecialEventItem = {
        eventId: toEventId("EV-TAX-REFUND-1"),
        monthId: toMonthId(3, 2027),
        type: SpecialEventType.TaxReturn,
        category: SpecialEventCategory.TaxOffice,
        title: "Annual Tax Return (Tax Year 2026)",
        description:
          "Full refund of Tax Class V wage withholding deficit (+1.100 €) plus statutory deductions return (+850 €) for Tax Year 2026",
        amount: toEuroAmount(1950),
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
      assert.equal(rowExp.totalNetInflow, 1950);
      assert.ok(rowExp.streams.length >= 2);
      assert.equal(
        rowExp.streams[0].label,
        "Wage Tax Swap Recovery (Class V Reconciliation)",
      );
      assert.equal(rowExp.streams[0].value, 1100);
      assert.equal(
        rowExp.streams[1].label,
        "Statutory Base Deductions & Werbungskosten Return",
      );
      assert.equal(rowExp.streams[1].value, 850);
      assert.ok(rowExp.legalCitation?.includes("EStG § 26b"));
    });

    it("generates complete Tax Return explanation when getFieldExplanation is called on SpecialEvents column in refund month", () => {
      const m15 = simC.months[14];
      const exp = getFieldExplanation(
        FieldColumnKey.SpecialEvents,
        m15,
        undefined,
        ScenarioId.C,
      );
      assert.ok(exp.fieldTitle.includes("Annual Tax Return"));
      assert.ok(exp.contributingFactors && exp.contributingFactors.length >= 5);
      assert.ok(exp.calculationSteps && exp.calculationSteps.length === 4);
      assert.ok(exp.explanation.includes("Einkommensteuererklärung"));
      assert.ok(exp.legalCitation?.includes("EStG § 26b"));
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
