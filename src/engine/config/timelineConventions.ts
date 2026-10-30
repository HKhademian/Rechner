import {
  toMonthDuration,
} from "#engine/types";
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import defaults from "../../data/timelineConventions.json" with { type: "json" };

/** Planning conventions are explicitly assumptions, distinct from published statutory values. */
export function createTimelineConventions(overrides: unknown = {}) {
  if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
    throw new TypeError("Timeline convention overrides must be an object.");
  }
  const input = overrides as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(defaults, key)) {
      throw new TypeError(`Unknown timeline convention: ${key}.`);
    }
  }
  const parse = (key: keyof typeof defaults) => {
    const raw = input[key] === undefined ? defaults[key].value : input[key];
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
      throw new TypeError(`Timeline convention ${key} must be a non-negative whole month count.`);
    }
    return Object.freeze({ ...defaults[key],
      value: toMonthDuration(raw),
      assumption: true,
      statutoryContext: toSourceUrl(defaults[key].statutoryContext) });
  };
  return Object.freeze({ maternityPreBirthMonths: parse("maternityPreBirthMonths"),
    maternityPostBirthMonths: parse("maternityPostBirthMonths"),
    motherOrdinaryPlusMonths: parse("motherOrdinaryPlusMonths"),
    partnershipBonusMonths: parse("partnershipBonusMonths") });
}

export type TimelineConventions = ReturnType<typeof createTimelineConventions>;
export const DEFAULT_TIMELINE_CONVENTIONS = createTimelineConventions();
