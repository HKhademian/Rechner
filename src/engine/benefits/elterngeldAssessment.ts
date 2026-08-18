/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Assessment Period Engine
 *
 * Implements the statutory 12-month pre-birth assessment window (Bemessungszeitraum § 2b BEEG),
 * the predominant tax class rule (§ 2b Abs. 1 Satz 3 BEEG, BFH VI R 2/13), and the exclusion
 * of non-recurrent special bonuses (Sonstige Bezüge § 2c Abs. 1 Satz 2 BEEG).
 */

import {
  type NetSalary,
  TaxClass,
  type EuroAmount,
  toEuroAmount,
  toNetSalary,
} from "#engine/types";

/**
 * Monthly Record in the 12-Month Assessment Period (Bemessungszeitraum § 2b BEEG).
 * Tracks individual monthly net income, applied tax class, and bonus flags.
 */
export interface AssessmentMonthRecord {
  /** 1-based index within the 12-month pre-birth window (1..12). */
  readonly monthIndex: number;
  /** Earned net salary in this assessment month in EUR. */
  readonly earnedNetSalary: NetSalary;
  /** Active tax class for withholding in this assessment month (§ 38b EStG). */
  readonly taxClass: TaxClass;
  /** True if payment is a non-recurrent special bonus (Sonstige Bezüge § 2c Abs. 1 Satz 2 BEEG) excluded from baseline. */
  readonly isOneOffBonus: boolean;
}

/**
 * Evaluates the predominant tax class across the 12-month assessment period under § 2b Abs. 1 Satz 3 BEEG.
 * The tax class active for at least 7 of the 12 months is legally locked as the dominant tax class for synthetic net determination.
 *
 * @param records - Array of 12 monthly assessment records.
 * @returns Result object containing the dominant tax class, month count, synthetic flag, and legal citation.
 */
export function determinePredominantTaxClass(
  records: readonly AssessmentMonthRecord[],
): {
  readonly dominantClass: TaxClass;
  readonly dominantClassCount: number;
  readonly isSyntheticClassApplied: boolean;
  readonly legalCitation: string;
} {
  if (!records || records.length === 0) {
    return {
      dominantClass: TaxClass.IV,
      dominantClassCount: 0,
      isSyntheticClassApplied: false,
      legalCitation: "BEEG § 2b Abs. 1",
    };
  }

  // Count months per tax class
  const counts: Record<TaxClass, number> = {
    [TaxClass.I]: 0,
    [TaxClass.II]: 0,
    [TaxClass.III]: 0,
    [TaxClass.IV]: 0,
    [TaxClass.V]: 0,
    [TaxClass.VI]: 0,
  };

  records.forEach((r) => {
    counts[r.taxClass] = (counts[r.taxClass] || 0) + 1;
  });

  let dominantClass: TaxClass = TaxClass.IV;
  let maxCount = 0;

  for (const tc of Object.keys(counts) as TaxClass[]) {
    if (counts[tc] > maxCount) {
      maxCount = counts[tc];
      dominantClass = tc;
    }
  }

  // Statutory 7-Month Rule (§ 2b Abs. 1 Satz 3 BEEG)
  const isSyntheticClassApplied =
    dominantClass === TaxClass.III && maxCount >= 7;

  return {
    dominantClass,
    dominantClassCount: maxCount,
    isSyntheticClassApplied,
    legalCitation:
      "BEEG § 2b Abs. 1 Satz 3 (*Überwiegende Steuerklasse*) & BFH VI R 2/13",
  };
}

/**
 * Calculates the statutory 12-month pre-birth average net income (Bemessungsentgelt § 2 BEEG).
 * Automatically excludes non-recurrent bonus payments (Sonstige Bezüge § 2c Abs. 1 Satz 2 BEEG)
 * and determines the average monthly baseline net salary.
 *
 * @param records - Exactly 12 monthly assessment records for the pre-birth period.
 * @returns Average monthly net, dominant tax class, total eligible net, and excluded bonus totals.
 * @throws {Error} if records length is not exactly 12.
 */
export function computeAssessmentBaselineNet(
  records: readonly AssessmentMonthRecord[],
): {
  readonly averageMonthlyNet: NetSalary;
  readonly dominantTaxClass: TaxClass;
  readonly totalEligibleNet: EuroAmount;
  readonly excludedBonusesTotal: EuroAmount;
} {
  if (!records || records.length !== 12) {
    throw new Error(
      `BEEG § 2b requires exactly 12 assessment months. Received: ${records?.length || 0}`,
    );
  }

  let eligibleSum = 0;
  let excludedBonusSum = 0;

  records.forEach((r) => {
    if (r.isOneOffBonus) {
      // Excluded under § 2c Abs. 1 Satz 2 BEEG
      excludedBonusSum += r.earnedNetSalary;
    }
    else {
      eligibleSum += r.earnedNetSalary;
    }
  });

  const dominant = determinePredominantTaxClass(records);
  const averageMonthly = Math.round(eligibleSum / 12);

  return {
    averageMonthlyNet: toNetSalary(averageMonthly),
    dominantTaxClass: dominant.dominantClass,
    totalEligibleNet: toEuroAmount(eligibleSum),
    excludedBonusesTotal: toEuroAmount(excludedBonusSum),
  };
}
