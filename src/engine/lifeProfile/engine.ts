import {
  evaluateBlueCardEligibilityInContext,
  evaluateCompanyCarBenefitInContext,
  evaluateHousingAcquisitionInContext,
  evaluateSolarEnergyYieldInContext,
} from "#engine/formulas/context/domainEvaluators";
import {
  evaluateAnnualIncomeTaxInContext,
  evaluateChildAllowanceFavorabilityInContext,
  evaluateJointSplittingTaxInContext,
  evaluateParentalBenefitEntitlementInContext,
  evaluateSiblingBonusInContext,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  type CompanyCarBenefitFormulaResult,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  type HousingAcquisitionFormulaResult,
} from "#engine/formulas/pure/housingFormulas";
import {
  type SolarEnergyYieldFormulaResult,
} from "#engine/formulas/pure/solarEnergyFormulas";
import {
  type BlueCardEligibilityFormulaResult,
} from "#engine/formulas/pure/visaFormulas";
import {
  type StatutoryCalculationContext,
} from "#engine/formulas/types";
import {
  type LawId,
  LawId as Laws,
} from "#engine/laws/types";
import {
  type UnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  createTaxRulesFromContext,
} from "#engine/parameters/contextAdapters";
import {
  type ParameterId,
  ParameterId as Params,
} from "#engine/parameters/types";
import {
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  type EuroAmount,
  type NetSalary,
  TaxClass,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
  toPercentageRate,
} from "#engine/types";

export interface UnifiedHouseholdTaxSummary {
  readonly combinedGrossAnnualEur: EuroAmount;
  readonly estimatedTaxableIncomeZvEEur: EuroAmount;
  readonly estimatedAnnualIncomeTaxEur: EuroAmount;
  readonly annualKindergeldEur: EuroAmount;
  readonly isKinderfreibetragFavorable: boolean;
}

export interface UnifiedHouseholdPayrollSummary {
  readonly appliedTaxClassLabel: string;
  readonly primaryMonthlyNetEur: NetSalary;
  readonly partnerMonthlyNetEur: NetSalary;
  readonly householdMonthlyNetEur: NetSalary;
  readonly householdAnnualNetEur: EuroAmount;
  readonly householdMonthlyWageTaxEur: EuroAmount;
  readonly householdMonthlySocialSecurityEur: EuroAmount;
  readonly householdMonthlyCashWithKindergeldEur: EuroAmount;
}

export interface UnifiedParentalLeaveSummary {
  readonly primaryBasiselterngeldMonthlyEur: EuroAmount;
  readonly primaryElterngeldPlusMonthlyEur: EuroAmount;
  readonly partnerBasiselterngeldMonthlyEur: EuroAmount;
  readonly partnerElterngeldPlusMonthlyEur: EuroAmount;
  readonly siblingBonusBasisMonthlyEur: EuroAmount;
  readonly coupleIncomeCapEur: EuroAmount;
  readonly incomeCapExceeded: boolean;
}

export interface UnifiedLifeEvaluationResult {
  readonly profile: UnifiedLifeProfile;
  readonly householdTax: UnifiedHouseholdTaxSummary;
  readonly householdPayroll: UnifiedHouseholdPayrollSummary;
  readonly parentalLeave: UnifiedParentalLeaveSummary;
  readonly visa: BlueCardEligibilityFormulaResult;
  readonly companyCar: CompanyCarBenefitFormulaResult;
  readonly solarEnergy: SolarEnergyYieldFormulaResult;
  readonly housing: HousingAcquisitionFormulaResult;
  readonly combinedAnnualBonusAndSavingsEur: EuroAmount;
  readonly governingLawIds: readonly LawId[];
  readonly consumedParameterIds: readonly ParameterId[];
}

function roundToCent(amount: number): number {
  return Math.round(amount * 100 + Number.EPSILON * amount * 100) / 100;
}

/**
 * Evaluates all connected statutory calculators from a single `UnifiedLifeProfile`
 * and an immutable `StatutoryCalculationContext`, returning cross-domain outputs and
 * consolidated legal/parameter provenance.
 */
export function evaluateUnifiedLifeProfile(
  profile: UnifiedLifeProfile,
  context: StatutoryCalculationContext,
): UnifiedLifeEvaluationResult {
  const workExpenseAllowance = context.getParameterEuroAmount(Params.Tax_WorkExpenseAllowance);
  const specialExpenseAllowance = context.getParameterEuroAmount(Params.Tax_SpecialExpenseAllowance);
  const monthlyChildBenefit = context.getParameterEuroAmount(Params.Tax_ChildBenefitMonthly);

  const primaryZvE = Math.max(
    0,
    profile.primaryAnnualGrossEur * 0.85 - workExpenseAllowance - specialExpenseAllowance,
  );
  const partnerZvE = profile.hasPartner
    ? Math.max(
      0,
      profile.partnerAnnualGrossEur * 0.85 - workExpenseAllowance - specialExpenseAllowance,
    )
    : 0;
  const combinedGrossAnnualEur = toEuroAmount(
    roundToCent(
      profile.primaryAnnualGrossEur +
      (profile.hasPartner ? profile.partnerAnnualGrossEur : 0),
    ),
  );
  const estimatedTaxableIncomeZvEEur = toEuroAmount(roundToCent(primaryZvE + partnerZvE));

  const lawIdSet = new Set<LawId>();
  const parameterIdSet = new Set<ParameterId>([
    Params.Tax_WorkExpenseAllowance,
    Params.Tax_SpecialExpenseAllowance,
    Params.Tax_ChildBenefitMonthly,
    Params.Benefit_CoupleTaxableIncomeMaximum,
  ]);

  let estimatedAnnualIncomeTaxEur: EuroAmount;
  let isKinderfreibetragFavorable = false;

  if (profile.hasPartner) {
    const splitTax = evaluateJointSplittingTaxInContext(
      {
        primarySpouseTaxableIncome: primaryZvE,
        secondarySpouseTaxableIncome: partnerZvE,
      },
      context,
    );
    estimatedAnnualIncomeTaxEur = splitTax.value;
    for (const id of splitTax.audit.governingLawIds) {
      lawIdSet.add(id);
    }
    for (const id of splitTax.audit.consumedParameterIds) {
      parameterIdSet.add(id);
    }
  }
  else {
    const singleTax = evaluateAnnualIncomeTaxInContext(
      { annualTaxableIncome: primaryZvE },
      context,
    );
    estimatedAnnualIncomeTaxEur = singleTax.value;
    for (const id of singleTax.audit.governingLawIds) {
      lawIdSet.add(id);
    }
    for (const id of singleTax.audit.consumedParameterIds) {
      parameterIdSet.add(id);
    }
  }

  if (profile.dependentChildrenCount > 0) {
    const favorability = evaluateChildAllowanceFavorabilityInContext(
      {
        jointAnnualTaxableIncome: estimatedTaxableIncomeZvEEur,
        annualProgressionIncome: toEuroAmount(0),
        qualifyingChildMonthsCount: profile.dependentChildrenCount * 12,
      },
      context,
    );
    isKinderfreibetragFavorable = favorability.value.isKinderfreibetragFavorable;
    if (isKinderfreibetragFavorable) {
      estimatedAnnualIncomeTaxEur = favorability.value.jointTaxWithAllowance;
    }
    for (const id of favorability.audit.governingLawIds) {
      lawIdSet.add(id);
    }
    for (const id of favorability.audit.consumedParameterIds) {
      parameterIdSet.add(id);
    }
  }

  const annualKindergeldEur = toEuroAmount(
    roundToCent(profile.dependentChildrenCount * monthlyChildBenefit * 12),
  );

  // Statutory Employee Payroll (Net Pay) projection
  const taxRules = createTaxRulesFromContext(context, profile.planningYear);
  const primaryTaxClass = profile.hasPartner
    ? TaxClass.IV
    : profile.dependentChildrenCount > 0
      ? TaxClass.II
      : TaxClass.I;
  const payrollOptions = {
    isParent: profile.dependentChildrenCount > 0,
    ageAtYearStart: toAgeYears(profile.applicantAgeYears),
  };
  const primaryPayroll = computeGrossToNetBreakdown(
    toGrossSalary(profile.primaryAnnualGrossEur / 12),
    primaryTaxClass,
    profile.dependentChildrenCount,
    undefined,
    undefined,
    taxRules,
    payrollOptions,
  );
  const partnerPayroll = profile.hasPartner
    ? computeGrossToNetBreakdown(
      toGrossSalary(profile.partnerAnnualGrossEur / 12),
      TaxClass.IV,
      profile.dependentChildrenCount,
      undefined,
      undefined,
      taxRules,
      payrollOptions,
    )
    : undefined;

  const primaryMonthlyNetEur = primaryPayroll.monthlyNetTakeHome;
  const partnerMonthlyNetEur = partnerPayroll
    ? partnerPayroll.monthlyNetTakeHome
    : toNetSalary(0);
  const householdMonthlyNetEur = toNetSalary(
    roundToCent(primaryMonthlyNetEur + partnerMonthlyNetEur),
  );
  const householdAnnualNetEur = toEuroAmount(roundToCent(householdMonthlyNetEur * 12));
  const householdMonthlyWageTaxEur = toEuroAmount(
    roundToCent(
      primaryPayroll.totalTaxWithholding +
      (partnerPayroll?.totalTaxWithholding ?? 0),
    ),
  );
  const householdMonthlySocialSecurityEur = toEuroAmount(
    roundToCent(
      primaryPayroll.totalSocialSecurity +
      (partnerPayroll?.totalSocialSecurity ?? 0),
    ),
  );
  const householdMonthlyCashWithKindergeldEur = toEuroAmount(
    roundToCent(householdMonthlyNetEur + annualKindergeldEur / 12),
  );
  lawIdSet.add(Laws.EStG_38b);
  lawIdSet.add(Laws.EStG_66);

  // Statutory Parental Leave (Elterngeld) projection from Net Pay baseline
  const coupleIncomeCapEur = context.getParameterEuroAmount(
    Params.Benefit_CoupleTaxableIncomeMaximum,
  );
  const incomeCapExceeded = estimatedTaxableIncomeZvEEur > coupleIncomeCapEur;
  const primaryElterngeldEval = evaluateParentalBenefitEntitlementInContext(
    {
      preBirthMonthlyNet: primaryMonthlyNetEur,
      partTimeMonthlyNet: toNetSalary(0),
    },
    context,
  );
  for (const id of primaryElterngeldEval.audit.governingLawIds) {
    lawIdSet.add(id);
  }
  for (const id of primaryElterngeldEval.audit.consumedParameterIds) {
    parameterIdSet.add(id);
  }
  const partnerElterngeldEval = profile.hasPartner
    ? evaluateParentalBenefitEntitlementInContext(
      {
        preBirthMonthlyNet: partnerMonthlyNetEur,
        partTimeMonthlyNet: toNetSalary(0),
      },
      context,
    )
    : undefined;

  let siblingBonusBasisMonthlyEur = toEuroAmount(0);
  if (profile.dependentChildrenCount >= 1) {
    const siblingEval = evaluateSiblingBonusInContext(
      {
        baseElterngeldPlus: primaryElterngeldEval.value.elterngeldPlus,
        siblingAgesInMonths: [24],
      },
      context,
    );
    siblingBonusBasisMonthlyEur = toEuroAmount(
      roundToCent(siblingEval.value.siblingBonusAmount * 2),
    );
    for (const id of siblingEval.audit.governingLawIds) {
      lawIdSet.add(id);
    }
    for (const id of siblingEval.audit.consumedParameterIds) {
      parameterIdSet.add(id);
    }
  }

  const visaEval = evaluateBlueCardEligibilityInContext(
    {
      annualGrossSalary: profile.primaryAnnualGrossEur,
      applicantAgeYears: profile.applicantAgeYears,
      occupationRoute: profile.occupationRoute,
      germanLevel: profile.germanLevel,
    },
    context,
  );
  for (const id of visaEval.audit.governingLawIds) {
    lawIdSet.add(id);
  }
  for (const id of visaEval.audit.consumedParameterIds) {
    parameterIdSet.add(id);
  }

  const carEval = evaluateCompanyCarBenefitInContext(
    {
      grossListPriceEur: profile.companyCarListPriceEur,
      powertrain: profile.companyCarPowertrain,
      commuteOneWayKm: profile.commuteOneWayKm,
      commuteValuationMethod: profile.commuteValuationMethod,
      commuteOfficeDaysPerMonth: profile.commuteOfficeDaysPerMonth,
      combinedMarginalTaxAndSocialRate: profile.assumedMarginalTaxAndSocialRate,
    },
    context,
  );
  for (const id of carEval.audit.governingLawIds) {
    lawIdSet.add(id);
  }
  for (const id of carEval.audit.consumedParameterIds) {
    parameterIdSet.add(id);
  }

  const solarEval = evaluateSolarEnergyYieldInContext(
    {
      capacityKwp: profile.solarCapacityKwp,
      specificYieldKwhPerKwp: 950,
      systemCostNetEur: profile.solarSystemCostNetEur,
      annualMaintenanceEur: toEuroAmount(150),
      annualHouseholdConsumptionKwh: profile.annualHouseholdElectricityKwh,
      selfConsumptionShareRate: toPercentageRate(0.32),
      feedInMode: profile.solarFeedInMode,
      vatExemptEligible: true,
    },
    context,
  );
  for (const id of solarEval.audit.governingLawIds) {
    lawIdSet.add(id);
  }
  for (const id of solarEval.audit.consumedParameterIds) {
    parameterIdSet.add(id);
  }

  const housingEval = evaluateHousingAcquisitionInContext(
    {
      purchasePriceEur: profile.targetPropertyPriceEur,
      availableEquityEur: profile.availableEquityEur,
      federalState: profile.federalState,
      includesBrokerCommission: profile.includesBrokerCommission,
      isOwnerOccupiedNewBuildOrKfw300Standard: profile.isKfw300NewBuild,
      isQngPlusCertified: profile.isQngPlusCertified,
      dependentChildrenCount: profile.dependentChildrenCount,
      priorAverageHouseholdZvEEur: estimatedTaxableIncomeZvEEur,
      renovationLaborCostEur: profile.annualRenovationLaborEur,
      marketMortgageAnnualInterestRate: toPercentageRate(0.036),
      initialAnnualRepaymentRate: toPercentageRate(0.02),
    },
    context,
  );
  for (const id of housingEval.audit.governingLawIds) {
    lawIdSet.add(id);
  }
  for (const id of housingEval.audit.consumedParameterIds) {
    parameterIdSet.add(id);
  }

  const combinedAnnualBonusAndSavingsEur = toEuroAmount(
    roundToCent(
      annualKindergeldEur +
      (profile.hasCompanyCar ? carEval.value.annualTaxSavingsVsIce : 0) +
      (profile.plansSolarPv ? solarEval.value.annualNetCashBenefit : 0) +
      (profile.plansHomePurchase ? housingEval.value.craftsmanTaxCreditEur : 0),
    ),
  );

  return Object.freeze({
    profile,
    householdTax: Object.freeze({
      combinedGrossAnnualEur,
      estimatedTaxableIncomeZvEEur,
      estimatedAnnualIncomeTaxEur,
      annualKindergeldEur,
      isKinderfreibetragFavorable,
    }),
    householdPayroll: Object.freeze({
      appliedTaxClassLabel: profile.hasPartner
        ? "Class IV / IV"
        : primaryTaxClass === TaxClass.II
          ? "Class II"
          : "Class I",
      primaryMonthlyNetEur,
      partnerMonthlyNetEur,
      householdMonthlyNetEur,
      householdAnnualNetEur,
      householdMonthlyWageTaxEur,
      householdMonthlySocialSecurityEur,
      householdMonthlyCashWithKindergeldEur,
    }),
    parentalLeave: Object.freeze({
      primaryBasiselterngeldMonthlyEur: incomeCapExceeded
        ? toEuroAmount(0)
        : toEuroAmount(roundToCent(primaryElterngeldEval.value.basiselterngeld)),
      primaryElterngeldPlusMonthlyEur: incomeCapExceeded
        ? toEuroAmount(0)
        : toEuroAmount(roundToCent(primaryElterngeldEval.value.elterngeldPlus)),
      partnerBasiselterngeldMonthlyEur: incomeCapExceeded || !partnerElterngeldEval
        ? toEuroAmount(0)
        : toEuroAmount(roundToCent(partnerElterngeldEval.value.basiselterngeld)),
      partnerElterngeldPlusMonthlyEur: incomeCapExceeded || !partnerElterngeldEval
        ? toEuroAmount(0)
        : toEuroAmount(roundToCent(partnerElterngeldEval.value.elterngeldPlus)),
      siblingBonusBasisMonthlyEur: incomeCapExceeded ? toEuroAmount(0) : siblingBonusBasisMonthlyEur,
      coupleIncomeCapEur,
      incomeCapExceeded,
    }),
    visa: visaEval.value,
    companyCar: carEval.value,
    solarEnergy: solarEval.value,
    housing: housingEval.value,
    combinedAnnualBonusAndSavingsEur,
    governingLawIds: Object.freeze([...lawIdSet]),
    consumedParameterIds: Object.freeze([...parameterIdSet]),
  });
}
