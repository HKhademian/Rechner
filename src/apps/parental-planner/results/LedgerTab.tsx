import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
  ModalDialog,
  ModalDialogSize,
  TextField,
  ToggleSwitch,
} from "#/components/ui/index.ts";
import {
  ExportDataIcon,
} from "#components/Icons";
import {
  type LedgerRow,
  LedgerRowKind,
  projectLedgerMonth,
} from "#engine/ledger/rows";
import {
  exportScenarioToCsv,
} from "#engine/storage/ledgerCsv";
import {
  triggerFileDownload,
} from "#engine/storage/exportImport";
import {
  type RowExplanation,
  getActionRowExplanation,
  getRowExplanation,
  getSpecialEventRowExplanation,
} from "#engine/explanation/timelineExplainer";
import {
  ActiveScenarioView,
  ScenarioId,
} from "#engine/types";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  workbenchHoveredMonth,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Tab 2: Full N-month audit ledger preserving Rule 13 (Action → Event → Base) & Rule 15 (Mx + MonthId). */
export function LedgerTab(): JSX.Element {
  const s = workbenchState.value;
  const active = s.activeScenario === ActiveScenarioView.Compare
    ? displayedWorkbenchScenarioC.value
    : displayedWorkbenchCurrentScenario.value;
  const baseline = displayedWorkbenchScenarioB.value;
  const baselineByMonthId = new Map(baseline.months.map((m) => [m.monthId, m]));

  const [yearFilter, setYearFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showSpecialRows, setShowSpecialRows] = useState(true);
  const [showDeltaVsB, setShowDeltaVsB] = useState(true);
  const [inspectedRow, setInspectedRow] = useState<RowExplanation | null>(null);

  const years = [...new Set(active.months.map((m) => m.calendarYearNum))];
  const query = search.trim().toLowerCase();

  const filteredMonths = active.months.filter((m) => {
    if (yearFilter !== "all" && String(m.calendarYearNum) !== yearFilter) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      `m${m.month}`,
      m.monthId,
      m.calendarLabel,
      m.eventTag,
      m.taxClassLabel,
      ...m.specialEvents.map((e) => e.title),
      ...(m.startingActions ?? []).map((a) => a.title),
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  const rows: readonly LedgerRow[] = filteredMonths.flatMap((m) => {
    const projected = projectLedgerMonth(m, baselineByMonthId.get(m.monthId));
    return showSpecialRows
      ? projected
      : projected.filter((r) => r.kind === LedgerRowKind.Month);
  });

  const handleExportCsv = (): void => {
    const csv = exportScenarioToCsv(active, baseline);
    triggerFileDownload(
      `parental_planner_${active.scenarioKey}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  };

  const inspectLedgerRow = (row: LedgerRow): void => {
    const bMonth = baselineByMonthId.get(row.month.monthId);
    const scenarioId = active.scenarioKey === ScenarioId.A
      ? ScenarioId.A
      : active.scenarioKey === ScenarioId.B
        ? ScenarioId.B
        : ScenarioId.C;
    if (row.kind === LedgerRowKind.Action) {
      setInspectedRow(getActionRowExplanation(row.action, row.month, scenarioId));
    }
    else if (row.kind === LedgerRowKind.FinancialEvent) {
      setInspectedRow(getSpecialEventRowExplanation(row.event, row.month, bMonth, 0, scenarioId));
    }
    else {
      setInspectedRow(getRowExplanation(row.month, bMonth, scenarioId));
    }
  };

  return (
    <>
      <div className="plw-toolbar">
        <div className="plw-toolbar__group">
          <label htmlFor="plw-ledger-year" className="plw-inline-control__label">
            Year
          </label>
          <select
            id="plw-ledger-year"
            className="plw-preset-select"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.currentTarget.value)}
          >
            <option value="all">All ({years.length} yrs)</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>

          <TextField
            id="plw-ledger-search"
            label="Filter ledger"
            placeholder="Search month, bonus, Kita, tax…"
            compact
            value={search}
            onChange={setSearch}
          />
        </div>

        <div className="plw-toolbar__group">
          <ToggleSwitch
            id="plw-ledger-special"
            label="Action & event rows"
            plain
            checked={showSpecialRows}
            onChange={setShowSpecialRows}
          />
          <ToggleSwitch
            id="plw-ledger-delta"
            label="Delta vs B"
            plain
            checked={showDeltaVsB}
            onChange={setShowDeltaVsB}
          />
          <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={handleExportCsv}>
            <ExportDataIcon size={13} />
            <span>CSV</span>
          </Button>
        </div>
      </div>

      <div className="plw-table-wrap">
        <table className="plw-table" aria-label="Monthly audit ledger">
          <thead>
            <tr>
              <th>Month / ID</th>
              <th>Event / Tax Class</th>
              <th className="plw-table__num">P1 Salary</th>
              <th className="plw-table__num">P2 Salary</th>
              <th className="plw-table__num">MuSchG</th>
              <th className="plw-table__num">Elterngeld</th>
              <th className="plw-table__num">Kindergeld</th>
              <th className="plw-table__num">Row Cash</th>
              <th className="plw-table__num">Cumulative</th>
              {showDeltaVsB && <th className="plw-table__num">Δ vs B</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isHovered = workbenchHoveredMonth.value === row.month.month;
              const rowClass = [
                row.kind === LedgerRowKind.Action ? "plw-row--action" : "",
                row.kind === LedgerRowKind.FinancialEvent ? "plw-row--event" : "",
                isHovered ? "plw-row--hovered" : "",
              ].filter(Boolean).join(" ");

              if (row.kind === LedgerRowKind.Action) {
                return (
                  <tr
                    key={row.rowId}
                    className={rowClass}
                    onMouseEnter={() => {
                      workbenchHoveredMonth.value = row.month.month;
                    }}
                  >
                    <td>
                      <button type="button" className="plw-cell-btn" onClick={() => inspectLedgerRow(row)}>
                        M{row.month.month} · {row.month.monthId}
                      </button>
                    </td>
                    <td>
                      <Badge tone={BadgeTone.Brand}>Action</Badge>{" "}
                      {row.action.title}
                    </td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    {showDeltaVsB && <td className="plw-table__num">—</td>}
                  </tr>
                );
              }

              if (row.kind === LedgerRowKind.FinancialEvent) {
                return (
                  <tr
                    key={row.rowId}
                    className={rowClass}
                    onMouseEnter={() => {
                      workbenchHoveredMonth.value = row.month.month;
                    }}
                  >
                    <td>
                      <button type="button" className="plw-cell-btn" onClick={() => inspectLedgerRow(row)}>
                        M{row.month.month} · {row.month.monthId}
                      </button>
                    </td>
                    <td>
                      <Badge tone={row.amount >= 0 ? BadgeTone.Gain : BadgeTone.Warning}>
                        {row.amount >= 0 ? "Inflow" : "Cost"}
                      </Badge>{" "}
                      {row.event.title}
                    </td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className="plw-table__num">—</td>
                    <td className={`plw-table__num${row.amount >= 0 ? " plw-table__gain" : " plw-table__loss"}`}>
                      {row.amount >= 0 ? "+" : ""}{formatEur(row.amount)}
                    </td>
                    <td className="plw-table__num">{formatEur(row.cumulative)}</td>
                    {showDeltaVsB && (
                      <td className="plw-table__num">
                        {row.deltaAmount !== null ? `${row.deltaAmount >= 0 ? "+" : ""}${formatEur(row.deltaAmount)}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              }

              const m = row.month;
              const egTotal = m.wifeElterngeld + m.husbandElterngeld;
              return (
                <tr
                  key={row.rowId}
                  className={rowClass}
                  onMouseEnter={() => {
                    workbenchHoveredMonth.value = m.month;
                  }}
                >
                  <td>
                    <button type="button" className="plw-cell-btn" onClick={() => inspectLedgerRow(row)}>
                      <strong>M{m.month}</strong> · {m.monthId}
                    </button>
                  </td>
                  <td>
                    <span>{m.taxClassLabel}</span>
                    {m.eventTag && (
                      <>
                        {" · "}
                        <Badge tone={BadgeTone.Neutral}>{m.eventTag}</Badge>
                      </>
                    )}
                  </td>
                  <td className="plw-table__num">{formatEur(m.husbandSalary)}</td>
                  <td className="plw-table__num">{formatEur(m.wifeSalary)}</td>
                  <td className="plw-table__num">{m.mutterschutz > 0 ? formatEur(m.mutterschutz) : "—"}</td>
                  <td className="plw-table__num">{egTotal > 0 ? formatEur(egTotal) : "—"}</td>
                  <td className="plw-table__num">{m.kindergeld > 0 ? formatEur(m.kindergeld) : "—"}</td>
                  <td className="plw-table__num"><strong>{formatEur(row.amount)}</strong></td>
                  <td className="plw-table__num">{formatEur(row.cumulative)}</td>
                  {showDeltaVsB && (
                    <td className={`plw-table__num${(row.deltaCumulative ?? 0) > 0 ? " plw-table__gain" : (row.deltaCumulative ?? 0) < 0 ? " plw-table__loss" : ""}`}>
                      {row.deltaCumulative !== null ? `${row.deltaCumulative >= 0 ? "+" : ""}${formatEur(row.deltaCumulative)}` : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ModalDialog
        open={inspectedRow !== null}
        onClose={() => setInspectedRow(null)}
        size={ModalDialogSize.Medium}
        eyebrow={inspectedRow?.subtitle}
        title={inspectedRow?.title ?? "Row Audit"}
        footer={(
          <Button variant={ButtonVariant.Primary} onClick={() => setInspectedRow(null)}>
            Close
          </Button>
        )}
      >
        {inspectedRow && (
          <div className="plw-modal-stack">
            <p className="plw-card__hint">{inspectedRow.summaryDescription}</p>
            {inspectedRow.streams.length > 0 && (
              <div className="plw-modal-list">
                {inspectedRow.streams.map((stream) => (
                  <div key={stream.label} className="plw-modal-item">
                    <span>
                      <strong>{stream.label}</strong>
                      {stream.notes ? ` · ${stream.notes}` : ""}
                    </span>
                    <strong className="tabular-nums">{stream.valueFormatted}</strong>
                  </div>
                ))}
              </div>
            )}
            <div className="plw-modal-summary">
              <span>Net Month / Row Impact</span>
              <strong className="tabular-nums">{inspectedRow.totalNetInflowFormatted}</strong>
            </div>
          </div>
        )}
      </ModalDialog>
    </>
  );
}
