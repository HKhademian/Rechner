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

/** 4-KPI Scorecard matching the approved prototype sketch. */
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
    <section className="plw-kpi-grid" aria-label="Key metrics">
      <article className="plw-kpi-card">
        <div className="plw-kpi-card__label">Net Working Salaries</div>
        <div className="plw-kpi-card__value">{formatEur(sum.totalSalaries)}</div>
        <div className="plw-kpi-card__sub">
          P1 {formatCompactK(p1Salaries)} · P2 {formatCompactK(p2Salaries)}
        </div>
      </article>

      <article className="plw-kpi-card">
        <div className="plw-kpi-card__label">Benefits &amp; Tax Refunds</div>
        <div className="plw-kpi-card__value plw-kpi-card__value--gain">{formatEur(benefitsAndRefunds)}</div>
        <div className="plw-kpi-card__sub">
          EG {formatCompactK(totalEg)} · KG {formatCompactK(sum.totalKindergeld)}
        </div>
      </article>

      <article className="plw-kpi-card">
        <div className="plw-kpi-card__label">{s.simulationDurationMonths}-Month Net Cash Flow</div>
        <div className="plw-kpi-card__value plw-kpi-card__value--primary">{formatEur(sum.grandTotal)}</div>
        <div className="plw-kpi-card__sub">Avg {formatEur(avgMonthly)}/mo</div>
      </article>

      <article className={`plw-kpi-card${metrics.gainCvsB > 0 ? " plw-kpi-card--gain" : ""}`}>
        <div className="plw-kpi-card__label">Tax-Class Switch Impact</div>
        <div className={`plw-kpi-card__value${metrics.gainCvsB > 0 ? " plw-kpi-card__value--gain" : ""}`}>
          {metrics.gainCvsB >= 0 ? "+" : ""}{formatEur(metrics.gainCvsB)}
        </div>
        <div className="plw-kpi-card__sub">
          {metrics.gainCvsB >= 0 ? "+" : ""}{pctVsB}% vs Original (B) ·{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>
        </div>
      </article>
    </section>
  );
}
