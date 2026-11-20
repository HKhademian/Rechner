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
  salaryRaiseStore,
} from "#/apps/salary-raise/salaryRaiseStore.ts";
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
  VERIFIED_TAX_YEARS,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  TaxClass,
  toEuroAmount,
  toEuroCents,
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

function eurToCents(eur: number) {
  return toEuroCents(Math.round(eur * 100));
}

export default function SalaryRaiseCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? salaryRaiseStore.state.value : salaryRaiseStore.defaultState;

  const rules = createTaxRules(toFullCalendarYear(state.taxYear));
  const monthlyRaiseEur = Math.round((state.currentMonthlyGrossEur * (state.raisePercent / 100)) + state.fixedMonthlyRaiseEur);
  const newMonthlyGrossEur = state.currentMonthlyGrossEur + monthlyRaiseEur;

  const before = computeGrossToNetBreakdown(
    toGrossSalary(state.currentMonthlyGrossEur),
    state.taxClass,
    state.childrenCount,
    undefined,
    undefined,
    rules,
  );
  const after = computeGrossToNetBreakdown(
    toGrossSalary(newMonthlyGrossEur),
    state.taxClass,
    state.childrenCount,
    undefined,
    undefined,
    rules,
  );
  const withBonus = computeGrossToNetBreakdown(
    toGrossSalary(newMonthlyGrossEur),
    state.taxClass,
    state.childrenCount,
    toEuroAmount(state.oneOffBonusEur),
    undefined,
    rules,
  );

  const monthlyNetGain = after.monthlyNetTakeHome - before.monthlyNetTakeHome;
  const keepRatePct = monthlyRaiseEur > 0 ? (monthlyNetGain / monthlyRaiseEur) * 100 : 0;
  const bonusNetGain = withBonus.monthlyNetTakeHome - after.monthlyNetTakeHome;
  const bonusKeepPct = state.oneOffBonusEur > 0 ? (bonusNetGain / state.oneOffBonusEur) * 100 : 0;

  const explanation: CalculationExplanation = {
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Supported,
    formulaName: "Marginal Take-Home Pay Comparison (BMF PAP Lohnsteuer & Social Security)",
    formulaExpression: "keepRate = (Net(gross + raise) − Net(gross)) / raise",
    formulaVersion: toFormulaVersion("de-bmf-marginal-raise-v1"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate: toLifeDate(`${state.taxYear}-01-01`),
    inputs: [
      { label: "Current monthly gross",
        value: formatIntegerEuroCents(eurToCents(state.currentMonthlyGrossEur)),
        source: "User input" },
      { label: "Monthly gross raise",
        value: `+${formatIntegerEuroCents(eurToCents(monthlyRaiseEur))}`,
        source: `${state.raisePercent}% + ${state.fixedMonthlyRaiseEur} €` },
      { label: "Tax class & children",
        value: `Class ${state.taxClass}, ${state.childrenCount} child(ren)`,
        source: "User input" },
    ],
    parameters: [],
    lawIds: [LawId.EStG_39b, LawId.EStG_32a, LawId.SGB5_241, LawId.SGB6_158],
    topicIds: ["tax-class", "taxable-income"],
    assumptions: [
      "Uses official BMF PAP payroll withholding and standard statutory public health/pension/care/unemployment rates without church tax.",
      "Above contribution ceilings (BBG), marginal social security drops to 0% so keep-rate improves until top income tax brackets apply.",
    ],
  };

  return <AppShell currentPath={calculatorPath(AppId.SalaryRaise)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Salary Negotiation · Demo"
        title="Salary Raise &amp; Marginal Take-Home Calculator"
        subtitle="See exactly how much of a raise or annual bonus lands in your bank account after German wage tax and social contributions."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={salaryRaiseStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Salary raise highlights">
        <MetricCard
          label="Monthly Net Gain"
          value={`+${formatIntegerEuroCents(eurToCents(monthlyNetGain))}/mo`}
          tone={MetricTone.Gain}
          subtitle={`+${formatIntegerEuroCents(eurToCents(monthlyNetGain * 12))}/year net`}
        />
        <MetricCard
          label="Marginal Keep Rate"
          value={`${keepRatePct.toFixed(1)}%`}
          tone={MetricTone.Primary}
          subtitle={`Out of +${formatIntegerEuroCents(eurToCents(monthlyRaiseEur))}/mo gross raise`}
        />
        <MetricCard
          label="One-Off Bonus Net"
          value={formatIntegerEuroCents(eurToCents(bonusNetGain))}
          subtitle={state.oneOffBonusEur > 0 ? `${bonusKeepPct.toFixed(1)}% of ${formatIntegerEuroCents(eurToCents(state.oneOffBonusEur))} gross bonus` : "Enter a bonus below"}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="sr-inputs-heading">
        <h2 id="sr-inputs-heading">Current Pay, Raise &amp; Bonus</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="sr-year" className="ui-field__label">Verified tax year</label>
            <select
              id="sr-year"
              className="ui-input"
              value={String(state.taxYear)}
              onChange={(e) => salaryRaiseStore.update((s) => ({ ...s,
                taxYear: Number((e.target as HTMLSelectElement).value) }))}
            >
              {VERIFIED_TAX_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <NumberField id="sr-gross" label="Current monthly gross" value={state.currentMonthlyGrossEur} min={0} max={50000} step={100} unit="€" onChange={(v) => salaryRaiseStore.update((s) => ({ ...s,
            currentMonthlyGrossEur: v }))} />
          <NumberField id="sr-pct" label="Percentage raise" value={state.raisePercent} min={0} max={100} step={0.5} unit="%" onChange={(v) => salaryRaiseStore.update((s) => ({ ...s,
            raisePercent: v }))} />
          <NumberField id="sr-fixed" label="Additional fixed monthly raise" value={state.fixedMonthlyRaiseEur} min={0} max={20000} step={50} unit="€" onChange={(v) => salaryRaiseStore.update((s) => ({ ...s,
            fixedMonthlyRaiseEur: v }))} />
          <NumberField id="sr-bonus" label="One-off annual bonus (Sonstiger Bezug)" value={state.oneOffBonusEur} min={0} max={200000} step={250} unit="€" onChange={(v) => salaryRaiseStore.update((s) => ({ ...s,
            oneOffBonusEur: v }))} />
          <div className="ui-field">
            <label htmlFor="sr-class" className="ui-field__label">Tax class (Steuerklasse)</label>
            <select
              id="sr-class"
              className="ui-input"
              value={state.taxClass}
              onChange={(e) => salaryRaiseStore.update((s) => ({ ...s,
                taxClass: (e.target as HTMLSelectElement).value as TaxClass }))}
            >
              {Object.values(TaxClass).map((tc) => <option key={tc} value={tc}>Class {tc}</option>)}
            </select>
          </div>
          <NumberField id="sr-kids" label="Children (PV relief)" value={state.childrenCount} min={0} max={10} step={1} onChange={(v) => salaryRaiseStore.update((s) => ({ ...s,
            childrenCount: v }))} />
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="sr-diff-heading">
        <h2 id="sr-diff-heading">Before vs. After Raise (Monthly)</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Line item</th>
                <th>Before</th>
                <th>After raise</th>
                <th>Monthly delta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Gross salary</th>
                <td>{formatIntegerEuroCents(eurToCents(before.monthlyGross))}</td>
                <td>{formatIntegerEuroCents(eurToCents(after.monthlyGross))}</td>
                <td>+{formatIntegerEuroCents(eurToCents(monthlyRaiseEur))}</td>
              </tr>
              <tr>
                <th scope="row">Wage tax (Lohnsteuer)</th>
                <td>{formatIntegerEuroCents(eurToCents(before.monthlyWageTax))}</td>
                <td>{formatIntegerEuroCents(eurToCents(after.monthlyWageTax))}</td>
                <td>+{formatIntegerEuroCents(eurToCents(after.monthlyWageTax - before.monthlyWageTax))}</td>
              </tr>
              <tr>
                <th scope="row">Solidarity surcharge (SolZ)</th>
                <td>{formatIntegerEuroCents(eurToCents(before.monthlySolidaritySurcharge))}</td>
                <td>{formatIntegerEuroCents(eurToCents(after.monthlySolidaritySurcharge))}</td>
                <td>+{formatIntegerEuroCents(eurToCents(after.monthlySolidaritySurcharge - before.monthlySolidaritySurcharge))}</td>
              </tr>
              <tr>
                <th scope="row">Total social security (KV, RV, AV, PV)</th>
                <td>{formatIntegerEuroCents(eurToCents(before.totalSocialSecurity))}</td>
                <td>{formatIntegerEuroCents(eurToCents(after.totalSocialSecurity))}</td>
                <td>+{formatIntegerEuroCents(eurToCents(after.totalSocialSecurity - before.totalSocialSecurity))}</td>
              </tr>
              <tr>
                <th scope="row">Monthly net take-home</th>
                <td><strong>{formatIntegerEuroCents(eurToCents(before.monthlyNetTakeHome))}</strong></td>
                <td><strong>{formatIntegerEuroCents(eurToCents(after.monthlyNetTakeHome))}</strong></td>
                <td><strong>+{formatIntegerEuroCents(eurToCents(monthlyNetGain))}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <CalculationExplanationPanel explanation={explanation} summary="Explain marginal payroll calculation and statutory assumptions" />
      </section>
    </main>
  </AppShell>;
}
