import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  blueCardEvaluation,
  opportunityCardEvaluation,
  resetVisaCalculator,
  syncVisaFromLifeProfile,
  updateVisaField,
  visaState,
} from "#/apps/visa/visaStore.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import {
  EligibilityConfirmedIcon,
  StatutoryLimitationWarningIcon,
} from "#components/Icons";
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
import LawRefLink from "#components/laws/LawRefLink";
import Navigation from "#components/Navigation";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import SourceRevision from "#components/SourceRevision";
import {
  BlueCardEligibilityStatus,
  GermanLanguageLevel,
  VisaOccupationRoute,
  toGermanLanguageLevel,
} from "#engine/formulas/pure/visaFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";
import {
  toGrossSalary,
} from "#engine/types";

function formatEur(value: number): string {
  return formatSharedEur(value);
}

const OCCUPATION_ROUTE_OPTIONS = [
  { value: VisaOccupationRoute.Standard,
    label: "Standard" },
  { value: VisaOccupationRoute.ShortageOrGraduate,
    label: "Shortage / IT / Grad" },
] as const;

const GERMAN_LEVEL_OPTIONS = [
  { value: GermanLanguageLevel.NoneOrBasic,
    label: "Below A1 / Basic" },
  { value: GermanLanguageLevel.A1,
    label: "A1 Elementary" },
  { value: GermanLanguageLevel.A2,
    label: "A2 Pre-Intermediate" },
  { value: GermanLanguageLevel.B1Plus,
    label: "B1 or higher" },
] as const;

export default function VisaCalculator(): JSX.Element {
  const s = visaState.value;
  const blueCard = blueCardEvaluation.value.value;
  const chancenkarte = opportunityCardEvaluation.value.value;

  const statusTone =
    blueCard.status === BlueCardEligibilityStatus.EligibleStandard
      ? "gain"
      : blueCard.status === BlueCardEligibilityStatus.EligibleShortageOrGraduate
        ? "gain"
        : "warn";

  const statusHeadline =
    blueCard.status === BlueCardEligibilityStatus.EligibleStandard
      ? "Eligible for Standard EU Blue Card (§ 18g Abs. 1 AufenthG)"
      : blueCard.status === BlueCardEligibilityStatus.EligibleShortageOrGraduate
        ? "Eligible for Reduced-Threshold EU Blue Card (§ 18g Abs. 1 S. 2)"
        : `Shortfall of ${formatEur(Math.abs(blueCard.salarySurplusOrShortfall))} vs Blue Card threshold`;

  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.Visa)} />
      <main id="main-content" className="ui-page" tabIndex={-1}>
        <PageHeader
          eyebrow="Visa & Residence"
          title="EU Blue Card & Visa Planner"
          subtitle="Check Blue Card salary limits, permanent residency timelines, and Opportunity Card points."
          actions={(
            <DomainCalculatorHeaderActions
              onSyncLifeProfile={syncVisaFromLifeProfile}
              onResetDefaults={resetVisaCalculator}
              syncTooltip="Load planning year, gross salary offer, age, Blue Card track, and German level from your Life Profile"
            />
          )}
        />

        <div className="domain-calc-layout">
          <section className="ui-card" aria-labelledby="visa-inputs-heading">
            <div className="ui-card__header">
              <div>
                <h2 id="visa-inputs-heading" className="ui-card__title">Applicant &amp; Job Offer</h2>
                <p className="ui-card__subtitle">Salary threshold and language rules adjust by year.</p>
              </div>
            </div>
            <div className="domain-calc-fields">
              <NumberField
                id="visa-gross-salary"
                label="Annual Gross Salary Offer"
                unit="€"
                min={0}
                step={500}
                value={s.annualGrossSalary}
                onChange={(num) => updateVisaField("annualGrossSalary", toGrossSalary(num))}
              />

              <div className="domain-calc-field-row">
                <NumberField
                  id="visa-age"
                  label="Applicant Age"
                  unit="yrs"
                  min={18}
                  max={80}
                  step={1}
                  value={s.applicantAgeYears}
                  onChange={(num) => updateVisaField("applicantAgeYears", Math.round(num))}
                />

                <NumberField
                  id="visa-experience"
                  label="Skilled Experience"
                  unit="yrs"
                  min={0}
                  max={40}
                  step={1}
                  value={s.qualifiedExperienceYears}
                  onChange={(num) => updateVisaField("qualifiedExperienceYears", Math.round(num))}
                />
              </div>

              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Blue Card Track</span>
                </div>
                <SegmentedControl
                  label="Blue Card occupation track"
                  value={s.occupationRoute}
                  options={OCCUPATION_ROUTE_OPTIONS}
                  fullWidth
                  onChange={(value) => updateVisaField("occupationRoute", value)}
                />
              </div>

              <ChoiceSelect
                id="visa-german"
                label="German Language Level"
                value={s.germanLevel}
                options={GERMAN_LEVEL_OPTIONS}
                onChange={(value) => updateVisaField("germanLevel", toGermanLanguageLevel(value))}
              />

              <h3 className="domain-calc-group-title">Opportunity Card Factors</h3>

              <ToggleSwitch
                id="visa-full-degree"
                label="Fully recognized university degree"
                hint="Direct skilled-worker track (no point threshold needed)"
                checked={s.hasRecognizedGermanOrEquivalentDegree}
                onChange={(checked) => updateVisaField("hasRecognizedGermanOrEquivalentDegree", checked)}
              />

              <ToggleSwitch
                id="visa-partial"
                label="Partial recognition deficit notice (+4 pts)"
                checked={s.hasVocationalOrPartialRecognition}
                onChange={(checked) => updateVisaField("hasVocationalOrPartialRecognition", checked)}
              />

              <ToggleSwitch
                id="visa-english"
                label="English C1 or native proficiency (+1 pt)"
                checked={s.hasEnglishC1OrNative}
                onChange={(checked) => updateVisaField("hasEnglishC1OrNative", checked)}
              />

              <ToggleSwitch
                id="visa-shortage-flag"
                label="EU shortage / bottleneck occupation (+1 pt)"
                checked={s.isShortageOccupation}
                onChange={(checked) => updateVisaField("isShortageOccupation", checked)}
              />

              <ToggleSwitch
                id="visa-prior-stay"
                label="6+ months legal stay in Germany (+1 pt)"
                checked={s.hasPriorSixMonthLegalStayInGermany}
                onChange={(checked) => updateVisaField("hasPriorSixMonthLegalStayInGermany", checked)}
              />

              <ToggleSwitch
                id="visa-partner-applies"
                label="Partner also qualifies for Opportunity Card (+1 pt)"
                checked={s.partnerAlsoAppliesSkilled}
                onChange={(checked) => updateVisaField("partnerAlsoAppliesSkilled", checked)}
              />

              <NumberField
                id="visa-stay-months"
                label="Opportunity Card Stay Duration"
                unit="mo"
                min={1}
                max={12}
                step={1}
                value={s.stayDurationMonths}
                onChange={(num) => updateVisaField("stayDurationMonths", Math.min(12, Math.round(num)))}
              />
            </div>
          </section>

          <div className="domain-calc-results">
            <div className={`domain-calc-banner domain-calc-banner--${statusTone}`} role="status">
              <div>
                <strong>
                  {blueCard.isEligible ? <EligibilityConfirmedIcon size={18} /> : <StatutoryLimitationWarningIcon size={18} />}
                  <span>{statusHeadline}</span>
                </strong>
                <p>
                  {blueCard.age45PensionProofRequired && !blueCard.age45SalarySatisfied
                    ? "Age 45+ rule: adequate pension proof is required unless your salary meets the threshold."
                    : `Permanent residency available after ${blueCard.requiredSettlementMonths} months of qualified employment.`}
                </p>
              </div>
              <LawRefLink lawId={LawId.AufenthG_18g} label="Read § 18g AufenthG" />
            </div>

            <div className="domain-calc-kpis">
              <MetricCard
                label="Applicable Threshold"
                value={formatEur(blueCard.applicableSalaryThreshold)}
                subtitle={`Margin ${blueCard.salarySurplusOrShortfall >= 0 ? "+" : ""}${formatEur(blueCard.salarySurplusOrShortfall)}`}
                tone={MetricTone.Primary}
              />
              <MetricCard
                label="Settlement Permit (PR)"
                value={`${blueCard.requiredSettlementMonths} months`}
                subtitle={
                  blueCard.settlementMonthsSavedByB1 > 0
                    ? `B1 accelerates by ${blueCard.settlementMonthsSavedByB1} months`
                    : "B1 German cuts timeline to 21 months"
                }
                tone={MetricTone.Gain}
              />
              <MetricCard
                label="Chancenkarte Points"
                value={
                  chancenkarte.directSkilledWorkerTrack
                    ? "Direct Track"
                    : `${chancenkarte.totalPoints} / ${chancenkarte.pointsRequired} pts`
                }
                subtitle={`Blocked account ${formatEur(chancenkarte.requiredBlockedAccountTotal)}`}
                tone={chancenkarte.eligibleOverall ? MetricTone.Gain : MetricTone.Neutral}
              />
            </div>

            <section className="ui-card" aria-labelledby="chancenkarte-breakdown-heading">
              <div className="ui-card__header">
                <h2 id="chancenkarte-breakdown-heading" className="ui-card__title">Opportunity Card Points &amp; Savings</h2>
              </div>
              <table className="domain-calc-table">
                <thead>
                  <tr>
                    <th>Criterion</th>
                    <th className="num">Points / Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Partial recognition deficit notice</td>
                    <td className="num">{chancenkarte.breakdown.partialRecognition} pts</td>
                  </tr>
                  <tr>
                    <td>Skilled professional experience ({s.qualifiedExperienceYears} yrs)</td>
                    <td className="num">{chancenkarte.breakdown.experience} pts</td>
                  </tr>
                  <tr>
                    <td>German language level</td>
                    <td className="num">{chancenkarte.breakdown.germanLanguage} pts</td>
                  </tr>
                  <tr>
                    <td>English C1 / native bonus</td>
                    <td className="num">{chancenkarte.breakdown.englishLanguage} pts</td>
                  </tr>
                  <tr>
                    <td>Age bracket bonus (under 35 / under 40)</td>
                    <td className="num">{chancenkarte.breakdown.age} pts</td>
                  </tr>
                  <tr>
                    <td>Shortage occupation / prior stay / partner</td>
                    <td className="num">
                      {chancenkarte.breakdown.shortageBonus + chancenkarte.breakdown.priorStayInGermany + chancenkarte.breakdown.partnerBonus} pts
                    </td>
                  </tr>
                  <tr className="is-total">
                    <th>Total Opportunity Card Score (Threshold: 6 pts or Recognized Degree)</th>
                    <td className="num">{chancenkarte.totalPoints} pts</td>
                  </tr>
                </tbody>
              </table>

              <div className="domain-calc-law-bar">
                <span>Legal basis:</span>
                <LawRefLink lawId={LawId.AufenthG_18g} label="AufenthG § 18g" />
                <LawRefLink lawId={LawId.AufenthG_18c} label="AufenthG § 18c" />
                <LawRefLink lawId={LawId.AufenthG_20a} label="AufenthG § 20a" />
                <LawRefLink lawId={LawId.AufenthG_18_2_5} label="AufenthG § 18 Abs. 2 Nr. 5" />
              </div>
            </section>

            <ParameterObserverSection projectionProfile={FormProjectionProfileId.VisaFocus} />
          </div>
        </div>

        <footer className="domain-calc-footer">
          <SourceRevision note="Blue Card and Opportunity Card thresholds automatically adjust by planning year." />
        </footer>
      </main>
    </>
  );
}
