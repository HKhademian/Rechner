import { useState } from "preact/hooks";
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
import { type ImportValidationResult, ScenarioId } from "#engine/types";
import { type ElterngeldPersistedState } from "#engine/storage/persistence";
import {
  ImportDataIcon,
  JsonExportIcon,
  PdfExportIcon,
  TextReportIcon,
  ZipExportIcon,
  CsvExportIcon,
  PrintReportIcon,
  UploadFileIcon,
  DownloadFileIcon,
  ClipboardCopyIcon,
  CloseIcon,
  CheckmarkIcon,
  WarningIcon,
} from "#components/Icons";

export function DataExportImportModal() {
  const isOpen = isExportImportModalOpen.value;
  if (!isOpen) {
    return null;
  }

  const [activeTab, setActiveTab] = useState<"export" | "import">(
    exportImportActiveTab.value,
  );
  const [pastedJson, setPastedJson] = useState<string>("");
  const [importResult, setImportResult] =
    useState<ImportValidationResult<ElterngeldPersistedState> | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<
    string | null
  >(null);

  const handleJsonChange = (text: string) => {
    setPastedJson(text);
    setImportSuccessMessage(null);
    if (!text.trim()) {
      setImportResult(null);
      return;
    }
    const res = importStateFromJson(text);
    setImportResult(res);
  };

  const handleFileDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (
      e.dataTransfer &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          handleJsonChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          handleJsonChange(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCopyJson = async () => {
    const jsonStr = exportStateToJson(getCurrentPersistedState());
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(jsonStr);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleExecuteImport = () => {
    if (importResult && importResult.success) {
      importSimulationState(importResult.state);
      setImportSuccessMessage(
        "Simulation state successfully imported and fully hydrated!",
      );
      setTimeout(() => {
        closeExportImportModal();
      }, 1200);
    }
  };

  return (
    <div
      id="data-export-import-modal"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.15s ease-out",
      }}
      onClick={closeExportImportModal}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--border-radius-lg)",
          maxWidth: "880px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          color: "var(--text-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "8px",
                borderRadius: "var(--border-radius-sm)",
                background: "var(--color-primary-bg)",
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ImportDataIcon size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Simulation Data Portability &amp; Audit Reports
              </h2>
              <p
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-muted)",
                  margin: "2px 0 0 0",
                }}
              >
                Export comprehensive audit reports or import JSON presets with
                100% client-side data privacy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeExportImportModal}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "12px 24px 0 24px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            style={{
              padding: "8px 16px",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "none",
              borderBottom:
                activeTab === "export"
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
              background:
                activeTab === "export"
                  ? "var(--bg-surface-secondary)"
                  : "transparent",
              color:
                activeTab === "export"
                  ? "var(--color-primary)"
                  : "var(--text-secondary)",
              borderTopLeftRadius: "6px",
              borderTopRightRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <DownloadFileIcon size={14} />
            <span>Export Data &amp; Reports</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            style={{
              padding: "8px 16px",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "none",
              borderBottom:
                activeTab === "import"
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
              background:
                activeTab === "import"
                  ? "var(--bg-surface-secondary)"
                  : "transparent",
              color:
                activeTab === "import"
                  ? "var(--color-primary)"
                  : "var(--text-secondary)",
              borderTopLeftRadius: "6px",
              borderTopRightRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <UploadFileIcon size={14} />
            <span>Import &amp; Restore Simulation</span>
          </button>
        </div>

        {/* Tab Content */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {activeTab === "export" ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "18px" }}
            >
              {/* Primary 4 Export Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* 1. Full ZIP Bundle */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--color-primary-border)",
                    background: "var(--bg-surface-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div style={{ color: "var(--color-primary)" }}>
                          <ZipExportIcon size={20} />
                        </div>
                        <strong
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          Multi-Format ZIP Bundle
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "var(--color-primary-bg)",
                          color: "var(--color-primary)",
                          border: "1px solid var(--color-primary-border)",
                        }}
                      >
                        Complete Archive
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Bundles JSON configuration, plaintext audit report, and
                      CSV monthly ledgers for Scenarios A, B, and C into a
                      standalone pure TypeScript ZIP archive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportSimulationZip}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "none",
                      background: "var(--color-primary)",
                      color: "#ffffff",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <DownloadFileIcon size={14} />
                    Download ZIP Archive (.zip)
                  </button>
                </div>

                {/* 2. JSON State Envelope */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div style={{ color: "var(--color-success)" }}>
                          <JsonExportIcon size={20} />
                        </div>
                        <strong
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          JSON State Envelope
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "var(--color-gain-bg)",
                          color: "var(--color-gain)",
                          border: "1px solid var(--color-gain-border)",
                        }}
                      >
                        Machine Readable
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Full machine-readable state export containing all Batches
                      0–4 parameters, nominal types, and preconditions for
                      backup and instant re-importing.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={exportSimulationJson}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "none",
                        background: "var(--color-success)",
                        color: "#ffffff",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <DownloadFileIcon size={14} />
                      Download JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                      title="Copy JSON directly to clipboard"
                    >
                      {copySuccess ? (
                        <CheckmarkIcon size={14} className="text-emerald-400" />
                      ) : (
                        <ClipboardCopyIcon size={14} />
                      )}
                      {copySuccess ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* 3. Text / Markdown Audit Report */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div style={{ color: "var(--series-sky)" }}>
                          <TextReportIcon size={20} />
                        </div>
                        <strong
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          Financial Audit Report
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "var(--bg-surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        Plaintext / Markdown
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Executive audit report with household starting profile,
                      scenario comparison matrix, 5-year annual schedule,
                      milestone logs, and statutory citations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportSimulationText}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <DownloadFileIcon size={14} />
                    Download Text Report (.txt)
                  </button>
                </div>

                {/* 4. Executive Printable PDF View */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div style={{ color: "var(--color-warning)" }}>
                          <PdfExportIcon size={20} />
                        </div>
                        <strong
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          Printable Executive PDF
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "var(--color-warning-bg)",
                          color: "var(--color-warning)",
                          border: "1px solid var(--color-warning-border)",
                        }}
                      >
                        Browser Print
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Opens an executive print-formatted report in a clean
                      window and triggers the browser system print dialog for
                      direct &quot;Save as PDF&quot;.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={printSimulationReport}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <PrintReportIcon size={14} />
                    Print / Save as PDF
                  </button>
                </div>
              </div>

              {/* Individual Scenario CSV Downloads */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--border-radius)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface-secondary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "10px",
                  }}
                >
                  <CsvExportIcon size={16} />
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                    }}
                  >
                    Export Individual Scenario CSV Ledgers (Excel / Numbers)
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => exportSimulationCsv(ScenarioId.A)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <DownloadFileIcon size={12} />
                    Scenario A (Baseline)
                  </button>
                  <button
                    type="button"
                    onClick={() => exportSimulationCsv(ScenarioId.B)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <DownloadFileIcon size={12} />
                    Scenario B (Tax Swap)
                  </button>
                  <button
                    type="button"
                    onClick={() => exportSimulationCsv(ScenarioId.C)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "4px",
                      border: "1px solid var(--color-primary-border)",
                      background: "var(--color-primary-bg)",
                      color: "var(--color-primary)",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <DownloadFileIcon size={12} />
                    Scenario C (Maximum Strategy)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                style={{
                  padding: "24px",
                  border: isDragOver
                    ? "2px dashed var(--color-primary)"
                    : "2px dashed var(--border-subtle)",
                  borderRadius: "var(--border-radius)",
                  background: isDragOver
                    ? "var(--color-primary-bg)"
                    : "var(--bg-surface-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{ color: "var(--text-muted)", marginBottom: "8px" }}
                >
                  <UploadFileIcon size={28} />
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: "4px",
                  }}
                >
                  Drag &amp; drop a simulator{" "}
                  <code style={{ color: "var(--color-primary)" }}>.json</code>{" "}
                  file here
                </div>
                <div
                  style={{
                    fontSize: "0.74rem",
                    color: "var(--text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  or select a file from your computer
                </div>
                <label
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <UploadFileIcon size={13} />
                  Choose File
                  <input
                    type="file"
                    accept=".json,application/json"
                    style={{ display: "none" }}
                    onChange={handleFileInputChange}
                  />
                </label>
              </div>

              {/* Direct Paste Area */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                    }}
                  >
                    Or Paste Simulation JSON Directly
                  </label>
                  {importResult && (
                    <span
                      style={{
                        fontSize: "0.70rem",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: importResult.success
                          ? "var(--color-gain-bg)"
                          : "var(--color-loss-bg)",
                        color: importResult.success
                          ? "var(--color-gain)"
                          : "var(--color-loss)",
                        border: importResult.success
                          ? "1px solid var(--color-gain-border)"
                          : "1px solid var(--color-loss-border)",
                      }}
                    >
                      {importResult.success ? (
                        <>
                          <CheckmarkIcon size={12} />
                          Valid Simulation State
                        </>
                      ) : (
                        <>
                          <WarningIcon size={12} />
                          Invalid JSON
                        </>
                      )}
                    </span>
                  )}
                </div>
                <textarea
                  value={pastedJson}
                  onInput={(e) =>
                    handleJsonChange((e.target as HTMLTextAreaElement).value)
                  }
                  placeholder='Paste JSON simulation state envelope here (e.g. { "simulationState": { ... } })...'
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "10px",
                    fontSize: "0.74rem",
                    fontFamily: "monospace",
                    background: "var(--bg-surface-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--border-radius-sm)",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Pre-Import Inspection Preview Card */}
              {importResult && importResult.success && (
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--color-gain-border)",
                    background: "var(--color-gain-bg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        color: "var(--color-gain)",
                        textTransform: "uppercase",
                      }}
                    >
                      Detected Simulation Parameters
                    </span>
                    <span
                      style={{
                        fontSize: "0.70rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {importResult.state.simulationDurationMonths} Months
                      Horizon
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "4px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Husband Gross
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        {new Intl.NumberFormat("de-DE", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(importResult.state.husbandGross as number)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.66rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Class{" "}
                        {importResult.state.husbandInitialTaxClass ?? "III"}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "4px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Wife Gross
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        {new Intl.NumberFormat("de-DE", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(importResult.state.wifeGross as number)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.66rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Class {importResult.state.wifeInitialTaxClass ?? "V"}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "4px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Batches Config
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        {importResult.state.customPregnancies.length} Children
                      </div>
                      <div
                        style={{
                          fontSize: "0.66rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {importResult.state.customTaxClassSwitches.length} Swaps
                        · {importResult.state.customSalaryRaises.length} Raises
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "4px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Dynamic Actions
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        {importResult.state.customWorkingHoursChanges?.length ||
                          0}{" "}
                        Hours
                      </div>
                      <div
                        style={{
                          fontSize: "0.66rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {importResult.state.customFinancialEvents?.length || 0}{" "}
                        Events
                      </div>
                    </div>
                  </div>

                  {importResult.warnings &&
                    importResult.warnings.length > 0 && (
                      <div
                        style={{
                          padding: "6px 8px",
                          borderRadius: "4px",
                          background: "var(--color-warning-bg)",
                          border: "1px solid var(--color-warning-border)",
                          fontSize: "0.70rem",
                          color: "var(--color-warning)",
                        }}
                      >
                        <strong>Adjustments:</strong>{" "}
                        {importResult.warnings.join(", ")}
                      </div>
                    )}

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "6px",
                      border: "none",
                      background: "var(--color-gain)",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      marginTop: "4px",
                    }}
                  >
                    <CheckmarkIcon size={16} />
                    Apply &amp; Hydrate Simulation State
                  </button>
                </div>
              )}

              {/* Error Message */}
              {importResult && !importResult.success && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--color-loss-border)",
                    background: "var(--color-loss-bg)",
                    color: "var(--color-loss)",
                    fontSize: "0.74rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <WarningIcon size={15} />
                  <div>
                    <strong>Validation Error:</strong> {importResult.error}
                  </div>
                </div>
              )}

              {/* Success Toast */}
              {importSuccessMessage && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--border-radius-sm)",
                    border: "1px solid var(--color-gain-border)",
                    background: "var(--color-gain-bg)",
                    color: "var(--color-gain)",
                    fontSize: "0.74rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CheckmarkIcon size={15} />
                  <span>{importSuccessMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface-secondary)",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
          }}
        >
          <span>
            {APPLICATION_NAME} · v{EXPORT_SCHEMA_VERSION}.0
          </span>
          <button
            type="button"
            onClick={closeExportImportModal}
            style={{
              padding: "5px 14px",
              borderRadius: "4px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              fontSize: "0.74rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
