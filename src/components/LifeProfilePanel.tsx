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
import LawRefLink from "#components/laws/LawRefLink";
import {
  VehiclePowertrain,
  toVehiclePowertrain,
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
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

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
    <section className="life-profile-panel" aria-labelledby="life-profile-heading">
      <div className="life-profile-panel__header">
        <div className="life-profile-panel__title-group">
          <span className="life-profile-panel__badge-icon" aria-hidden="true">
            <UnifiedLifeProfileIcon size={22} />
          </span>
          <div>
            <h2 id="life-profile-heading">Unified Household Life Profile (Cross-Calculator Engine)</h2>
            <p className="life-profile-panel__subtitle">
              Enter your household, mobility, housing, and solar baseline once to project live statutory results across every specialist calculator.
            </p>
          </div>
        </div>
        <div className="life-profile-panel__controls">
          {showSummaryLink && (
            <a className="life-profile-panel__summary-link" href={lifeProfilePath()}>
              <span>Full 6-Calculator Summary</span>
            </a>
          )}
          <button
            type="button"
            className="life-profile-panel__toggle"
            aria-expanded={expanded}
            aria-controls="life-profile-editor"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <CollapseSectionIcon size={15} /> : <ExpandSectionIcon size={15} />}
            <span>{expanded ? "Hide Shared Inputs" : "Edit Shared Profile"}</span>
          </button>
          <button
            type="button"
            className="life-profile-panel__reset"
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
            <span>EU Blue Card &amp; PR</span>
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
            <span>Company Car &amp; EV</span>
            <LawRefLink lawId={LawId.EStG_6_1_4} label="§ 6 EStG" variant="badge" />
          </span>
          <span className="life-profile-panel__kpi-value life-profile-panel__kpi-value--gain">
            {profile.hasCompanyCar
              ? `${formatEur(overview.companyCar.annualTaxSavingsVsIce)}/yr saved vs ICE`
              : "Not active"}
          </span>
          <span className="life-profile-panel__kpi-note">
            {profile.hasCompanyCar
              ? `Monthly taxable ${formatEur(overview.companyCar.totalMonthlyImputedBenefit)}`
              : "Enable company car to evaluate"}
          </span>
        </div>

        <div className="life-profile-panel__kpi">
          <span className="life-profile-panel__kpi-label">
            <span>Solar PV &amp; Housing</span>
            <LawRefLink lawId={LawId.KfW_300} label="KfW 300" variant="badge" />
          </span>
          <span className="life-profile-panel__kpi-value life-profile-panel__kpi-value--gain">
            {profile.plansSolarPv
              ? `${formatEur(overview.solarEnergy.annualNetCashBenefit)}/yr PV`
              : "PV off"}{" "}
            · {overview.housing.kfw300Eligible ? `KfW ${formatEur(overview.housing.kfw300MaxSubsidizedLoanEur)}` : "No KfW 300"}
          </span>
          <span className="life-profile-panel__kpi-note">
            Combined annual upside {formatEur(overview.combinedAnnualBonusAndSavingsEur)}/yr
          </span>
        </div>
      </div>

      {expanded && (
        <div id="life-profile-editor" className="life-profile-panel__body">
          <div className="life-profile-panel__sections">
            <div className="life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <VisaResidenceIcon size={16} />
                  <span>Household &amp; Residence</span>
                </h3>
                <a className="life-profile-panel__section-link" href={calculatorPath(AppId.Visa)}>
                  Open Visa Calc
                </a>
              </div>
              <label className="life-profile-panel__field" for="lp-year">
                <span>Planning Year</span>
                <select
                  id="lp-year"
                  value={profile.planningYear}
                  onChange={(event) => updateLifeProfileField("planningYear", toFullCalendarYear(Number(event.currentTarget.value)))}
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </label>
              <label className="life-profile-panel__field" for="lp-gross-primary">
                <span>Primary Annual Gross (EUR)</span>
                <input
                  id="lp-gross-primary"
                  type="number"
                  min={0}
                  step={1000}
                  value={profile.primaryAnnualGrossEur}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateLifeProfileField("primaryAnnualGrossEur", toGrossSalary(num));
                    }
                  }}
                />
              </label>
              <label className="life-profile-panel__checkbox" for="lp-has-partner">
                <input
                  id="lp-has-partner"
                  type="checkbox"
                  checked={profile.hasPartner}
                  onChange={(event) => updateLifeProfileField("hasPartner", event.currentTarget.checked)}
                />
                <span>Include Partner Income</span>
              </label>
              {profile.hasPartner && (
                <>
                  <label className="life-profile-panel__checkbox" for="lp-married-joint">
                    <input
                      id="lp-married-joint"
                      type="checkbox"
                      checked={profile.isMarriedJointAssessment}
                      onChange={(event) => updateLifeProfileField("isMarriedJointAssessment", event.currentTarget.checked)}
                    />
                    <span>Married / Registered Partners (§ 26 EStG splitting)</span>
                  </label>
                  <label className="life-profile-panel__field" for="lp-gross-partner">
                    <span>Partner Annual Gross (EUR)</span>
                    <input
                      id="lp-gross-partner"
                      type="number"
                      min={0}
                      step={1000}
                      value={profile.partnerAnnualGrossEur}
                      onInput={(event) => {
                        const num = Number(event.currentTarget.value);
                        if (Number.isFinite(num) && num >= 0) {
                          updateLifeProfileField("partnerAnnualGrossEur", toGrossSalary(num));
                        }
                      }}
                    />
                  </label>
                </>
              )}
              <label className="life-profile-panel__field" for="lp-children">
                <span>Dependent Children</span>
                <input
                  id="lp-children"
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={profile.dependentChildrenCount}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateLifeProfileField("dependentChildrenCount", Math.floor(num));
                    }
                  }}
                />
              </label>
              <label className="life-profile-panel__field" for="lp-german">
                <span>German Language Level (§ 18c PR)</span>
                <select
                  id="lp-german"
                  value={profile.germanLevel}
                  onChange={(event) => updateLifeProfileField("germanLevel", toGermanLanguageLevel(event.currentTarget.value))}
                >
                  <option value={GermanLanguageLevel.NoneOrBasic}>Below A1</option>
                  <option value={GermanLanguageLevel.A1}>A1 Basic (27 mo PR)</option>
                  <option value={GermanLanguageLevel.B1Plus}>B1+ Intermediate (21 mo PR)</option>
                </select>
              </label>
            </div>

            <div className="life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <CompanyCarMobilityIcon size={16} />
                  <span>Company Car &amp; Commute</span>
                </h3>
                <a className="life-profile-panel__section-link" href={calculatorPath(AppId.CompanyCar)}>
                  Open Car Calc
                </a>
              </div>
              <label className="life-profile-panel__checkbox" for="lp-has-car">
                <input
                  id="lp-has-car"
                  type="checkbox"
                  checked={profile.hasCompanyCar}
                  onChange={(event) => updateLifeProfileField("hasCompanyCar", event.currentTarget.checked)}
                />
                <span>Company Car Included</span>
              </label>
              <label className="life-profile-panel__field" for="lp-car-price">
                <span>Gross List Price BLP (EUR)</span>
                <input
                  id="lp-car-price"
                  type="number"
                  min={5000}
                  step={1000}
                  value={profile.companyCarListPriceEur}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 5000) {
                      updateLifeProfileField("companyCarListPriceEur", toEuroAmount(num));
                    }
                  }}
                />
              </label>
              <label className="life-profile-panel__field" for="lp-powertrain">
                <span>Powertrain Valuation Tier</span>
                <select
                  id="lp-powertrain"
                  value={profile.companyCarPowertrain}
                  onChange={(event) => updateLifeProfileField("companyCarPowertrain", toVehiclePowertrain(event.currentTarget.value))}
                >
                  <option value={VehiclePowertrain.PureElectricEv}>0.25% Pure EV (under BLP cap)</option>
                  <option value={VehiclePowertrain.PlugInHybrid}>0.50% Plug-in Hybrid</option>
                  <option value={VehiclePowertrain.CombustionIce}>1.00% Combustion ICE</option>
                </select>
              </label>
              <label className="life-profile-panel__field" for="lp-commute-km">
                <span>One-Way Commute (km)</span>
                <input
                  id="lp-commute-km"
                  type="number"
                  min={0}
                  max={250}
                  step={1}
                  value={profile.commuteOneWayKm}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateLifeProfileField("commuteOneWayKm", num);
                    }
                  }}
                />
              </label>
            </div>

            <div className="life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <SolarEnergyIcon size={16} />
                  <span>Rooftop Solar PV</span>
                </h3>
                <a className="life-profile-panel__section-link" href={calculatorPath(AppId.SolarEnergy)}>
                  Open Solar Calc
                </a>
              </div>
              <label className="life-profile-panel__checkbox" for="lp-plans-solar">
                <input
                  id="lp-plans-solar"
                  type="checkbox"
                  checked={profile.plansSolarPv}
                  onChange={(event) => updateLifeProfileField("plansSolarPv", event.currentTarget.checked)}
                />
                <span>Include Solar PV Yield</span>
              </label>
              <label className="life-profile-panel__field" for="lp-solar-kwp">
                <span>PV Array Capacity (kWp)</span>
                <input
                  id="lp-solar-kwp"
                  type="number"
                  min={0.4}
                  max={100}
                  step={0.5}
                  value={profile.solarCapacityKwp}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0.4) {
                      updateLifeProfileField("solarCapacityKwp", num);
                    }
                  }}
                />
              </label>
              <label className="life-profile-panel__field" for="lp-solar-cost">
                <span>System Purchase Cost (EUR)</span>
                <input
                  id="lp-solar-cost"
                  type="number"
                  min={500}
                  step={500}
                  value={profile.solarSystemCostNetEur}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateLifeProfileField("solarSystemCostNetEur", toEuroAmount(num));
                    }
                  }}
                />
              </label>
              <label className="life-profile-panel__field" for="lp-solar-kwh">
                <span>Annual Electricity Use (kWh)</span>
                <input
                  id="lp-solar-kwh"
                  type="number"
                  min={500}
                  step={250}
                  value={profile.annualHouseholdElectricityKwh}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateLifeProfileField("annualHouseholdElectricityKwh", num);
                    }
                  }}
                />
              </label>
            </div>

            <div className="life-profile-panel__section">
              <div className="life-profile-panel__section-head">
                <h3>
                  <HomeAcquisitionIcon size={16} />
                  <span>Housing &amp; KfW 300</span>
                </h3>
                <a className="life-profile-panel__section-link" href={calculatorPath(AppId.Housing)}>
                  Open Housing Calc
                </a>
              </div>
              <label className="life-profile-panel__checkbox" for="lp-plans-home">
                <input
                  id="lp-plans-home"
                  type="checkbox"
                  checked={profile.plansHomePurchase}
                  onChange={(event) => updateLifeProfileField("plansHomePurchase", event.currentTarget.checked)}
                />
                <span>Include Home Acquisition</span>
              </label>
              <label className="life-profile-panel__field" for="lp-state">
                <span>Federal State (§ 11 GrEStG)</span>
                <select
                  id="lp-state"
                  value={profile.federalState}
                  onChange={(event) => updateLifeProfileField("federalState", toGermanFederalState(event.currentTarget.value))}
                >
                  {Object.entries(GERMAN_FEDERAL_STATE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="life-profile-panel__field" for="lp-home-price">
                <span>Target Purchase Price (EUR)</span>
                <input
                  id="lp-home-price"
                  type="number"
                  min={50000}
                  step={10000}
                  value={profile.targetPropertyPriceEur}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 10000) {
                      updateLifeProfileField("targetPropertyPriceEur", toEuroAmount(num));
                    }
                  }}
                />
              </label>
              <label className="life-profile-panel__field" for="lp-equity">
                <span>Available Equity (EUR)</span>
                <input
                  id="lp-equity"
                  type="number"
                  min={0}
                  step={5000}
                  value={profile.availableEquityEur}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateLifeProfileField("availableEquityEur", toEuroAmount(num));
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="life-profile-panel__legal-bar">
            <span>
              Derived Statutory Provenance: {overview.governingLawIds.length} laws &amp;{" "}
              {overview.consumedParameterIds.length} parameters active
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
