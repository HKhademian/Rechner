import "./LifeProfileSummaryPage.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
  lifeProfilePath,
} from "#/apps/appDefinition.ts";
import {
  CalculatorNavigationIcon,
  CompanyCarMobilityIcon,
  HomeAcquisitionIcon,
  SimulatorNavigationIcon,
  SolarEnergyIcon,
  VisaResidenceIcon,
} from "#components/Icons";
import LifeProfilePanel from "#components/LifeProfilePanel";
import Navigation from "#components/Navigation";
import SourceRevision from "#components/SourceRevision";
import LawRefLink from "#components/laws/LawRefLink";
import {
  GERMAN_FEDERAL_STATE_LABELS,
} from "#engine/formulas/pure/housingFormulas";
import {
  BlueCardEligibilityStatus,
} from "#engine/formulas/pure/visaFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  getLawEntry,
} from "#engine/laws/registry";
import {
  unifiedLifeOverview,
  unifiedLifeProfile,
} from "#store/lifeProfileStore";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 1 : 2)}%`;
}

/**
 * Full-page Unified Life Profile & 6-Domain Cross-Calculator Summary (`/profile/`).
 * Imports ONLY the shared `lifeProfileStore` and never any calculator-private store.
 */
export default function LifeProfileSummaryPage(): JSX.Element {
  const profile = unifiedLifeProfile.value;
  const overview = unifiedLifeOverview.value;
  const {
    householdTax,
    householdPayroll,
    parentalLeave,
    visa,
    companyCar,
    solarEnergy,
    housing,
  } = overview;

  const totalMonthlyHouseholdInflow =
    householdPayroll.householdMonthlyCashWithKindergeldEur;
  const blueCardEligible =
    visa.status !== BlueCardEligibilityStatus.BelowThreshold;
  const stateLabel = GERMAN_FEDERAL_STATE_LABELS[profile.federalState];

  return (
    <>
      <Navigation currentPath={lifeProfilePath()} />
      <main id="main-content" className="life-summary" tabIndex={-1}>
        <header className="life-summary__hero">
          <div>
            <p className="life-summary__eyebrow">Stage 6 · Unified Household &amp; Support Engine</p>
            <h1>Unified Life Profile &amp; Cross-Calculator Summary</h1>
            <p className="life-summary__lead">
              Adjust your household, residence, mobility, solar, and housing baseline once below to compare live statutory results side by side across all six domain calculators ({profile.planningYear}, {stateLabel}).
            </p>
          </div>
          <div className="life-summary__hero-badge">
            <span>Combined Annual Incentives &amp; Tax Upside</span>
            <strong>{formatEur(overview.combinedAnnualBonusAndSavingsEur)} / yr</strong>
          </div>
        </header>

        <section className="life-summary__headline-grid" aria-label="Cross-calculator headline totals">
          <div className="life-summary__headline-card">
            <span>Household Monthly Cash Flow</span>
            <strong>{formatEur(totalMonthlyHouseholdInflow)} / mo</strong>
            <small>
              {formatEur(householdPayroll.householdMonthlyNetEur)} net salary + {formatEur(householdTax.annualKindergeldEur / 12)} Kindergeld
            </small>
          </div>
          <div className="life-summary__headline-card">
            <span>Est. Annual Income Tax (§ 32a)</span>
            <strong>{formatEur(householdTax.estimatedAnnualIncomeTaxEur)} / yr</strong>
            <small>
              ZvE {formatEur(householdTax.estimatedTaxableIncomeZvEEur)} · {householdTax.isKinderfreibetragFavorable ? "Kinderfreibetrag favored" : "Kindergeld favored"}
            </small>
          </div>
          <div className="life-summary__headline-card">
            <span>Peak Basiselterngeld Rate</span>
            <strong>
              {parentalLeave.incomeCapExceeded
                ? "Capped (€0)"
                : `${formatEur(parentalLeave.primaryBasiselterngeldMonthlyEur)} / mo`}
            </strong>
            <small>
              {profile.dependentChildrenCount >= 1 && !parentalLeave.incomeCapExceeded
                ? `+${formatEur(parentalLeave.siblingBonusBasisMonthlyEur)}/mo § 2a sibling bonus if next child`
                : `§ 1 Abs. 8 BEEG threshold ${formatEur(parentalLeave.coupleIncomeCapEur)}`}
            </small>
          </div>
          <div className="life-summary__headline-card">
            <span>Active Statutory Engine Graph</span>
            <strong>{overview.governingLawIds.length} Laws · {overview.consumedParameterIds.length} Params</strong>
            <small>Deterministic Tier 1 → Tier 2 → Tier 3 projection</small>
          </div>
        </section>

        <LifeProfilePanel defaultExpanded showSummaryLink={false} />

        <div className="life-summary__section-heading">
          <h2>Side-by-Side Calculator Projections ({profile.planningYear})</h2>
          <p>
            Every card reads exclusively from your Unified Life Profile. Open any calculator and click <strong>Sync Life Profile</strong> to refine scenario details.
          </p>
        </div>

        <section className="life-summary__grid" aria-label="Six domain calculator summaries">
          <article className="life-summary__card">
            <div className="life-summary__card-top">
              <div className="life-summary__card-title">
                <span className="life-summary__card-icon" aria-hidden="true">
                  <CalculatorNavigationIcon size={20} />
                </span>
                <div>
                  <h3>Net Pay &amp; Household Tax</h3>
                  <p className="life-summary__card-subtitle">{householdPayroll.appliedTaxClassLabel} · {profile.planningYear} PAP</p>
                </div>
              </div>
              <span className="life-summary__status life-summary__status--gain">Active</span>
            </div>
            <dl className="life-summary__metrics">
              <div>
                <dt>Primary Monthly Net</dt>
                <dd>{formatEur(householdPayroll.primaryMonthlyNetEur)}</dd>
              </div>
              <div>
                <dt>Partner Monthly Net</dt>
                <dd>{profile.hasPartner ? formatEur(householdPayroll.partnerMonthlyNetEur) : "—"}</dd>
              </div>
              <div>
                <dt>Monthly Social Security</dt>
                <dd>{formatEur(householdPayroll.householdMonthlySocialSecurityEur)}</dd>
              </div>
              <div>
                <dt>Annual Take-Home (excl. Kindergeld)</dt>
                <dd>{formatEur(householdPayroll.householdAnnualNetEur)}</dd>
              </div>
            </dl>
            <div className="life-summary__card-footer">
              <div className="life-summary__laws">
                <LawRefLink lawId={LawId.EStG_32a} label="§ 32a" variant="badge" />
                <LawRefLink lawId={LawId.EStG_38b} label="§ 38b" variant="badge" />
                <LawRefLink lawId={LawId.EStG_66} label="§ 66" variant="badge" />
              </div>
              <a className="life-summary__open" href={calculatorPath(AppId.NetPay)}>
                Open Net Pay
              </a>
            </div>
          </article>

          <article className="life-summary__card">
            <div className="life-summary__card-top">
              <div className="life-summary__card-title">
                <span className="life-summary__card-icon" aria-hidden="true">
                  <SimulatorNavigationIcon size={20} />
                </span>
                <div>
                  <h3>Parental Leave (Elterngeld)</h3>
                  <p className="life-summary__card-subtitle">65–100% net replacement · BEEG § 2</p>
                </div>
              </div>
              <span
                className={`life-summary__status ${
                  parentalLeave.incomeCapExceeded
                    ? "life-summary__status--warn"
                    : "life-summary__status--gain"
                }`}
              >
                {parentalLeave.incomeCapExceeded ? "Over €175k cap" : "Eligible"}
              </span>
            </div>
            <dl className="life-summary__metrics">
              <div>
                <dt>Primary Basiselterngeld</dt>
                <dd>{formatEur(parentalLeave.primaryBasiselterngeldMonthlyEur)} / mo</dd>
              </div>
              <div>
                <dt>Primary ElterngeldPlus</dt>
                <dd>{formatEur(parentalLeave.primaryElterngeldPlusMonthlyEur)} / mo</dd>
              </div>
              <div>
                <dt>Partner Basiselterngeld</dt>
                <dd>
                  {profile.hasPartner
                    ? `${formatEur(parentalLeave.partnerBasiselterngeldMonthlyEur)} / mo`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Sibling Bonus (§ 2a BEEG)</dt>
                <dd>
                  {profile.dependentChildrenCount >= 1
                    ? `+${formatEur(parentalLeave.siblingBonusBasisMonthlyEur)} / mo`
                    : "First child (€0)"}
                </dd>
              </div>
            </dl>
            <div className="life-summary__card-footer">
              <div className="life-summary__laws">
                <LawRefLink lawId={LawId.BEEG_1} label="§ 1 BEEG" variant="badge" />
                <LawRefLink lawId={LawId.BEEG_2} label="§ 2 BEEG" variant="badge" />
                <LawRefLink lawId={LawId.BEEG_2a} label="§ 2a" variant="badge" />
              </div>
              <a className="life-summary__open" href={calculatorPath(AppId.ParentalLeave)}>
                Open Planner
              </a>
            </div>
          </article>

          <article className="life-summary__card">
            <div className="life-summary__card-top">
              <div className="life-summary__card-title">
                <span className="life-summary__card-icon" aria-hidden="true">
                  <VisaResidenceIcon size={20} />
                </span>
                <div>
                  <h3>EU Blue Card &amp; Settlement</h3>
                  <p className="life-summary__card-subtitle">AufenthG § 18g &amp; § 18c</p>
                </div>
              </div>
              <span
                className={`life-summary__status ${
                  blueCardEligible ? "life-summary__status--gain" : "life-summary__status--warn"
                }`}
              >
                {blueCardEligible ? "Eligible" : "Below threshold"}
              </span>
            </div>
            <dl className="life-summary__metrics">
              <div>
                <dt>Primary Gross Salary</dt>
                <dd>{formatEur(profile.primaryAnnualGrossEur)} / yr</dd>
              </div>
              <div>
                <dt>Applicable Threshold</dt>
                <dd>{formatEur(visa.applicableSalaryThreshold)} / yr</dd>
              </div>
              <div>
                <dt>Salary Margin vs. Threshold</dt>
                <dd>
                  {visa.salarySurplusOrShortfall >= 0 ? "+" : ""}
                  {formatEur(visa.salarySurplusOrShortfall)}
                </dd>
              </div>
              <div>
                <dt>Permanent Settlement (PR)</dt>
                <dd>{visa.requiredSettlementMonths} months</dd>
              </div>
            </dl>
            <div className="life-summary__card-footer">
              <div className="life-summary__laws">
                <LawRefLink lawId={LawId.AufenthG_18g} label="§ 18g" variant="badge" />
                <LawRefLink lawId={LawId.AufenthG_18c} label="§ 18c" variant="badge" />
              </div>
              <a className="life-summary__open" href={calculatorPath(AppId.Visa)}>
                Open Blue Card
              </a>
            </div>
          </article>

          <article className="life-summary__card">
            <div className="life-summary__card-top">
              <div className="life-summary__card-title">
                <span className="life-summary__card-icon" aria-hidden="true">
                  <CompanyCarMobilityIcon size={20} />
                </span>
                <div>
                  <h3>Company Car &amp; EV Benefit</h3>
                  <p className="life-summary__card-subtitle">§ 6 Abs. 1 Nr. 4 EStG ({profile.commuteOneWayKm} km commute)</p>
                </div>
              </div>
              <span
                className={`life-summary__status ${
                  profile.hasCompanyCar ? "life-summary__status--gain" : "life-summary__status--muted"
                }`}
              >
                {profile.hasCompanyCar ? formatPercent(companyCar.privateUseRateApplied) : "Inactive"}
              </span>
            </div>
            <dl className="life-summary__metrics">
              <div>
                <dt>Monthly Private Use Imputed</dt>
                <dd>{profile.hasCompanyCar ? formatEur(companyCar.monthlyPrivateUseBenefit) : "—"}</dd>
              </div>
              <div>
                <dt>Monthly Commute Add-on</dt>
                <dd>{profile.hasCompanyCar ? formatEur(companyCar.monthlyCommuteBenefit) : "—"}</dd>
              </div>
              <div>
                <dt>Est. Annual Tax &amp; Social Cost</dt>
                <dd>{profile.hasCompanyCar ? formatEur(companyCar.estimatedAnnualNetCost) : "—"}</dd>
              </div>
              <div>
                <dt>Annual Tax Savings vs. ICE</dt>
                <dd>{profile.hasCompanyCar ? formatEur(companyCar.annualTaxSavingsVsIce) : "€0"}</dd>
              </div>
            </dl>
            <div className="life-summary__card-footer">
              <div className="life-summary__laws">
                <LawRefLink lawId={LawId.EStG_6_1_4} label="§ 6 EStG" variant="badge" />
                <LawRefLink lawId={LawId.EStG_8_2} label="§ 8 Abs. 2" variant="badge" />
              </div>
              <a className="life-summary__open" href={calculatorPath(AppId.CompanyCar)}>
                Open Car Calc
              </a>
            </div>
          </article>

          <article className="life-summary__card">
            <div className="life-summary__card-top">
              <div className="life-summary__card-title">
                <span className="life-summary__card-icon" aria-hidden="true">
                  <SolarEnergyIcon size={20} />
                </span>
                <div>
                  <h3>Rooftop Solar PV Yield</h3>
                  <p className="life-summary__card-subtitle">{profile.solarCapacityKwp} kWp · 0% VAT &amp; tax-free</p>
                </div>
              </div>
              <span
                className={`life-summary__status ${
                  profile.plansSolarPv ? "life-summary__status--gain" : "life-summary__status--muted"
                }`}
              >
                {profile.plansSolarPv
                  ? solarEnergy.simplePaybackYears !== null
                    ? `${solarEnergy.simplePaybackYears.toFixed(1)} yr payback`
                    : "Active"
                  : "Inactive"}
              </span>
            </div>
            <dl className="life-summary__metrics">
              <div>
                <dt>Annual Generation Yield</dt>
                <dd>{profile.plansSolarPv ? `${Math.round(solarEnergy.annualGenerationKwh).toLocaleString("de-DE")} kWh` : "—"}</dd>
              </div>
              <div>
                <dt>Self-Consumption Savings</dt>
                <dd>{profile.plansSolarPv ? `${formatEur(solarEnergy.annualSelfConsumptionSavings)} / yr` : "—"}</dd>
              </div>
              <div>
                <dt>EEG Feed-In Revenue</dt>
                <dd>{profile.plansSolarPv ? `${formatEur(solarEnergy.annualFeedInRevenue)} / yr` : "—"}</dd>
              </div>
              <div>
                <dt>Net Annual Cash Benefit</dt>
                <dd>{profile.plansSolarPv ? `${formatEur(solarEnergy.annualNetCashBenefit)} / yr` : "€0"}</dd>
              </div>
            </dl>
            <div className="life-summary__card-footer">
              <div className="life-summary__laws">
                <LawRefLink lawId={LawId.EEG_48} label="§ 48 EEG" variant="badge" />
                <LawRefLink lawId={LawId.UStG_12_3} label="0% VAT" variant="badge" />
              </div>
              <a className="life-summary__open" href={calculatorPath(AppId.SolarEnergy)}>
                Open Solar Calc
              </a>
            </div>
          </article>

          <article className="life-summary__card">
            <div className="life-summary__card-top">
              <div className="life-summary__card-title">
                <span className="life-summary__card-icon" aria-hidden="true">
                  <HomeAcquisitionIcon size={20} />
                </span>
                <div>
                  <h3>Housing &amp; KfW 300</h3>
                  <p className="life-summary__card-subtitle">{stateLabel} · {formatPercent(housing.transferTaxRate)} GrESt</p>
                </div>
              </div>
              <span
                className={`life-summary__status ${
                  !profile.plansHomePurchase
                    ? "life-summary__status--muted"
                    : housing.kfw300Eligible
                      ? "life-summary__status--gain"
                      : "life-summary__status--warn"
                }`}
              >
                {!profile.plansHomePurchase
                  ? "Inactive"
                  : housing.kfw300Eligible
                    ? "KfW 300 Eligible"
                    : "Over KfW Limit"}
              </span>
            </div>
            <dl className="life-summary__metrics">
              <div>
                <dt>Closing Acquisition Costs</dt>
                <dd>{profile.plansHomePurchase ? formatEur(housing.totalClosingCostsEur) : "—"}</dd>
              </div>
              <div>
                <dt>KfW 300 Household Limit</dt>
                <dd>{formatEur(housing.kfw300IncomeCeilingEur)}</dd>
              </div>
              <div>
                <dt>Max Subsidized KfW Loan</dt>
                <dd>{profile.plansHomePurchase ? formatEur(housing.kfw300MaxSubsidizedLoanEur) : "—"}</dd>
              </div>
              <div>
                <dt>§ 35a Craft Tax Credit</dt>
                <dd>{profile.plansHomePurchase ? `${formatEur(housing.craftsmanTaxCreditEur)} / yr` : "€0"}</dd>
              </div>
            </dl>
            <div className="life-summary__card-footer">
              <div className="life-summary__laws">
                <LawRefLink lawId={LawId.KfW_300} label="KfW 300" variant="badge" />
                <LawRefLink lawId={LawId.GrEStG_11} label="GrEStG" variant="badge" />
                <LawRefLink lawId={LawId.EStG_35a} label="§ 35a" variant="badge" />
              </div>
              <a className="life-summary__open" href={calculatorPath(AppId.Housing)}>
                Open Housing Calc
              </a>
            </div>
          </article>
        </section>

        <section className="life-summary__provenance" aria-label="Governing statutory provenance">
          <h2>Active Governing Statutes ({overview.governingLawIds.length})</h2>
          <p>
            Click any statute chip for a quick inline rule popup, or Ctrl+Click / middle-click to open its dedicated full statutory reference page.
          </p>
          <div className="life-summary__law-chips">
            {overview.governingLawIds.map((lawId) => {
              const entry = getLawEntry(lawId);
              return (
                <LawRefLink key={lawId} lawId={lawId} label={entry.citation} />
              );
            })}
          </div>
        </section>
      </main>
      <footer className="life-summary__footer">
        <p>Unified Life Profile calculations stay strictly in your browser under your selected storage mode.</p>
        <SourceRevision />
      </footer>
    </>
  );
}
