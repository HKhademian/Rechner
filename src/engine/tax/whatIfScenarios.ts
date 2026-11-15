import {
  HouseholdRelationship,
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import {
  toChildrenCount,
} from "#engine/types";
import {
  type CalculatorInputs,
} from "#store/calculatorStore";

export const WhatIfScenarioKind = {
  Raise10: "raise-10",
  PartnerSplit: "partner-split",
  AddChild: "add-child",
} as const;
export type WhatIfScenarioKind = (typeof WhatIfScenarioKind)[keyof typeof WhatIfScenarioKind];

export function isWhatIfScenarioKind(value: unknown): value is WhatIfScenarioKind {
  return typeof value === "string" && Object.values(WhatIfScenarioKind).includes(value as WhatIfScenarioKind);
}

export function toWhatIfScenarioKind(value: string): WhatIfScenarioKind {
  if (!isWhatIfScenarioKind(value)) {
    throw new TypeError(`Unknown what-if scenario kind: "${value}".`);
  }
  return value;
}

export interface WhatIfScenarioSpec {
  readonly kind: WhatIfScenarioKind;
  readonly buttonLabel: string;
  readonly title: string;
  readonly description: string;
  readonly inputs: CalculatorInputs;
}

function roundScaledSalary(amount: number, factor: number): number {
  const scaled = amount * factor;
  return scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 100) / 100;
}

function partnerScenarioLabel(base: CalculatorInputs): {
  readonly buttonLabel: string;
  readonly title: string;
  readonly description: string;
  readonly taxBracket: string;
  readonly partnerTaxBracket: string;
} {
  if (!base.hasPartner) {
    return {
      buttonLabel: "With partner (Joint)",
      title: "What if: With partner",
      description: "Adds partner payroll with married joint splitting (Class IV / IV).",
      taxBracket: "4",
      partnerTaxBracket: "4",
    };
  }
  const switchingToFour = base.taxBracket === "3" && base.partnerTaxBracket === "5";
  if (switchingToFour) {
    return {
      buttonLabel: "Class IV / IV split",
      title: "What if: Class IV / IV",
      description: "Compares switching from Tax Class III / V to equal Class IV / IV withholding.",
      taxBracket: "4",
      partnerTaxBracket: "4",
    };
  }
  return {
    buttonLabel: "Class III / V split",
    title: "What if: Class III / V",
    description: "Compares assigning Tax Class III to you and Class V to your partner under joint assessment.",
    taxBracket: "3",
    partnerTaxBracket: "5",
  };
}

/**
 * Derive a non-destructive "What if..." comparison scenario from active household inputs.
 * Both the baseline and the derived scenario execute through the exact same payroll & tax engine.
 */
export function buildWhatIfScenario(
  base: CalculatorInputs,
  kind: WhatIfScenarioKind,
): WhatIfScenarioSpec {
  switch (kind) {
    case WhatIfScenarioKind.Raise10: {
      const nextGross = roundScaledSalary(base.grossIncome, 1.1);
      return {
        kind,
        buttonLabel: "+10% Raise",
        title: "What if: +10% Raise",
        description: "Primary gross salary increased by 10% while keeping all other household inputs unchanged.",
        inputs: {
          ...base,
          grossIncome: nextGross,
        },
      };
    }
    case WhatIfScenarioKind.PartnerSplit: {
      const partnerPlan = partnerScenarioLabel(base);
      const fallbackPartnerGross = base.inputMode === "monthly" ? 3333 : 40000;
      return {
        kind,
        buttonLabel: partnerPlan.buttonLabel,
        title: partnerPlan.title,
        description: partnerPlan.description,
        inputs: {
          ...base,
          hasPartner: true,
          relationshipStatus: HouseholdRelationship.MarriedOrCivilPartners,
          assessmentMode: TaxAssessment.Joint,
          taxBracket: partnerPlan.taxBracket,
          partnerTaxBracket: partnerPlan.partnerTaxBracket,
          partnerGrossIncome: base.partnerGrossIncome > 0 ? base.partnerGrossIncome : fallbackPartnerGross,
        },
      };
    }
    case WhatIfScenarioKind.AddChild: {
      const nextChildren = toChildrenCount(Math.min(10, Math.max(0, base.children) + 1));
      return {
        kind,
        buttonLabel: "+1 Child",
        title: `What if: ${nextChildren} ${nextChildren === 1 ? "Child" : "Children"}`,
        description: "Adds one dependent child (nursing-care relief and child allowance context).",
        inputs: {
          ...base,
          children: nextChildren,
        },
      };
    }
  }
}

/** Return the ordered list of quick what-if comparators for the active inputs. */
export function getAvailableWhatIfScenarios(base: CalculatorInputs): readonly WhatIfScenarioSpec[] {
  return [
    buildWhatIfScenario(base, WhatIfScenarioKind.Raise10),
    buildWhatIfScenario(base, WhatIfScenarioKind.PartnerSplit),
    buildWhatIfScenario(base, WhatIfScenarioKind.AddChild),
  ];
}
