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
  ScenarioId,
  ExportFormat,
  type SimulationExportEnvelope,
  type ImportValidationResult,
  type SimulationResult,
  type MonthlyLedgerEntry,
  toMonthId,
  toMonthRef,
  toMonthSimRef,
} from "#engine/types";
import {
  type ElterngeldPersistedState,
  validateAndSanitizePersistedState,
} from "#engine/storage/persistence";

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
    " GERMAN ELTERNGELD & PARENTAL LEAVE 5-YEAR FINANCIAL FORECAST & AUDIT REPORT",
  );
  lines.push(" Statutory Basis: BEEG (Bundeselterngeldgesetz), MuSchG & EStG");
  lines.push(
    ` Generated: ${dateStr} • Simulation Horizon: 60 Months (${state.startCalendarYear} - ${state.startCalendarYear + Math.floor(state.simulationDurationMonths / 12)})`,
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
    " 2. EXECUTIVE 3-SCENARIO FINANCIAL OUTCOME COMPARISON (60-MONTH HORIZON)",
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
    ` Total 60-Month Net Family Inflow:   ${fmtEur(totalA).padEnd(16)}  ${fmtEur(totalB).padEnd(16)}  ${fmtEur(totalC).padEnd(16)}`,
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
    for (let yr = 1; yr <= 5; yr++) {
      const startIdx = (yr - 1) * 12;
      const endIdx = Math.min(startIdx + 12, resC.months.length);
      const yrMonths = resC.months.slice(startIdx, endIdx);
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
      const yrCalYear = state.startCalendarYear + yr - 1;

      lines.push(
        ` Year ${yr} (${yrCalYear}): Total Net Inflow: ${fmtEur(yrIncome)} • Elterngeld: ${fmtEur(yrEG)} • Mutterschutz: ${fmtEur(yrMuSch)}`,
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
      `   - Child #${p.childIndex}: Positive Test ${posId} (${String(p.positiveTestCalendarMonth).padStart(2, "0")}.${p.positiveTestCalendarYear} · M${p.childIndex === 1 ? "1 (Pregnancy Positive)" : p.positiveTestSimulationMonth}) -> Delivery ${delId} (${String(delCalMonth).padStart(2, "0")}.${delCalYear} · M${p.childIndex === 1 ? "9 (Birth 1)" : p.calculatedDeliverySimulationMonth}) (Father: ${p.fatherPartnerMonthsCount} partner months)`,
    );
  });

  lines.push(" • Strategic Tax Class Switches (Batch 2):");
  state.customTaxClassSwitches.forEach(
    (s: TaxClassSwitchAction, idx: number) => {
      const effId = toMonthId(
        s.effectiveCalendarMonth,
        s.effectiveCalendarYear,
      );
      lines.push(
        `   - Swap #${idx + 1}: Effective ${effId} (${String(s.effectiveCalendarMonth).padStart(2, "0")}.${s.effectiveCalendarYear}) -> Target H: ${s.targetHusbandTaxClass} | W: ${s.targetWifeTaxClass}${s.targetUseTaxFactor ? " (Faktorverfahren)" : ""} (Revert: M${s.revertSimulationMonth ?? "End"})`,
      );
      lines.push(`     ↳ Reason: ${s.statutoryReason}`);
    },
  );

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
          `   - Hours Change #${idx + 1}: Effective ${effId} (${String(w.effectiveCalendarMonth).padStart(2, "0")}.${w.effectiveCalendarYear}) -> ${w.targetPerson}: ${w.weeklyHours} h/week (${w.reason})`,
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
          `   - Event #${idx + 1}: ${effId} (${String(e.effectiveCalendarMonth).padStart(2, "0")}.${e.effectiveCalendarYear}) -> ${e.title}: ${fmtEur(e.amount)} [${e.category}]`,
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
    " 7. BFH Ruling VI R 2/13 (Legality of Strategic Pregnancy Tax Class Switching)",
  );
  lines.push(
    "================================================================================",
  );

  return lines.join("\n");
}

/**
 * Exports a specific simulation scenario ledger as a formatted CSV spreadsheet string
 * with semicolons as delimiters for Excel compatibility.
 *
 * @param scenarioResult - Complete multi-year simulation result.
 * @returns Semicolon-delimited CSV text.
 */
export function exportScenarioToCsv(scenarioResult: SimulationResult): string {
  const headers = [
    "Month ID",
    "Relative Month",
    "Simulation Ref",
    "Simulation Month",
    "Calendar Date",
    "Calendar Year",
    "Calendar Month",
    "Tax Class Label",
    "Wife Salary (EUR)",
    "Husband Salary (EUR)",
    "Wife Elterngeld (EUR)",
    "Husband Elterngeld (EUR)",
    "Mutterschaftsgeld (EUR)",
    "Kindergeld (EUR)",
    "13th Salary / Bonus (EUR)",
    "Tax Return Refund (EUR)",
    "Custom Events (EUR)",
    "Total Monthly Net Inflow (EUR)",
    "Cumulative Net Inflow (EUR)",
    "Is Partnerschaftsbonus",
    "Action Milestones",
  ];

  const rows: string[] = [];
  rows.push(headers.join(";"));

  if (scenarioResult && scenarioResult.months) {
    scenarioResult.months.forEach((m: MonthlyLedgerEntry) => {
      const actionsStr = m.startingActions
        ? m.startingActions.map((a) => a.title).join(" | ")
        : "";

      const row = [
        `"${m.monthId}"`,
        `"${m.monthRef || m.relativeMonthLabel || m.relativeBirthLabel}"`,
        `"${m.monthSimRef || toMonthSimRef(m.month)}"`,
        toMonthRef(m.month),
        `"${m.calendarLabel}"`,
        m.calendarYearNum,
        m.calendarMonthNum,
        `"${m.taxClassLabel}"`,
        m.wifeSalary ?? 0,
        m.husbandSalary ?? 0,
        m.wifeElterngeld ?? 0,
        m.husbandElterngeld ?? 0,
        m.mutterschutz ?? 0,
        m.kindergeld ?? 0,
        m.specialBonusTotal ?? 0,
        m.taxRefund ?? 0,
        m.specialEventsTotal ?? 0,
        m.monthlyTotal ?? 0,
        m.cumulatedTotal ?? 0,
        m.isPartnerschaftsbonus ? "YES" : "NO",
        `"${actionsStr.replace(/"/g, '""')}"`,
      ];
      rows.push(row.join(";"));
    });
  }

  return rows.join("\r\n");
}

/**
 * Standard CRC-32 Lookup Table & Checksum Engine for PKZIP compliance.
 */
let crcTable: Uint32Array | null = null;
function getCrcTable(): Uint32Array {
  if (crcTable) {
    return crcTable;
  }
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      }
      else {
        c = c >>> 1;
      }
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function computeCrc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Pure TypeScript Zero-Dependency PKZIP Archive Packager.
 * Bundles multiple files into a standard, fully compliant uncompressed (STORE) ZIP binary.
 *
 * @param files - Map of internal archive file paths to string or binary byte contents.
 * @returns Uint8Array containing complete ZIP archive binary payload.
 */
export function exportStateToZip(
  files: Record<string, string | Uint8Array>,
): Uint8Array {
  const encoder = new TextEncoder();
  const fileEntries: {
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const localHeadersAndData: Uint8Array[] = [];

  for (const [filename, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(filename);
    const contentBytes =
      typeof content === "string" ? encoder.encode(content) : content;
    const crc = computeCrc32(contentBytes);
    const offset = currentOffset;

    fileEntries.push({
      nameBytes,
      contentBytes,
      crc,
      offset,
    });

    // Local file header (30 bytes + filename + data)
    const header = new Uint8Array(30 + nameBytes.length + contentBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x02895b50, true); // Local file header signature
    view.setUint16(4, 10, true); // Version needed to extract (1.0)
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, 0, true); // Compression method (0 = STORE)
    view.setUint16(10, 0, true); // Last mod file time
    view.setUint16(12, 0, true); // Last mod file date
    view.setUint32(14, crc, true); // CRC-32
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    header.set(nameBytes, 30);
    header.set(contentBytes, 30 + nameBytes.length);

    localHeadersAndData.push(header);
    currentOffset += header.length;
  }

  // Central directory records
  const centralDirRecords: Uint8Array[] = [];
  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const record = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(record.buffer);

    view.setUint32(0, 0x02014b50, true); // Central file header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 10, true); // Version needed to extract
    view.setUint16(8, 0, true); // General purpose bit flag
    view.setUint16(10, 0, true); // Compression method (STORE)
    view.setUint16(12, 0, true); // Last mod file time
    view.setUint16(14, 0, true); // Last mod file date
    view.setUint32(16, entry.crc, true); // CRC-32
    view.setUint32(20, entry.contentBytes.length, true); // Compressed size
    view.setUint32(24, entry.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, entry.nameBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header

    record.set(entry.nameBytes, 46);
    centralDirRecords.push(record);
    centralDirSize += record.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk where central directory starts
  eocdView.setUint16(8, fileEntries.length, true); // Total entries on this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total entries in central directory
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  // Combine into single Uint8Array
  const totalLength = currentOffset + centralDirSize + eocd.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const chunk of localHeadersAndData) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  for (const chunk of centralDirRecords) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  result.set(eocd, pos);

  return result;
}

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
