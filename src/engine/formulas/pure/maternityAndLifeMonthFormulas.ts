import {
  type CalendarMonth,
  type EuroAmount,
  type FullCalendarYear,
  type IsoCalendarDate,
  type MonthId,
  toCalendarMonth,
  toEuroAmount,
  toFullCalendarYear,
  toIsoCalendarDate,
  toMonthId,
} from "#engine/types";

/**
 * Tier 1 Pure Mathematical Gregorian Date, Mutterschutz (§§ 3, 19, 20 MuSchG),
 * and BEEG Life-Month (§§ 2b, 4 BEEG) Formulas (Context-Unaware).
 *
 * All calendar arithmetic runs strictly in UTC so results are 100% deterministic
 * across host timezones and daylight-saving transitions.
 */

export interface IsoDateParts {
  readonly year: FullCalendarYear;
  readonly month: CalendarMonth;
  readonly day: number;
}

export interface CalendarMonthOverlap {
  readonly year: FullCalendarYear;
  readonly month: CalendarMonth;
  readonly monthId: MonthId;
  readonly overlapDays: number;
  readonly totalDaysInMonth: number;
  readonly overlapFraction: number;
}

export interface FullCalendarMonthEntry {
  readonly year: FullCalendarYear;
  readonly month: CalendarMonth;
  readonly monthId: MonthId;
}

export interface MutterschutzWindowInputs {
  readonly expectedDueDate: IsoCalendarDate;
  /** Pre-birth protection days (§ 3 Abs. 1 MuSchG: 42 days = 6 weeks). */
  readonly preBirthDays?: number;
  /** Post-birth protection days (§ 3 Abs. 2 MuSchG: 56 days standard, 84 days twins/premature). */
  readonly postBirthDays?: number;
  /** Shorthand override: sets postBirthDays to 84 when true and postBirthDays is omitted. */
  readonly isMultipleOrPrematureBirth?: boolean;
}

export interface MutterschutzWindowResult {
  readonly expectedDueDate: IsoCalendarDate;
  readonly preBirthStart: IsoCalendarDate;
  readonly postBirthEnd: IsoCalendarDate;
  readonly firstElternzeitDay: IsoCalendarDate;
  readonly preBirthDays: number;
  readonly postBirthDays: number;
  readonly totalProtectedDays: number;
  /** Exact 3 completed calendar months strictly before `preBirthStart`'s calendar month (§ 20 Abs. 1 Satz 2 MuSchG). */
  readonly threeMonthReferenceMonths: readonly FullCalendarMonthEntry[];
  /** Exact overlap days for every calendar month touched by `[preBirthStart, postBirthEnd]`. */
  readonly monthlyBreakdown: readonly CalendarMonthOverlap[];
}

export interface MutterschutzMonthlyPayInputs {
  /** Reference full-month net salary from the 3 completed pre-Mutterschutz calendar months (§ 20 MuSchG). */
  readonly referenceMonthlyNet: EuroAmount;
  /** Exact number of Mutterschutz days inside the target calendar month. */
  readonly mutterschutzDaysInMonth: number;
  /** Total calendar days in the target calendar month (28..31). */
  readonly totalDaysInMonth: number;
  /** Statutory GKV Mutterschaftsgeld daily rate (§ 24i SGB V / § 19 MuSchG, default €13/day). */
  readonly gkvDailyRate?: EuroAmount;
}

export interface MutterschutzMonthlyPayResult {
  readonly totalMonthlyBenefit: EuroAmount;
  readonly gkvShare: EuroAmount;
  readonly employerSupplement: EuroAmount;
  readonly mutterschutzFraction: number;
}

export interface ElterngeldLifeMonthInterval {
  readonly lifeMonthNumber: number;
  readonly startDate: IsoCalendarDate;
  readonly endDate: IsoCalendarDate;
  readonly totalDays: number;
  /** Calendar month in which the life month starts (primary statutory posting month under § 11 EStG). */
  readonly startMonthId: MonthId;
  readonly startYear: FullCalendarYear;
  readonly startMonth: CalendarMonth;
  /** Calendar month in which the life month ends. */
  readonly endMonthId: MonthId;
  readonly monthlyOverlaps: readonly CalendarMonthOverlap[];
}

export interface ReturnDateLifeMonthOverlapResult {
  readonly overlapsActiveBasisLifeMonth: boolean;
  readonly overlappedLifeMonth?: ElterngeldLifeMonthInterval;
  readonly overlapDaysInLifeMonth: number;
  readonly suggestedSafeReturnDate: IsoCalendarDate;
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/** Extracts validated numeric year, month (1..12), and day (1..31) from an `IsoCalendarDate`. */
export function parseIsoDateParts(date: IsoCalendarDate): IsoDateParts {
  const valid = toIsoCalendarDate(date);
  const [yStr, mStr, dStr] = valid.split("-");
  return Object.freeze({
    year: toFullCalendarYear(Number(yStr)),
    month: toCalendarMonth(Number(mStr)),
    day: Number(dStr),
  });
}

/** Constructs a validated `IsoCalendarDate` from numeric Gregorian year, month (1..12), and day. */
export function buildIsoDate(year: number, month: number, day: number): IsoCalendarDate {
  const y = String(Math.trunc(year)).padStart(4, "0");
  const m = String(Math.trunc(month)).padStart(2, "0");
  const d = String(Math.trunc(day)).padStart(2, "0");
  return toIsoCalendarDate(`${y}-${m}-${d}`);
}

/** Returns exact number of days in a Gregorian calendar month (28, 29, 30, or 31). */
export function daysInCalendarMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new TypeError(`Invalid calendar month: ${month}`);
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Shifts an `IsoCalendarDate` by a signed integer number of calendar days in UTC. */
export function addCalendarDays(date: IsoCalendarDate, days: number): IsoCalendarDate {
  if (!Number.isInteger(days)) {
    throw new TypeError(`Day offset must be an integer, received ${days}.`);
  }
  const { year, month, day } = parseIsoDateParts(date);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return buildIsoDate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/**
 * Shifts an `IsoCalendarDate` by a signed integer number of calendar months, clamping
 * month-end overflow per § 187 / § 188 BGB (e.g. `2027-01-31 + 1m -> 2027-02-28`).
 */
export function addCalendarMonthsClamped(
  date: IsoCalendarDate,
  months: number,
): IsoCalendarDate {
  if (!Number.isInteger(months)) {
    throw new TypeError(`Month offset must be an integer, received ${months}.`);
  }
  const { year, month, day } = parseIsoDateParts(date);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
  const maxDay = daysInCalendarMonth(targetYear, targetMonth);
  return buildIsoDate(targetYear, targetMonth, Math.min(day, maxDay));
}

/** Signed difference in calendar days (`end - start`, so `2027-06-28` to `2027-06-29` = `1`). */
export function diffCalendarDays(start: IsoCalendarDate, end: IsoCalendarDate): number {
  const s = parseIsoDateParts(start);
  const e = parseIsoDateParts(end);
  const msPerDay = 86_400_000;
  const startUtc = Date.UTC(s.year, s.month - 1, s.day);
  const endUtc = Date.UTC(e.year, e.month - 1, e.day);
  return Math.round((endUtc - startUtc) / msPerDay);
}

/** Counts inclusive overlap days between `[intervalStart, intervalEnd]` and a Gregorian calendar month. */
export function overlapDaysInCalendarMonth(
  intervalStart: IsoCalendarDate,
  intervalEnd: IsoCalendarDate,
  year: number,
  month: number,
): number {
  if (diffCalendarDays(intervalStart, intervalEnd) < 0) {
    return 0;
  }
  const monthStart = buildIsoDate(year, month, 1);
  const monthEnd = buildIsoDate(year, month, daysInCalendarMonth(year, month));
  const effectiveStart = diffCalendarDays(monthStart, intervalStart) > 0 ? intervalStart : monthStart;
  const effectiveEnd = diffCalendarDays(monthEnd, intervalEnd) < 0 ? intervalEnd : monthEnd;
  const span = diffCalendarDays(effectiveStart, effectiveEnd);
  return span >= 0 ? span + 1 : 0;
}

/** Lists every Gregorian calendar month overlapping inclusive `[intervalStart, intervalEnd]`. */
export function listCalendarMonthsOverlappingInterval(
  intervalStart: IsoCalendarDate,
  intervalEnd: IsoCalendarDate,
): readonly CalendarMonthOverlap[] {
  if (diffCalendarDays(intervalStart, intervalEnd) < 0) {
    return Object.freeze([]);
  }
  const startParts = parseIsoDateParts(intervalStart);
  const endParts = parseIsoDateParts(intervalEnd);
  const startOrdinal = startParts.year * 12 + (startParts.month - 1);
  const endOrdinal = endParts.year * 12 + (endParts.month - 1);
  const result: CalendarMonthOverlap[] = [];

  for (let ord = startOrdinal; ord <= endOrdinal; ord++) {
    const year = toFullCalendarYear(Math.floor(ord / 12));
    const month = toCalendarMonth((ord % 12) + 1);
    const totalDaysInMonth = daysInCalendarMonth(year, month);
    const overlapDays = overlapDaysInCalendarMonth(intervalStart, intervalEnd, year, month);
    if (overlapDays > 0) {
      result.push(
        Object.freeze({
          year,
          month,
          monthId: toMonthId(month, year),
          overlapDays,
          totalDaysInMonth,
          overlapFraction: overlapDays / totalDaysInMonth,
        }),
      );
    }
  }
  return Object.freeze(result);
}

/**
 * Lists ONLY complete calendar months (day 1 through last day of month) fully enclosed inside
 * `[intervalStart, intervalEnd]` (used for § 17 Abs. 1 BEEG 1/12 vacation reduction).
 */
export function listFullCalendarMonthsInsideInterval(
  intervalStart: IsoCalendarDate,
  intervalEnd: IsoCalendarDate,
): readonly FullCalendarMonthEntry[] {
  const overlaps = listCalendarMonthsOverlappingInterval(intervalStart, intervalEnd);
  return Object.freeze(
    overlaps
      .filter((entry) => entry.overlapDays === entry.totalDaysInMonth)
      .map((entry) =>
        Object.freeze({
          year: entry.year,
          month: entry.month,
          monthId: entry.monthId,
        })),
  );
}

/**
 * Evaluates exact German Mutterschutz dates (§ 3 Abs. 1 & 2 MuSchG), the 3 completed pre-Mutterschutz
 * calendar months (§ 20 Abs. 1 Satz 2 MuSchG), and exact per-calendar-month day overlaps.
 */
export function evaluateMutterschutzWindowFormula(
  inputs: Readonly<MutterschutzWindowInputs>,
): MutterschutzWindowResult {
  const expectedDueDate = toIsoCalendarDate(inputs.expectedDueDate);
  const preBirthDays = inputs.preBirthDays ?? 42;
  const postBirthDays =
    inputs.postBirthDays ?? (inputs.isMultipleOrPrematureBirth ? 84 : 56);

  if (!Number.isInteger(preBirthDays) || preBirthDays < 0) {
    throw new TypeError("preBirthDays must be a non-negative integer.");
  }
  if (!Number.isInteger(postBirthDays) || postBirthDays < 0) {
    throw new TypeError("postBirthDays must be a non-negative integer.");
  }

  const preBirthStart = addCalendarDays(expectedDueDate, -preBirthDays);
  const postBirthEnd = addCalendarDays(expectedDueDate, postBirthDays);
  const firstElternzeitDay = addCalendarDays(postBirthEnd, 1);
  const totalProtectedDays = diffCalendarDays(preBirthStart, postBirthEnd) + 1;

  // Exact 3 completed calendar months strictly before preBirthStart's calendar month (§ 20 Abs. 1 Satz 2 MuSchG)
  const preParts = parseIsoDateParts(preBirthStart);
  const preMonthOrdinal = preParts.year * 12 + (preParts.month - 1);
  const threeMonthReferenceMonths: FullCalendarMonthEntry[] = [];
  for (let offset = 3; offset >= 1; offset--) {
    const ord = preMonthOrdinal - offset;
    const year = toFullCalendarYear(Math.floor(ord / 12));
    const month = toCalendarMonth(((ord % 12) + 12) % 12 + 1);
    threeMonthReferenceMonths.push(
      Object.freeze({
        year,
        month,
        monthId: toMonthId(month, year),
      }),
    );
  }

  const monthlyBreakdown = listCalendarMonthsOverlappingInterval(preBirthStart, postBirthEnd);

  return Object.freeze({
    expectedDueDate,
    preBirthStart,
    postBirthEnd,
    firstElternzeitDay,
    preBirthDays,
    postBirthDays,
    totalProtectedDays,
    threeMonthReferenceMonths: Object.freeze(threeMonthReferenceMonths),
    monthlyBreakdown,
  });
}

/**
 * Evaluates exact prorated monthly Mutterschutz pay (§§ 19, 20 MuSchG) for a calendar month
 * partially or fully covered by statutory maternity protection.
 */
export function evaluateMutterschutzMonthlyPayFormula(
  inputs: Readonly<MutterschutzMonthlyPayInputs>,
): MutterschutzMonthlyPayResult {
  if (!Number.isFinite(inputs.referenceMonthlyNet) || inputs.referenceMonthlyNet < 0) {
    throw new TypeError("referenceMonthlyNet must be non-negative.");
  }
  if (!Number.isInteger(inputs.totalDaysInMonth) || inputs.totalDaysInMonth < 28 || inputs.totalDaysInMonth > 31) {
    throw new TypeError("totalDaysInMonth must be an integer between 28 and 31.");
  }
  if (
    !Number.isInteger(inputs.mutterschutzDaysInMonth) ||
    inputs.mutterschutzDaysInMonth < 0 ||
    inputs.mutterschutzDaysInMonth > inputs.totalDaysInMonth
  ) {
    throw new TypeError("mutterschutzDaysInMonth must be between 0 and totalDaysInMonth.");
  }
  const gkvDailyRate = inputs.gkvDailyRate ?? toEuroAmount(13);
  if (!Number.isFinite(gkvDailyRate) || gkvDailyRate < 0) {
    throw new TypeError("gkvDailyRate must be non-negative.");
  }

  if (inputs.mutterschutzDaysInMonth === 0) {
    return Object.freeze({
      totalMonthlyBenefit: toEuroAmount(0),
      gkvShare: toEuroAmount(0),
      employerSupplement: toEuroAmount(0),
      mutterschutzFraction: 0,
    });
  }

  const mutterschutzFraction = inputs.mutterschutzDaysInMonth / inputs.totalDaysInMonth;
  const totalBenefit = roundToCent(inputs.referenceMonthlyNet * mutterschutzFraction);
  const rawGkv = roundToCent(gkvDailyRate * inputs.mutterschutzDaysInMonth);
  const gkvShare = Math.min(totalBenefit, rawGkv);
  const employerSupplement = roundToCent(Math.max(0, totalBenefit - gkvShare));

  return Object.freeze({
    totalMonthlyBenefit: toEuroAmount(totalBenefit),
    gkvShare: toEuroAmount(gkvShare),
    employerSupplement: toEuroAmount(employerSupplement),
    mutterschutzFraction,
  });
}

/**
 * Evaluates a single BEEG Life Month (*Lebensmonat*, § 4 Abs. 1 BEEG):
 * Life Month `k` runs from `birthDate + (k-1) months` through `(birthDate + k months) - 1 day`.
 */
export function evaluateElterngeldLifeMonthFormula(
  birthDate: IsoCalendarDate,
  lifeMonthNumber: number,
): ElterngeldLifeMonthInterval {
  if (!Number.isInteger(lifeMonthNumber) || lifeMonthNumber < 1 || lifeMonthNumber > 48) {
    throw new TypeError("lifeMonthNumber must be an integer between 1 and 48.");
  }
  const validBirth = toIsoCalendarDate(birthDate);
  const startDate = addCalendarMonthsClamped(validBirth, lifeMonthNumber - 1);
  const nextStart = addCalendarMonthsClamped(validBirth, lifeMonthNumber);
  const endDate = addCalendarDays(nextStart, -1);
  const totalDays = diffCalendarDays(startDate, endDate) + 1;
  const startParts = parseIsoDateParts(startDate);
  const endParts = parseIsoDateParts(endDate);

  return Object.freeze({
    lifeMonthNumber,
    startDate,
    endDate,
    totalDays,
    startMonthId: toMonthId(startParts.month, startParts.year),
    startYear: startParts.year,
    startMonth: startParts.month,
    endMonthId: toMonthId(endParts.month, endParts.year),
    monthlyOverlaps: listCalendarMonthsOverlappingInterval(startDate, endDate),
  });
}

/** Evaluates sequential BEEG Life Months `1..count` anchored to an exact birth date. */
export function evaluateElterngeldLifeMonthsScheduleFormula(
  birthDate: IsoCalendarDate,
  count: number,
): readonly ElterngeldLifeMonthInterval[] {
  if (!Number.isInteger(count) || count < 1 || count > 48) {
    throw new TypeError("Life month count must be an integer between 1 and 48.");
  }
  const intervals: ElterngeldLifeMonthInterval[] = [];
  for (let lm = 1; lm <= count; lm++) {
    intervals.push(evaluateElterngeldLifeMonthFormula(birthDate, lm));
  }
  return Object.freeze(intervals);
}

/**
 * Evaluates the exact 12-month pre-birth Elterngeld assessment window (§ 2b Abs. 1 Satz 2 Nr. 1 BEEG)
 * for a mother, excluding every calendar month containing even 1 day of Mutterschutz!
 * Example: due `2027-06-28` → Mutterschutz starts `2027-05-17` → `05.2027` excluded → `05.2026`..`04.2027`.
 */
export function evaluateBeegMotherAssessmentWindowFormula(
  expectedDueDate: IsoCalendarDate,
  preBirthDays = 42,
): readonly FullCalendarMonthEntry[] {
  const mutterschutz = evaluateMutterschutzWindowFormula({
    expectedDueDate,
    preBirthDays,
  });
  const preParts = parseIsoDateParts(mutterschutz.preBirthStart);
  const firstExcludedOrdinal = preParts.year * 12 + (preParts.month - 1);
  const months: FullCalendarMonthEntry[] = [];
  for (let offset = 12; offset >= 1; offset--) {
    const ord = firstExcludedOrdinal - offset;
    const year = toFullCalendarYear(Math.floor(ord / 12));
    const month = toCalendarMonth(((ord % 12) + 12) % 12 + 1);
    months.push(
      Object.freeze({
        year,
        month,
        monthId: toMonthId(month, year),
      }),
    );
  }
  return Object.freeze(months);
}

/**
 * Checks whether a planned return-to-work date falls inside an active Basiselterngeld Life Month
 * (e.g. returning `2027-12-24` inside LM 6 `2027-11-28..2027-12-27`), which triggers § 2 Abs. 3 BEEG
 * income clawback against the full-leave Basiselterngeld, and suggests the next safe Life-Month start.
 */
export function checkReturnDateLifeMonthOverlapFormula(
  birthDate: IsoCalendarDate,
  returnDate: IsoCalendarDate,
  activeBasisLifeMonthCount: number,
): ReturnDateLifeMonthOverlapResult {
  const validBirth = toIsoCalendarDate(birthDate);
  const validReturn = toIsoCalendarDate(returnDate);
  if (!Number.isInteger(activeBasisLifeMonthCount) || activeBasisLifeMonthCount < 1) {
    return Object.freeze({
      overlapsActiveBasisLifeMonth: false,
      overlapDaysInLifeMonth: 0,
      suggestedSafeReturnDate: validReturn,
    });
  }

  const intervals = evaluateElterngeldLifeMonthsScheduleFormula(validBirth, activeBasisLifeMonthCount);
  for (const lm of intervals) {
    if (
      diffCalendarDays(lm.startDate, validReturn) >= 0 &&
      diffCalendarDays(validReturn, lm.endDate) >= 0
    ) {
      const overlapDays = diffCalendarDays(validReturn, lm.endDate) + 1;
      const lastLm = intervals[intervals.length - 1];
      return Object.freeze({
        overlapsActiveBasisLifeMonth: true,
        overlappedLifeMonth: lm,
        overlapDaysInLifeMonth: overlapDays,
        suggestedSafeReturnDate: addCalendarDays(lastLm.endDate, 1),
      });
    }
  }

  return Object.freeze({
    overlapsActiveBasisLifeMonth: false,
    overlapDaysInLifeMonth: 0,
    suggestedSafeReturnDate: validReturn,
  });
}
