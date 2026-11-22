import type {
  JSX,
} from "preact";
import {
  NumberField,
  SegmentedControl,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  AnnualSalariesCount,
  SalaryInputMode,
  SalaryPeriod,
  TaxClass,
  toEuroAmount,
  toGrossSalary,
  toNetSalary,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  removeWorkbenchSalaryRaise,
  setWorkbenchInitialTaxClasses,
  setWorkbenchSalariesCount,
  updateWorkbenchState,
  workbenchDerivedSpousalSet,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  WorkbenchGranularModal,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

const TaxPairPreset = {
  ThreeFive: "III_V",
  FourFour: "IV_IV",
  FourFourFactor: "IV_IV_FACTOR",
  FiveThree: "V_III",
} as const;
type TaxPairPreset = (typeof TaxPairPreset)[keyof typeof TaxPairPreset];

function currentTaxPair(
  hClass: TaxClass | undefined,
  wClass: TaxClass | undefined,
  useFactor: boolean | undefined,
): TaxPairPreset {
  if (hClass === TaxClass.V && wClass === TaxClass.III) {
    return TaxPairPreset.FiveThree;
  }
  if (hClass === TaxClass.IV && wClass === TaxClass.IV) {
    return useFactor ? TaxPairPreset.FourFourFactor : TaxPairPreset.FourFour;
  }
  return TaxPairPreset.ThreeFive;
}

/** Card 1: Calm steady-salary Household & Income matching the approved sketch. */
export function HouseholdIncomeCard(): JSX.Element {
  const s = workbenchState.value;
  const spousal = workbenchDerivedSpousalSet.value;
  const isYearly = s.salaryPeriod === SalaryPeriod.Yearly;
  const isGross = s.salaryInputMode === SalaryInputMode.Gross;
  const hCount = s.husbandSalariesCount ?? AnnualSalariesCount.Twelve;
  const wCount = s.wifeSalariesCount ?? AnnualSalariesCount.Twelve;
  const hFactor = isYearly ? hCount : 1;
  const wFactor = isYearly ? wCount : 1;

  const husbandDisplay = isGross
    ? Math.round(s.husbandGross * hFactor)
    : Math.round(s.husbandClass3Net * (isYearly ? 12 : 1));
  const wifeDisplay = isGross
    ? Math.round(s.wifeGross * wFactor)
    : Math.round(s.wifeClass5FullTimeNet * (isYearly ? 12 : 1));

  const pair = currentTaxPair(s.husbandInitialTaxClass, s.wifeInitialTaxClass, s.useInitialTaxFactor);
  const hasBonus = s.annualBonusGross > 0;
  const hasInvestment = s.investmentReturnMonthly > 0;
  const hasAnnualRaise = s.enableSalaryRaises && s.annualSalaryRaisePercent > 0;
  const hasCustomAdjustments =
    hasAnnualRaise ||
    s.customSalaryRaises.length > 0 ||
    hCount > 12 ||
    wCount > 12 ||
    hasBonus ||
    hasInvestment ||
    !isGross;

  const handleTaxPairChange = (next: TaxPairPreset): void => {
    switch (next) {
      case TaxPairPreset.FourFour:
        setWorkbenchInitialTaxClasses(TaxClass.IV, TaxClass.IV, false);
        break;
      case TaxPairPreset.FourFourFactor:
        setWorkbenchInitialTaxClasses(TaxClass.IV, TaxClass.IV, true);
        break;
      case TaxPairPreset.FiveThree:
        setWorkbenchInitialTaxClasses(TaxClass.V, TaxClass.III, false);
        break;
      default:
        setWorkbenchInitialTaxClasses(TaxClass.III, TaxClass.V, false);
        break;
    }
  };

  const hPreviewNet = pair === TaxPairPreset.FiveThree
    ? spousal.husbandClass5Net
    : pair === TaxPairPreset.FourFour || pair === TaxPairPreset.FourFourFactor
      ? spousal.husbandClass4Net
      : spousal.husbandClass3Net;
  const wPreviewNet = pair === TaxPairPreset.FiveThree
    ? spousal.wifeClass3FullTimeNet
    : pair === TaxPairPreset.FourFour || pair === TaxPairPreset.FourFourFactor
      ? spousal.wifeClass4FullTimeNet
      : spousal.wifeClass5FullTimeNet;

  return (
    <section className="plw-card" aria-labelledby="plw-sec-income">
      <div className="plw-card__header">
        <div className="plw-card__title-group">
          <h2 id="plw-sec-income" className="plw-card__title">1. Household &amp; Income</h2>
          <p className="plw-card__subtitle">
            {hasCustomAdjustments
              ? `Customized · ${hCount}× / ${wCount}× · ${isGross ? "Gross" : "Manual Net"}`
              : "Steady baseline salaries · 12× / yr"}
          </p>
        </div>
        <SegmentedControl
          compact
          label="Salary period"
          value={s.salaryPeriod}
          options={[
            {
              value: SalaryPeriod.Monthly,
              label: "Monthly",
            },
            {
              value: SalaryPeriod.Yearly,
              label: "Yearly",
            },
          ]}
          onChange={(next) => updateWorkbenchState((prev) => ({ ...prev,
            salaryPeriod: next }))}
        />
      </div>

      <div className="plw-field-grid">
        <div className="plw-inline-control">
          <NumberField
            id="plw-husband-salary"
            label={isGross ? "Partner 1 Gross" : "Partner 1 Net (III)"}
            unit={isYearly ? "€/yr" : "€/mo"}
            compact
            min={0}
            max={isYearly ? 500000 : 40000}
            step={isYearly ? 1000 : 100}
            value={husbandDisplay}
            onChange={(val) => {
              const safe = Math.max(0, val);
              if (isGross) {
                updateWorkbenchState((prev) => ({ ...prev,
                  husbandGross: toGrossSalary(Math.round(safe / hFactor)) }));
              }
              else {
                updateWorkbenchState((prev) => ({ ...prev,
                  husbandClass3Net: toNetSalary(Math.round(safe / (isYearly ? 12 : 1))) }));
              }
            }}
          />
          <div className="plw-input-meta">
            <span>{s.husbandHours} h/wk</span>
            <span>Net ~{formatEur(hPreviewNet)}</span>
          </div>
        </div>

        <div className="plw-inline-control">
          <NumberField
            id="plw-wife-salary"
            label={isGross ? "Partner 2 (Birth) Gross" : "Partner 2 Net (V)"}
            unit={isYearly ? "€/yr" : "€/mo"}
            compact
            min={0}
            max={isYearly ? 500000 : 40000}
            step={isYearly ? 1000 : 100}
            value={wifeDisplay}
            onChange={(val) => {
              const safe = Math.max(0, val);
              if (isGross) {
                updateWorkbenchState((prev) => ({ ...prev,
                  wifeGross: toGrossSalary(Math.round(safe / wFactor)) }));
              }
              else {
                updateWorkbenchState((prev) => ({ ...prev,
                  wifeClass5FullTimeNet: toNetSalary(Math.round(safe / (isYearly ? 12 : 1))) }));
              }
            }}
          />
          <div className="plw-input-meta">
            <span>{s.wifeInitialHours} h/wk</span>
            <span>Net ~{formatEur(wPreviewNet)}</span>
          </div>
        </div>
      </div>

      <div className="plw-inline-control">
        <span className="plw-inline-control__label">
          Starting Tax Classes (
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.EStG_38b }}>§ 38b EStG</WikiRefLink>
          )
        </span>
        <SegmentedControl
          compact
          fullWidth
          label="Initial spousal tax class combination"
          value={pair}
          options={[
            {
              value: TaxPairPreset.ThreeFive,
              label: "III / V",
            },
            {
              value: TaxPairPreset.FourFour,
              label: "IV / IV",
            },
            {
              value: TaxPairPreset.FourFourFactor,
              label: "IV+F",
            },
            {
              value: TaxPairPreset.FiveThree,
              label: "V / III",
            },
          ]}
          onChange={handleTaxPairChange}
        />
      </div>

      {hasCustomAdjustments && (
        <div className="plw-chips" aria-label="Active income customizations">
          {!isGross && (
            <span className="plw-chip">
              Manual Net mode
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Switch back to Gross mode"
                onClick={() => updateWorkbenchState((prev) => ({ ...prev,
                  salaryInputMode: SalaryInputMode.Gross }))}
              >
                ×
              </button>
            </span>
          )}
          {hasAnnualRaise && (
            <span className="plw-chip">
              +{(s.annualSalaryRaisePercent * 100).toFixed(1)}%/yr raises
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Remove annual raises"
                onClick={() => updateWorkbenchState((prev) => ({ ...prev,
                  enableSalaryRaises: false,
                  annualSalaryRaisePercent: 0 }))}
              >
                ×
              </button>
            </span>
          )}
          {s.customSalaryRaises.map((item) => (
            <span key={item.raiseId} className="plw-chip">
              {item.reason || `M${item.effectiveSimulationMonth} raise`}
              <button
                type="button"
                className="plw-chip__remove"
                aria-label={`Remove ${item.reason || "salary change"}`}
                onClick={() => removeWorkbenchSalaryRaise(item.raiseId)}
              >
                ×
              </button>
            </span>
          ))}
          {hCount > 12 && (
            <span className="plw-chip">
              P1: {hCount}× salaries
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Reset Partner 1 to 12 salaries"
                onClick={() => setWorkbenchSalariesCount("husband", AnnualSalariesCount.Twelve)}
              >
                ×
              </button>
            </span>
          )}
          {wCount > 12 && (
            <span className="plw-chip">
              P2: {wCount}× salaries
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Reset Partner 2 to 12 salaries"
                onClick={() => setWorkbenchSalariesCount("wife", AnnualSalariesCount.Twelve)}
              >
                ×
              </button>
            </span>
          )}
          {hasBonus && (
            <span className="plw-chip">
              Bonus {formatEur(s.annualBonusGross)}/yr
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Remove annual bonus"
                onClick={() => updateWorkbenchState((prev) => ({ ...prev,
                  annualBonusGross: toGrossSalary(0) }))}
              >
                ×
              </button>
            </span>
          )}
          {hasInvestment && (
            <span className="plw-chip plw-chip--gain">
              Other +{formatEur(s.investmentReturnMonthly)}/mo
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Remove monthly other income"
                onClick={() => updateWorkbenchState((prev) => ({ ...prev,
                  investmentReturnMonthly: toEuroAmount(0) }))}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      <div className="plw-card__footer">
        <span>Need raises, 13th/14th bonus, investments?</span>
        <button
          type="button"
          className="plw-granular-btn plw-granular-btn--primary"
          onClick={() => openWorkbenchModal(WorkbenchGranularModal.Income)}
        >
          + Raises, bonuses &amp; income…
        </button>
      </div>
    </section>
  );
}
