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
  mutterschutzStore,
} from "#/apps/mutterschutz/mutterschutzStore.ts";
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
  computeMonthlyMutterschutz,
} from "#engine/benefits/mutterschutz";
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
  JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  toEuroCents,
  toNetSalary,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

function addDaysIso(isoDate: string, deltaDays: number): string {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : "2026-10-15";
  const ms = Date.parse(`${safe}T00:00:00Z`) + (deltaDays * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}

function eurToCents(eur: number) {
  return toEuroCents(Math.round(eur * 100));
}

export default function MutterschutzCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? mutterschutzStore.state.value : mutterschutzStore.defaultState;

  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(state.expectedDueDate) ? state.expectedDueDate : "2026-10-15";
  const preDays = 42;
  const postDays = state.extendedPostBirth ? 84 : 56;
  const startDate = addDaysIso(dueDate, -preDays);
  const endDate = addDaysIso(dueDate, postDays);
  const totalDays = preDays + 1 + postDays;

  const monthly = computeMonthlyMutterschutz(toNetSalary(state.preBirthMonthlyNetEur));
  const dailyNet = state.preBirthMonthlyNetEur / 30;
  const dailyGkv = Math.min(13, dailyNet);
  const dailyEmployer = Math.max(0, dailyNet - dailyGkv);
  const totalWindowGkvCents = eurToCents(dailyGkv * totalDays);
  const totalWindowEmployerCents = eurToCents(dailyEmployer * totalDays);
  const totalWindowBenefitCents = eurToCents(dailyNet * totalDays);

  const explanation: CalculationExplanation = {
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Supported,
    formulaName: "Mutterschutz Window & Net Wage Replacement (§§ 3, 19, 20 MuSchG)",
    formulaExpression: "GKV = min(€13/day, dailyNet); Employer top-up = max(0, dailyNet − GKV); Protection = dueDate − 6w .. dueDate + 8w/12w",
    formulaVersion: toFormulaVersion("de-muschg-19-20-v1"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate: toLifeDate(dueDate),
    inputs: [
      { label: "Expected delivery date",
        value: dueDate,
        source: "User input" },
      { label: "Regular pre-birth monthly net",
        value: formatIntegerEuroCents(eurToCents(state.preBirthMonthlyNetEur)),
        source: "User input (3-month average)" },
      { label: "Post-birth period",
        value: state.extendedPostBirth ? "12 weeks (84 days · premature/multiple/disability)" : "8 weeks (56 days · standard)",
        source: "§ 3 Abs. 2 MuSchG" },
    ],
    parameters: [],
    lawIds: [LawId.MuSchG_3, LawId.MuSchG_19, LawId.MuSchG_20],
    topicIds: ["maternity-protection"],
    assumptions: [
      "Assumes statutory public health insurance (GKV) membership for the €13/day Mutterschaftsgeld share.",
      "Privately insured employees receive a one-time federal payment up to €210 (BAS) while the employer top-up is still calculated as if €13/day were paid.",
      "Mutterschaftsgeld and Arbeitgeberzuschuss are tax-free but subject to Progressionsvorbehalt (§ 32b EStG).",
    ],
  };

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Maternity Protection · Demo"
        title="Mutterschutz &amp; Mutterschaftsgeld Calculator"
        subtitle="Compute your exact 6-week pre-birth and 8/12-week post-birth maternity protection dates and the GKV vs. employer supplement split under §§ 3, 19, 20 MuSchG."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={mutterschutzStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Mutterschutz highlights">
        <MetricCard
          label="Protection Window"
          value={`${startDate} – ${endDate}`}
          tone={MetricTone.Primary}
          subtitle={`${totalDays} calendar days (${Math.round(totalDays / 7)} weeks)`}
        />
        <MetricCard
          label="Monthly GKV Share"
          value={formatIntegerEuroCents(eurToCents(monthly.healthInsuranceShare))}
          subtitle={`€${dailyGkv.toFixed(2)} / day (§ 19 MuSchG)`}
        />
        <MetricCard
          label="Monthly Employer Top-Up"
          value={formatIntegerEuroCents(eurToCents(monthly.employerSupplement))}
          tone={MetricTone.Gain}
          subtitle={`100% net preserved: ${formatIntegerEuroCents(eurToCents(monthly.totalMaternityBenefit))}/mo`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="ms-inputs-heading">
        <h2 id="ms-inputs-heading">Delivery Date &amp; Pre-Birth Net Pay</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="ms-due" className="ui-field__label">Expected delivery date (ET)</label>
            <input
              id="ms-due"
              type="date"
              className="ui-input"
              value={state.expectedDueDate}
              onChange={(e) => mutterschutzStore.update((s) => ({ ...s,
                expectedDueDate: (e.target as HTMLInputElement).value }))}
            />
          </div>
          <NumberField
            id="ms-net"
            label="Average monthly net (last 3 months)"
            value={state.preBirthMonthlyNetEur}
            min={0}
            max={30000}
            step={50}
            unit="€"
            onChange={(v) => mutterschutzStore.update((s) => ({ ...s,
              preBirthMonthlyNetEur: v }))}
          />
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.extendedPostBirth}
              onChange={(e) => mutterschutzStore.update((s) => ({ ...s,
                extendedPostBirth: (e.target as HTMLInputElement).checked }))}
            />
            <span>Extended 12-week post-birth protection (premature, multiples, or disability)</span>
          </label>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="ms-breakdown-heading">
        <h2 id="ms-breakdown-heading">Protection Timeline &amp; Payout Split</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Daily rate</th>
                <th>30-day monthly equiv.</th>
                <th>Full window ({totalDays} days)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Health insurance (Mutterschaftsgeld, § 19)</th>
                <td>€{dailyGkv.toFixed(2)}</td>
                <td>{formatIntegerEuroCents(eurToCents(monthly.healthInsuranceShare))}</td>
                <td>{formatIntegerEuroCents(totalWindowGkvCents)}</td>
              </tr>
              <tr>
                <th scope="row">Employer top-up (Arbeitgeberzuschuss, § 20)</th>
                <td>€{dailyEmployer.toFixed(2)}</td>
                <td>{formatIntegerEuroCents(eurToCents(monthly.employerSupplement))}</td>
                <td>{formatIntegerEuroCents(totalWindowEmployerCents)}</td>
              </tr>
              <tr>
                <th scope="row">Total tax-free maternity pay (100% net)</th>
                <td><strong>€{dailyNet.toFixed(2)}</strong></td>
                <td><strong>{formatIntegerEuroCents(eurToCents(monthly.totalMaternityBenefit))}</strong></td>
                <td><strong>{formatIntegerEuroCents(totalWindowBenefitCents)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <a className="ui-btn ui-btn--sm" href={calculatorPath(AppId.ElterngeldQuick)}>Estimate Elterngeld next</a>
          {" "}
          <a className="ui-btn ui-btn--sm" href={calculatorPath(AppId.ProgressionTax)}>Check Progressionsvorbehalt tax impact</a>
        </div>
        <CalculationExplanationPanel explanation={explanation} summary="Explain §§ 3, 19, 20 MuSchG calculation and assumptions" />
      </section>
    </main>
  </>;
}
