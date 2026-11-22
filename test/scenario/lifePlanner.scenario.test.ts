import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  TaxClass,
  toCalendarMonth,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toPercentageRate,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";
import {
  simulateLifePlan,
} from "#engine/lifeSimulator/lifeSimulator";
import {
  DISASTER_PRESETS,
  DisasterPresetId,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  evaluateCommitmentAffordability,
} from "#engine/lifeSimulator/commitmentAffordability";
import {
  LifePlannerPresetId,
  buildLifePlannerPreset,
} from "#engine/lifeSimulator/lifePlannerPresets";
import {
  type LifePlanInput,
  CompanyCarPowertrain,
  JobEndCause,
  LifeEventDomain,
  LifeEventKind,
  LifePersonKey,
  LifeScenarioKey,
  ParentalLeavePlanMode,
  ResidencyMilestoneKind,
  toLifeEventId,
} from "#engine/lifeSimulator/types";

describe("Longitudinal 10-Year Life Planner & Disaster Affordability Scenario", () => {
  it("simulates a 10-year multi-event German household with exact tax collection and balance-sheet invariants", () => {
    const plan: LifePlanInput = Object.freeze({
      baseline: Object.freeze({
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        horizonMonths: 120,
        taxReturnMonth: toCalendarMonth(6),
        isMarriedJointAssessment: true,
        priorChildrenCount: 0,
        openingLiquidCash: toEuroAmount(95000),
        emergencyBufferMonths: 4,
        openingAssetsValue: toEuroAmount(20000),
        openingDebtBalance: toEuroAmount(0),
        monthlyRent: toEuroAmount(1900),
        annualRentIndexationRate: toPercentageRate(0.02),
        monthlyLivingExpenses: toEuroAmount(2000),
        annualInflationRate: toPercentageRate(0.02),
        indexFutureTaxBrackets: false,
        primary: Object.freeze({
          personKey: LifePersonKey.Primary,
          name: "Primary",
          monthlyGross: toGrossSalary(6800),
          weeklyHours: toWorkingHours(40),
          taxClass: TaxClass.IV,
          churchTaxRate: toPercentageRate(0),
        }),
        partner: Object.freeze({
          personKey: LifePersonKey.Partner,
          name: "Partner",
          monthlyGross: toGrossSalary(5000),
          weeklyHours: toWorkingHours(40),
          taxClass: TaxClass.IV,
          churchTaxRate: toPercentageRate(0),
        }),
      }),
      events: Object.freeze([
        {
          id: toLifeEventId("SCEN-COMMUTE"),
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.CommuterProfile,
          effectiveMonth: toSimulationMonth(1),
          title: "Primary Commuter Profile",
          personKey: LifePersonKey.Primary,
          oneWayDistanceKm: 28,
          workDaysPerYear: 150,
          homeOfficeDaysPerYear: 80,
        },
        {
          id: toLifeEventId("SCEN-EV-CAR"),
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.CompanyCar,
          effectiveMonth: toSimulationMonth(6),
          title: "EV Company Car",
          personKey: LifePersonKey.Primary,
          listPriceGross: toEuroAmount(55000),
          powertrain: CompanyCarPowertrain.Electric,
          oneWayCommuteKm: 28,
        },
        {
          id: toLifeEventId("SCEN-BIRTH"),
          domain: LifeEventDomain.Family,
          kind: LifeEventKind.ChildBirth,
          effectiveMonth: toSimulationMonth(14),
          title: "Child 1 Birth",
          parentOnLeave: LifePersonKey.Partner,
          leaveMode: ParentalLeavePlanMode.Basis,
          leaveMonths: 10,
          partnerLeaveMonths: 2,
          includeMutterschutz: true,
        },
        {
          id: toLifeEventId("SCEN-KITA"),
          domain: LifeEventDomain.Family,
          kind: LifeEventKind.ChildcareFee,
          effectiveMonth: toSimulationMonth(26),
          title: "Krippe / Kita",
          monthlyFee: toEuroAmount(450),
          durationMonths: 48,
          childIndex: 1,
          taxDeductible: true,
        },
        {
          id: toLifeEventId("SCEN-HOME"),
          domain: LifeEventDomain.HousingAsset,
          kind: LifeEventKind.HomePurchase,
          effectiveMonth: toSimulationMonth(36),
          title: "Home Purchase",
          purchasePrice: toEuroAmount(560000),
          closingCostsRate: toPercentageRate(0.085),
          downPayment: toEuroAmount(80000),
          annualInterestRate: toPercentageRate(0.035),
          initialRepaymentRate: toPercentageRate(0.02),
          monthlyMaintenanceReserve: toEuroAmount(350),
          annualAppreciationRate: toPercentageRate(0.02),
          replacesRent: true,
        },
        {
          id: toLifeEventId("SCEN-SOLAR"),
          domain: LifeEventDomain.HousingAsset,
          kind: LifeEventKind.SolarPvInstallation,
          effectiveMonth: toSimulationMonth(42),
          title: "Rooftop Solar PV",
          upfrontCapex: toEuroAmount(15000),
          monthlyElectricitySavings: toEuroAmount(190),
          monthlyFeedInRevenue: toEuroAmount(75),
          durationMonths: 240,
        },
        {
          id: toLifeEventId("SCEN-JOB-END"),
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.JobEnd,
          effectiveMonth: toSimulationMonth(60),
          title: "Mid-Career Resignation & Transition",
          personKey: LifePersonKey.Primary,
          cause: JobEndCause.VoluntaryResignation,
          unemploymentMonths: 5,
          sperrzeitMonths: 3,
          reemploymentMonthlyGross: toGrossSalary(7600),
        },
        {
          id: toLifeEventId("SCEN-CITIZEN"),
          domain: LifeEventDomain.Residency,
          kind: LifeEventKind.ResidencyMilestone,
          effectiveMonth: toSimulationMonth(48),
          title: "Citizenship Milestone (§ 10 StAG)",
          milestoneKind: ResidencyMilestoneKind.Citizenship10StAG,
          leadMonthsNotice: 6,
        },
      ]),
    });

    const result = simulateLifePlan(plan, LifeScenarioKey.Planned);
    assert.equal(result.months.length, 120);
    assert.equal(result.annualTaxRecords.length, 10);

    // Every year 2026..2034 (9 complete years with year+1 inside horizon) must post its tax settlement in June of year+1.
    const posted = result.annualTaxRecords.filter((r) => r.postedInMonth !== undefined);
    assert.equal(posted.length, 9);

    // Exact cash conservation over 120 months.
    const sumCashflow = Math.round(result.months.reduce((s, m) => s + m.monthlyNetCashflow, 0) * 100) / 100;
    assert.ok(Math.abs(plan.baseline.openingLiquidCash + sumCashflow - result.summary.endingLiquidCash) < 0.05);

    // Deadlines must include Elternzeit, ALG I registration, tax filings, and Citizenship milestone.
    assert.ok(result.deadlines.some((d) => d.domain === LifeEventDomain.Family));
    assert.ok(result.deadlines.some((d) => d.domain === LifeEventDomain.Career));
    assert.ok(result.deadlines.some((d) => d.domain === LifeEventDomain.Tax));
    assert.ok(result.deadlines.some((d) => d.domain === LifeEventDomain.Residency));
  });

  it("orders safe rent & mortgage ceilings monotonically across escalating life disasters", () => {
    const plan = buildLifePlannerPreset(LifePlannerPresetId.YoungProfessional);
    const trigger = toSimulationMonth(10);
    const floor = toEuroAmount(8000);

    const firedAff = evaluateCommitmentAffordability(
      plan,
      DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.Fired6m)!.buildShocks(trigger),
      { emergencyFloorEur: floor },
    );
    const resignedAff = evaluateCommitmentAffordability(
      plan,
      DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.ResignedSperrzeit6m)!.buildShocks(trigger),
      { emergencyFloorEur: floor },
    );
    const compoundAff = evaluateCommitmentAffordability(
      plan,
      DISASTER_PRESETS.find((p) => p.id === DisasterPresetId.CompoundFiredAndEmergency)!.buildShocks(trigger),
      { emergencyFloorEur: floor },
    );

    // Worse disasters must yield equal-or-lower safe monthly commitment ceilings.
    assert.ok(
      resignedAff.maxSafeTotalRentEur <= firedAff.maxSafeTotalRentEur,
      `Resigned ceiling (€${resignedAff.maxSafeTotalRentEur}) should be <= Fired ceiling (€${firedAff.maxSafeTotalRentEur})`,
    );
    assert.ok(
      compoundAff.maxSafeTotalRentEur <= firedAff.maxSafeTotalRentEur,
      `Compound ceiling (€${compoundAff.maxSafeTotalRentEur}) should be <= Fired ceiling (€${firedAff.maxSafeTotalRentEur})`,
    );
  });
});
