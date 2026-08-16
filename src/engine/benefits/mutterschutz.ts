import {
  type NetSalary,
  type EuroAmount,
  toEuroAmount,
  toStatutoryCitation
} from '../types';

/**
 * Maternity Protection Wage Replacement (§ 19, § 20 MuSchG)
 * Guarantees 100% net wage replacement for:
 * - 6 weeks (1.5 months) before expected delivery
 * - 8 weeks (2 months) following childbirth
 */
export interface MutterschutzBenefit {
  readonly healthInsuranceShare: EuroAmount; // Mutterschaftsgeld (max €13/day ~ €390/mo from GKV)
  readonly employerSupplement: EuroAmount;   // Arbeitgeberzuschuss (§ 20 MuSchG)
  readonly totalMaternityBenefit: EuroAmount;
  readonly statutoryCitation: string;
}

export function computeMonthlyMutterschutz(
  preBirthNetSalary: NetSalary
): MutterschutzBenefit {
  const net = preBirthNetSalary as number;
  if (net <= 0) {
    return {
      healthInsuranceShare: toEuroAmount(0),
      employerSupplement: toEuroAmount(0),
      totalMaternityBenefit: toEuroAmount(0),
      statutoryCitation: 'MuSchG § 19, § 20'
    };
  }

  // Statutory health insurance pays up to €13 per calendar day (€390 for 30-day month)
  const gkvShare = Math.min(net, 390);
  const employerShare = Math.max(0, net - gkvShare);

  return {
    healthInsuranceShare: toEuroAmount(gkvShare),
    employerSupplement: toEuroAmount(employerShare),
    totalMaternityBenefit: toEuroAmount(net),
    statutoryCitation: 'MuSchG § 19 (Mutterschaftsgeld) & § 20 (Arbeitgeberzuschuss)'
  };
}
