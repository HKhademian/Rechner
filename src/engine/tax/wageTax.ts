import {
  type GrossSalary,
  type NetSalary,
  TaxClass,
  WageTaxZone,
  type EuroAmount,
  type WorkingHours,
  type GrossToNetBreakdown,
  type SpousalGrossToNetSet,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toStatutoryCitation
} from '#engine/types';

/**
 * Determines the statutory § 32a EStG income tax tariff zone.
 */
export function computeWageTaxZone(zve: number): WageTaxZone {
  if (zve <= 11784) return WageTaxZone.Zone1Null;
  if (zve <= 17005) return WageTaxZone.Zone2Progression1;
  if (zve <= 66760) return WageTaxZone.Zone3Progression2;
  if (zve <= 277825) return WageTaxZone.Zone4Proportional42;
  return WageTaxZone.Zone5Reichensteuer45;
}

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
  const tax = annualTax as number;
  const exemptionLimit = isMarriedJoint ? 36260 : 18130; // Solz exemption threshold (§ 3 Abs. 3 SolzG)
  if (tax <= exemptionLimit) {
    return toEuroAmount(0);
  }

  // Milderungszone (§ 4 SolzG): 11.9% of excess over exemption limit
  const maxSolz = Math.floor(tax * 0.055);
  const milderung = Math.floor((tax - exemptionLimit) * 0.119);
  return toEuroAmount(Math.min(maxSolz, Math.max(0, milderung)));
}

/**
 * Monthly Social Insurance Contribution Determination
 * Caps at statutory Beitragsbemessungsgrenzen (BBG).
 */
export interface SocialInsuranceDeductions {
  readonly healthInsurance: EuroAmount;
  readonly healthInsuranceRate: number;
  readonly pensionInsurance: EuroAmount;
  readonly pensionInsuranceRate: number;
  readonly unemploymentInsurance: EuroAmount;
  readonly unemploymentInsuranceRate: number;
  readonly careInsurance: EuroAmount;
  readonly careInsuranceRate: number;
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
  // GKV: 14.6% / 2 + 1.7% / 2 (Zusatzbeitrag) = 7.3% + 0.85% = 8.15% (0.0815)
  const healthRate = 0.0815;
  const health = Math.round(assessedHealthGross * healthRate);

  // GRV: 18.6% / 2 = 9.30% (0.0930)
  const pensionRate = 0.0930;
  const pension = Math.round(assessedPensionGross * pensionRate);

  // AV: 2.6% / 2 = 1.30% (0.0130)
  const unemploymentRate = 0.0130;
  const unemployment = Math.round(assessedPensionGross * unemploymentRate);

  // PV: Base 2.2% employee share (Childless: +0.6% surcharge = 2.8%; With children: discount down to 1.2%)
  let careRate = 0.022;
  if (childrenCount === 0) {
    careRate = 0.028; // Childless surcharge (§ 55 Abs. 3 SGB XI)
  } else {
    // SGB XI § 55 Abs. 3: -0.25% per child from 2nd to 5th child
    const discount = Math.min(0.010, Math.max(0, childrenCount - 1) * 0.0025);
    careRate = Math.round(Math.max(0.012, 0.022 - discount) * 10000) / 10000;
  }
  const care = Math.round(assessedHealthGross * careRate);

  const total = health + pension + unemployment + care;

  return {
    healthInsurance: toEuroAmount(health),
    healthInsuranceRate: healthRate,
    pensionInsurance: toEuroAmount(pension),
    pensionInsuranceRate: pensionRate,
    unemploymentInsurance: toEuroAmount(unemployment),
    unemploymentInsuranceRate: unemploymentRate,
    careInsurance: toEuroAmount(care),
    careInsuranceRate: careRate,
    totalSocialSecurity: toEuroAmount(total)
  };
}

/**
 * Computes Annual Wage Tax Withholding under § 38b EStG for a given Tax Class.
 */
export function computeAnnualWageTaxForClass(
  annualGross: number,
  annualSocialSecurity: number,
  taxClass: TaxClass
): { annualTax: number; approxZvE: number } {
  const arbeitnehmerPauschbetrag = 1230; // § 9a Nr. 1a EStG
  const sonderausgabenPauschbetrag = 36; // § 10c EStG
  let approxZvE = Math.max(
    0,
    annualGross - arbeitnehmerPauschbetrag - sonderausgabenPauschbetrag - annualSocialSecurity * 0.88
  );

  let annualWageTax = 0;

  switch (taxClass) {
    case TaxClass.I:
    case TaxClass.IV:
      annualWageTax = computeAnnualIncomeTax(approxZvE) as number;
      break;
    case TaxClass.II:
      // Relief for single parents (§ 24b EStG: Entlastungsbetrag für Alleinerziehende 4.260 €)
      approxZvE = Math.max(0, approxZvE - 4260);
      annualWageTax = computeAnnualIncomeTax(approxZvE) as number;
      break;
    case TaxClass.III:
      // Tax Class III: Doubled basic allowance / applies splitting formula as sole earner (§ 38b Abs. 1 Nr. 3 EStG)
      annualWageTax = Math.floor((computeAnnualIncomeTax(approxZvE / 2) as number) * 2);
      break;
    case TaxClass.V:
      // Tax Class V: No basic allowance, higher progressive rate to offset Class III (§ 38b Abs. 1 Nr. 5 EStG)
      {
        const baseTax = computeAnnualIncomeTax(approxZvE) as number;
        const progressiveSurcharge = Math.floor(approxZvE * 0.12);
        annualWageTax = baseTax + progressiveSurcharge;
      }
      break;
    case TaxClass.VI:
      // Tax Class VI: Second job, zero basic allowance (§ 38b Abs. 1 Nr. 6 EStG)
      annualWageTax = Math.floor(computeAnnualIncomeTax(approxZvE + 11784) as number);
      break;
  }

  return { annualTax: annualWageTax, approxZvE };
}

/**
 * Calculates § 39b Abs. 3 EStG Differential Wage Tax on Non-Recurrent Bonuses (Sonstige Bezüge).
 */
export function computeSonstigeBezuegeTax(
  regularAnnualGross: number,
  regularAnnualSocialSecurity: number,
  bonusAmount: number,
  taxClass: TaxClass
): number {
  if (bonusAmount <= 0) return 0;

  const baseResult = computeAnnualWageTaxForClass(regularAnnualGross, regularAnnualSocialSecurity, taxClass);
  const totalAnnualGross = regularAnnualGross + bonusAmount;
  const totalResult = computeAnnualWageTaxForClass(totalAnnualGross, regularAnnualSocialSecurity, taxClass);

  return Math.max(0, totalResult.annualTax - baseResult.annualTax);
}

/**
 * Comprehensive Itemized Gross-to-Net Breakdown Determination.
 * Handles both regular wage and one-off bonuses per § 38b and § 39b EStG.
 */
export function computeGrossToNetBreakdown(
  monthlyGross: GrossSalary,
  taxClass: TaxClass,
  childrenCount: number = 0,
  oneOffBonus?: EuroAmount
): GrossToNetBreakdown {
  const gross = monthlyGross as number;
  const bonus = oneOffBonus ? (oneOffBonus as number) : 0;
  const annualGross = gross * 12;

  const social = computeMonthlySocialSecurity(monthlyGross, childrenCount);
  const annualSocial = (social.totalSocialSecurity as number) * 12;

  const { annualTax, approxZvE } = computeAnnualWageTaxForClass(annualGross, annualSocial, taxClass);
  const monthlyWageTax = Math.round(annualTax / 12);
  const annualSolz = computeSolidaritySurcharge(toEuroAmount(annualTax), taxClass === TaxClass.III || taxClass === TaxClass.IV || taxClass === TaxClass.V) as number;
  const monthlySolz = Math.round(annualSolz / 12);

  // Bonus Differential Tax (§ 39b Abs. 3 EStG)
  const bonusTax = bonus > 0
    ? computeSonstigeBezuegeTax(annualGross, annualSocial, bonus, taxClass)
    : 0;

  const totalMonthlyTax = monthlyWageTax + monthlySolz + bonusTax;
  const totalDeductions = (social.totalSocialSecurity as number) + totalMonthlyTax;
  const totalGrossWithBonus = gross + bonus;
  const takeHomeNet = Math.max(0, totalGrossWithBonus - totalDeductions);

  // Clean Synthetic Net for Elterngeld (§ 2c BEEG - Excludes Non-Recurrent Bonuses)
  const regularNetTakeHome = Math.max(0, gross - (social.totalSocialSecurity as number) - monthlyWageTax - monthlySolz);
  const elterngeldSyntheticNet = toNetSalary(regularNetTakeHome);

  const effectiveTaxRate = totalGrossWithBonus > 0 ? (totalMonthlyTax / totalGrossWithBonus) * 100 : 0;
  const effectiveTotalDeductionRate = totalGrossWithBonus > 0 ? (totalDeductions / totalGrossWithBonus) * 100 : 0;

  return {
    monthlyGross: toGrossSalary(gross),
    annualGross: toGrossSalary(annualGross),
    taxClass,
    childrenCount,
    healthInsurance: social.healthInsurance,
    healthInsuranceRate: social.healthInsuranceRate,
    pensionInsurance: social.pensionInsurance,
    pensionInsuranceRate: social.pensionInsuranceRate,
    unemploymentInsurance: social.unemploymentInsurance,
    unemploymentInsuranceRate: social.unemploymentInsuranceRate,
    careInsurance: social.careInsurance,
    careInsuranceRate: social.careInsuranceRate,
    totalSocialSecurity: social.totalSocialSecurity,
    taxableIncomeZvE: toEuroAmount(Math.round(approxZvE / 12)),
    wageTaxZone: computeWageTaxZone(approxZvE),
    monthlyWageTax: toEuroAmount(monthlyWageTax),
    monthlySolidaritySurcharge: toEuroAmount(monthlySolz),
    totalTaxWithholding: toEuroAmount(totalMonthlyTax),
    oneOffBonusAmount: bonus > 0 ? toEuroAmount(bonus) : undefined,
    bonusTaxDeduction: bonus > 0 ? toEuroAmount(bonusTax) : undefined,
    monthlyNetTakeHome: toNetSalary(takeHomeNet),
    elterngeldSyntheticNet,
    effectiveTaxRatePercent: Math.round(effectiveTaxRate * 10) / 10,
    effectiveTotalDeductionRatePercent: Math.round(effectiveTotalDeductionRate * 10) / 10,
    statutoryCitation: toStatutoryCitation(
      bonus > 0
        ? 'EStG § 38b (Lohnsteuer), § 39b Abs. 3 (Sonstige Bezüge) & BEEG § 2c'
        : 'EStG § 38b (Lohnsteuerabzug) & § 32a (Tarif)'
    )
  };
}

/**
 * Monthly Net Salary Determination based on Tax Class (§ 38b EStG).
 */
export function computeMonthlyNetSalary(
  monthlyGross: GrossSalary,
  taxClass: TaxClass,
  childrenCount: number = 0,
  oneOffBonus?: EuroAmount
): NetSalary {
  const breakdown = computeGrossToNetBreakdown(monthlyGross, taxClass, childrenCount, oneOffBonus);
  return breakdown.monthlyNetTakeHome;
}

/**
 * Derives complete Spousal Household Net Set across all 6 Tax Class & Hours combinations.
 */
export function deriveSpousalNetSalaries(
  husbandGross: GrossSalary,
  wifeGrossFullTime: GrossSalary,
  wifePtHours: WorkingHours = toWorkingHours(24),
  wifeFtHours: WorkingHours = toWorkingHours(40),
  childrenCount: number = 0
): SpousalGrossToNetSet {
  const hGross = husbandGross;
  const wGrossFT = wifeGrossFullTime;

  const ptRatio = (wifePtHours as number) / (wifeFtHours as number || 40);
  const wGrossPT = toGrossSalary(Math.round((wGrossFT as number) * ptRatio));

  const hBreakdownClass3 = computeGrossToNetBreakdown(hGross, TaxClass.III, childrenCount);
  const hBreakdownClass5 = computeGrossToNetBreakdown(hGross, TaxClass.V, childrenCount);
  const hBreakdownClass4 = computeGrossToNetBreakdown(hGross, TaxClass.IV, childrenCount);

  const wBreakdownClass5FT = computeGrossToNetBreakdown(wGrossFT, TaxClass.V, childrenCount);
  const wBreakdownClass3FT = computeGrossToNetBreakdown(wGrossFT, TaxClass.III, childrenCount);
  const wBreakdownClass4FT = computeGrossToNetBreakdown(wGrossFT, TaxClass.IV, childrenCount);

  const wBreakdownClass5PT = computeGrossToNetBreakdown(wGrossPT, TaxClass.V, childrenCount);
  const wBreakdownClass3PT = computeGrossToNetBreakdown(wGrossPT, TaxClass.III, childrenCount);

  return {
    husbandGross: hGross,
    husbandClass3Net: hBreakdownClass3.monthlyNetTakeHome,
    husbandClass5Net: hBreakdownClass5.monthlyNetTakeHome,
    husbandClass4Net: hBreakdownClass4.monthlyNetTakeHome,
    wifeGrossFullTime: wGrossFT,
    wifeClass5FullTimeNet: wBreakdownClass5FT.monthlyNetTakeHome,
    wifeClass3FullTimeNet: wBreakdownClass3FT.monthlyNetTakeHome,
    wifeClass4FullTimeNet: wBreakdownClass4FT.monthlyNetTakeHome,
    wifeGrossPartTime: wGrossPT,
    wifeClass5PartTimeNet: wBreakdownClass5PT.monthlyNetTakeHome,
    wifeClass3PartTimeNet: wBreakdownClass3PT.monthlyNetTakeHome,
    wifePartTimeWeeklyHours: wifePtHours,
    husbandWeeklyHours: toWorkingHours(32),
    husbandBreakdownClass3: hBreakdownClass3,
    husbandBreakdownClass5: hBreakdownClass5,
    wifeBreakdownClass5FT: wBreakdownClass5FT,
    wifeBreakdownClass3FT: wBreakdownClass3FT
  };
}
