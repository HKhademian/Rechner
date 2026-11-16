import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  CommuteTransportMode,
  evaluateCommuterAllowanceAndJobTicket,
} from "#engine/formulas/pure/commuterAllowanceEvaluator";
import {
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";

describe("Commuter Allowance (§ 9 EStG) & JobTicket (§ 3 Nr. 15 EStG) Evaluator", () => {
  it("applies 2025 tiered rates (€0.30/€0.38) vs 2026 uniform €0.38/km from km 1", () => {
    const common = {
      oneWayCommuteKm: 15,
      officeDaysPerYear: 220,
      transportMode: CommuteTransportMode.MotorVehicle,
      homeOfficeDaysPerYear: 0,
      otherAnnualWorkExpensesEur: toEuroAmount(0),
      monthlyTransitTicketCostEur: toEuroAmount(0),
      monthlyEmployerJobTicketSubsidyEur: toEuroAmount(0),
      taxableIncomeZvEEur: toEuroAmount(65000),
      isMarriedJointAssessment: false,
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
    } as const;

    const r2025 = evaluateCommuterAllowanceAndJobTicket({
      ...common,
      calendarYear: toFullCalendarYear(2025),
    });
    const r2026 = evaluateCommuterAllowanceAndJobTicket({
      ...common,
      calendarYear: toFullCalendarYear(2026),
    });

    // 2025: 15 km * €0.30 * 220 = €990 (below €1,230 Arbeitnehmer-Pauschbetrag)
    assert.equal(r2025.uncappedDistanceAllowanceEur, 990);
    assert.equal(r2025.selfPaidScenario.excessAboveWorkAllowanceEur, 0);
    assert.equal(r2025.selfPaidScenario.annualTaxSavingsEur, 0);

    // 2026: 15 km * €0.38 * 220 = €1,254 (€24 above €1,230 Pauschbetrag)
    assert.equal(r2026.uncappedDistanceAllowanceEur, 1254);
    assert.equal(r2026.selfPaidScenario.excessAboveWorkAllowanceEur, 24);
    assert.ok(r2026.selfPaidScenario.annualTaxSavingsEur > 0);
    assert.equal(r2026.jobTicketNetAnnualAdvantageEur, 0);
  });

  it("caps non-car Entfernungspauschale at €4,500 and Homeoffice-Pauschale at €1,260", () => {
    const result = evaluateCommuterAllowanceAndJobTicket({
      calendarYear: toFullCalendarYear(2026),
      oneWayCommuteKm: 80,
      officeDaysPerYear: 220, // 80 * 0.38 * 220 = €6,688 uncapped
      transportMode: CommuteTransportMode.PublicTransitOrBike,
      homeOfficeDaysPerYear: 250, // > 210 days -> capped at €1,260
      otherAnnualWorkExpensesEur: toEuroAmount(200),
      monthlyTransitTicketCostEur: toEuroAmount(63),
      monthlyEmployerJobTicketSubsidyEur: toEuroAmount(63),
      taxableIncomeZvEEur: toEuroAmount(75000),
      isMarriedJointAssessment: false,
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
    });

    assert.equal(result.uncappedDistanceAllowanceEur, 6688);
    assert.equal(result.cappedDistanceAllowanceEur, 4500);
    assert.equal(result.selfPaidScenario.homeOfficeDeductionEur, 1260);
    // JobTicket offsets €756 against €4,500, leaving €3,744 + €1,260 + €200 = €5,204
    assert.equal(result.effectiveCommuteOffsetByJobTicketEur, 756);
    assert.equal(result.jobTicketScenario.commuteAllowanceEur, 3744);
    assert.ok(result.jobTicketNetAnnualAdvantageEur > 0);
  });

  it("uses actual public-transit fare when higher than distance allowance under § 9 Abs. 2 S. 2 EStG", () => {
    const result = evaluateCommuterAllowanceAndJobTicket({
      calendarYear: toFullCalendarYear(2026),
      oneWayCommuteKm: 3,
      officeDaysPerYear: 100, // 3 * 0.38 * 100 = €114
      transportMode: CommuteTransportMode.PublicTransitOrBike,
      homeOfficeDaysPerYear: 210, // €1,260
      otherAnnualWorkExpensesEur: toEuroAmount(0),
      monthlyTransitTicketCostEur: toEuroAmount(63), // €756/yr > €114
      monthlyEmployerJobTicketSubsidyEur: toEuroAmount(0),
      taxableIncomeZvEEur: toEuroAmount(70000),
      isMarriedJointAssessment: false,
      hasChurchTax: false,
      isBavariaOrBadenWuerttemberg: false,
    });

    assert.equal(result.cappedDistanceAllowanceEur, 114);
    assert.equal(result.selfPaidScenario.usedActualTicketCostInsteadOfDistance, true);
    assert.equal(result.selfPaidScenario.commuteAllowanceEur, 756);
    assert.equal(result.selfPaidScenario.totalWorkExpensesEur, 2016);
    assert.equal(result.selfPaidScenario.excessAboveWorkAllowanceEur, 786);
  });
});
