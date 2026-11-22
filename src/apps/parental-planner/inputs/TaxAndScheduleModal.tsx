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
  SegmentedControl,
  TextField,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  TargetPerson,
  TaxClass,
  toHoursChangeId,
  toIsoCalendarDate,
  toSimulationMonth,
  toSwitchId,
  toWorkingHours,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  addWorkbenchHoursChange,
  addWorkbenchTaxSwitch,
  applyOptimalWorkbenchTaxSwitches,
  removeWorkbenchHoursChange,
  removeWorkbenchTaxSwitch,
  workbenchDerivedSpousalSet,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  WorkbenchGranularModal,
  activeWorkbenchModal,
  closeWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Section 3 Granular Modal: Custom § 2b BEEG Tax Class Switches & Dated Working-Hours Schedules. */
export function TaxAndScheduleModal(): JSX.Element {
  const open = activeWorkbenchModal.value === WorkbenchGranularModal.TaxWork;
  const s = workbenchState.value;
  const spousal = workbenchDerivedSpousalSet.value;

  const [switchStart, setSwitchStart] = useState(5);
  const [switchRevert, setSwitchRevert] = useState(17);
  const [switchTargetPair, setSwitchTargetPair] = useState<"V_III" | "IV_IV" | "III_V">("V_III");

  const [hoursMonth, setHoursMonth] = useState(29);
  const [hoursPerson, setHoursPerson] = useState<TargetPerson>(TargetPerson.Wife);
  const [hoursValue, setHoursValue] = useState(28);
  const [hoursDate, setHoursDate] = useState("");
  const [hoursReason, setHoursReason] = useState("Part-time return during ElterngeldPlus");

  const handleAddSwitch = (): void => {
    const startSim = Math.max(1, Math.min(s.simulationDurationMonths, Math.round(switchStart)));
    const revSim = Math.max(startSim + 1, Math.min(s.simulationDurationMonths, Math.round(switchRevert)));
    const startCal = simMonthToCalendarDate(
      toSimulationMonth(startSim),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    const targetHusband = switchTargetPair === "V_III"
      ? TaxClass.V
      : switchTargetPair === "IV_IV"
        ? TaxClass.IV
        : TaxClass.III;
    const targetWife = switchTargetPair === "V_III"
      ? TaxClass.III
      : switchTargetPair === "IV_IV"
        ? TaxClass.IV
        : TaxClass.V;
    addWorkbenchTaxSwitch({
      switchId: toSwitchId(`WB-SW-${Date.now()}`),
      effectiveSimulationMonth: toSimulationMonth(startSim),
      effectiveCalendarMonth: startCal.calendarMonth,
      effectiveCalendarYear: startCal.calendarYear,
      targetHusbandTaxClass: targetHusband,
      targetWifeTaxClass: targetWife,
      revertSimulationMonth: toSimulationMonth(revSim),
      statutoryReason: `Manual ${targetHusband}/${targetWife} switch (M${startSim}–M${revSim})`,
    });
  };

  const handleAddHours = (): void => {
    const safeMonth = Math.max(1, Math.min(s.simulationDurationMonths, Math.round(hoursMonth)));
    const cal = simMonthToCalendarDate(
      toSimulationMonth(safeMonth),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    addWorkbenchHoursChange({
      changeId: toHoursChangeId(`WB-HRS-${Date.now()}`),
      effectiveSimulationMonth: toSimulationMonth(safeMonth),
      effectiveCalendarMonth: cal.calendarMonth,
      effectiveCalendarYear: cal.calendarYear,
      effectiveDate: /^\d{4}-\d{2}-\d{2}$/.test(hoursDate) ? toIsoCalendarDate(hoursDate) : undefined,
      targetPerson: hoursPerson,
      weeklyHours: toWorkingHours(Math.max(0, Math.min(48, hoursValue))),
      reason: hoursReason.trim() || `${hoursValue} h/wk schedule`,
    });
  };

  const wifeShiftDelta = spousal.wifeClass3FullTimeNet - spousal.wifeClass5FullTimeNet;
  const hoursChanges = s.customWorkingHoursChanges ?? [];

  return (
    <ModalDialog
      open={open}
      onClose={closeWorkbenchModal}
      size={ModalDialogSize.Large}
      eyebrow="Section 3 · Granular Tax & Schedule Options"
      title="Custom Tax-Class Switches & Working-Hours Schedules"
      subtitle="Fine-tune § 2b BEEG tax class switch windows and dated part-time / Partnerschaftsbonus schedules."
      footer={(
        <Button variant={ButtonVariant.Primary} onClick={closeWorkbenchModal}>
          Done
        </Button>
      )}
    >
      <div className="plw-modal-stack">
        <div className="plw-modal-section">
          <div className="plw-toolbar">
            <h3 className="plw-modal-section__title">
              Tax-Class Switches (
              <WikiRefLink target={{ kind: WikiRefKind.Law,
                id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>
              )
            </h3>
            <Button
              size={ButtonSize.Sm}
              variant={ButtonVariant.Tint}
              disabled={s.customPregnancies.length === 0}
              onClick={applyOptimalWorkbenchTaxSwitches}
            >
              Synthesize Optimal Switches
            </Button>
          </div>
          <p className="plw-card__hint">
            Moving Partner 2 from Class V to Class III lifts monthly payroll net by{" "}
            <strong className="tabular-nums">+{formatEur(wifeShiftDelta)}/mo</strong>, increasing the{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_2e }}>§ 2e BEEG</WikiRefLink>{" "}
            assessment basis.
          </p>

          <div className="plw-modal-grid">
            <NumberField
              id="plw-sw-start"
              label="Effective Plan Month"
              unit="M"
              compact
              min={1}
              max={s.simulationDurationMonths}
              step={1}
              value={switchStart}
              onChange={setSwitchStart}
            />
            <NumberField
              id="plw-sw-revert"
              label="Revert Plan Month"
              unit="M"
              compact
              min={2}
              max={s.simulationDurationMonths}
              step={1}
              value={switchRevert}
              onChange={setSwitchRevert}
            />
          </div>

          <div className="plw-toolbar">
            <SegmentedControl
              compact
              label="Target tax classes"
              value={switchTargetPair}
              options={[
                {
                  value: "V_III",
                  label: "V / III (Boost P2)",
                },
                {
                  value: "IV_IV",
                  label: "IV / IV (Split)",
                },
                {
                  value: "III_V",
                  label: "III / V (Boost P1)",
                },
              ]}
              onChange={setSwitchTargetPair}
            />
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={handleAddSwitch}>
              + Add switch
            </Button>
          </div>

          {s.customTaxClassSwitches.length > 0 && (
            <div className="plw-modal-list">
              {s.customTaxClassSwitches.map((sw) => (
                <div key={sw.switchId} className="plw-modal-item">
                  <span>
                    <strong>M{sw.effectiveSimulationMonth}</strong>
                    {sw.revertSimulationMonth ? ` → M${sw.revertSimulationMonth}` : ""}:{" "}
                    {sw.targetHusbandTaxClass}/{sw.targetWifeTaxClass}
                  </span>
                  <Button
                    size={ButtonSize.Sm}
                    variant={ButtonVariant.Ghost}
                    onClick={() => removeWorkbenchTaxSwitch(sw.switchId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="plw-modal-section">
          <h3 className="plw-modal-section__title">
            Dated Working-Hours Changes (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_4b }}>Partnerschaftsbonus</WikiRefLink>{" "}
            corridor: 24–
            <WikiRefLink target={{ kind: WikiRefKind.Parameter,
              id: ParameterId.Benefit_MaximumWeeklyHours }}>32 h/wk</WikiRefLink>
            )
          </h3>

          <div className="plw-modal-grid">
            <NumberField
              id="plw-hrs-month"
              label="Effective Plan Month"
              unit="M"
              compact
              min={1}
              max={s.simulationDurationMonths}
              step={1}
              value={hoursMonth}
              onChange={setHoursMonth}
            />
            <NumberField
              id="plw-hrs-value"
              label="New Weekly Hours"
              unit="h/wk"
              compact
              min={0}
              max={48}
              step={1}
              value={hoursValue}
              onChange={setHoursValue}
            />
          </div>

          <div className="plw-modal-grid">
            <SegmentedControl
              compact
              fullWidth
              label="Target person for working hours change"
              value={hoursPerson}
              options={[
                {
                  value: TargetPerson.Wife,
                  label: "Partner 2",
                },
                {
                  value: TargetPerson.Husband,
                  label: "Partner 1",
                },
                {
                  value: TargetPerson.Both,
                  label: "Both",
                },
              ]}
              onChange={setHoursPerson}
            />
            <div className="plw-inline-control">
              <label htmlFor="plw-hrs-date" className="plw-inline-control__label">
                Optional Day-Exact Return Date
              </label>
              <input
                id="plw-hrs-date"
                type="date"
                className="plw-date-input"
                value={hoursDate}
                onChange={(event) => setHoursDate(event.currentTarget.value)}
              />
            </div>
          </div>

          <div className="plw-toolbar">
            <TextField
              id="plw-hrs-reason"
              label="Schedule Note"
              compact
              value={hoursReason}
              onChange={setHoursReason}
            />
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Tint} onClick={handleAddHours}>
              + Add hours schedule
            </Button>
          </div>

          {hoursChanges.length > 0 && (
            <div className="plw-modal-list">
              {hoursChanges.map((hc) => (
                <div key={hc.changeId} className="plw-modal-item">
                  <span>
                    <strong>M{hc.effectiveSimulationMonth}</strong>
                    {hc.effectiveDate ? ` (${hc.effectiveDate})` : ""} · {hc.targetPerson}:{" "}
                    <strong>{hc.weeklyHours} h/wk</strong> · {hc.reason}
                  </span>
                  <Button
                    size={ButtonSize.Sm}
                    variant={ButtonVariant.Ghost}
                    onClick={() => removeWorkbenchHoursChange(hc.changeId)}
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
