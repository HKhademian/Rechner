import type {
  JSX,
} from "preact";
import {
  useEffect,
  useMemo,
  useState,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  DismissIcon,
} from "#components/Icons";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  toEuroAmount,
  toPercentageRate,
  toSimulationMonth,
} from "#engine/types";
import {
  type DisasterShockConfig,
  DisasterKind,
  LifePersonKey,
  SolvencyVerdict,
  toDisasterKind,
} from "#engine/lifeSimulator/types";
import {
  DISASTER_PRESETS,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  evaluateCommitmentAffordability,
} from "#engine/lifeSimulator/commitmentAffordability";
import {
  customDisasterShocks,
  disasterTriggerMonth,
  lifeWorkbenchPlan,
  useCustomDisasterMode,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  flushLifeWorkbenchCalculations,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  closeCustomDisasterModal,
  customDisasterModalOpen,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

/**
 * Custom Life Disaster Builder & Multi-Disaster Affordability Matrix modal.
 * Lets users compose compound shocks (e.g. Fired 9m + €10k emergency + +€250/mo rent hike)
 * and compare Safe Rent & Max Safe Mortgage ceilings across all 6 standard disasters.
 */
export function CustomDisasterModal(): JSX.Element | null {
  const open = customDisasterModalOpen.value;
  const plan = lifeWorkbenchPlan.value;
  const horizon = plan.baseline.horizonMonths;
  const trigger = disasterTriggerMonth.value;

  const [incomeShockKind, setIncomeShockKind] = useState<DisasterKind>(DisasterKind.EmployerTermination);
  const [durationMonths, setDurationMonths] = useState(9);
  const [triggerMonthInput, setTriggerMonthInput] = useState(Number(trigger));
  const [severanceEur, setSeveranceEur] = useState(0);
  const [emergencyLumpSumEur, setEmergencyLumpSumEur] = useState(8000);
  const [monthlyRentJumpEur, setMonthlyRentJumpEur] = useState(0);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        closeCustomDisasterModal();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const matrixRows = useMemo(() => {
    if (!open) {
      return [];
    }
    return DISASTER_PRESETS.map((preset) => {
      const aff = evaluateCommitmentAffordability(plan, preset.buildShocks(trigger));
      return {
        id: preset.id,
        label: preset.shortLabel,
        verdict: aff.verdict,
        minCash: aff.minLiquidCashEur,
        headroom: aff.maxSafeAdditionalMonthlyCommitmentEur,
        safeRent: aff.maxSafeTotalRentEur,
        maxLoan: aff.impliedMaxLoanAmountEur,
      };
    });
  }, [open, plan, trigger]);

  if (!open) {
    return null;
  }

  const handleApplyCustom = (): void => {
    const m = toSimulationMonth(Math.max(1, Math.min(horizon, Math.trunc(triggerMonthInput))));
    const shocks: DisasterShockConfig[] = [
      Object.freeze({
        id: "CUSTOM-INCOME",
        kind: incomeShockKind,
        label: `Custom ${incomeShockKind} (${durationMonths}m)`,
        triggerMonth: m,
        durationMonths: Math.max(1, Math.trunc(durationMonths)),
        personKey: incomeShockKind === DisasterKind.PartnerIncomeLoss
          ? LifePersonKey.Partner
          : LifePersonKey.Primary,
        severanceGross: severanceEur > 0 ? toEuroAmount(severanceEur) : undefined,
        reemploymentSalaryRatio: toPercentageRate(0.95),
      }),
    ];
    if (emergencyLumpSumEur > 0) {
      shocks.push(Object.freeze({
        id: "CUSTOM-EMERGENCY",
        kind: DisasterKind.LumpSumEmergency,
        label: `Custom €${emergencyLumpSumEur} Emergency`,
        triggerMonth: m,
        durationMonths: 1,
        personKey: LifePersonKey.Primary,
        lumpSumCost: toEuroAmount(emergencyLumpSumEur),
      }));
    }
    if (monthlyRentJumpEur > 0) {
      shocks.push(Object.freeze({
        id: "CUSTOM-RENT-JUMP",
        kind: DisasterKind.HousingCostShock,
        label: `Custom +€${monthlyRentJumpEur}/mo Cost Jump`,
        triggerMonth: m,
        durationMonths: 1,
        personKey: LifePersonKey.Primary,
        monthlyCostIncrease: toEuroAmount(monthlyRentJumpEur),
      }));
    }

    customDisasterShocks.value = Object.freeze(shocks);
    useCustomDisasterMode.value = true;
    disasterTriggerMonth.value = m;
    flushLifeWorkbenchCalculations();
    closeCustomDisasterModal();
  };

  return (
    <div
      className="lpw-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Custom Life Disaster & Affordability Matrix"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeCustomDisasterModal();
        }
      }}
    >
      <div className="lpw-modal">
        <div className="lpw-drawer__header">
          <h2 className="lpw-drawer__title">Custom Disaster &amp; Affordability Matrix</h2>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Ghost}
            onClick={closeCustomDisasterModal}
            aria-label="Close Custom Disaster modal"
          >
            <DismissIcon size={14} />
          </Button>
        </div>

        <div className="lpw-modal__body">
          <h3 className="lpw-card__title">1. Compose Compound Shock</h3>
          <div className="lpw-field-grid">
            <div className="lpw-field">
              <label htmlFor="lpw-cd-kind">Primary Shock</label>
              <select
                id="lpw-cd-kind"
                value={incomeShockKind}
                onChange={(e) => setIncomeShockKind(toDisasterKind(e.currentTarget.value))}
              >
                <option value={DisasterKind.EmployerTermination}>Fired (Immediate ALG I)</option>
                <option value={DisasterKind.VoluntaryResignation}>Resigned (12w Sperrzeit)</option>
                <option value={DisasterKind.LongTermIllness}>Long-Term Illness (Krankengeld)</option>
                <option value={DisasterKind.PartnerIncomeLoss}>Partner Job Loss (ALG I)</option>
              </select>
            </div>

            <div className="lpw-field">
              <label htmlFor="lpw-cd-trigger">Trigger Month (1..{horizon})</label>
              <input
                id="lpw-cd-trigger"
                type="number"
                min={1}
                max={horizon}
                value={triggerMonthInput}
                onInput={(e) => setTriggerMonthInput(Number(e.currentTarget.value) || 1)}
              />
            </div>

            <div className="lpw-field">
              <label htmlFor="lpw-cd-dur">Income Gap (Months)</label>
              <input
                id="lpw-cd-dur"
                type="number"
                min={1}
                max={24}
                value={durationMonths}
                onInput={(e) => setDurationMonths(Number(e.currentTarget.value) || 1)}
              />
            </div>

            <div className="lpw-field">
              <label htmlFor="lpw-cd-sev">Severance Gross (€, 0 = auto)</label>
              <input
                id="lpw-cd-sev"
                type="number"
                min={0}
                step={1000}
                value={severanceEur}
                onInput={(e) => setSeveranceEur(Number(e.currentTarget.value) || 0)}
              />
            </div>

            <div className="lpw-field">
              <label htmlFor="lpw-cd-emerg">+ Emergency Lump Sum (€)</label>
              <input
                id="lpw-cd-emerg"
                type="number"
                min={0}
                step={1000}
                value={emergencyLumpSumEur}
                onInput={(e) => setEmergencyLumpSumEur(Number(e.currentTarget.value) || 0)}
              />
            </div>

            <div className="lpw-field">
              <label htmlFor="lpw-cd-rent">+ Monthly Cost Jump (€/mo)</label>
              <input
                id="lpw-cd-rent"
                type="number"
                min={0}
                step={50}
                value={monthlyRentJumpEur}
                onInput={(e) => setMonthlyRentJumpEur(Number(e.currentTarget.value) || 0)}
              />
            </div>
          </div>

          <h3 className="lpw-card__title">2. Affordability Matrix Across All Disasters (at M{trigger})</h3>
          <div className="lpw-table-wrap">
            <table className="lpw-table">
              <thead>
                <tr>
                  <th>Disaster</th>
                  <th>Verdict</th>
                  <th className="lpw-num">Min Cash</th>
                  <th className="lpw-num">Headroom</th>
                  <th className="lpw-num">Safe Rent</th>
                  <th className="lpw-num">Max Loan</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((r) => {
                  const tone = r.verdict === SolvencyVerdict.Resilient
                    ? BadgeTone.Gain
                    : r.verdict === SolvencyVerdict.Tight
                      ? BadgeTone.Warning
                      : BadgeTone.Loss;
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.label}</strong></td>
                      <td><Badge tone={tone}>{r.verdict}</Badge></td>
                      <td className="lpw-num">{formatEur(r.minCash)}</td>
                      <td className={`lpw-num${r.headroom >= 0 ? " lpw-gain" : " lpw-loss"}`}>
                        {r.headroom >= 0 ? `+${formatEur(r.headroom)}` : formatEur(r.headroom)}
                      </td>
                      <td className="lpw-num">{formatEur(r.safeRent)}</td>
                      <td className="lpw-num">{formatEur(r.maxLoan)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lpw-modal__footer">
          <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={closeCustomDisasterModal}>
            Close
          </Button>
          <Button size={ButtonSize.Sm} variant={ButtonVariant.Primary} onClick={handleApplyCustom}>
            Apply Custom Disaster
          </Button>
        </div>
      </div>
    </div>
  );
}
