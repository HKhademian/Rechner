/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Maternity Protection Engine
 *
 * Implements statutory maternity protection benefit determination under §§ 19, 20 MuSchG,
 * dividing 100% net wage replacement into statutory health insurance share (Mutterschaftsgeld)
 * and employer supplement (Arbeitgeberzuschuss).
 */

import {
  type NetSalary,
  type EuroAmount,
  toEuroAmount,
  toStatutoryCitation,
} from "#engine/types";

/**
 * Maternity Protection Wage Replacement Breakdown (§§ 19, 20 MuSchG).
 * Guarantees 100% net wage replacement for 6 weeks before delivery and 8 weeks post-delivery.
 */
export interface MutterschutzBenefit {
  /** Statutory health insurance daily benefit share (Mutterschaftsgeld: max €13/calendar day ~ €390/mo from GKV). */
  readonly healthInsuranceShare: EuroAmount;
  /** Employer differential supplement covering remaining net wage (§ 20 MuSchG Arbeitgeberzuschuss). */
  readonly employerSupplement: EuroAmount;
  /** Total combined monthly maternity protection benefit in EUR (100% of pre-birth net wage). */
  readonly totalMaternityBenefit: EuroAmount;
  /** Statutory legal citation reference. */
  readonly statutoryCitation: string;
}

/**
 * Computes monthly maternity protection benefits and itemizes the GKV health insurance
 * and employer supplement components under §§ 19, 20 MuSchG.
 *
 * @param preBirthNetSalary - Mother's regular monthly take-home net salary in active tax bracket.
 * @returns Complete `MutterschutzBenefit` structure.
 */
export function computeMonthlyMutterschutz(
  preBirthNetSalary: NetSalary,
): MutterschutzBenefit {
  const net = preBirthNetSalary as number;
  if (net <= 0) {
    return {
      healthInsuranceShare: toEuroAmount(0),
      employerSupplement: toEuroAmount(0),
      totalMaternityBenefit: toEuroAmount(0),
      statutoryCitation: "MuSchG § 19, § 20",
    };
  }

  // Statutory health insurance pays up to €13 per calendar day (€390 for 30-day month)
  const gkvShare = Math.min(net, 390);
  const employerShare = Math.max(0, net - gkvShare);

  return {
    healthInsuranceShare: toEuroAmount(gkvShare),
    employerSupplement: toEuroAmount(employerShare),
    totalMaternityBenefit: toEuroAmount(net),
    statutoryCitation:
      "MuSchG § 19 (Mutterschaftsgeld) & § 20 (Arbeitgeberzuschuss)",
  };
}
