import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  DEFAULT_MINIJOB_MIDIJOB_EVALUATION,
  DEFAULT_MINIJOB_MIDIJOB_STATE,
  minijobMidijobEvaluation,
  minijobMidijobState,
  resetMinijobMidijobCalculator,
  syncMinijobMidijobFromLifeProfile,
  updateMinijobMidijobField,
} from "#/apps/minijob-midijob/minijobMidijobStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import {
  EligibilityConfirmedIcon,
  StatutoryLimitationWarningIcon,
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
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  EmploymentBand,
  MinijobTaxMode,
  toMinijobTaxMode,
} from "#engine/formulas/pure/minijobTransitionEvaluator";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  TaxClass,
  toGrossSalary,
  toTaxClass,
} from "#engine/types";
import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";

function formatEur(value: number): string {
  return formatSharedEur(value, 2);
}

const TAX_CLASS_OPTIONS = Object.values(TaxClass).map((tc) => ({
  value: tc,
  label: `Tax Class ${tc}`,
}));

const MINIJOB_TAX_OPTIONS = [
  { value: MinijobTaxMode.EmployerFlat2Percent,
    label: "2% Employer Flat Tax" },
  { value: MinijobTaxMode.EmployeeTaxClass,
    label: "Personal Tax Class" },
] as const;

const GROSS_PRESETS = [
  { value: 603,
    label: "€603" },
  { value: 900,
    label: "€900" },
  { value: 1400,
    label: "€1,400" },
  { value: 2000,
    label: "€2,000" },
  { value: 2500,
    label: "€2,500" },
] as const;

function bandLabel(band: EmploymentBand): string {
  switch (band) {
    case EmploymentBand.Minijob:
      return "Minijob";
    case EmploymentBand.Midijob:
      return "Midijob";
    case EmploymentBand.Regular:
      return "Regular";
    case EmploymentBand.Zero:
      return "None";
  }
}

export default function MinijobMidijobCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const s = hydrated ? minijobMidijobState.value : DEFAULT_MINIJOB_MIDIJOB_STATE;
  const evalResult = hydrated ? minijobMidijobEvaluation.value : DEFAULT_MINIJOB_MIDIJOB_EVALUATION;
  const band = evalResult.current.employmentBand;
  const isGainBanner = band === EmploymentBand.Minijob || band === EmploymentBand.Midijob;

  let bannerHeadline = "Enter a positive monthly gross salary";
  let bannerDetail = "Minijob and Midijob social security thresholds update with your selected calendar year.";
  if (band === EmploymentBand.Minijob) {
    bannerHeadline = `Minijob (§ 8 SGB IV): within ${formatEur(evalResult.marginalLimitMonthlyEur)}/mo marginal cap`;
    bannerDetail = `Estimated employer flat social + tax levy reference: ${formatEur(evalResult.estimatedEmployerMinijobLevyEur)}/mo. You can opt out of the 3.6% employee pension top-up.`;
  }
  else if (band === EmploymentBand.Midijob) {
    bannerHeadline = `Midijob Übergangsbereich (§ 20 SGB IV): saving ~${formatEur(evalResult.midijobContributionSavingsPerMonthEur)}/mo`;
    bannerDetail = `Employee contributions run on a reduced base (${formatEur(evalResult.current.employeeContributionBaseEur)}), while pension points accrue on full ${formatEur(s.monthlyGrossEur)} gross.`;
  }
  else if (band === EmploymentBand.Regular) {
    bannerHeadline = `Regular employment (> ${formatEur(evalResult.transitionCeilingMonthlyEur)}/mo)`;
    bannerDetail = "Standard employee social insurance and BMF payroll withholding rates apply in full.";
  }

  return (
    <AppShell
      currentPath={calculatorPath(AppId.MinijobMidijob)}
      footerNote="Demo tool: Minijob cap and Midijob Übergangsbereich factor follow your selected year's SGB IV rules."
    >
      <PageHeader
        eyebrow="Earnings Transition"
        title="Minijob &amp; Midijob Calculator"
        subtitle="Compare marginal employment (§ 8 SGB IV), Midijob sliding contributions (§ 20 SGB IV), and regular part-time take-home pay."
        actions={(
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncMinijobMidijobFromLifeProfile}
            onResetDefaults={resetMinijobMidijobCalculator}
            syncTooltip="Load planning year, partner reference monthly gross, federal state, and children from your Life Profile"
          />
        )}
      />

      <div className="domain-calc-layout">
        <section className="ui-card" aria-labelledby="minijob-inputs-heading">
          <div className="ui-card__header">
            <div>
              <h2 id="minijob-inputs-heading" className="ui-card__title">Monthly Earnings &amp; Tax Profile</h2>
              <p className="ui-card__subtitle">Gross salary, tax class, care discount children, and Minijob options.</p>
            </div>
          </div>
          <div className="domain-calc-fields">
            <NumberField
              id="minijob-gross"
              topicId="minijob"
              label="Monthly Gross Salary"
              unit="€/mo"
              min={0}
              max={10000}
              step={25}
              value={s.monthlyGrossEur}
              presets={GROSS_PRESETS}
              slider={{ min: 0,
                max: 3500,
                step: 25 }}
              onChange={(num) => updateMinijobMidijobField("monthlyGrossEur", toGrossSalary(num))}
            />

            <div className="domain-calc-field-row">
              <ChoiceSelect
                id="minijob-tax-class"
                topicId="tax-class"
                label="Tax Class (ELStAM)"
                value={s.taxClass}
                options={TAX_CLASS_OPTIONS}
                onChange={(value) => updateMinijobMidijobField("taxClass", toTaxClass(value))}
              />

              <NumberField
                id="minijob-children"
                topicId="care-insurance"
                label="Children (< 25 yrs)"
                min={0}
                max={10}
                step={1}
                value={s.childrenCount}
                onChange={(num) => updateMinijobMidijobField("childrenCount", Math.round(num))}
              />
            </div>

            <div className="ui-field">
              <div className="ui-field__top">
                <span className="ui-field__label">Minijob Income Tax Treatment</span>
              </div>
              <SegmentedControl
                label="Minijob income tax mode"
                topicId="minijob"
                value={s.minijobTaxMode}
                options={MINIJOB_TAX_OPTIONS}
                fullWidth
                onChange={(value) => updateMinijobMidijobField("minijobTaxMode", toMinijobTaxMode(String(value)))}
              />
            </div>

            <ToggleSwitch
              id="minijob-rv-optout"
              topicId="pension-exemption"
              label="Exempt from Minijob pension top-up (3.6%)"
              hint="Saves 3.6% cash now, forfeits compulsory RV qualifying months"
              checked={s.minijobPensionOptOut}
              onChange={(checked) => updateMinijobMidijobField("minijobPensionOptOut", checked)}
            />

            <ToggleSwitch
              id="minijob-saxony"
              topicId="care-insurance"
              label="Workplace in Saxony (PVS)"
              hint="Higher employee nursing-care share in Sachsen"
              checked={s.inSaxony}
              onChange={(checked) => updateMinijobMidijobField("inSaxony", checked)}
            />

            <ToggleSwitch
              id="minijob-church-tax"
              label="Church tax liable"
              checked={s.hasChurchTax}
              onChange={(checked) => updateMinijobMidijobField("hasChurchTax", checked)}
            />

            {s.hasChurchTax && (
              <ToggleSwitch
                id="minijob-by-bw"
                label="Bavaria / Baden-Württemberg (8% rate)"
                checked={s.isBavariaOrBadenWuerttemberg}
                onChange={(checked) => updateMinijobMidijobField("isBavariaOrBadenWuerttemberg", checked)}
              />
            )}
          </div>
        </section>

        <div className="domain-calc-results">
          <div
            className={`domain-calc-banner domain-calc-banner--${isGainBanner ? "gain" : "warn"}`}
            role="status"
          >
            <div>
              <strong>
                {isGainBanner ? <EligibilityConfirmedIcon size={18} /> : <StatutoryLimitationWarningIcon size={18} />}
                <span>{bannerHeadline}</span>
              </strong>
              <p>{bannerDetail}</p>
            </div>
            <LawRefLink lawId={LawId.SGB4_20} label="Read § 20 SGB IV" />
          </div>

          <div className="domain-calc-kpis">
            <MetricCard
              label="Monthly Net Take-Home"
              value={formatEur(evalResult.current.monthlyNetEur)}
              subtitle={`${Math.round(evalResult.current.netRatio * 100)}% of ${formatEur(s.monthlyGrossEur)} gross`}
              tone={MetricTone.Gain}
            />
            <MetricCard
              label="Employee Deductions"
              value={`-${formatEur(evalResult.totalEmployeeDeductionsEur)}`}
              subtitle={`Social ${formatEur(evalResult.current.employeeSocialSecurityEur)} + Tax ${formatEur(evalResult.current.employeeTaxEur)}`}
              tone={MetricTone.Loss}
            />
            <MetricCard
              label="Pension Entitlement Base"
              value={formatEur(evalResult.current.pensionEntitlementBaseEur)}
              subtitle={`Employee fee base: ${formatEur(evalResult.current.employeeContributionBaseEur)} (F = ${evalResult.transitionFactorF})`}
              tone={MetricTone.Primary}
            />
          </div>

          <section className="ui-card" aria-labelledby="minijob-breakdown-heading">
            <div className="ui-card__header">
              <h2 id="minijob-breakdown-heading" className="ui-card__title">Monthly Deduction Breakdown ({evalResult.calendarYear})</h2>
            </div>
            <table className="domain-calc-table">
              <thead>
                <tr>
                  <th>Statutory Deduction Item</th>
                  <th className="num">Amount / Month</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Health insurance (GKV)</td>
                  <td className="num">{formatEur(evalResult.healthInsuranceEur)}</td>
                </tr>
                <tr>
                  <td>Long-term care insurance (PV)</td>
                  <td className="num">{formatEur(evalResult.careInsuranceEur)}</td>
                </tr>
                <tr>
                  <td>Statutory pension (RV)</td>
                  <td className="num">{formatEur(evalResult.pensionInsuranceEur)}</td>
                </tr>
                <tr>
                  <td>Unemployment insurance (AV)</td>
                  <td className="num">{formatEur(evalResult.unemploymentInsuranceEur)}</td>
                </tr>
                <tr>
                  <td>Income / wage tax + SolZ + church tax</td>
                  <td className="num">
                    {formatEur(
                      evalResult.wageTaxEur +
                        evalResult.solidaritySurchargeEur +
                        evalResult.churchTaxEur,
                    )}
                  </td>
                </tr>
                <tr className="is-total">
                  <th>Net Monthly Take-Home ({bandLabel(band)})</th>
                  <td className="num">{formatEur(evalResult.current.monthlyNetEur)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="ui-card" aria-labelledby="minijob-corridor-heading">
            <div className="ui-card__header">
              <h2 id="minijob-corridor-heading" className="ui-card__title">Corridor Net Comparison ({evalResult.calendarYear} Rules)</h2>
            </div>
            <table className="domain-calc-table">
              <thead>
                <tr>
                  <th>Gross Milestone</th>
                  <th className="num">Net / mo</th>
                  <th className="num">Deductions / mo</th>
                  <th className="num">Net Ratio</th>
                </tr>
              </thead>
              <tbody>
                {evalResult.milestoneComparisons.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td className="num">{formatEur(item.monthlyNetEur)}</td>
                    <td className="num">
                      {formatEur(item.employeeSocialSecurityEur + item.employeeTaxEur)}
                    </td>
                    <td className="num">{Math.round(item.netRatio * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="domain-calc-law-bar">
              <span>Legal basis:</span>
              <LawRefLink lawId={LawId.SGB4_20} label="SGB IV § 20" />
              <LawRefLink lawId={LawId.SGB6_158} label="SGB VI § 158" />
              <LawRefLink lawId={LawId.SGB11_55} label="SGB XI § 55" />
              <LawRefLink lawId={LawId.EStG_38b} label="EStG § 38b" />
            </div>
          </section>

          <ParameterObserverSection projectionProfile={FormProjectionProfileId.MinijobMidijobFocus} />
        </div>
      </div>
    </AppShell>
  );
}
