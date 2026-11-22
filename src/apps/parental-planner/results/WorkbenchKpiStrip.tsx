import type {
  JSX,
} from "preact";
import {
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  ActiveScenarioView,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchMetrics,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";

function formatCompactK(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    return `${amount < 0 ? "-" : ""}€${(abs / 1000).toFixed(abs >= 100000 ? 0 : 1)}k`;
  }
  return formatEur(amount);
}

/** Unified hairline-divided 4-metric typographic scorecard rendered inside OverviewTab (Concept A). */
export function WorkbenchKpiStrip(): JSX.Element {
  const s = workbenchState.value;
  const current = s.activeScenario === ActiveScenarioView.Compare
    ? displayedWorkbenchScenarioC.value
    : displayedWorkbenchCurrentScenario.value;
  const baselineTotal = displayedWorkbenchScenarioB.value.summary.grandTotal;
  const metrics = displayedWorkbenchMetrics.value;
  const sum = current.summary;
  const totalEg = sum.totalWifeElterngeld + sum.totalHusbandElterngeld;
  const benefitsAndRefunds = sum.totalBenefits + sum.totalTaxRefunds;
  const p1Salaries = current.months.reduce((acc, m) => acc + m.husbandSalary, 0);
  const p2Salaries = current.months.reduce((acc, m) => acc + m.wifeSalary, 0);
  const avgMonthly = sum.grandTotal / Math.max(1, current.months.length);
  const pctVsB = baselineTotal > 0 ? ((metrics.gainCvsB / baselineTotal) * 100).toFixed(1) : "0.0";

  return (
    <section className="plw-scorecard" aria-label="Key metrics">
      <div className="plw-scorecard__cell">
        <div className="plw-scorecard__label">{s.simulationDurationMonths}-Month Net Cash Flow</div>
        <div className="plw-scorecard__val plw-scorecard__val--primary tabular-nums">
          {formatEur(sum.grandTotal)}
        </div>
        <div className="plw-scorecard__sub tabular-nums">Avg {formatEur(avgMonthly)}/mo</div>
      </div>

      <div className="plw-scorecard__cell">
        <div className="plw-scorecard__label">§ 2b Switch Impact</div>
        <div className={`plw-scorecard__val tabular-nums${metrics.gainCvsB > 0 ? " plw-scorecard__val--gain" : ""}`}>
          {metrics.gainCvsB >= 0 ? "+" : ""}{formatEur(metrics.gainCvsB)}
        </div>
        <div className="plw-scorecard__sub">
          {metrics.gainCvsB >= 0 ? "+" : ""}{pctVsB}% vs B ·{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>
        </div>
      </div>

      <div className="plw-scorecard__cell">
        <div className="plw-scorecard__label">Net Working Salaries</div>
        <div className="plw-scorecard__val tabular-nums">{formatEur(sum.totalSalaries)}</div>
        <div className="plw-scorecard__sub tabular-nums">
          P1 {formatCompactK(p1Salaries)} · P2 {formatCompactK(p2Salaries)}
        </div>
      </div>

      <div className="plw-scorecard__cell">
        <div className="plw-scorecard__label">Benefits &amp; Tax Refunds</div>
        <div className="plw-scorecard__val tabular-nums">{formatEur(benefitsAndRefunds)}</div>
        <div className="plw-scorecard__sub tabular-nums">
          EG {formatCompactK(totalEg)} · KG {formatCompactK(sum.totalKindergeld)}
        </div>
      </div>
    </section>
  );
}
