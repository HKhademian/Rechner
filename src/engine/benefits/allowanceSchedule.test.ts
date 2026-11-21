import {
  assessCoupleBenefitIncome,
} from "#engine/benefits/incomeEligibility";
import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  type ScenarioActionBatches,
  type PregnancyAction,
  AllowancePlanMode,
  ElterngeldVariant,
  ScenarioId,
  SalaryInputMode,
  TaxClass,
  TargetPerson,
  toGrossSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toSwitchId,
  toPregnancyId,
  toChildIndex,
  toWorkingHours,
  toNetSalary,
  toMonthDuration,
  toRaiseId,
  toPercentageRate,
  toHoursChangeId,
} from "#engine/types";
import {
  assessmentCalendarMonth,
  toAssessmentMonthOrdinal,
} from "#engine/benefits/assessmentHistory";
import {
  buildIncomeSchedule,
} from "#engine/simulator/incomeSchedule";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  projectAllowanceSchedule,
} from "#engine/benefits/allowanceSchedule";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  createTimelineConventions,
} from "#engine/config/timelineConventions";

const start = assessmentCalendarMonth(toFullCalendarYear(2026), toCalendarMonth(1));
const at = (index: number) => toAssessmentMonthOrdinal(start + index - 1);
const pregnancy: PregnancyAction = { pregnancyId: toPregnancyId("PREG-ASSESSMENT"),
  childIndex: toChildIndex(1),
  positiveTestCalendarMonth: toCalendarMonth(9),
  positiveTestCalendarYear: toFullCalendarYear(2026),
  positiveTestSimulationMonth: toSimulationMonth(9),
  calculatedDeliverySimulationMonth: toSimulationMonth(17),
  motherPostBirthPartTimeHours: toWorkingHours(0),
  motherPostBirthPartTimeClass3Net: toNetSalary(0),
  motherPostBirthPartTimeClass5Net: toNetSalary(0),
  fatherPartnerMonthsCount: toMonthDuration(4) };
const base: ScenarioActionBatches = { scenarioKey: ScenarioId.C,
  preexisting: { ...standardPreexistingConditions,
    salaryInputMode: SalaryInputMode.Gross,
    husbandGross: toGrossSalary(4000),
    wifeGross: toGrossSalary(3000) },
  pregnancies: [pregnancy],
  taxClassSwitches: [],
  salaryRaises: [] };
const switched = (month: number): ScenarioActionBatches => ({ ...base,
  taxClassSwitches: [
    { switchId: toSwitchId("ASSESSMENT-SWITCH"),
      effectiveSimulationMonth: toSimulationMonth(month),
      effectiveCalendarMonth: toCalendarMonth((month - 1) % 12 + 1),
      effectiveCalendarYear: toFullCalendarYear(2026 + Math.floor((month - 1) / 12)),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      revertSimulationMonth: toSimulationMonth(17),
      statutoryReason: "Assessment test" },
  ] });
const project = (batches: ScenarioActionBatches, end = 48) => projectAllowanceSchedule(
  batches,
  buildIncomeSchedule(batches, at(end)),
  at(end),
);

it("uses actual early/late switch history and independent BEEG net references", () => {
  const early = project(switched(9));
  const late = project(switched(14));
  const mother = (result: typeof early) => result.assessments.find((audit) => audit.parent === TargetPerson.Wife)!;
  assert.equal(mother(early).taxClass, TaxClass.III);
  assert.equal(mother(early).preBirthNet, 2229.17);
  assert.deepEqual(mother(early).selectedMonths, ["M04.2026", "M05.2026", "M06.2026", "M07.2026", "M08.2026", "M09.2026", "M10.2026", "M11.2026", "M12.2026", "M01.2027", "M02.2027", "M03.2027"]);
  assert.equal(mother(late).taxClass, TaxClass.V);
  assert.equal(mother(late).preBirthNet, 1635.17);
  assert.equal(early.months.get(at(19))?.wifeElterngeld, 724.48);
  assert.equal(late.months.get(at(19))?.wifeElterngeld, 531.43);
  assert.equal(mother(project(switched(10))).taxClass, TaxClass.III); // Six/six: latest wins.
});

it("keeps the pre-birth amount fixed after a later salary raise", () => {
  const batches = switched(9);
  const raised = project({ ...batches,
    salaryRaises: [{ raiseId: toRaiseId("POST-BIRTH-RAISE"),
      effectiveSimulationMonth: toSimulationMonth(25),
      effectiveCalendarMonth: toCalendarMonth(1),
      effectiveCalendarYear: toFullCalendarYear(2028),
      targetPerson: TargetPerson.Wife,
      percentageIncrease: toPercentageRate(0.1),
      reason: "Later raise" }] });
  assert.equal(raised.months.get(at(19))?.wifeElterngeld, 724.48);
  assert.equal(raised.months.get(at(26))?.wifeElterngeld, 724.48);
});

it("averages positive earnings across ordinary Plus and partnership claims", () => {
  const batches: ScenarioActionBatches = { ...switched(9),
    pregnancies: [{ ...pregnancy,
      motherPostBirthPartTimeHours: toWorkingHours(24) }],
    workingHoursChanges: [{ changeId: toHoursChangeId("AVERAGE-HOURS"),
      effectiveSimulationMonth: toSimulationMonth(24),
      effectiveCalendarMonth: toCalendarMonth(12),
      effectiveCalendarYear: toFullCalendarYear(2027),
      targetPerson: TargetPerson.Wife,
      weeklyHours: toWorkingHours(32),
      reason: "Increase after five earning months" }] };
  const result = project(batches);
  const audit = result.assessments.find((entry) => entry.parent === TargetPerson.Wife)!;
  // Five months at 1800, eleven at 2400: average gross 2212.50, BEEG social base 2202.85.
  assert.equal(audit.postBirthAverageNet, 1647.39);
  assert.equal(result.months.get(at(19))?.wifeElterngeld, 378.16);
  assert.equal(result.months.get(at(33))?.wifeElterngeld, 378.16);
});

it("does not treat manual payroll take-home as BEEG net without an explicit assumption", () => {
  const manual = { ...base,
    preexisting: { ...standardPreexistingConditions,
      assumeManualNetIsAssessmentNet: false } };
  const unavailable = project(manual);
  assert.equal(unavailable.complete, false);
  assert.match(unavailable.assessments[0].reason ?? "", /explicit manual assessment-net assumption/);
  const assumed = project({ ...manual,
    preexisting: { ...manual.preexisting,
      assumeManualNetIsAssessmentNet: true } });
  assert.equal(assumed.complete, true);
  assert.ok(assumed.assessments.every((audit) => audit.assumptions.some((note) => note.includes("no standardized-net conversion"))));
});

it("excludes actual older-child protected months and preserves the overlap minimum without extra father claims", () => {
  const batches: ScenarioActionBatches = { ...switched(9),
    pregnancies: [
      { ...pregnancy,
        motherPostBirthPartTimeHours: toWorkingHours(24) },
      { ...pregnancy,
        pregnancyId: toPregnancyId("PREG-ASSESSMENT-2"),
        childIndex: toChildIndex(2),
        calculatedDeliverySimulationMonth: toSimulationMonth(31),
        motherPostBirthPartTimeHours: toWorkingHours(24) },
    ] };
  const result = project(batches);
  const second = result.assessments.find((audit) => audit.parent === TargetPerson.Wife && audit.pregnancyId === "PREG-ASSESSMENT-2")!;
  assert.deepEqual(second.selectedMonths, result.assessments.find((audit) => audit.parent === TargetPerson.Wife)!.selectedMonths);
  assert.equal(second.preBirthNet, 2229.17);
  assert.equal(result.months.get(at(30))?.wifeElterngeld, 150);
  assert.equal(result.months.get(at(30))?.husbandElterngeld, 0);
});

it("uses the father's own history and income loss rather than the mother's entitlement", () => {
  const result = project({ ...base,
    workingHoursChanges: [{ changeId: toHoursChangeId("FATHER-REDUCTION"),
      effectiveSimulationMonth: toSimulationMonth(19),
      effectiveCalendarMonth: toCalendarMonth(7),
      effectiveCalendarYear: toFullCalendarYear(2027),
      targetPerson: TargetPerson.Husband,
      weeklyHours: toWorkingHours(16),
      reason: "Half the original 32-hour contract" }] });
  const father = result.assessments.find((audit) => audit.parent === TargetPerson.Husband)!;
  // Independent BMF fixtures: III/4000 -> 207.66 tax; III/2000 -> zero.
  assert.equal(father.preBirthNet, 2849.84);
  assert.equal(father.postBirthAverageNet, 1477.5);
  assert.equal(result.months.get(at(19))?.husbandElterngeld, 840.13);
  assert.notEqual(result.months.get(at(19))?.husbandElterngeld, result.months.get(at(19))?.wifeElterngeld);
});

it("propagates unknown earlier benefit receipt instead of inventing a later eligible window", () => {
  const result = project({ ...base,
    pregnancies: [
      { ...pregnancy,
        calculatedDeliverySimulationMonth: toSimulationMonth(12),
        motherPostBirthPartTimeHours: toWorkingHours(24) },
      { ...pregnancy,
        pregnancyId: toPregnancyId("PREG-UNKNOWN-SECOND"),
        childIndex: toChildIndex(2),
        calculatedDeliverySimulationMonth: toSimulationMonth(23),
        motherPostBirthPartTimeHours: toWorkingHours(24) },
    ] });
  const first = result.assessments.find((audit) => audit.parent === TargetPerson.Wife)!;
  const second = result.assessments.find((audit) => audit.parent === TargetPerson.Wife && audit.pregnancyId === "PREG-UNKNOWN-SECOND")!;
  assert.equal(first.assumedMonths.length, 2);
  assert.equal(first.available, false);
  assert.match(second.reason ?? "", /Earlier benefit receipt is unavailable/);
  assert.equal(second.available, false);
  assert.equal(result.complete, false);
});

it("does not pay a single isolated partnership month", () => {
  const result = project({ ...base,
    pregnancies: [{ ...pregnancy,
      motherPostBirthPartTimeHours: toWorkingHours(24) }],
    workingHoursChanges: [
      { changeId: toHoursChangeId("FATHER-FULL"),
        effectiveSimulationMonth: toSimulationMonth(1),
        effectiveCalendarMonth: toCalendarMonth(1),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(40),
        reason: "Full time" },
      { changeId: toHoursChangeId("FATHER-ONLY-ONE-BONUS"),
        effectiveSimulationMonth: toSimulationMonth(34),
        effectiveCalendarMonth: toCalendarMonth(10),
        effectiveCalendarYear: toFullCalendarYear(2028),
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(32),
        reason: "One remaining bonus month" },
    ] });
  assert.equal(result.months.get(at(34))?.isPartnerschaftsbonus, false);
  assert.equal(result.months.get(at(34))?.husbandElterngeld, 0);
  assert.equal(result.months.get(at(34))?.wifeElterngeld, 0);
});

it("rejects plans exceeding ordinary budgets rather than inventing extra entitlement", () => {
  const conventions = createTimelineConventions({ motherOrdinaryPlusMonths: 24,
    partnershipBonusMonths: 0 });
  const income = buildIncomeSchedule(base, at(48), conventions);
  assert.throws(() => projectAllowanceSchedule(base, income, at(48), conventions), /individual or family budget/);
});


it("withholds denied and unknown claims without treating denied benefits as exclusion months", () => {
  const batches = switched(9);
  const income = buildIncomeSchedule(batches, at(48));
  const denied = assessCoupleBenefitIncome(toFullCalendarYear(2027), toCalendarMonth(5), toEuroAmount(175000.01));
  const unknown = assessCoupleBenefitIncome(toFullCalendarYear(2027), toCalendarMonth(5));
  const projectWith = (eligibility: typeof denied) => projectAllowanceSchedule(batches, income, at(48), undefined, new Map([[pregnancy.pregnancyId, eligibility]]));
  const rejected = projectWith(denied);
  assert.equal(rejected.complete, true);
  assert.equal(rejected.months.get(at(19))?.wifeElterngeld, 0);
  assert.ok(rejected.assessments.every((assessment) => assessment.available && assessment.reason?.includes("excluded")));
  const missing = projectWith(unknown);
  assert.equal(missing.complete, false);
  assert.equal(missing.months.get(at(19))?.wifeElterngeld, 0);
  assert.match(missing.unavailableReasons[0], /taxable-income evidence/);
  const second = { ...pregnancy,
    pregnancyId: toPregnancyId("SECOND-INCOME-GATE"),
    childIndex: toChildIndex(2),
    calculatedDeliverySimulationMonth: toSimulationMonth(44) };
  const two = { ...batches,
    pregnancies: [pregnancy, second] };
  const later = projectAllowanceSchedule(two, buildIncomeSchedule(two, at(64)), at(64), undefined, new Map([
    [pregnancy.pregnancyId, denied],
    [second.pregnancyId, assessCoupleBenefitIncome(toFullCalendarYear(2029), toCalendarMonth(8), toEuroAmount(0))],
  ]));
  const selected = later.assessments.find((assessment) => assessment.pregnancyId === second.pregnancyId && assessment.parent === TargetPerson.Wife)!;
  assert.deepEqual(selected.excludedMonths, ["M07.2029"]); // Maternity only; no denied older benefits.
});

it("models Basiselterngeld up to €1,800/mo on full parental leave and enforces the 14-unit statutory budget", () => {
  const highEarner: ScenarioActionBatches = {
    ...switched(9),
    preexisting: {
      ...base.preexisting,
      wifeGross: toGrossSalary(5000),
      husbandGross: toGrossSalary(6000),
    },
    pregnancies: [
      {
        ...pregnancy,
        motherAllowanceVariant: ElterngeldVariant.Basis,
        motherAllowanceMonthsCount: toMonthDuration(10),
        fatherAllowanceVariant: ElterngeldVariant.Basis,
        fatherPartnerMonthsCount: toMonthDuration(2),
      },
    ],
    workingHoursChanges: [
      {
        changeId: toHoursChangeId("FATHER-FULL-LEAVE-BASIS"),
        effectiveSimulationMonth: toSimulationMonth(19),
        effectiveCalendarMonth: toCalendarMonth(7),
        effectiveCalendarYear: toFullCalendarYear(2027),
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(0),
        reason: "Father 2M Basiselterngeld leave",
      },
      {
        changeId: toHoursChangeId("FATHER-RETURN-PB"),
        effectiveSimulationMonth: toSimulationMonth(21),
        effectiveCalendarMonth: toCalendarMonth(9),
        effectiveCalendarYear: toFullCalendarYear(2027),
        targetPerson: TargetPerson.Husband,
        weeklyHours: toWorkingHours(28),
        reason: "Return to part-time",
      },
      {
        changeId: toHoursChangeId("MOTHER-RETURN-PB"),
        effectiveSimulationMonth: toSimulationMonth(29),
        effectiveCalendarMonth: toCalendarMonth(5),
        effectiveCalendarYear: toFullCalendarYear(2028),
        targetPerson: TargetPerson.Wife,
        weeklyHours: toWorkingHours(28),
        reason: "Mother joins Partnerschaftsbonus",
      },
    ],
  };
  const result = project(highEarner);
  // Month 19 (life-month 3): both mother and father receive €1,800 Basiselterngeld at 0h/wk
  assert.equal(result.months.get(at(19))?.wifeElterngeld, 1800);
  assert.equal(result.months.get(at(19))?.husbandElterngeld, 1800);
  assert.equal(
    result.months.get(at(19))?.payments.find((p) => p.parent === TargetPerson.Wife)?.variant,
    ElterngeldVariant.Basis,
  );
  assert.equal(
    result.months.get(at(19))?.payments.find((p) => p.parent === TargetPerson.Husband)?.variant,
    ElterngeldVariant.Basis,
  );
  // Month 28 (life-month 12) is mother's 10th Basis month; Month 29 enters Partnerschaftsbonus (always Plus!)
  assert.equal(result.months.get(at(28))?.wifeElterngeld, 1800);
  assert.equal(result.months.get(at(29))?.isPartnerschaftsbonus, true);
  assert.equal(
    result.months.get(at(29))?.payments.find((p) => p.parent === TargetPerson.Wife)?.variant,
    ElterngeldVariant.Plus,
  );

  // Mid-earner mother (€3,000 gross -> €2,229.17 BEEG net): Basis = 1448.96 (2x Plus 724.48)
  const midEarner = project({
    ...switched(9),
    pregnancies: [
      {
        ...pregnancy,
        motherAllowanceVariant: ElterngeldVariant.Basis,
        motherAllowanceMonthsCount: toMonthDuration(10),
        fatherPartnerMonthsCount: toMonthDuration(4),
      },
    ],
  });
  assert.equal(midEarner.months.get(at(19))?.wifeElterngeld, 1448.96);

  // Exceeding 14 Basis units (2 MuSchG + 10 Mother Basis + 3 Father Basis = 15) must throw
  assert.throws(
    () =>
      project({
        ...highEarner,
        pregnancies: [
          {
            ...pregnancy,
            motherAllowanceVariant: ElterngeldVariant.Basis,
            motherAllowanceMonthsCount: toMonthDuration(10),
            fatherAllowanceVariant: ElterngeldVariant.Basis,
            fatherPartnerMonthsCount: toMonthDuration(3),
          },
        ],
      }),
    /individual or family budget/,
  );
});

it("applies the § 2a Abs. 1 BEEG Basiselterngeld sibling bonus cap (€1,980/mo) for a second child", () => {
  const twoChildrenBasis: ScenarioActionBatches = {
    ...switched(9),
    preexisting: {
      ...base.preexisting,
      wifeGross: toGrossSalary(5000),
      husbandGross: toGrossSalary(5000),
    },
    pregnancies: [
      {
        ...pregnancy,
        motherAllowanceVariant: ElterngeldVariant.Basis,
        motherAllowanceMonthsCount: toMonthDuration(10),
        fatherPartnerMonthsCount: toMonthDuration(0),
      },
      {
        ...pregnancy,
        pregnancyId: toPregnancyId("PREG-BASIS-CHILD-2"),
        childIndex: toChildIndex(2),
        positiveTestSimulationMonth: toSimulationMonth(22),
        calculatedDeliverySimulationMonth: toSimulationMonth(30),
        motherAllowanceVariant: ElterngeldVariant.Basis,
        motherAllowanceMonthsCount: toMonthDuration(10),
        fatherPartnerMonthsCount: toMonthDuration(0),
      },
    ],
  };
  const result = project(twoChildrenBasis, 50);
  // Month 32 (life-month 3 of Child 2, Child 1 is 15 months old < 36): €1,800 + 10% = €1,980
  assert.equal(result.months.get(at(32))?.hasSiblingBonus, true);
  assert.equal(result.months.get(at(32))?.wifeElterngeld, 1980);
});

it("gives Mother Basiselterngeld at 0h under Auto mode even while Father works 32h on ElterngeldPlus", () => {
  const autoBatches: ScenarioActionBatches = {
    ...switched(9),
    preexisting: {
      ...base.preexisting,
      wifeGross: toGrossSalary(5000),
      husbandGross: toGrossSalary(6000),
      husbandWeeklyHours: toWorkingHours(32),
    },
    pregnancies: [
      {
        ...pregnancy,
        motherPostBirthPartTimeHours: toWorkingHours(0),
        motherAllowancePlanMode: AllowancePlanMode.Auto,
        fatherAllowancePlanMode: AllowancePlanMode.Auto,
        fatherPartnerMonthsCount: toMonthDuration(4),
      },
    ],
  };

  const result = project(autoBatches);
  // Month 19 (LM 3) through Month 28 (LM 12): Mother is 0h/wk -> 10 Basiselterngeld months (€1,800/mo, NOT €900/mo Plus!)
  assert.equal(result.months.get(at(19))?.wifeElterngeld, 1800);
  assert.equal(
    result.months.get(at(19))?.payments.find((p) => p.parent === TargetPerson.Wife)?.variant,
    ElterngeldVariant.Basis,
  );
  assert.equal(result.months.get(at(28))?.wifeElterngeld, 1800);
  assert.equal(result.months.get(at(29))?.wifeElterngeld, 0);

  // Father works 32h/wk (0 income loss) -> 4 ElterngeldPlus partner months at €150/mo (2 Basis units); never forces Mother into Plus
  assert.equal(result.months.get(at(19))?.husbandElterngeld, 150);
  assert.equal(
    result.months.get(at(19))?.payments.find((p) => p.parent === TargetPerson.Husband)?.variant,
    ElterngeldVariant.Plus,
  );
  assert.equal(result.months.get(at(22))?.husbandElterngeld, 150);
  assert.equal(result.months.get(at(23))?.husbandElterngeld, 0);

  const motherAudit = result.assessments.find((a) => a.parent === TargetPerson.Wife)!;
  assert.equal(motherAudit.planMode, AllowancePlanMode.Auto);
  assert.equal(motherAudit.ordinaryClaimMonths.length, 10);

  // End-to-end timeline phaseLabel reflects Basiselterngeld accurately (never falsely "EGPlus")
  const timeline = runScenarioBatches(autoBatches);
  const sim19 = timeline.months.find((entry) => entry.month === 19)!;
  const sim29 = timeline.months.find((entry) => entry.month === 29)!;
  assert.equal(sim19.wifeElterngeld, 1800);
  assert.equal(sim19.phaseLabel, "Child 1 Basiselterngeld (Mother)");
  assert.equal(sim29.wifeElterngeld, 0);
  assert.equal(sim29.phaseLabel, "Family Part-Time (Post-Leave)");
});

it("mixes Basiselterngeld (0h) and ElterngeldPlus (24h) automatically within the 12/14 Basis-unit budget", () => {
  const mixedBatches: ScenarioActionBatches = {
    ...switched(9),
    preexisting: {
      ...base.preexisting,
      wifeGross: toGrossSalary(5000),
      husbandGross: toGrossSalary(6000),
      husbandWeeklyHours: toWorkingHours(32),
    },
    pregnancies: [
      {
        ...pregnancy,
        motherPostBirthPartTimeHours: toWorkingHours(0),
        motherAllowancePlanMode: AllowancePlanMode.Auto,
        fatherAllowancePlanMode: AllowancePlanMode.Auto,
        fatherPartnerMonthsCount: toMonthDuration(4),
      },
    ],
    workingHoursChanges: [
      {
        changeId: toHoursChangeId("MOTHER-RETURN-24H-LM9"),
        effectiveSimulationMonth: toSimulationMonth(25), // birth=17, LM3=19 -> 6 months at 0h (19..24), then 24h from 25
        effectiveCalendarMonth: toCalendarMonth(1),
        effectiveCalendarYear: toFullCalendarYear(2028),
        targetPerson: TargetPerson.Wife,
        weeklyHours: toWorkingHours(24),
        reason: "Return to 24h part-time after 6 Basis months",
      },
    ],
  };

  const timeline = runScenarioBatches(mixedBatches);
  // Months 19..24 (6 months at 0h): 6 Basiselterngeld months (6 Basis units)
  for (let m = 19; m <= 24; m++) {
    const entry = timeline.months.find((row) => row.month === m)!;
    assert.equal(entry.wifeElterngeld, 1800, `Month ${m} should pay full €1,800 Basiselterngeld`);
    assert.equal(entry.phaseLabel, "Child 1 Basiselterngeld (Mother)");
  }
  // Remaining individual budget = 12 - 2 (MuSchG) - 6 (Basis) = 4 Basis units -> 8 ElterngeldPlus months (25..32)
  for (let m = 25; m <= 32; m++) {
    const entry = timeline.months.find((row) => row.month === m)!;
    assert.ok(entry.wifeElterngeld > 0 && entry.wifeElterngeld <= 900, `Month ${m} should pay ElterngeldPlus`);
    assert.equal(entry.phaseLabel, "Child 1 EGPlus (Mother)");
  }
  // Months 33..36 (both parents work 24h & 32h): Partnerschaftsbonus kicks in automatically right after ordinary months
  const sim33 = timeline.months.find((row) => row.month === 33)!;
  assert.equal(sim33.isPartnerschaftsbonus, true);
  assert.equal(sim33.phaseLabel, "Partnerschaftsbonus (Both Parents)");
});

