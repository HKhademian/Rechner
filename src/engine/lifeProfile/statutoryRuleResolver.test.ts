import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type EffectiveRuleEntry,
  JurisdictionCode,
  RuleResolutionStatus,
  RuleUnsupportedReason,
  resolveEffectiveRule,
  toJurisdictionCode,
  toRuleResolutionStatus,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";

const SOURCE = toSourceUrl("https://www.gesetze-im-internet.de/sgb_4/__20.html");

it("resolves midyear rule changes on exact effective date boundaries", () => {
  assert.equal(toJurisdictionCode("DE"), JurisdictionCode.GermanyFederal);
  assert.throws(() => toJurisdictionCode("FR"));
  assert.equal(toRuleResolutionStatus("current"), RuleResolutionStatus.Current);
  assert.throws(() => toRuleResolutionStatus("guessed"));

  const entries: readonly EffectiveRuleEntry<EuroAmount>[] = [
    {
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2026-01-01"),
      effectiveTo: toLifeDate("2026-06-30"),
      value: toEuroAmount(603),
      label: "First-half threshold",
      sourceUrl: SOURCE,
      lawIds: [LawId.SGB4_20],
      parameterId: ParameterId.Employment_MarginalLimitMonthly,
    },
    {
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2026-07-01"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: toEuroAmount(650),
      label: "Midyear revised threshold",
      sourceUrl: SOURCE,
      lawIds: [LawId.SGB4_20],
      parameterId: ParameterId.Employment_MarginalLimitMonthly,
    },
  ];

  const beforeMidyear = resolveEffectiveRule(entries, {
    date: toLifeDate("2026-06-30"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(beforeMidyear.status, RuleResolutionStatus.Current);
  assert.equal(beforeMidyear.entry.value, 603);
  assert.equal(beforeMidyear.entry.effectiveTo, "2026-06-30");

  const onMidyearChange = resolveEffectiveRule(entries, {
    date: toLifeDate("2026-07-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(onMidyearChange.status, RuleResolutionStatus.Current);
  assert.equal(onMidyearChange.entry.value, 650);
  assert.equal(onMidyearChange.entry.effectiveFrom, "2026-07-01");
});

it("marks unsupported jurisdictions, pre-coverage dates, gaps and unprojected future dates as unsupported", () => {
  const entries: readonly EffectiveRuleEntry<EuroAmount>[] = [
    {
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2024-01-01"),
      effectiveTo: toLifeDate("2024-12-31"),
      value: toEuroAmount(538),
      label: "2024 limit",
      sourceUrl: SOURCE,
      lawIds: [LawId.SGB4_20],
    },
    {
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2026-01-01"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: toEuroAmount(603),
      label: "2026 limit",
      sourceUrl: SOURCE,
      lawIds: [LawId.SGB4_20],
    },
  ];

  const wrongJurisdiction = resolveEffectiveRule(entries, {
    date: toLifeDate("2026-05-01"),
    jurisdiction: JurisdictionCode.UnsupportedOther,
    allowProjection: true,
  });
  assert.equal(wrongJurisdiction.status, RuleResolutionStatus.Unsupported);
  assert.equal(wrongJurisdiction.reason, RuleUnsupportedReason.UnsupportedJurisdiction);

  const beforeCoverage = resolveEffectiveRule(entries, {
    date: toLifeDate("2023-12-31"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    allowProjection: true,
  });
  assert.equal(beforeCoverage.status, RuleResolutionStatus.Unsupported);
  assert.equal(beforeCoverage.reason, RuleUnsupportedReason.DateBeforeCoverage);
  assert.equal(beforeCoverage.earliestKnownDate, "2024-01-01");

  const inGap = resolveEffectiveRule(entries, {
    date: toLifeDate("2025-06-15"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    allowProjection: true,
  });
  assert.equal(inGap.status, RuleResolutionStatus.Unsupported);
  assert.equal(inGap.reason, RuleUnsupportedReason.DateInCoverageGap);

  const unprojectedFuture = resolveEffectiveRule(entries, {
    date: toLifeDate("2028-02-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  });
  assert.equal(unprojectedFuture.status, RuleResolutionStatus.Unsupported);
  assert.equal(unprojectedFuture.reason, RuleUnsupportedReason.FutureDateNotProjected);

  const projectedFuture = resolveEffectiveRule(entries, {
    date: toLifeDate("2028-02-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    allowProjection: true,
  });
  assert.equal(projectedFuture.status, RuleResolutionStatus.Projected);
  assert.equal(projectedFuture.entry.value, 603);
  assert.deepEqual(projectedFuture.projectedFromInterval, {
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
  });
});

it("rejects inverted or overlapping effective date intervals in rule tables", () => {
  assert.throws(() => resolveEffectiveRule([
    {
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2026-07-01"),
      effectiveTo: toLifeDate("2026-06-30"),
      value: toEuroAmount(603),
      label: "Inverted",
      sourceUrl: SOURCE,
      lawIds: [LawId.SGB4_20],
    },
  ], {
    date: toLifeDate("2026-07-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  }));

  assert.throws(() => resolveEffectiveRule([
    {
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2026-01-01"),
      effectiveTo: toLifeDate("2026-07-01"),
      value: toEuroAmount(603),
      label: "Overlap A",
      sourceUrl: SOURCE,
      lawIds: [LawId.SGB4_20],
    },
    {
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2026-07-01"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: toEuroAmount(650),
      label: "Overlap B",
      sourceUrl: SOURCE,
      lawIds: [LawId.SGB4_20],
    },
  ], {
    date: toLifeDate("2026-07-01"),
    jurisdiction: JurisdictionCode.GermanyFederal,
  }));
});
