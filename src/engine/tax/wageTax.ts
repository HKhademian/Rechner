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
  type EuroAmount,
  type WorkingHours,
  type GrossToNetBreakdown,
  type SpousalGrossToNetSet,
  TaxClass,
  WageTaxZone,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toWorkingHours,
  toTaxFactor,
  toChildrenCount,
  toPercentageRate,
  toStatutoryCitation,
} from "#engine/types";

import {
  type TaxRules,
  DEFAULT_TAX_RULES,
} from "#engine/tax/taxRules";

/** Select the progression zone from the source-linked annual profile. */
export function computeWageTaxZone(
  zve: number,
  rules: TaxRules = DEFAULT_TAX_RULES,
): WageTaxZone {
  const p = rules.parameters;
  const income = Math.floor(zve);
  if (income <= p.basicAllowance.value) {
    return WageTaxZone.Zone1Null;
  }
  if (income <= p.progression1Ceiling.value) {
    return WageTaxZone.Zone2Progression1;
  }
  if (income <= p.progression2Ceiling.value) {
    return WageTaxZone.Zone3Progression2;
  }
  if (income <= p.topRateCeiling.value) {
    return WageTaxZone.Zone4Proportional42;
  }
  return WageTaxZone.Zone5Reichensteuer45;
}

/** § 32a floors both taxable income and the final annual tax to whole euros. */
export function computeAnnualIncomeTax(
  zve: number,
  rules: TaxRules = DEFAULT_TAX_RULES,
): EuroAmount {
  if (!Number.isFinite(zve)) {
    throw new TypeError("Annual taxable income must be finite.");
  }
  const p = rules.parameters;
  const income = Math.max(0, Math.floor(zve));
  let tax: number;
  if (income <= p.basicAllowance.value) {
    return toEuroAmount(0);
  }
  if (income <= p.progression1Ceiling.value) {
    const y = (income - p.basicAllowance.value) / p.tariffDivisor.value;
    tax = (p.progression1Quadratic.value * y + p.progression1Linear.value) * y;
  }
  else if (income <= p.progression2Ceiling.value) {
    const z = (income - p.progression1Ceiling.value) / p.tariffDivisor.value;
    tax = (p.progression2Quadratic.value * z + p.progression2Linear.value) * z + p.progression2Constant.value;
  }
  else if (income <= p.topRateCeiling.value) {
    tax = p.topRate.value * income - p.topOffset.value;
  }
  else {
    tax = p.highestRate.value * income - p.highestOffset.value;
  }
  return toEuroAmount(Math.max(0, Math.floor(tax)));
}

/** SolzG § 4 truncates fractional cents and applies the mitigation limit. */
export function computeSolidaritySurcharge(
  annualTax: EuroAmount,
  isMarriedJoint: boolean = true,
  rules: TaxRules = DEFAULT_TAX_RULES,
): EuroAmount {
  const p = rules.parameters;
  const exemption = p.solidarityExemptionSingle.value * (isMarriedJoint ? 2 : 1);
  const amount = Math.max(0, Math.min(annualTax * p.solidarityRate.value, (annualTax - exemption) * p.solidarityMitigationRate.value));
  return toEuroAmount(Math.floor(amount * 100 + Number.EPSILON * amount * 100) / 100);
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
  rules: TaxRules = DEFAULT_TAX_RULES,
): SocialInsuranceDeductions {
  const p = rules.parameters;
  const assessedHealthGross = Math.min(monthlyGross, p.healthCapMonthly.value);
  const assessedPensionGross = Math.min(monthlyGross, p.pensionCapMonthly.value);
  const healthRate = p.healthEmployeeRate.value + p.healthSupplementTotalRate.value / 2;
  const health = toEuroAmount(assessedHealthGross * healthRate);
  const pensionRate = p.pensionEmployeeRate.value;
  const pension = toEuroAmount(assessedPensionGross * pensionRate);
  const unemploymentRate = p.unemploymentEmployeeRate.value;
  const unemployment = toEuroAmount(assessedPensionGross * unemploymentRate);
  const discount = Math.min(p.careMaximumDiscountChildren.value, Math.max(0, childrenCount - 1)) * p.careChildDiscount.value;
  const careRate = toPercentageRate(childrenCount === 0
    ? p.careEmployeeBaseRate.value + p.careChildlessSurcharge.value
    : p.careEmployeeBaseRate.value - discount);
  const care = toEuroAmount(assessedHealthGross * careRate);

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
 * Computes estimated annual wage tax for a specific tax class under § 38b EStG.
 * Incorporates standard deductions (Arbeitnehmer-Pauschbetrag €1.230, Sonderausgaben-Pauschbetrag €36, Vorsorgeaufwand).
 *
 * @param annualGross - Projected regular annual gross salary in EUR.
 * @param annualSocialSecurity - Annual social insurance employee deductions in EUR.
 * @param taxClass - German wage tax class.
 * @returns Annual tax amount and approximated taxable income (zvE).
 */
export function computeAnnualWageTaxForClass(
  annualGross: number,
  annualSocialSecurity: number,
  taxClass: TaxClass,
  rules: TaxRules = DEFAULT_TAX_RULES,
): { annualTax: number;
  approxZvE: number } {
  const arbeitnehmerPauschbetrag = rules.parameters.workExpenseAllowance.value; // § 9a Nr. 1a EStG
  const sonderausgabenPauschbetrag = rules.parameters.specialExpenseAllowance.value; // § 10c EStG
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
      annualWageTax = computeAnnualIncomeTax(approxZvE, rules);
      break;
    case TaxClass.II:
      // Relief for single parents (§ 24b EStG: Entlastungsbetrag für Alleinerziehende 4.260 €)
      approxZvE = Math.max(0, approxZvE - rules.parameters.singleParentRelief.value);
      annualWageTax = computeAnnualIncomeTax(approxZvE, rules);
      break;
    case TaxClass.III:
      // Tax Class III: Doubled basic allowance / applies splitting formula as sole earner (§ 38b Abs. 1 Nr. 3 EStG)
      annualWageTax = Math.floor(computeAnnualIncomeTax(approxZvE / 2, rules) * 2);
      break;
    case TaxClass.V:
      // Tax Class V: No basic allowance, higher progressive rate to offset Class III (§ 38b Abs. 1 Nr. 5 EStG)
      {
        const baseTax = computeAnnualIncomeTax(approxZvE, rules);
        const progressiveSurcharge = Math.floor(approxZvE * 0.12);
        annualWageTax = baseTax + progressiveSurcharge;
      }
      break;
    case TaxClass.VI:
      // Tax Class VI: Second job, zero basic allowance (§ 38b Abs. 1 Nr. 6 EStG)
      annualWageTax = Math.floor(computeAnnualIncomeTax(approxZvE + rules.parameters.basicAllowance.value, rules));
      break;
  }

  return { annualTax: annualWageTax,
    approxZvE };
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
  rules: TaxRules = DEFAULT_TAX_RULES,
): number {
  if (bonusAmount <= 0) {
    return 0;
  }

  const baseResult = computeAnnualWageTaxForClass(
    regularAnnualGross,
    regularAnnualSocialSecurity,
    taxClass,
    rules,
  );
  const totalAnnualGross = regularAnnualGross + bonusAmount;
  const totalResult = computeAnnualWageTaxForClass(
    totalAnnualGross,
    regularAnnualSocialSecurity,
    taxClass,
    rules,
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
  rules: TaxRules = DEFAULT_TAX_RULES,
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
    computeMonthlySocialSecurity(hMonthlyGross, childrenCount, rules)
      .totalSocialSecurity * 12;
  const wSocial =
    computeMonthlySocialSecurity(wMonthlyGross, childrenCount, rules)
      .totalSocialSecurity * 12;

  const hTax4 = computeAnnualWageTaxForClass(
    husbandAnnualGross,
    hSocial,
    TaxClass.IV,
    rules,
  );
  const wTax4 = computeAnnualWageTaxForClass(
    wifeAnnualGross,
    wSocial,
    TaxClass.IV,
    rules,
  );

  const sumTax4 = hTax4.annualTax + wTax4.annualTax;
  if (sumTax4 <= 0) {
    return toTaxFactor(1.0);
  }

  const combinedZvE = hTax4.approxZvE + wTax4.approxZvE;
  const jointTax = Math.floor(computeAnnualIncomeTax(combinedZvE / 2, rules) * 2);

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
  taxFactor?: TaxFactor,
  rules: TaxRules = DEFAULT_TAX_RULES,
): GrossToNetBreakdown {
  const bonus = oneOffBonus ?? 0;
  const annualGross = monthlyGross * 12;

  const social = computeMonthlySocialSecurity(monthlyGross, childrenCount, rules);
  const annualSocial = social.totalSocialSecurity * 12;

  const { annualTax: baseAnnualTax, approxZvE } = computeAnnualWageTaxForClass(
    annualGross,
    annualSocial,
    taxClass,
    rules,
  );

  // Apply § 39f EStG Factor when Tax Class IV and factor is supplied
  const effectiveAnnualTax =
    taxClass === TaxClass.IV &&
    taxFactor !== undefined &&
    taxFactor > 0 &&
    taxFactor <= 1.0
      ? Math.floor(baseAnnualTax * taxFactor)
      : baseAnnualTax;

  const monthlyWageTax = Math.round(effectiveAnnualTax / 12);
  const annualSolz = computeSolidaritySurcharge(
    toEuroAmount(effectiveAnnualTax),
    taxClass === TaxClass.III ||
      taxClass === TaxClass.IV ||
      taxClass === TaxClass.V,
    rules,
  );
  const monthlySolz = Math.round(annualSolz / 12);

  // Bonus Differential Tax (§ 39b Abs. 3 EStG)
  const bonusTax =
    bonus > 0
      ? computeSonstigeBezuegeTax(annualGross, annualSocial, bonus, taxClass, rules)
      : 0;

  const totalMonthlyTax = monthlyWageTax + monthlySolz + bonusTax;
  const totalDeductions = social.totalSocialSecurity + totalMonthlyTax;
  const totalGrossWithBonus = monthlyGross + bonus;
  const takeHomeNet = Math.max(0, totalGrossWithBonus - totalDeductions);

  // Clean Synthetic Net for Elterngeld (§ 2c BEEG - Excludes Non-Recurrent Bonuses)
  const regularNetTakeHome = Math.max(
    0,
    monthlyGross - social.totalSocialSecurity - monthlyWageTax - monthlySolz,
  );
  const elterngeldSyntheticNet = toNetSalary(regularNetTakeHome);

  const effectiveTaxRate =
    totalGrossWithBonus > 0 ? (totalMonthlyTax / totalGrossWithBonus) * 100 : 0;
  const effectiveTotalDeductionRate =
    totalGrossWithBonus > 0 ? (totalDeductions / totalGrossWithBonus) * 100 : 0;

  return {
    monthlyGross,
    taxRules: rules,
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
    wageTaxZone: computeWageTaxZone(approxZvE, rules),
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
  taxFactor?: TaxFactor,
  rules: TaxRules = DEFAULT_TAX_RULES,
): NetSalary {
  const breakdown = computeGrossToNetBreakdown(
    monthlyGross,
    taxClass,
    childrenCount,
    oneOffBonus,
    taxFactor,
    rules,
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
  rules: TaxRules = DEFAULT_TAX_RULES,
): SpousalGrossToNetSet {
  const hGross = husbandGross;
  const wGrossFT = wifeGrossFullTime;

  const ptRatio = wifePtHours / (wifeFtHours || 40);
  const wGrossPT = toGrossSalary(Math.round(wGrossFT * ptRatio));

  const factor = computeTaxFactor(hGross * 12, wGrossFT * 12, childrenCount, rules);

  const hBreakdownClass3 = computeGrossToNetBreakdown(
    hGross,
    TaxClass.III,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const hBreakdownClass5 = computeGrossToNetBreakdown(
    hGross,
    TaxClass.V,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const hBreakdownClass4 = computeGrossToNetBreakdown(
    hGross,
    TaxClass.IV,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const hBreakdownClass4WithFactor = computeGrossToNetBreakdown(
    hGross,
    TaxClass.IV,
    childrenCount,
    undefined,
    factor,
    rules,
  );

  const wBreakdownClass5FT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.V,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const wBreakdownClass3FT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.III,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const wBreakdownClass4FT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.IV,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const wBreakdownClass4WithFactorFT = computeGrossToNetBreakdown(
    wGrossFT,
    TaxClass.IV,
    childrenCount,
    undefined,
    factor,
    rules,
  );

  const wBreakdownClass5PT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.V,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const wBreakdownClass3PT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.III,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const wBreakdownClass4PT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.IV,
    childrenCount,
    undefined,
    undefined,
    rules,
  );
  const wBreakdownClass4WithFactorPT = computeGrossToNetBreakdown(
    wGrossPT,
    TaxClass.IV,
    childrenCount,
    undefined,
    factor,
    rules,
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
