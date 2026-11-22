import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
  BannerTone,
  Button,
  ButtonSize,
  ButtonVariant,
  ModalDialog,
  ModalDialogSize,
  SegmentedControl,
  StatusBanner,
} from "#/components/ui/index.ts";
import {
  CheckmarkIcon,
  ClipboardCopyIcon,
  CsvExportIcon,
  DownloadFileIcon,
  JsonExportIcon,
  PdfExportIcon,
  PrintReportIcon,
  TextReportIcon,
  UploadFileIcon,
  WarningIcon,
  ZipExportIcon,
} from "#components/Icons";
import {
  type ImportValidationResult,
  ScenarioId,
} from "#engine/types";
import {
  type ElterngeldPersistedState,
} from "#engine/storage/persistence";
import {
  APPLICATION_NAME,
  EXPORT_SCHEMA_VERSION,
  exportStateToJson,
  exportStateToTextReport,
  exportStateToZip,
  importStateFromJson,
  triggerFileDownload,
  triggerPrintableReport,
} from "#engine/storage/exportImport";
import {
  exportScenarioToCsv,
} from "#engine/storage/ledgerCsv";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  importWorkbenchState,
  loadClassicPlannerIntoWorkbench,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchScenarioA,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
  flushWorkbenchCalculations,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  ExportImportMode,
  WorkbenchGranularModal,
  activeWorkbenchModal,
  closeWorkbenchModal,
  workbenchExportImportMode,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Full institutional Export / Import modal matching DataExportImportModal + 1-click Classic Planner bridge. */
export function WorkbenchExportImportModal(): JSX.Element {
  const open = activeWorkbenchModal.value === WorkbenchGranularModal.ExportImport;
  const mode = workbenchExportImportMode.value;
  const [pastedJson, setPastedJson] = useState("");
  const [importResult, setImportResult] =
    useState<ImportValidationResult<ElterngeldPersistedState> | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ tone: BannerTone;
    message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setStatusNotice(null);
    }
  }, [open]);

  const timelines = {
    [ScenarioId.A]: displayedWorkbenchScenarioA.value,
    [ScenarioId.B]: displayedWorkbenchScenarioB.value,
    [ScenarioId.C]: displayedWorkbenchScenarioC.value,
  };

  const handleJsonChange = (text: string): void => {
    setPastedJson(text);
    setStatusNotice(null);
    if (!text.trim()) {
      setImportResult(null);
      return;
    }
    setImportResult(importStateFromJson(text));
  };

  const readFileText = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        handleJsonChange(text);
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (event: DragEvent): void => {
    event.preventDefault();
    setIsDragOver(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      readFileText(event.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      readFileText(input.files[0]);
    }
  };

  const handleDownloadJson = (): void => {
    const json = exportStateToJson(workbenchState.peek());
    triggerFileDownload("parental_planner_state.json", json, "application/json");
    setStatusNotice({
      tone: BannerTone.Success,
      message: "Exported schema-compatible JSON plan (works in both Parental Planner and legacy Parental Leave Planner).",
    });
  };

  const handleCopyJson = async (): Promise<void> => {
    const json = exportStateToJson(workbenchState.peek());
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(json);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
    catch {
      // Ignore clipboard unavailability.
    }
  };

  const handlePasteClipboard = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      handleJsonChange(text);
    }
    catch {
      // Textarea remains available for manual paste.
    }
  };

  const handleDownloadText = (): void => {
    const report = exportStateToTextReport(workbenchState.peek(), timelines);
    triggerFileDownload("parental_planner_audit_report.txt", report, "text/plain;charset=utf-8");
    setStatusNotice({
      tone: BannerTone.Success,
      message: "Downloaded plain-text statutory audit report (.txt).",
    });
  };

  const handleDownloadCsv = (scenarioId: ScenarioId): void => {
    const csv = scenarioId === ScenarioId.C
      ? exportScenarioToCsv(timelines[ScenarioId.C], timelines[ScenarioId.B])
      : exportScenarioToCsv(timelines[scenarioId]);
    triggerFileDownload(`parental_planner_scenario_${scenarioId}.csv`, csv, "text/csv;charset=utf-8");
  };

  const handleDownloadZip = (): void => {
    const s = workbenchState.peek();
    const bytes = exportStateToZip({
      "plan.json": exportStateToJson(s),
      "audit_report.txt": exportStateToTextReport(s, timelines),
      "scenario_C_optimized.csv": exportScenarioToCsv(timelines[ScenarioId.C], timelines[ScenarioId.B]),
      "scenario_B_baseline.csv": exportScenarioToCsv(timelines[ScenarioId.B]),
      "scenario_A_status_quo.csv": exportScenarioToCsv(timelines[ScenarioId.A]),
    });
    triggerFileDownload("parental_planner_bundle.zip", bytes, "application/zip");
    setStatusNotice({
      tone: BannerTone.Success,
      message: "Downloaded full ZIP bundle (JSON + Audit Report + A/B/C CSV ledgers).",
    });
  };

  const handlePrint = (): void => {
    triggerPrintableReport(workbenchState.peek(), timelines);
  };

  const handleExecuteImport = (): void => {
    if (importResult && importResult.success) {
      importWorkbenchState(importResult.state);
      flushWorkbenchCalculations();
      setStatusNotice({
        tone: BannerTone.Success,
        message: "Simulation state imported and restored.",
      });
      setTimeout(() => {
        closeWorkbenchModal();
      }, 900);
    }
  };

  const handleLoadClassic = (): void => {
    const loaded = loadClassicPlannerIntoWorkbench();
    if (loaded) {
      flushWorkbenchCalculations();
      setStatusNotice({
        tone: BannerTone.Success,
        message: "Loaded your saved legacy Parental Leave Planner state into Parental Planner (read-only copy).",
      });
    }
    else {
      setStatusNotice({
        tone: BannerTone.Warning,
        message: "No saved legacy Parental Leave Planner state found in this browser.",
      });
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={closeWorkbenchModal}
      id="parental-planner-export-import-modal"
      size={ModalDialogSize.Large}
      eyebrow="Local Backup & Audit Reports"
      title="Simulation Data Portability"
      subtitle="Save a full backup, export spreadsheets/PDF, or restore an existing JSON plan. Your data stays in this browser."
      footer={(
        <>
          <span className="plw-modal-footer-meta">
            {APPLICATION_NAME} · v{EXPORT_SCHEMA_VERSION}.0
          </span>
          <Button size={ButtonSize.Sm} onClick={closeWorkbenchModal}>
            Close
          </Button>
        </>
      )}
    >
      <div className="plw-modal-stack">
        <SegmentedControl
          fullWidth
          label="Export or import simulation data"
          value={mode}
          options={[
            {
              value: ExportImportMode.Export,
              label: "Export Data & Reports",
            },
            {
              value: ExportImportMode.Import,
              label: "Import & Restore",
            },
          ]}
          onChange={(next) => {
            workbenchExportImportMode.value = next;
            setStatusNotice(null);
          }}
        />

        {statusNotice && (
          <StatusBanner tone={statusNotice.tone} compact>
            {statusNotice.message}
          </StatusBanner>
        )}

        {mode === ExportImportMode.Export ? (
          <>
            <div className="plw-export-grid">
              <div className="plw-export-card plw-export-card--featured">
                <div>
                  <div className="plw-export-card__head">
                    <div className="plw-export-card__title">
                      <ZipExportIcon size={18} />
                      <span>Multi-Format ZIP Bundle</span>
                    </div>
                    <Badge tone={BadgeTone.Brand}>Complete Archive</Badge>
                  </div>
                  <p className="plw-export-card__desc">
                    Bundles JSON configuration, plaintext audit report, and CSV monthly ledgers for Scenarios A, B, and C.
                  </p>
                </div>
                <Button variant={ButtonVariant.Primary} size={ButtonSize.Sm} onClick={handleDownloadZip}>
                  <DownloadFileIcon size={14} />
                  <span>Download ZIP (.zip)</span>
                </Button>
              </div>

              <div className="plw-export-card">
                <div>
                  <div className="plw-export-card__head">
                    <div className="plw-export-card__title">
                      <JsonExportIcon size={18} />
                      <span>JSON State Envelope</span>
                    </div>
                    <Badge tone={BadgeTone.Gain}>Machine Readable</Badge>
                  </div>
                  <p className="plw-export-card__desc">
                    Full state export compatible with both Parental Planner and legacy Parental Leave Planner.
                  </p>
                </div>
                <div className="plw-export-card__actions">
                  <Button variant={ButtonVariant.Tint} size={ButtonSize.Sm} onClick={handleDownloadJson}>
                    <DownloadFileIcon size={14} />
                    <span>Download JSON</span>
                  </Button>
                  <Button size={ButtonSize.Sm} onClick={() => void handleCopyJson()}>
                    {copySuccess ? <CheckmarkIcon size={14} /> : <ClipboardCopyIcon size={14} />}
                    <span>{copySuccess ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
              </div>

              <div className="plw-export-card">
                <div>
                  <div className="plw-export-card__head">
                    <div className="plw-export-card__title">
                      <TextReportIcon size={18} />
                      <span>Financial Audit Report</span>
                    </div>
                    <Badge tone={BadgeTone.Neutral}>Plaintext</Badge>
                  </div>
                  <p className="plw-export-card__desc">
                    Executive audit report with household profile, scenario comparison matrix, annual schedule, and statutory citations.
                  </p>
                </div>
                <Button size={ButtonSize.Sm} onClick={handleDownloadText}>
                  <DownloadFileIcon size={14} />
                  <span>Download Text Report (.txt)</span>
                </Button>
              </div>

              <div className="plw-export-card">
                <div>
                  <div className="plw-export-card__head">
                    <div className="plw-export-card__title">
                      <PdfExportIcon size={18} />
                      <span>Printable Executive PDF</span>
                    </div>
                    <Badge tone={BadgeTone.Warning}>Browser Print</Badge>
                  </div>
                  <p className="plw-export-card__desc">
                    Opens a print-formatted report window and triggers the system print dialog for direct &quot;Save as PDF&quot;.
                  </p>
                </div>
                <Button size={ButtonSize.Sm} onClick={handlePrint}>
                  <PrintReportIcon size={14} />
                  <span>Print / Save as PDF</span>
                </Button>
              </div>
            </div>

            <div className="plw-csv-box">
              <div className="plw-csv-box__head">
                <CsvExportIcon size={15} />
                <span>Export Individual Scenario CSV Ledgers (Excel / Numbers)</span>
              </div>
              <div className="plw-csv-box__grid">
                <Button size={ButtonSize.Sm} onClick={() => handleDownloadCsv(ScenarioId.A)}>
                  <DownloadFileIcon size={12} />
                  <span>Scenario A (No Births)</span>
                </Button>
                <Button size={ButtonSize.Sm} onClick={() => handleDownloadCsv(ScenarioId.B)}>
                  <DownloadFileIcon size={12} />
                  <span>Scenario B (Baseline)</span>
                </Button>
                <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={() => handleDownloadCsv(ScenarioId.C)}>
                  <DownloadFileIcon size={12} />
                  <span>Scenario C (Optimized)</span>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="plw-modal-section">
              <div className="plw-toolbar">
                <div>
                  <h3 className="plw-modal-section__title">One-Click Legacy Planner Bridge</h3>
                  <p className="plw-card__hint">
                    Copy your saved plan from the deprecated Parental Leave Planner into Parental Planner without altering your old data.
                  </p>
                </div>
                <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={handleLoadClassic}>
                  <UploadFileIcon size={13} />
                  <span>Load Legacy Plan</span>
                </Button>
              </div>
            </div>

            <div
              className={`plw-dropzone${isDragOver ? " plw-dropzone--drag" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
            >
              <UploadFileIcon size={24} />
              <strong>Drag &amp; drop a simulator <code>.json</code> file here</strong>
              <span>or select a file from your computer</span>
              <label className="ui-btn ui-btn--sm">
                <UploadFileIcon size={13} />
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="plw-dropzone__file-input"
                  onChange={handleFileInputChange}
                />
              </label>
            </div>

            <div className="plw-inline-control">
              <div className="plw-toolbar">
                <label htmlFor="plw-paste-json" className="plw-inline-control__label">
                  Paste JSON
                </label>
                <div className="plw-toolbar__group">
                  <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={() => void handlePasteClipboard()}>
                    Paste from clipboard
                  </Button>
                  {importResult && (
                    <Badge tone={importResult.success ? BadgeTone.Gain : BadgeTone.Loss}>
                      {importResult.success ? (
                        <>
                          <CheckmarkIcon size={12} />
                          <span>Valid State</span>
                        </>
                      ) : (
                        <>
                          <WarningIcon size={12} />
                          <span>Invalid JSON</span>
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </div>
              <textarea
                id="plw-paste-json"
                className="plw-textarea"
                placeholder='Paste JSON simulation state envelope here (e.g. { "simulationState": { ... } })…'
                value={pastedJson}
                onInput={(event) => handleJsonChange(event.currentTarget.value)}
              />
            </div>

            {importResult && importResult.success && (
              <div className="plw-import-preview">
                <div className="plw-toolbar">
                  <strong>Detected Simulation Parameters</strong>
                  <Badge tone={BadgeTone.Gain}>{importResult.state.simulationDurationMonths} Months Horizon</Badge>
                </div>
                <div className="plw-import-preview__grid">
                  <div className="plw-import-stat">
                    <div className="plw-import-stat__label">Partner 1 Gross</div>
                    <div className="plw-import-stat__value">{formatEur(importResult.state.husbandGross)}</div>
                    <div className="plw-import-stat__sub">Class {importResult.state.husbandInitialTaxClass ?? "III"}</div>
                  </div>
                  <div className="plw-import-stat">
                    <div className="plw-import-stat__label">Partner 2 Gross</div>
                    <div className="plw-import-stat__value">{formatEur(importResult.state.wifeGross)}</div>
                    <div className="plw-import-stat__sub">Class {importResult.state.wifeInitialTaxClass ?? "V"}</div>
                  </div>
                  <div className="plw-import-stat">
                    <div className="plw-import-stat__label">Plan Batches</div>
                    <div className="plw-import-stat__value">{importResult.state.customPregnancies.length} Children</div>
                    <div className="plw-import-stat__sub">
                      {importResult.state.customTaxClassSwitches.length} Swaps · {importResult.state.customSalaryRaises.length} Raises
                    </div>
                  </div>
                  <div className="plw-import-stat">
                    <div className="plw-import-stat__label">Dynamic Actions</div>
                    <div className="plw-import-stat__value">
                      {importResult.state.customWorkingHoursChanges?.length ?? 0} Hours
                    </div>
                    <div className="plw-import-stat__sub">
                      {importResult.state.customFinancialEvents?.length ?? 0} Events
                    </div>
                  </div>
                </div>

                {importResult.warnings.length > 0 && (
                  <StatusBanner tone={BannerTone.Warning} compact title="Adjustments">
                    {importResult.warnings.join(", ")}
                  </StatusBanner>
                )}

                <div>
                  <Button variant={ButtonVariant.Primary} onClick={handleExecuteImport}>
                    <CheckmarkIcon size={15} />
                    <span>Apply &amp; Restore Simulation State</span>
                  </Button>
                </div>
              </div>
            )}

            {importResult && !importResult.success && (
              <StatusBanner tone={BannerTone.Danger} compact title="Validation Error">
                {importResult.error}
              </StatusBanner>
            )}
          </>
        )}
      </div>
    </ModalDialog>
  );
}
