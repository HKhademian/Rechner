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
import {
  Button,
  ButtonSize,
  ButtonVariant,
  ModalDialog,
  ModalDialogSize,
  NumberField,
  SegmentedControl,
  TextField,
  ToggleSwitch,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import PayrollPersonalInputs from "#components/PayrollPersonalInputs";
import {
  type PayrollOptions,
} from "#engine/tax/payroll";
import {
  AnnualSalariesCount,
  BonusDistributionPreset,
  SalaryInputMode,
  TargetPerson,
  toCalendarMonth,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
  toRaiseId,
  toSimulationMonth,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  addWorkbenchSalaryRaise,
  removeWorkbenchSalaryRaise,
  setWorkbenchPayrollOptions,
  setWorkbenchSalariesCount,
  updateWorkbenchState,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  WorkbenchGranularModal,
  activeWorkbenchModal,
  closeWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Section 1 Granular Modal: Annual raises, dated salary changes, 13th-15th bonuses, other income & payroll details. */
export function IncomeAdjustmentsModal(): JSX.Element {
  const open = activeWorkbenchModal.value === WorkbenchGranularModal.Income;
  const s = workbenchState.value;

  const [raiseMonth, setRaiseMonth] = useState(13);
  const [raiseTarget, setRaiseTarget] = useState<TargetPerson>(TargetPerson.Both);
  const [raisePercent, setRaisePercent] = useState(5);
  const [raiseReason, setRaiseReason] = useState("Promotion / Pay step");
  const [bonusPreset, setBonusPreset] = useState<BonusDistributionPreset>(BonusDistributionPreset.Ratio40_60);

  const husbandPayrollSig = useSignal<PayrollOptions>(s.husbandPayrollOptions ?? {});
  const wifePayrollSig = useSignal<PayrollOptions>(s.wifePayrollOptions ?? {});

  useEffect(() => {
    if (open) {
      husbandPayrollSig.value = s.husbandPayrollOptions ?? {};
      wifePayrollSig.value = s.wifePayrollOptions ?? {};
    }
  }, [open, s.husbandPayrollOptions, s.wifePayrollOptions]);

  const handleClose = (): void => {
    setWorkbenchPayrollOptions("husband", husbandPayrollSig.peek());
    setWorkbenchPayrollOptions("wife", wifePayrollSig.peek());
    closeWorkbenchModal();
  };

  const handleAddRaise = (): void => {
    const safeMonth = Math.max(1, Math.min(s.simulationDurationMonths, Math.round(raiseMonth)));
    const cal = simMonthToCalendarDate(
      toSimulationMonth(safeMonth),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    addWorkbenchSalaryRaise({
      raiseId: toRaiseId(`WB-RAISE-${Date.now()}`),
      effectiveSimulationMonth: toSimulationMonth(safeMonth),
      effectiveCalendarMonth: cal.calendarMonth,
      effectiveCalendarYear: cal.calendarYear,
      targetPerson: raiseTarget,
      percentageIncrease: toPercentageRate(Math.max(-0.5, Math.min(2, raisePercent / 100))),
      reason: raiseReason.trim() || `Salary adjustment M${safeMonth}`,
    });
  };

  return (
    <ModalDialog
      open={open}
      onClose={handleClose}
      size={ModalDialogSize.Large}
      eyebrow="Section 1 · Granular Income Options"
      title="Raises, Bonuses, Other Income & Payroll"
      subtitle="Add optional deviations from the steady-salary baseline. Active adjustments appear as removable chips in Section 1."
      footer={(
        <Button variant={ButtonVariant.Primary} onClick={handleClose}>
          Done
        </Button>
      )}
    >
      <div className="plw-modal-stack">
        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">Annual Automatic Raises</h3>
          <ToggleSwitch
            id="plw-enable-annual-raises"
            label="Apply compounding annual salary raise"
            checked={s.enableSalaryRaises}
            onChange={(checked) => updateWorkbenchState((prev) => ({
              ...prev,
              enableSalaryRaises: checked,
              annualSalaryRaisePercent: checked && prev.annualSalaryRaisePercent === 0 ? 0.03 : prev.annualSalaryRaisePercent,
            }))}
          />
          {s.enableSalaryRaises && (
            <NumberField
              id="plw-annual-raise-pct"
              label="Annual raise rate"
              unit="%"
              compact
              min={0}
              max={25}
              step={0.5}
              value={Number((s.annualSalaryRaisePercent * 100).toFixed(1))}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                annualSalaryRaisePercent: Math.max(0, Math.min(0.25, val / 100)),
              }))}
            />
          )}
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">Dated Salary Changes (Promotions / Career Steps)</h3>
          <div className="plw-modal-grid">
            <NumberField
              id="plw-new-raise-month"
              label="Effective Plan Month"
              unit="M"
              compact
              min={1}
              max={s.simulationDurationMonths}
              step={1}
              value={raiseMonth}
              onChange={setRaiseMonth}
            />
            <NumberField
              id="plw-new-raise-pct"
              label="Percentage Change"
              unit="%"
              compact
              min={-50}
              max={100}
              step={1}
              value={raisePercent}
              onChange={setRaisePercent}
            />
          </div>
          <div className="plw-modal-grid">
            <SegmentedControl
              compact
              fullWidth
              label="Target partner for salary change"
              value={raiseTarget}
              options={[
                {
                  value: TargetPerson.Both,
                  label: "Both",
                },
                {
                  value: TargetPerson.Husband,
                  label: "Partner 1",
                },
                {
                  value: TargetPerson.Wife,
                  label: "Partner 2",
                },
              ]}
              onChange={setRaiseTarget}
            />
            <TextField
              id="plw-new-raise-reason"
              label="Label"
              compact
              value={raiseReason}
              onChange={setRaiseReason}
            />
          </div>
          <div className="plw-toolbar">
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={handleAddRaise}>
              + Add dated salary change
            </Button>
          </div>
          {s.customSalaryRaises.length > 0 && (
            <div className="plw-modal-list">
              {s.customSalaryRaises.map((item) => {
                const pct = item.percentageIncrease ?? 0;
                return (
                  <div key={item.raiseId} className="plw-modal-item">
                    <span>
                      <strong>M{item.effectiveSimulationMonth}</strong> ({item.targetPerson}):{" "}
                      {pct >= 0 ? "+" : ""}{(pct * 100).toFixed(1)}% · {item.reason}
                    </span>
                    <Button
                      size={ButtonSize.Sm}
                      variant={ButtonVariant.Ghost}
                      onClick={() => removeWorkbenchSalaryRaise(item.raiseId)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">
            13th–15th Salary, Performance Bonus &amp; Other Income (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_2c }}>§ 2c BEEG</WikiRefLink>
            )
          </h3>
          <div className="plw-modal-grid">
            <div className="plw-inline-control">
              <span className="plw-inline-control__label">Partner 1 Salaries / Year</span>
              <SegmentedControl
                compact
                fullWidth
                label="Partner 1 annual salaries count"
                value={s.husbandSalariesCount ?? AnnualSalariesCount.Twelve}
                options={[
                  {
                    value: AnnualSalariesCount.Twelve,
                    label: "12×",
                  },
                  {
                    value: AnnualSalariesCount.Thirteen,
                    label: "13×",
                  },
                  {
                    value: AnnualSalariesCount.Fourteen,
                    label: "14×",
                  },
                  {
                    value: AnnualSalariesCount.Fifteen,
                    label: "15×",
                  },
                ]}
                onChange={(val) => setWorkbenchSalariesCount("husband", val, bonusPreset)}
              />
            </div>
            <div className="plw-inline-control">
              <span className="plw-inline-control__label">Partner 2 Salaries / Year</span>
              <SegmentedControl
                compact
                fullWidth
                label="Partner 2 annual salaries count"
                value={s.wifeSalariesCount ?? AnnualSalariesCount.Twelve}
                options={[
                  {
                    value: AnnualSalariesCount.Twelve,
                    label: "12×",
                  },
                  {
                    value: AnnualSalariesCount.Thirteen,
                    label: "13×",
                  },
                  {
                    value: AnnualSalariesCount.Fourteen,
                    label: "14×",
                  },
                  {
                    value: AnnualSalariesCount.Fifteen,
                    label: "15×",
                  },
                ]}
                onChange={(val) => setWorkbenchSalariesCount("wife", val, bonusPreset)}
              />
            </div>
          </div>

          <SegmentedControl
            compact
            label="13th salary payout split"
            value={bonusPreset}
            options={[
              {
                value: BonusDistributionPreset.Ratio40_60,
                label: "40% May / 60% Nov",
              },
              {
                value: BonusDistributionPreset.Ratio50_50,
                label: "50% Jun / 50% Nov",
              },
              {
                value: BonusDistributionPreset.Single100Nov,
                label: "100% Nov",
              },
              {
                value: BonusDistributionPreset.Single100Dec,
                label: "100% Dec",
              },
            ]}
            onChange={(next) => {
              setBonusPreset(next);
              if ((s.husbandSalariesCount ?? 12) === 13) {
                setWorkbenchSalariesCount("husband", AnnualSalariesCount.Thirteen, next);
              }
              if ((s.wifeSalariesCount ?? 12) === 13) {
                setWorkbenchSalariesCount("wife", AnnualSalariesCount.Thirteen, next);
              }
            }}
          />

          <div className="plw-modal-grid">
            <NumberField
              id="plw-annual-bonus"
              label="Annual Performance Bonus (Gross)"
              unit="€/yr"
              compact
              min={0}
              max={100000}
              step={500}
              value={s.annualBonusGross}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                annualBonusGross: toGrossSalary(Math.max(0, val)),
              }))}
            />
            <NumberField
              id="plw-bonus-month"
              label="Bonus Payout Month"
              unit="mo"
              compact
              min={1}
              max={12}
              step={1}
              value={s.annualBonusMonth}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                annualBonusMonth: toCalendarMonth(Math.max(1, Math.min(12, Math.round(val)))),
              }))}
            />
          </div>

          <NumberField
            id="plw-other-income"
            label="Other Monthly Income (Investments / Rental / Dividends)"
            unit="€/mo"
            compact
            min={0}
            max={25000}
            step={50}
            value={s.investmentReturnMonthly}
            asideValue={s.investmentReturnMonthly > 0 ? `+${formatEur(s.investmentReturnMonthly * 12)}/yr` : undefined}
            onChange={(val) => updateWorkbenchState((prev) => ({
              ...prev,
              investmentReturnMonthly: toEuroAmount(Math.max(0, val)),
            }))}
          />
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">Per-Partner Statutory Payroll &amp; Gross / Net Basis</h3>
          <SegmentedControl
            compact
            label="Salary input basis"
            value={s.salaryInputMode}
            options={[
              {
                value: SalaryInputMode.Gross,
                label: "Gross Salary (Auto-derive statutory net)",
              },
              {
                value: SalaryInputMode.Net,
                label: "Manual Net Salary",
              },
            ]}
            onChange={(next) => updateWorkbenchState((prev) => ({
              ...prev,
              salaryInputMode: next,
            }))}
          />
          <div className="plw-modal-grid">
            <PayrollPersonalInputs
              id="plw-husband-payroll"
              options={husbandPayrollSig}
              showLocation
              summaryLabel="Partner 1 Payroll Details (Church tax, Insurer rate, Age)"
            />
            <PayrollPersonalInputs
              id="plw-wife-payroll"
              options={wifePayrollSig}
              showLocation
              summaryLabel="Partner 2 Payroll Details (Church tax, Insurer rate, Age)"
            />
          </div>
          {s.salaryInputMode === SalaryInputMode.Net && (
            <ToggleSwitch
              id="plw-manual-net-beeg"
              label="Treat manual net salary directly as BEEG assessment net (§ 2e BEEG)"
              checked={s.assumeManualNetIsAssessmentNet === true}
              onChange={(checked) => updateWorkbenchState((prev) => ({
                ...prev,
                assumeManualNetIsAssessmentNet: checked,
              }))}
            />
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
