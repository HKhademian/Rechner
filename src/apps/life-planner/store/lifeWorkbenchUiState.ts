import {
  signal,
} from "@preact/signals";

export const LifeWorkbenchTab = {
  Overview: "overview",
  Timeline: "timeline",
  Ledger: "ledger",
  AnnualTax: "annual-tax",
  Deadlines: "deadlines",
  Rules: "rules",
} as const;
export type LifeWorkbenchTab = (typeof LifeWorkbenchTab)[keyof typeof LifeWorkbenchTab];

export function toLifeWorkbenchTab(value: string): LifeWorkbenchTab {
  if (!Object.values(LifeWorkbenchTab).includes(value as LifeWorkbenchTab)) {
    throw new TypeError(`Invalid LifeWorkbenchTab: ${value}`);
  }
  return value as LifeWorkbenchTab;
}

export const LifeScenarioView = {
  Planned: "planned",
  Baseline: "baseline",
  StressTest: "stress-test",
  Compare: "compare",
} as const;
export type LifeScenarioView = (typeof LifeScenarioView)[keyof typeof LifeScenarioView];

export function toLifeScenarioView(value: string): LifeScenarioView {
  if (!Object.values(LifeScenarioView).includes(value as LifeScenarioView)) {
    throw new TypeError(`Invalid LifeScenarioView: ${value}`);
  }
  return value as LifeScenarioView;
}

export const LifeDrawerSection = {
  All: "all",
  Household: "household",
  Career: "career",
  Family: "family",
  Housing: "housing",
  ExpensesTax: "expenses-tax",
  HorizonDisaster: "horizon-disaster",
} as const;
export type LifeDrawerSection = (typeof LifeDrawerSection)[keyof typeof LifeDrawerSection];

export const LifeChartMode = {
  LiquidCash: "liquid-cash",
  NetWorth: "net-worth",
  MonthlyCashflow: "monthly-cashflow",
} as const;
export type LifeChartMode = (typeof LifeChartMode)[keyof typeof LifeChartMode];

export const activeLifeTab = signal<LifeWorkbenchTab>(LifeWorkbenchTab.Overview);
export const activeLifeScenarioView = signal<LifeScenarioView>(LifeScenarioView.Planned);
export const activeLifeChartMode = signal<LifeChartMode>(LifeChartMode.LiquidCash);
export const lifeDrawerOpen = signal<boolean>(false);
export const lifeDrawerSection = signal<LifeDrawerSection>(LifeDrawerSection.All);
export const lifeEventComposerOpen = signal<boolean>(false);
export const editingLifeEventId = signal<string | null>(null);
export const lifeExportImportOpen = signal<boolean>(false);
export const customDisasterModalOpen = signal<boolean>(false);

export function openLifeInputsDrawer(section: LifeDrawerSection = LifeDrawerSection.All): void {
  lifeDrawerSection.value = section;
  lifeDrawerOpen.value = true;
}

export function closeLifeInputsDrawer(): void {
  lifeDrawerOpen.value = false;
}

export function openLifeEventComposer(): void {
  editingLifeEventId.value = null;
  lifeEventComposerOpen.value = true;
}

export function openLifeEventEditor(eventId: string): void {
  editingLifeEventId.value = eventId;
  lifeEventComposerOpen.value = true;
}

export function closeLifeEventComposer(): void {
  lifeEventComposerOpen.value = false;
  editingLifeEventId.value = null;
}

export function openLifeExportImport(): void {
  lifeExportImportOpen.value = true;
}

export function closeLifeExportImport(): void {
  lifeExportImportOpen.value = false;
}

export function openCustomDisasterModal(): void {
  customDisasterModalOpen.value = true;
}

export function closeCustomDisasterModal(): void {
  customDisasterModalOpen.value = false;
}
