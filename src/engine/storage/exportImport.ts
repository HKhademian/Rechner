/**
 * German Elterngeld & Parental Leave 5-Year Simulator - Data Export & Import Engine
 *
 * Provides pure client-side, zero-dependency serialization, document generation,
 * spreadsheet generation, and ZIP archive bundling across all standard formats:
 * 1. JSON (Structured simulation state with metadata envelope and nominal validation)
 * 2. Text / Markdown (Comprehensive financial audit report with statutory citations)
 * 3. CSV (Detailed monthly ledger spreadsheets per scenario)
 * 4. ZIP (Multi-file bundle archive containing JSON, TXT report, and per-scenario CSVs)
 *
 * Adheres strictly to German data privacy rules (100% client-side computation),
 * branded domain types, const enums, and repository architectural guidelines.
 */

import {
  type PregnancyAction,
  type TaxClassSwitchAction,
  type WorkingHoursChangeAction,
  type FinancialEventAction,
  type SimulationExportEnvelope,
  type ImportValidationResult,
  type SimulationResult,
  type MonthlyLedgerEntry,
  ScenarioId,
  ExportFormat,
  toMonthId,
  toCalendarLabel,
} from "#engine/types";
import {
  type ElterngeldPersistedState,
  validateAndSanitizePersistedState,
} from "#engine/storage/persistence";
import {
  type ZipFileContent,
  type ZipEntry,
  type ParsedZipEntry,
  createZipArchive,
} from "#utils/zip";

/** Schema serialization version identifier. */
export const EXPORT_SCHEMA_VERSION = 1;

/** Generator application name identification string. */
export const APPLICATION_NAME =
  "German Elterngeld & Parental Leave 5-Year Financial Simulator";

/**
 * Serializes the complete simulator state into a validated JSON envelope with metadata header.
 *
 * @param state - Complete persisted simulator state.
 * @returns Formatted JSON envelope string.
 */
export function exportStateToJson(state: ElterngeldPersistedState): string {
  const envelope: SimulationExportEnvelope<ElterngeldPersistedState> = {
    metadata: {
      version: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      application: APPLICATION_NAME,
      format: ExportFormat.Json,
    },
    simulationState: state,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Safely parses and validates an imported JSON string into a strongly-typed `ElterngeldPersistedState`.
 * Delegates to `validateAndSanitizePersistedState` for bounds checking and normalization.
 *
 * @param jsonStr - Raw JSON text payload.
 * @returns `ImportValidationResult` with either validated state and warnings or error message.
 */
export function importStateFromJson(
  jsonStr: string,
): ImportValidationResult<ElterngeldPersistedState> {
  if (!jsonStr || typeof jsonStr !== "string" || jsonStr.trim().length === 0) {
    return {
      success: false,
      error: "Import payload is empty.",
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  }
  catch (err) {
    return {
      success: false,
      error: `Invalid JSON syntax: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (typeof raw !== "object" || raw === null) {
    return {
      success: false,
      error: "Imported JSON payload must be an object.",
    };
  }

  const warnings: string[] = [];
  try {
    const validatedState = validateAndSanitizePersistedState(
      raw,
      undefined,
      warnings,
    );
    return {
      success: true,
      state: validatedState,
      warnings,
    };
  }
  catch (err) {
    return {
      success: false,
      error: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Formats Euro currency for text reports.
 */
function fmtEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Generates an executive, comprehensive plaintext / Markdown financial audit report
 * covering all three scenarios, benefit breakdowns, and statutory citations.
 *
 * @param state - Complete simulator configuration state.
 * @param timelines - Record mapping ScenarioId (A, B, C) to their respective simulation results.
 * @returns Plaintext formatted audit report string.
 */
export function exportStateToTextReport(
  state: ElterngeldPersistedState,
  timelines: Record<ScenarioId, SimulationResult>,
): string {
  const dateStr = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines: string[] = [];
  lines.push(
    "================================================================================",
  );
  lines.push(
    " GERMAN ELTERNGELD & PARENTAL LEAVE FINANCIAL FORECAST & AUDIT REPORT",
  );
  lines.push(" Statutory Basis: BEEG (Bundeselterngeldgesetz), MuSchG & EStG");
  lines.push(
    ` Generated: ${dateStr} • Simulation Horizon: ${state.simulationDurationMonths} Months (${state.startCalendarYear} - ${timelines[ScenarioId.C].months.at(-1)?.calendarYearNum ?? state.startCalendarYear})`,
  );
  lines.push(
    "================================================================================",
  );
  lines.push("");

  // Section 1: Household Baseline Profile ($M1$)
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(" 1. HOUSEHOLD STARTING PROFILE & PREEXISTING CONDITIONS (M1)");
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(
    ` • Husband Gross Compensation:  ${fmtEur(state.husbandGross)} / month (${fmtEur(state.husbandGross * 12)} / year)`,
  );
  lines.push(
    ` • Husband Initial Contract:    ${state.husbandHours} hours / week`,
  );
  lines.push(
    ` • Wife Full-Time Gross:        ${fmtEur(state.wifeGross)} / month (${fmtEur(state.wifeGross * 12)} / year)`,
  );
  lines.push(
    ` • Wife Initial Contract:       ${state.wifeInitialHours} hours / week`,
  );
  lines.push(
    ` • Baseline Tax Class Pairing:  Husband: Class ${state.husbandInitialTaxClass ?? "III"} | Wife: Class ${state.wifeInitialTaxClass ?? "V"}${state.useInitialTaxFactor ? " (Faktorverfahren § 39f active)" : ""}`,
  );
  lines.push(
    ` • Kindergeld (Monthly/Child):  ${fmtEur(state.kindergeldPerChild)}`,
  );
  lines.push(
    ` • 13th Salary (Weihnachtsgeld): ${state.enable13thSalary ? "Enabled (Split 40% in M5 / 60% in M11)" : "Disabled"}`,
  );
  lines.push("");

  // Section 2: Executive Scenario Comparison Matrix
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(
    ` 2. EXECUTIVE 3-SCENARIO FINANCIAL OUTCOME COMPARISON (${state.simulationDurationMonths}-MONTH HORIZON)`,
  );
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(
    " Scenario A: Baseline Standard (Wife Class V, Basis-Elterngeld, No Optimization)",
  );
  lines.push(
    " Scenario B: Strategic Tax Swap (Class III/V Shift, Basis-Elterngeld)",
  );
  lines.push(
    " Scenario C: Maximum Legal Strategy (Tax Swap + ElterngeldPlus + Partnerschaftsbonus)",
  );
  lines.push("");

  const resA = timelines[ScenarioId.A];
  const resB = timelines[ScenarioId.B];
  const resC = timelines[ScenarioId.C];

  const totalA = resA?.summary?.grandTotal ?? 0;
  const totalB = resB?.summary?.grandTotal ?? 0;
  const totalC = resC?.summary?.grandTotal ?? 0;

  const egA = resA?.summary
    ? resA.summary.totalWifeElterngeld + resA.summary.totalHusbandElterngeld
    : 0;
  const egB = resB?.summary
    ? resB.summary.totalWifeElterngeld + resB.summary.totalHusbandElterngeld
    : 0;
  const egC = resC?.summary
    ? resC.summary.totalWifeElterngeld + resC.summary.totalHusbandElterngeld
    : 0;

  lines.push(
    " Metric                               Scenario A        Scenario B        Scenario C",
  );
  lines.push(
    " ----------------------------------------------------------------------------------",
  );
  lines.push(
    ` Total Period Net Family Inflow:   ${fmtEur(totalA).padEnd(16)}  ${fmtEur(totalB).padEnd(16)}  ${fmtEur(totalC).padEnd(16)}`,
  );
  lines.push(
    ` Difference to Baseline (Scenario A): ${fmtEur(0).padEnd(16)}  +${fmtEur(totalB - totalA).padEnd(15)}  +${fmtEur(totalC - totalA).padEnd(15)}`,
  );
  lines.push(
    ` Total Elterngeld Benefits Paid:     ${fmtEur(egA).padEnd(16)}  ${fmtEur(egB).padEnd(16)}  ${fmtEur(egC).padEnd(16)}`,
  );
  lines.push(
    ` Net Gain from Strategy:              ${fmtEur(0).padEnd(16)}  +${fmtEur(egB - egA).padEnd(15)}  +${fmtEur(egC - egA).padEnd(15)}`,
  );
  lines.push("");

  // Section 3: Annual Cashflow Breakdown (Scenario C)
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(
    " 3. YEAR-BY-YEAR FINANCIAL INFLOW SCHEDULE (OPTIMIZED SCENARIO C)",
  );
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  if (resC && resC.months) {
    const years = [...new Set(resC.months.map((month) => month.calendarYearNum))].sort((a, b) => a - b);
    for (const [index, yrCalYear] of years.entries()) {
      const yrMonths = resC.months.filter((month) => month.calendarYearNum === yrCalYear);
      const yrIncome = yrMonths.reduce(
        (acc, m: MonthlyLedgerEntry) => acc + m.monthlyTotal,
        0,
      );
      const yrEG = yrMonths.reduce(
        (acc, m: MonthlyLedgerEntry) =>
          acc + m.wifeElterngeld + m.husbandElterngeld,
        0,
      );
      const yrMuSch = yrMonths.reduce(
        (acc, m: MonthlyLedgerEntry) => acc + m.mutterschutz,
        0,
      );

      lines.push(
        ` Year ${index + 1} (${yrCalYear}): Total Net Inflow: ${fmtEur(yrIncome)} • Elterngeld: ${fmtEur(yrEG)} • Mutterschutz: ${fmtEur(yrMuSch)}`,
      );
    }
  }
  lines.push("");

  // Section 4: Timeline Milestone & Action Log
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(" 4. DISCRETE MILESTONE ACTION AUDIT LOG (BATCHES 1 - 4)");
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(" • Pregnancies & Births (Batch 1):");
  if (state.customPregnancies.length === 0) {
    lines.push("   - None configured");
  }
  else {
    state.customPregnancies.forEach((p: PregnancyAction) => {
      const posId = toMonthId(
        p.positiveTestCalendarMonth,
        p.positiveTestCalendarYear,
      );
      const delCalMonth = ((p.positiveTestCalendarMonth - 1 + 8) % 12) + 1;
      const delCalYear =
        p.positiveTestCalendarYear +
        Math.floor((p.positiveTestCalendarMonth - 1 + 8) / 12);
      const delId = toMonthId(delCalMonth, delCalYear);
      lines.push(
        `   - Child #${p.childIndex}: Positive Test ${posId} (${toCalendarLabel(p.positiveTestCalendarMonth, p.positiveTestCalendarYear)} · M${p.childIndex === 1 ? "1 (Pregnancy Positive)" : p.positiveTestSimulationMonth}) -> Delivery ${delId} (${toCalendarLabel(delCalMonth, delCalYear)} · M${p.childIndex === 1 ? "9 (Birth 1)" : p.calculatedDeliverySimulationMonth}) (Father: ${p.fatherPartnerMonthsCount} partner months)`,
      );
    });
  }

  lines.push(" • Strategic Tax Class Switches (Batch 2):");
  if (state.customTaxClassSwitches.length === 0) {
    lines.push("   - None configured");
  }
  else {
    state.customTaxClassSwitches.forEach(
      (s: TaxClassSwitchAction, idx: number) => {
        const effId = toMonthId(
          s.effectiveCalendarMonth,
          s.effectiveCalendarYear,
        );
        lines.push(
          `   - Swap #${idx + 1}: Effective ${effId} (${toCalendarLabel(s.effectiveCalendarMonth, s.effectiveCalendarYear)}) -> Target H: ${s.targetHusbandTaxClass} | W: ${s.targetWifeTaxClass}${s.targetUseTaxFactor ? " (Faktorverfahren)" : ""} (Revert: M${s.revertSimulationMonth ?? "End"})`,
        );
        lines.push(`     ↳ Reason: ${s.statutoryReason}`);
      },
    );
  }

  if (
    state.customWorkingHoursChanges &&
    state.customWorkingHoursChanges.length > 0
  ) {
    lines.push(" • Working Time & Schedule Adjustments (Batch 3):");
    state.customWorkingHoursChanges.forEach(
      (w: WorkingHoursChangeAction, idx: number) => {
        const effId = toMonthId(
          w.effectiveCalendarMonth,
          w.effectiveCalendarYear,
        );
        lines.push(
          `   - Hours Change #${idx + 1}: Effective ${effId} (${toCalendarLabel(w.effectiveCalendarMonth, w.effectiveCalendarYear)}) -> ${w.targetPerson}: ${w.weeklyHours} h/week (${w.reason})`,
        );
      },
    );
  }

  if (state.customFinancialEvents && state.customFinancialEvents.length > 0) {
    lines.push(" • Custom Financial Inflows & Expenses (Batch 4):");
    state.customFinancialEvents.forEach(
      (e: FinancialEventAction, idx: number) => {
        const effId = toMonthId(
          e.effectiveCalendarMonth,
          e.effectiveCalendarYear,
        );
        lines.push(
          `   - Event #${idx + 1}: ${effId} (${toCalendarLabel(e.effectiveCalendarMonth, e.effectiveCalendarYear)}) -> ${e.title}: ${fmtEur(e.amount)} [${e.category}]`,
        );
      },
    );
  }
  lines.push("");

  // Section 5: Statutory Legal Citations
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(" 5. STATUTORY FRAMEWORK & LEGAL CITATIONS");
  lines.push(
    "--------------------------------------------------------------------------------",
  );
  lines.push(
    " 1. BEEG § 1 (Parental Allowance Entitlement & 32h Part-Time Ceiling)",
  );
  lines.push(
    " 2. BEEG § 2, § 2b (Assessment Period & Tax Class Majority Determination)",
  );
  lines.push(
    " 3. BEEG § 2c (Synthetic Net Salary Determination excluding One-Off Bonuses)",
  );
  lines.push(
    " 4. BEEG § 4, § 4b (ElterngeldPlus & Partnerschaftsbonus 24-32 h/week Corridor)",
  );
  lines.push(
    " 5. MuSchG § 3, § 19 (Statutory Maternity Protection & Mutterschaftsgeld)",
  );
  lines.push(
    " 6. EStG § 32a, § 38b, § 39f (Progressive Tariff, Tax Classes & Faktorverfahren)",
  );
  lines.push(
    " 7. BEEG § 2c(3) (Assessment Tax Characteristics): https://www.gesetze-im-internet.de/beeg/__2c.html",
  );
  lines.push(
    "================================================================================",
  );

  return lines.join("\n");
}

export {
  exportScenarioToCsv,
} from "#engine/storage/ledgerCsv";

/**
 * Pure TypeScript Zero-Dependency PKZIP Archive Packager.
 * Bundles multiple files into a standard, fully compliant uncompressed (STORE) ZIP binary.
 * Delegates directly to the generalized ZIP archiver utility engine.
 *
 * @param files - Map of internal archive file paths to string or binary byte contents.
 * @returns Uint8Array containing complete ZIP archive binary payload.
 */
export function exportStateToZip(
  files: Record<string, string | Uint8Array>,
): Uint8Array {
  return createZipArchive(files);
}

export {
  type ZipFileContent,
  type ZipEntry,
  type ParsedZipEntry,
  createZipArchive,
};

/**
 * Triggers a browser file download for text or binary byte payloads.
 *
 * @param filename - Destination file name for download (e.g. 'elterngeld_simulation.json').
 * @param data - String or Uint8Array binary data payload.
 * @param mimeType - MIME type header (defaults to 'application/octet-stream').
 */
export function triggerFileDownload(
  filename: string,
  data: string | Uint8Array,
  mimeType: string = "application/octet-stream",
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: mimeType })
      : new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Triggers the browser system print dialog for a clean, executive printable financial audit report.
 *
 * @param state - Complete simulator configuration state.
 * @param timelines - Record mapping ScenarioId (A, B, C) to their respective simulation results.
 */
export function triggerPrintableReport(
  state: ElterngeldPersistedState,
  timelines: Record<ScenarioId, SimulationResult>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const reportText = exportStateToTextReport(state, timelines);

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Elterngeld &amp; Parental Leave Financial Report</title>
      <style>
        @page { size: A4; margin: 18mm 15mm; }
        body {
          font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          line-height: 1.45;
          color: #111827;
          background: #ffffff;
          padding: 20px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
${reportText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
