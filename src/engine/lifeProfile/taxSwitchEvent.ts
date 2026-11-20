import {
  type LifeEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  toLifeEventKind,
} from "#engine/lifeProfile/timeline";

export const TaxClassCombination = {
  IV_IV: "IV/IV",
  III_V: "III/V",
  V_III: "V/III",
  IV_IV_Factor: "IV/IV-factor",
} as const;
export type TaxClassCombination = (typeof TaxClassCombination)[keyof typeof TaxClassCombination];

export function toTaxClassCombination(value: string): TaxClassCombination {
  if (!Object.values(TaxClassCombination).includes(value as TaxClassCombination)) {
    throw new TypeError("Tax class combination must be IV/IV, III/V, V/III or IV/IV-factor.");
  }
  return value as TaxClassCombination;
}

export interface TaxClassSwitchPayload {
  readonly combination: TaxClassCombination;
  readonly note?: string;
}

/** Records a planned or actual German household tax class combination switch (§ 38b / § 39f EStG). */
export const taxClassSwitchModule: LifeEventModule<TaxClassSwitchPayload> = Object.freeze({
  kind: toLifeEventKind("tax.class-switch"),
  parsePayload(value: unknown): TaxClassSwitchPayload {
    if (typeof value !== "object" || value === null || Array.isArray(value)
      || Object.keys(value).some((key) => !["combination", "note"].includes(key))
      || !("combination" in value) || typeof value.combination !== "string") {
      throw new TypeError("A tax class switch needs a valid combination.");
    }
    const raw = value as Record<string, unknown>;
    if (raw.note !== undefined && (typeof raw.note !== "string" || !raw.note.trim())) {
      throw new TypeError("Optional tax switch note must be non-empty when provided.");
    }
    return Object.freeze({
      combination: toTaxClassCombination(value.combination),
      ...(typeof raw.note === "string" ? { note: raw.note.trim() } : {}),
    });
  },
});
