import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";
import "./LifeProfilePanel.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  AppId,
  calculatorPath,
  lifeProfilePath,
} from "#/apps/appDefinition.ts";
import {
  CollapseSectionIcon,
  CompanyCarMobilityIcon,
  ExpandSectionIcon,
  HomeAcquisitionIcon,
  ResetDefaultsIcon,
  SolarEnergyIcon,
  UnifiedLifeProfileIcon,
  VisaResidenceIcon,
} from "#components/Icons";
import {
  ChoiceSelect,
} from "#components/ui/ChoiceSelect";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import LawRefLink from "#components/laws/LawRefLink";
import {
  VehiclePowertrain,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  GERMAN_FEDERAL_STATE_LABELS,
  toGermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  BlueCardEligibilityStatus,
  GermanLanguageLevel,
  toGermanLanguageLevel,
} from "#engine/formulas/pure/visaFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
} from "#engine/types";
import {
  resetUnifiedLifeProfile,
  unifiedLifeOverview,
  unifiedLifeProfile,
  updateLifeProfileField,
} from "#store/lifeProfileStore";

function formatEur(value: number): string {
  return formatSharedEur(value);
}

const PLANNING_YEAR_OPTIONS = [
  {
    value: toFullCalendarYear(2026),
    label: "2026",
  },
  {
    value: toFullCalendarYear(2025),
    label: "2025",
  },
] as const;

const GERMAN_LEVEL_OPTIONS = [
  {
    value: GermanLanguageLevel.NoneOrBasic,
    label: "Below A1",
  },
  {
    value: GermanLanguageLevel.A1,
    label: "A1 Basic (27 mo PR)",
  },
  {
    value: GermanLanguageLevel.B1Plus,
    label: "B1+ Intermediate (21 mo PR)",
  },
] as const;

const CAR_POWERTRAIN_OPTIONS = [
  {
    value: VehiclePowertrain.PureElectricEv,
    label: "Electric",
  },
  {
    value: VehiclePowertrain.PlugInHybrid,
    label: "Hybrid",
  },
  {
    value: VehiclePowertrain.CombustionIce,
    label: "Fuel",
  },
] as const;

const FEDERAL_STATE_OPTIONS = Object.entries(GERMAN_FEDERAL_STATE_LABELS).map(([code, label]) => ({
  value: code,
  label,
}));

export interface LifeProfilePanelProps {
  readonly defaultExpanded?: boolean;
  readonly showSummaryLink?: boolean;
}

/**
 * Shared Unified General Life & Support Input Engine panel for the main catalog and `/profile/` hub.
 * Imports ONLY the isolated `lifeProfileStore` and never any calculator-private store.
 */
export default function LifeProfilePanel({
  defaultExpanded = false,
  showSummaryLink = true,
}: LifeProfilePanelProps = {}): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const profile = unifiedLifeProfile.value;
  const overview = unifiedLifeOverview.value;

  const blueCardLabel =
    overview.visa.status === BlueCardEligibilityStatus.EligibleStandard
      ? `Standard (${overview.visa.requiredSettlementMonths} mo PR)`
      : overview.visa.status === BlueCardEligibilityStatus.EligibleShortageOrGraduate
        ? `Shortage/Grad (${overview.visa.requiredSettlementMonths} mo PR)`
        : "Below threshold";

  return (
    <section className="ui-card life-profile-panel" aria-labelledby="life-profile-heading">
      <div className="life-profile-panel__header">
        <div className="life-profile-panel__title-group">
          <span className="life-profile-panel__badge-icon" aria-hidden="true">
            <UnifiedLifeProfileIcon size={22} />
          </span>
          <div>
            <h2 id="life-profile-heading">Shared Household Profile</h2>
            <p className="life-profile-panel__subtitle">
              Review these shared inputs before using them. Some values may still be examples.
            </p>
          </div>
        </div>
        <div className="life-profile-panel__controls">
          {showSummaryLink && (
            <a className="ui-btn ui-btn--tint" href={lifeProfilePath()}>
              <span>View full summary</span>
            </a>
          )}
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            aria-expanded={expanded}
            aria-controls="life-profile-editor"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <CollapseSectionIcon size={15} /> : <ExpandSectionIcon size={15} />}
            <span>{expanded ? "Hide Shared Inputs" : "Edit Shared Profile"}</span>
          </button>
          <button
            type="button"
            className="ui-btn"
            onClick={resetUnifiedLifeProfile}
          >
            <ResetDefaultsIcon size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="life-profile-panel__summary-strip">
        <div className="life-profile-panel__kpi">
          <span className="life-profile-panel__kpi-label">
            <span>Household Net &amp; Kindergeld</span>
            <LawRefLink lawId={LawId.EStG_32a} label="§ 32a" variant="badge" />
          </span>
          <span className="life-profile-panel__kpi-value">
            {formatEur(overview.householdPayroll.householdMonthlyNetEur)}/mo net · {formatEur(overview.householdTax.annualKindergeldEur)}/yr Kindergeld
          </span>
          <span className="life-profile-panel__kpi-note">
            Gross {formatEur(overview.householdTax.combinedGrossAnnualEur)}/yr · Tax {formatEur(overview.householdTax.estimatedAnnualIncomeTaxEur)}/yr
          </span>
        </div>

        <div className="life-profile-panel__kpi">
          <span className="life-profile-panel__kpi-label">
            <span>EU Blue Card</span>
            <LawRefLink lawId={LawId.AufenthG_18g} label="§ 18g" variant="badge" />
          </span>
          <span
            className={`life-profile-panel__kpi-value ${
              overview.visa.status === BlueCardEligibilityStatus.BelowThreshold
                ? "life-profile-panel__kpi-value--warn"
                : "life-profile-panel__kpi-value--gain"
            }`}
          >
            {blueCardLabel}
          </span>
          <span className="life-profile-panel__kpi-note">
            Threshold {formatEur(overview.visa.applicableSalaryThreshold)}/yr
          </span>
        </div>

        <div className="life-profile-panel__kpi">
          <span className="life-profile-panel__kpi-label">
            <span>Company Car</span>
            <LawRefLink lawId={LawId.EStG_6_1_4} label="§ 6 EStG" variant="badge" />
          </span>
          <span className="life-profile-panel__kpi-value life-profile-panel__kpi-value--gain">
            {profile.hasCompanyCar
              ? `${formatEur(overview.companyCar.annualTaxSavingsVsIce)}/yr vs. fuel car`
              : "Not active"}
          </span>
          <span className="life-profile-panel__kpi-note">
            {profile.hasCompanyCar
              ? `Monthly taxable ${formatEur(overview.companyCar.totalMonthlyImputedBenefit)}`
              : "Turn on company car to compare"}
          </span>
        </div>

        <div className="life-profile-panel__kpi">
          <span className="life-profile-panel__kpi-label">
            <span>Solar &amp; Home</span>
            <LawRefLink lawId={LawId.KfW_300} label="KfW 300" variant="badge" />
          </span>
          <span className="life-profile-panel__kpi-value life-profile-panel__kpi-value--gain">
            {profile.plansSolarPv
              ? `${formatEur(overview.solarEnergy.annualNetCashBenefit)}/yr solar`
              : "Solar off"}{" "}
            · {overview.housing.kfw300Eligible ? `KfW ${formatEur(overview.housing.kfw300MaxSubsidizedLoanEur)}` : "No KfW 300"}
          </span>
          <span className="life-profile-panel__kpi-note">
            Combined yearly savings {formatEur(overview.combinedAnnualBonusAndSavingsEur)}/yr
          </span>
        </div>
      </div>

      {expanded && (
        <div id="life-profile-editor" className="life-profile-panel__body">
          <div className="life-profile-panel__sections">
            <div className="ui-card life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <VisaResidenceIcon size={16} />
                  <span>Household &amp; Residence</span>
                </h3>
                <a className="ui-btn ui-btn--sm ui-btn--tint" href={calculatorPath(AppId.Visa)}>
                  Open
                </a>
              </div>
              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Planning Year</span>
                </div>
                <SegmentedControl
                  label="Planning year"
                  compact
                  fullWidth
                  value={profile.planningYear}
                  options={PLANNING_YEAR_OPTIONS}
                  onChange={(year) => updateLifeProfileField("planningYear", toFullCalendarYear(year))}
                />
              </div>
              <NumberField
                id="lp-gross-primary"
                label="Your Annual Gross"
                unit="€"
                compact
                min={0}
                step={1000}
                value={profile.primaryAnnualGrossEur}
                onChange={(num) => updateLifeProfileField("primaryAnnualGrossEur", toGrossSalary(num))}
              />
              <ToggleSwitch
                id="lp-has-partner"
                label="Include partner income"
                checked={profile.hasPartner}
                plain
                onChange={(checked) => updateLifeProfileField("hasPartner", checked)}
              />
              {profile.hasPartner && (
                <>
                  <ToggleSwitch
                    id="lp-married-joint"
                    topicId="joint-assessment"
                    label="Married joint assessment (§ 26 EStG)"
                    checked={profile.isMarriedJointAssessment}
                    plain
                    onChange={(checked) => updateLifeProfileField("isMarriedJointAssessment", checked)}
                  />
                  <NumberField
                    id="lp-gross-partner"
                    label="Partner Annual Gross"
                    unit="€"
                    compact
                    min={0}
                    step={1000}
                    value={profile.partnerAnnualGrossEur}
                    onChange={(num) => updateLifeProfileField("partnerAnnualGrossEur", toGrossSalary(num))}
                  />
                </>
              )}
              <NumberField
                id="lp-children"
                label="Minor Children"
                compact
                min={0}
                max={10}
                step={1}
                value={profile.dependentChildrenCount}
                onChange={(num) => updateLifeProfileField("dependentChildrenCount", Math.floor(num))}
              />
              <ChoiceSelect
                id="lp-german"
                label="German Language Level"
                compact
                value={profile.germanLevel}
                options={GERMAN_LEVEL_OPTIONS}
                onChange={(value) => updateLifeProfileField("germanLevel", toGermanLanguageLevel(value))}
              />
            </div>

            <div className="ui-card life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <CompanyCarMobilityIcon size={16} />
                  <span>Company Car</span>
                </h3>
                <a className="ui-btn ui-btn--sm ui-btn--tint" href={calculatorPath(AppId.CompanyCar)}>
                  Open
                </a>
              </div>
              <ToggleSwitch
                id="lp-has-car"
                topicId="company-car"
                label="Include company car"
                checked={profile.hasCompanyCar}
                plain
                onChange={(checked) => updateLifeProfileField("hasCompanyCar", checked)}
              />
              <NumberField
                id="lp-car-price"
                topicId="car-list-price"
                label="List Price"
                unit="€"
                compact
                min={5000}
                step={1000}
                value={profile.companyCarListPriceEur}
                onChange={(num) => updateLifeProfileField("companyCarListPriceEur", toEuroAmount(num))}
              />
              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Car Type</span>
                </div>
                <SegmentedControl
                  label="Company car type"
                  compact
                  fullWidth
                  value={profile.companyCarPowertrain}
                  options={CAR_POWERTRAIN_OPTIONS}
                  onChange={(value) => updateLifeProfileField("companyCarPowertrain", value)}
                />
              </div>
              <NumberField
                id="lp-commute-km"
                label="One-Way Commute"
                unit="km"
                compact
                min={0}
                max={250}
                step={1}
                value={profile.commuteOneWayKm}
                onChange={(num) => updateLifeProfileField("commuteOneWayKm", num)}
              />
            </div>

            <div className="ui-card life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <SolarEnergyIcon size={16} />
                  <span>Solar</span>
                </h3>
                <a className="ui-btn ui-btn--sm ui-btn--tint" href={calculatorPath(AppId.SolarEnergy)}>
                  Open
                </a>
              </div>
              <ToggleSwitch
                id="lp-plans-solar"
                topicId="solar"
                label="Include solar"
                checked={profile.plansSolarPv}
                plain
                onChange={(checked) => updateLifeProfileField("plansSolarPv", checked)}
              />
              <NumberField
                id="lp-solar-kwp"
                topicId="solar-yield"
                label="System Size"
                unit="kWp"
                compact
                min={0.4}
                max={100}
                step={0.5}
                value={profile.solarCapacityKwp}
                onChange={(num) => updateLifeProfileField("solarCapacityKwp", num)}
              />
              <NumberField
                id="lp-solar-cost"
                label="System Cost"
                unit="€"
                compact
                min={500}
                step={500}
                value={profile.solarSystemCostNetEur}
                onChange={(num) => updateLifeProfileField("solarSystemCostNetEur", toEuroAmount(num))}
              />
              <NumberField
                id="lp-solar-kwh"
                label="Annual Electricity Use"
                unit="kWh"
                compact
                min={500}
                step={250}
                value={profile.annualHouseholdElectricityKwh}
                onChange={(num) => updateLifeProfileField("annualHouseholdElectricityKwh", num)}
              />
            </div>

            <div className="ui-card life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <HomeAcquisitionIcon size={16} />
                  <span>Home Purchase</span>
                </h3>
                <a className="ui-btn ui-btn--sm ui-btn--tint" href={calculatorPath(AppId.Housing)}>
                  Open
                </a>
              </div>
              <ToggleSwitch
                id="lp-plans-home"
                topicId="kfw-300"
                label="Include home purchase"
                checked={profile.plansHomePurchase}
                plain
                onChange={(checked) => updateLifeProfileField("plansHomePurchase", checked)}
              />
              <ChoiceSelect
                id="lp-state"
                label="Federal State"
                compact
                value={profile.federalState}
                options={FEDERAL_STATE_OPTIONS}
                onChange={(value) => updateLifeProfileField("federalState", toGermanFederalState(value))}
              />
              <NumberField
                id="lp-home-price"
                label="Target Purchase Price"
                unit="€"
                compact
                min={10000}
                step={10000}
                value={profile.targetPropertyPriceEur}
                onChange={(num) => updateLifeProfileField("targetPropertyPriceEur", toEuroAmount(num))}
              />
              <NumberField
                id="lp-equity"
                label="Available Equity"
                unit="€"
                compact
                min={0}
                step={5000}
                value={profile.availableEquityEur}
                onChange={(num) => updateLifeProfileField("availableEquityEur", toEuroAmount(num))}
              />
            </div>
          </div>

          <div className="life-profile-panel__legal-bar">
            <span>
              Laws &amp; rules used: {overview.governingLawIds.length} laws ·{" "}
              {overview.consumedParameterIds.length} parameters
            </span>
            <div className="life-profile-panel__law-pills">
              <LawRefLink lawId={LawId.AufenthG_18g} label="AufenthG § 18g" />
              <LawRefLink lawId={LawId.EStG_6_1_4} label="EStG § 6 Abs. 1 Nr. 4" />
              <LawRefLink lawId={LawId.EEG_48} label="EEG § 48" />
              <LawRefLink lawId={LawId.KfW_300} label="KfW 300" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
