import {
  type NetSalary,
  type EuroAmount,
  toEuroAmount,
  toStatutoryCitation
} from '#engine/types';

/**
 * Statutory Wage Replacement Rate (§ 2 Abs. 1 & 2 BEEG)
 * Sliding scale from 65% to 100% based on pre-birth net income.
 */
export function computeStatutoryReplacementRate(preBirthNet: NetSalary): number {
  const net = preBirthNet as number;
  if (net <= 0) return 0.67;

  // Low income scale (§ 2 Abs. 2: < 1.000 € -> increases up to 100%)
  if (net < 1000) {
    const increase = (1000 - net) * 0.0005; // +0.1% per 2 €
    return Math.min(1.00, 0.67 + increase);
  }

  // Standard zone: 1.000 € to 1.200 €
  if (net <= 1200) {
    return 0.67;
  }

  // High income scale (§ 2 Abs. 1: 1.200 € to 1.240 € -> decreases to 65%)
  if (net < 1240) {
    const decrease = (net - 1200) * 0.0005; // -0.1% per 2 €
    return Math.max(0.65, 0.67 - decrease);
  }

  // > 1.240 € -> 65%
  return 0.65;
}

/**
 * Basiselterngeld and ElterngeldPlus Determination (§ 4, § 4a BEEG)
 */
export interface ElterngeldEntitlement {
  readonly preBirthNet: NetSalary;
  readonly partTimeNet: NetSalary;
  readonly netIncomeLoss: EuroAmount;
  readonly replacementRate: number;
  readonly basiselterngeld: EuroAmount;
  readonly elterngeldPlus: EuroAmount;
  readonly isMaxCapped: boolean;
  readonly isMinFloorApplied: boolean;
  readonly statutoryCitation: string;
}

/**
 * Evaluates Statutory Elterngeld / ElterngeldPlus Hours Eligibility (§ 1 Abs. 1 Nr. 4 BEEG)
 * Weekly working hours during parental allowance may not exceed 32 hours per week.
 */
export function isElterngeldHoursEligible(weeklyHours: number): boolean {
  return weeklyHours >= 0 && weeklyHours <= 32;
}

/**
 * Evaluates Statutory Partnerschaftsbonus Eligibility (§ 4b BEEG)
 * Both parents must simultaneously work between 24 and 32 hours per week.
 */
export function isPartnerschaftsbonusEligible(motherHours: number, fatherHours: number): boolean {
  return motherHours >= 24 && motherHours <= 32 && fatherHours >= 24 && fatherHours <= 32;
}

export function computeElterngeldBenefits(
  preBirthNet: NetSalary,
  partTimeNetDuringLeave: NetSalary = (0 as unknown as NetSalary),
  weeklyHours?: number
): ElterngeldEntitlement {
  const pre = preBirthNet as number;
  const pt = partTimeNetDuringLeave as number;

  // Statutory Exclusion (§ 1 Abs. 1 Nr. 4 BEEG):
  // Working more than 32 hours/week disqualifies from parental allowance entirely.
  if (weeklyHours !== undefined && weeklyHours > 32) {
    return {
      preBirthNet,
      partTimeNet: partTimeNetDuringLeave,
      netIncomeLoss: toEuroAmount(0),
      replacementRate: 0,
      basiselterngeld: toEuroAmount(0),
      elterngeldPlus: toEuroAmount(0),
      isMaxCapped: false,
      isMinFloorApplied: false,
      statutoryCitation: 'BEEG § 1 Abs. 1 Nr. 4 (Ausschluss bei Erwerbstätigkeit > 32 Wochenstunden)'
    };
  }

  const loss = Math.max(0, pre - pt);
  const rate = computeStatutoryReplacementRate(preBirthNet);

  const rawBenefit = loss * rate;

  // Basiselterngeld: min €300, max €1.800 (§ 2 Abs. 1 BEEG)
  const basis = Math.min(1800, Math.max(300, Math.round(rawBenefit)));

  // ElterngeldPlus: min €150, max €900 (§ 4a BEEG - exactly 50% of monthly full entitlement cap)
  const plus = Math.min(900, Math.max(150, Math.round(rawBenefit)));

  const isMaxCapped = plus === 900;
  const isMinFloorApplied = plus === 150;

  return {
    preBirthNet,
    partTimeNet: partTimeNetDuringLeave,
    netIncomeLoss: toEuroAmount(loss),
    replacementRate: rate,
    basiselterngeld: toEuroAmount(basis),
    elterngeldPlus: toEuroAmount(plus),
    isMaxCapped,
    isMinFloorApplied,
    statutoryCitation: 'BEEG § 2 (Ersatzrate), § 4 (Basiselterngeld), § 4a (ElterngeldPlus)'
  };
}
