import "./NetPayWorkspace.css";
import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  useSignal,
} from "@preact/signals";
import germanStates from "../data/germanStates.json" with { type: "json" };
import {
  LiveColumnImport,
} from "#components/CalculatorColumnTools";
import {
  CalculationSummary,
  PayrollEvidenceSummary,
  TaxableIncomeSummary,
} from "#components/CalculatorResultSummaries";
import {
  SaveConfigurationIcon,
} from "#components/Icons";
import PayrollPersonalInputs from "#components/PayrollPersonalInputs";
import TaxSettings from "#components/TaxSettings";
import LawRefLink from "#components/laws/LawRefLink";
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
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  LawGroupId,
  LawId,
} from "#engine/laws/types";
import {
  CalculatorGrossField,
  grossInputForPeriod,
} from "#engine/tax/calculatorGrossPeriod";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
import {
  HouseholdRelationship,
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import {
  SalaryPeriod,
  TaxClass,
  toChildrenCount,
  toGrossSalary,
  toMonthDuration,
} from "#engine/types";
import {
  type CalculatorInputs,
  CALCULATOR_PARTNER_SHORTCUT,
  assessmentMode,
  calculateScenarioData,
  calculatorInvalidInputs,
  calculatorViewPeriod,
  children,
  deductions,
  getCurrentInputs,
  hasChurchTax,
  hasPartner,
  partnerHasChurchTax,
  partnerPersonalPayroll,
  partnerSalariesPerYear,
  partnerState,
  partnerTaxBracket,
  partnerWorkingMonths,
  personalPayroll,
  relationshipStatus,
  salariesPerYear,
  saveScenario,
  savedScenarios,
  setLiveRelationshipStatus,
  setLiveTaxBracket,
  state,
  taxBracket,
  updateLiveGrossInput,
  workingMonths,
} from "#store/calculatorStore";
import {
  parseVerifiedTaxYear,
  selectedTaxYear,
  verifiedTaxYears,
} from "#store/taxConfigStore";

const STATE_OPTIONS = germanStates.map((value) => ({
  value,
  label: value,
}));

const TAX_CLASS_SEGMENTS = Object.values(TaxClass).map((label, index) => ({
  value: String(index + 1),
  label,
  title: `Tax Class ${label}`,
}));

const RELATIONSHIP_OPTIONS = [
  {
    value: HouseholdRelationship.Unspecified,
    label: "Select relationship…",
  },
  {
    value: HouseholdRelationship.Single,
    label: "Single",
  },
  {
    value: HouseholdRelationship.UnmarriedPartners,
    label: "Unmarried partners",
  },
  {
    value: HouseholdRelationship.MarriedOrCivilPartners,
    label: "Married / registered partners",
  },
  {
    value: HouseholdRelationship.QualifyingWidowed,
    label: "Qualifying widowed (§ 32a Abs. 6)",
  },
];

const WORKING_MONTH_PRESETS = [
  {
    value: 12,
    label: "12 mo",
  },
  {
    value: 6,
    label: "6 mo",
  },
];

const SALARIES_PER_YEAR_PRESETS = [
  {
    value: 12,
    label: "12",
  },
  {
    value: 13,
    label: "13",
  },
  {
    value: 13.5,
    label: "13.5",
  },
  {
    value: 14,
    label: "14",
  },
];

/**
 * Primary single-input workspace and sticky live summary for German Net Pay.
 * Keeps individual data entry crisp and separates scenario comparison below.
 */
export default function NetPayWorkspace(): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const liveImportRevision = useSignal(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const invalidMap = calculatorInvalidInputs.value;
  const trackValidity = (id: string) => (valid: boolean): void => {
    const key = `live-${id}`;
    const prev = calculatorInvalidInputs.peek();
    if (Boolean(prev[key]) === !valid) {
      return;
    }
    const next = { ...prev };
    if (valid) {
      delete next[key];
    }
    else {
      next[key] = true;
    }
    calculatorInvalidInputs.value = next;
  };
  const hasInvalidLive = Object.keys(invalidMap).some((key) => key.startsWith("live-"));

  const period = calculatorViewPeriod.value;
  const isMonthly = period === SalaryPeriod.Monthly;
  const inputs = getCurrentInputs();
  const data = deductions.value;

  const canSelectAssessment =
    inputs.relationshipStatus === HouseholdRelationship.MarriedOrCivilPartners ||
    (Boolean(inputs.hasPartner) &&
      (!inputs.relationshipStatus || inputs.relationshipStatus === HouseholdRelationship.Unspecified)) ||
    inputs.assessmentMode === TaxAssessment.Joint;
  const showsAssessment = Boolean(inputs.hasPartner) || canSelectAssessment;

  const validateLive = <K extends keyof CalculatorInputs>(field: K) => (value: CalculatorInputs[K]): void => {
    calculateScenarioData({
      ...getCurrentInputs(),
      [field]: value,
    });
  };

  const primaryGrossValue = grossInputForPeriod(inputs, CalculatorGrossField.Primary, period);
  const partnerGrossValue = grossInputForPeriod(inputs, CalculatorGrossField.Partner, period);

  const primaryEquivalent = isMonthly
    ? `${formatEur(data.person1.grossYearly)} / yr`
    : `${formatEur(data.person1.grossYearly / Math.max(1, workingMonths.value || 12))} / mo`;
  const partnerEquivalent = data.partner
    ? isMonthly
      ? `${formatEur(data.partner.grossYearly)} / yr`
      : `${formatEur(data.partner.grossYearly / Math.max(1, partnerWorkingMonths.value || 12))} / mo`
    : undefined;

  const divider = isMonthly ? 12 : 1;
  const unitSuffix = isMonthly ? "€ / mo" : "€ / yr";
  const householdNetDisplay = data.household.netIncome / divider;
  const householdGrossDisplay = data.household.grossYearly / divider;
  const householdDeductionsDisplay = data.household.totalDeductions / divider;
  const taxDisplay = (data.person1.tax + (data.partner?.tax ?? 0)) / divider;
  const healthCareDisplay = (data.person1.healthCare + (data.partner?.healthCare ?? 0)) / divider;
  const pensionDisplay = (data.person1.pension + (data.partner?.pension ?? 0)) / divider;
  const deductionRate = data.household.grossYearly > 0
    ? `${((data.household.totalDeductions / data.household.grossYearly) * 100).toFixed(1)}%`
    : "—";

  const p1Paycheck = data.person1.netIncome / (data.person1.salariesReceived || 12);
  const p2Paycheck = data.partner ? data.partner.netIncome / (data.partner.salariesReceived || 12) : 0;
  const householdPaycheck = p1Paycheck + p2Paycheck;

  const handleSaveScenario = (): void => {
    const count = savedScenarios.peek().length + 1;
    saveScenario(`Scenario ${count}`, "", deductions.peek());
  };

  return (
    <div className="netpay-workspace" key={`live-workspace-${liveImportRevision.value}`}>
      <section className="netpay-form-stack" aria-label="Net pay calculation inputs">
        <div className="ui-card">
          <div className="ui-card__header">
            <div>
              <h2 className="ui-card__title">Household &amp; Tax Year</h2>
              <p className="ui-card__subtitle">Configure filing year, household status, and optional partner payroll.</p>
            </div>
            <SegmentedControl
              label="Tax year"
              value={selectedTaxYear.value}
              onChange={(year) => {
                selectedTaxYear.value = parseVerifiedTaxYear(year);
              }}
              options={verifiedTaxYears.map((year) => ({
                value: parseVerifiedTaxYear(year),
                label: String(year),
              }))}
            />
          </div>

          <div className="netpay-setup-grid">
            <ChoiceSelect
              id="live-relationship"
              label="Relationship"
              value={relationshipStatus.value}
              options={RELATIONSHIP_OPTIONS}
              onChange={(next) => {
                setLiveRelationshipStatus(next);
              }}
            />
            <ToggleSwitch
              id="live-has-partner"
              label="Partner 2 payroll"
              hint="Include partner salary & splitting"
              checked={hasPartner.value}
              onChange={(checked) => {
                validateLive("hasPartner")(checked);
                hasPartner.value = checked;
              }}
            />
          </div>

          {showsAssessment && (
            <div className="netpay-assessment-row">
              <div className="ui-field">
                <span className="ui-field__label">
                  Income tax assessment{" "}
                  <LawRefLink
                    lawId={LawId.EStG_26}
                    groupId={LawGroupId.EStG_TaxSplitting}
                    label="(§ 26 EStG)"
                    title="Joint assessment rules for eligible spouses or registered partners"
                  />
                </span>
              </div>
              <SegmentedControl
                compact
                label="Income tax assessment"
                value={assessmentMode.value}
                onChange={(mode) => {
                  validateLive("assessmentMode")(mode);
                  assessmentMode.value = mode;
                }}
                options={[
                  {
                    value: TaxAssessment.Unspecified,
                    label: "Auto",
                  },
                  {
                    value: TaxAssessment.Individual,
                    label: "Individual",
                  },
                  {
                    value: TaxAssessment.Joint,
                    label: "Joint",
                    disabled: !canSelectAssessment,
                  },
                ]}
              />
            </div>
          )}
        </div>

        <div className="ui-card">
          <div className="ui-card__header">
            <div>
              <h2 className="ui-card__title">Your Income &amp; Payroll</h2>
              <p className="ui-card__subtitle">Enter salary for one person or adjust payroll schedule.</p>
            </div>
          </div>

          <div className="netpay-person-fields">
            <NumberField
              id="live-form-gross"
              label="Gross Income"
              value={primaryGrossValue}
              unit={unitSuffix}
              asideValue={`≈ ${primaryEquivalent}`}
              min={0}
              step={0.01}
              construct={toGrossSalary}
              onValidityChange={trackValidity("grossIncome")}
              onChange={(amount) => updateLiveGrossInput(CalculatorGrossField.Primary, amount)}
            />

            <div className="ui-field">
              <div className="netpay-class-field__head">
                <span className="ui-field__label">Tax Class (Steuerklasse)</span>
                <LawRefLink
                  lawId={CALCULATOR_PARTNER_SHORTCUT.lawId}
                  groupId={LawGroupId.EStG_PayrollWithholding}
                  label="Class rules"
                  title={`${CALCULATOR_PARTNER_SHORTCUT.classes.join("/")} enable partner payroll (§ 38b EStG)`}
                />
              </div>
              <SegmentedControl
                fullWidth
                label="Tax Class"
                value={taxBracket.value}
                options={TAX_CLASS_SEGMENTS}
                onChange={(value) => {
                  setLiveTaxBracket(value);
                }}
              />
            </div>

            <div className="netpay-row-2">
              <ChoiceSelect
                id="live-form-state"
                label="Federal State"
                value={state.value}
                options={STATE_OPTIONS}
                onChange={(next) => {
                  validateLive("state")(next);
                  state.value = next;
                }}
              />
              <div className="ui-field">
                <span className="ui-field__label">Religious Affiliation</span>
                <ToggleSwitch
                  id="live-form-church"
                  label="Church Tax"
                  checked={hasChurchTax.value}
                  onChange={(checked) => {
                    validateLive("hasChurchTax")(checked);
                    hasChurchTax.value = checked;
                  }}
                />
              </div>
            </div>

            <div className="netpay-row-3">
              <NumberField
                id="live-form-children"
                label="Children"
                value={children.value}
                min={0}
                step={1}
                construct={toChildrenCount}
                onValidityChange={trackValidity("children")}
                onChange={(value) => {
                  validateLive("children")(value);
                  children.value = value;
                }}
              />
              <NumberField
                id="live-form-months"
                label="Working Months"
                value={workingMonths.value}
                unit="mo"
                min={0}
                max={12}
                step={1}
                construct={toMonthDuration}
                presets={WORKING_MONTH_PRESETS}
                onValidityChange={trackValidity("workingMonths")}
                onChange={(value) => {
                  validateLive("workingMonths")(value);
                  workingMonths.value = value;
                }}
              />
              <NumberField
                id="live-form-salaries"
                label="Salaries / Year"
                value={salariesPerYear.value}
                min={0}
                step={0.5}
                construct={toSalaryPaymentCount}
                presets={SALARIES_PER_YEAR_PRESETS}
                onValidityChange={trackValidity("salariesPerYear")}
                onChange={(value) => {
                  validateLive("salariesPerYear")(value);
                  salariesPerYear.value = value;
                }}
              />
            </div>
          </div>
        </div>

        {hasPartner.value && (
          <div className="ui-card">
            <div className="ui-card__header">
              <div>
                <h2 className="ui-card__title">Partner Income &amp; Payroll</h2>
                <p className="ui-card__subtitle">Second earner details for household splitting and net split.</p>
              </div>
            </div>

            <div className="netpay-person-fields">
              <NumberField
                id="live-form-partner-gross"
                label="Partner Gross Income"
                value={partnerGrossValue}
                unit={unitSuffix}
                asideValue={partnerEquivalent ? `≈ ${partnerEquivalent}` : undefined}
                min={0}
                step={0.01}
                construct={toGrossSalary}
                onValidityChange={trackValidity("partnerGrossIncome")}
                onChange={(amount) => updateLiveGrossInput(CalculatorGrossField.Partner, amount)}
              />

              <div className="ui-field">
                <span className="ui-field__label">Partner Tax Class</span>
                <SegmentedControl
                  fullWidth
                  label="Partner Tax Class"
                  value={partnerTaxBracket.value}
                  options={TAX_CLASS_SEGMENTS}
                  onChange={(value) => {
                    validateLive("partnerTaxBracket")(value);
                    partnerTaxBracket.value = value;
                  }}
                />
              </div>

              <div className="netpay-row-2">
                <ChoiceSelect
                  id="live-form-partner-state"
                  label="Partner Federal State"
                  value={partnerState.value}
                  options={STATE_OPTIONS}
                  onChange={(next) => {
                    validateLive("partnerState")(next);
                    partnerState.value = next;
                  }}
                />
                <div className="ui-field">
                  <span className="ui-field__label">Religious Affiliation</span>
                  <ToggleSwitch
                    id="live-form-partner-church"
                    label="Partner Church Tax"
                    checked={partnerHasChurchTax.value}
                    onChange={(checked) => {
                      validateLive("partnerHasChurchTax")(checked);
                      partnerHasChurchTax.value = checked;
                    }}
                  />
                </div>
              </div>

              <div className="netpay-row-2">
                <NumberField
                  id="live-form-partner-months"
                  label="Partner Working Months"
                  value={partnerWorkingMonths.value}
                  unit="mo"
                  min={0}
                  max={12}
                  step={1}
                  construct={toMonthDuration}
                  presets={WORKING_MONTH_PRESETS}
                  onValidityChange={trackValidity("partnerWorkingMonths")}
                  onChange={(value) => {
                    validateLive("partnerWorkingMonths")(value);
                    partnerWorkingMonths.value = value;
                  }}
                />
                <NumberField
                  id="live-form-partner-salaries"
                  label="Partner Salaries / Year"
                  value={partnerSalariesPerYear.value}
                  min={0}
                  step={0.5}
                  construct={toSalaryPaymentCount}
                  presets={SALARIES_PER_YEAR_PRESETS}
                  onValidityChange={trackValidity("partnerSalariesPerYear")}
                  onChange={(value) => {
                    validateLive("partnerSalariesPerYear")(value);
                    partnerSalariesPerYear.value = value;
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <details className="ui-card netpay-advanced">
          <summary className="netpay-advanced__summary">
            <span>Detailed Insurer &amp; Allowance Settings</span>
            <span className="netpay-advanced__summary-hint">Zusatzbeitrag, age relief, ELStAM factor</span>
          </summary>
          <div className="netpay-advanced__body">
            <TaxSettings onValidityChange={trackValidity("factor")} />
            <PayrollPersonalInputs
              id="primary"
              summaryLabel="Your payroll details"
              options={personalPayroll}
              onValidityChange={(id, valid) => trackValidity(id)(valid)}
            />
            {hasPartner.value && (
              <PayrollPersonalInputs
                id="partner"
                summaryLabel="Partner payroll details"
                options={partnerPersonalPayroll}
                onValidityChange={(id, valid) => trackValidity(id)(valid)}
              />
            )}
          </div>
        </details>
      </section>

      <aside className="ui-card netpay-summary-card" aria-label="Live net pay summary">
        <div className="netpay-summary__top">
          <span className="netpay-summary__badge">Live Estimate</span>
          <span className="netpay-summary__period-label">
            {data.annualTaxableIncome.rules.calendarYear} · {isMonthly ? "Monthly Avg." : "Annual"}
          </span>
        </div>

        {hasInvalidLive && (
          <p className="netpay-summary__status" role="status">
            Showing last valid inputs. Fix highlighted fields.
          </p>
        )}

        <div className="netpay-summary__hero">
          <span className="netpay-summary__hero-label">
            {hasPartner.value ? "Household Net Take-Home" : "Net Take-Home Pay"}
          </span>
          <strong className="netpay-summary__hero-value">
            {formatEur(householdNetDisplay)} <small>{isMonthly ? "/ mo" : "/ yr"}</small>
          </strong>
          <p className="netpay-summary__hero-sub">
            {isMonthly
              ? `Per paycheck: ${formatEur(householdPaycheck)} · Annual: ${formatEur(data.household.netIncome)}`
              : `Avg monthly: ${formatEur(data.household.netIncome / 12)} / mo`}
          </p>
        </div>

        <dl className="netpay-summary__rows">
          <div>
            <dt>Gross Income</dt>
            <dd>{formatEur(householdGrossDisplay)}</dd>
          </div>
          <div>
            <dt>Wage Tax (Lohnsteuer)</dt>
            <dd>{formatEur(taxDisplay)}</dd>
          </div>
          <div>
            <dt>Health &amp; Care Insurance</dt>
            <dd>{formatEur(healthCareDisplay)}</dd>
          </div>
          <div>
            <dt>Pension &amp; Social Security</dt>
            <dd>{formatEur(pensionDisplay)}</dd>
          </div>
          <div>
            <dt>Total Deductions</dt>
            <dd>{formatEur(householdDeductionsDisplay)} ({deductionRate})</dd>
          </div>
          {hasPartner.value && data.partner && (
            <>
              <div>
                <dt>Your Net ({isMonthly ? "avg/mo" : "yr"})</dt>
                <dd>{formatEur(data.person1.netIncome / divider)}</dd>
              </div>
              <div>
                <dt>Partner Net ({isMonthly ? "avg/mo" : "yr"})</dt>
                <dd>{formatEur(data.partner.netIncome / divider)}</dd>
              </div>
            </>
          )}
        </dl>

        <div className="netpay-summary__actions">
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            disabled={hasInvalidLive}
            onClick={handleSaveScenario}
          >
            <SaveConfigurationIcon size={16} />
            <span>Save to comparison</span>
          </button>
          <LiveColumnImport
            onImported={() => {
              liveImportRevision.value += 1;
              calculatorInvalidInputs.value = Object.fromEntries(
                Object.entries(calculatorInvalidInputs.peek()).filter(([id]) => !id.startsWith("live-")),
              );
            }}
          />
        </div>

        <div className="netpay-summary__details">
          <TaxableIncomeSummary data={data} id="live" context="Live Calculation" />
          <CalculationSummary data={data} id="live" context="Live Calculation" />
          <PayrollEvidenceSummary data={data} id="live" context="Live Calculation" />
        </div>
      </aside>
    </div>
  );
}
