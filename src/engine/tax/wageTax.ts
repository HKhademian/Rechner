/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Statutory Wage Tax Engine
 *
 * Implements the German statutory income tax tariff (§ 32a EStG), wage tax withholding (§ 38b EStG),
 * solidarity surcharge (SolzG 1995), statutory social security deductions (SGB IV/V/VI/XI),
 * bonus differential tax (Sonstige Bezüge § 39b Abs. 3 EStG), and spousal factor method (§ 39f EStG).
 */

import {
  type GrossSalary,
  type NetSalary,
  type TaxFactor,
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
  toTaxFactor,
  toChildrenCount,
  toPercentageRate,
  toStatutoryCitation,
} from "#engine/types";

/**
 * Determines the statutory income tax tariff zone under § 32a Abs. 1 EStG based on annual taxable income (ZvE).
 *
 * Statutory Zones:
 * - Zone 1: Nullzone (ZvE <= 11.784 €) - Basic tax-free allowance (Grundfreibetrag).
 * - Zone 2: Progressionszone 1 (11.785 € to 17.005 €) - Initial progressive entry rate (14% to ~24%).
 * - Zone 3: Progressionszone 2 (17.006 € to 66.760 €) - Linear progressive bracket (24% to 42%).
 * - Zone 4: Proportionalzone 1 (66.761 € to 277.825 €) - Fixed top tax rate of 42% (Spitzensteuersatz).
 * - Zone 5: Proportionalzone 2 (> 277.825 €) - Fixed wealth tax rate of 45% (Reichensteuer).
 *
 * @param zve - Annual taxable income (zu versteuerndes Einkommen) in EUR.
 * @returns Strongly-typed `WageTaxZone` enum member.
 */
export function computeWageTaxZone(zve: number): WageTaxZone {
  if (zve <= 11784) {
    return WageTaxZone.Zone1Null;
  }
  if (zve <= 17005) {
    return WageTaxZone.Zone2Progression1;
  }
  if (zve <= 66760) {
    return WageTaxZone.Zone3Progression2;
  }
  if (zve <= 277825) {
    return WageTaxZone.Zone4Proportional42;
  }
  return WageTaxZone.Zone5Reichensteuer45;
}

/**
 * Calculates statutory annual income tax under the German income tax tariff (§ 32a Abs. 1 EStG).
 * Implements the 2024–2026 progressive tariff polynomial formulas.
 *
 * @param zve - Annual taxable income (zu versteuerndes Einkommen) in EUR.
 * @returns Exact annual income tax liability in EUR.
 */
export function computeAnnualIncomeTax(zve: number): EuroAmount {
  if (zve <= 0) {
    return toEuroAmount(0);
  }

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
 * Calculates the statutory solidarity surcharge under SolzG 1995 (§ 3, § 4).
 * Incorporates exemption thresholds (€18.130 single / €36.260 married) and the 11.9% mitigation zone (Milderungszone).
 *
 * @param annualTax - Annual income tax liability in EUR.
 * @param isMarriedJoint - True if married joint filing threshold applies.
 * @returns Annual solidarity surcharge in EUR.
 */
export function computeSolidaritySurcharge(
  annualTax: EuroAmount,
  isMarriedJoint: boolean = true,
): EuroAmount {
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
 * Itemized Monthly Statutory Social Insurance Deductions (§§ 20, 55 SGB).
 * Encapsulates statutory employee contributions capped at Beitragsbemessungsgrenzen (BBG).
 */
export interface SocialInsuranceDeductions {
  /** Statutory health insurance employee monthly contribution in EUR (GKV: 7.3% base + 0.85% Zusatzbeitrag = 8.15%). */
  readonly healthInsurance: EuroAmount;
  /** Effective health insurance employee percentage rate (0.0815). */
  readonly healthInsuranceRate: number;
  /** Statutory public pension insurance employee monthly contribution in EUR (GRV: 9.30%). */
  readonly pensionInsurance: EuroAmount;
  /** Effective pension insurance employee percentage rate (0.093). */
  readonly pensionInsuranceRate: number;
  /** Statutory unemployment insurance employee monthly contribution in EUR (AV: 1.30%). */
  readonly unemploymentInsurance: EuroAmount;
  /** Effective unemployment insurance employee percentage rate (0.013). */
  readonly unemploymentInsuranceRate: number;
  /** Statutory long-term nursing care insurance employee contribution in EUR (PV: 2.2% base + child discount/childless surcharge). */
  readonly careInsurance: EuroAmount;
  /** Effective care insurance employee percentage rate. */
  readonly careInsuranceRate: number;
  /** Total combined statutory social security employee deductions per month in EUR. */
  readonly totalSocialSecurity: EuroAmount;
}

/**
 * Computes monthly statutory employee social security contributions under SGB IV, V, VI, and XI.
 * Caps contributions at statutory monthly assessment ceilings (BBG 2024–2026: GKV €5.175/mo, GRV €7.550/mo)
 * and adjusts nursing care rates for child discounts (§ 55 Abs. 3 SGB XI).
 *
 * @param monthlyGross - Monthly gross employment earnings in EUR.
 * @param childrenCount - Count of dependent children.
 * @returns Complete `SocialInsuranceDeductions` itemization.
 */
export function computeMonthlySocialSecurity(
  monthlyGross: GrossSalary,
  childrenCount: number = 0,
): SocialInsuranceDeductions {
  const gross = monthlyGross as number;

  // Monthly BBG 2024-2026
  const healthPensionBBG = 5175; // Health & Care Assessment Ceiling (€62.100 / yr)
  const generalPensionBBG = 7550; // Pension & Unemployment Assessment Ceiling (€90.600 / yr)

  const assessedHealthGross = Math.min(gross, healthPensionBBG);
  const assessedPensionGross = Math.min(gross, generalPensionBBG);

  // Employee statutory shares:
  // GKV: 14.6% / 2 + 1.7% / 2 (Zusatzbeitrag) = 7.3% + 0.85% = 8.15% (0.0815)
  const healthRate = 0.0815;
  const health = Math.round(assessedHealthGross * healthRate);

  // GRV: 18.6% / 2 = 9.30% (0.0930)
  const pensionRate = 0.093;
  const pension = Math.round(assessedPensionGross * pensionRate);

  // AV: 2.6% / 2 = 1.30% (0.0130)
  const unemploymentRate = 0.013;
  const unemployment = Math.round(assessedPensionGross * unemploymentRate);

  // PV: Base 2.2% employee share (Childless: +0.6% surcharge = 2.8%; With children: discount down to 1.2%)
  let careRate: number;
  if (childrenCount === 0) {
    careRate = 0.028; // Childless surcharge (§ 55 Abs. 3 SGB XI)
  } else {
    // SGB XI § 55 Abs. 3: -0.25% per child from 2nd to 5th child
    const discount = Math.min(0.01, Math.max(0, childrenCount - 1) * 0.0025);
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
    totalSocialSecurity: toEuroAmount(total),
  };
}

/**
 * Computes annual wage tax withholding under § 38b EStG for a specified tax class (I through VI).
 * Incorporates standard statutory employee lump sums (Arbeitnehmer-Pauschbetrag €1.230, Sonderausgaben €36, Vorsorgeaufwand).
 *
 * @param annualGross - Projected annual gross salary in EUR.
 * @param annualSocialSecurity - Projected annual statutory social security contributions in EUR.
 * @param taxClass - German statutory wage tax class (§ 38b EStG).
 * @returns Annual tax amount and approximate annual taxable income (ZvE).
 */
export function computeAnnualWageTaxForClass(
  annualGross: number,
  annualSocialSecurity: number,
  taxClass: TaxClass,
): { annualTax: number; approxZvE: number } {
  const arbeitnehmerPauschbetrag = 1230; // § 9a Nr. 1a EStG
  const sonderausgabenPauschbetrag = 36; // § 10c EStG
  let approxZvE = Math.max(
    0,
    annualGross -
      arbeitnehmerPauschbetrag -
      sonderausgabenPauschbetrag -
      annualSocialSecurity * 0.88,
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
      annualWageTax = Math.floor(
        (computeAnnualIncomeTax(approxZvE / 2) as number) * 2,
      );
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
      annualWageTax = Math.floor(
        computeAnnualIncomeTax(approxZvE + 11784) as number,
      );
      break;
  }

  return { annualTax: annualWageTax, approxZvE };
}

/**
 * Calculates differential wage tax assessed on one-off bonus payments (Sonstige Bezüge) under § 39b Abs. 3 EStG.
 * Determines the difference between projected annual wage tax with bonus versus without bonus.
 *
 * @param regularAnnualGross - Regular annual gross salary excluding bonus in EUR.
 * @param regularAnnualSocialSecurity - Regular annual social security deductions in EUR.
 * @param bonusAmount - Gross one-off bonus payment in EUR.
 * @param taxClass - Active wage tax class.
 * @returns Additional differential wage tax deduction in EUR.
 */
export function computeSonstigeBezuegeTax(
  regularAnnualGross: number,
  regularAnnualSocialSecurity: number,
  bonusAmount: number,
  taxClass: TaxClass,
): number {
  if (bonusAmount <= 0) {
    return 0;
  }

  const baseResult = computeAnnualWageTaxForClass(
    regularAnnualGross,
    regularAnnualSocialSecurity,
    taxClass,
  );
  const totalAnnualGross = regularAnnualGross + bonusAmount;
  const totalResult = computeAnnualWageTaxForClass(
    totalAnnualGross,
    regularAnnualSocialSecurity,
    taxClass,
  );

  return Math.max(0, totalResult.annualTax - baseResult.annualTax);
}

/**
 * Calculates the statutory income tax factor for married couples under § 39f EStG (Faktorverfahren).
 * Factor F = Projected Joint Tax (Splitting § 32a Abs. 5) / (Husband Tax IV + Wife Tax IV)
 * Rounded to 3 decimal places (0 < F <= 1.000).
 *
 * @param husbandAnnualGross - Husband's projected annual gross earnings in EUR.
 * @param wifeAnnualGross - Wife's projected annual gross earnings in EUR.
 * @param childrenCount - Count of dependent children.
 * @returns Statutory `TaxFactor` ratio.
 */
export function computeTaxFactor(
  husbandAnnualGross: number,
  wifeAnnualGross: number,
  childrenCount: number = 0,
): TaxFactor {
  if (husbandAnnualGross <= 0 && wifeAnnualGross <= 0) {
    return toTaxFactor(1.0);
  }

  const hMonthlyGross = toGrossSalary(
    Math.max(0, Math.round(husbandAnnualGross / 12)),
  );
  const wMonthlyGross = toGrossSalary(
    Math.max(0, Math.round(wifeAnnualGross / 12)),
  );

  const hSocial =
    (computeMonthlySocialSecurity(hMonthlyGross, childrenCount)
      .totalSocialSecurity as number) * 12;
  const wSocial =
    (computeMonthlySocialSecurity(wMonthlyGross, childrenCount)
      .totalSocialSecurity as number) * 12;

  const hTax4 = computeAnnualWageTaxForClass(
    husbandAnnualGross,
    hSocial,
    TaxClass.IV,
  );
  const wTax4 = computeAnnualWageTaxForClass(
    wifeAnnualGross,
    wSocial,
    TaxClass.IV,
  );

  const sumTax4 = hTax4.annualTax + wTax4.annualTax;
  if (sumTax4 <= 0) {
    return toTaxFactor(1.0);
  }

  const combinedZvE = hTax4.approxZvE + wTax4.approxZvE;
  const jointTax = Math.floor(
    (computeAnnualIncomeTax(combinedZvE / 2) as number) * 2,
  );

  const factor = Math.min(
    1.0,
    Math.max(0.001, Math.round((jointTax / sumTax4) * 1000) / 1000),
  );
  return toTaxFactor(factor);
}

/**
 * Comprehensive Itemized German Gross-to-Net Payroll & Statutory Tax Breakdown.
 * Computes social security deductions, wage taxes under § 38b/§ 39f EStG, one-off bonus taxes (§ 39b Abs. 3),
 * actual net take-home pay, and the clean synthetic net baseline for Elterngeld under § 2c BEEG.
 *
 * @param monthlyGross - Monthly gross employment compensation in EUR.
 * @param taxClass - Active German wage tax class.
 * @param childrenCount - Count of dependent children (for nursing care insurance rate).
 * @param oneOffBonus - Optional one-off special bonus payment in EUR.
 * @param taxFactor - Optional § 39f EStG factor ratio for Tax Class IV.
 * @returns Complete `GrossToNetBreakdown` specification.
 */
export function computeGrossToNetBreakdown(
  monthlyGross: GrossSalary,
  taxClass: TaxClass,
  childrenCount: number = 0,
  oneOffBonus?: EuroAmount,
  taxFactor?: TaxFactor | number,
): GrossToNetBreakdown {
  const gross = monthlyGross as number;
  const bonus = oneOffBonus ? (oneOffBonus as number) : 0;
  const annualGross = gross * 12;

  const social = computeMonthlySocialSecurity(monthlyGross, childrenCount);
  const annualSocial = (social.totalSocialSecurity as number) * 12;

  const { annualTax: baseAnnualTax, approxZvE } = computeAnnualWageTaxForClass(
    annualGross,
    annualSocial,
    taxClass,
  );

  // Apply § 39f EStG Factor when Tax Class IV and factor is supplied
  const effectiveAnnualTax =
    taxClass === TaxClass.IV &&
    taxFactor !== undefined &&
    (taxFactor as number) > 0 &&
    (taxFactor as number) <= 1.0
      ? Math.floor(baseAnnualTax * (taxFactor as number))
      : baseAnnualTax;

  const monthlyWageTax = Math.round(effectiveAnnualTax / 12);
  const annualSolz = computeSolidaritySurcharge(
    toEuroAmount(effectiveAnnualTax),
    taxClass === TaxClass.III ||
      taxClass === TaxClass.IV ||
      taxClass === TaxClass.V,
  ) as number;
  const monthlySolz = Math.round(annualSolz / 12);

  // Bonus Differential Tax (§ 39b Abs. 3 EStG)
  const bonusTax =
    bonus > 0
      ? computeSonstigeBezuegeTax(annualGross, annualSocial, bonus, taxClass)
      : 0;

  const totalMonthlyTax = monthlyWageTax + monthlySolz + bonusTax;
  const totalDeductions =
    (social.totalSocialSecurity as number) + totalMonthlyTax;
  const totalGrossWithBonus = gross + bonus;
  const takeHomeNet = Math.max(0, totalGrossWithBonus - totalDeductions);

  // Clean Synthetic Net for Elterngeld (§ 2c BEEG - Excludes Non-Recurrent Bonuses)
  const regularNetTakeHome = Math.max(
    0,
    gross -
      (social.totalSocialSecurity as number) -
      monthlyWageTax -
      monthlySolz,
  );
  const elterngeldSyntheticNet = toNetSalary(regularNetTakeHome);

  const effectiveTaxRate =
    totalGrossWithBonus > 0 ? (totalMonthlyTax / totalGrossWithBonus) * 100 : 0;
  const effectiveTotalDeductionRate =
    totalGrossWithBonus > 0 ? (totalDeductions / totalGrossWithBonus) * 100 : 0;

  return {
    monthlyGross: toGrossSalary(gross),
    annualGross: toGrossSalary(annualGross),
    taxClass,
    childrenCount: toChildrenCount(childrenCount),
    healthInsurance: social.healthInsurance,
    healthInsuranceRate: toPercentageRate(social.healthInsuranceRate),
    pensionInsurance: social.pensionInsurance,
    pensionInsuranceRate: toPercentageRate(social.pensionInsuranceRate),
    unemploymentInsurance: social.unemploymentInsurance,
    unemploymentInsuranceRate: toPercentageRate(
      social.unemploymentInsuranceRate,
    ),
    careInsurance: social.careInsurance,
    careInsuranceRate: toPercentageRate(social.careInsuranceRate),
    totalSocialSecurity: social.totalSocialSecurity,
    taxableIncomeZvE: toEuroAmount(Math.round(approxZvE / 12)),
    wageTaxZone: computeWageTaxZone(approxZvE),
    monthlyWageTax: toEuroAmount(monthlyWageTax),
    monthlySolidaritySurcharge: toEuroAmount(monthlySolz),
    totalTaxWithholding: toEuroAmount(totalMonthlyTax),
    taxFactor:
      taxFactor !== undefined
        ? typeof taxFactor === "number"
          ? toTaxFactor(taxFactor)
          : taxFactor
        : undefined,
    oneOffBonusAmount: bonus > 0 ? toEuroAmount(bonus) : undefined,
    bonusTaxDeduction: bonus > 0 ? toEuroAmount(bonusTax) : undefined,
    monthlyNetTakeHome: toNetSalary(takeHomeNet),
    elterngeldSyntheticNet,
    effectiveTaxRatePercent: toPercentageRate(
      Math.round(effectiveTaxRate * 10) / 10,
    ),
    effectiveTotalDeductionRatePercent: toPercentageRate(
      Math.round(effectiveTotalDeductionRate * 10) / 10,
    ),
    statutoryCitation: toStatutoryCitation(
      bonus > 0
        ? "EStG § 38b (Lohnsteuer), § 39b Abs. 3 (Sonstige Bezüge) & BEEG § 2c"
        : taxClass === TaxClass.IV && taxFactor !== undefined
          ? "EStG § 39f (Faktorverfahren) & § 38b (Lohnsteuerabzug)"
          : "EStG § 38b (Lohnsteuerabzug) & § 32a (Tarif)",
    ),
  };
}

/**
 * Computes monthly net take-home salary for a given gross salary and tax class under § 38b EStG.
 *
 * @param monthlyGross - Monthly gross salary in EUR.
 * @param taxClass - German wage tax class.
 * @param childrenCount - Count of dependent children.
 * @param oneOffBonus - Optional one-off bonus payment.
 * @param taxFactor - Optional § 39f EStG factor ratio.
 * @returns Monthly post-withholding `NetSalary`.
 */
export function computeMonthlyNetSalary(
  monthlyGross: GrossSalary,
  taxClass: TaxClass,
  childrenCount: number = 0,
  oneOffBonus?: EuroAmount,
  taxFactor?: TaxFactor | number,
): NetSalary {
  const breakdown = computeGrossToNetBreakdown(
    monthlyGross,
    taxClass,
    childrenCount,
    oneOffBonus,
    taxFactor,
  );
  return breakdown.monthlyNetTakeHome;
}

/**
 * Derives the complete spousal household gross-to-net matrix across all tax class combinations
 * (III/V, V/III, IV/IV, IV+Factor) for full-time and part-time employment configurations.
 *
 * @param husbandGross - Husband's full-time monthly gross salary.
 * @param wifeGrossFullTime - Wife's full-time pre-birth monthly gross salary.
 * @param wifePtHours - Wife's post-birth part-time weekly hours (defaults to 24h).
 * @param wifeFtHours - Wife's full-time weekly hours (defaults to 40h).
 * @param childrenCount - Count of dependent children.
 * @returns Complete `SpousalGrossToNetSet` matrix.
 */
export function deriveSpousalNetSalaries(
  husbandGross: GrossSalary,
  wifeGrossFullTime: GrossSalary,
  wifePtHours: WorkingHours = toWorkingHours(24),
  wifeFtHours: WorkingHours = toWorkingHours(40),
  childrenCount: number = 0,
): SpousalGrossToNetSet {
  const hGross = husbandGross;
  const wGrossFT = wifeGrossFullTime;

  const ptRatio = (wifePtHours as number) / ((wifeFtHours as number) || 40);
  const wGrossPT = toGrossSalary(Math.round((wGrossFT as number) * ptRatio));

  const factor = computeTaxFactor(
    (hGross as number) * 12,
    (wGrossFT as number) * 12,
    childrenCount,
  );

  const hBreakdownClass3 = computeGrossToNetBreakdown(
    hGross,
    TaxClass.III,
    childrenCount,
  );
  const hBreakdownClass5 = computeGrossToNetBreakdown(
    hGross,
    TaxClass.V,
    childrenCount,
  );
  const hBreakdownClass4 = computeGrossToNetBreakdown(
    hGross,
    TaxClass.IV,
    childrenCount,
  );
  const hBreakdownClass4WithFactor = computeGrossToNetBreakdown(
    hGross,
    TaxClass.IV,
    childrenCount,
    undefined,
    factor,
  );

  const wBreakdownClass5FT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.V,
    childrenCount,
  );
  const wBreakdownClass3FT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.III,
    childrenCount,
  );
  const wBreakdownClass4FT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.IV,
    childrenCount,
  );
  const wBreakdownClass4WithFactorFT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.IV,
    childrenCount,
    undefined,
    factor,
  );

  const wBreakdownClass5PT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.V,
    childrenCount,
  );
  const wBreakdownClass3PT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.III,
    childrenCount,
  );
  const wBreakdownClass4PT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.IV,
    childrenCount,
  );
  const wBreakdownClass4WithFactorPT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.IV,
    childrenCount,
    undefined,
    factor,
  );

  return {
    husbandGross: hGross,
    husbandClass3Net: hBreakdownClass3.monthlyNetTakeHome,
    husbandClass5Net: hBreakdownClass5.monthlyNetTakeHome,
    husbandClass4Net: hBreakdownClass4.monthlyNetTakeHome,
    husbandClass4WithFactorNet: hBreakdownClass4WithFactor.monthlyNetTakeHome,
    wifeGrossFullTime: wGrossFT,
    wifeClass5FullTimeNet: wBreakdownClass5FT.monthlyNetTakeHome,
    wifeClass3FullTimeNet: wBreakdownClass3FT.monthlyNetTakeHome,
    wifeClass4FullTimeNet: wBreakdownClass4FT.monthlyNetTakeHome,
    wifeClass4WithFactorNet: wBreakdownClass4WithFactorFT.monthlyNetTakeHome,
    wifeGrossPartTime: wGrossPT,
    wifeClass5PartTimeNet: wBreakdownClass5PT.monthlyNetTakeHome,
    wifeClass3PartTimeNet: wBreakdownClass3PT.monthlyNetTakeHome,
    wifeClass4PartTimeNet: wBreakdownClass4PT.monthlyNetTakeHome,
    wifeClass4WithFactorPartTimeNet:
      wBreakdownClass4WithFactorPT.monthlyNetTakeHome,
    taxFactor: factor,
    wifePartTimeWeeklyHours: wifePtHours,
    husbandWeeklyHours: toWorkingHours(32),
    husbandBreakdownClass3: hBreakdownClass3,
    husbandBreakdownClass5: hBreakdownClass5,
    wifeBreakdownClass5FT: wBreakdownClass5FT,
    wifeBreakdownClass3FT: wBreakdownClass3FT,
  };
}
