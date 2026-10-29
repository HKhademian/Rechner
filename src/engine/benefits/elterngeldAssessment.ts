/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Assessment Period Engine
 *
 * Implements the statutory 12-month pre-birth assessment window (Bemessungszeitraum § 2b BEEG),
 * the predominant tax class rule (§ 2c Abs. 3 BEEG), and the exclusion
 * of non-recurrent special bonuses (Sonstige Bezüge § 2c Abs. 1 Satz 2 BEEG).
 */

import {
  type NetSalary,
  type EuroAmount,
  TaxClass,
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
 * Evaluates the predominant tax class across the 12-month assessment period under § 2c Abs. 3 BEEG.
 * The most frequent earned-income class applies; a tie uses the most recent class.
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
      legalCitation: "BEEG § 2c Abs. 3",
    };
  }

  // Only ordinary earned-income months establish a deduction characteristic (§ 2c(3)).
  // Walk newest first so equal counts keep the latest applicable class.
  const earned = records.filter((record) => !record.isOneOffBonus && record.earnedNetSalary > 0)
    .sort((a, b) => b.monthIndex - a.monthIndex);
  const counts = new Map<TaxClass, number>();
  for (const record of earned) {
    counts.set(record.taxClass, (counts.get(record.taxClass) ?? 0) + 1);
  }
  let dominantClass: TaxClass = TaxClass.IV;
  let maxCount = 0;
  for (const [taxClass, count] of counts) {
    if (count > maxCount) {
      dominantClass = taxClass;
      maxCount = count;
    }
  }
  const isSyntheticClassApplied = dominantClass === TaxClass.III && maxCount > 0;

  return {
    dominantClass,
    dominantClassCount: maxCount,
    isSyntheticClassApplied,
    legalCitation:
      "BEEG § 2c Abs. 3 (predominant deduction characteristic; latest wins a tie)",
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
