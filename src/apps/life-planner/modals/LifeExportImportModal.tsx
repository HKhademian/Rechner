import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  DismissIcon,
  ExportDataIcon,
} from "#components/Icons";
import {
  importLifePlanFromJson,
  lifeWorkbenchPlan,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  displayedActiveScenarioResult,
  flushLifeWorkbenchCalculations,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  closeLifeExportImport,
  lifeExportImportOpen,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export / Import Modal supporting full JSON plan snapshots and Monthly Ledger CSV export. */
export function LifeExportImportModal(): JSX.Element | null {
  const open = lifeExportImportOpen.value;
  const [importText, setImportText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        closeLifeExportImport();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleDownloadJson = (): void => {
    const json = JSON.stringify(lifeWorkbenchPlan.peek(), null, 2);
    triggerDownload("rechner-life-plan.json", json, "application/json");
    setFeedback("Downloaded rechner-life-plan.json.");
  };

  const handleDownloadCsv = (): void => {
    const active = displayedActiveScenarioResult.peek();
    const header = [
      "Month",
      "MonthId",
      "TaxClasses",
      "PrimaryNet",
      "PartnerNet",
      "Benefits",
      "HousingAssetsNet",
      "LivingChildcareOutflow",
      "TaxSettlement",
      "MonthlyNetCashflow",
      "LiquidCash",
      "RunwayMonths",
      "TotalAssets",
      "TotalDebt",
      "NetWorth",
    ].join(",");
    const rows = active.months.map((m) => [
      m.month,
      m.monthId,
      `"${m.activeTaxClassLabel}"`,
      m.primaryNetSalary,
      m.partnerNetSalary,
      m.statutoryBenefits,
      m.housingAndAssetsNet,
      -m.livingAndChildcareOutflow,
      m.taxRefundOrRepayment,
      m.monthlyNetCashflow,
      m.liquidCashBalance,
      m.emergencyRunwayMonths,
      m.totalAssetsValue,
      m.totalDebtBalance,
      m.netWorth,
    ].join(","));
    triggerDownload("rechner-life-ledger.csv", [header, ...rows].join("\n"), "text/csv;charset=utf-8");
    setFeedback(`Downloaded ${active.months.length}-month ledger CSV.`);
  };

  const handleImport = (): void => {
    const res = importLifePlanFromJson(importText);
    if (!res.ok) {
      setFeedback(res.error ?? "Import failed.");
      return;
    }
    flushLifeWorkbenchCalculations();
    setImportText("");
    setFeedback("Plan imported successfully.");
  };

  return (
    <div
      className="lpw-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Export or Import Life Plan"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeLifeExportImport();
        }
      }}
    >
      <div className="lpw-modal">
        <div className="lpw-drawer__header">
          <h2 className="lpw-drawer__title">Export / Import Life Plan</h2>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Ghost}
            onClick={closeLifeExportImport}
            aria-label="Close Export Import modal"
          >
            <DismissIcon size={14} />
          </Button>
        </div>

        <div className="lpw-modal__body">
          <div className="lpw-actions-row">
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Primary} onClick={handleDownloadJson}>
              <ExportDataIcon size={13} />
              <span>Download Plan (.json)</span>
            </Button>
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={handleDownloadCsv}>
              <ExportDataIcon size={13} />
              <span>Download Monthly Ledger (.csv)</span>
            </Button>
          </div>

          <div className="lpw-field">
            <label htmlFor="lpw-import-json">Import Plan JSON</label>
            <textarea
              id="lpw-import-json"
              className="lpw-textarea"
              placeholder="Paste exported rechner-life-plan.json here…"
              value={importText}
              onInput={(e) => setImportText(e.currentTarget.value)}
            />
          </div>

          {feedback && <p className="lpw-hint">{feedback}</p>}
        </div>

        <div className="lpw-modal__footer">
          <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={closeLifeExportImport}>
            Close
          </Button>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Primary}
            onClick={handleImport}
            disabled={!importText.trim()}
          >
            Import JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
