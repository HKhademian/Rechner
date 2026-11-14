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
} from "#engine/laws/types";
import {
  type UnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  type ParameterId,
  ParameterId as Params,
} from "#engine/parameters/types";
import {
  type EuroAmount,
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

export interface UnifiedHouseholdTaxSummary {
  readonly combinedGrossAnnualEur: EuroAmount;
  readonly estimatedTaxableIncomeZvEEur: EuroAmount;
  readonly estimatedAnnualIncomeTaxEur: EuroAmount;
  readonly annualKindergeldEur: EuroAmount;
  readonly isKinderfreibetragFavorable: boolean;
}

export interface UnifiedLifeEvaluationResult {
  readonly profile: UnifiedLifeProfile;
  readonly householdTax: UnifiedHouseholdTaxSummary;
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
    visa: visaEval.value,
    companyCar: carEval.value,
    solarEnergy: solarEval.value,
    housing: housingEval.value,
    combinedAnnualBonusAndSavingsEur,
    governingLawIds: Object.freeze([...lawIdSet]),
    consumedParameterIds: Object.freeze([...parameterIdSet]),
  });
}
