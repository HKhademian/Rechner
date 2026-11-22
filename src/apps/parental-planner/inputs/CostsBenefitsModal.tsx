import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  Button,
  ButtonSize,
  ButtonVariant,
  ModalDialog,
  ModalDialogSize,
  NumberField,
  TextField,
  ToggleSwitch,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  type FederalStateKitaPresetId,
  FinancialEventCategory,
  toEuroAmount,
  toFinancialEventId,
  toPercentageRate,
  toSimulationMonth,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  getAllMunicipalDaycarePresets,
} from "#engine/benefits/childcare";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  addWorkbenchFinancialEvent,
  removeWorkbenchFinancialEvent,
  updateWorkbenchChildcarePlan,
  updateWorkbenchExtras,
  workbenchExtras,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchDeductibles,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  activeWorkbenchModal,
  closeWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Section 4 Granular Modal: Kita Municipal Presets, Regional Family Benefits, One-Off Events & §§ 9, 10, 35a Deductibles. */
export function CostsBenefitsModal(): JSX.Element {
  const open = activeWorkbenchModal.value === WorkbenchGranularModal.Costs;
  const s = workbenchState.value;
  const extras = workbenchExtras.value;
  const deductibles = displayedWorkbenchDeductibles.value;
  const presets = getAllMunicipalDaycarePresets();

  const [evMonth, setEvMonth] = useState(16);
  const [evAmount, setEvAmount] = useState(-1500);
  const [evTitle, setEvTitle] = useState("Baby equipment (Erstausstattung)");
  const [evCategory, setEvCategory] = useState<FinancialEventCategory>(FinancialEventCategory.BabyEquipment);

  const handleAddEvent = (): void => {
    const safeMonth = Math.max(1, Math.min(s.simulationDurationMonths, Math.round(evMonth)));
    const cal = simMonthToCalendarDate(
      toSimulationMonth(safeMonth),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    addWorkbenchFinancialEvent({
      eventId: toFinancialEventId(`WB-EV-${Date.now()}`),
      effectiveSimulationMonth: toSimulationMonth(safeMonth),
      effectiveCalendarMonth: cal.calendarMonth,
      effectiveCalendarYear: cal.calendarYear,
      amount: toEuroAmount(evAmount),
      category: evCategory,
      title: evTitle.trim() || "Custom Financial Event",
      description: evAmount >= 0 ? "User-added grant / inflow" : "User-added family expense",
    });
  };

  return (
    <ModalDialog
      open={open}
      onClose={closeWorkbenchModal}
      size={ModalDialogSize.Large}
      eyebrow="Section 4 · Granular Childcare, Benefits & Tax Credits"
      title="Kita Fees, Regional Benefits, One-Offs & Tax-Deductible Expenses"
      subtitle="Model municipal childcare fees, state family grants (e.g. Familiengeld), one-off events, and annual tax-deductible expenses."
      footer={(
        <Button variant={ButtonVariant.Primary} onClick={closeWorkbenchModal}>
          Done
        </Button>
      )}
    >
      <div className="plw-modal-stack">
        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">
            Childcare / Kita Fees (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_10_1_5 }}>§ 10(1)5 EStG</WikiRefLink>
            {" · "}
            <WikiRefLink target={{ kind: WikiRefKind.Parameter,
              id: ParameterId.Tax_ChildcareDeductibleFraction }}>80%</WikiRefLink>
            {" "}deductible)
          </h3>
          <ToggleSwitch
            id="plw-modal-kita-enabled"
            label="Enable Kita / daycare fee modeling"
            checked={s.childcarePlan?.enabled === true}
            onChange={(checked) => updateWorkbenchChildcarePlan({ enabled: checked })}
          />
          {s.childcarePlan?.enabled && (
            <>
              <div className="plw-inline-control">
                <label htmlFor="plw-kita-preset" className="plw-inline-control__label">
                  Municipality / Federal State Preset
                </label>
                <select
                  id="plw-kita-preset"
                  className="plw-select"
                  value={s.childcarePlan.presetId}
                  onChange={(event) => updateWorkbenchChildcarePlan({
                    presetId: event.currentTarget.value as FederalStateKitaPresetId,
                  })}
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="plw-modal-grid">
                <NumberField
                  id="plw-kita-start-age"
                  label="Start Child Age"
                  unit="mo"
                  compact
                  min={0}
                  max={72}
                  step={1}
                  value={s.childcarePlan.startAgeMonths}
                  onChange={(val) => updateWorkbenchChildcarePlan({ startAgeMonths: val })}
                />
                <NumberField
                  id="plw-kita-end-age"
                  label="End Child Age"
                  unit="mo"
                  compact
                  min={1}
                  max={168}
                  step={1}
                  value={s.childcarePlan.endAgeMonths}
                  onChange={(val) => updateWorkbenchChildcarePlan({ endAgeMonths: val })}
                />
              </div>
              <NumberField
                id="plw-kita-custom-fee"
                label="Custom Monthly Fee per Child (when Custom preset selected)"
                unit="€/mo"
                compact
                min={0}
                max={2500}
                step={20}
                value={s.childcarePlan.customMonthlyFeePerChild}
                onChange={(val) => updateWorkbenchChildcarePlan({ customMonthlyFeePerChild: toEuroAmount(Math.max(0, val)) })}
              />
            </>
          )}
        </div>

        <div className="plw-modal-section">
          <div className="plw-toolbar">
            <h3 className="plw-modal-section__title">Optional Recurring Regional Family Benefit</h3>
            <Button
              size={ButtonSize.Sm}
              variant={ButtonVariant.Tint}
              onClick={() => updateWorkbenchExtras({
                regionalBenefitMonthly: toEuroAmount(250),
                regionalBenefitLabel: "Bayerisches Familiengeld (M13–36)",
              })}
            >
              Apply Bavaria Familiengeld (€250/mo)
            </Button>
          </div>
          <div className="plw-modal-grid">
            <NumberField
              id="plw-reg-benefit-amt"
              label="Monthly Amount (Child age 13–36m)"
              unit="€/mo"
              compact
              min={0}
              max={2000}
              step={25}
              value={extras.regionalBenefitMonthly}
              onChange={(val) => updateWorkbenchExtras({ regionalBenefitMonthly: toEuroAmount(Math.max(0, val)) })}
            />
            <TextField
              id="plw-reg-benefit-label"
              label="Benefit Label"
              compact
              value={extras.regionalBenefitLabel}
              onChange={(val) => updateWorkbenchExtras({ regionalBenefitLabel: val })}
            />
          </div>
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">
            Tax-Deductible Expenses &amp; Direct Credits (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_9a }}>§ 9a</WikiRefLink>
            {", "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_10 }}>§ 10</WikiRefLink>
            {", "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_35a }}>§ 35a EStG</WikiRefLink>
            )
          </h3>
          <div className="plw-modal-grid">
            <NumberField
              id="plw-deduct-werbung"
              label="Work Expenses (Werbungskosten, > €1,230 lump sum)"
              unit="€/yr"
              compact
              min={0}
              max={50000}
              step={100}
              value={extras.werbungskostenAnnual}
              onChange={(val) => updateWorkbenchExtras({ werbungskostenAnnual: toEuroAmount(Math.max(0, val)) })}
            />
            <NumberField
              id="plw-deduct-sonder"
              label="Special Expenses (Donations / Sonderausgaben)"
              unit="€/yr"
              compact
              min={0}
              max={50000}
              step={100}
              value={extras.sonderausgabenAnnual}
              onChange={(val) => updateWorkbenchExtras({ sonderausgabenAnnual: toEuroAmount(Math.max(0, val)) })}
            />
            <NumberField
              id="plw-deduct-household"
              label="Household Services Labor (§ 35a(2), 20% credit)"
              unit="€/yr"
              compact
              min={0}
              max={25000}
              step={100}
              value={extras.householdServicesLaborAnnual}
              onChange={(val) => updateWorkbenchExtras({ householdServicesLaborAnnual: toEuroAmount(Math.max(0, val)) })}
            />
            <NumberField
              id="plw-deduct-craftsmen"
              label="Home Craftsmen Labor (§ 35a(3), 20% up to €1,200)"
              unit="€/yr"
              compact
              min={0}
              max={10000}
              step={100}
              value={extras.craftsmenLaborAnnual}
              onChange={(val) => updateWorkbenchExtras({ craftsmenLaborAnnual: toEuroAmount(Math.max(0, val)) })}
            />
          </div>
          <NumberField
            id="plw-deduct-rate"
            label="Estimated Marginal Tax Rate (applied to §§ 9, 10 deductions)"
            unit="%"
            compact
            min={0}
            max={47.5}
            step={1}
            value={Math.round(extras.marginalTaxRate * 100)}
            onChange={(val) => updateWorkbenchExtras({ marginalTaxRate: toPercentageRate(Math.max(0, Math.min(0.475, val / 100))) })}
          />
          <div className="plw-modal-summary">
            <span>Estimated Annual Tax Refund (credited in Tax Return Month {s.taxReturnMonth})</span>
            <strong className="tabular-nums">+{formatEur(deductibles.totalEstimatedAnnualTaxRefund)} / yr</strong>
          </div>
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">One-Off Costs &amp; Grants (Cashflow Events)</h3>
          <div className="plw-modal-grid">
            <NumberField
              id="plw-ev-month"
              label="Plan Month"
              unit="M"
              compact
              min={1}
              max={s.simulationDurationMonths}
              step={1}
              value={evMonth}
              onChange={setEvMonth}
            />
            <NumberField
              id="plw-ev-amount"
              label="Amount (negative = cost, positive = grant)"
              unit="€"
              compact
              min={-100000}
              max={100000}
              step={100}
              value={evAmount}
              onChange={setEvAmount}
            />
          </div>
          <div className="plw-modal-grid">
            <TextField
              id="plw-ev-title"
              label="Event Title"
              compact
              value={evTitle}
              onChange={setEvTitle}
            />
            <div className="plw-inline-control">
              <label htmlFor="plw-ev-category" className="plw-inline-control__label">
                Category
              </label>
              <select
                id="plw-ev-category"
                className="plw-select"
                value={evCategory}
                onChange={(event) => setEvCategory(event.currentTarget.value as FinancialEventCategory)}
              >
                {Object.values(FinancialEventCategory).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="plw-toolbar">
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={handleAddEvent}>
              + Add one-off event
            </Button>
          </div>
          {s.customFinancialEvents.length > 0 && (
            <div className="plw-modal-list">
              {s.customFinancialEvents.map((ev) => (
                <div key={ev.eventId} className="plw-modal-item">
                  <span>
                    <strong>M{ev.effectiveSimulationMonth}</strong>: {ev.title} (
                    {ev.amount >= 0 ? "+" : ""}{formatEur(ev.amount)})
                  </span>
                  <Button
                    size={ButtonSize.Sm}
                    variant={ButtonVariant.Ghost}
                    onClick={() => removeWorkbenchFinancialEvent(ev.eventId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
