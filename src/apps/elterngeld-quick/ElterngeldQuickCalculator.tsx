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
  elterngeldQuickStore,
} from "#/apps/elterngeld-quick/elterngeldQuickStore.ts";
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
  computeElterngeldBenefits,
} from "#engine/benefits/elterngeldPlus";
import {
  IncomeEligibilityStatus,
  assessCoupleBenefitIncome,
} from "#engine/benefits/incomeEligibility";
import {
  computeSiblingBonusForAges,
  toSiblingAgeMonths,
} from "#engine/benefits/siblingBonus";
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
  toCalendarMonth,
  toEuroAmount,
  toEuroCents,
  toFullCalendarYear,
  toNetSalary,
  toWorkingHours,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

function eurToCents(eur: number) {
  return toEuroCents(Math.round(eur * 100));
}

export default function ElterngeldQuickCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? elterngeldQuickStore.state.value : elterngeldQuickStore.defaultState;

  const eligibility = assessCoupleBenefitIncome(
    toFullCalendarYear(state.birthYear),
    toCalendarMonth(state.birthMonth),
    toEuroAmount(state.couplePriorYearZveEur),
  );

  const entitlement = computeElterngeldBenefits(
    toNetSalary(state.preBirthMonthlyNetEur),
    toNetSalary(state.partTimeMonthlyNetEur),
    toWorkingHours(state.partTimeWeeklyHours),
  );

  const siblingAges = state.hasOlderSiblingUnder3
    ? [toSiblingAgeMonths(24)]
    : state.hasTwoOlderSiblingsUnder6
      ? [toSiblingAgeMonths(42), toSiblingAgeMonths(60)]
      : [];

  const plusWithSibling = computeSiblingBonusForAges(entitlement.elterngeldPlus, siblingAges);
  const basisBonus = plusWithSibling.isEligible
    ? Math.max(75, Math.round(entitlement.basiselterngeld * 0.1 * 100) / 100)
    : 0;
  const eligible = eligibility.status === IncomeEligibilityStatus.Eligible;
  const effectiveBasis = eligible ? entitlement.basiselterngeld + basisBonus : 0;
  const effectivePlus = eligible ? plusWithSibling.totalElterngeldPlusWithBonus : 0;

  const explanation: CalculationExplanation = {
    kind: ExplanationFormulaKind.Statutory,
    status: ExplanationStatus.Supported,
    formulaName: "Elterngeld Quick Entitlement & Income-Cap Check (§§ 1, 2, 2a, 4a BEEG)",
    formulaExpression: "Basis = clamp(loss × rate, €300..€1,800); Plus = min(Basis, 50% × noIncomeBasis); Sibling = +10% (min €75 Basis / €37.50 Plus)",
    formulaVersion: toFormulaVersion("de-beeg-quick-v1"),
    jurisdiction: JurisdictionCode.GermanyFederal,
    effectiveDate: toLifeDate(`${state.birthYear}-${String(state.birthMonth).padStart(2, "0")}-01`),
    inputs: [
      { label: "Birth year / month",
        value: `${state.birthYear}-${String(state.birthMonth).padStart(2, "0")}`,
        source: "User input" },
      { label: `Prior-year couple ZvE (${eligibility.relevantIncomeYear})`,
        value: formatIntegerEuroCents(eurToCents(state.couplePriorYearZveEur)),
        source: `Cap: ${formatIntegerEuroCents(eurToCents(eligibility.maximum))}` },
      { label: "Pre-birth Elterngeld-Netto",
        value: formatIntegerEuroCents(eurToCents(state.preBirthMonthlyNetEur)),
        source: `Assessable max €2,770 · Rate ${(entitlement.replacementRate * 100).toFixed(1)}%` },
    ],
    parameters: [],
    lawIds: [LawId.BEEG_1, LawId.BEEG_2, LawId.BEEG_2a, LawId.BEEG_4a],
    topicIds: ["parental-allowance", "sibling-bonus"],
    assumptions: [
      "Pre-birth net input represents synthetic Elterngeld-Netto (§§ 2c–2f BEEG), which may differ slightly from regular payslip net.",
      "Elterngeld payments are tax-free but subject to Progressionsvorbehalt (§ 32b EStG).",
      "For month-by-month partner splits, Mutterschutz offsets and 36-month cashflows, use the full Parental Leave Planner.",
    ],
  };

  return <AppShell currentPath={calculatorPath(AppId.ElterngeldQuick)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Parental Allowance · Demo"
        title="Elterngeld Quick Estimator &amp; Income-Cap Check"
        subtitle="Verify the €175k / €200k BEEG couple income cap and estimate monthly Basiselterngeld, ElterngeldPlus and Geschwisterbonus in seconds."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={elterngeldQuickStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Elterngeld quick highlights">
        <MetricCard
          label="Income-Cap Eligibility (§ 1 Abs. 8)"
          value={eligible ? "Eligible" : "Over income cap"}
          tone={eligible ? MetricTone.Gain : MetricTone.Loss}
          subtitle={`Cap for ${state.birthYear}-${String(state.birthMonth).padStart(2, "0")}: ${formatIntegerEuroCents(eurToCents(eligibility.maximum))} (${eligibility.relevantIncomeYear} ZvE)`}
        />
        <MetricCard
          label="Basiselterngeld / month"
          value={formatIntegerEuroCents(eurToCents(effectiveBasis))}
          tone={MetricTone.Primary}
          subtitle={`Replacement rate ${(entitlement.replacementRate * 100).toFixed(1)}%${basisBonus > 0 && eligible ? ` (incl. +${formatIntegerEuroCents(eurToCents(basisBonus))} sibling bonus)` : ""}`}
        />
        <MetricCard
          label="ElterngeldPlus / month"
          value={formatIntegerEuroCents(eurToCents(effectivePlus))}
          subtitle={state.partTimeWeeklyHours > 32 ? "Ineligible (>32 h/week working limit)" : `Max 24+ months · Ceiling ${formatIntegerEuroCents(eurToCents(entitlement.elterngeldPlusCeiling))}`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="egq-inputs-heading">
        <h2 id="egq-inputs-heading">Birth Date, Income Cap &amp; Pre-Birth Net</h2>
        <div className="domain-calc-grid">
          <NumberField id="egq-year" label="Birth year" value={state.birthYear} min={2022} max={2030} step={1} onChange={(v) => elterngeldQuickStore.update((s) => ({ ...s,
            birthYear: v }))} />
          <NumberField id="egq-month" label="Birth month (1–12)" value={state.birthMonth} min={1} max={12} step={1} onChange={(v) => elterngeldQuickStore.update((s) => ({ ...s,
            birthMonth: v }))} />
          <NumberField id="egq-zve" label={`Couple prior-year taxable income (${eligibility.relevantIncomeYear} ZvE)`} value={state.couplePriorYearZveEur} min={0} max={500000} step={5000} unit="€" onChange={(v) => elterngeldQuickStore.update((s) => ({ ...s,
            couplePriorYearZveEur: v }))} />
          <NumberField id="egq-net" label="Pre-birth monthly net (Elterngeld-Netto)" value={state.preBirthMonthlyNetEur} min={0} max={20000} step={100} unit="€" onChange={(v) => elterngeldQuickStore.update((s) => ({ ...s,
            preBirthMonthlyNetEur: v }))} />
          <NumberField id="egq-pt-net" label="Part-time monthly net during leave" value={state.partTimeMonthlyNetEur} min={0} max={20000} step={100} unit="€" onChange={(v) => elterngeldQuickStore.update((s) => ({ ...s,
            partTimeMonthlyNetEur: v }))} />
          <NumberField id="egq-pt-hours" label="Weekly hours worked during leave (max 32)" value={state.partTimeWeeklyHours} min={0} max={48} step={1} unit="h" onChange={(v) => elterngeldQuickStore.update((s) => ({ ...s,
            partTimeWeeklyHours: v }))} />
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasOlderSiblingUnder3}
              onChange={(e) => elterngeldQuickStore.update((s) => ({ ...s,
                hasOlderSiblingUnder3: (e.target as HTMLInputElement).checked }))}
            />
            <span>1 older sibling under age 3 (Geschwisterbonus)</span>
          </label>
          <label className="ui-check">
            <input
              type="checkbox"
              checked={state.hasTwoOlderSiblingsUnder6}
              onChange={(e) => elterngeldQuickStore.update((s) => ({ ...s,
                hasTwoOlderSiblingsUnder6: (e.target as HTMLInputElement).checked }))}
            />
            <span>2+ older siblings under age 6 (Geschwisterbonus)</span>
          </label>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="egq-summary-heading">
        <h2 id="egq-summary-heading">Entitlement Summary &amp; Next Steps</h2>
        <div className="life-monthly__scroll">
          <table>
            <tbody>
              <tr>
                <th scope="row">Assessable pre-birth net (§ 2 BEEG cap €2,770)</th>
                <td>{formatIntegerEuroCents(eurToCents(entitlement.assessablePreBirthNet))}</td>
              </tr>
              <tr>
                <th scope="row">Net income loss during leave</th>
                <td>{formatIntegerEuroCents(eurToCents(entitlement.netIncomeLoss))}</td>
              </tr>
              <tr>
                <th scope="row">Base Basiselterngeld / ElterngeldPlus</th>
                <td>{formatIntegerEuroCents(eurToCents(entitlement.basiselterngeld))} / {formatIntegerEuroCents(eurToCents(entitlement.elterngeldPlus))}</td>
              </tr>
              <tr>
                <th scope="row">Sibling bonus (§ 2a BEEG)</th>
                <td>{plusWithSibling.isEligible ? `+${formatIntegerEuroCents(eurToCents(basisBonus))} Basis / +${formatIntegerEuroCents(eurToCents(plusWithSibling.siblingBonusAmount))} Plus` : "Not applicable"}</td>
              </tr>
              <tr>
                <th scope="row">12 months Basis vs. 24 months Plus (illustrative)</th>
                <td>{formatIntegerEuroCents(eurToCents(effectiveBasis * 12))} vs. {formatIntegerEuroCents(eurToCents(effectivePlus * 24))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <a className="ui-btn ui-btn--primary" href="/elterngeld/">Open Full 36-Month Parental Leave Planner</a>
          {" "}
          <a className="ui-btn ui-btn--sm" href={calculatorPath(AppId.Mutterschutz)}>Check Mutterschutz dates</a>
        </div>
        <CalculationExplanationPanel explanation={explanation} summary="Explain BEEG income cap, replacement rate and sibling bonus" />
      </section>
    </main>
  </AppShell>;
}
