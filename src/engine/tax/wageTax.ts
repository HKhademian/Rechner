import {
  type GrossSalary,
  type NetSalary,
  type TaxClass,
  type EuroAmount,
  toEuroAmount,
  toNetSalary,
  toStatutoryCitation
} from '../types.ts';

/**
 * Statutory Income Tax Tariff (§ 32a Abs. 1 EStG) - 2024–2026 Tariff Formula
 * Calculates annual income tax on taxable income (ZvE).
 */
export function computeAnnualIncomeTax(zve: number): EuroAmount {
  if (zve <= 0) return toEuroAmount(0);

  const grundfreibetrag = 11784; // 2024-2026 Statutory Basic Tax-Free Allowance (§ 32a Abs. 1 Nr. 1)

  // Zone 1: Nullzone
  if (zve <= grundfreibetrag) {
    return toEuroAmount(0);
  }

  // Zone 2: Progressionszone 1 (Grundfreibetrag bis 17.005 €)
  if (zve <= 17005) {
    const y = (zve - grundfreibetrag) / 10000;
    const est = (995.21 * y + 1400) * y;
    return toEuroAmount(Math.floor(est));
  }

  // Zone 3: Progressionszone 2 (17.006 € bis 66.760 €)
  if (zve <= 66760) {
    const z = (zve - 17005) / 10000;
    const est = (208.85 * z + 2397) * z + 1015.36;
    return toEuroAmount(Math.floor(est));
  }

  // Zone 4: Proportionalzone 1 (66.761 € bis 277.825 € - 42% Spitzensteuersatz)
  if (zve <= 277825) {
    const est = 0.42 * zve - 10624.13;
    return toEuroAmount(Math.floor(est));
  }

  // Zone 5: Proportionalzone 2 (> 277.825 € - 45% Reichensteuer)
  const est = 0.45 * zve - 18958.88;
  return toEuroAmount(Math.floor(est));
}

/**
 * Statutory Solidarity Surcharge (§ 32a, SolzG 1995 § 3, § 4)
 */
export function computeSolidaritySurcharge(annualTax: EuroAmount, isMarriedJoint: boolean = true): EuroAmount {
  const exemptionLimit = isMarriedJoint ? 36260 : 18130; // Solz exemption threshold (§ 3 Abs. 3 SolzG)
  if (annualTax <= exemptionLimit) {
    return toEuroAmount(0);
  }

  // Milderungszone (§ 4 SolzG): 11.9% of excess over exemption limit
  const maxSolz = Math.floor(annualTax * 0.055);
  const milderung = Math.floor((annualTax - exemptionLimit) * 0.119);
  return toEuroAmount(Math.min(maxSolz, Math.max(0, milderung)));
}

/**
 * Monthly Social Insurance Contribution Determination
 * Caps at statutory Beitragsbemessungsgrenzen (BBG).
 */
export interface SocialInsuranceDeductions {
  readonly healthInsurance: EuroAmount;
  readonly pensionInsurance: EuroAmount;
  readonly unemploymentInsurance: EuroAmount;
  readonly careInsurance: EuroAmount;
  readonly totalSocialSecurity: EuroAmount;
}

export function computeMonthlySocialSecurity(
  monthlyGross: GrossSalary,
  childrenCount: number = 0
): SocialInsuranceDeductions {
  const gross = monthlyGross as number;

  // Monthly BBG 2024-2026
  const healthPensionBBG = 5175;  // Health & Care Assessment Ceiling (€62.100 / yr)
  const generalPensionBBG = 7550; // Pension & Unemployment Assessment Ceiling (€90.600 / yr)

  const assessedHealthGross = Math.min(gross, healthPensionBBG);
  const assessedPensionGross = Math.min(gross, generalPensionBBG);

  // Employee statutory shares:
  // GKV: 14.6% / 2 + 1.7% / 2 (Zusatzbeitrag) = 7.3% + 0.85% = 8.15%
  const health = Math.round(assessedHealthGross * 0.0815);

  // GRV: 18.6% / 2 = 9.30%
  const pension = Math.round(assessedPensionGross * 0.0930);

  // AV: 2.6% / 2 = 1.30%
  const unemployment = Math.round(assessedPensionGross * 0.0130);

  // PV: Base 2.2% employee share (Childless: +0.6% surcharge = 2.8%; With children: discount down to 1.2%)
  let careRate = 0.022;
  if (childrenCount === 0) {
    careRate = 0.028; // Childless surcharge (§ 55 Abs. 3 SGB XI)
  } else {
    // SGB XI § 55 Abs. 3: -0.25% per child from 2nd to 5th child
    const discount = Math.min(0.010, Math.max(0, childrenCount - 1) * 0.0025);
    careRate = Math.max(0.012, 0.022 - discount);
  }
  const care = Math.round(assessedHealthGross * careRate);

  const total = health + pension + unemployment + care;

  return {
    healthInsurance: toEuroAmount(health),
    pensionInsurance: toEuroAmount(pension),
    unemploymentInsurance: toEuroAmount(unemployment),
    careInsurance: toEuroAmount(care),
    totalSocialSecurity: toEuroAmount(total)
  };
}

/**
 * Monthly Net Salary Determination based on Tax Class (§ 38b EStG)
 */
export function computeMonthlyNetSalary(
  monthlyGross: GrossSalary,
  taxClass: TaxClass,
  childrenCount: number = 0
): NetSalary {
  const gross = monthlyGross as number;
  if (gross <= 0) return toNetSalary(0);

  const social = computeMonthlySocialSecurity(monthlyGross, childrenCount);
  const annualGross = gross * 12;

  // Approximate annual taxable income (ZvE) after standard allowances (§ 9a, § 10 EStG):
  const arbeitnehmerPauschbetrag = 1230; // § 9a Nr. 1a EStG
  const sonderausgabenPauschbetrag = 36; // § 10c EStG
  const annualSocial = (social.totalSocialSecurity as number) * 12;

  let approxZvE = Math.max(0, annualGross - arbeitnehmerPauschbetrag - sonderausgabenPauschbetrag - annualSocial * 0.88);

  let annualWageTax = 0;

  switch (taxClass) {
    case 'I':
    case 'IV':
      annualWageTax = computeAnnualIncomeTax(approxZvE) as number;
      break;
    case 'II':
      // Relief for single parents (§ 24b EStG: Entlastungsbetrag für Alleinerziehende 4.260 €)
      approxZvE = Math.max(0, approxZvE - 4260);
      annualWageTax = computeAnnualIncomeTax(approxZvE) as number;
      break;
    case 'III':
      // Tax Class III: Doubled basic allowance / applies splitting formula as sole earner (§ 38b Abs. 1 Nr. 3 EStG)
      annualWageTax = Math.floor((computeAnnualIncomeTax(approxZvE / 2) as number) * 2);
      break;
    case 'V':
      // Tax Class V: No basic allowance, higher progressive rate to offset Class III (§ 38b Abs. 1 Nr. 5 EStG)
      const baseTax = computeAnnualIncomeTax(approxZvE) as number;
      const progressiveSurcharge = Math.floor(approxZvE * 0.12);
      annualWageTax = baseTax + progressiveSurcharge;
      break;
    case 'VI':
      // Tax Class VI: Second job, zero basic allowance (§ 38b Abs. 1 Nr. 6 EStG)
      annualWageTax = Math.floor(computeAnnualIncomeTax(approxZvE + 11784) as number);
      break;
  }

  const monthlyWageTax = Math.round(annualWageTax / 12);
  const net = Math.max(0, gross - (social.totalSocialSecurity as number) - monthlyWageTax);

  return toNetSalary(net);
}
