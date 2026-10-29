import {
  type Brand,
  type FullCalendarYear,
  type CalendarMonth,
  type GrossSalary,
  type NetSalary,
  type TaxClass,
  type TaxFactor,
  type ChildrenCount,
  TaxClass as Classes,
  toGrossSalary,
} from "#engine/types";
import {
  type PayrollOptions,
} from "#engine/tax/payroll";
import {
  type BenefitRules,
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";

/** Absolute calendar ordering, including months before the visible simulation. */
export type AssessmentMonthOrdinal = Brand<number, "AssessmentMonthOrdinal">;

export function toAssessmentMonthOrdinal(value: number): AssessmentMonthOrdinal {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Assessment calendar month must be a non-negative whole ordinal.");
  }
  return value as AssessmentMonthOrdinal;
}

export function assessmentCalendarMonth(year: FullCalendarYear, month: CalendarMonth): AssessmentMonthOrdinal {
  return toAssessmentMonthOrdinal(year * 12 + month - 1);
}

export const AssessmentExclusion = {
  Maternity: "MATERNITY",
  OlderChildBenefit: "OLDER_CHILD_BENEFIT",
  PregnancyIllness: "PREGNANCY_ILLNESS",
  Service: "SERVICE",
} as const;
export type AssessmentExclusion = typeof AssessmentExclusion[keyof typeof AssessmentExclusion];

export function toAssessmentExclusion(value: string): AssessmentExclusion {
  const exclusion = Object.values(AssessmentExclusion).find((entry) => entry === value);
  if (!exclusion) {
    throw new TypeError("Unknown assessment-month exclusion.");
  }
  return exclusion;
}

export interface AssessmentHistoryMonth {
  readonly ordinal: AssessmentMonthOrdinal;
  /** Only ordinary employment pay, excluding separate bonus amounts. */
  readonly regularGross?: GrossSalary;
  /** Optional manual assessment-net assumptions, explicitly separate from verified gross payroll. */
  readonly manualNetByClass?: Readonly<Partial<Record<TaxClass, NetSalary>>>;
  readonly taxClass: TaxClass;
  readonly factor?: TaxFactor;
  readonly children: ChildrenCount;
  readonly personal: PayrollOptions;
  readonly excluded?: AssessmentExclusion;
  readonly assumed?: boolean;
}

/** Choose the most frequent characteristic; newest earned-income evidence wins a tie. */
export function predominantCharacteristic<Value>(
  records: readonly AssessmentHistoryMonth[],
  pick: (record: AssessmentHistoryMonth) => Value,
  fallback: Value,
): Value {
  const counts = new Map<Value, number>();
  const newest = [...records].sort((a, b) => b.ordinal - a.ordinal);
  for (const record of newest) {
    if ((record.regularGross ?? record.manualNetByClass?.[record.taxClass] ?? 0) <= 0) {
      continue;
    }
    const value = pick(record);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let selected = fallback;
  let largest = 0;
  for (const [value, count] of counts) {
    if (count > largest) {
      selected = value;
      largest = count;
    }
  }
  return selected;
}

/** Walk backward over actual eligible months, replacing each statutory exclusion with an earlier month. */
export function buildAssessmentWindow(
  history: readonly AssessmentHistoryMonth[],
  birth: AssessmentMonthOrdinal,
  repeatInitial?: (month: AssessmentMonthOrdinal) => AssessmentHistoryMonth,
  rules: BenefitRules = DEFAULT_BENEFIT_RULES,
) {
  const byMonth = new Map<AssessmentMonthOrdinal, AssessmentHistoryMonth>();
  for (const record of history) {
    if (byMonth.has(record.ordinal)) {
      throw new TypeError("Assessment history contains duplicate calendar months.");
    }
    byMonth.set(record.ordinal, record);
  }
  const selected: AssessmentHistoryMonth[] = [];
  const excluded: AssessmentHistoryMonth[] = [];
  const missing: AssessmentMonthOrdinal[] = [];
  let cursor = birth - 1;
  while (selected.length + missing.length < rules.assessmentMonths.value) {
    const ordinal = toAssessmentMonthOrdinal(cursor--);
    let record = byMonth.get(ordinal);
    if (!record && repeatInitial) {
      const assumed = repeatInitial(ordinal);
      if (assumed.ordinal !== ordinal || assumed.excluded) {
        throw new TypeError("Initial-history assumptions must describe the requested ordinary calendar month.");
      }
      record = { ...assumed,
        assumed: true };
    }
    if (!record) {
      missing.push(ordinal);
    }
    else if (record.excluded) {
      excluded.push(record);
    }
    else {
      selected.push(Object.freeze({ ...record,
        personal: Object.freeze({ ...record.personal }),
        manualNetByClass: record.manualNetByClass ? Object.freeze({ ...record.manualNetByClass }) : undefined }));
    }
  }
  selected.reverse();
  const taxClass = predominantCharacteristic(selected, (record) => record.taxClass, Classes.IV);
  return Object.freeze({ records: Object.freeze(selected),
    excluded: Object.freeze(excluded),
    missing: Object.freeze(missing),
    assumed: Object.freeze(selected.filter((record) => record.assumed).map((record) => record.ordinal)),
    complete: missing.length === 0,
    taxClass,
    averageRegularGross: missing.length === 0 && selected.every((record) => record.regularGross !== undefined)
      ? toGrossSalary(selected.reduce((sum, record) => sum + (record.regularGross ?? 0), 0) / rules.assessmentMonths.value)
      : undefined });
}
