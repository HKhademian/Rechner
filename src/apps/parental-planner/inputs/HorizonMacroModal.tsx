import type {
  JSX,
} from "preact";
import {
  useEffect,
} from "preact/hooks";
import {
  useSignal,
} from "@preact/signals";
import {
  Button,
  ButtonVariant,
  ModalDialog,
  ModalDialogSize,
  NumberField,
  SegmentedControl,
  ToggleSwitch,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import HouseholdIncomeInputs from "#components/HouseholdIncomeInputs";
import {
  type HouseholdTaxableIncomeInput,
  toCalendarMonth,
  toChildrenCount,
  toEuroAmount,
  toFullCalendarYear,
  toMonthDuration,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  setWorkbenchHouseholdTaxableIncome,
  updateWorkbenchState,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  WorkbenchGranularModal,
  WorkbenchTab,
  activeWorkbenchModal,
  activeWorkbenchTab,
  closeWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Section 5 Granular Modal: Simulation Horizon, Prior Children, Kindergeld, § 1(8) ZvE Cap & Macro Indexing. */
export function HorizonMacroModal(): JSX.Element {
  const open = activeWorkbenchModal.value === WorkbenchGranularModal.Macro;
  const s = workbenchState.value;

  const zveSig = useSignal<readonly HouseholdTaxableIncomeInput[]>(s.householdTaxableIncome ?? []);

  useEffect(() => {
    if (open) {
      zveSig.value = s.householdTaxableIncome ?? [];
    }
  }, [open, s.householdTaxableIncome]);

  const handleClose = (): void => {
    setWorkbenchHouseholdTaxableIncome(zveSig.peek());
    closeWorkbenchModal();
  };

  return (
    <ModalDialog
      open={open}
      onClose={handleClose}
      size={ModalDialogSize.Large}
      eyebrow="Section 5 · Horizon, Eligibility Cap & Macro Assumptions"
      title="Horizon, Prior-Year Taxable Income (ZvE) & Macro Indexing"
      subtitle="Control the simulation start date, planning horizon, § 1(8) BEEG €175,000 couple ZvE eligibility cap, and bracket indexing."
      footer={(
        <Button variant={ButtonVariant.Primary} onClick={handleClose}>
          Done
        </Button>
      )}
    >
      <div className="plw-modal-stack">
        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">Simulation Horizon &amp; Start Date</h3>
          <div className="plw-modal-grid">
            <NumberField
              id="plw-start-year"
              label="Start Year"
              compact
              min={2024}
              max={2035}
              step={1}
              value={s.startCalendarYear}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                startCalendarYear: toFullCalendarYear(Math.max(2024, Math.min(2035, Math.round(val)))),
              }))}
            />
            <NumberField
              id="plw-start-month"
              label="Start Month"
              compact
              min={1}
              max={12}
              step={1}
              value={s.startCalendarMonth}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                startCalendarMonth: toCalendarMonth(Math.max(1, Math.min(12, Math.round(val)))),
              }))}
            />
          </div>
          <div className="plw-inline-control">
            <span className="plw-inline-control__label">Forecast Duration</span>
            <SegmentedControl
              compact
              fullWidth
              label="Simulation duration in months"
              value={s.simulationDurationMonths}
              options={[
                {
                  value: toMonthDuration(36),
                  label: "3 Years (36M)",
                },
                {
                  value: toMonthDuration(60),
                  label: "5 Years (60M)",
                },
                {
                  value: toMonthDuration(72),
                  label: "6 Years (72M)",
                },
                {
                  value: toMonthDuration(120),
                  label: "10 Years (120M)",
                },
              ]}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                simulationDurationMonths: val,
              }))}
            />
          </div>
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">
            Prior-Year Household Taxable Income (ZvE) for{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_1 }}>§ 1 Abs. 8 BEEG</WikiRefLink>{" "}
            (Cap:{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Parameter,
              id: ParameterId.Benefit_CoupleTaxableIncomeMaximum }}>€175,000</WikiRefLink>
            )
          </h3>
          <HouseholdIncomeInputs
            values={zveSig}
            suggestedYear={toFullCalendarYear(s.startCalendarYear)}
          />
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">
            Family Size,{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Topic,
              id: "child-benefit" }}>Kindergeld</WikiRefLink>{" "}
            &amp; Tax Settlement Month
          </h3>
          <div className="plw-modal-grid">
            <NumberField
              id="plw-existing-children"
              label="Existing Children Before Plan Start"
              compact
              min={0}
              max={10}
              step={1}
              value={s.existingChildrenCount ?? 0}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                existingChildrenCount: toChildrenCount(Math.max(0, Math.min(10, Math.round(val)))),
              }))}
            />
            <NumberField
              id="plw-kindergeld-rate"
              label="Kindergeld per Child"
              unit="€/mo"
              compact
              min={0}
              max={600}
              step={5}
              value={s.kindergeldPerChild}
              onChange={(val) => updateWorkbenchState((prev) => ({
                ...prev,
                kindergeldPerChild: toEuroAmount(Math.max(0, val)),
              }))}
            />
          </div>
          <NumberField
            id="plw-tax-return-month"
            label="Annual Tax Return Settlement Month (§ 36 EStG)"
            unit="mo"
            compact
            min={1}
            max={12}
            step={1}
            value={s.taxReturnMonth}
            onChange={(val) => updateWorkbenchState((prev) => ({
              ...prev,
              taxReturnMonth: toCalendarMonth(Math.max(1, Math.min(12, Math.round(val)))),
            }))}
          />
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">Macro Inflation &amp; Future Tax Bracket Indexing</h3>
          <ToggleSwitch
            id="plw-index-brackets"
            label="Index future-year EStG tax brackets to combat cold progression"
            checked={s.indexFutureTaxBrackets === true}
            onChange={(checked) => updateWorkbenchState((prev) => ({
              ...prev,
              indexFutureTaxBrackets: checked,
            }))}
          />
          <p className="plw-card__hint">
            To customize the CPI inflation rate or statutory parameters directly, open the{" "}
            <button
              type="button"
              className="plw-cell-btn"
              onClick={() => {
                handleClose();
                activeWorkbenchTab.value = WorkbenchTab.Rules;
              }}
            >
              Rules &amp; Parameters tab
            </button>
            .
          </p>
        </div>
      </div>
    </ModalDialog>
  );
}
