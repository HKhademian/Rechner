import {
  type FullCalendarYear,
  toFullCalendarYear,
  toEuroAmount,
} from "#engine/types";
import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import profiles from "../../data/employmentThresholds.json" with { type: "json" };

/** Employment thresholds have their own effective years, independent of available annual PAP providers. */
export function getEmploymentThresholds(year: FullCalendarYear) {
  const sourceYear = Object.keys(profiles).map(Number).filter((value) => value <= year).sort((a, b) => b - a)[0];
  if (sourceYear === undefined) {
    throw new TypeError(`No employment thresholds are available for ${year}.`);
  }
  const data = profiles[String(sourceYear) as keyof typeof profiles];
  const parameter = (raw: typeof data.marginal) => {
    const value = toEuroAmount(raw.value);
    if (value <= 0) {
      throw new TypeError("Employment thresholds must be positive.");
    }
    return Object.freeze({ value,
      label: raw.label,
      source: toSourceUrl(raw.source),
      overridden: false });
  };
  return Object.freeze({ calendarYear: year,
    sourceYear: toFullCalendarYear(sourceYear),
    projected: year !== sourceYear,
    marginal: parameter(data.marginal),
    transition: parameter(data.transition) });
}
