import "./SalaryChangeEditor.css";
import {
  type JSX,
} from "preact";
import OptionalNumberInput from "#components/OptionalNumberInput";
import {
  RemoveItemIcon,
} from "#components/Icons";
import {
  type SalaryRaiseAction,
  SalaryInputMode,
  TargetPerson,
  toTargetPerson,
  toGrossSalary,
  toPercentageRate,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
} from "#engine/types";
import {
  validateSalaryReplacement,
} from "#engine/simulator/salaryChange";
import {
  salaryInputMode,
  husbandGross,
  wifeGross,
  husbandHours,
  wifeInitialHours,
  startCalendarMonth,
  startCalendarYear,
  simulationDurationMonths,
  updateSalaryRaiseAction,
  removeSalaryRaiseAction,
} from "#store/elterngeldStore";

const SalaryChangeMode = { Gross: "gross",
  Percentage: "percentage",
  ManualNet: "manual-net" } as const;
type SalaryChangeMode = (typeof SalaryChangeMode)[keyof typeof SalaryChangeMode];
function toSalaryChangeMode(value: string): SalaryChangeMode {
  if (!Object.values(SalaryChangeMode).includes(value as SalaryChangeMode)) {
    throw new TypeError("Choose a supported salary change method.");
  }
  return value as SalaryChangeMode;
}

/** Edit the contract rate; the payroll engine applies working hours and deductions separately. */
export default function SalaryChangeEditor({ action, index }: { action: SalaryRaiseAction;
  index: number }): JSX.Element {
  const id = `salary-change-${action.raiseId}`;
  const title = `Salary change #${index + 1}`;
  const mode = action.newHusbandGross !== undefined || action.newWifeGross !== undefined
    ? SalaryChangeMode.Gross : action.percentageIncrease !== undefined ? SalaryChangeMode.Percentage : SalaryChangeMode.ManualNet;
  const patch = (updates: Partial<SalaryRaiseAction>): void => {
    validateSalaryReplacement({ ...action,
      ...updates });
    updateSalaryRaiseAction(action.raiseId, updates);
  };
  const amountsFor = (target: TargetPerson): Partial<SalaryRaiseAction> => ({
    newHusbandGross: target === TargetPerson.Wife ? undefined : action.newHusbandGross ?? husbandGross.value,
    newWifeGross: target === TargetPerson.Husband ? undefined : action.newWifeGross ?? wifeGross.value,
  });
  const calendar = (month: number) => {
    const elapsed = startCalendarMonth.value - 1 + month - 1;
    return { effectiveSimulationMonth: toSimulationMonth(month),
      effectiveCalendarMonth: toCalendarMonth(elapsed % 12 + 1),
      effectiveCalendarYear: toFullCalendarYear(startCalendarYear.value + Math.floor(elapsed / 12)) };
  };
  const monthLabel = (month: number): string => {
    const date = calendar(month);
    return `${String(date.effectiveCalendarMonth).padStart(2, "0")}.${date.effectiveCalendarYear}`;
  };
  const grossField = (person: TargetPerson): JSX.Element => {
    const husband = person === TargetPerson.Husband;
    const value = husband ? action.newHusbandGross : action.newWifeGross;
    const label = husband ? "Husband" : "Wife";
    return <div>
      <OptionalNumberInput id={`${id}-${person}`} label={`${title}: ${label} new monthly gross (€)`} value={value} step={0.01}
        onChange={(amount) => {
          if (amount === undefined) {
            throw new TypeError("Enter the new monthly gross salary. Zero is allowed; the last valid amount is kept while editing.");
          }
          const gross = toGrossSalary(amount);
          if (gross > 0 && (husband ? husbandHours.value : wifeInitialHours.value) === 0) {
            throw new TypeError("Set positive initial contractual hours before entering a positive salary; use working-time changes for leave.");
          }
          patch(husband ? { newHusbandGross: gross } : { newWifeGross: gross });
        }} />
      <small>At initial {husband ? husbandHours.value : wifeInitialHours.value} h/week. Annual base (12 regular payments): {new Intl.NumberFormat("de-DE", { style: "currency",
        currency: "EUR" }).format((value ?? 0) * 12)}.</small>
    </div>;
  };
  return (
    <fieldset className="salary-change-editor" aria-describedby={`${id}-help`}>
      <legend>{title}</legend>
      <button type="button" className="salary-change-editor__remove" aria-label={`Remove ${title.toLowerCase()}`} onClick={() => removeSalaryRaiseAction(action.raiseId)}>
        <RemoveItemIcon size={14} /> Remove
      </button>
      <div className="salary-change-editor__fields">
        <label for={`${id}-person`}>Person
          <select id={`${id}-person`} className="live-input" aria-label={`${title}: Person`} value={action.targetPerson} onChange={(event) => {
            const targetPerson = toTargetPerson(event.currentTarget.value);
            patch({ targetPerson,
              ...(mode === SalaryChangeMode.Gross ? amountsFor(targetPerson) : {}) });
          }}>
            <option value={TargetPerson.Husband}>Husband</option>
            <option value={TargetPerson.Wife}>Wife</option>
            <option value={TargetPerson.Both}>Both partners</option>
          </select>
        </label>
        <label for={`${id}-month`}>Effective month
          <select id={`${id}-month`} className="live-input" aria-label={`${title}: Effective month`} value={action.effectiveSimulationMonth} onChange={(event) => patch(calendar(Number(event.currentTarget.value)))}>
            {action.effectiveSimulationMonth > simulationDurationMonths.value && <option value={action.effectiveSimulationMonth}>{monthLabel(action.effectiveSimulationMonth)} (outside visible plan)</option>}
            {Array.from({ length: simulationDurationMonths.value }, (_, month) => <option key={month} value={month + 1}>{monthLabel(month + 1)}</option>)}
          </select>
        </label>
        <label for={`${id}-method`}>Change method
          <select id={`${id}-method`} className="live-input" aria-label={`${title}: Change method`} value={mode} onChange={(event) => {
            const next = toSalaryChangeMode(event.currentTarget.value);
            const cleared = { newHusbandClass3Net: undefined,
              newHusbandClass5Net: undefined,
              newWifeClass3FTNet: undefined,
              newWifeClass5FTNet: undefined,
              newWifeClass3PTNet: undefined,
              newWifeClass5PTNet: undefined };
            patch({ ...cleared,
              ...(next === SalaryChangeMode.Gross ? { ...amountsFor(action.targetPerson),
                percentageIncrease: undefined }
                : { newHusbandGross: undefined,
                  newWifeGross: undefined,
                  percentageIncrease: toPercentageRate(0) }) });
          }}>
            <option value={SalaryChangeMode.Gross} disabled={salaryInputMode.value !== SalaryInputMode.Gross}>New gross salary</option>
            <option value={SalaryChangeMode.Percentage}>Percentage increase</option>
            {mode === SalaryChangeMode.ManualNet && <option value={SalaryChangeMode.ManualNet} disabled>Imported manual net replacement</option>}
          </select>
        </label>
        {mode === SalaryChangeMode.Gross && action.targetPerson !== TargetPerson.Wife && grossField(TargetPerson.Husband)}
        {mode === SalaryChangeMode.Gross && action.targetPerson !== TargetPerson.Husband && grossField(TargetPerson.Wife)}
        {mode === SalaryChangeMode.Percentage && <OptionalNumberInput id={`${id}-percentage`} label={`${title}: Increase (%)`} value={(action.percentageIncrease ?? 0) * 100} max={100} step={0.01}
          onChange={(amount) => {
            if (amount === undefined || amount < 0 || amount > 100) {
              throw new TypeError("Enter an increase between 0 and 100 percent.");
            }
            patch({ percentageIncrease: toPercentageRate(amount / 100) });
          }} />}
        <label for={`${id}-reason`}>Reason (optional)
          <input id={`${id}-reason`} className="live-input" aria-label={`${title}: Reason`} value={action.reason} onInput={(event) => patch({ reason: event.currentTarget.value })} />
        </label>
      </div>
      <p id={`${id}-help`}>Changes apply from this month onward and recalculate automatically. {mode === SalaryChangeMode.Gross
        ? "Enter the new total salary, including a decrease or zero. Working-hour changes prorate this contract rate; extra salary payments and bonuses follow your existing settings. The annual base is a full-year rate, not the actual income for the change year."
        : "The percentage applies to the salary in effect at that time. Choose New gross salary to enter an amount directly."}</p>
      {salaryInputMode.value !== SalaryInputMode.Gross && <p>Direct gross amounts require a plan using gross salary inputs. Percentage changes remain available for manual-net plans.</p>}
    </fieldset>
  );
}
