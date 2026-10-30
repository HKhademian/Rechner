import {
  type SimulationResult,
  SpecialEventType,
} from "#engine/types";
import {
  LedgerRowKind,
  projectScenarioRows,
} from "#engine/ledger/rows";

/** CSV v2 adds separate event/action rows and audit metadata; persisted JSON stays at v1. */
export const LEDGER_CSV_SCHEMA_VERSION = 2;

function cell(value: string | number | null): string {
  const text = value === null ? "—" : String(value);
  return /[;,"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** All CSV entry points share the same rows, cents, quoting and metadata, independent of UI filters. */
export function exportScenarioToCsv(result: SimulationResult, baseline?: SimulationResult): string {
  const headers = ["CSV Schema", "Entry Type", "Row ID", "Month ID", "Relative Month", "Simulation Ref", "Simulation Month",
    "Calendar Date", "Calendar Year", "Calendar Month", "Phase / Event Name", "Description", "Tax Classes",
    "Husband Salary (EUR)", "Wife Salary (EUR)", "Mutterschaftsgeld (EUR)", "Wife Elterngeld (EUR)", "Husband Elterngeld (EUR)", "Kindergeld (EUR)",
    "Bonus (EUR)", "Tax Settlement (EUR)", "Other Events (EUR)", "Net Inflow (EUR)", "Cumulative Net Inflow (EUR)",
    "Delta Net Inflow vs B (EUR)", "Delta Cumulative vs B (EUR)", "Month Audit (JSON)", "Scenario Audit (JSON)"];
  const { months: _months, ...scenarioAudit } = result;
  const rows = projectScenarioRows(result, baseline).map((row, index) => {
    const m = row.month;
    const base = row.kind === LedgerRowKind.Month;
    const event = row.kind === LedgerRowKind.FinancialEvent ? row.event : undefined;
    const action = row.kind === LedgerRowKind.Action ? row.action : undefined;
    const bonus = event?.type === SpecialEventType.Bonus40 || event?.type === SpecialEventType.Bonus60;
    const tax = event?.type === SpecialEventType.TaxReturn;
    const regular = (value: number) => base ? value.toFixed(2) : null;
    const values = [LEDGER_CSV_SCHEMA_VERSION, row.kind, row.rowId, m.monthId, m.monthRef, m.monthSimRef, m.month,
      m.calendarLabel, m.calendarYearNum, m.calendarMonthNum, event?.title ?? action?.title ?? m.phaseLabel,
      event?.description ?? action?.description ?? "", event?.taxClassLabel ?? action?.taxClassLabel ?? m.taxClassLabel,
      regular(m.husbandSalary), regular(m.wifeSalary), regular(m.mutterschutz), regular(m.wifeElterngeld), regular(m.husbandElterngeld), regular(m.kindergeld),
      bonus ? event!.amount.toFixed(2) : null, tax ? event!.amount.toFixed(2) : null, event && !bonus && !tax ? event.amount.toFixed(2) : null,
      row.amount?.toFixed(2) ?? null, row.cumulative?.toFixed(2) ?? null, row.deltaAmount?.toFixed(2) ?? null, row.deltaCumulative?.toFixed(2) ?? null,
      base ? JSON.stringify({ kindergeldDetails: m.kindergeldDetails,
        benefitAssessmentAvailable: m.benefitAssessmentAvailable,
        assumptions: m.assumptions,
        unavailableReasons: m.unavailableReasons,
        payroll: m.payroll,
        benefitPayments: m.benefitPayments }) : "",
      index === 0 ? JSON.stringify(scenarioAudit) : ""];
    return values.map(cell).join(";");
  });
  return [headers.join(";"), ...rows].join("\r\n");
}
