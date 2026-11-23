import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";


import {
  ageReliefStore,
} from "#/apps/age-relief/ageReliefStore.ts";
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
  DEFAULT_AGE_RELIEF_RULES,
  computeEmploymentAgeRelief,
} from "#engine/tax/ageRelief";
import {
  VERIFIED_TAX_YEARS,
  createTaxRules,
  toAgeYears,
} from "#engine/tax/taxRules";
import {
  computeGrossToNetBreakdown,
} from "#engine/tax/wageTax";
import {
  TaxClass,
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

export default function AgeReliefCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? ageReliefStore.state.value : ageReliefStore.defaultState;

  const rules = createTaxRules(toFullCalendarYear(state.taxYear));
  const minAge = rules.parameters.ageReliefMinimumAge.value;
  // Born before Jan 2 of (taxYear - 64) means age on Jan 1 is (taxYear - birthYear - 1) if born after Jan 1;
  // matching § 24a EStG convention: turning 64 in year Y qualifies starting calendar year Y + 1.
  const firstQualifyingYear = state.birthYear + minAge + 1;
  const ageOnJan1 = Math.max(0, state.taxYear - state.birthYear - 1);
  const qualifies = ageOnJan1 >= minAge;

  const annualGross = toGrossSalary(state.monthlyGrossEur * 12);
  const annualRelief = computeEmploymentAgeRelief(annualGross, toAgeYears(ageOnJan1), rules);
  const cohort = DEFAULT_AGE_RELIEF_RULES.cohorts.find((entry) => entry.firstYear >= firstQualifyingYear)
    ?? DEFAULT_AGE_RELIEF_RULES.cohorts[DEFAULT_AGE_RELIEF_RULES.cohorts.length - 1];

  const baselinePayroll = computeGrossToNetBreakdown(
    toGrossSalary(state.monthlyGrossEur),
    state.taxClass,
    0,
    undefined,
    undefined,
    rules,
    { ageAtYearStart: toAgeYears(40) },
  );
  const seniorPayroll = computeGrossToNetBreakdown(
    toGrossSalary(state.monthlyGrossEur),
    state.taxClass,
    0,
    undefined,
    undefined,
    rules,
    { ageAtYearStart: toAgeYears(ageOnJan1) },
  );

  const monthlyTaxSavings = Math.max(0, (baselinePayroll.monthlyWageTax + baselinePayroll.monthlySolidaritySurcharge)
    - (seniorPayroll.monthlyWageTax + seniorPayroll.monthlySolidaritySurcharge));

  const comparisonCohorts = [1954, 1958, 1962, 1966, 1972];

  const explanation: CalculationExplanation = {
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Supported,
    formulaName: "Altersentlastungsbetrag (§ 24a EStG) & BMF PAP Payroll Relief",
    formulaExpression: "relief = min(annualGross × cohortRate, cohortMax) for age >= 64 before calendar year start",
    formulaVersion: toFormulaVersion("de-estg-24a-v1"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate: toLifeDate(`${state.taxYear}-01-01`),
    inputs: [
      { label: "Birth year / age before Jan 1",
        value: `${state.birthYear} (age ${ageOnJan1} on Jan 1, ${state.taxYear})`,
        source: "User input" },
      { label: "Permanent cohort year",
        value: `${firstQualifyingYear}`,
        source: `Rate ${(cohort.rate * 100).toFixed(1)}% · Max ${formatIntegerEuroCents(eurToCents(cohort.maximum))}` },
      { label: "Annual gross wages",
        value: formatIntegerEuroCents(eurToCents(annualGross)),
        source: `${state.monthlyGrossEur} €/mo × 12` },
    ],
    parameters: [],
    lawIds: [LawId.EStG_24a, LawId.EStG_39b],
    topicIds: ["taxable-income"],
    assumptions: [
      "Cohort percentage and maximum are locked permanently to the calendar year following the 64th birthday (Wachstumschancengesetz phase-out schedule).",
      "Applies to active employment wages modeled here; pension income and capital gains are outside this payroll estimator.",
    ],
  };

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Senior Wage Tax Relief · Demo"
        title="Age Relief (Altersentlastungsbetrag) Estimator"
        subtitle="Look up your permanent § 24a EStG birth-cohort allowance (age 64+ before calendar year start) and estimate its monthly and annual payroll tax savings."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={ageReliefStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Age relief highlights">
        <MetricCard
          label="Annual Altersentlastungsbetrag"
          value={formatIntegerEuroCents(eurToCents(annualRelief))}
          tone={qualifies ? MetricTone.Gain : MetricTone.Neutral}
          subtitle={qualifies ? `Cohort ${firstQualifyingYear}: ${(cohort.rate * 100).toFixed(1)}% up to ${formatIntegerEuroCents(eurToCents(cohort.maximum))}` : `First qualifies in ${firstQualifyingYear} (age 64 before Jan 1)`}
        />
        <MetricCard
          label="Est. Monthly Wage-Tax Saving"
          value={`+${formatIntegerEuroCents(eurToCents(monthlyTaxSavings))}/mo`}
          tone={MetricTone.Primary}
          subtitle={`+${formatIntegerEuroCents(eurToCents(monthlyTaxSavings * 12))}/year in Class ${state.taxClass}`}
        />
        <MetricCard
          label="Monthly Net Pay"
          value={formatIntegerEuroCents(eurToCents(seniorPayroll.monthlyNetTakeHome))}
          subtitle={`Baseline without age relief: ${formatIntegerEuroCents(eurToCents(baselinePayroll.monthlyNetTakeHome))}`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="ar-inputs-heading">
        <h2 id="ar-inputs-heading">Birth Cohort &amp; Employment Wages</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="ar-year" className="ui-field__label">Verified tax year</label>
            <select
              id="ar-year"
              className="ui-input"
              value={String(state.taxYear)}
              onChange={(e) => ageReliefStore.update((s) => ({ ...s,
                taxYear: Number((e.target as HTMLSelectElement).value) }))}
            >
              {VERIFIED_TAX_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <NumberField id="ar-birth" label="Birth year" value={state.birthYear} min={1935} max={1995} step={1} onChange={(v) => ageReliefStore.update((s) => ({ ...s,
            birthYear: v }))} />
          <NumberField id="ar-gross" label="Monthly gross wage" value={state.monthlyGrossEur} min={0} max={50000} step={100} unit="€" onChange={(v) => ageReliefStore.update((s) => ({ ...s,
            monthlyGrossEur: v }))} />
          <div className="ui-field">
            <label htmlFor="ar-class" className="ui-field__label">Tax class</label>
            <select
              id="ar-class"
              className="ui-input"
              value={state.taxClass}
              onChange={(e) => ageReliefStore.update((s) => ({ ...s,
                taxClass: (e.target as HTMLSelectElement).value as TaxClass }))}
            >
              {Object.values(TaxClass).map((tc) => <option key={tc} value={tc}>Class {tc}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="ar-table-heading">
        <h2 id="ar-table-heading">Permanent Cohort Reference (§ 24a EStG Phase-Out)</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Birth year</th>
                <th>First qualifying year</th>
                <th>Permanent rate</th>
                <th>Annual cap</th>
              </tr>
            </thead>
            <tbody>
              {comparisonCohorts.map((by) => {
                const fq = by + minAge + 1;
                const entry = DEFAULT_AGE_RELIEF_RULES.cohorts.find((c) => c.firstYear >= fq)
                  ?? DEFAULT_AGE_RELIEF_RULES.cohorts[DEFAULT_AGE_RELIEF_RULES.cohorts.length - 1];
                return <tr key={by}>
                  <th scope="row">{by}</th>
                  <td>{fq}</td>
                  <td>{(entry.rate * 100).toFixed(1)}%</td>
                  <td>{formatIntegerEuroCents(eurToCents(entry.maximum))}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <CalculationExplanationPanel explanation={explanation} summary="Explain § 24a EStG permanent cohort rule and assumptions" />
      </section>
    </main>
  </>;
}
