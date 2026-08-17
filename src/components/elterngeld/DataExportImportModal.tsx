import { useState } from "preact/hooks";
import {
  isExportImportModalOpen,
  exportImportActiveTab,
  closeExportImportModal,
  openExportImportModal,
  exportSimulationJson,
  exportSimulationText,
  exportSimulationZip,
  exportSimulationCsv,
  printSimulationReport,
  importSimulationState,
  getCurrentPersistedState,
  currentScenarioData,
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
  if (!isExportImportModalOpen.value) return null;

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
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={closeExportImportModal}
      role="dialog"
      aria-modal="true"
      id="data-export-import-modal"
    >
      <div
        class="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ImportDataIcon size={20} />
            </div>
            <div>
              <h2 class="text-lg font-bold text-white tracking-wide">
                Simulation Data Portability &amp; Reports
              </h2>
              <p class="text-xs text-slate-400">
                Export comprehensive audit reports or import JSON presets with
                100% client-side data privacy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeExportImportModal}
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div class="px-6 pt-4 flex gap-2 border-b border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            class={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "export"
                ? "text-indigo-400 border-indigo-500 bg-slate-800/60"
                : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            <DownloadFileIcon size={16} />
            Export Data &amp; Reports
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            class={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "import"
                ? "text-indigo-400 border-indigo-500 bg-slate-800/60"
                : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            <UploadFileIcon size={16} />
            Import &amp; Restore Simulation
          </button>
        </div>

        {/* Content Area */}
        <div class="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {activeTab === "export" ? (
            <div class="space-y-6">
              {/* Primary Export Cards Grid */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Full ZIP Package (Recommended) */}
                <div class="p-5 rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 flex flex-col justify-between group hover:border-indigo-500/60 transition-all shadow-lg">
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2.5">
                        <div class="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                          <ZipExportIcon size={20} />
                        </div>
                        <span class="font-bold text-white text-base">
                          Multi-Format ZIP Bundle
                        </span>
                      </div>
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        Complete Package
                      </span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed mb-4">
                      Bundles JSON configuration, plaintext financial audit
                      report, and CSV monthly ledgers for Scenarios A, B, and C
                      into a single zero-dependency client ZIP file.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportSimulationZip}
                    class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-900/40 flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                  >
                    <DownloadFileIcon size={15} />
                    Download ZIP Archive (.zip)
                  </button>
                </div>

                {/* 2. Structured JSON State */}
                <div class="p-5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 flex flex-col justify-between group hover:border-emerald-500/60 transition-all shadow-lg">
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2.5">
                        <div class="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <JsonExportIcon size={20} />
                        </div>
                        <span class="font-bold text-white text-base">
                          JSON State Envelope
                        </span>
                      </div>
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Machine Readable
                      </span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed mb-4">
                      Full machine-readable state export containing all Batches
                      0–4 parameters, nominal types, and simulation
                      preconditions for easy backup and re-importing.
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onClick={exportSimulationJson}
                      class="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/40 flex items-center justify-center gap-1.5"
                    >
                      <DownloadFileIcon size={15} />
                      Download JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      title="Copy JSON directly to clipboard"
                    >
                      {copySuccess ? (
                        <CheckmarkIcon size={15} className="text-emerald-400" />
                      ) : (
                        <ClipboardCopyIcon size={15} />
                      )}
                      {copySuccess ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* 3. Text / Markdown Financial Audit Report */}
                <div class="p-5 rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/30 via-slate-900 to-slate-950 flex flex-col justify-between group hover:border-sky-500/60 transition-all shadow-lg">
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2.5">
                        <div class="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                          <TextReportIcon size={20} />
                        </div>
                        <span class="font-bold text-white text-base">
                          Financial Audit Report
                        </span>
                      </div>
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        Plaintext / Markdown
                      </span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed mb-4">
                      Executive audit report with household starting profile,
                      scenario comparison matrix, 5-year annual schedule,
                      milestone actions, and statutory BEEG/EStG legal
                      citations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportSimulationText}
                    class="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-900/40 flex items-center justify-center gap-2"
                  >
                    <DownloadFileIcon size={15} />
                    Download Text Report (.txt)
                  </button>
                </div>

                {/* 4. Executive Printable PDF View */}
                <div class="p-5 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 flex flex-col justify-between group hover:border-amber-500/60 transition-all shadow-lg">
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2.5">
                        <div class="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                          <PdfExportIcon size={20} />
                        </div>
                        <span class="font-bold text-white text-base">
                          Printable Executive PDF
                        </span>
                      </div>
                      <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Browser Print
                      </span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed mb-4">
                      Opens an executive print-formatted report in a clean,
                      minimal window and triggers the browser system print
                      dialog for direct "Save as PDF".
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={printSimulationReport}
                    class="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-900/40 flex items-center justify-center gap-2"
                  >
                    <PrintReportIcon size={15} />
                    Print / Save as PDF
                  </button>
                </div>
              </div>

              {/* Individual Scenario CSV Downloads */}
              <div class="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <CsvExportIcon size={18} className="text-slate-400" />
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Export Individual Scenario CSV Ledgers (Excel / Numbers)
                    </h3>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => exportSimulationCsv(ScenarioId.A)}
                    class="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <DownloadFileIcon size={13} />
                    Scenario A (Baseline)
                  </button>
                  <button
                    type="button"
                    onClick={() => exportSimulationCsv(ScenarioId.B)}
                    class="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <DownloadFileIcon size={13} />
                    Scenario B (Tax Swap)
                  </button>
                  <button
                    type="button"
                    onClick={() => exportSimulationCsv(ScenarioId.C)}
                    class="py-2 px-3 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 text-xs font-medium border border-indigo-800/60 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <DownloadFileIcon size={13} />
                    Scenario C (Maximum Strategy)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div class="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                class={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                  isDragOver
                    ? "border-indigo-400 bg-indigo-950/30"
                    : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
                }`}
              >
                <div class="p-3 rounded-full bg-slate-800 text-slate-400 mb-2">
                  <UploadFileIcon size={24} />
                </div>
                <p class="text-sm font-semibold text-slate-200 mb-1">
                  Drag &amp; drop a simulator{" "}
                  <code class="text-indigo-400">.json</code> file here
                </p>
                <p class="text-xs text-slate-400 mb-3">
                  or select a file from your computer
                </p>
                <label class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-2">
                  <UploadFileIcon size={14} />
                  Choose File
                  <input
                    type="file"
                    accept=".json,application/json"
                    class="hidden"
                    onChange={handleFileInputChange}
                  />
                </label>
              </div>

              {/* Direct Paste Area */}
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Or Paste Simulation JSON Directly
                  </label>
                  {importResult && (
                    <span
                      class={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 border ${
                        importResult.success
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {importResult.success ? (
                        <>
                          <CheckmarkIcon size={13} />
                          Valid Simulation State
                        </>
                      ) : (
                        <>
                          <WarningIcon size={13} />
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
                  rows={6}
                  class="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 custom-scrollbar"
                />
              </div>

              {/* Pre-Import Inspection Preview Card */}
              {importResult && importResult.success && (
                <div class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Detected Simulation Parameters
                    </span>
                    <span class="text-[11px] text-slate-400">
                      {importResult.state.simulationDurationMonths} Months
                      Horizon
                    </span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div class="text-[10px] text-slate-400">
                        Husband Gross
                      </div>
                      <div class="font-bold text-white">
                        {new Intl.NumberFormat("de-DE", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(importResult.state.husbandGross as number)}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        Class{" "}
                        {importResult.state.husbandInitialTaxClass ?? "III"}
                      </div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div class="text-[10px] text-slate-400">Wife Gross</div>
                      <div class="font-bold text-white">
                        {new Intl.NumberFormat("de-DE", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(importResult.state.wifeGross as number)}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        Class {importResult.state.wifeInitialTaxClass ?? "V"}
                      </div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div class="text-[10px] text-slate-400">
                        Batches Config
                      </div>
                      <div class="font-bold text-white">
                        {importResult.state.customPregnancies.length} Children
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {importResult.state.customTaxClassSwitches.length} Swaps
                        • {importResult.state.customSalaryRaises.length} Raises
                      </div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div class="text-[10px] text-slate-400">
                        Dynamic Actions
                      </div>
                      <div class="font-bold text-white">
                        {importResult.state.customWorkingHoursChanges?.length ||
                          0}{" "}
                        Hours
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {importResult.state.customFinancialEvents?.length || 0}{" "}
                        Events
                      </div>
                    </div>
                  </div>

                  {importResult.warnings &&
                    importResult.warnings.length > 0 && (
                      <div class="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300">
                        <strong>Adjustments:</strong>{" "}
                        {importResult.warnings.join(", ")}
                      </div>
                    )}

                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    class="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/40 flex items-center justify-center gap-2"
                  >
                    <CheckmarkIcon size={16} />
                    Apply &amp; Hydrate Simulation State
                  </button>
                </div>
              )}

              {/* Error Message */}
              {importResult && !importResult.success && (
                <div class="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-start gap-2">
                  <WarningIcon
                    size={16}
                    className="text-rose-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <strong class="font-bold">Validation Error:</strong>{" "}
                    {importResult.error}
                  </div>
                </div>
              )}

              {/* Success Toast */}
              {importSuccessMessage && (
                <div class="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                  <CheckmarkIcon size={16} className="text-emerald-400" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div class="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
          <span>
            {APPLICATION_NAME} • v{EXPORT_SCHEMA_VERSION}.0
          </span>
          <button
            type="button"
            onClick={closeExportImportModal}
            class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
