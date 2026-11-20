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
  progressionTaxStore,
} from "#/apps/progression-tax/progressionTaxStore.ts";
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
  computeAnnualTaxSettlement,
} from "#engine/tax/annualTaxSettlement";
import {
  computeJointProgressionTax,
} from "#engine/tax/progressionTax";
import {
  VERIFIED_TAX_YEARS,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  toEuroAmount,
  toEuroCents,
  toFullCalendarYear,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

function eurToCents(eur: number) {
  return toEuroCents(Math.round(eur * 100));
}

export default function ProgressionTaxCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? progressionTaxStore.state.value : progressionTaxStore.defaultState;

  const year = toFullCalendarYear(state.taxYear);
  const rules = createTaxRules(year);
  const taxable = toEuroAmount(state.jointTaxableIncomeEur);
  const benefits = toEuroAmount(state.progressionBenefitsEur);

  const withoutProg = computeJointProgressionTax(taxable, toEuroAmount(0), rules);
  const withProg = computeJointProgressionTax(taxable, benefits, rules);
  const progressionDeltaEur = Math.max(0, withProg.incomeTax - withoutProg.incomeTax);

  const settlement = computeAnnualTaxSettlement({
    calendarYear: year,
    taxableIncome: taxable,
    progressionIncome: benefits,
    withheldIncomeTax: toEuroAmount(state.withheldIncomeTaxEur),
    withheldSolidarity: toEuroAmount(state.withheldSolzEur),
    children: [],
    taxRules: rules,
  });

  const benefitSteps = [0, 6000, 12000, 18000, 24000];
  const stepRows = benefitSteps.map((stepEur) => {
    const res = computeJointProgressionTax(taxable, toEuroAmount(stepEur), rules);
    return {
      stepEur,
      incomeTax: res.incomeTax,
      extraTax: Math.max(0, res.incomeTax - withoutProg.incomeTax),
      specialRate: res.specialRate,
    };
  });

  const explanation: CalculationExplanation = {
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Supported,
    formulaName: "Progressionsvorbehalt Joint Splitting Tax (§ 32b & § 32a Abs. 5 EStG)",
    formulaExpression: "specialRate = Tax(ZvE + Benefits) / (ZvE + Benefits); finalTax = floor(ZvE × specialRate)",
    formulaVersion: toFormulaVersion("de-estg-32b-v1"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate: toLifeDate(`${state.taxYear}-01-01`),
    inputs: [
      { label: "Joint annual taxable income (ZvE)",
        value: formatIntegerEuroCents(eurToCents(state.jointTaxableIncomeEur)),
        source: "User input" },
      { label: "Tax-free replacement benefits (§ 32b)",
        value: formatIntegerEuroCents(eurToCents(state.progressionBenefitsEur)),
        source: "Elterngeld / ALG I / Mutterschaftsgeld" },
      { label: "Credited payroll withholding",
        value: formatIntegerEuroCents(eurToCents(settlement.creditedIncomeTax + settlement.creditedSolidarity)),
        source: "User Lohnsteuer + SolZ" },
    ],
    parameters: [],
    lawIds: [LawId.EStG_32b, LawId.EStG_32a, LawId.EStG_26b, LawId.EStG_36],
    topicIds: ["joint-assessment", "taxable-income"],
    assumptions: [
      "Assumes married joint assessment (Zusammenveranlagung) under § 26b EStG.",
      "Wage-replacement benefits remain tax-free themselves, but raise the average tax rate applied to your regular taxable income.",
      "Receiving more than €410/year of progression benefits triggers mandatory annual income tax filing (§ 46 Abs. 2 Nr. 1 EStG).",
    ],
  };

  return <AppShell currentPath={calculatorPath(AppId.ProgressionTax)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Annual Tax Return · Demo"
        title="Progressionsvorbehalt (Nachzahlung) Estimator"
        subtitle="See how much extra income tax Elterngeld, ALG I, Mutterschaftsgeld or Kurzarbeitergeld adds under § 32b EStG and estimate your year-end settlement."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={progressionTaxStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Progressionsvorbehalt highlights">
        <MetricCard
          label="Extra Tax from Progressionsvorbehalt"
          value={`+${formatIntegerEuroCents(eurToCents(progressionDeltaEur))}`}
          tone={progressionDeltaEur > 0 ? MetricTone.Loss : MetricTone.Gain}
          subtitle={withProg.specialRate !== undefined ? `Special rate: ${(withProg.specialRate * 100).toFixed(2)}%` : "No progression benefit entered"}
        />
        <MetricCard
          label="Total Annual Tax Liability"
          value={formatIntegerEuroCents(eurToCents(settlement.totalLiability))}
          tone={MetricTone.Primary}
          subtitle={`Income tax ${formatIntegerEuroCents(eurToCents(settlement.incomeTaxLiability))} + SolZ ${formatIntegerEuroCents(eurToCents(settlement.solidarityLiability))}`}
        />
        <MetricCard
          label="Est. Year-End Settlement"
          value={`${settlement.settlement >= 0 ? "+" : ""}${formatIntegerEuroCents(eurToCents(settlement.settlement))}`}
          tone={settlement.settlement >= 0 ? MetricTone.Gain : MetricTone.Loss}
          subtitle={settlement.settlement >= 0 ? "Estimated refund (Erstattung)" : "Estimated back-payment (Nachzahlung)"}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pt-inputs-heading">
        <h2 id="pt-inputs-heading">Annual Income, Benefits &amp; Withholding</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="pt-year" className="ui-field__label">Verified tax year</label>
            <select
              id="pt-year"
              className="ui-input"
              value={String(state.taxYear)}
              onChange={(e) => progressionTaxStore.update((s) => ({ ...s,
                taxYear: Number((e.target as HTMLSelectElement).value) }))}
            >
              {VERIFIED_TAX_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <NumberField id="pt-zve" label="Joint annual taxable income (ZvE)" value={state.jointTaxableIncomeEur} min={0} max={1000000} step={1000} unit="€" onChange={(v) => progressionTaxStore.update((s) => ({ ...s,
            jointTaxableIncomeEur: v }))} />
          <NumberField id="pt-prog" label="Annual progression benefits (Elterngeld / ALG I)" value={state.progressionBenefitsEur} min={0} max={200000} step={500} unit="€" onChange={(v) => progressionTaxStore.update((s) => ({ ...s,
            progressionBenefitsEur: v }))} />
          <NumberField id="pt-withheld" label="Payroll Lohnsteuer already withheld (annual)" value={state.withheldIncomeTaxEur} min={0} max={500000} step={250} unit="€" onChange={(v) => progressionTaxStore.update((s) => ({ ...s,
            withheldIncomeTaxEur: v }))} />
          <NumberField id="pt-solz" label="Solidarity surcharge already withheld (annual)" value={state.withheldSolzEur} min={0} max={50000} step={50} unit="€" onChange={(v) => progressionTaxStore.update((s) => ({ ...s,
            withheldSolzEur: v }))} />
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="pt-table-heading">
        <h2 id="pt-table-heading">Impact by Annual Benefit Level (at {formatIntegerEuroCents(eurToCents(state.jointTaxableIncomeEur))} ZvE)</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Annual § 32b benefits</th>
                <th>Special tax rate</th>
                <th>Total income tax</th>
                <th>Extra tax vs. €0 benefits</th>
              </tr>
            </thead>
            <tbody>
              {stepRows.map((row) => <tr key={row.stepEur}>
                <th scope="row">{formatIntegerEuroCents(eurToCents(row.stepEur))}</th>
                <td>{row.specialRate !== undefined ? `${(row.specialRate * 100).toFixed(2)}%` : "Baseline tariff"}</td>
                <td>{formatIntegerEuroCents(eurToCents(row.incomeTax))}</td>
                <td>+{formatIntegerEuroCents(eurToCents(row.extraTax))}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <CalculationExplanationPanel explanation={explanation} summary="Explain § 32b EStG Progressionsvorbehalt formula and assumptions" />
      </section>
    </main>
  </AppShell>;
}
