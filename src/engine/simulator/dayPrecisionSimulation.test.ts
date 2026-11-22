import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  deserializeState,
  getTestPersistedState,
  parseRawScenarioData,
  serializeState,
} from "#engine/storage/persistence";
import {
  type ScenarioActionBatches,
  AllowancePlanMode,
  ElterngeldVariant,
  SalaryInputMode,
  ScenarioId,
  TargetPerson,
  TaxClass,
  toCalendarMonth,
  toChildIndex,
  toFullCalendarYear,
  toGrossSalary,
  toHoursChangeId,
  toIsoCalendarDate,
  toMonthDuration,
  toMonthId,
  toNetSalary,
  toPregnancyId,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";

describe("Phase 2: Day-Exact Mutterschutz, Boundary Proration, Life Months & § 11 EStG Tax Accumulation", () => {
  it("prorates 05.2027 (16d+15d), 08.2027 (23d+8d), and 12.2027 (27d+4d) for due date 28.06.2027 and return 28.12.2027", () => {
    const batches: ScenarioActionBatches = {
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...standardPreexistingConditions,
        householdTaxableIncome: undefined,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(48),
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(6500),
        wifeGross: toGrossSalary(4500),
        husbandInitialTaxClass: TaxClass.III,
        wifeInitialTaxClass: TaxClass.V,
        wifeWeeklyHours: toWorkingHours(40),
        enable13thSalary: false,
      },
      pregnancies: [
        {
          pregnancyId: toPregnancyId("PREG-EXACT-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(10),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(10),
          calculatedDeliverySimulationMonth: toSimulationMonth(18), // 06.2027
          expectedDueDate: toIsoCalendarDate("2027-06-28"),
          motherPostBirthPartTimeHours: toWorkingHours(0),
          motherPostBirthPartTimeClass5Net: toNetSalary(0),
          motherPostBirthPartTimeClass3Net: toNetSalary(0),
          fatherPartnerMonthsCount: toMonthDuration(2),
          motherAllowancePlanMode: AllowancePlanMode.Auto,
          motherAllowanceVariant: ElterngeldVariant.Basis,
          motherAnnualVacationDays: 30,
          motherVacationDaysTakenPreLeave: 0,
        },
      ],
      taxClassSwitches: [],
      salaryRaises: [],
      workingHoursChanges: [
        {
          changeId: toHoursChangeId("HOURS-RETURN-DEC28"),
          effectiveSimulationMonth: toSimulationMonth(24), // 12.2027
          effectiveCalendarMonth: toCalendarMonth(12),
          effectiveCalendarYear: toFullCalendarYear(2027),
          effectiveDate: toIsoCalendarDate("2027-12-28"),
          targetPerson: TargetPerson.Wife,
          weeklyHours: toWorkingHours(30),
          reason: "Return to 30h part-time at Life Month 7 start (28.12.2027)",
        },
      ],
    };

    const result = runScenarioBatches(batches);
    const byId = new Map(result.months.map((m) => [m.monthId, m]));

    // 05.2027 (31d): 16 working days + 15 Mutterschutz days (17.05..31.05.2027)
    const may27 = byId.get(toMonthId("M05.2027"))!;
    assert.equal(may27.daySplit?.motherWorkDays, 16);
    assert.equal(may27.daySplit?.motherMutterschutzDays, 15);
    assert.equal(may27.daySplit?.motherElternzeitDays, 0);
    assert.equal(may27.daySplit?.summaryLabel, "16d Salary · 15d Mutterschutz");
    assert.ok(may27.wifeSalary > 0);
    assert.ok(may27.mutterschutz > 0);
    assert.equal(may27.isMutterschutz, true);

    // 06.2027 (30d) & 07.2027 (31d): full Mutterschutz, zero salary, no split badge
    const jun27 = byId.get(toMonthId("M06.2027"))!;
    const jul27 = byId.get(toMonthId("M07.2027"))!;
    assert.equal(jun27.wifeSalary, 0);
    assert.equal(jul27.wifeSalary, 0);
    assert.equal(jun27.daySplit, undefined);
    assert.equal(jul27.daySplit, undefined);
    assert.ok(jun27.mutterschutz > may27.mutterschutz);

    // 08.2027 (31d): 23 Mutterschutz days (01.08..23.08.2027) + 8 Elternzeit days (24.08..31.08.2027)
    const aug27 = byId.get(toMonthId("M08.2027"))!;
    assert.equal(aug27.daySplit?.motherWorkDays, 0);
    assert.equal(aug27.daySplit?.motherMutterschutzDays, 23);
    assert.equal(aug27.daySplit?.motherElternzeitDays, 8);
    assert.equal(aug27.daySplit?.summaryLabel, "23d Mutterschutz · 8d Elternzeit");
    assert.equal(aug27.wifeSalary, 0);
    assert.ok(aug27.mutterschutz > 0 && aug27.mutterschutz < jun27.mutterschutz);
    // Life Month 3 Basiselterngeld (28.08..27.09) begins in M08.2027 (since post-birth MuSchG consumes exactly 2 Life Months!)
    assert.ok(aug27.wifeElterngeld > 0);

    // 12.2027 (31d): 27 Elternzeit days (01.12..27.12.2027) + 4 paid return days (28.12..31.12.2027)
    const dec27 = byId.get(toMonthId("M12.2027"))!;
    assert.equal(dec27.daySplit?.motherElternzeitDays, 27);
    assert.equal(dec27.daySplit?.motherWorkDays, 4);
    assert.equal(dec27.daySplit?.summaryLabel, "27d Elternzeit · 4d Salary");
    assert.ok(dec27.wifeSalary > 0);
    assert.ok(dec27.startingActions?.some((a) => a.title.includes("28.12.2027")));

    // BEEG 12-month assessment window must exclude M05.2027 -> runs M05.2026..M04.2027!
    const motherAssessment = result.benefitAssessments?.find(
      (a) => a.pregnancyId === "PREG-EXACT-1" && a.parent === TargetPerson.Wife,
    );
    assert.ok(motherAssessment);
    assert.equal(motherAssessment.selectedMonths[0], "M05.2026");
    assert.equal(motherAssessment.selectedMonths[11], "M04.2027");
    assert.ok(motherAssessment.excludedMonths.includes(toMonthId("M05.2027")));

    // 2027 Annual Tax Record (§ 11 EStG / § 32b Progressionsvorbehalt) must be complete and reflect prorated Mutterschutz + Dec return
    const tax2027 = result.annualTaxRecords?.find((r) => r.calendarYear === 2027);
    assert.equal(tax2027?.available, true);
    assert.ok((tax2027?.assessment?.totalLiability ?? 0) > 0);
  });

  it("extends post-birth Mutterschutz to 84 days (3 Life Months) for twins/premature births", () => {
    const twins = runScenarioBatches({
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...standardPreexistingConditions,
        householdTaxableIncome: undefined,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(36),
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(6500),
        wifeGross: toGrossSalary(4500),
        enable13thSalary: false,
      },
      pregnancies: [
        {
          pregnancyId: toPregnancyId("PREG-TWINS-1"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(10),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(10),
          calculatedDeliverySimulationMonth: toSimulationMonth(18),
          expectedDueDate: toIsoCalendarDate("2027-06-28"),
          isMultipleOrPrematureBirth: true, // Post-birth MuSchG through 20.09.2027 -> consumes 3 Life Months!
          motherPostBirthPartTimeHours: toWorkingHours(0),
          motherPostBirthPartTimeClass5Net: toNetSalary(0),
          motherPostBirthPartTimeClass3Net: toNetSalary(0),
          fatherPartnerMonthsCount: toMonthDuration(2),
          motherAllowancePlanMode: AllowancePlanMode.Auto,
        },
      ],
      taxClassSwitches: [],
      salaryRaises: [],
    });

    const byId = new Map(twins.months.map((m) => [m.monthId, m]));
    const sep27 = byId.get(toMonthId("M09.2027"))!;
    assert.equal(sep27.daySplit?.motherMutterschutzDays, 20); // 01.09..20.09.2027
    assert.equal(sep27.daySplit?.motherElternzeitDays, 10); // 21.09..30.09.2027
    assert.ok(sep27.mutterschutz > 0);
    // First paid Elterngeld Life Month is LM 4 (starting M09.2027) -> M08.2027 is full Mutterschutz with 0 Elterngeld!
    assert.equal(byId.get(toMonthId("M08.2027"))!.wifeElterngeld, 0);
    assert.ok(sep27.wifeElterngeld > 0);
  });

  it("persists and strictly validates expectedDueDate, vacation settings, and WorkingHoursChangeAction effectiveDate", () => {
    const base = getTestPersistedState();
    const datedState = {
      ...base,
      customPregnancies: base.customPregnancies.map((p, idx) =>
        idx === 0
          ? {
            ...p,
            expectedDueDate: toIsoCalendarDate("2027-06-28"),
            isMultipleOrPrematureBirth: true,
            motherAnnualVacationDays: 28,
            motherVacationDaysTakenPreLeave: 10,
          }
          : p),
      customWorkingHoursChanges: [
        {
          changeId: toHoursChangeId("HOURS-DATED-1"),
          effectiveSimulationMonth: toSimulationMonth(24),
          effectiveCalendarMonth: toCalendarMonth(12),
          effectiveCalendarYear: toFullCalendarYear(2027),
          effectiveDate: toIsoCalendarDate("2027-12-28"),
          targetPerson: TargetPerson.Wife,
          weeklyHours: toWorkingHours(30),
          reason: "Year-end return",
        },
      ],
    };

    const roundtripped = deserializeState(serializeState(datedState));
    assert.equal(roundtripped.customPregnancies[0].expectedDueDate, "2027-06-28");
    assert.equal(roundtripped.customPregnancies[0].isMultipleOrPrematureBirth, true);
    assert.equal(roundtripped.customPregnancies[0].motherAnnualVacationDays, 28);
    assert.equal(roundtripped.customPregnancies[0].motherVacationDaysTakenPreLeave, 10);
    assert.equal(roundtripped.customWorkingHoursChanges?.[0].effectiveDate, "2027-12-28");

    // Strict parser rejects impossible calendar dates like 2027-02-29
    assert.throws(
      () =>
        parseRawScenarioData({
          ...datedState,
          customPregnancies: [
            {
              ...datedState.customPregnancies[0],
              expectedDueDate: "2027-02-29",
            },
          ],
        }),
      TypeError,
    );
    assert.throws(
      () =>
        parseRawScenarioData({
          ...datedState,
          customWorkingHoursChanges: [
            {
              ...datedState.customWorkingHoursChanges[0],
              effectiveDate: "2027-04-31",
            },
          ],
        }),
      TypeError,
    );
  });

  it("auto-optimizes WorkingHoursChangeAction effective day when effectiveDate is left empty in a dated pregnancy scenario", () => {
    const autoResult = runScenarioBatches({
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...standardPreexistingConditions,
        householdTaxableIncome: undefined,
        startCalendarYear: toFullCalendarYear(2026),
        startCalendarMonth: toCalendarMonth(1),
        simulationDurationMonths: toMonthDuration(36),
        salaryInputMode: SalaryInputMode.Gross,
        husbandGross: toGrossSalary(6500),
        wifeGross: toGrossSalary(4500),
        wifeWeeklyHours: toWorkingHours(40),
        enable13thSalary: false,
      },
      pregnancies: [
        {
          pregnancyId: toPregnancyId("PREG-AUTO-DAY"),
          childIndex: toChildIndex(1),
          positiveTestCalendarMonth: toCalendarMonth(10),
          positiveTestCalendarYear: toFullCalendarYear(2026),
          positiveTestSimulationMonth: toSimulationMonth(10),
          calculatedDeliverySimulationMonth: toSimulationMonth(18),
          expectedDueDate: toIsoCalendarDate("2027-06-28"),
          motherPostBirthPartTimeHours: toWorkingHours(0),
          motherPostBirthPartTimeClass5Net: toNetSalary(0),
          motherPostBirthPartTimeClass3Net: toNetSalary(0),
          fatherPartnerMonthsCount: toMonthDuration(2),
          motherAllowancePlanMode: AllowancePlanMode.Auto,
        },
      ],
      taxClassSwitches: [],
      salaryRaises: [],
      workingHoursChanges: [
        {
          changeId: toHoursChangeId("HOURS-EMPTY-DAY"),
          effectiveSimulationMonth: toSimulationMonth(24), // 12.2027
          effectiveCalendarMonth: toCalendarMonth(12),
          effectiveCalendarYear: toFullCalendarYear(2027),
          // effectiveDate intentionally omitted -> engine must auto-optimize to 28.12.2027!
          targetPerson: TargetPerson.Wife,
          weeklyHours: toWorkingHours(30),
          reason: "Return to 30h part-time (auto-optimized day)",
        },
      ],
    });

    const dec27 = autoResult.months.find((m) => m.monthId === toMonthId("M12.2027"))!;
    assert.equal(dec27.daySplit?.motherElternzeitDays, 27);
    assert.equal(dec27.daySplit?.motherWorkDays, 4);
    assert.equal(dec27.daySplit?.summaryLabel, "27d Elternzeit · 4d Salary");
    assert.ok(dec27.startingActions?.some((a) => a.title.includes("auto 28.12.2027")));
  });
});
