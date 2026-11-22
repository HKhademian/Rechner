import {
  type EuroAmount,
  type GrossSalary,
  type SimulationMonth,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
  toSimulationMonth,
} from "#engine/types";
import {
  type DisasterShockConfig,
  type LifePlanInput,
  type LifeSimulatorEvent,
  DisasterKind,
  JobEndCause,
  LifeEventDomain,
  LifeEventKind,
  LifePersonKey,
  TaxBucket,
  toLifeEventId,
} from "#engine/lifeSimulator/types";

export const DisasterPresetId = {
  Fired6m: "FIRED_6M",
  ResignedSperrzeit6m: "RESIGNED_SPERRZEIT_6M",
  LongIllness6m: "LONG_ILLNESS_6M",
  PartnerJobLoss6m: "PARTNER_JOB_LOSS_6M",
  Emergency15k: "EMERGENCY_15K",
  CompoundFiredAndEmergency: "COMPOUND_FIRED_AND_EMERGENCY",
} as const;
export type DisasterPresetId = (typeof DisasterPresetId)[keyof typeof DisasterPresetId];

export function toDisasterPresetId(value: string): DisasterPresetId {
  if (!Object.values(DisasterPresetId).includes(value as DisasterPresetId)) {
    throw new TypeError(`Invalid DisasterPresetId: ${value}`);
  }
  return value as DisasterPresetId;
}

export interface DisasterPresetDefinition {
  readonly id: DisasterPresetId;
  readonly name: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly buildShocks: (triggerMonth: SimulationMonth) => readonly DisasterShockConfig[];
}

export const DISASTER_PRESETS: readonly DisasterPresetDefinition[] = Object.freeze([
  Object.freeze({
    id: DisasterPresetId.Fired6m,
    name: "Employer Termination (6m + ALG I)",
    shortLabel: "Fired 6m",
    description: "Immediate layoff with ALG I (60%/67% BBG-capped, § 32b progression) and 6-month job search.",
    buildShocks: (triggerMonth: SimulationMonth) => Object.freeze([
      Object.freeze({
        id: "SHOCK-FIRED-6M",
        kind: DisasterKind.EmployerTermination,
        label: "Employer Termination (6m + ALG I)",
        triggerMonth,
        durationMonths: 6,
        personKey: LifePersonKey.Primary,
        reemploymentSalaryRatio: toPercentageRate(0.95),
      }),
    ]),
  }),
  Object.freeze({
    id: DisasterPresetId.ResignedSperrzeit6m,
    name: "Voluntary Resignation (12w Sperrzeit + 3m ALG I)",
    shortLabel: "Resigned + Sperrzeit",
    description: "3-month § 159 SGB III Sperrzeit with €0 ALG I followed by 3 months of ALG I before re-employment.",
    buildShocks: (triggerMonth: SimulationMonth) => Object.freeze([
      Object.freeze({
        id: "SHOCK-RESIGNED-6M",
        kind: DisasterKind.VoluntaryResignation,
        label: "Voluntary Resignation (12w Sperrzeit)",
        triggerMonth,
        durationMonths: 6,
        personKey: LifePersonKey.Primary,
        reemploymentSalaryRatio: toPercentageRate(1.0),
      }),
    ]),
  }),
  Object.freeze({
    id: DisasterPresetId.LongIllness6m,
    name: "Long-Term Illness (6m Krankengeld)",
    shortLabel: "Illness 6m",
    description: "Reduced § 47 SGB V Krankengeld replacement (~70% gross / 90% net cap, § 32b progression) for 6 months.",
    buildShocks: (triggerMonth: SimulationMonth) => Object.freeze([
      Object.freeze({
        id: "SHOCK-ILLNESS-6M",
        kind: DisasterKind.LongTermIllness,
        label: "Long-Term Illness (Krankengeld)",
        triggerMonth,
        durationMonths: 6,
        personKey: LifePersonKey.Primary,
        reemploymentSalaryRatio: toPercentageRate(1.0),
      }),
    ]),
  }),
  Object.freeze({
    id: DisasterPresetId.PartnerJobLoss6m,
    name: "Partner Income Loss (6m + ALG I)",
    shortLabel: "Partner Loss 6m",
    description: "Partner loses employment income for 6 months while primary earner maintains household commitments.",
    buildShocks: (triggerMonth: SimulationMonth) => Object.freeze([
      Object.freeze({
        id: "SHOCK-PARTNER-LOSS-6M",
        kind: DisasterKind.PartnerIncomeLoss,
        label: "Partner Job Loss (6m + ALG I)",
        triggerMonth,
        durationMonths: 6,
        personKey: LifePersonKey.Partner,
        reemploymentSalaryRatio: toPercentageRate(0.95),
      }),
    ]),
  }),
  Object.freeze({
    id: DisasterPresetId.Emergency15k,
    name: "€15,000 Unexpected Emergency",
    shortLabel: "€15k Emergency",
    description: "Sudden €15,000 lump-sum cash shock (major repair, vehicle replacement, or unexpected Nachzahlung).",
    buildShocks: (triggerMonth: SimulationMonth) => Object.freeze([
      Object.freeze({
        id: "SHOCK-EMERGENCY-15K",
        kind: DisasterKind.LumpSumEmergency,
        label: "€15,000 Emergency Shock",
        triggerMonth,
        durationMonths: 1,
        personKey: LifePersonKey.Primary,
        lumpSumCost: toEuroAmount(15000),
      }),
    ]),
  }),
  Object.freeze({
    id: DisasterPresetId.CompoundFiredAndEmergency,
    name: "Compound: Fired (6m) + €10k Emergency",
    shortLabel: "Fired + €10k",
    description: "Worst-case compound stress: employer layoff for 6 months coinciding with a €10,000 cash emergency.",
    buildShocks: (triggerMonth: SimulationMonth) => Object.freeze([
      Object.freeze({
        id: "SHOCK-COMPOUND-FIRED",
        kind: DisasterKind.EmployerTermination,
        label: "Employer Termination (6m + ALG I)",
        triggerMonth,
        durationMonths: 6,
        personKey: LifePersonKey.Primary,
        reemploymentSalaryRatio: toPercentageRate(0.9),
      }),
      Object.freeze({
        id: "SHOCK-COMPOUND-10K",
        kind: DisasterKind.LumpSumEmergency,
        label: "€10,000 Emergency Outflow",
        triggerMonth,
        durationMonths: 1,
        personKey: LifePersonKey.Primary,
        lumpSumCost: toEuroAmount(10000),
      }),
    ]),
  }),
]);

function resolveReemploymentGross(
  plan: LifePlanInput,
  personKey: LifePersonKey,
  ratio: number,
): GrossSalary {
  const baseGross = personKey === LifePersonKey.Primary
    ? plan.baseline.primary.monthlyGross
    : (plan.baseline.partner?.monthlyGross ?? toGrossSalary(0));
  return toGrossSalary(Math.round(baseGross * Math.max(0, ratio) * 100) / 100);
}

/**
 * Pure non-destructive shock injector.
 * Transforms a planned `LifePlanInput` into a stressed `LifePlanInput` by appending
 * deterministic disaster events (fired/ALG I, resignation/Sperrzeit, illness/Krankengeld,
 * partner job loss, emergency lump sum, or housing-cost jump) plus an optional monthly
 * commitment delta (e.g. testing +€500/mo higher rent or mortgage).
 */
export function applyDisasterShocks(
  plan: LifePlanInput,
  shocks: readonly DisasterShockConfig[],
  additionalMonthlyCommitmentEur: EuroAmount = toEuroAmount(0),
): LifePlanInput {
  const extraEvents: LifeSimulatorEvent[] = [];

  for (const shock of shocks) {
    const triggerMonth = toSimulationMonth(
      Math.max(1, Math.min(plan.baseline.horizonMonths, shock.triggerMonth)),
    );
    const ratio = shock.reemploymentSalaryRatio ?? 1;

    switch (shock.kind) {
      case DisasterKind.EmployerTermination:
        extraEvents.push({
          id: toLifeEventId(`DISASTER-${shock.id}`),
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.JobEnd,
          effectiveMonth: triggerMonth,
          title: shock.label,
          personKey: shock.personKey,
          cause: JobEndCause.EmployerTermination,
          unemploymentMonths: Math.max(1, shock.durationMonths),
          severanceGross: shock.severanceGross,
          sperrzeitMonths: 0,
          reemploymentMonthlyGross: resolveReemploymentGross(plan, shock.personKey, ratio),
        });
        break;
      case DisasterKind.VoluntaryResignation:
        extraEvents.push({
          id: toLifeEventId(`DISASTER-${shock.id}`),
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.JobEnd,
          effectiveMonth: triggerMonth,
          title: shock.label,
          personKey: shock.personKey,
          cause: JobEndCause.VoluntaryResignation,
          unemploymentMonths: Math.max(1, shock.durationMonths),
          sperrzeitMonths: 3,
          reemploymentMonthlyGross: resolveReemploymentGross(plan, shock.personKey, ratio),
        });
        break;
      case DisasterKind.LongTermIllness:
        extraEvents.push({
          id: toLifeEventId(`DISASTER-${shock.id}`),
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.JobEnd,
          effectiveMonth: triggerMonth,
          title: `Long-Term Illness (${shock.label})`,
          personKey: shock.personKey,
          cause: JobEndCause.ContractEnd,
          unemploymentMonths: Math.max(1, shock.durationMonths),
          reemploymentMonthlyGross: resolveReemploymentGross(plan, shock.personKey, ratio),
        });
        break;
      case DisasterKind.PartnerIncomeLoss:
        if (plan.baseline.partner) {
          extraEvents.push({
            id: toLifeEventId(`DISASTER-${shock.id}`),
            domain: LifeEventDomain.Career,
            kind: LifeEventKind.JobEnd,
            effectiveMonth: triggerMonth,
            title: shock.label,
            personKey: LifePersonKey.Partner,
            cause: JobEndCause.EmployerTermination,
            unemploymentMonths: Math.max(1, shock.durationMonths),
            sperrzeitMonths: 0,
            reemploymentMonthlyGross: resolveReemploymentGross(plan, LifePersonKey.Partner, ratio),
          });
        }
        break;
      case DisasterKind.LumpSumEmergency: {
        const cost = shock.lumpSumCost ?? toEuroAmount(10000);
        extraEvents.push({
          id: toLifeEventId(`DISASTER-${shock.id}`),
          domain: LifeEventDomain.ExpenseTravel,
          kind: LifeEventKind.OneOffCashflow,
          effectiveMonth: triggerMonth,
          title: shock.label,
          signedAmount: toEuroAmount(-Math.abs(cost)),
          taxBucket: TaxBucket.NonTax,
        });
        break;
      }
      case DisasterKind.HousingCostShock: {
        const jump = shock.monthlyCostIncrease ?? toEuroAmount(300);
        extraEvents.push({
          id: toLifeEventId(`DISASTER-${shock.id}`),
          domain: LifeEventDomain.HousingAsset,
          kind: LifeEventKind.RentChange,
          effectiveMonth: triggerMonth,
          title: shock.label,
          newMonthlyRent: toEuroAmount(Math.max(0, plan.baseline.monthlyRent + jump)),
        });
        break;
      }
    }
  }

  const adjustedBaseline = additionalMonthlyCommitmentEur !== 0
    ? Object.freeze({
      ...plan.baseline,
      monthlyRent: toEuroAmount(Math.max(0, plan.baseline.monthlyRent + additionalMonthlyCommitmentEur)),
    })
    : plan.baseline;

  return Object.freeze({
    baseline: adjustedBaseline,
    events: Object.freeze([...plan.events, ...extraEvents]),
  });
}
