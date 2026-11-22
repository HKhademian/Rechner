import {
  signal,
} from "@preact/signals";
import {
  type PregnancyId,
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
