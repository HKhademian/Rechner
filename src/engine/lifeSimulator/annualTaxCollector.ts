import {
  type EuroAmount,
  type FullCalendarYear,
  type PercentageRate,
  toEuroAmount,
  toStatutoryCitation,
} from "#engine/types";
import {
  type TaxRules,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  type ChildYearPresence,
  computeKinderfreibetragGuenstigerpruefung,
} from "#engine/tax/jointAssessment";
import {
  computeAnnualTaxSettlement,
} from "#engine/tax/annualTaxSettlement";
import {
  computeSolidaritySurcharge,
  extractIncomeTaxTariffConstants,
} from "#engine/tax/wageTax";
import {
  evaluateIncomeTaxTariffFormula,
  evaluateProgressionRateTaxFormula,
} from "#engine/formulas/pure/incomeTaxFormulas";
import {
  DEFAULT_EMPLOYEE_LUMP_SUM_EUR,
} from "#engine/formulas/pure/deductibleExpensesFormula";
import {
  type AnnualLifeTaxRecord,
  type LifeTaxTransaction,
  TaxBucket,
} from "#engine/lifeSimulator/types";

/** Statutory § 20 Abs. 9 EStG Sparer-Pauschbetrag per adult (since 2023). */
const SPARER_PAUSCHBETRAG_SINGLE_EUR = 1000;
const SPARER_PAUSCHBETRAG_JOINT_EUR = 2000;
/** Statutory § 32d EStG Abgeltungsteuer rate (25%) + 5.5% Soli = 26.375%. */
const ABGELTUNGSTEUER_WITH_SOLI_RATE = 0.25 * 1.055;
/** Statutory § 10c EStG Sonderausgaben-Pauschbetrag. */
const SONDERAUSGABEN_LUMP_SUM_SINGLE_EUR = 36;
const SONDERAUSGABEN_LUMP_SUM_JOINT_EUR = 72;
/** Statutory § 10 Abs. 1 Nr. 5 EStG annual childcare deduction cap per child (JStG 2024: €4,800 from 2025). */
const CHILDCARE_DEDUCTION_CAP_PER_CHILD_2025_EUR = 4800;
const CHILDCARE_DEDUCTION_CAP_PER_CHILD_PRE2025_EUR = 4000;
const CHILDCARE_DEDUCTIBLE_SHARE_2025 = 0.8;
const CHILDCARE_DEDUCTIBLE_SHARE_PRE2025 = 2 / 3;

function roundToCents(value: number): EuroAmount {
  return toEuroAmount(Math.round(value * 100 + Number.EPSILON * Math.abs(value) * 100) / 100);
}

export interface AnnualLifeTaxCollectorInput {
  readonly calendarYear: FullCalendarYear;
  readonly isCompleteYear: boolean;
  readonly isJointAssessment: boolean;
  readonly employedAdultsCount: number;
  readonly churchTaxRate: PercentageRate;
  readonly children: readonly ChildYearPresence[];
  readonly kindergeldReceived: EuroAmount;
  readonly transactions: readonly LifeTaxTransaction[];
  readonly taxRules?: TaxRules;
}

/**
 * Pure German annual tax collector & settlement evaluator for the Life Planner.
 * Aggregates all 12 months of typed TaxBucket transactions, applies statutory deductions
 * (§§ 9, 9a, 10, 10(1)5 EStG), § 32b progression benefits, Günstigerprüfung (§ 31 EStG),
 * § 35a direct tax credits, § 32d Abgeltungsteuer, Soli, and optional Kirchensteuer,
 * and returns the exact signed refund (+) or Nachzahlung (−).
 */
export function collectAndSettleAnnualLifeTax(
  input: AnnualLifeTaxCollectorInput,
): AnnualLifeTaxRecord {
  const rules = input.taxRules ?? createTaxRules(input.calendarYear);

  let grossTaxableWages = 0;
  let benefitInKind = 0;
  let withheldWageTax = 0;
  let withheldSoli = 0;
  let withheldChurchTax = 0;
  let socialSecurityRaw = 0;
  let werbungskostenRaw = 0;
  let sonderausgabenRaw = 0;
  let childcareFeesRaw = 0;
  let progressionIncomeRaw = 0;
  let taxCredit35aRaw = 0;
  let capitalGainsRaw = 0;

  for (const tx of input.transactions) {
    if (tx.calendarYear !== input.calendarYear) {
      continue;
    }
    const basis = Math.max(0, tx.taxBasisAmount);
    switch (tx.bucket) {
      case TaxBucket.TaxableWage:
        grossTaxableWages += basis;
        break;
      case TaxBucket.BenefitInKind:
        benefitInKind += basis;
        break;
      case TaxBucket.WithheldWageTax:
        withheldWageTax += basis;
        break;
      case TaxBucket.WithheldSoli:
        withheldSoli += basis;
        break;
      case TaxBucket.WithheldChurchTax:
        withheldChurchTax += basis;
        break;
      case TaxBucket.SocialSecurity:
        socialSecurityRaw += basis;
        break;
      case TaxBucket.Werbungskosten9:
        werbungskostenRaw += basis;
        break;
      case TaxBucket.Sonderausgaben10:
        sonderausgabenRaw += basis;
        break;
      case TaxBucket.ChildcareDeductible10_1_5:
        childcareFeesRaw += basis;
        break;
      case TaxBucket.ProgressionBenefit32b:
        progressionIncomeRaw += basis;
        break;
      case TaxBucket.TaxCredit35a:
        taxCredit35aRaw += basis;
        break;
      case TaxBucket.CapitalGains:
        capitalGainsRaw += basis;
        break;
      case TaxBucket.TaxExemptInflow:
      case TaxBucket.NonTax:
        break;
    }
  }

  // § 9a EStG employee lump-sum applies per adult with taxable employment wages.
  const activeWageEarners = grossTaxableWages > 0 ? Math.max(1, Math.min(2, input.employedAdultsCount)) : 0;
  const employeeLumpSum = activeWageEarners * DEFAULT_EMPLOYEE_LUMP_SUM_EUR;
  const werbungskostenApplied = roundToCents(Math.max(werbungskostenRaw, employeeLumpSum));

  // § 10c EStG Sonderausgaben lump-sum floor.
  const sonderausgabenFloor = input.isJointAssessment
    ? SONDERAUSGABEN_LUMP_SUM_JOINT_EUR
    : SONDERAUSGABEN_LUMP_SUM_SINGLE_EUR;
  const sonderausgabenApplied = roundToCents(Math.max(sonderausgabenRaw, sonderausgabenFloor));

  // § 10 Abs. 1 Nr. 5 EStG childcare deduction (80% up to €4,800/child from 2025; 2/3 up to €4,000 prior).
  const childcareCount = Math.max(1, input.children.length);
  const childcareShare = input.calendarYear >= 2025
    ? CHILDCARE_DEDUCTIBLE_SHARE_2025
    : CHILDCARE_DEDUCTIBLE_SHARE_PRE2025;
  const childcareCapPerChild = input.calendarYear >= 2025
    ? CHILDCARE_DEDUCTION_CAP_PER_CHILD_2025_EUR
    : CHILDCARE_DEDUCTION_CAP_PER_CHILD_PRE2025_EUR;
  const childcareDeductibleApplied = roundToCents(
    Math.min(childcareFeesRaw * childcareShare, childcareCount * childcareCapPerChild),
  );

  // Employee social security contributions deductible as Vorsorgeaufwendungen (§ 10 Abs. 1 Nr. 2, 3 EStG).
  // Approximately 96% of health/care + 100% pension; using 0.96 conservative blended deductibility.
  const socialSecurityDeductible = roundToCents(socialSecurityRaw * 0.96);

  const totalTaxableEarnings = grossTaxableWages + benefitInKind;
  const taxableIncomeZvE = toEuroAmount(
    Math.max(
      0,
      Math.floor(
        totalTaxableEarnings -
        socialSecurityDeductible -
        werbungskostenApplied -
        sonderausgabenApplied -
        childcareDeductibleApplied,
      ),
    ),
  );
  const progressionIncome32b = roundToCents(progressionIncomeRaw);

  let rawIncomeTaxLiability: EuroAmount;
  let solidarityLiability: EuroAmount;
  let isKinderfreibetragFavorable: boolean;
  let creditedIncomeTax: EuroAmount;
  let creditedSolidarity: EuroAmount;

  if (input.isJointAssessment) {
    const joint = computeAnnualTaxSettlement({
      calendarYear: input.calendarYear,
      taxableIncome: taxableIncomeZvE,
      progressionIncome: progressionIncome32b,
      withheldIncomeTax: roundToCents(withheldWageTax),
      withheldSolidarity: roundToCents(withheldSoli),
      children: input.children,
      taxRules: rules,
    });
    rawIncomeTaxLiability = joint.incomeTaxLiability;
    solidarityLiability = joint.solidarityLiability;
    isKinderfreibetragFavorable = joint.childComparison.isKinderfreibetragFavorable;
    creditedIncomeTax = joint.creditedIncomeTax;
    creditedSolidarity = joint.creditedSolidarity;
  }
  else {
    const tariffConstants = extractIncomeTaxTariffConstants(rules);
    const computeSingleTax = (zve: EuroAmount): EuroAmount => {
      if (progressionIncome32b > 0) {
        return evaluateProgressionRateTaxFormula({
          taxableIncome: zve,
          progressionIncome: progressionIncome32b,
          ratePrecisionDecimalPlaces: rules.parameters.progressionRatePercentDecimalPlaces.value,
          ...tariffConstants,
        }).incomeTax;
      }
      return evaluateIncomeTaxTariffFormula({
        annualTaxableIncome: zve,
        ...tariffConstants,
      });
    };

    const taxWithoutAllowance = computeSingleTax(taxableIncomeZvE);
    const childCheck = computeKinderfreibetragGuenstigerpruefung(
      taxableIncomeZvE,
      input.children,
      input.calendarYear,
      undefined,
      progressionIncome32b,
      rules,
    );
    const singleChildAllowance = childCheck.totalKinderfreibetrag;
    const taxWithAllowance = computeSingleTax(
      toEuroAmount(Math.max(0, taxableIncomeZvE - singleChildAllowance)),
    );
    const allowanceTaxSavings = Math.max(0, taxWithoutAllowance - taxWithAllowance);
    isKinderfreibetragFavorable =
      input.children.length > 0 && allowanceTaxSavings > input.kindergeldReceived;
    rawIncomeTaxLiability = toEuroAmount(
      isKinderfreibetragFavorable
        ? taxWithAllowance + input.kindergeldReceived
        : taxWithoutAllowance,
    );
    solidarityLiability = computeSolidaritySurcharge(taxWithAllowance, false, rules);
    creditedIncomeTax = toEuroAmount(Math.ceil(withheldWageTax));
    creditedSolidarity = toEuroAmount(Math.ceil(withheldSoli));
  }

  // § 35a EStG direct tax credits reduce income tax liability euro-for-euro (floored at €0).
  const taxCredit35aApplied = roundToCents(Math.min(rawIncomeTaxLiability, taxCredit35aRaw));
  const incomeTaxLiability = roundToCents(Math.max(0, rawIncomeTaxLiability - taxCredit35aApplied));

  // Optional Kirchensteuer (8% BY/BW or 9% other federal states) on assessed income tax.
  const churchTaxLiability = input.churchTaxRate > 0
    ? roundToCents(incomeTaxLiability * input.churchTaxRate)
    : toEuroAmount(0);
  const creditedChurchTax = toEuroAmount(Math.ceil(withheldChurchTax));

  // § 32d & § 20 Abs. 9 EStG Abgeltungsteuer on capital income above Sparer-Pauschbetrag.
  const sparerPauschbetrag = input.isJointAssessment
    ? SPARER_PAUSCHBETRAG_JOINT_EUR
    : SPARER_PAUSCHBETRAG_SINGLE_EUR;
  const taxableCapitalGains = Math.max(0, capitalGainsRaw - sparerPauschbetrag);
  const capitalGainsTax = roundToCents(taxableCapitalGains * ABGELTUNGSTEUER_WITH_SOLI_RATE);

  const finalTotalTaxLiability = roundToCents(
    incomeTaxLiability + solidarityLiability + churchTaxLiability + capitalGainsTax,
  );
  const creditedWithholding = toEuroAmount(
    creditedIncomeTax + creditedSolidarity + creditedChurchTax,
  );
  const settlementEur = input.isCompleteYear
    ? roundToCents(creditedWithholding - finalTotalTaxLiability)
    : toEuroAmount(0);

  return Object.freeze({
    calendarYear: input.calendarYear,
    isCompleteYear: input.isCompleteYear,
    isJointAssessment: input.isJointAssessment,
    grossTaxableWages: roundToCents(grossTaxableWages),
    benefitInKind: roundToCents(benefitInKind),
    socialSecurityDeductible,
    werbungskostenApplied,
    sonderausgabenApplied,
    childcareDeductibleApplied,
    taxableIncomeZvE,
    progressionIncome32b,
    incomeTaxLiability,
    solidarityLiability,
    churchTaxLiability,
    taxCredit35aApplied,
    capitalGainsTax,
    kindergeldReceived: roundToCents(input.kindergeldReceived),
    isKinderfreibetragFavorable,
    finalTotalTaxLiability,
    creditedWithholding,
    settlementEur,
    statutoryCitation: toStatutoryCitation(
      "EStG §§ 9, 9a, 10, 10(1)5, 20(9), 26b, 31, 32a, 32b, 32d, 35a, 36; SolzG §§ 1, 3, 4",
    ),
  });
}
