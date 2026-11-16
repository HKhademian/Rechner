import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  DEFAULT_KITA_EVALUATION,
  DEFAULT_KITA_STATE,
  kitaEvaluation,
  kitaState,
  resetKitaCalculator,
  syncKitaFromLifeProfile,
  updateKitaField,
} from "#/apps/kita/kitaStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import {
  EligibilityConfirmedIcon,
  InformationalNoticeIcon,
} from "#components/Icons";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  ChoiceSelect,
} from "#components/ui/ChoiceSelect";
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
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  getAllMunicipalDaycarePresets,
} from "#engine/benefits/childcare";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  FederalStateKitaPresetId,
  toEuroAmount,
  toFederalStateKitaPresetId,
  toGrossSalary,
} from "#engine/types";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";

function formatEur(value: number): string {
  return formatSharedEur(value);
}

const FEE_SCHEDULE_OPTIONS = [
  ...getAllMunicipalDaycarePresets().map((preset) => ({
    value: preset.id,
    label: preset.label,
  })),
  {
    value: FederalStateKitaPresetId.Custom,
    label: "Custom monthly fee per child",
  },
] as const;

const CHILD_AGE_FIELDS = [
  { key: "child1AgeMonths",
    label: "Child 1 Age" },
  { key: "child2AgeMonths",
    label: "Child 2 Age" },
  { key: "child3AgeMonths",
    label: "Child 3 Age" },
  { key: "child4AgeMonths",
    label: "Child 4 Age" },
] as const;

export default function KitaCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const s = hydrated ? kitaState.value : DEFAULT_KITA_STATE;
  const evalResult = hydrated ? kitaEvaluation.value : DEFAULT_KITA_EVALUATION;
  const visibleChildAgeFields = CHILD_AGE_FIELDS.slice(0, s.childrenCount);
  const effectivePercentLabel = `${Math.round(evalResult.deductibleFraction * 100)}%`;

  return (
    <AppShell
      currentPath={calculatorPath(AppId.Kita)}
      footerNote="Demo tool: municipal fee tables are illustrative reference models; meals (Verpflegungsgeld) are always excluded under § 10 Abs. 1 Nr. 5 EStG."
    >
      <PageHeader
        eyebrow="Childcare & Tax"
        title="Kita Fee & Tax Offset"
        subtitle="Estimate municipal or custom Kita care costs, sibling discounts, and your net monthly household impact after § 10 EStG tax relief."
        actions={(
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncKitaFromLifeProfile}
            onResetDefaults={resetKitaCalculator}
            syncTooltip="Load planning year, federal state fee table, children, gross income, and taxable income from your Life Profile"
            inactiveInLifeProfileMessage={
              unifiedLifeProfile.value.dependentChildrenCount < 1
                ? "Life Profile currently has 0 dependent children"
                : undefined
            }
          />
        )}
      />

      <div className="domain-calc-layout">
        <section className="ui-card" aria-labelledby="kita-inputs-heading">
          <div className="ui-card__header">
            <div>
              <h2 id="kita-inputs-heading" className="ui-card__title">Care Setup &amp; Household Tax</h2>
              <p className="ui-card__subtitle">Municipal schedule, children in care, meal fees, and household tax base.</p>
            </div>
          </div>
          <div className="domain-calc-fields">
            <ChoiceSelect
              id="kita-preset"
              topicId="childcare"
              label="Daycare Fee Schedule"
              value={s.presetId}
              options={FEE_SCHEDULE_OPTIONS}
              onChange={(value) => updateKitaField("presetId", toFederalStateKitaPresetId(value))}
            />

            {s.presetId === FederalStateKitaPresetId.Custom && (
              <NumberField
                id="kita-custom-fee"
                topicId="childcare"
                label="Monthly Care Fee per Child"
                unit="€"
                min={0}
                max={3000}
                step={10}
                value={s.customMonthlyCareFeePerChildEur}
                onChange={(num) => updateKitaField("customMonthlyCareFeePerChildEur", toEuroAmount(num))}
              />
            )}

            <div className="domain-calc-field-row">
              <NumberField
                id="kita-meal-fee"
                topicId="childcare"
                label="Meals / Verpflegungsgeld"
                unit="€/mo"
                min={0}
                max={500}
                step={5}
                value={s.monthlyMealFeePerChildEur}
                onChange={(num) => updateKitaField("monthlyMealFeePerChildEur", toEuroAmount(num))}
              />

              <NumberField
                id="kita-months-per-year"
                label="Care Months / Year"
                unit="mo"
                min={1}
                max={12}
                step={1}
                value={s.careMonthsPerYear}
                onChange={(num) => updateKitaField("careMonthsPerYear", Math.round(num))}
              />
            </div>

            <div className="domain-calc-field-row">
              <NumberField
                id="kita-children-count"
                label="Children in Care"
                min={1}
                max={4}
                step={1}
                value={s.childrenCount}
                onChange={(num) => updateKitaField("childrenCount", Math.round(num))}
              />

              <NumberField
                id="kita-household-gross"
                label="Household Annual Gross"
                unit="€"
                min={0}
                max={1000000}
                step={2500}
                value={s.householdAnnualGrossEur}
                onChange={(num) => updateKitaField("householdAnnualGrossEur", toGrossSalary(num))}
              />
            </div>

            <div className="domain-calc-field-row">
              {visibleChildAgeFields.map((field) => (
                <NumberField
                  key={field.key}
                  id={`kita-${field.key}`}
                  label={field.label}
                  unit="mo"
                  min={0}
                  max={167}
                  step={1}
                  value={s[field.key]}
                  onChange={(num) => updateKitaField(field.key, Math.round(num))}
                />
              ))}
            </div>

            <h3 className="domain-calc-group-title">Annual Income Tax Assessment (§ 32a EStG)</h3>

            <NumberField
              id="kita-zve"
              topicId="taxable-income"
              label="Household Taxable Income (zvE)"
              unit="€"
              min={0}
              max={1000000}
              step={2000}
              value={s.householdTaxableIncomeZvEEur}
              onChange={(num) => updateKitaField("householdTaxableIncomeZvEEur", toEuroAmount(num))}
            />

            <ToggleSwitch
              id="kita-joint-assessment"
              topicId="joint-assessment"
              label="Joint spousal splitting (§ 26b EStG)"
              hint="Doubles progressive brackets before tax refund delta"
              checked={s.isMarriedJointAssessment}
              onChange={(checked) => updateKitaField("isMarriedJointAssessment", checked)}
            />

            <ToggleSwitch
              id="kita-church-tax"
              label="Include church tax refund effect"
              hint="Adds 9% standard church tax delta (or 8% BY/BW)"
              checked={s.hasChurchTax}
              onChange={(checked) => updateKitaField("hasChurchTax", checked)}
            />

            {s.hasChurchTax && (
              <ToggleSwitch
                id="kita-by-bw"
                label="Bavaria / Baden-Württemberg (8% rate)"
                checked={s.isBavariaOrBadenWuerttemberg}
                onChange={(checked) => updateKitaField("isBavariaOrBadenWuerttemberg", checked)}
              />
            )}
          </div>
        </section>

        <div className="domain-calc-results">
          <div
            className={`domain-calc-banner domain-calc-banner--${evalResult.annualTaxSavingsEur > 0 ? "gain" : "warn"}`}
            role="status"
          >
            <div>
              <strong>
                {evalResult.annualTaxSavingsEur > 0
                  ? <EligibilityConfirmedIcon size={18} />
                  : <InformationalNoticeIcon size={18} />}
                <span>
                  {evalResult.annualTaxSavingsEur > 0
                    ? `§ 10 EStG offsets ${Math.round(evalResult.effectiveOffsetRate * 100)}% of total cash outflow (${formatEur(evalResult.annualTaxSavingsEur)}/yr refund)`
                    : `Gross Kita cost is ${formatEur(evalResult.monthlyGrossOutflowEur)}/mo with zero extra tax refund at current zvE`}
                </span>
              </strong>
              <p>
                {evalResult.calendarYear} deductibility: {effectivePercentLabel} of qualifying care fees up to{" "}
                {formatEur(evalResult.maxAnnualDeductionPerChildEur)}/child (age &lt; {evalResult.maxChildAgeYears}).
              </p>
            </div>
            <LawRefLink lawId={LawId.EStG_10_1_5} label="Read § 10 Abs. 1 Nr. 5" />
          </div>

          <div className="domain-calc-kpis">
            <MetricCard
              label="Monthly Cash Outflow"
              value={formatEur(evalResult.monthlyGrossOutflowEur)}
              subtitle={`${formatEur(evalResult.monthlyCareFeeTotalEur)} care + ${formatEur(evalResult.monthlyMealFeeTotalEur)} meals`}
              tone={MetricTone.Loss}
            />
            <MetricCard
              label="Est. Tax Refund / Month"
              value={`+${formatEur(evalResult.monthlyTaxSavingsEur)}`}
              subtitle={`${formatEur(evalResult.annualTaxSavingsEur)} / yr (${formatEur(evalResult.annualDeductibleSonderausgabenEur)} Sonderausgaben)`}
              tone={MetricTone.Gain}
            />
            <MetricCard
              label="Net Monthly Kita Cost"
              value={formatEur(evalResult.netMonthlyHouseholdCostEur)}
              subtitle={`${formatEur(evalResult.netAnnualHouseholdCostEur)} / yr net household cost`}
              tone={MetricTone.Primary}
            />
          </div>

          <section className="ui-card" aria-labelledby="kita-breakdown-heading">
            <div className="ui-card__header">
              <h2 id="kita-breakdown-heading" className="ui-card__title">Per-Child Care Fee &amp; Tax Deduction</h2>
            </div>
            <table className="domain-calc-table">
              <thead>
                <tr>
                  <th>Child</th>
                  <th className="num">Care Fee / mo</th>
                  <th className="num">Meals / mo</th>
                  <th className="num">§ 10 EStG Deduction / yr</th>
                </tr>
              </thead>
              <tbody>
                {evalResult.perChildBreakdown.map((row) => (
                  <tr key={row.childIndex}>
                    <td>
                      Child {row.childIndex} ({row.ageMonths}m
                      {row.isFeeFreeByAge ? ", age-exempt" : row.siblingCareRank > 1 ? `, sibling #${row.siblingCareRank}` : ""})
                    </td>
                    <td className="num">{formatEur(row.monthlyCareFeeEur)}</td>
                    <td className="num">{formatEur(row.monthlyMealFeeEur)}</td>
                    <td className="num">{formatEur(row.annualDeductibleEur)}</td>
                  </tr>
                ))}
                <tr className="is-total">
                  <th>Annual Totals ({evalResult.careMonthsPerYear} mo funded)</th>
                  <td className="num">{formatEur(evalResult.annualCareFeeTotalEur)}</td>
                  <td className="num">{formatEur(evalResult.annualMealFeeTotalEur)}</td>
                  <td className="num">{formatEur(evalResult.annualDeductibleSonderausgabenEur)}</td>
                </tr>
              </tbody>
            </table>

            <div className="domain-calc-law-bar">
              <span>Legal basis:</span>
              <LawRefLink lawId={LawId.EStG_10_1_5} label="EStG § 10 Abs. 1 Nr. 5" />
              <LawRefLink lawId={LawId.EStG_32a} label="EStG § 32a" />
              <LawRefLink lawId={LawId.EStG_26b} label="EStG § 26b" />
            </div>
          </section>

          <ParameterObserverSection projectionProfile={FormProjectionProfileId.KitaFocus} />
        </div>
      </div>
    </AppShell>
  );
}
