import {
  type SourceUrl,
} from "#engine/config/benefitRules";
import {
  type LawId,
} from "#engine/laws/types";
import {
  type ParameterId,
} from "#engine/parameters/types";
import {
  type LifeDate,
} from "#engine/lifeProfile/person";

export const JurisdictionCode = {
  GermanyFederal: "DE",
  UnsupportedOther: "OTHER",
} as const;
export type JurisdictionCode = (typeof JurisdictionCode)[keyof typeof JurisdictionCode];

export function toJurisdictionCode(value: string): JurisdictionCode {
  if (!Object.values(JurisdictionCode).includes(value as JurisdictionCode)) {
    throw new TypeError("Jurisdiction must be a supported jurisdiction code.");
  }
  return value as JurisdictionCode;
}

export const RuleResolutionStatus = {
  Current: "current",
  Projected: "projected",
  Unsupported: "unsupported",
} as const;
export type RuleResolutionStatus = (typeof RuleResolutionStatus)[keyof typeof RuleResolutionStatus];

export function toRuleResolutionStatus(value: string): RuleResolutionStatus {
  if (!Object.values(RuleResolutionStatus).includes(value as RuleResolutionStatus)) {
    throw new TypeError("Invalid rule resolution status.");
  }
  return value as RuleResolutionStatus;
}

export const RuleUnsupportedReason = {
  UnsupportedJurisdiction: "unsupported-jurisdiction",
  DateBeforeCoverage: "date-before-coverage",
  DateInCoverageGap: "date-in-coverage-gap",
  FutureDateNotProjected: "future-date-not-projected",
} as const;
export type RuleUnsupportedReason = (typeof RuleUnsupportedReason)[keyof typeof RuleUnsupportedReason];

export interface EffectiveDateInterval {
  readonly effectiveFrom: LifeDate;
  readonly effectiveTo: LifeDate;
}

export interface EffectiveRuleEntry<TValue> {
  readonly jurisdiction: JurisdictionCode;
  readonly effectiveFrom: LifeDate;
  readonly effectiveTo: LifeDate;
  readonly value: TValue;
  readonly label: string;
  readonly sourceUrl: SourceUrl;
  readonly lawIds: readonly LawId[];
  readonly parameterId?: ParameterId;
}

export interface RuleResolutionRequest {
  readonly date: LifeDate;
  readonly jurisdiction: JurisdictionCode;
  /** Future dates beyond the latest verified rule stay unsupported unless explicitly opted in. */
  readonly allowProjection?: boolean;
}

export type EffectiveRuleResolution<TValue> =
  | {
    readonly status: typeof RuleResolutionStatus.Current;
    readonly requestedDate: LifeDate;
    readonly requestedJurisdiction: JurisdictionCode;
    readonly entry: EffectiveRuleEntry<TValue>;
  }
  | {
    readonly status: typeof RuleResolutionStatus.Projected;
    readonly requestedDate: LifeDate;
    readonly requestedJurisdiction: JurisdictionCode;
    readonly entry: EffectiveRuleEntry<TValue>;
    readonly projectedFromInterval: EffectiveDateInterval;
  }
  | {
    readonly status: typeof RuleResolutionStatus.Unsupported;
    readonly requestedDate: LifeDate;
    readonly requestedJurisdiction: JurisdictionCode;
    readonly reason: RuleUnsupportedReason;
    readonly latestKnownInterval?: EffectiveDateInterval;
    readonly earliestKnownDate?: LifeDate;
  };

function validateRuleEntries<TValue>(entries: readonly EffectiveRuleEntry<TValue>[]): void {
  const byJurisdiction = new Map<JurisdictionCode, EffectiveRuleEntry<TValue>[]>();
  for (const entry of entries) {
    if (entry.effectiveFrom > entry.effectiveTo) {
      throw new TypeError("Rule effectiveFrom must not be later than effectiveTo.");
    }
    const list = byJurisdiction.get(entry.jurisdiction) ?? [];
    list.push(entry);
    byJurisdiction.set(entry.jurisdiction, list);
  }
  for (const list of byJurisdiction.values()) {
    const sorted = [...list].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].effectiveFrom <= sorted[index - 1].effectiveTo) {
        throw new TypeError("Rule effective date intervals must not overlap within the same jurisdiction.");
      }
    }
  }
}

/**
 * Resolves a statutory rule for an exact calendar date and jurisdiction.
 * Supports midyear effective-date changes and never silently applies an unsupported
 * jurisdiction or future rule as current.
 */
export function resolveEffectiveRule<TValue>(
  entries: readonly EffectiveRuleEntry<TValue>[],
  request: RuleResolutionRequest,
): EffectiveRuleResolution<TValue> {
  validateRuleEntries(entries);
  const scoped = entries
    .filter((entry) => entry.jurisdiction === request.jurisdiction)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));

  if (scoped.length === 0) {
    return Object.freeze({
      status: RuleResolutionStatus.Unsupported,
      requestedDate: request.date,
      requestedJurisdiction: request.jurisdiction,
      reason: RuleUnsupportedReason.UnsupportedJurisdiction,
    });
  }

  for (const entry of scoped) {
    if (request.date >= entry.effectiveFrom && request.date <= entry.effectiveTo) {
      return Object.freeze({
        status: RuleResolutionStatus.Current,
        requestedDate: request.date,
        requestedJurisdiction: request.jurisdiction,
        entry,
      });
    }
  }

  const earliest = scoped[0];
  const latest = scoped[scoped.length - 1];
  const latestKnownInterval: EffectiveDateInterval = Object.freeze({
    effectiveFrom: latest.effectiveFrom,
    effectiveTo: latest.effectiveTo,
  });

  if (request.date < earliest.effectiveFrom) {
    return Object.freeze({
      status: RuleResolutionStatus.Unsupported,
      requestedDate: request.date,
      requestedJurisdiction: request.jurisdiction,
      reason: RuleUnsupportedReason.DateBeforeCoverage,
      earliestKnownDate: earliest.effectiveFrom,
      latestKnownInterval,
    });
  }

  if (request.date > latest.effectiveTo) {
    if (request.allowProjection === true) {
      return Object.freeze({
        status: RuleResolutionStatus.Projected,
        requestedDate: request.date,
        requestedJurisdiction: request.jurisdiction,
        entry: latest,
        projectedFromInterval: latestKnownInterval,
      });
    }
    return Object.freeze({
      status: RuleResolutionStatus.Unsupported,
      requestedDate: request.date,
      requestedJurisdiction: request.jurisdiction,
      reason: RuleUnsupportedReason.FutureDateNotProjected,
      earliestKnownDate: earliest.effectiveFrom,
      latestKnownInterval,
    });
  }

  return Object.freeze({
    status: RuleResolutionStatus.Unsupported,
    requestedDate: request.date,
    requestedJurisdiction: request.jurisdiction,
    reason: RuleUnsupportedReason.DateInCoverageGap,
    earliestKnownDate: earliest.effectiveFrom,
    latestKnownInterval,
  });
}
