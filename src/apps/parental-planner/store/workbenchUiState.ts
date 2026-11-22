import {
  signal,
} from "@preact/signals";
import {
  type PregnancyId,
  ActiveScenarioView,
} from "#engine/types";

export const WorkbenchTab = {
  Overview: "overview",
  Ledger: "ledger",
  Deadlines: "deadlines",
  AnnualTax: "annual-tax",
  Rules: "rules",
} as const;
export type WorkbenchTab = (typeof WorkbenchTab)[keyof typeof WorkbenchTab];

export function toWorkbenchTab(value: string): WorkbenchTab {
  if (!Object.values(WorkbenchTab).includes(value as WorkbenchTab)) {
    throw new TypeError(`Unknown workbench tab: ${value}`);
  }
  return value as WorkbenchTab;
}

export const WorkbenchGranularModal = {
  None: "none",
  Income: "income",
  Child: "child",
  TaxWork: "tax-work",
  Costs: "costs",
  Macro: "macro",
  ExportImport: "export-import",
} as const;
export type WorkbenchGranularModal =
  (typeof WorkbenchGranularModal)[keyof typeof WorkbenchGranularModal];

export function toWorkbenchGranularModal(value: string): WorkbenchGranularModal {
  if (!Object.values(WorkbenchGranularModal).includes(value as WorkbenchGranularModal)) {
    throw new TypeError(`Unknown workbench granular modal: ${value}`);
  }
  return value as WorkbenchGranularModal;
}

export const WorkbenchDrawerSection = {
  All: "all",
  Income: "income",
  Children: "children",
  TaxWork: "tax-work",
  Costs: "costs",
  Macro: "macro",
} as const;
export type WorkbenchDrawerSection =
  (typeof WorkbenchDrawerSection)[keyof typeof WorkbenchDrawerSection];

export function toWorkbenchDrawerSection(value: string): WorkbenchDrawerSection {
  if (!Object.values(WorkbenchDrawerSection).includes(value as WorkbenchDrawerSection)) {
    throw new TypeError(`Unknown workbench drawer section: ${value}`);
  }
  return value as WorkbenchDrawerSection;
}

export const ExportImportMode = {
  Export: "export",
  Import: "import",
} as const;
export type ExportImportMode =
  (typeof ExportImportMode)[keyof typeof ExportImportMode];

export const activeWorkbenchTab = signal<WorkbenchTab>(WorkbenchTab.Overview);
export const activeWorkbenchModal = signal<WorkbenchGranularModal>(WorkbenchGranularModal.None);
export const activeWorkbenchModalChildId = signal<PregnancyId | null>(null);
export const workbenchHoveredMonth = signal<number | null>(null);
export const workbenchExportImportMode = signal<ExportImportMode>(ExportImportMode.Export);
export const isPlanInputsDrawerOpen = signal<boolean>(false);
export const activeDrawerSection = signal<WorkbenchDrawerSection>(WorkbenchDrawerSection.All);
export const lastSingleScenarioView = signal<ActiveScenarioView>(
  ActiveScenarioView.StatutoryOptimized,
);

export function openPlanInputsDrawer(
  section: WorkbenchDrawerSection = WorkbenchDrawerSection.All,
): void {
  activeDrawerSection.value = section;
  isPlanInputsDrawerOpen.value = true;
}

export function closePlanInputsDrawer(): void {
  isPlanInputsDrawerOpen.value = false;
}

export function openWorkbenchModal(
  modal: WorkbenchGranularModal,
  childId: PregnancyId | null = null,
): void {
  activeWorkbenchModalChildId.value = childId;
  activeWorkbenchModal.value = modal;
}

export function openWorkbenchExportImport(mode: ExportImportMode): void {
  workbenchExportImportMode.value = mode;
  activeWorkbenchModal.value = WorkbenchGranularModal.ExportImport;
}

export function closeWorkbenchModal(): void {
  activeWorkbenchModal.value = WorkbenchGranularModal.None;
  activeWorkbenchModalChildId.value = null;
}
