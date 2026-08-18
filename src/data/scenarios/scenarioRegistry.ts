/**
 * Scenario Registry & Catalog Module
 *
 * Central repository for all built-in simulator presets, custom scenarios,
 * and discovery routines across the Headless CLI and Reactive Web Dashboard.
 *
 * @module data/scenarios/scenarioRegistry
 */

import emptyScenario from "./empty.json" with { type: "json" };
import standard3ChildrenScenario from "./standard_3_children.json" with { type: "json" };
import singleChildScenario from "./single_child_tax_opt.json" with { type: "json" };
import twoChildrenScenario from "./two_children_close_spacing.json" with { type: "json" };
import highEarnerScenario from "./high_earner_household.json" with { type: "json" };
import equalEarnerScenario from "./equal_earners.json" with { type: "json" };
import partnerschaftsbonusScenario from "./part_time_partnerschaftsbonus.json" with { type: "json" };

/** Standard Scenario definition with metadata and payload. */
export interface ScenarioCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isDefault?: boolean;
  readonly isBase?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly data: Record<string, any>;
}


/** Complete catalog of all built-in scenarios. */
export const BUILTIN_SCENARIO_CATALOG: readonly ScenarioCatalogItem[] = [
  {
    id: "empty",
    name: "Empty Sandbox (Base)",
    description: "Clean baseline state with zero custom actions, ready for immediate personal salary entry",
    isDefault: true,
    isBase: true,
    data: emptyScenario,
  },
  {
    id: "standard_3_children",
    name: "Standard 3-Children Lifecycle",
    description: "Multi-year 3-children progression with § 2b BEEG tax switches and § 2a sibling bonuses",
    data: standard3ChildrenScenario,
  },
  {
    id: "single_child_tax_opt",
    name: "Single Child (Tax Optimization)",
    description: "Single child scenario with § 2b BEEG tax switch (III/V to V/III) and 12-month leave",
    data: singleChildScenario,
  },
  {
    id: "two_children_close_spacing",
    name: "Two Children (Close Spacing & Sibling Bonus)",
    description: "Two children spaced 20 months apart maximizing statutory Geschwisterbonus (§ 2a BEEG)",
    data: twoChildrenScenario,
  },
  {
    id: "high_earner_household",
    name: "High Earner Household",
    description: "High earner model (8,200 € / 4,500 € gross split) reaching statutory Elterngeld cap",
    data: highEarnerScenario,
  },
  {
    id: "equal_earners",
    name: "Equal Earner Household",
    description: "Equal income distribution (4,800 € / 4,800 € gross split) evaluating spousal parity",
    data: equalEarnerScenario,
  },
  {
    id: "part_time_partnerschaftsbonus",
    name: "Partnerschaftsbonus Model (24-32h)",
    description: "Both parents working 32 h/wk utilizing statutory 4-month Partnerschaftsbonus (§ 4b BEEG)",
    data: partnerschaftsbonusScenario,
  },
] as const;

/**
 * Finds a built-in scenario by its canonical identifier or common alias.
 *
 * @param identifier - Scenario ID (e.g. 'empty', 'standard_3_children', 'high_earner')
 * @returns Found scenario catalog item, or undefined if not matched.
 */
export function findBuiltinScenario(
  identifier: string,
): ScenarioCatalogItem | undefined {
  const norm = identifier.trim().toLowerCase().replace(/[-_.]/g, "");
  return BUILTIN_SCENARIO_CATALOG.find((item) => {
    const itemNorm = item.id.toLowerCase().replace(/[-_.]/g, "");
    return itemNorm === norm || item.id === identifier;
  });
}
