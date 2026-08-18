import type { JSX } from "preact";
import { useState } from "preact/hooks";
import {
  currentScenarioData,
  activeScenario,
  scenarioBData,
  hoveredMonth,
  showSpecialEventRows,
  scrollToLegalRule,
  LegalRuleKey,
} from "#store/elterngeldStore";
import {
  ActionType,
  ActionCategory,
  FieldColumnKey,
  ExplanationFieldKey,
  ScenarioId,
  ActiveScenarioView,
  type TimelineMonth,
  type SpecialEventItem,
  type ActionRowItem,
} from "#engine/types";
import {
  ExportDataIcon,
  ChildBirthMilestoneIcon,
  TaxClassSwapMilestoneIcon,
  CareerPromotionMilestoneIcon,
  FinancialInflowIcon,
  ExternalLegalSourceIcon,
  InformationalNoticeIcon,
} from "#components/Icons";
import FieldExplainerModal from "./FieldExplainerModal";
import RowExplainerModal from "./RowExplainerModal";
import {
  getFieldExplanation,
  getActionFieldExplanation,
  getSpecialEventFieldExplanation,
  getRowExplanation,
  getActionRowExplanation,
  getSpecialEventRowExplanation,
  type FieldExplanation,
  type RowExplanation,
} from "#engine/explanation/timelineExplainer";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function TimelineTable(): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showDelta, setShowDelta] = useState<boolean>(true);
  const [selectedFieldExplanation, setSelectedFieldExplanation] =
    useState<FieldExplanation | null>(null);
  const [selectedRowExplanation, setSelectedRowExplanation] =
    useState<RowExplanation | null>(null);

  const scenario: ScenarioId =
    activeScenario.value === ActiveScenarioView.Compare
      ? ScenarioId.C
      : (activeScenario.value as ScenarioId);
  const current = currentScenarioData.value;
  const bData = scenarioBData.value;
  const isSpecialRowsActive = showSpecialEventRows.value;

  // Filter rows
  const filteredMonths = current.months.filter((m) => {
    if (selectedYear !== "all") {
      if (selectedYear.startsWith("cal_")) {
        const calYearNum = Number(selectedYear.replace("cal_", ""));
        if (m.calendarYearNum !== calYearNum) {
          return false;
        }
      } else if ((m.year as number) !== Number(selectedYear)) {
        return false;
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchMonth =
        `m${m.month}`.includes(term) ||
        `month ${m.month}`.includes(term) ||
        m.monthId.toLowerCase().includes(term) ||
        m.calendarLabel.includes(term) ||
        (m.relativeMonthLabel || m.relativeBirthLabel)
          .toLowerCase()
          .includes(term);
      const matchPhase = m.phaseLabel.toLowerCase().includes(term);
      const matchTax = m.taxClassLabel.toLowerCase().includes(term);
      const matchEvent = m.eventTag && m.eventTag.toLowerCase().includes(term);
      const matchSpecial =
        m.specialEvents &&
        m.specialEvents.some(
          (e: SpecialEventItem) =>
            e.title.toLowerCase().includes(term) ||
            (e.category as string).toLowerCase().includes(term) ||
            e.monthId.toLowerCase().includes(term),
        );
      if (
        !matchMonth &&
        !matchPhase &&
        !matchTax &&
        !matchEvent &&
        !matchSpecial
      ) {
        return false;
      }
    }
    return true;
  });

  // Export to CSV
  const exportCSV = (): void => {
    const headers = [
      "Entry Type",
      "Month ID",
      "Relative Month",
      "Simulation Month",
      "Calendar Date",
      "Simulation Year",
      "Phase / Event Name",
      "Tax Classes",
      "Husband Base Salary",
      "Δ Husband vs B",
      "Wife Base Salary",
      "Δ Wife vs B",
      "Maternity (MuSchG)",
      "Δ Maternity vs B",
      "ElterngeldPlus (Mother)",
      "Δ ElterngeldPlus vs B",
      "Partner Months (Father)",
      "Δ Partner Months vs B",
      "Child Benefit (Kindergeld)",
      "Δ Kindergeld vs B",
      "Special Fiscal Events (Bonuses / Tax Return)",
      "Δ Special Events vs B",
      "Net Inflow (Monthly Total)",
      "Δ Net Inflow vs B",
      "Cumulated Total",
      "Δ Cumulated Total vs B",
    ];

    const rows: (string | number)[][] = [];

    current.months.forEach((m: TimelineMonth) => {
      const bMonth = bData.months[(m.month as number) - 1];
      const relLabel = m.relativeMonthLabel || m.relativeBirthLabel;

      // 1. Action Milestones
      if (m.startingActions) {
        m.startingActions.forEach((act: ActionRowItem) => {
          rows.push([
            "ACTION",
            act.monthId,
            act.relativeMonthLabel || relLabel,
            `M${m.month}`,
            m.calendarLabel,
            m.year as number,
            act.title,
            act.taxClassLabel || "—",
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
          ]);
        });
      }

      // 2. Special Fiscal Events
      if (
        isSpecialRowsActive &&
        m.specialEvents &&
        m.specialEvents.length > 0
      ) {
        m.specialEvents.forEach((ev: SpecialEventItem) => {
          const bEvents = bMonth?.specialEvents || [];
          const bMatch = bEvents.find(
            (it: SpecialEventItem) =>
              it.eventId === ev.eventId ||
              it.title === ev.title ||
              it.type === ev.type,
          );
          const bAmount = bMatch ? (bMatch.amount as number) : 0;
          const evDiff = (ev.amount as number) - bAmount;

          rows.push([
            "FISCAL_EVENT",
            ev.monthId,
            ev.relativeMonthLabel || relLabel,
            `M${m.month}`,
            ev.calendarLabel,
            m.year as number,
            `${ev.category}: ${ev.title}`,
            ev.taxClassLabel || "—",
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            "—",
            0,
            ev.amount as number,
            evDiff,
            ev.amount as number,
            evDiff,
            "—",
            "—",
          ]);
        });
      }

      // 3. Regular Monthly Baseline Row
      const diffHusband =
        (m.husbandSalary as number) -
        (bMonth ? (bMonth.husbandSalary as number) : 0);
      const diffWife =
        (m.wifeSalary as number) - (bMonth ? (bMonth.wifeSalary as number) : 0);
      const diffMutterschutz =
        (m.mutterschutz as number) -
        (bMonth ? (bMonth.mutterschutz as number) : 0);
      const diffWifeElterngeld =
        (m.wifeElterngeld as number) -
        (bMonth ? (bMonth.wifeElterngeld as number) : 0);
      const diffHusbandElterngeld =
        (m.husbandElterngeld as number) -
        (bMonth ? (bMonth.husbandElterngeld as number) : 0);
      const diffKindergeld =
        (m.kindergeld as number) - (bMonth ? (bMonth.kindergeld as number) : 0);
      const diffNetInflow =
        (m.regularMonthlyTotal as number) -
        (bMonth ? (bMonth.regularMonthlyTotal as number) : 0);
      const diffCumulated =
        (m.cumulatedTotal as number) -
        (bMonth ? (bMonth.cumulatedTotal as number) : 0);

      rows.push([
        "MONTH_BASE",
        m.monthId,
        relLabel,
        `M${m.month}`,
        m.calendarLabel,
        m.year as number,
        m.phaseLabel,
        m.taxClassLabel,
        m.husbandSalary as number,
        diffHusband,
        m.wifeSalary as number,
        diffWife,
        m.mutterschutz as number,
        diffMutterschutz,
        m.wifeElterngeld as number,
        diffWifeElterngeld,
        m.husbandElterngeld as number,
        diffHusbandElterngeld,
        m.kindergeld as number,
        diffKindergeld,
        0,
        0,
        m.regularMonthlyTotal as number,
        diffNetInflow,
        m.cumulatedTotal as number,
        diffCumulated,
      ]);
    });

    const csvContent = `data:text/csv;charset=utf-8,${[
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n")}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Elterngeld_Simulation_Scenario_${scenario}_${current.months.length}M_Ledger_with_Diffs.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render diff badge: red for negative, green for positive, muted 0 for zero
  const renderDiffBadge = (diff: number): JSX.Element => {
    if (diff === 0) {
      return (
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          0 €
        </span>
      );
    }
    const isPositive = diff > 0;
    const color = isPositive ? "var(--color-gain)" : "var(--color-loss)";
    const prefix = isPositive ? "+" : "";
    return (
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {prefix}
        {formatCurrency(diff)}
      </span>
    );
  };

  // Helper to render target scenario actual value on top, and reference diff below
  const renderCell = (
    value: number,
    diff: number,
    showZeroAsDash = true,
    valueColor?: string,
    isBoldValue = false,
  ): JSX.Element => {
    const displayVal =
      value === 0 && showZeroAsDash ? "—" : formatCurrency(value);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "1px",
        }}
      >
        <span
          style={{
            color: valueColor || "var(--text-primary)",
            fontWeight: isBoldValue ? 800 : 500,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayVal}
        </span>
        {showDelta && scenario === "C" && renderDiffBadge(diff)}
      </div>
    );
  };

  return (
    <div
      className="glass-panel"
      style={{ padding: "24px", marginBottom: "32px" }}
    >
      {/* Top Table Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            60-Month Cash Flow Ledger (Scenario {scenario})
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              margin: "2px 0 0 0",
            }}
          >
            {scenario === "C" && showDelta
              ? "Showing actual Scenario C cash flow with colored per-column reference diffs vs. Scenario B (Green +, Red -, Muted 0)."
              : "Base monthly salaries & statutory benefits cleanly separated from annual 13th salary chunks and tax refunds."}
          </p>
        </div>

        {/* Filters & Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Per-Column Diff Toggle for Scenario C */}
          {scenario === "C" && (
            <button
              type="button"
              onClick={() => setShowDelta(!showDelta)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--border-radius-sm)",
                border: showDelta
                  ? "1px solid var(--color-primary)"
                  : "1px solid var(--border-subtle)",
                background: showDelta
                  ? "var(--color-primary-bg)"
                  : "var(--bg-surface-secondary)",
                color: showDelta ? "var(--color-primary)" : "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "var(--transition)",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: showDelta
                    ? "var(--color-primary)"
                    : "var(--text-muted)",
                }}
              ></span>
              {showDelta
                ? "Per-Column Diff (vs. B): ON"
                : "Per-Column Diff (vs. B): OFF"}
            </button>
          )}

          {/* Special Events Row Toggle */}
          <button
            type="button"
            onClick={() => {
              showSpecialEventRows.value = !showSpecialEventRows.value;
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--border-radius-sm)",
              border: isSpecialRowsActive
                ? "1px solid var(--color-warning)"
                : "1px solid var(--border-subtle)",
              background: isSpecialRowsActive
                ? "var(--color-warning-bg)"
                : "var(--bg-surface-secondary)",
              color: isSpecialRowsActive
                ? "var(--color-warning)"
                : "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "var(--transition)",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: isSpecialRowsActive
                  ? "var(--color-warning)"
                  : "var(--text-muted)",
              }}
            ></span>
            {isSpecialRowsActive
              ? "Special Rows: Separate"
              : "Special Rows: Combined"}
          </button>

          {/* Search box */}
          <input
            type="text"
            placeholder="Filter phase, event, month..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--border-medium)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "0.78rem",
              width: "180px",
            }}
          />

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear((e.target as HTMLSelectElement).value)
            }
            style={{
              padding: "6px 10px",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--border-medium)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "0.78rem",
              width: "130px",
            }}
          >
            <option value="all">All Years (1–5)</option>
            <option value="1">Year 1 (Sim Months 1–12)</option>
            <option value="2">Year 2 (Sim Months 13–24)</option>
            <option value="3">Year 3 (Sim Months 25–36)</option>
            <option value="4">Year 4 (Sim Months 37–48)</option>
            <option value="5">Year 5 (Sim Months 49–60)</option>
          </select>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={exportCSV}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface-secondary)",
              color: "var(--text-primary)",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "var(--shadow-sm)",
              transition: "var(--transition)",
            }}
          >
            <ExportDataIcon size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: "var(--border-radius-sm)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.78rem",
            textAlign: "right",
            background: "var(--bg-surface)",
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--bg-surface-secondary)",
                color: "var(--text-muted)",
                borderBottom: "2px solid var(--border-subtle)",
                fontWeight: 700,
              }}
            >
              <th style={{ padding: "10px 12px", textAlign: "left" }}>
                Month / Entry
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>
                Phase / Milestone / Event
              </th>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>
                Tax Classes (*Steuerklassen*)
              </th>
              <th style={{ padding: "10px 12px" }}>
                <div>Husband Base Salary</div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th style={{ padding: "10px 12px" }}>
                <div>Wife Base Salary</div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th style={{ padding: "10px 12px" }}>
                <div>
                  <span>Maternity </span>
                  <button
                    type="button"
                    onClick={() =>
                      scrollToLegalRule(LegalRuleKey.MuSchG_Maternity)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: "0.74rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                    title="Click to view § 3 MuSchG statutory rule and example"
                  >
                    <span>(*MuSchG*)</span>
                    <ExternalLegalSourceIcon size={10} />
                  </button>
                </div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th style={{ padding: "10px 12px" }}>
                <div>
                  <span>ElterngeldPlus </span>
                  <button
                    type="button"
                    onClick={() =>
                      scrollToLegalRule(LegalRuleKey.BEEG_SyntheticNet)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-gain)",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: "0.74rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                    title="Click to view § 4 BEEG statutory rule and example"
                  >
                    <span>(*§ 4 BEEG*)</span>
                    <ExternalLegalSourceIcon size={10} />
                  </button>
                </div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th style={{ padding: "10px 12px" }}>
                <div>
                  <span>Partner Months </span>
                  <button
                    type="button"
                    onClick={() =>
                      scrollToLegalRule(LegalRuleKey.BEEG_PartnershipBonus)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-warning)",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: "0.74rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                    title="Click to view § 4b BEEG Partnership Bonus statutory rule and example"
                  >
                    <span>(*§ 4b BEEG*)</span>
                    <ExternalLegalSourceIcon size={10} />
                  </button>
                </div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th style={{ padding: "10px 12px" }}>
                <div>
                  <span>Child Benefit </span>
                  <button
                    type="button"
                    onClick={() =>
                      scrollToLegalRule(LegalRuleKey.EStG_Kindergeld)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-loss)",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: "0.74rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                    title="Click to view § 66 EStG Kindergeld statutory rule and example"
                  >
                    <span>(*§ 66 EStG*)</span>
                    <ExternalLegalSourceIcon size={10} />
                  </button>
                </div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th
                style={{ padding: "10px 12px", color: "var(--color-warning)" }}
              >
                <div>
                  <span>Special / Tax </span>
                  <button
                    type="button"
                    onClick={() =>
                      scrollToLegalRule(LegalRuleKey.EStG_TaxSplitting)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--series-tax-refund)",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontSize: "0.74rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                    title="Click to view § 26b EStG Marital Splitting statutory rule and example"
                  >
                    <span>(*§ 26b*)</span>
                    <ExternalLegalSourceIcon size={10} />
                  </button>
                </div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th
                style={{ padding: "10px 12px", color: "var(--text-primary)" }}
              >
                <div>Net Inflow</div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
              <th
                style={{ padding: "10px 12px", color: "var(--text-secondary)" }}
              >
                <div>Cumulated</div>
                {showDelta && scenario === "C" && (
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Target / Δ vs B
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMonths.map((m: TimelineMonth) => {
              const isHovered = hoveredMonth.value === m.month;
              const bMonth = bData.months[(m.month as number) - 1];

              // Per-column diff calculations vs Reference Scenario B
              const diffHusband =
                (m.husbandSalary as number) -
                (bMonth ? (bMonth.husbandSalary as number) : 0);
              const diffWife =
                (m.wifeSalary as number) -
                (bMonth ? (bMonth.wifeSalary as number) : 0);
              const diffMutterschutz =
                (m.mutterschutz as number) -
                (bMonth ? (bMonth.mutterschutz as number) : 0);
              const diffWifeElterngeld =
                (m.wifeElterngeld as number) -
                (bMonth ? (bMonth.wifeElterngeld as number) : 0);
              const diffHusbandElterngeld =
                (m.husbandElterngeld as number) -
                (bMonth ? (bMonth.husbandElterngeld as number) : 0);
              const diffKindergeld =
                (m.kindergeld as number) -
                (bMonth ? (bMonth.kindergeld as number) : 0);
              const diffSpecialEvents =
                (m.specialEventsTotal as number) -
                (bMonth ? (bMonth.specialEventsTotal as number) : 0);
              const diffNetInflow =
                (m.monthlyTotal as number) -
                (bMonth ? (bMonth.monthlyTotal as number) : 0);
              const diffCumulated =
                (m.cumulatedTotal as number) -
                (bMonth ? (bMonth.cumulatedTotal as number) : 0);

              const hasEvents =
                isSpecialRowsActive &&
                m.specialEvents &&
                m.specialEvents.length > 0;

              return [
                /* 1. Action Event Rows (Pre-Month Life & Decision Events: Pregnancy, Delivery, Tax Switch, Salary Raise) */
                m.startingActions &&
                  m.startingActions.map((act: ActionRowItem) => {
                    const isDelivery = act.type === ActionType.ChildDelivery;
                    const isPregnancy =
                      act.type === ActionType.PregnancyPositive;
                    const isTaxSwitch =
                      act.category === ActionCategory.TaxSwitch;

                    const badgeClass = isDelivery
                      ? "badge-brand"
                      : isPregnancy
                        ? "badge-warning"
                        : isTaxSwitch
                          ? "badge-brand"
                          : "badge-neutral";

                    const badgeLabel = isDelivery ? (
                      <>
                        <ChildBirthMilestoneIcon size={12} />
                        <span>BIRTH &amp; DELIVERY</span>
                      </>
                    ) : isPregnancy ? (
                      <>
                        <ChildBirthMilestoneIcon size={12} />
                        <span>PREGNANCY POSITIVE</span>
                      </>
                    ) : isTaxSwitch ? (
                      act.type === ActionType.TaxClassSwitchRevert ? (
                        <>
                          <TaxClassSwapMilestoneIcon size={12} />
                          <span>TAX REVERSION</span>
                        </>
                      ) : (
                        <>
                          <TaxClassSwapMilestoneIcon size={12} />
                          <span>TAX CLASS SWITCH</span>
                        </>
                      )
                    ) : (
                      <>
                        <CareerPromotionMilestoneIcon size={12} />
                        <span>SALARY RAISE</span>
                      </>
                    );

                    const cleanTitle = act.title.replace(/^ACTION:\s*/, "");

                    return (
                      <tr
                        key={act.actionId}
                        style={{
                          background: "var(--bg-surface-secondary)",
                          borderBottom: "1px dashed var(--border-subtle)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={() => {
                          hoveredMonth.value = m.month;
                        }}
                        onMouseLeave={() => {
                          hoveredMonth.value = null;
                        }}
                      >
                        <td
                          style={{
                            padding: "6px 12px",
                            textAlign: "left",
                            fontWeight: 800,
                            color: "var(--text-primary)",
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                          }}
                          title="Click to view action milestone derivation or inspect full row"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getActionFieldExplanation(
                                ExplanationFieldKey.Month,
                                act,
                                m,
                              ),
                            )
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "4px",
                            }}
                          >
                            <div>
                              <div>
                                ↳{" "}
                                {act.relativeMonthLabel ||
                                  m.relativeMonthLabel ||
                                  act.relativeBirthLabel}{" "}
                                Event
                              </div>
                              <div
                                style={{
                                  fontSize: "0.66rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                ({m.calendarLabel}) · {act.monthId}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowExplanation(
                                  getActionRowExplanation(act, m, scenario),
                                );
                              }}
                              title="Inspect full action milestone details"
                              style={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "2px 5px",
                                fontSize: "0.66rem",
                                color: "var(--color-primary)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <InformationalNoticeIcon size={12} />
                            </button>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          title="Click to view milestone details and legal context"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getActionFieldExplanation(
                                ExplanationFieldKey.Title,
                                act,
                                m,
                              ),
                            )
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              className={badgeClass}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {badgeLabel}
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                fontSize: "0.75rem",
                              }}
                            >
                              {cleanTitle}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--text-secondary)",
                              marginTop: "2px",
                            }}
                          >
                            {act.description}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            textAlign: "left",
                            color: "var(--text-muted)",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                          }}
                          title="Click to view tax class assignment"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getActionFieldExplanation(
                                ExplanationFieldKey.TaxClass,
                                act,
                                m,
                              ),
                            )
                          }
                        >
                          {act.taxClassLabel || "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontSize: "0.72rem",
                          }}
                        >
                          —
                        </td>
                      </tr>
                    );
                  }),

                /* 2. Special Fiscal Event Rows (Pre-Month Bonuses, Tax Returns, and One-Off Costs/Income) */
                hasEvents &&
                  m.specialEvents.map((ev: SpecialEventItem, evIdx: number) => {
                    const bEvents = bMonth?.specialEvents || [];
                    const bMatchIdx = bEvents.findIndex(
                      (it: SpecialEventItem) =>
                        it.eventId === ev.eventId ||
                        it.title === ev.title ||
                        it.type === ev.type,
                    );
                    const bEv = bMatchIdx >= 0 ? bEvents[bMatchIdx] : undefined;
                    const bEvAmount = bEv ? (bEv.amount as number) : 0;
                    const evDiff = (ev.amount as number) - bEvAmount;
                    const isCost = (ev.amount as number) < 0;

                    // Progressive Cumulative Total calculation at this event row
                    const prevMonthIdx = (m.month as number) - 2;
                    const prevCumulated =
                      prevMonthIdx >= 0
                        ? (current.months[prevMonthIdx]
                            ?.cumulatedTotal as number) || 0
                        : 0;
                    const bPrevCumulated =
                      prevMonthIdx >= 0
                        ? (bData.months[prevMonthIdx]
                            ?.cumulatedTotal as number) || 0
                        : 0;

                    const priorEventsSum = m.specialEvents
                      .slice(0, evIdx)
                      .reduce(
                        (acc: number, it: SpecialEventItem) =>
                          acc + (it.amount as number),
                        0,
                      );
                    const evCumulated =
                      prevCumulated + priorEventsSum + (ev.amount as number);

                    const bPriorSum =
                      bMatchIdx >= 0
                        ? bEvents
                            .slice(0, bMatchIdx + 1)
                            .reduce(
                              (acc: number, it: SpecialEventItem) =>
                                acc + (it.amount as number),
                              0,
                            )
                        : 0;
                    const bEvCumulated = bPrevCumulated + bPriorSum;
                    const diffEvCumulated = evCumulated - bEvCumulated;

                    const badgeClass = isCost
                      ? "badge-loss"
                      : (ev.type as string).startsWith("bonus")
                        ? "badge-warning"
                        : "badge-gain";

                    const valColor = isCost
                      ? "var(--color-loss)"
                      : (ev.type as string).startsWith("bonus")
                        ? "var(--color-warning)"
                        : "var(--color-gain)";

                    return (
                      <tr
                        key={ev.eventId}
                        style={{
                          borderBottom: "1px dashed var(--border-subtle)",
                          background: isCost
                            ? "var(--color-loss-bg)"
                            : "var(--bg-surface-secondary)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={() => {
                          hoveredMonth.value = m.month;
                        }}
                        onMouseLeave={() => {
                          hoveredMonth.value = null;
                        }}
                      >
                        <td
                          style={{
                            padding: "6px 12px",
                            textAlign: "left",
                            color: valColor,
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                          }}
                          title="Click to view event derivation or inspect full row"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.Month,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "4px",
                            }}
                          >
                            <div>
                              <div>
                                ↳{" "}
                                {ev.relativeMonthLabel ||
                                  m.relativeMonthLabel ||
                                  ev.relativeBirthLabel}{" "}
                                {isCost ? "Cost" : "Event"}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.66rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                ({ev.calendarLabel}) · {ev.monthId}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowExplanation(
                                  getSpecialEventRowExplanation(
                                    ev,
                                    m,
                                    bMonth,
                                    prevCumulated,
                                    scenario,
                                  ),
                                );
                              }}
                              title="Inspect full fiscal event breakdown"
                              style={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                padding: "2px 5px",
                                fontSize: "0.66rem",
                                color: "var(--color-primary)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <InformationalNoticeIcon size={12} />
                            </button>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          title="Click to view event description and legal rule"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.Title,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              className={badgeClass}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {isCost ? (
                                <FinancialInflowIcon size={11} />
                              ) : null}
                              <span>{ev.category}</span>
                            </span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                fontSize: "0.75rem",
                              }}
                            >
                              {ev.title}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--text-secondary)",
                              marginTop: "2px",
                            }}
                          >
                            {ev.description}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            textAlign: "left",
                            color: "var(--text-muted)",
                            fontSize: "0.72rem",
                          }}
                        >
                          <div>{ev.taxClassLabel}</div>
                          {showDelta && scenario === "C" && (
                            <div
                              style={{
                                fontSize: "0.66rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              {evDiff !== 0
                                ? "Splitting Reconciled"
                                : "Same as B"}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{
                            padding: "6px 12px",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          —
                        </td>
                        <td
                          style={{ padding: "6px 12px", cursor: "pointer" }}
                          title="Click to view transaction amount and formula derivation"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.Amount,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          {renderCell(
                            ev.amount as number,
                            evDiff,
                            false,
                            valColor,
                            true,
                          )}
                        </td>
                        <td
                          style={{ padding: "6px 12px", cursor: "pointer" }}
                          title="Click to view net inflow calculation"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.NetInflow,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          {renderCell(
                            ev.amount as number,
                            evDiff,
                            false,
                            valColor,
                            true,
                          )}
                        </td>
                        <td
                          style={{ padding: "6px 12px", cursor: "pointer" }}
                          title="Click to view cumulative balance derivation"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.CumulativeTotal,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          {renderCell(
                            evCumulated,
                            diffEvCumulated,
                            false,
                            "var(--text-primary)",
                            false,
                          )}
                        </td>
                      </tr>
                    );
                  }),

                /* 3. Base Monthly Row */
                <tr
                  key={m.monthId}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: isHovered
                      ? "var(--color-primary-bg)"
                      : m.eventTag
                        ? "var(--bg-surface-secondary)"
                        : "transparent",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={() => {
                    hoveredMonth.value = m.month;
                  }}
                  onMouseLeave={() => {
                    hoveredMonth.value = null;
                  }}
                >
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                      cursor: "pointer",
                    }}
                    title="Click to view month derivation or click ℹ️ to inspect the full row"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.Month,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "4px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span style={{ fontWeight: 800 }}>
                            {m.relativeMonthLabel || m.relativeBirthLabel}
                          </span>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--color-primary)",
                              fontWeight: 600,
                            }}
                          >
                            ({m.calendarLabel})
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            fontWeight: 500,
                          }}
                        >
                          {m.monthId} · {m.monthSimRef || `Sim${m.month}`} · Y
                          {m.year}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRowExplanation(
                            getRowExplanation(m, bMonth, scenario),
                          );
                        }}
                        title="Inspect full monthly cash flow and statutory audit"
                        style={{
                          background: "var(--bg-surface-secondary)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "4px",
                          padding: "2px 5px",
                          fontSize: "0.66rem",
                          color: "var(--color-primary)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <InformationalNoticeIcon size={12} />
                      </button>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    title="Click to view lifecycle phase explanation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.Phase,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {m.eventTag ? (
                      <span className="badge-brand">{m.eventTag}</span>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>
                        {m.phaseLabel}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    title="Click to view tax class derivation and legal basis"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.TaxClass,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    <div
                      style={{
                        color: m.isSwapActive
                          ? "var(--color-primary)"
                          : "var(--text-muted)",
                        fontWeight: m.isSwapActive ? 700 : 500,
                      }}
                    >
                      {m.taxClassLabel}
                    </div>
                    {showDelta && scenario === "C" && (
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: m.isSwapActive
                            ? "var(--color-warning)"
                            : "var(--text-muted)",
                          fontWeight: m.isSwapActive ? 700 : 500,
                        }}
                      >
                        {m.isSwapActive
                          ? "Swapped (vs. B: III/V)"
                          : "Same as B (III/V)"}
                      </div>
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view husband gross-to-net calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.HusbandSalary,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      m.husbandSalary as number,
                      diffHusband,
                      true,
                      "var(--series-salary-husband)",
                      true,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view wife gross-to-net calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.WifeSalary,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      m.wifeSalary as number,
                      diffWife,
                      true,
                      "var(--series-salary-wife)",
                      true,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view statutory Mutterschutz wage replacement formula"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.Mutterschutz,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      m.mutterschutz as number,
                      diffMutterschutz,
                      true,
                      "var(--series-mutterschutz)",
                      true,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view § 4 BEEG synthetic net and Elterngeld derivation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.WifeElterngeld,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      m.wifeElterngeld as number,
                      diffWifeElterngeld,
                      true,
                      "var(--series-elterngeld-mother)",
                      true,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view partner months calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.HusbandElterngeld,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      m.husbandElterngeld as number,
                      diffHusbandElterngeld,
                      true,
                      "var(--series-elterngeld-father)",
                      true,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view § 66 EStG Kindergeld calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.Kindergeld,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      m.kindergeld as number,
                      diffKindergeld,
                      true,
                      "var(--series-kindergeld)",
                      false,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view 13th month / special tax events"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.SpecialEvents,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      isSpecialRowsActive
                        ? 0
                        : (m.specialEventsTotal as number),
                      isSpecialRowsActive ? 0 : diffSpecialEvents,
                      true,
                      "var(--color-warning)",
                      true,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view total monthly inflow sum"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.NetInflow,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      isSpecialRowsActive
                        ? (m.regularMonthlyTotal as number)
                        : (m.monthlyTotal as number),
                      isSpecialRowsActive
                        ? diffNetInflow
                        : (m.monthlyTotal as number) -
                            (bMonth ? (bMonth.monthlyTotal as number) : 0),
                      false,
                      "var(--text-primary)",
                      true,
                    )}
                  </td>
                  <td
                    style={{ padding: "8px 12px", cursor: "pointer" }}
                    title="Click to view cumulative total balance"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(
                          FieldColumnKey.CumulativeTotal,
                          m,
                          bMonth,
                          scenario,
                        ),
                      )
                    }
                  >
                    {renderCell(
                      m.cumulatedTotal as number,
                      diffCumulated,
                      false,
                      "var(--text-primary)",
                      true,
                    )}
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Explainer Modals */}
      {selectedFieldExplanation && (
        <FieldExplainerModal
          explanation={selectedFieldExplanation}
          onClose={() => setSelectedFieldExplanation(null)}
        />
      )}

      {selectedRowExplanation && (
        <RowExplainerModal
          explanation={selectedRowExplanation}
          onClose={() => setSelectedRowExplanation(null)}
        />
      )}
    </div>
  );
}
