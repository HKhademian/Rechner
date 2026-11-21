import "./ElterngeldPanels.css";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  useEffect,
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";
import {
  isExportImportModalOpen,
  exportImportActiveTab,
  closeExportImportModal,
  exportSimulationJson,
  exportSimulationText,
  exportSimulationZip,
  exportSimulationCsv,
  printSimulationReport,
  importSimulationState,
  getCurrentPersistedState,
} from "#store/elterngeldStore";
import {
  importStateFromJson,
  exportStateToJson,
  APPLICATION_NAME,
  EXPORT_SCHEMA_VERSION,
} from "#engine/storage/exportImport";
import {
  type ImportValidationResult,
  ScenarioId,
} from "#engine/types";
import {
  type ElterngeldPersistedState,
} from "#engine/storage/persistence";
import {
  JsonExportIcon,
  PdfExportIcon,
  TextReportIcon,
  ZipExportIcon,
  CsvExportIcon,
  PrintReportIcon,
  UploadFileIcon,
  DownloadFileIcon,
  ClipboardCopyIcon,
  CheckmarkIcon,
  WarningIcon,
} from "#components/Icons";
import {
  Badge,
  BadgeTone,
} from "#components/ui/Badge";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#components/ui/Button";
import {
  ModalDialog,
  ModalDialogSize,
} from "#components/ui/ModalDialog";
import {
  type SegmentedOption,
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  BannerTone,
  StatusBanner,
} from "#components/ui/StatusBanner";

const ExportImportTab = {
  Export: "export",
  Import: "import",
} as const;
type ExportImportTab = (typeof ExportImportTab)[keyof typeof ExportImportTab];

const TAB_OPTIONS: readonly SegmentedOption<ExportImportTab>[] = [
  {
    value: ExportImportTab.Export,
    label: "Export Data & Reports",
  },
  {
    value: ExportImportTab.Import,
    label: "Import & Restore",
  },
];

export function DataExportImportModal(): JSX.Element | null {
  const isOpen = isExportImportModalOpen.value;
  const [activeTab, setActiveTab] = useState<ExportImportTab>(
    exportImportActiveTab.value === "import" ? ExportImportTab.Import : ExportImportTab.Export,
  );
  const [pastedJson, setPastedJson] = useState<string>("");
  const [importResult, setImportResult] =
    useState<ImportValidationResult<ElterngeldPersistedState> | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(
        exportImportActiveTab.value === "import" ? ExportImportTab.Import : ExportImportTab.Export,
      );
    }
  }, [isOpen]);

  const handleJsonChange = (text: string): void => {
    setPastedJson(text);
    setImportSuccessMessage(null);
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

  const handleFileDrop = (e: DragEvent): void => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      readFileText(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      readFileText(input.files[0]);
    }
  };

  const handleCopyJson = async (): Promise<void> => {
    const jsonStr = exportStateToJson(getCurrentPersistedState());
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(jsonStr);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
    catch {
      // Ignore clipboard write errors
    }
  };

  const handlePasteJson = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      handleJsonChange(text);
    }
    catch {
      // Clipboard access can be unavailable; the text field remains available.
    }
  };

  const handleExecuteImport = (): void => {
    if (importResult && importResult.success) {
      importSimulationState(importResult.state);
      setImportSuccessMessage("Simulation state imported and restored.");
      setTimeout(() => {
        closeExportImportModal();
      }, 1200);
    }
  };

  return (
    <ModalDialog
      open={isOpen}
      onClose={closeExportImportModal}
      id="data-export-import-modal"
      eyebrow="Local Backup & Audit Reports"
      title="Simulation Data Portability"
      subtitle="Save a backup or restore it later. Your data stays in this browser."
      size={ModalDialogSize.Large}
      footer={(
        <>
          <span className="eg-modal-footer-meta">
            {APPLICATION_NAME} · v{EXPORT_SCHEMA_VERSION}.0
          </span>
          <Button size={ButtonSize.Sm} onClick={closeExportImportModal}>
            Close
          </Button>
        </>
      )}
    >
      <div className="eg-export-tabs">
        <SegmentedControl
          label="Export or import simulation data"
          value={activeTab}
          options={TAB_OPTIONS}
          onChange={setActiveTab}
          fullWidth
        />
      </div>

      {activeTab === ExportImportTab.Export ? (
        <div className="eg-modal-stack">
          <div className="eg-export-grid">
            <div className="eg-export-card eg-export-card--featured">
              <div>
                <div className="eg-export-card__head">
                  <div className="eg-export-card__title">
                    <span className="eg-export-card__icon--primary">
                      <ZipExportIcon size={18} />
                    </span>
                    <span>Multi-Format ZIP Bundle</span>
                  </div>
                  <Badge tone={BadgeTone.Brand}>Complete Archive</Badge>
                </div>
                <p className="eg-export-card__desc">
                  Bundles JSON configuration, plaintext audit report, and CSV monthly ledgers for Scenarios A, B, and C.
                </p>
              </div>
              <Button variant={ButtonVariant.Primary} size={ButtonSize.Sm} onClick={exportSimulationZip}>
                <DownloadFileIcon size={14} />
                <span>Download ZIP (.zip)</span>
              </Button>
            </div>

            <div className="eg-export-card">
              <div>
                <div className="eg-export-card__head">
                  <div className="eg-export-card__title">
                    <span className="eg-export-card__icon--gain">
                      <JsonExportIcon size={18} />
                    </span>
                    <span>JSON State Envelope</span>
                  </div>
                  <Badge tone={BadgeTone.Gain}>Machine Readable</Badge>
                </div>
                <p className="eg-export-card__desc">
                  Full state export containing all Batches 0–4 parameters for backup and instant re-importing.
                </p>
              </div>
              <div className="eg-export-card__actions">
                <Button variant={ButtonVariant.Tint} size={ButtonSize.Sm} onClick={exportSimulationJson}>
                  <DownloadFileIcon size={14} />
                  <span>Download JSON</span>
                </Button>
                <Button size={ButtonSize.Sm} onClick={handleCopyJson} title="Copy JSON directly to clipboard">
                  {copySuccess ? <CheckmarkIcon size={14} /> : <ClipboardCopyIcon size={14} />}
                  <span>{copySuccess ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            <div className="eg-export-card">
              <div>
                <div className="eg-export-card__head">
                  <div className="eg-export-card__title">
                    <span className="eg-export-card__icon--info">
                      <TextReportIcon size={18} />
                    </span>
                    <span>Financial Audit Report</span>
                  </div>
                  <Badge tone={BadgeTone.Neutral}>Plaintext</Badge>
                </div>
                <p className="eg-export-card__desc">
                  Executive audit report with household profile, scenario comparison matrix, annual schedule, and statutory citations.
                </p>
              </div>
              <Button size={ButtonSize.Sm} onClick={exportSimulationText}>
                <DownloadFileIcon size={14} />
                <span>Download Text Report (.txt)</span>
              </Button>
            </div>

            <div className="eg-export-card">
              <div>
                <div className="eg-export-card__head">
                  <div className="eg-export-card__title">
                    <span className="eg-export-card__icon--warn">
                      <PdfExportIcon size={18} />
                    </span>
                    <span>Printable Executive PDF</span>
                  </div>
                  <Badge tone={BadgeTone.Warning}>Browser Print</Badge>
                </div>
                <p className="eg-export-card__desc">
                  Opens a print-formatted report window and triggers the system print dialog for direct &quot;Save as PDF&quot;.
                </p>
              </div>
              <Button size={ButtonSize.Sm} onClick={printSimulationReport}>
                <PrintReportIcon size={14} />
                <span>Print / Save as PDF</span>
              </Button>
            </div>
          </div>

          <div className="eg-csv-box">
            <div className="eg-csv-box__head">
              <CsvExportIcon size={15} />
              <span>Export Individual Scenario CSV Ledgers (Excel / Numbers)</span>
            </div>
            <div className="eg-csv-box__grid">
              <Button size={ButtonSize.Sm} onClick={() => exportSimulationCsv(ScenarioId.A)}>
                <DownloadFileIcon size={12} />
                <span>Scenario A (Baseline)</span>
              </Button>
              <Button size={ButtonSize.Sm} onClick={() => exportSimulationCsv(ScenarioId.B)}>
                <DownloadFileIcon size={12} />
                <span>Scenario B (Tax Swap)</span>
              </Button>
              <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={() => exportSimulationCsv(ScenarioId.C)}>
                <DownloadFileIcon size={12} />
                <span>Scenario C (Maximum Strategy)</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="eg-modal-stack">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={`eg-dropzone${isDragOver ? " is-drag-over" : ""}`}
          >
            <div className="eg-dropzone__icon">
              <UploadFileIcon size={26} />
            </div>
            <div className="eg-dropzone__title">
              Drag &amp; drop a simulator <code>.json</code> file here
            </div>
            <div className="eg-dropzone__hint">
              or select a file from your computer
            </div>
            <label className="ui-btn ui-btn--sm">
              <UploadFileIcon size={13} />
              <span>Choose File</span>
              <input
                type="file"
                accept=".json,application/json"
                className="eg-dropzone__file-input"
                onChange={handleFileInputChange}
              />
            </label>
          </div>

          <div>
            <div className="eg-paste-head">
              <label className="eg-paste-label" htmlFor="eg-paste-json">Paste JSON</label>
              <div className="eg-paste-actions">
                <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={handlePasteJson}>
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
              id="eg-paste-json"
              className="eg-paste-textarea"
              value={pastedJson}
              onInput={(e) => handleJsonChange((e.target as HTMLTextAreaElement).value)}
              placeholder='Paste JSON simulation state envelope here (e.g. { "simulationState": { ... } })...'
              rows={5}
            />
          </div>

          {importResult && importResult.success && (
            <div className="eg-import-preview">
              <div className="eg-import-preview__head">
                <span className="eg-import-preview__title">Detected Simulation Parameters</span>
                <span className="eg-import-preview__horizon">
                  {importResult.state.simulationDurationMonths} Months Horizon
                </span>
              </div>

              <div className="eg-import-preview__grid">
                <div className="eg-import-stat">
                  <div className="eg-import-stat__label">Husband Gross</div>
                  <div className="eg-import-stat__value">{formatEur(importResult.state.husbandGross)}</div>
                  <div className="eg-import-stat__sub">Class {importResult.state.husbandInitialTaxClass ?? "III"}</div>
                </div>
                <div className="eg-import-stat">
                  <div className="eg-import-stat__label">Wife Gross</div>
                  <div className="eg-import-stat__value">{formatEur(importResult.state.wifeGross)}</div>
                  <div className="eg-import-stat__sub">Class {importResult.state.wifeInitialTaxClass ?? "V"}</div>
                </div>
                <div className="eg-import-stat">
                  <div className="eg-import-stat__label">Batches Config</div>
                  <div className="eg-import-stat__value">{importResult.state.customPregnancies.length} Children</div>
                  <div className="eg-import-stat__sub">
                    {importResult.state.customTaxClassSwitches.length} Swaps · {importResult.state.customSalaryRaises.length} Raises
                  </div>
                </div>
                <div className="eg-import-stat">
                  <div className="eg-import-stat__label">Dynamic Actions</div>
                  <div className="eg-import-stat__value">
                    {importResult.state.customWorkingHoursChanges?.length || 0} Hours
                  </div>
                  <div className="eg-import-stat__sub">
                    {importResult.state.customFinancialEvents?.length || 0} Events
                  </div>
                </div>
              </div>

              {importResult.warnings && importResult.warnings.length > 0 && (
                <StatusBanner tone={BannerTone.Warning} compact title="Adjustments">
                  {importResult.warnings.join(", ")}
                </StatusBanner>
              )}

              <Button variant={ButtonVariant.Primary} onClick={handleExecuteImport}>
                <CheckmarkIcon size={15} />
                <span>Apply &amp; Restore Simulation State</span>
              </Button>
            </div>
          )}

          {importResult && !importResult.success && (
            <StatusBanner tone={BannerTone.Danger} compact title="Validation Error">
              {importResult.error}
            </StatusBanner>
          )}

          {importSuccessMessage && (
            <StatusBanner tone={BannerTone.Success} compact>
              {importSuccessMessage}
            </StatusBanner>
          )}
        </div>
      )}
    </ModalDialog>
  );
}
