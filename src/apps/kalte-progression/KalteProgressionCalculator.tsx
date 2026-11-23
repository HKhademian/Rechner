import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";


import {
  kalteProgressionStore,
} from "#/apps/kalte-progression/kalteProgressionStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";


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
  evaluateCompoundedWageGrowthFormula,
  evaluatePurchasingPowerDiscountFormula,
} from "#engine/formulas/pure/inflationFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  type CalculationExplanation,
  ExplanationFormulaKind,
  ExplanationStatus,
  toFormulaVersion,
} from "#engine/lifeProfile/calculationExplanation";
import {
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  resolveEffectiveTaxRulesForYear,
} from "#engine/tax/inflationIndexing";
import {
  annualWithholdingTaxBase,
  payrollInputs,
} from "#engine/tax/payroll";
import {
  VERIFIED_TAX_YEARS,
} from "#engine/tax/taxRules";
import {
  computeAnnualIncomeTax,
  computeGrossToNetBreakdown,
  computeSolidaritySurcharge,
} from "#engine/tax/wageTax";
import {
  TaxClass,
  toChildrenCount,
  toEuroAmount,
  toEuroCents,
  toFullCalendarYear,
  toGrossSalary,
  toPercentageRate,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

function eurToCents(eur: number) {
  return toEuroCents(Math.round(eur * 100));
}

export default function KalteProgressionCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? kalteProgressionStore.state.value : kalteProgressionStore.defaultState;

  const wageRate = toPercentageRate(state.annualWageGrowthPct / 100);
  const inflationRate = toPercentageRate(state.annualInflationPct / 100);
  const indexRate = toPercentageRate(state.annualBracketIndexPct / 100);
  const children = toChildrenCount(state.childrenCount);

  const rows = Array.from({ length: state.horizonYears + 1 }, (_, offset) => {
    const year = toFullCalendarYear(state.baseYear + offset);
    const nominalGross = evaluateCompoundedWageGrowthFormula({
      baseAmount: toEuroAmount(state.startingMonthlyGrossEur),
      annualGrowthRate: wageRate,
      yearsElapsed: offset,
    });
    const frozenRules = resolveEffectiveTaxRulesForYear(year, undefined, toPercentageRate(0), false);
    const indexedRules = resolveEffectiveTaxRulesForYear(year, undefined, indexRate, true);

    const frozenBreakdown = computeGrossToNetBreakdown(
      toGrossSalary(nominalGross),
      state.taxClass,
      state.childrenCount,
      undefined,
      undefined,
      frozenRules,
    );

    const annualTaxBase = annualWithholdingTaxBase(
      payrollInputs(toGrossSalary(nominalGross), state.taxClass, children, frozenRules, {}),
      frozenRules,
    );
    const frozenIncomeTax = computeAnnualIncomeTax(annualTaxBase, frozenRules);
    const frozenAnnualTaxTotal = frozenIncomeTax + computeSolidaritySurcharge(frozenIncomeTax, false, frozenRules);
    const indexedIncomeTax = computeAnnualIncomeTax(annualTaxBase, indexedRules);
    const indexedAnnualTaxTotal = indexedIncomeTax + computeSolidaritySurcharge(indexedIncomeTax, false, indexedRules);

    const monthlyFiscalDragEur = Math.max(0, (frozenAnnualTaxTotal - indexedAnnualTaxTotal) / 12);
    const nominalIndexedNet = frozenBreakdown.monthlyNetTakeHome + monthlyFiscalDragEur;

    const realFrozenNet = evaluatePurchasingPowerDiscountFormula({
      nominalAmount: toEuroAmount(frozenBreakdown.monthlyNetTakeHome),
      annualInflationRate: inflationRate,
      elapsedMonths: offset * 12,
    }).realAmount;
    const realIndexedNet = evaluatePurchasingPowerDiscountFormula({
      nominalAmount: toEuroAmount(nominalIndexedNet),
      annualInflationRate: inflationRate,
      elapsedMonths: offset * 12,
    }).realAmount;

    return {
      offset,
      year,
      nominalGross,
      nominalFrozenNet: frozenBreakdown.monthlyNetTakeHome,
      realFrozenNet,
      realIndexedNet,
      monthlyFiscalDragEur,
    };
  });

  const startRow = rows[0];
  const endRow = rows[rows.length - 1];
  const realChangeFrozen = endRow.realFrozenNet - startRow.realFrozenNet;
  const cumulativeDragEur = rows.reduce((sum, r) => sum + (r.monthlyFiscalDragEur * 12), 0);

  const explanation: CalculationExplanation = {
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Projected,
    formulaName: "Multi-Year Real Purchasing Power & Kalte Progression Projection",
    formulaExpression: "realNet(t) = Net(Gross × (1+g)^t, Tariff(t)) / (1+π)^t; fiscalDrag = Net(indexedTariff) − Net(frozenTariff)",
    formulaVersion: toFormulaVersion("de-inflg-kalte-progression-v1"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate: toLifeDate(`${state.baseYear}-01-01`),
    inputs: [
      { label: "Starting monthly gross",
        value: formatIntegerEuroCents(eurToCents(state.startingMonthlyGrossEur)),
        source: `Base year ${state.baseYear}` },
      { label: "Wage growth vs. CPI inflation",
        value: `${state.annualWageGrowthPct}% wage / ${state.annualInflationPct}% CPI`,
        source: "User assumption" },
      { label: "Future bracket indexing",
        value: `${state.annualBracketIndexPct}% / year`,
        source: "Applied only beyond verified EStG years" },
    ],
    parameters: [],
    lawIds: [LawId.InflG, LawId.EStG_32a],
    topicIds: ["taxable-income"],
    assumptions: [
      "Verified statutory tax years remain unchanged; bracket indexing applies only to projected years beyond the latest verified EStG table.",
      "Social security contribution ceilings (BBG) stay at the latest verified year's nominal levels in this projection.",
      "Real values are discounted to Year-0 purchasing power using compound annual CPI inflation.",
    ],
  };

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Inflation & Fiscal Drag · Demo"
        title="Kalte Progression &amp; Purchasing Power Simulator"
        subtitle="Compare multi-year real take-home pay when German tax brackets stay frozen (kalte Progression) versus indexed for inflation (Inflationsausgleich)."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={kalteProgressionStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Kalte Progression highlights">
        <MetricCard
          label={`Year ${endRow.year} Real Net (Frozen Brackets)`}
          value={`${formatIntegerEuroCents(eurToCents(endRow.realFrozenNet))}/mo`}
          tone={realChangeFrozen >= 0 ? MetricTone.Gain : MetricTone.Loss}
          subtitle={`${realChangeFrozen >= 0 ? "+" : ""}${formatIntegerEuroCents(eurToCents(realChangeFrozen))}/mo vs. ${startRow.year} purchasing power`}
        />
        <MetricCard
          label={`Year ${endRow.year} Real Net (Indexed Brackets)`}
          value={`${formatIntegerEuroCents(eurToCents(endRow.realIndexedNet))}/mo`}
          tone={MetricTone.Primary}
          subtitle={`Saves ${formatIntegerEuroCents(eurToCents(endRow.monthlyFiscalDragEur))}/mo nominal tax by ${endRow.year}`}
        />
        <MetricCard
          label={`Cumulative Fiscal Drag (${state.horizonYears} yr)`}
          value={formatIntegerEuroCents(eurToCents(cumulativeDragEur))}
          tone={cumulativeDragEur > 0 ? MetricTone.Loss : MetricTone.Neutral}
          subtitle="Total extra nominal tax if brackets are not indexed"
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="kp-inputs-heading">
        <h2 id="kp-inputs-heading">Macroeconomic &amp; Salary Assumptions</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="kp-year" className="ui-field__label">Starting verified tax year</label>
            <select
              id="kp-year"
              className="ui-input"
              value={String(state.baseYear)}
              onChange={(e) => kalteProgressionStore.update((s) => ({ ...s,
                baseYear: Number((e.target as HTMLSelectElement).value) }))}
            >
              {VERIFIED_TAX_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <NumberField id="kp-gross" label="Starting monthly gross" value={state.startingMonthlyGrossEur} min={500} max={50000} step={100} unit="€" onChange={(v) => kalteProgressionStore.update((s) => ({ ...s,
            startingMonthlyGrossEur: v }))} />
          <div className="ui-field">
            <label htmlFor="kp-class" className="ui-field__label">Tax class</label>
            <select
              id="kp-class"
              className="ui-input"
              value={state.taxClass}
              onChange={(e) => kalteProgressionStore.update((s) => ({ ...s,
                taxClass: (e.target as HTMLSelectElement).value as TaxClass }))}
            >
              {Object.values(TaxClass).map((tc) => <option key={tc} value={tc}>Class {tc}</option>)}
            </select>
          </div>
          <NumberField id="kp-horizon" label="Projection horizon" value={state.horizonYears} min={1} max={10} step={1} unit="yr" onChange={(v) => kalteProgressionStore.update((s) => ({ ...s,
            horizonYears: v }))} />
          <NumberField id="kp-wage" label="Annual nominal wage growth" value={state.annualWageGrowthPct} min={0} max={15} step={0.5} unit="%" onChange={(v) => kalteProgressionStore.update((s) => ({ ...s,
            annualWageGrowthPct: v }))} />
          <NumberField id="kp-cpi" label="Annual CPI inflation" value={state.annualInflationPct} min={0} max={15} step={0.5} unit="%" onChange={(v) => kalteProgressionStore.update((s) => ({ ...s,
            annualInflationPct: v }))} />
          <NumberField id="kp-idx" label="Bracket indexing benchmark" value={state.annualBracketIndexPct} min={0} max={15} step={0.5} unit="%" onChange={(v) => kalteProgressionStore.update((s) => ({ ...s,
            annualBracketIndexPct: v }))} />
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="kp-table-heading">
        <h2 id="kp-table-heading">Year-by-Year Purchasing Power &amp; Fiscal Drag</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Nominal gross/mo</th>
                <th>Nominal net (frozen)</th>
                <th>Real net (frozen, {startRow.year} €)</th>
                <th>Real net (indexed, {startRow.year} €)</th>
                <th>Monthly fiscal drag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => <tr key={row.year}>
                <th scope="row">{row.year}</th>
                <td>{formatIntegerEuroCents(eurToCents(row.nominalGross))}</td>
                <td>{formatIntegerEuroCents(eurToCents(row.nominalFrozenNet))}</td>
                <td>{formatIntegerEuroCents(eurToCents(row.realFrozenNet))}</td>
                <td>{formatIntegerEuroCents(eurToCents(row.realIndexedNet))}</td>
                <td>{formatIntegerEuroCents(eurToCents(row.monthlyFiscalDragEur))}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <CalculationExplanationPanel explanation={explanation} summary="Explain Inflationsausgleich, CPI discounting and projection boundaries" />
      </section>
    </main>
  </>;
}
