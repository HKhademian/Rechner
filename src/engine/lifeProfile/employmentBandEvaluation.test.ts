import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  FormulaId,
} from "#engine/formulas/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  SalaryPeriod,
  toEuroAmount,
  toGrossSalary,
} from "#engine/types";
import {
  ExplanationFormulaKind,
  ExplanationStatus,
} from "#engine/lifeProfile/calculationExplanation";
import {
  EMPLOYMENT_BAND_FORMULA_VERSION,
  EmploymentContributionBand,
  evaluateEmploymentBand,
  toEmploymentContributionBand,
} from "#engine/lifeProfile/employmentBandEvaluation";
import {
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  JurisdictionCode,
  RuleResolutionStatus,
} from "#engine/lifeProfile/statutoryRuleResolver";

it("classifies 2026 and 2027 employment bands at exact statutory boundaries with full provenance", () => {
  assert.equal(toEmploymentContributionBand("minijob"), EmploymentContributionBand.Minijob);
  assert.throws(() => toEmploymentContributionBand("unknown-band"));

  const mini2026 = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(603),
      period: SalaryPeriod.Monthly },
    grossSourceLabel: "job start · 2026-01-01",
    date: toLifeDate("2026-06-15"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(mini2026.band, EmploymentContributionBand.Minijob);
  assert.equal(mini2026.explanation.kind, ExplanationFormulaKind.Statutory);
  assert.equal(mini2026.explanation.status, ExplanationStatus.Supported);
  assert.equal(mini2026.explanation.formulaVersion, EMPLOYMENT_BAND_FORMULA_VERSION);
  assert.equal(mini2026.explanation.formulaId, FormulaId.TransitionZoneAssessmentBases);
  assert.deepEqual(mini2026.explanation.lawIds, [LawId.SGB4_20]);
  assert.deepEqual(mini2026.explanation.topicIds, ["minijob"]);
  assert.equal(mini2026.explanation.parameters.length, 2);
  assert.equal(mini2026.explanation.parameters[0].parameterId, ParameterId.Employment_MarginalLimitMonthly);
  assert.equal(mini2026.explanation.parameters[0].effectiveFrom, "2026-01-01");
  assert.equal(mini2026.explanation.parameters[0].effectiveTo, "2026-12-31");
  assert.equal(mini2026.explanation.parameters[0].status, RuleResolutionStatus.Current);

  const midi2026 = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(603.01),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2026-06-15"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(midi2026.band, EmploymentContributionBand.Midijob);

  const regular2026 = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(2000.01),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2026-06-15"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(regular2026.band, EmploymentContributionBand.Regular);

  // 2027 raises marginal limit to €633/month
  const mini2027 = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(633),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2027-02-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(mini2027.band, EmploymentContributionBand.Minijob);
  assert.equal(mini2027.explanation.parameters[0].effectiveFrom, "2027-01-01");
});

it("handles midyear rule changes, unsupported dates/jurisdictions, explicit projection and yearly rates", () => {
  const source = toSourceUrl("https://www.gesetze-im-internet.de/sgb_4/__20.html");
  const midyearTables = {
    marginalLimits: [
      {
        jurisdiction: JurisdictionCode.GermanyFederal,
        effectiveFrom: toLifeDate("2026-01-01"),
        effectiveTo: toLifeDate("2026-06-30"),
        value: toEuroAmount(603),
        label: "Marginal limit H1",
        sourceUrl: source,
        lawIds: [LawId.SGB4_20],
        parameterId: ParameterId.Employment_MarginalLimitMonthly,
      },
      {
        jurisdiction: JurisdictionCode.GermanyFederal,
        effectiveFrom: toLifeDate("2026-07-01"),
        effectiveTo: toLifeDate("2026-12-31"),
        value: toEuroAmount(650),
        label: "Marginal limit H2",
        sourceUrl: source,
        lawIds: [LawId.SGB4_20],
        parameterId: ParameterId.Employment_MarginalLimitMonthly,
      },
    ],
    transitionCeilings: [
      {
        jurisdiction: JurisdictionCode.GermanyFederal,
        effectiveFrom: toLifeDate("2026-01-01"),
        effectiveTo: toLifeDate("2026-12-31"),
        value: toEuroAmount(2000),
        label: "Transition ceiling",
        sourceUrl: source,
        lawIds: [LawId.SGB4_20],
        parameterId: ParameterId.Employment_TransitionCeilingMonthly,
      },
    ],
  };

  // €620 is Midijob on 2026-06-30, then Minijob after midyear raise on 2026-07-01
  const h1 = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(620),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2026-06-30"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    ruleTables: midyearTables,
  });
  assert.equal(h1.band, EmploymentContributionBand.Midijob);
  assert.equal(h1.explanation.parameters[0].effectiveTo, "2026-06-30");

  const h2 = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(620),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2026-07-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    ruleTables: midyearTables,
  });
  assert.equal(h2.band, EmploymentContributionBand.Minijob);
  assert.equal(h2.explanation.parameters[0].effectiveFrom, "2026-07-01");

  // Unsupported jurisdiction -> Unknown + explicit reason
  const otherJurisdiction = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(1200),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2026-06-15"),
    jurisdiction: JurisdictionCode.UnsupportedOther,
    allowProjection: true,
  });
  assert.equal(otherJurisdiction.band, EmploymentContributionBand.Unknown);
  assert.equal(otherJurisdiction.explanation.status, ExplanationStatus.Unsupported);
  assert.match(otherJurisdiction.explanation.unsupportedReason ?? "", /jurisdiction/i);

  // Pre-2024 date -> Unknown + explicit reason
  const pre2024 = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(1200),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2023-12-31"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    allowProjection: true,
  });
  assert.equal(pre2024.band, EmploymentContributionBand.Unknown);
  assert.equal(pre2024.explanation.status, ExplanationStatus.Unsupported);

  // Post-2027 without opt-in -> Unknown; with opt-in -> Projected with provenance
  const futureNoProj = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(630),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2028-03-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(futureNoProj.band, EmploymentContributionBand.Unknown);
  assert.equal(futureNoProj.explanation.status, ExplanationStatus.Unsupported);

  const futureProjected = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(630),
      period: SalaryPeriod.Monthly },
    date: toLifeDate("2028-03-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    allowProjection: true,
  });
  assert.equal(futureProjected.band, EmploymentContributionBand.Minijob);
  assert.equal(futureProjected.explanation.status, ExplanationStatus.Projected);
  assert.equal(futureProjected.explanation.parameters[0].status, RuleResolutionStatus.Projected);
  assert.equal(futureProjected.explanation.parameters[0].effectiveFrom, "2027-01-01");

  // Yearly gross rate -> Unknown (never silently divided by 12)
  const yearly = evaluateEmploymentBand({
    grossRate: { amount: toGrossSalary(60000),
      period: SalaryPeriod.Yearly },
    date: toLifeDate("2026-06-15"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(yearly.band, EmploymentContributionBand.Unknown);
  assert.equal(yearly.explanation.status, ExplanationStatus.Unsupported);
  assert.match(yearly.explanation.unsupportedReason ?? "", /yearly/i);
});
