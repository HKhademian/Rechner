import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  resignationRunwayStore,
} from "#/apps/resignation-runway/resignationRunwayStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  TransitionMonthPhase,
  compareResignationScenarios,
} from "#engine/lifeProfile/resignationRunway";
import {
  toEuroCents,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

function formatPhase(phase: TransitionMonthPhase): string {
  if (phase === TransitionMonthPhase.WaitingPeriod) {
    return "Waiting period";
  }
  if (phase === TransitionMonthPhase.BenefitPeriod) {
    return "Estimated benefit";
  }
  if (phase === TransitionMonthPhase.UnfundedSearch) {
    return "Unfunded search";
  }
  return "New job";
}

function eurToCents(eur: number) {
  return toEuroCents(Math.round(eur * 100));
}

export default function ResignationRunwayCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? resignationRunwayStore.state.value : resignationRunwayStore.defaultState;

  const baseInput = {
    openingSavingsCents: eurToCents(state.openingSavingsEur),
    finalPayCents: eurToCents(state.finalPayEur),
    monthlyExpensesCents: eurToCents(state.monthlyExpensesEur),
    jobSearchMonths: state.jobSearchMonths,
    waitingPeriodMonths: state.waitingPeriodMonths,
    monthlyBenefitCents: eurToCents(state.monthlyBenefitEur),
    newJobMonthlyNetCents: eurToCents(state.newJobMonthlyNetEur),
    horizonMonths: state.horizonMonths,
  };

  const scenarios = compareResignationScenarios([
    { ...baseInput,
      label: "Base transition" },
    { ...baseInput,
      label: "No waiting period (0 mo)",
      waitingPeriodMonths: 0 },
    { ...baseInput,
      label: "Longer search (+2 months)",
      jobSearchMonths: Math.min(36, state.jobSearchMonths + 2) },
    { ...baseInput,
      label: "Zero benefit safety check",
      monthlyBenefitCents: toEuroCents(0) },
  ]);
  const primary = scenarios[0];

  return <AppShell currentPath={calculatorPath(AppId.ResignationRunway)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Career Transition · Demo"
        title="Resignation & Job Transition Runway"
        subtitle="Stress-test liquid savings across resignations, sabbaticals, waiting periods (Sperrzeit) and job-search timelines. Works standalone without a Life Profile."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={resignationRunwayStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Resignation runway highlights">
        <MetricCard
          label="Solvent Runway"
          value={`${primary.solventMonths} / ${primary.months.length} mo`}
          tone={primary.shortfallMonthIndex === undefined ? MetricTone.Gain : MetricTone.Loss}
          subtitle={primary.shortfallMonthIndex !== undefined ? `Shortfall in month ${primary.shortfallMonthIndex}` : "No shortfall within horizon"}
        />
        <MetricCard
          label="Lowest Cash Point"
          value={formatIntegerEuroCents(primary.minimumBalanceCents)}
          tone={primary.minimumBalanceCents >= 0 ? MetricTone.Neutral : MetricTone.Loss}
          subtitle="Minimum month-end balance"
        />
        <MetricCard
          label="Ending Balance"
          value={formatIntegerEuroCents(primary.endingBalanceCents)}
          subtitle={`After ${primary.months.length} months`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="runway-inputs-heading">
        <h2 id="runway-inputs-heading">Transition Assumptions</h2>
        <div className="domain-calc-grid">
          <NumberField id="rr-opening" label="Opening liquid savings" value={state.openingSavingsEur} min={0} max={1000000} step={500} unit="€" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            openingSavingsEur: v }))} />
          <NumberField id="rr-final" label="Final pay / payout (month 1)" value={state.finalPayEur} min={0} max={500000} step={250} unit="€" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            finalPayEur: v }))} />
          <NumberField id="rr-expenses" label="Monthly essential expenses" value={state.monthlyExpensesEur} min={0} max={50000} step={100} unit="€" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            monthlyExpensesEur: v }))} />
          <NumberField id="rr-search" label="Job-search duration" value={state.jobSearchMonths} min={0} max={36} step={1} unit="mo" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            jobSearchMonths: v }))} />
          <NumberField id="rr-wait" label="Benefit waiting period (Sperrzeit)" value={state.waitingPeriodMonths} min={0} max={12} step={1} unit="mo" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            waitingPeriodMonths: v }))} />
          <NumberField id="rr-benefit" label="Estimated monthly benefit" value={state.monthlyBenefitEur} min={0} max={10000} step={50} unit="€" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            monthlyBenefitEur: v }))} />
          <NumberField id="rr-newnet" label="Expected new-job monthly net" value={state.newJobMonthlyNetEur} min={0} max={50000} step={100} unit="€" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            newJobMonthlyNetEur: v }))} />
          <NumberField id="rr-horizon" label="Projection horizon" value={state.horizonMonths} min={1} max={60} step={1} unit="mo" onChange={(v) => resignationRunwayStore.update((s) => ({ ...s,
            horizonMonths: v }))} />
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="runway-compare-heading">
        <h2 id="runway-compare-heading">Scenario Comparison</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Solvent months</th>
                <th>Lowest balance</th>
                <th>Ending balance</th>
                <th>Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => <tr key={scenario.label}>
                <th scope="row">{scenario.label}</th>
                <td>{scenario.solventMonths} / {scenario.months.length}</td>
                <td>{formatIntegerEuroCents(scenario.minimumBalanceCents)}</td>
                <td>{formatIntegerEuroCents(scenario.endingBalanceCents)}</td>
                <td>{scenario.shortfallMonthIndex !== undefined ? `Month ${scenario.shortfallMonthIndex}` : "None"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="runway-schedule-heading">
        <h2 id="runway-schedule-heading">Base Month-by-Month Schedule</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Phase</th>
                <th>Inflows</th>
                <th>Expenses</th>
                <th>Closing balance</th>
              </tr>
            </thead>
            <tbody>
              {primary.months.map((row) => <tr key={row.monthIndex}>
                <th scope="row">Month {row.monthIndex}</th>
                <td>{formatPhase(row.phase)}</td>
                <td>{formatIntegerEuroCents(row.inflowCents)}</td>
                <td>{formatIntegerEuroCents(row.expenseCents)}</td>
                <td>{formatIntegerEuroCents(row.closingBalanceCents)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <CalculationExplanationPanel explanation={primary.explanation} summary="Explain transition runway formula and assumptions" />
      </section>
    </main>
  </AppShell>;
}
