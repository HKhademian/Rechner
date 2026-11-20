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
  kindergeldComparisonStore,
} from "#/apps/kindergeld-comparison/kindergeldComparisonStore.ts";
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
  computeKindergeld,
} from "#engine/benefits/kindergeld";
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
  type ChildYearPresence,
  computeKinderfreibetragGuenstigerpruefung,
} from "#engine/tax/jointAssessment";
import {
  VERIFIED_TAX_YEARS,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  computeSolidaritySurcharge,
} from "#engine/tax/wageTax";
import {
  toCalendarMonth,
  toChildIndex,
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

export default function KindergeldComparisonCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? kindergeldComparisonStore.state.value : kindergeldComparisonStore.defaultState;

  const year = toFullCalendarYear(state.taxYear);
  const rules = createTaxRules(year);
  const monthlyRate = toEuroAmount(rules.parameters.childBenefitMonthly.value);
  const kindergeldInfo = computeKindergeld(state.childrenCount, monthlyRate);

  const children: ChildYearPresence[] = Array.from({ length: state.childrenCount }, (_, idx) => {
    const isProratedNewborn = idx === state.childrenCount - 1 && state.newbornBirthMonth >= 1;
    return {
      childIndex: toChildIndex(idx + 1),
      birthCalendarYear: isProratedNewborn ? year : toFullCalendarYear(state.taxYear - 2),
      birthCalendarMonth: toCalendarMonth(isProratedNewborn ? state.newbornBirthMonth : 1),
    };
  });

  const result = computeKinderfreibetragGuenstigerpruefung(
    state.jointAnnualZveEur,
    children,
    state.taxYear,
    monthlyRate,
    toEuroAmount(0),
    rules,
  );

  const solzWithout = computeSolidaritySurcharge(result.jointTaxWithoutAllowance, true, rules);
  const solzWith = computeSolidaritySurcharge(result.jointTaxWithAllowance, true, rules);
  const solzSavings = Math.max(0, solzWithout - solzWith);

  const sensitivityIncomes = [50000, 75000, 95000, 120000, 160000, 220000];
  const sensitivityRows = sensitivityIncomes.map((zve) => {
    const evalRow = computeKinderfreibetragGuenstigerpruefung(zve, children, state.taxYear, monthlyRate, toEuroAmount(0), rules);
    return { zve,
      evalRow };
  });

  const explanation: CalculationExplanation = {
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Supported,
    formulaName: "Familienleistungsausgleich Günstigerprüfung (§§ 31, 32 Abs. 6, 66 EStG)",
    formulaExpression: "extraRefund = max(0, (Tax(ZvE) − Tax(ZvE − Kinderfreibetrag)) − KindergeldReceived)",
    formulaVersion: toFormulaVersion("de-estg-31-32-66-v1"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate: toLifeDate(`${state.taxYear}-01-01`),
    inputs: [
      { label: "Joint annual taxable income (ZvE)",
        value: formatIntegerEuroCents(eurToCents(state.jointAnnualZveEur)),
        source: "User input" },
      { label: "Qualifying children",
        value: `${state.childrenCount}`,
        source: "User input" },
      { label: `Annual Kinderfreibetrag + BEA (${state.taxYear})`,
        value: formatIntegerEuroCents(eurToCents(rules.parameters.childAllowanceAnnual.value)),
        source: "Verified EStG parameter" },
      { label: `Monthly Kindergeld (${state.taxYear})`,
        value: `${monthlyRate} € / child`,
        source: "§ 66 EStG" },
    ],
    parameters: [],
    lawIds: [LawId.EStG_31, LawId.EStG_32, LawId.EStG_66, LawId.SolzG_3],
    topicIds: ["child-benefit", "joint-assessment"],
    assumptions: [
      "Assumes married joint assessment (Zusammenveranlagung) under § 26b / § 32a Abs. 5 EStG.",
      "Solidarity surcharge relief from Kinderfreibetrag applies under § 3 Abs. 2 SolzG even when monthly Kindergeld is more favorable for income tax.",
      "Does not model church tax (Kirchensteuer) savings from Kinderfreibetrag.",
    ],
  };

  return <AppShell currentPath={calculatorPath(AppId.KindergeldComparison)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Family Tax Benefit · Demo"
        title="Kindergeld vs. Kinderfreibetrag (Günstigerprüfung)"
        subtitle="Compare statutory monthly Kindergeld against the annual Kinderfreibetrag tax deduction for joint assessment under §§ 31, 32, 66 EStG."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={kindergeldComparisonStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Günstigerprüfung highlights">
        <MetricCard
          label="Favorable Option"
          value={result.isKinderfreibetragFavorable ? "Kinderfreibetrag" : "Kindergeld"}
          tone={result.isKinderfreibetragFavorable ? MetricTone.Gain : MetricTone.Primary}
          subtitle={result.isKinderfreibetragFavorable
            ? `+${formatIntegerEuroCents(eurToCents(result.extraTaxRefund))}/yr extra tax refund`
            : "Monthly Kindergeld exceeds tax deduction value"}
        />
        <MetricCard
          label="Annual Kindergeld"
          value={formatIntegerEuroCents(eurToCents(result.totalKindergeldReceived))}
          subtitle={`${formatIntegerEuroCents(eurToCents(kindergeldInfo.totalMonthlyKindergeld))}/mo full-year rate`}
        />
        <MetricCard
          label="Income Tax Savings (Freibetrag)"
          value={formatIntegerEuroCents(eurToCents(result.taxSavingsFromAllowance))}
          subtitle={solzSavings > 0 ? `Plus ${formatIntegerEuroCents(eurToCents(solzSavings))} SolZ relief` : `Total allowance: ${formatIntegerEuroCents(eurToCents(result.totalKinderfreibetrag))}`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="kg-inputs-heading">
        <h2 id="kg-inputs-heading">Household Income &amp; Children</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="kg-year" className="ui-field__label">Verified tax year</label>
            <select
              id="kg-year"
              className="ui-input"
              value={String(state.taxYear)}
              onChange={(e) => kindergeldComparisonStore.update((s) => ({ ...s,
                taxYear: Number((e.target as HTMLSelectElement).value) }))}
            >
              {VERIFIED_TAX_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <NumberField
            id="kg-zve"
            label="Joint annual taxable income (ZvE)"
            value={state.jointAnnualZveEur}
            min={0}
            max={1000000}
            step={2500}
            unit="€"
            onChange={(v) => kindergeldComparisonStore.update((s) => ({ ...s,
              jointAnnualZveEur: v }))}
          />
          <NumberField
            id="kg-children"
            label="Number of children"
            value={state.childrenCount}
            min={1}
            max={6}
            step={1}
            onChange={(v) => kindergeldComparisonStore.update((s) => ({ ...s,
              childrenCount: v }))}
          />
          <NumberField
            id="kg-newborn"
            label="Youngest born this year? Birth month (0 = full year)"
            value={state.newbornBirthMonth}
            min={0}
            max={12}
            step={1}
            onChange={(v) => kindergeldComparisonStore.update((s) => ({ ...s,
              newbornBirthMonth: v }))}
          />
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="kg-sensitivity-heading">
        <h2 id="kg-sensitivity-heading">Income Break-Even Sensitivity ({state.taxYear})</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Joint annual ZvE</th>
                <th>Annual Kindergeld</th>
                <th>Kinderfreibetrag tax saving</th>
                <th>Winner</th>
                <th>Extra annual refund</th>
              </tr>
            </thead>
            <tbody>
              {sensitivityRows.map(({ zve, evalRow }) => <tr key={zve}>
                <th scope="row">{formatIntegerEuroCents(eurToCents(zve))}</th>
                <td>{formatIntegerEuroCents(eurToCents(evalRow.totalKindergeldReceived))}</td>
                <td>{formatIntegerEuroCents(eurToCents(evalRow.taxSavingsFromAllowance))}</td>
                <td>{evalRow.isKinderfreibetragFavorable ? "Kinderfreibetrag" : "Kindergeld"}</td>
                <td>{formatIntegerEuroCents(eurToCents(evalRow.extraTaxRefund))}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <CalculationExplanationPanel explanation={explanation} summary="Explain §§ 31, 32, 66 EStG Günstigerprüfung" />
      </section>
    </main>
  </AppShell>;
}
