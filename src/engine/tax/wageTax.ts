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

import {
  type PayrollOptions,
  payrollInputs,
  calculatePayrollWithholding,
  annualWithholdingTaxBase,
} from "#engine/tax/payroll";

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
  options: PayrollOptions = {},
): SocialInsuranceDeductions {
  const p = rules.parameters;
  const assessedHealthGross = Math.min(monthlyGross, p.healthCapMonthly.value);
  const assessedPensionGross = Math.min(monthlyGross, p.pensionCapMonthly.value);
  const healthRate = p.healthEmployeeRate.value + (options.healthSupplementTotalRate ?? p.healthSupplementTotalRate.value) / 2;
  const health = toEuroAmount(assessedHealthGross * healthRate);
  const pensionRate = p.pensionEmployeeRate.value;
  const pension = toEuroAmount(assessedPensionGross * pensionRate);
  const unemploymentRate = p.unemploymentEmployeeRate.value;
  const unemployment = toEuroAmount(assessedPensionGross * unemploymentRate);
  const inputs = payrollInputs(monthlyGross, TaxClass.I, toChildrenCount(childrenCount), rules, options);
  const careRate = toPercentageRate(p.careEmployeeBaseRate.value +
    (inputs.PVS ? p.careSaxonyExtraEmployeeRate.value : 0) +
    (inputs.PVZ ? p.careChildlessSurcharge.value : -(inputs.PVA ?? 0) * p.careChildDiscount.value));
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

/** Compatibility API: annual wage withholding comes from PAP, not a share of social deductions. */
export function computeAnnualWageTaxForClass(
  annualGross: number,
  _annualSocialSecurity: number,
  taxClass: TaxClass,
  rules: TaxRules = DEFAULT_TAX_RULES,
): { annualTax: number;
  approxZvE: number } {
  const gross = toGrossSalary(annualGross);
  const inputs = payrollInputs(toGrossSalary(gross / 12), taxClass, toChildrenCount(0), rules);
  const output = calculatePayrollWithholding({ ...inputs,
    LZZ: 1,
    RE4: Math.round(gross * 100) }, rules);
  return { annualTax: output.LSTLZZ / 100,
    approxZvE: annualWithholdingTaxBase(inputs, rules, gross) };
}

/** Compatibility API for one-off wage tax and solidarity; it never scales regular monthly tax. */
export function computeSonstigeBezuegeTax(
  regularAnnualGross: number,
  _regularAnnualSocialSecurity: number,
  bonusAmount: number,
  taxClass: TaxClass,
  rules: TaxRules = DEFAULT_TAX_RULES,
): number {
  if (bonusAmount <= 0) {
    return 0;
  }
  const inputs = payrollInputs(toGrossSalary(regularAnnualGross / 12), taxClass, toChildrenCount(0), rules);
  const output = calculatePayrollWithholding({ ...inputs,
    JRE4: Math.round(regularAnnualGross * 100),
    SONSTB: Math.round(bonusAmount * 100) }, rules);
  return toEuroAmount((output.STS + output.SOLZS) / 100);
}

/** § 39f uses Y/X, truncated (not rounded) to three decimal places. */
export function computeTaxFactor(
  husbandAnnualGross: number,
  wifeAnnualGross: number,
  childrenCount: number = 0,
  rules: TaxRules = DEFAULT_TAX_RULES,
): TaxFactor {
  const children = toChildrenCount(childrenCount);
  const inputsH = payrollInputs(toGrossSalary(husbandAnnualGross / 12), TaxClass.IV, children, rules);
  const inputsW = payrollInputs(toGrossSalary(wifeAnnualGross / 12), TaxClass.IV, children, rules);
  const taxH = calculatePayrollWithholding({ ...inputsH,
    LZZ: 1,
    RE4: Math.round(husbandAnnualGross * 100) }, rules).LSTLZZ;
  const taxW = calculatePayrollWithholding({ ...inputsW,
    LZZ: 1,
    RE4: Math.round(wifeAnnualGross * 100) }, rules).LSTLZZ;
  const sumTax = (taxH + taxW) / 100;
  if (sumTax <= 0) {
    return toTaxFactor(1);
  }
  const taxableH = annualWithholdingTaxBase(inputsH, rules, toGrossSalary(husbandAnnualGross));
  const taxableW = annualWithholdingTaxBase(inputsW, rules, toGrossSalary(wifeAnnualGross));
  const joint = computeAnnualIncomeTax((taxableH + taxableW) / 2, rules) * 2;
  return toTaxFactor(Math.min(1, Math.floor(joint / sumTax * 1000) / 1000));
}

export function computeBonusSocialInsurance(
  monthlyGross: GrossSalary,
  bonus: EuroAmount,
  children: number,
  rules: TaxRules,
  options: PayrollOptions,
): SocialInsuranceDeductions {
  const months = options.contributionMonthsYearToDate ?? 12;
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    throw new TypeError("Bonus contribution months must be a whole count from 1 to 12.");
  }
  const priorBonus = options.priorBonusGrossYearToDate ?? 0;
  if (priorBonus < 0 || bonus < 0) {
    throw new TypeError("Bonus gross and prior bonus gross cannot be negative.");
  }
  const p = rules.parameters;
  const rates = computeMonthlySocialSecurity(monthlyGross, children, rules, options);
  const base = (options.regularGrossYearToDate ?? monthlyGross * months) + priorBonus;
  const assessedHealth = Math.min(p.healthCapMonthly.value * months, base + bonus) - Math.min(p.healthCapMonthly.value * months, base);
  const assessedPension = Math.min(p.pensionCapMonthly.value * months, base + bonus) - Math.min(p.pensionCapMonthly.value * months, base);
  const healthInsurance = toEuroAmount(assessedHealth * rates.healthInsuranceRate);
  const careInsurance = toEuroAmount(assessedHealth * rates.careInsuranceRate);
  const pensionInsurance = toEuroAmount(assessedPension * rates.pensionInsuranceRate);
  const unemploymentInsurance = toEuroAmount(assessedPension * rates.unemploymentInsuranceRate);
  return { ...rates,
    healthInsurance,
    careInsurance,
    pensionInsurance,
    unemploymentInsurance,
    totalSocialSecurity: toEuroAmount(healthInsurance + careInsurance + pensionInsurance + unemploymentInsurance) };
}

/** Standard public-insurance employee payroll with source-year PAP withholding. */
export function computeGrossToNetBreakdown(
  monthlyGross: GrossSalary,
  taxClass: TaxClass,
  childrenCount: number = 0,
  oneOffBonus?: EuroAmount,
  taxFactor?: TaxFactor,
  rules: TaxRules = DEFAULT_TAX_RULES,
  options: PayrollOptions = {},
): GrossToNetBreakdown {
  const children = toChildrenCount(childrenCount);
  const bonus = oneOffBonus ?? toEuroAmount(0);
  if (bonus < 0) {
    throw new TypeError("A payroll bonus cannot be negative.");
  }
  const inputs = payrollInputs(monthlyGross, taxClass, children, rules, options, taxFactor);
  const annualGross = options.expectedRegularAnnualGross ?? toGrossSalary(monthlyGross * 12);
  const output = calculatePayrollWithholding({ ...inputs,
    JRE4: Math.round((annualGross + (options.priorBonusGrossYearToDate ?? 0)) * 100),
    SONSTB: Math.round(bonus * 100) }, rules);
  const social = computeMonthlySocialSecurity(monthlyGross, children, rules, options);
  const bonusSocialSecurity = computeBonusSocialInsurance(monthlyGross, bonus, children, rules, options).totalSocialSecurity;
  const monthlyWageTax = toEuroAmount(output.LSTLZZ / 100);
  const monthlySolidaritySurcharge = toEuroAmount(output.SOLZLZZ / 100);
  const churchRate = options.churchTaxRate ?? 0;
  const monthlyChurchTax = toEuroAmount(output.BK / 100 * churchRate);
  const bonusTax = toEuroAmount((output.STS + output.SOLZS) / 100 + toEuroAmount(output.BKS / 100 * churchRate));
  const totalTaxWithholding = toEuroAmount(monthlyWageTax + monthlySolidaritySurcharge + monthlyChurchTax + bonusTax);
  const totalGross = toEuroAmount(monthlyGross + bonus);
  const monthlyNetTakeHome = toNetSalary(Math.max(0, totalGross - social.totalSocialSecurity - bonusSocialSecurity - totalTaxWithholding));
  const regularNetTakeHome = toNetSalary(Math.max(0, monthlyGross - social.totalSocialSecurity - monthlyWageTax - monthlySolidaritySurcharge - monthlyChurchTax));
  const wageTaxBase = annualWithholdingTaxBase(inputs, rules);
  const assumptions: string[] = [];
  if (options.ageAtYearStart === undefined) {
    assumptions.push("Age unspecified: adult childless surcharge applies where relevant; no age relief is applied.");
  }
  if (children > 0 && options.childrenUnder25 === undefined) {
    assumptions.push("All supplied children are assumed to qualify for the care-insurance age discount.");
  }
  if (bonus > 0 && options.contributionMonthsYearToDate === undefined) {
    assumptions.push("Bonus contributions assume twelve contribution months and no prior bonuses unless supplied.");
  }
  if (rules.projected) {
    assumptions.push(`Published ${rules.sourceYear} payroll rules are projected to ${rules.calendarYear}.`);
  }
  return {
    monthlyGross,
    annualGross,
    taxRules: rules,
    taxClass,
    childrenCount: children,
    ...social,
    healthInsuranceRate: toPercentageRate(social.healthInsuranceRate),
    pensionInsuranceRate: toPercentageRate(social.pensionInsuranceRate),
    unemploymentInsuranceRate: toPercentageRate(social.unemploymentInsuranceRate),
    careInsuranceRate: toPercentageRate(social.careInsuranceRate),
    taxableIncomeZvE: toEuroAmount(wageTaxBase / 12),
    annualWithholdingTaxBase: wageTaxBase,
    wageTaxZone: computeWageTaxZone(taxClass === TaxClass.III ? wageTaxBase / 2 : wageTaxBase, rules),
    monthlyWageTax,
    monthlySolidaritySurcharge,
    monthlyChurchTax,
    totalTaxWithholding,
    taxFactor,
    oneOffBonusAmount: bonus > 0 ? bonus : undefined,
    bonusTaxDeduction: bonus > 0 ? bonusTax : undefined,
    bonusSocialSecurity,
    bonusWageTax: toEuroAmount(output.STS / 100),
    bonusSolidaritySurcharge: toEuroAmount(output.SOLZS / 100),
    bonusChurchTax: toEuroAmount(output.BKS / 100 * churchRate),
    bonusNetTakeHome: toEuroAmount(monthlyNetTakeHome - regularNetTakeHome),
    monthlyNetTakeHome,
    regularNetTakeHome,
    // Kept for serialized compatibility; this is payroll net, not BEEG standardized net.
    elterngeldSyntheticNet: regularNetTakeHome,
    effectiveTaxRatePercent: toPercentageRate(totalGross > 0 ? totalTaxWithholding / totalGross : 0),
    effectiveTotalDeductionRatePercent: toPercentageRate(totalGross > 0 ? (totalTaxWithholding + social.totalSocialSecurity + bonusSocialSecurity) / totalGross : 0),
    assumptions,
    statutoryCitation: toStatutoryCitation("EStG § 39b (BMF PAP), § 39f & SGB V/VI/III/XI"),
  };
}

export function computeMonthlyNetSalary(
  monthlyGross: GrossSalary,
  taxClass: TaxClass,
  childrenCount: number = 0,
  oneOffBonus?: EuroAmount,
  taxFactor?: TaxFactor,
  rules: TaxRules = DEFAULT_TAX_RULES,
  options: PayrollOptions = {},
): NetSalary {
  return computeGrossToNetBreakdown(monthlyGross, taxClass, childrenCount, oneOffBonus, taxFactor, rules, options).monthlyNetTakeHome;
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
