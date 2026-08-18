import {
  describe, it, 
} from "node:test";
import assert from "node:assert/strict";
import {
  toSimulationMonth,
  toCalendarYear,
  toFullCalendarYear,
  toCalendarMonth,
  toMonthId,
  toWorkingHours,
  toEuroAmount,
  toEuroCents,
  toGrossSalary,
  toNetSalary,
  toKinderfreibetragAnnualAmount,
  toStatutoryCitation,
  toTransactionId,
  toEventId,
  toActionId,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toHoursChangeId,
  toFinancialEventId,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPercentageRate,
  toTaxFactor,
  toTaxClass,
  toScenarioId,
  toActiveScenarioView,
  toTimelineChartMode,
  toTimelineTimeRangeFilter,
  toActionCategory,
  toActionType,
  toTargetPerson,
  toFinancialEventCategory,
  isEuroAmount,
  isGrossSalary,
  isNetSalary,
  isTaxFactor,
  isActionId,
  isPregnancyId,
  isSwitchId,
  isRaiseId,
  isFinancialEventId,
  isMonthId,
  isMonthRef,
  isMonthSimRef,
  toMonthRef,
  toMonthSimRef,
  TaxClass,
  ScenarioId,
  ActiveScenarioView,
  TimelineChartMode,
  TimelineTimeRangeFilter,
  TransactionType,
  TransactionDirection,
  SpecialEventType,
  SpecialEventCategory,
  ActionCategory,
  ActionType,
  FinancialEventCategory,
  TargetPerson,
  type SimulationMonth,
  type CalendarYear,
  type FullCalendarYear,
  type CalendarMonth,
  type MonthDuration,
  type ChildrenCount,
  type ChildIndex,
  type PercentageRate,
  type MonthId,
  type WorkingHours,
  type EuroAmount,
  type EuroCents,
  type GrossSalary,
  type NetSalary,
  type StatutoryCitation,
  type TransactionId,
  type EventId,
  type ActionId,
  type PregnancyId,
  type SwitchId,
  type RaiseId,
  type FinancialEventId,
  type EntityId,
  type KinderfreibetragAnnualAmount,
} from "#engine/types";

describe("Strongly-Typed Domain Types & Constructors", () => {
  // =========================================================================
  // SECTION 1: ONE-BY-ONE FEATURE UNIT TESTS
  // =========================================================================

  describe("SimulationMonth (Feature Test)", () => {
    it("accepts valid simulation months between 1 and 120", () => {
      const m1: SimulationMonth = toSimulationMonth(1);
      const m60: SimulationMonth = toSimulationMonth(60);
      const m120: SimulationMonth = toSimulationMonth(120);

      assert.equal(m1, 1);
      assert.equal(m60, 60);
      assert.equal(m120, 120);
    });

    it("rejects out-of-bound or non-integer months", () => {
      assert.throws(() => toSimulationMonth(0), TypeError);
      assert.throws(() => toSimulationMonth(-5), TypeError);
      assert.throws(() => toSimulationMonth(121), TypeError);
      assert.throws(() => toSimulationMonth(3.5), TypeError);
      assert.throws(() => toSimulationMonth(NaN), TypeError);
    });
  });

  describe("CalendarYear (Feature Test)", () => {
    it("accepts valid calendar years 1 to 10", () => {
      const y1: CalendarYear = toCalendarYear(1);
      const y5: CalendarYear = toCalendarYear(5);
      const y10: CalendarYear = toCalendarYear(10);

      assert.equal(y1, 1);
      assert.equal(y5, 5);
      assert.equal(y10, 10);
    });

    it("rejects invalid calendar years", () => {
      assert.throws(() => toCalendarYear(0), TypeError);
      assert.throws(() => toCalendarYear(11), TypeError);
      assert.throws(() => toCalendarYear(2.5), TypeError);
      assert.throws(() => toCalendarYear(Infinity), TypeError);
    });
  });

  describe("FullCalendarYear (Feature Test)", () => {
    it("accepts valid 4-digit Gregorian calendar years between 1900 and 2100", () => {
      const y2025: FullCalendarYear = toFullCalendarYear(2025);
      const y2026: FullCalendarYear = toFullCalendarYear(2026);
      const y2030: FullCalendarYear = toFullCalendarYear("2030");
      const y1900: FullCalendarYear = toFullCalendarYear(1900);
      const y2100: FullCalendarYear = toFullCalendarYear(2100);

      assert.equal(y2025, 2025);
      assert.equal(y2026, 2026);
      assert.equal(y2030, 2030);
      assert.equal(y1900, 1900);
      assert.equal(y2100, 2100);
    });

    it("rejects invalid or out-of-bounds calendar years (e.g. 901, 0, negative, non-integer)", () => {
      assert.throws(() => toFullCalendarYear(901), TypeError);
      assert.throws(() => toFullCalendarYear(0), TypeError);
      assert.throws(() => toFullCalendarYear(-2025), TypeError);
      assert.throws(() => toFullCalendarYear(1899), TypeError);
      assert.throws(() => toFullCalendarYear(2150), TypeError);
      assert.throws(() => toFullCalendarYear(2025.5), TypeError);
      assert.throws(() => toFullCalendarYear(NaN), TypeError);
      assert.throws(() => toFullCalendarYear(Infinity), TypeError);
      assert.throws(() => toFullCalendarYear("invalid"), TypeError);
    });
  });

  describe("CalendarMonth (Feature Test)", () => {
    it("accepts valid calendar months 1 to 12", () => {
      for (let m = 1; m <= 12; m++) {
        const cm: CalendarMonth = toCalendarMonth(m);
        assert.equal(cm, m);
      }
    });

    it("rejects invalid calendar months", () => {
      assert.throws(() => toCalendarMonth(0), TypeError);
      assert.throws(() => toCalendarMonth(13), TypeError);
      assert.throws(() => toCalendarMonth(-1), TypeError);
      assert.throws(() => toCalendarMonth(6.2), TypeError);
    });
  });

  describe("MonthDuration (Feature Test)", () => {
    it("accepts valid month durations between 0 and 120, including fractional durations", () => {
      const d0: MonthDuration = toMonthDuration(0);
      const d1_5: MonthDuration = toMonthDuration(1.5);
      const d8: MonthDuration = toMonthDuration(8);
      const d27: MonthDuration = toMonthDuration("27");
      const d60: MonthDuration = toMonthDuration(60);
      const d120: MonthDuration = toMonthDuration(120);

      assert.equal(d0, 0);
      assert.equal(d1_5, 1.5);
      assert.equal(d8, 8);
      assert.equal(d27, 27);
      assert.equal(d60, 60);
      assert.equal(d120, 120);
    });

    it("rejects negative, out-of-bounds, or NaN month durations", () => {
      assert.throws(() => toMonthDuration(-1), TypeError);
      assert.throws(() => toMonthDuration(121), TypeError);
      assert.throws(() => toMonthDuration(NaN), TypeError);
      assert.throws(() => toMonthDuration("invalid"), TypeError);
    });
  });

  describe("ChildrenCount (Feature Test)", () => {
    it("accepts valid children counts between 0 and 10", () => {
      const c0: ChildrenCount = toChildrenCount(0);
      const c1: ChildrenCount = toChildrenCount(1);
      const c3: ChildrenCount = toChildrenCount("3");
      const c10: ChildrenCount = toChildrenCount(10);

      assert.equal(c0, 0);
      assert.equal(c1, 1);
      assert.equal(c3, 3);
      assert.equal(c10, 10);
    });

    it("rejects negative, float, or out-of-bounds children counts", () => {
      assert.throws(() => toChildrenCount(-1), TypeError);
      assert.throws(() => toChildrenCount(11), TypeError);
      assert.throws(() => toChildrenCount(1.5), TypeError);
      assert.throws(() => toChildrenCount(NaN), TypeError);
    });
  });

  describe("ChildIndex (Feature Test)", () => {
    it("accepts valid 1-indexed child numbers between 1 and 10", () => {
      const c1: ChildIndex = toChildIndex(1);
      const c2: ChildIndex = toChildIndex("2");
      const c10: ChildIndex = toChildIndex(10);

      assert.equal(c1, 1);
      assert.equal(c2, 2);
      assert.equal(c10, 10);
    });

    it("rejects zero, negative, float, or out-of-bounds child indices", () => {
      assert.throws(() => toChildIndex(0), TypeError);
      assert.throws(() => toChildIndex(-1), TypeError);
      assert.throws(() => toChildIndex(11), TypeError);
      assert.throws(() => toChildIndex(2.5), TypeError);
    });
  });

  describe("PercentageRate (Feature Test)", () => {
    it("accepts valid decimal rates and auto-converts percentages", () => {
      const r1: PercentageRate = toPercentageRate(0.05);
      const r2: PercentageRate = toPercentageRate(0.5);
      const r3: PercentageRate = toPercentageRate(1.0);
      const r4: PercentageRate = toPercentageRate(5); // 5% -> 0.05
      const r5: PercentageRate = toPercentageRate("15"); // 15% -> 0.15

      assert.equal(r1, 0.05);
      assert.equal(r2, 0.5);
      assert.equal(r3, 1.0);
      assert.equal(r4, 0.05);
      assert.equal(r5, 0.15);
    });

    it("rejects negative, out-of-bounds, or NaN percentage rates", () => {
      assert.throws(() => toPercentageRate(-0.1), TypeError);
      assert.throws(() => toPercentageRate(101), TypeError);
      assert.throws(() => toPercentageRate(NaN), TypeError);
      assert.throws(() => toPercentageRate("invalid"), TypeError);
    });
  });

  describe("MonthId (Feature Test)", () => {
    it("constructs valid MonthId from month and year numbers", () => {
      const m1: MonthId = toMonthId(9, 2026);
      const m2: MonthId = toMonthId(1, 2026);
      const m3: MonthId = toMonthId(12, 2030);

      assert.equal(m1, "M09.2026");
      assert.equal(m2, "M01.2026");
      assert.equal(m3, "M12.2030");
      assert.equal(isMonthId(m1), true);
      assert.equal(isMonthId(m2), true);
      assert.equal(isMonthId(m3), true);
    });

    it("constructs and validates MonthId from valid string representation", () => {
      const m: MonthId = toMonthId("M09.2027");
      assert.equal(m, "M09.2027");
      assert.equal(isMonthId("M09.2027"), true);
      assert.equal(isMonthId("M01.2026"), true);
      assert.equal(isMonthId("M12.2030"), true);
    });

    it("rejects invalid month numbers or invalid string formats", () => {
      assert.throws(() => toMonthId(0, 2026), TypeError);
      assert.throws(() => toMonthId(13, 2026), TypeError);
      assert.throws(() => toMonthId(9, 1800), TypeError);
      assert.throws(() => toMonthId(9, 2500), TypeError);
      assert.throws(() => toMonthId("M92026"), TypeError);
      assert.throws(() => toMonthId("M002026"), TypeError);
      assert.throws(() => toMonthId("invalid"), TypeError);
      assert.equal(isMonthId("invalid"), false);
      assert.equal(isMonthId(123), false);
      assert.equal(isMonthId(null), false);
    });
  });

  describe("WorkingHours (Feature Test)", () => {
    it("accepts valid working hours 0 to 60", () => {
      const h0: WorkingHours = toWorkingHours(0);
      const h24: WorkingHours = toWorkingHours(24);
      const h32: WorkingHours = toWorkingHours(32);
      const h40: WorkingHours = toWorkingHours(40);
      const h60: WorkingHours = toWorkingHours(60);

      assert.equal(h0, 0);
      assert.equal(h24, 24);
      assert.equal(h32, 32);
      assert.equal(h40, 40);
      assert.equal(h60, 60);
    });

    it("rejects invalid working hours", () => {
      assert.throws(() => toWorkingHours(-1), TypeError);
      assert.throws(() => toWorkingHours(61), TypeError);
      assert.throws(() => toWorkingHours(NaN), TypeError);
    });
  });

  describe("EuroAmount and EuroCents (Feature Test)", () => {
    it("rounds and brands EuroAmount properly", () => {
      const a1: EuroAmount = toEuroAmount(100.4);
      const a2: EuroAmount = toEuroAmount(100.6);
      const a3: EuroAmount = toEuroAmount(-50);

      assert.equal(a1, 100);
      assert.equal(a2, 101);
      assert.equal(a3, -50);
      assert.throws(() => toEuroAmount(NaN), TypeError);
      assert.throws(() => toEuroAmount(Infinity), TypeError);
    });

    it("brands integer EuroCents properly", () => {
      const c1: EuroCents = toEuroCents(10050);
      assert.equal(c1, 10050);
      assert.throws(() => toEuroCents(100.5), TypeError);
      assert.throws(() => toEuroCents(NaN), TypeError);
    });
  });

  describe("GrossSalary and NetSalary (Feature Test)", () => {
    it("brands non-negative gross and net salaries", () => {
      const g: GrossSalary = toGrossSalary(4500);
      const n: NetSalary = toNetSalary(2895);

      assert.equal(g, 4500);
      assert.equal(n, 2895);
    });

    it("rejects negative salaries", () => {
      assert.throws(() => toGrossSalary(-1), TypeError);
      assert.throws(() => toNetSalary(-500), TypeError);
    });
  });

  describe("StatutoryCitation (Feature Test)", () => {
    it("brands valid statutory citation strings", () => {
      const citations = [
        "BEEG § 2b Abs. 1",
        "EStG § 38b",
        "MuSchG § 19",
        "BFH VI R 2/13",
        "§ 31 EStG",
      ];
      for (const c of citations) {
        assert.equal(toStatutoryCitation(c), c);
      }
    });

    it("rejects empty or non-string citations", () => {
      assert.throws(() => toStatutoryCitation(""), TypeError);
    });
  });

  describe("TaxFactor (Feature Test)", () => {
    it("accepts valid tax factors between 0.001 and 1.0", () => {
      const validFactors = [0.001, 0.5, 0.885, 0.905, 1.0];
      for (const f of validFactors) {
        const factor = toTaxFactor(f);
        assert.equal(factor, Math.round(f * 1000) / 1000);
        assert.ok(isTaxFactor(factor));
      }
    });

    it("rejects invalid, negative, 0, or out-of-range tax factors", () => {
      assert.throws(() => toTaxFactor(0), TypeError);
      assert.throws(() => toTaxFactor(-0.5), TypeError);
      assert.throws(() => toTaxFactor(1.001), TypeError);
      assert.throws(() => toTaxFactor(NaN), TypeError);
      assert.throws(() => toTaxFactor(Infinity), TypeError);
    });
  });

  describe("TaxClass (Feature Test)", () => {
    it("TaxClass contains all statutory tax classes I through VI", () => {
      assert.equal(TaxClass.I, "I");
      assert.equal(TaxClass.II, "II");
      assert.equal(TaxClass.III, "III");
      assert.equal(TaxClass.IV, "IV");
      assert.equal(TaxClass.V, "V");
      assert.equal(TaxClass.VI, "VI");
    });

    it("toTaxClass validates known tax classes", () => {
      assert.equal(toTaxClass("I"), TaxClass.I);
      assert.equal(toTaxClass("III"), TaxClass.III);
      assert.equal(toTaxClass("V"), TaxClass.V);
    });

    it("toTaxClass rejects invalid strings", () => {
      assert.throws(() => toTaxClass("VII"), TypeError);
      assert.throws(() => toTaxClass("invalid"), TypeError);
    });
  });

  describe("ScenarioId (Feature Test)", () => {
    it("defines exact scenario members A, B, and C", () => {
      assert.equal(ScenarioId.A, "A");
      assert.equal(ScenarioId.B, "B");
      assert.equal(ScenarioId.C, "C");
    });

    it("toScenarioId validates valid scenario keys", () => {
      assert.equal(toScenarioId("A"), ScenarioId.A);
      assert.equal(toScenarioId("B"), ScenarioId.B);
      assert.equal(toScenarioId("C"), ScenarioId.C);
    });

    it("toScenarioId rejects invalid scenario keys", () => {
      assert.throws(() => toScenarioId("D"), TypeError);
      assert.throws(() => toScenarioId("compare"), TypeError);
      assert.throws(() => toScenarioId(""), TypeError);
    });
  });

  describe("ActiveScenarioView (Feature Test)", () => {
    it("defines individual scenarios and compare overlay mode", () => {
      assert.equal(ActiveScenarioView.A, "A");
      assert.equal(ActiveScenarioView.B, "B");
      assert.equal(ActiveScenarioView.C, "C");
      assert.equal(ActiveScenarioView.Compare, "compare");
    });

    it("toActiveScenarioView accepts scenario members and compare", () => {
      assert.equal(toActiveScenarioView("A"), ActiveScenarioView.A);
      assert.equal(toActiveScenarioView("B"), ActiveScenarioView.B);
      assert.equal(toActiveScenarioView("C"), ActiveScenarioView.C);
      assert.equal(toActiveScenarioView("compare"), ActiveScenarioView.Compare);
    });

    it("toActiveScenarioView rejects invalid views", () => {
      assert.throws(() => toActiveScenarioView("invalid_view"), TypeError);
      assert.throws(() => toActiveScenarioView("D"), TypeError);
    });
  });

  describe("TimelineChartMode (Feature Test)", () => {
    it("defines chart modes stacked_bar, lines, area, and compare", () => {
      assert.equal(TimelineChartMode.StackedBar, "stacked_bar");
      assert.equal(TimelineChartMode.Lines, "lines");
      assert.equal(TimelineChartMode.Area, "area");
      assert.equal(TimelineChartMode.Compare, "compare");
    });

    it("toTimelineChartMode accepts valid chart modes", () => {
      assert.equal(
        toTimelineChartMode("stacked_bar"),
        TimelineChartMode.StackedBar,
      );
      assert.equal(toTimelineChartMode("lines"), TimelineChartMode.Lines);
      assert.equal(toTimelineChartMode("area"), TimelineChartMode.Area);
      assert.equal(toTimelineChartMode("compare"), TimelineChartMode.Compare);
    });

    it("toTimelineChartMode rejects invalid chart modes", () => {
      assert.throws(() => toTimelineChartMode("pie_chart"), TypeError);
      assert.throws(() => toTimelineChartMode(""), TypeError);
    });
  });

  describe("TimelineTimeRangeFilter (Feature Test)", () => {
    it("defines time filters all, child1, child2, and post", () => {
      assert.equal(TimelineTimeRangeFilter.All, "all");
      assert.equal(TimelineTimeRangeFilter.Child1, "child1");
      assert.equal(TimelineTimeRangeFilter.Child2, "child2");
      assert.equal(TimelineTimeRangeFilter.Post, "post");
    });

    it("toTimelineTimeRangeFilter accepts valid time range filters", () => {
      assert.equal(
        toTimelineTimeRangeFilter("all"),
        TimelineTimeRangeFilter.All,
      );
      assert.equal(
        toTimelineTimeRangeFilter("child1"),
        TimelineTimeRangeFilter.Child1,
      );
      assert.equal(
        toTimelineTimeRangeFilter("child2"),
        TimelineTimeRangeFilter.Child2,
      );
      assert.equal(
        toTimelineTimeRangeFilter("post"),
        TimelineTimeRangeFilter.Post,
      );
    });

    it("toTimelineTimeRangeFilter rejects invalid range strings", () => {
      assert.throws(
        () => toTimelineTimeRangeFilter("invalid_range"),
        TypeError,
      );
      assert.throws(() => toTimelineTimeRangeFilter(""), TypeError);
    });
  });

  describe("TransactionType (Feature Test)", () => {
    it("defines all discrete transaction type identifiers", () => {
      assert.equal(TransactionType.SalaryBase, "SALARY_BASE");
      assert.equal(
        TransactionType.SalaryBonus13thVacation,
        "SALARY_BONUS_13TH_VACATION",
      );
      assert.equal(
        TransactionType.SalaryBonus13thChristmas,
        "SALARY_BONUS_13TH_CHRISTMAS",
      );
      assert.equal(TransactionType.BenefitMutterschutz, "BENEFIT_MUTTERSCHUTZ");
      assert.equal(
        TransactionType.BenefitElterngeldPlusMother,
        "BENEFIT_ELTERNGELD_PLUS_MOTHER",
      );
      assert.equal(
        TransactionType.BenefitElterngeldPlusFather,
        "BENEFIT_ELTERNGELD_PLUS_FATHER",
      );
      assert.equal(
        TransactionType.BenefitPartnerschaftsbonus,
        "BENEFIT_PARTNERSCHAFTSBONUS",
      );
      assert.equal(TransactionType.BenefitKindergeld, "BENEFIT_KINDERGELD");
      assert.equal(
        TransactionType.TaxReconciliationRefund,
        "TAX_RECONCILIATION_REFUND",
      );
    });
  });

  describe("TransactionDirection (Feature Test)", () => {
    it("defines inflow and outflow directions", () => {
      assert.equal(TransactionDirection.Inflow, "INFLOW");
      assert.equal(TransactionDirection.Outflow, "OUTFLOW");
    });
  });

  describe("SpecialEventType and SpecialEventCategory (Feature Test)", () => {
    it("defines bonus and tax return special event keys", () => {
      assert.equal(SpecialEventType.Bonus40, "bonus_40");
      assert.equal(SpecialEventType.Bonus60, "bonus_60");
      assert.equal(SpecialEventType.TaxReturn, "tax_return");
    });

    it("defines special event display categories", () => {
      assert.equal(
        SpecialEventCategory.ThirteenthSalary,
        "13th Salary (*13. Monatsgehalt*)",
      );
      assert.equal(SpecialEventCategory.TaxOffice, "Tax Office (*Finanzamt*)");
    });
  });

  describe("ActionCategory (Feature Test)", () => {
    it("defines action categories PREGNANCY, TAX_SWITCH, SALARY_RAISE, WORKING_HOURS", () => {
      assert.equal(ActionCategory.Pregnancy, "PREGNANCY");
      assert.equal(ActionCategory.TaxSwitch, "TAX_SWITCH");
      assert.equal(ActionCategory.SalaryRaise, "SALARY_RAISE");
      assert.equal(ActionCategory.WorkingHours, "WORKING_HOURS");
    });

    it("toActionCategory validates valid categories and rejects invalid strings", () => {
      assert.equal(toActionCategory("PREGNANCY"), ActionCategory.Pregnancy);
      assert.equal(toActionCategory("TAX_SWITCH"), ActionCategory.TaxSwitch);
      assert.equal(
        toActionCategory("SALARY_RAISE"),
        ActionCategory.SalaryRaise,
      );
      assert.equal(
        toActionCategory("WORKING_HOURS"),
        ActionCategory.WorkingHours,
      );
      assert.throws(() => toActionCategory("invalid"), TypeError);
    });
  });

  describe("ActionType (Feature Test)", () => {
    it("defines milestone action type members", () => {
      assert.equal(ActionType.PregnancyPositive, "PREGNANCY_POSITIVE");
      assert.equal(ActionType.ChildDelivery, "CHILD_DELIVERY");
      assert.equal(
        ActionType.TaxClassSwitchEffective,
        "TAX_CLASS_SWITCH_EFFECTIVE",
      );
      assert.equal(ActionType.TaxClassSwitchRevert, "TAX_CLASS_SWITCH_REVERT");
      assert.equal(ActionType.SalaryRaiseEffective, "SALARY_RAISE_EFFECTIVE");
      assert.equal(
        ActionType.WorkingHoursChangeEffective,
        "WORKING_HOURS_CHANGE_EFFECTIVE",
      );
    });

    it("toActionType validates valid action types and rejects invalid strings", () => {
      assert.equal(
        toActionType("PREGNANCY_POSITIVE"),
        ActionType.PregnancyPositive,
      );
      assert.equal(toActionType("CHILD_DELIVERY"), ActionType.ChildDelivery);
      assert.equal(
        toActionType("WORKING_HOURS_CHANGE_EFFECTIVE"),
        ActionType.WorkingHoursChangeEffective,
      );
      assert.throws(() => toActionType("invalid"), TypeError);
    });
  });

  describe("TargetPerson (Feature Test)", () => {
    it("defines BOTH, HUSBAND, and WIFE targets", () => {
      assert.equal(TargetPerson.Both, "BOTH");
      assert.equal(TargetPerson.Husband, "HUSBAND");
      assert.equal(TargetPerson.Wife, "WIFE");
    });

    it("toTargetPerson validates target persons and rejects invalid strings", () => {
      assert.equal(toTargetPerson("BOTH"), TargetPerson.Both);
      assert.equal(toTargetPerson("HUSBAND"), TargetPerson.Husband);
      assert.equal(toTargetPerson("WIFE"), TargetPerson.Wife);
      assert.throws(() => toTargetPerson("other"), TypeError);
    });
  });

  describe("FinancialEventCategory (Feature Test)", () => {
    it("defines financial event categories", () => {
      assert.equal(
        FinancialEventCategory.BabyEquipment,
        "Baby Equipment (*Erstausstattung*)",
      );
      assert.equal(
        FinancialEventCategory.ChildcareFees,
        "Childcare (*Kita/Betreuung*)",
      );
      assert.equal(
        FinancialEventCategory.CareerBonus,
        "Career & Bonus (*Sonderzahlung*)",
      );
    });

    it("toFinancialEventCategory validates categories and rejects invalid strings", () => {
      assert.equal(
        toFinancialEventCategory("Baby Equipment (*Erstausstattung*)"),
        FinancialEventCategory.BabyEquipment,
      );
      assert.throws(() => toFinancialEventCategory("invalid-cat"), TypeError);
    });
  });

  describe("Action and Event Identifiers (Feature Test)", () => {
    it("toActionId brands valid action identifiers", () => {
      assert.equal(toActionId("ACT-1"), "ACT-1");
      assert.throws(() => toActionId(""), TypeError);
    });

    it("toPregnancyId brands valid pregnancy identifiers", () => {
      assert.equal(toPregnancyId("PREG-1"), "PREG-1");
      assert.throws(() => toPregnancyId(""), TypeError);
    });

    it("toSwitchId brands valid tax switch identifiers", () => {
      assert.equal(toSwitchId("SWAP-1"), "SWAP-1");
      assert.throws(() => toSwitchId(""), TypeError);
    });

    it("toRaiseId brands valid salary raise identifiers", () => {
      assert.equal(toRaiseId("RAISE-1"), "RAISE-1");
      assert.throws(() => toRaiseId(""), TypeError);
    });

    it("toHoursChangeId brands valid working hours change identifiers", () => {
      assert.equal(toHoursChangeId("HOURS-1"), "HOURS-1");
      assert.throws(() => toHoursChangeId(""), TypeError);
    });

    it("toFinancialEventId brands valid financial event identifiers", () => {
      assert.equal(toFinancialEventId("FIN-1"), "FIN-1");
      assert.throws(() => toFinancialEventId(""), TypeError);
    });

    it("toTransactionId and toEventId brand transaction and event identifiers", () => {
      assert.equal(toTransactionId("TX-123"), "TX-123");
      assert.equal(toEventId("EV-456"), "EV-456");
      assert.throws(() => toTransactionId(""), TypeError);
      assert.throws(() => toEventId(""), TypeError);
    });

    it("toMonthId constructs and validates nominal MonthId brands with dot format", () => {
      assert.equal(toMonthId(9, 2027), "M09.2027");
      assert.equal(toMonthId(1, 2026), "M01.2026");
      assert.equal(toMonthId(12, 2030), "M12.2030");
      assert.equal(toMonthId("M09.2027"), "M09.2027");
      assert.equal(toMonthId("M092027"), "M09.2027");
      assert.equal(isMonthId("M09.2027"), true);
      assert.equal(isMonthId("M01.2026"), true);
      assert.equal(isMonthId("M092027"), false);
      assert.equal(isMonthId("invalid"), false);
      assert.throws(() => toMonthId(13, 2026), TypeError);
      assert.throws(() => toMonthId(0, 2026), TypeError);
      assert.throws(() => toMonthId("invalid"), TypeError);
    });

    it("toMonthRef constructs and validates nominal MonthRef brands (dep on first preg positive)", () => {
      assert.equal(toMonthRef(12), "M12");
      assert.equal(
        toMonthRef(1, "Pregnancy Positive"),
        "M1 (Pregnancy Positive)",
      );
      assert.equal(toMonthRef(-8), "M-8");
      assert.equal(toMonthRef(9, "Birth 1"), "M9 (Birth 1)");
      assert.equal(toMonthRef(36, "Birth 2"), "M36 (Birth 2)");
      assert.equal(
        toMonthRef("M1 (Pregnancy Positive)"),
        "M1 (Pregnancy Positive)",
      );
      assert.equal(toMonthRef("M12"), "M12");
      assert.equal(toMonthRef("M-8"), "M-8");
      assert.equal(toMonthRef("M9 (Birth 1)"), "M9 (Birth 1)");
      assert.equal(isMonthRef("M1 (Pregnancy Positive)"), true);
      assert.equal(isMonthRef("M12"), true);
      assert.equal(isMonthRef("M-8"), true);
      assert.equal(isMonthRef("M9"), true);
      assert.equal(isMonthRef("invalid"), false);
      assert.equal(isMonthRef(""), false);
      assert.throws(() => toMonthRef("invalid"), TypeError);
      assert.throws(() => toMonthRef(NaN), TypeError);
      assert.throws(() => toMonthRef(""), TypeError);
    });

    it("toMonthSimRef constructs and validates nominal MonthSimRef brands (dep on sim start)", () => {
      assert.equal(toMonthSimRef(1), "Sim1");
      assert.equal(toMonthSimRef(21), "Sim21");
      assert.equal(toMonthSimRef(60), "Sim60");
      assert.equal(toMonthSimRef("Sim21"), "Sim21");
      assert.equal(toMonthSimRef("21"), "Sim21");
      assert.equal(toMonthSimRef("M21"), "Sim21");
      assert.equal(isMonthSimRef("Sim1"), true);
      assert.equal(isMonthSimRef("Sim21"), true);
      assert.equal(isMonthSimRef("Sim60"), true);
      assert.equal(isMonthSimRef("Sim120"), true);
      assert.equal(isMonthSimRef("Sim0"), false);
      assert.equal(isMonthSimRef("Sim121"), false);
      assert.equal(isMonthSimRef("invalid"), false);
      assert.equal(isMonthSimRef(""), false);
      assert.throws(() => toMonthSimRef(0), TypeError);
      assert.throws(() => toMonthSimRef(121), TypeError);
      assert.throws(() => toMonthSimRef("invalid"), TypeError);
    });
  });

  // =========================================================================
  // SECTION 2: COMBINATIONS & TYPE SYSTEM INTEGRATION TESTS
  // =========================================================================

  describe("Combination & Type System Invariants", () => {
    it("Monetary Hierarchy: GrossSalary and NetSalary are subtypes of EuroAmount", () => {
      const gross: GrossSalary = toGrossSalary(4500);
      const net: NetSalary = toNetSalary(3184);
      const kinderfreibetrag: KinderfreibetragAnnualAmount =
        toKinderfreibetragAnnualAmount(9540);

      // Subtype assignability to EuroAmount (Polymorphic Monetary handling)
      const amountFromGross: EuroAmount = gross;
      const amountFromNet: EuroAmount = net;
      const amountFromAllowance: EuroAmount = kinderfreibetrag;

      assert.equal(amountFromGross, 4500);
      assert.equal(amountFromNet, 3184);
      assert.equal(amountFromAllowance, 9540);

      // Verify monetary runtime type guards
      assert.equal(isEuroAmount(gross), true);
      assert.equal(isEuroAmount(net), true);
      assert.equal(isGrossSalary(gross), true);
      assert.equal(isNetSalary(net), true);
      assert.equal(isGrossSalary(-100), false);
      assert.equal(isNetSalary(NaN), false);
    });

    it("Action Hierarchy: PregnancyId, SwitchId, RaiseId, FinancialEventId are subtypes of ActionId and EntityId", () => {
      const pregId: PregnancyId = toPregnancyId("PREG-1");
      const switchId: SwitchId = toSwitchId("SWAP-1");
      const raiseId: RaiseId = toRaiseId("RAISE-1");
      const finId: FinancialEventId = toFinancialEventId("FEVENT-1");
      const txId: TransactionId = toTransactionId("TX-1");
      const evId: EventId = toEventId("EVENT-1");
      const citation: StatutoryCitation = toStatutoryCitation("§ 31 EStG");

      // Subtype assignability to ActionId
      const action1: ActionId = pregId;
      const action2: ActionId = switchId;
      const action3: ActionId = raiseId;
      const action4: ActionId = finId;

      assert.equal(action1, "PREG-1");
      assert.equal(action2, "SWAP-1");
      assert.equal(action3, "RAISE-1");
      assert.equal(action4, "FEVENT-1");

      // Subtype assignability to EntityId
      const entityFromPreg: EntityId = pregId;
      const entityFromSwitch: EntityId = switchId;
      const entityFromTx: EntityId = txId;
      const entityFromEv: EntityId = evId;
      const entityFromCitation: EntityId = citation;

      assert.equal(entityFromPreg, "PREG-1");
      assert.equal(entityFromSwitch, "SWAP-1");
      assert.equal(entityFromTx, "TX-1");
      assert.equal(entityFromEv, "EVENT-1");
      assert.equal(entityFromCitation, "§ 31 EStG");

      // Verify identifier runtime type guards
      assert.equal(isActionId(pregId), true);
      assert.equal(isActionId(switchId), true);
      assert.equal(isActionId(raiseId), true);
      assert.equal(isActionId(finId), true);
      assert.equal(isPregnancyId(pregId), true);
      assert.equal(isPregnancyId("OTHER"), false);
      assert.equal(isSwitchId(switchId), true);
      assert.equal(isSwitchId("NOT_A_SWITCH"), false);
      assert.equal(isRaiseId(raiseId), true);
      assert.equal(isFinancialEventId(finId), true);
    });

    it("Scenario View Mapping: ActiveScenarioView translates cleanly to ScenarioId or fallback compare target", () => {
      const views: ActiveScenarioView[] = [
        ActiveScenarioView.A,
        ActiveScenarioView.B,
        ActiveScenarioView.C,
        ActiveScenarioView.Compare,
      ];

      const mapped = views.map((v) =>
        v === ActiveScenarioView.Compare ? ScenarioId.C : toScenarioId(v));

      assert.deepEqual(mapped, [
        ScenarioId.A,
        ScenarioId.B,
        ScenarioId.C,
        ScenarioId.C,
      ]);
    });

    it("Combined Simulation State: constructs cohesive multi-dimensional domain record with full type safety", () => {
      const combinedRecord = {
        simulationMonth: toSimulationMonth(17),
        calendarYear: toCalendarYear(2),
        calendarMonth: toCalendarMonth(5),
        workingHours: toWorkingHours(24),
        grossSalary: toGrossSalary(3000),
        netSalary: toNetSalary(1975),
        taxClass: toTaxClass("III"),
        scenario: toScenarioId("C"),
        activeView: toActiveScenarioView("compare"),
        chartMode: toTimelineChartMode("stacked_bar"),
        timeFilter: toTimelineTimeRangeFilter("child1"),
        actionId: toActionId("ACT-M17-DELIVERY"),
        pregnancyId: toPregnancyId("PREG-1"),
        switchId: toSwitchId("SWAP-1"),
        raiseId: toRaiseId("RAISE-1"),
        financialEventId: toFinancialEventId("FIN-1"),
        actionCategory: toActionCategory("PREGNANCY"),
        actionType: toActionType("CHILD_DELIVERY"),
        targetPerson: toTargetPerson("WIFE"),
        citation: toStatutoryCitation("BEEG § 2b"),
      };

      assert.equal(combinedRecord.simulationMonth, 17);
      assert.equal(combinedRecord.calendarYear, 2);
      assert.equal(combinedRecord.calendarMonth, 5);
      assert.equal(combinedRecord.workingHours, 24);
      assert.equal(combinedRecord.grossSalary, 3000);
      assert.equal(combinedRecord.netSalary, 1975);
      assert.equal(combinedRecord.taxClass, TaxClass.III);
      assert.equal(combinedRecord.scenario, ScenarioId.C);
      assert.equal(combinedRecord.activeView, ActiveScenarioView.Compare);
      assert.equal(combinedRecord.chartMode, TimelineChartMode.StackedBar);
      assert.equal(combinedRecord.timeFilter, TimelineTimeRangeFilter.Child1);
      assert.equal(combinedRecord.actionCategory, ActionCategory.Pregnancy);
      assert.equal(combinedRecord.actionType, ActionType.ChildDelivery);
      assert.equal(combinedRecord.targetPerson, TargetPerson.Wife);
      assert.equal(combinedRecord.citation, "BEEG § 2b");
    });
  });
});
