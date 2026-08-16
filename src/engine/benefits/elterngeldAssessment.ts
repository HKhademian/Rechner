import {
  type NetSalary,
  TaxClass,
  type EuroAmount,
  toEuroAmount,
  toNetSalary,
  toStatutoryCitation
} from '../types.ts';

/**
 * Monthly Record in the 12-Month Assessment Period (Bemessungszeitraum § 2b BEEG)
 */
export interface AssessmentMonthRecord {
  readonly monthIndex: number; // 1..12
  readonly earnedNetSalary: NetSalary;
  readonly taxClass: TaxClass;
  readonly isOneOffBonus: boolean; // § 2c Abs. 1 Satz 2 (Sonstige Bezüge) - exempt from assessment
}

/**
 * Predominant Tax Class Evaluation (§ 2b Abs. 1 Satz 3 BEEG)
 * The tax class active in at least 7 of the 12 months is locked as the dominant tax class.
 */
export function determinePredominantTaxClass(
  records: readonly AssessmentMonthRecord[]
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
      legalCitation: 'BEEG § 2b Abs. 1'
    };
  }

  // Count months per tax class
  const counts: Record<TaxClass, number> = {
    [TaxClass.I]: 0,
    [TaxClass.II]: 0,
    [TaxClass.III]: 0,
    [TaxClass.IV]: 0,
    [TaxClass.V]: 0,
    [TaxClass.VI]: 0
  };

  records.forEach(r => {
    counts[r.taxClass] = (counts[r.taxClass] || 0) + 1;
  });

  let dominantClass: TaxClass = TaxClass.IV;
  let maxCount = 0;

  (Object.keys(counts) as TaxClass[]).forEach(tc => {
    if (counts[tc] > maxCount) {
      maxCount = counts[tc];
      dominantClass = tc;
    }
  });

  // Statutory 7-Month Rule (§ 2b Abs. 1 Satz 3 BEEG)
  const isSyntheticClassApplied = dominantClass === TaxClass.III && maxCount >= 7;

  return {
    dominantClass,
    dominantClassCount: maxCount,
    isSyntheticClassApplied,
    legalCitation: 'BEEG § 2b Abs. 1 Satz 3 (*Überwiegende Steuerklasse*) & BFH VI R 2/13'
  };
}

/**
 * Calculates the Statutory 12-Month Pre-Birth Average Net Income (Bemessungsentgelt § 2 BEEG)
 * Exempts one-off special payments (Sonstige Bezüge § 2c Abs. 1 Satz 2).
 */
export function computeAssessmentBaselineNet(
  records: readonly AssessmentMonthRecord[]
): {
  readonly averageMonthlyNet: NetSalary;
  readonly dominantTaxClass: TaxClass;
  readonly totalEligibleNet: EuroAmount;
  readonly excludedBonusesTotal: EuroAmount;
} {
  if (!records || records.length !== 12) {
    throw new Error(`BEEG § 2b requires exactly 12 assessment months. Received: ${records?.length || 0}`);
  }

  let eligibleSum = 0;
  let excludedBonusSum = 0;

  records.forEach(r => {
    if (r.isOneOffBonus) {
      // Excluded under § 2c Abs. 1 Satz 2 BEEG
      excludedBonusSum += (r.earnedNetSalary as number);
    } else {
      eligibleSum += (r.earnedNetSalary as number);
    }
  });

  const dominant = determinePredominantTaxClass(records);
  const averageMonthly = Math.round(eligibleSum / 12);

  return {
    averageMonthlyNet: toNetSalary(averageMonthly),
    dominantTaxClass: dominant.dominantClass,
    totalEligibleNet: toEuroAmount(eligibleSum),
    excludedBonusesTotal: toEuroAmount(excludedBonusSum)
  };
}
