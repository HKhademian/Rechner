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
  VisaResidenceIcon,
} from "#components/Icons";
import LawRefLink from "#components/laws/LawRefLink";
import Navigation from "#components/Navigation";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import SourceRevision from "#components/SourceRevision";
import {
  BlueCardEligibilityStatus,
  GermanLanguageLevel,
  VisaOccupationRoute,
  toGermanLanguageLevel,
  toVisaOccupationRoute,
} from "#engine/formulas/pure/visaFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  toGrossSalary,
} from "#engine/types";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

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
      <main id="main-content" className="domain-calc-page" tabIndex={-1}>
        <header className="domain-calc-header">
          <div>
            <span className="domain-calc-header__eyebrow">
              <VisaResidenceIcon size={15} />
              <span>Residence &amp; Skilled Immigration</span>
            </span>
            <h1>EU Blue Card &amp; Visa Planner</h1>
            <p className="domain-calc-header__subtitle">
              Check Blue Card salary limits, permanent residency timelines, and Opportunity Card points.
            </p>
          </div>
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncVisaFromLifeProfile}
            onResetDefaults={resetVisaCalculator}
            syncTooltip="Populate planning year, annual gross salary offer, applicant age, Blue Card track, and German level from the Unified Life Profile"
          />
        </header>

        <div className="domain-calc-layout">
          <section className="domain-calc-card" aria-labelledby="visa-inputs-heading">
            <h2 id="visa-inputs-heading">Applicant &amp; Job Offer Profile</h2>
            <div className="domain-calc-fields">
              <label className="domain-calc-field" for="visa-gross-salary">
                <span className="domain-calc-field__label-line">
                  <span>Annual Gross Salary Offer (EUR)</span>
                  <LawRefLink lawId={LawId.AufenthG_18g} label="§ 18g" variant="badge" />
                </span>
                <input
                  id="visa-gross-salary"
                  type="number"
                  min={0}
                  step={500}
                  value={s.annualGrossSalary}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateVisaField("annualGrossSalary", toGrossSalary(num));
                    }
                  }}
                />
              </label>

              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="visa-age">
                  <span className="domain-calc-field__label-line">
                    <span>Applicant Age</span>
                    <LawRefLink lawId={LawId.AufenthG_18_2_5} label="§ 18" variant="badge" />
                  </span>
                  <input
                    id="visa-age"
                    type="number"
                    min={18}
                    max={80}
                    step={1}
                    value={s.applicantAgeYears}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 18) {
                        updateVisaField("applicantAgeYears", Math.round(num));
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="visa-experience">
                  <span>Skilled Experience (yrs)</span>
                  <input
                    id="visa-experience"
                    type="number"
                    min={0}
                    max={40}
                    step={1}
                    value={s.qualifiedExperienceYears}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateVisaField("qualifiedExperienceYears", Math.round(num));
                      }
                    }}
                  />
                </label>
              </div>

              <label className="domain-calc-field" for="visa-route">
                <span>Blue Card Occupation Track</span>
                <select
                  id="visa-route"
                  value={s.occupationRoute}
                  onChange={(event) => updateVisaField("occupationRoute", toVisaOccupationRoute(event.currentTarget.value))}
                >
                  <option value={VisaOccupationRoute.Standard}>Standard Profession</option>
                  <option value={VisaOccupationRoute.ShortageOrGraduate}>Shortage Occupation / IT / Recent Graduate</option>
                </select>
              </label>

              <label className="domain-calc-field" for="visa-german">
                <span className="domain-calc-field__label-line">
                  <span>German Language Level</span>
                  <LawRefLink lawId={LawId.AufenthG_18c} label="§ 18c" variant="badge" />
                </span>
                <select
                  id="visa-german"
                  value={s.germanLevel}
                  onChange={(event) => updateVisaField("germanLevel", toGermanLanguageLevel(event.currentTarget.value))}
                >
                  <option value={GermanLanguageLevel.NoneOrBasic}>Below A1 / Basic</option>
                  <option value={GermanLanguageLevel.A1}>A1 Elementary</option>
                  <option value={GermanLanguageLevel.A2}>A2 Pre-Intermediate</option>
                  <option value={GermanLanguageLevel.B1Plus}>B1 or higher</option>
                </select>
              </label>

              <h3>Chancenkarte (§ 20a AufenthG) Factors</h3>

              <label className="domain-calc-checkbox" for="visa-full-degree">
                <input
                  id="visa-full-degree"
                  type="checkbox"
                  checked={s.hasRecognizedGermanOrEquivalentDegree}
                  onChange={(event) => updateVisaField("hasRecognizedGermanOrEquivalentDegree", event.currentTarget.checked)}
                />
                <span>Fully recognized university degree or German qualification</span>
              </label>

              <label className="domain-calc-checkbox" for="visa-partial">
                <input
                  id="visa-partial"
                  type="checkbox"
                  checked={s.hasVocationalOrPartialRecognition}
                  onChange={(event) => updateVisaField("hasVocationalOrPartialRecognition", event.currentTarget.checked)}
                />
                <span>Partial recognition deficit notice (+4 pts)</span>
              </label>

              <label className="domain-calc-checkbox" for="visa-english">
                <input
                  id="visa-english"
                  type="checkbox"
                  checked={s.hasEnglishC1OrNative}
                  onChange={(event) => updateVisaField("hasEnglishC1OrNative", event.currentTarget.checked)}
                />
                <span>English C1 or native proficiency (+1 pt)</span>
              </label>

              <label className="domain-calc-checkbox" for="visa-shortage-flag">
                <input
                  id="visa-shortage-flag"
                  type="checkbox"
                  checked={s.isShortageOccupation}
                  onChange={(event) => updateVisaField("isShortageOccupation", event.currentTarget.checked)}
                />
                <span>Bottleneck occupation under EU shortage list (+1 pt)</span>
              </label>

              <label className="domain-calc-checkbox" for="visa-prior-stay">
                <input
                  id="visa-prior-stay"
                  type="checkbox"
                  checked={s.hasPriorSixMonthLegalStayInGermany}
                  onChange={(event) => updateVisaField("hasPriorSixMonthLegalStayInGermany", event.currentTarget.checked)}
                />
                <span>6+ months legal stay in Germany during past 5 years (+1 pt)</span>
              </label>

              <label className="domain-calc-checkbox" for="visa-partner-applies">
                <input
                  id="visa-partner-applies"
                  type="checkbox"
                  checked={s.partnerAlsoAppliesSkilled}
                  onChange={(event) => updateVisaField("partnerAlsoAppliesSkilled", event.currentTarget.checked)}
                />
                <span>Spouse/partner also fulfills Chancenkarte criteria (+1 pt)</span>
              </label>

              <label className="domain-calc-field" for="visa-stay-months">
                <span className="domain-calc-field__label-line">
                  <span>Opportunity Card Stay Duration (months)</span>
                  <LawRefLink lawId={LawId.AufenthG_20a} label="§ 20a" variant="badge" />
                </span>
                <input
                  id="visa-stay-months"
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  value={s.stayDurationMonths}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 1) {
                      updateVisaField("stayDurationMonths", Math.min(12, Math.round(num)));
                    }
                  }}
                />
              </label>
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
              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Applicable Threshold</span>
                  <LawRefLink lawId={LawId.AufenthG_18g} label="§ 18g" variant="badge" />
                </span>
                <span className="domain-calc-kpi__value">{formatEur(blueCard.applicableSalaryThreshold)}</span>
                <span className="domain-calc-kpi__sub">
                  Margin {blueCard.salarySurplusOrShortfall >= 0 ? "+" : ""}
                  {formatEur(blueCard.salarySurplusOrShortfall)}
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Settlement Permit (PR)</span>
                  <LawRefLink lawId={LawId.AufenthG_18c} label="§ 18c" variant="badge" />
                </span>
                <span className="domain-calc-kpi__value domain-calc-kpi__value--gain">
                  {blueCard.requiredSettlementMonths} months
                </span>
                <span className="domain-calc-kpi__sub">
                  {blueCard.settlementMonthsSavedByB1 > 0
                    ? `B1 accelerates by ${blueCard.settlementMonthsSavedByB1} months`
                    : "B1 German cuts timeline to 21 months"}
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Chancenkarte Points</span>
                  <LawRefLink lawId={LawId.AufenthG_20a} label="§ 20a" variant="badge" />
                </span>
                <span className={`domain-calc-kpi__value ${chancenkarte.eligibleOverall ? "domain-calc-kpi__value--gain" : ""}`}>
                  {chancenkarte.directSkilledWorkerTrack ? "Direct Track" : `${chancenkarte.totalPoints} / ${chancenkarte.pointsRequired} pts`}
                </span>
                <span className="domain-calc-kpi__sub">
                  Blocked account {formatEur(chancenkarte.requiredBlockedAccountTotal)}
                </span>
              </div>
            </div>

            <section className="domain-calc-card" aria-labelledby="chancenkarte-breakdown-heading">
              <h2 id="chancenkarte-breakdown-heading">Opportunity Card Points &amp; Savings</h2>
              <table className="domain-calc-table">
                <thead>
                  <tr>
                    <th>Statutory Criterion</th>
                    <th className="num">Points / Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Partial Recognition Deficit Notice</td>
                    <td className="num">{chancenkarte.breakdown.partialRecognition} pts</td>
                  </tr>
                  <tr>
                    <td>Skilled Professional Experience ({s.qualifiedExperienceYears} yrs)</td>
                    <td className="num">{chancenkarte.breakdown.experience} pts</td>
                  </tr>
                  <tr>
                    <td>German Language Level</td>
                    <td className="num">{chancenkarte.breakdown.germanLanguage} pts</td>
                  </tr>
                  <tr>
                    <td>English C1 / Native Bonus</td>
                    <td className="num">{chancenkarte.breakdown.englishLanguage} pts</td>
                  </tr>
                  <tr>
                    <td>Age Bracket Bonus (Under 35 / Under 40)</td>
                    <td className="num">{chancenkarte.breakdown.age} pts</td>
                  </tr>
                  <tr>
                    <td>Shortage Occupation / Prior Stay / Partner</td>
                    <td className="num">
                      {chancenkarte.breakdown.shortageBonus + chancenkarte.breakdown.priorStayInGermany + chancenkarte.breakdown.partnerBonus} pts
                    </td>
                  </tr>
                  <tr className="is-total">
                    <th>Total Chancenkarte Score (Threshold: 6 pts or Direct Recognized Degree)</th>
                    <td className="num">{chancenkarte.totalPoints} pts</td>
                  </tr>
                </tbody>
              </table>

              <div className="domain-calc-law-bar">
                <span>Statutory Bases:</span>
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
          <span>Statutory Blue Card and Opportunity Card figures automatically adjust by planning year.</span>
          <SourceRevision />
        </footer>
      </main>
    </>
  );
}
