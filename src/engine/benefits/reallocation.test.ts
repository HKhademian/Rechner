import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  runScenarioBatches, 
} from "#engine/simulator/timelineGenerator";
import {
  type PreexistingConditions,
  type PregnancyAction,
  ActionType,
  ActionCategory,
  ScenarioId,
  TaxClass,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPregnancyId,
} from "#engine/types";

describe("Elterngeld Reallocation Engine (*Partnerübertragung* § 4, § 7 BEEG)", () => {
  const preexisting: PreexistingConditions = {
    startCalendarYear: toFullCalendarYear(2026),
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: toMonthDuration(60),
    husbandGross: toGrossSalary(4000),
    wifeGross: toGrossSalary(3000),
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(2895),
    husbandInitialClass5Net: toNetSalary(2191),
    husbandWeeklyHours: toWorkingHours(32),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1975),
    wifeInitialClass3FullTimeNet: toNetSalary(2603),
    wifeInitialPartTimeClass5Net: toNetSalary(1660),
    wifeInitialPartTimeClass3Net: toNetSalary(2167),
    wifeWeeklyHours: toWorkingHours(40),
    wifePostBirthWeeklyHours: toWorkingHours(32),
    existingChildrenCount: toChildrenCount(0),
    kindergeldPerChild: toEuroAmount(259),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3),
  };

  const pregnancies: PregnancyAction[] = [
    {
      pregnancyId: toPregnancyId("PREG-CHILD-1"),
      childIndex: toChildIndex(1),
      positiveTestCalendarMonth: toCalendarMonth(9),
      positiveTestCalendarYear: toFullCalendarYear(2026),
      positiveTestSimulationMonth: toSimulationMonth(9),
      calculatedDeliverySimulationMonth: toSimulationMonth(17),
      motherPostBirthPartTimeHours: toWorkingHours(24),
      motherPostBirthPartTimeClass5Net: toNetSalary(1328),
      motherPostBirthPartTimeClass3Net: toNetSalary(1648),
      fatherPartnerMonthsCount: toMonthDuration(4),
    },
    {
      pregnancyId: toPregnancyId("PREG-CHILD-2"),
      childIndex: toChildIndex(2),
      positiveTestCalendarMonth: toCalendarMonth(11),
      positiveTestCalendarYear: toFullCalendarYear(2027),
      positiveTestSimulationMonth: toSimulationMonth(23),
      calculatedDeliverySimulationMonth: toSimulationMonth(31),
      motherPostBirthPartTimeHours: toWorkingHours(24),
      motherPostBirthPartTimeClass5Net: toNetSalary(1328),
      motherPostBirthPartTimeClass3Net: toNetSalary(1648),
      fatherPartnerMonthsCount: toMonthDuration(4),
    },
  ];

  it("automatically reallocates Child 1 remaining Elterngeld to Father during Child 2 Mutterschutz", () => {
    const res = runScenarioBatches({
      scenarioKey: ScenarioId.C,
      preexisting,
      pregnancies,
      taxClassSwitches: [],
      salaryRaises: [],
      workingHoursChanges: [],
      financialEvents: [],
    });

    // Sim30 is Month 12 of Child 1 EG+ and Month preM of Child 2 Mutterschutz
    const m30 = res.months[29]; // Sim30
    assert.equal(m30.month, 30);
    assert.equal(m30.isMutterschutz, true);
    assert.equal(m30.mutterschutz, 2167);
    assert.equal(m30.wifeElterngeld, 0); // Offset under § 3 Abs. 1 BEEG
    assert.ok(
      m30.husbandElterngeld > 0,
      "Father must receive reallocated Child 1 ElterngeldPlus",
    );

    // Verify Action Milestone Row is generated before Month 30
    assert.ok(m30.startingActions, "Month 30 must have startingActions");
    const reallocAction = m30.startingActions?.find(
      (a) => a.type === ActionType.ElterngeldReallocation,
    );
    assert.ok(
      reallocAction,
      "Month 30 must contain ActionType.ElterngeldReallocation milestone row",
    );
    assert.equal(
      reallocAction?.category,
      ActionCategory.ElterngeldReallocation,
    );
    assert.ok(
      reallocAction?.title.includes("Elterngeld Reallocation"),
      "Title must specify Elterngeld Reallocation",
    );
  });

  it("offsets Mother Child 1 Elterngeld to 0 during Child 2 Mutterschutz under § 3 Abs. 1 BEEG", () => {
    const res = runScenarioBatches({
      scenarioKey: ScenarioId.C,
      preexisting,
      pregnancies,
      taxClassSwitches: [],
      salaryRaises: [],
      workingHoursChanges: [],
      financialEvents: [],
    });

    // Sim30, Sim31, Sim32 are Mutterschutz months for Child 2
    for (const mIndex of [29, 30, 31]) {
      const m = res.months[mIndex];
      assert.equal(m.isMutterschutz, true);
      assert.equal(m.wifeSalary, 0);
      assert.equal(m.wifeElterngeld, 0);
      assert.equal(m.mutterschutz, 2167);
    }
  });

  it("does not reallocate to Father if Father working hours exceed 32h/week (§ 1 Abs. 1 Nr. 4 BEEG)", () => {
    const res = runScenarioBatches({
      scenarioKey: ScenarioId.C,
      preexisting: {
        ...preexisting,
        husbandWeeklyHours: toWorkingHours(40), // 40h > 32h statutory cap
      },
      pregnancies,
      taxClassSwitches: [],
      salaryRaises: [],
      workingHoursChanges: [],
      financialEvents: [],
    });

    const m30 = res.months[29]; // Sim30
    assert.equal(m30.month, 30);
    assert.equal(m30.isMutterschutz, true);
    assert.equal(m30.wifeElterngeld, 0);
    assert.equal(
      m30.husbandElterngeld,
      0,
      "Father must not receive Elterngeld when working >32h/week",
    );
  });
});
