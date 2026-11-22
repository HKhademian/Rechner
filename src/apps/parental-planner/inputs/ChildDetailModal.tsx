import type {
  JSX,
} from "preact";
import {
  Button,
  ButtonSize,
  ButtonVariant,
  ModalDialog,
  ModalDialogSize,
  NumberField,
  SegmentedControl,
  ToggleSwitch,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  AllowancePlanMode,
  ElterngeldVariant,
  toCalendarMonth,
  toFullCalendarYear,
  toIsoCalendarDate,
  toMonthDuration,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  calendarDateToSimMonth,
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  removeWorkbenchPregnancy,
  updateWorkbenchPregnancy,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  WorkbenchGranularModal,
  activeWorkbenchModal,
  activeWorkbenchModalChildId,
  closeWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Section 2 Granular Modal: Day-exact due date, multiple/premature birth, § 17 BEEG vacation days & per-child leave grid. */
export function ChildDetailModal(): JSX.Element {
  const open = activeWorkbenchModal.value === WorkbenchGranularModal.Child;
  const s = workbenchState.value;
  const selectedId = activeWorkbenchModalChildId.value;
  const children = s.customPregnancies;
  const activeChild = children.find((c) => c.pregnancyId === selectedId) ?? children[0];

  const handleExactDateChange = (iso: string): void => {
    if (!activeChild || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      return;
    }
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    const deliverySim = Math.max(
      1,
      Math.min(
        s.simulationDurationMonths,
        calendarDateToSimMonth(
          toFullCalendarYear(year),
          toCalendarMonth(month),
          s.startCalendarYear,
          s.startCalendarMonth,
        ),
      ),
    );
    const positiveSim = Math.max(1, deliverySim - 8);
    const posCal = simMonthToCalendarDate(
      toSimulationMonth(positiveSim),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    updateWorkbenchPregnancy(activeChild.pregnancyId, {
      expectedDueDate: toIsoCalendarDate(iso),
      calculatedDeliverySimulationMonth: toSimulationMonth(deliverySim),
      positiveTestSimulationMonth: toSimulationMonth(positiveSim),
      positiveTestCalendarMonth: posCal.calendarMonth,
      positiveTestCalendarYear: posCal.calendarYear,
    });
  };

  return (
    <ModalDialog
      open={open}
      onClose={closeWorkbenchModal}
      size={ModalDialogSize.Large}
      eyebrow="Section 2 · Per-Child Day-Exact & Statutory Settings"
      title="Day-Exact Due Date, Mutterschutz & § 17 BEEG Vacation"
      subtitle="Fine-tune exact delivery dates, premature/multiple birth extensions (§ 3 MuSchG), and annual vacation optimization."
      footer={(
        <Button variant={ButtonVariant.Primary} onClick={closeWorkbenchModal}>
          Done
        </Button>
      )}
    >
      {activeChild ? (
        <div className="plw-modal-stack">
          {children.length > 1 && (
            <div className="plw-toolbar">
              <div className="plw-toolbar__group">
                {children.map((child, idx) => (
                  <Button
                    key={child.pregnancyId}
                    size={ButtonSize.Sm}
                    variant={child.pregnancyId === activeChild.pregnancyId ? ButtonVariant.Primary : ButtonVariant.Ghost}
                    onClick={() => {
                      activeWorkbenchModalChildId.value = child.pregnancyId;
                    }}
                  >
                    Child {idx + 1} ({child.expectedDueDate ?? `M${child.calculatedDeliverySimulationMonth}`})
                  </Button>
                ))}
              </div>
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Ghost}
                onClick={() => removeWorkbenchPregnancy(activeChild.pregnancyId)}
              >
                Remove Child
              </Button>
            </div>
          )}

          <div className="plw-modal-section">
            <h3 className="plw-modal-section__title">
              Day-Exact Birth &amp;{" "}
              <WikiRefLink target={{ kind: WikiRefKind.Law,
                id: LawId.MuSchG_3 }}>§ 3 MuSchG</WikiRefLink>{" "}
              Protection Window
            </h3>
            <div className="plw-modal-grid">
              <div className="plw-inline-control">
                <label htmlFor="plw-modal-due-date" className="plw-inline-control__label">
                  Expected Due Date (YYYY-MM-DD)
                </label>
                <input
                  id="plw-modal-due-date"
                  type="date"
                  className="plw-date-input"
                  value={activeChild.expectedDueDate ?? ""}
                  onChange={(event) => handleExactDateChange(event.currentTarget.value)}
                />
              </div>
              <ToggleSwitch
                id="plw-modal-multiple-premature"
                label="Multiple or premature birth (extends post-birth Mutterschutz to 12 weeks)"
                checked={activeChild.isMultipleOrPrematureBirth === true}
                onChange={(checked) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                  isMultipleOrPrematureBirth: checked,
                })}
              />
            </div>
          </div>

          <div className="plw-modal-section">
            <h3 className="plw-modal-section__title">
              Parent-Specific Allowance Allocation (
              <WikiRefLink target={{ kind: WikiRefKind.Law,
                id: LawId.BEEG_4 }}>§ 4 BEEG</WikiRefLink>
              )
            </h3>
            <div className="plw-modal-grid">
              <div className="plw-inline-control">
                <span className="plw-inline-control__label">Mother Plan Mode</span>
                <SegmentedControl
                  compact
                  fullWidth
                  label="Mother allowance plan mode"
                  value={activeChild.motherAllowancePlanMode ?? AllowancePlanMode.Basis}
                  options={[
                    {
                      value: AllowancePlanMode.Basis,
                      label: "Basis",
                    },
                    {
                      value: AllowancePlanMode.Plus,
                      label: "Plus",
                    },
                    {
                      value: AllowancePlanMode.Auto,
                      label: "Auto",
                    },
                  ]}
                  onChange={(mode) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                    motherAllowancePlanMode: mode,
                    motherAllowanceVariant: mode === AllowancePlanMode.Plus ? ElterngeldVariant.Plus : ElterngeldVariant.Basis,
                    motherAllowanceMonthsCount: toMonthDuration(mode === AllowancePlanMode.Plus ? 20 : 10),
                  })}
                />
              </div>
              <div className="plw-inline-control">
                <span className="plw-inline-control__label">Partner Plan Mode</span>
                <SegmentedControl
                  compact
                  fullWidth
                  label="Partner allowance plan mode"
                  value={activeChild.fatherAllowancePlanMode ?? AllowancePlanMode.Basis}
                  options={[
                    {
                      value: AllowancePlanMode.Basis,
                      label: "Basis",
                    },
                    {
                      value: AllowancePlanMode.Plus,
                      label: "Plus",
                    },
                    {
                      value: AllowancePlanMode.Auto,
                      label: "Auto",
                    },
                  ]}
                  onChange={(mode) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                    fatherAllowancePlanMode: mode,
                    fatherAllowanceVariant: mode === AllowancePlanMode.Plus ? ElterngeldVariant.Plus : ElterngeldVariant.Basis,
                    fatherPartnerMonthsCount: toMonthDuration(mode === AllowancePlanMode.Plus ? 4 : 2),
                  })}
                />
              </div>
            </div>

            <div className="plw-modal-grid">
              <NumberField
                id="plw-modal-mother-months"
                label="Mother Post-Mutterschutz Months"
                unit="mo"
                compact
                min={0}
                max={activeChild.motherAllowancePlanMode === AllowancePlanMode.Plus ? 20 : 10}
                step={1}
                value={activeChild.motherAllowanceMonthsCount ?? 10}
                onChange={(val) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                  motherAllowanceMonthsCount: toMonthDuration(Math.max(0, Math.round(val))),
                })}
              />
              <NumberField
                id="plw-modal-father-months"
                label="Partner Months"
                unit="mo"
                compact
                min={0}
                max={activeChild.fatherAllowancePlanMode === AllowancePlanMode.Plus ? 24 : 12}
                step={1}
                value={activeChild.fatherPartnerMonthsCount}
                onChange={(val) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                  fatherPartnerMonthsCount: toMonthDuration(Math.max(0, Math.round(val))),
                })}
              />
            </div>

            <NumberField
              id="plw-modal-part-time-hours"
              label="Mother Post-Birth Part-Time Hours"
              unit="h/wk"
              compact
              min={0}
              max={40}
              step={1}
              value={activeChild.motherPostBirthPartTimeHours}
              onChange={(val) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                motherPostBirthPartTimeHours: toWorkingHours(Math.max(0, Math.min(40, val))),
              })}
            />
          </div>

          <div className="plw-modal-section">
            <div className="plw-toolbar">
              <h3 className="plw-modal-section__title">Life-Month Allocation Preview (LM 1–14)</h3>
              <span className="plw-card__hint">
                2M Mutterschutz + {activeChild.motherAllowanceMonthsCount ?? 10}M Mother + {activeChild.fatherPartnerMonthsCount}M Partner
              </span>
            </div>
            <div className="plw-lm-grid">
              {Array.from({ length: 14 }, (_, idx) => {
                const lm = idx + 1;
                const isPlus = activeChild.motherAllowancePlanMode === AllowancePlanMode.Plus;
                const motherUnits = Math.round((activeChild.motherAllowanceMonthsCount ?? 10) * (isPlus ? 0.5 : 1));
                const fatherUnits = Math.round(activeChild.fatherPartnerMonthsCount * (isPlus ? 0.5 : 1));
                const kind = lm <= 2
                  ? "muschg"
                  : lm <= 2 + motherUnits
                    ? "mother"
                    : lm <= 2 + motherUnits + fatherUnits
                      ? "father"
                      : "off";
                const label = kind === "muschg"
                  ? "MuSchG"
                  : kind === "mother"
                    ? isPlus ? "M Plus" : "M Basis"
                    : kind === "father"
                      ? isPlus ? "P Plus" : "P Basis"
                      : "—";
                return (
                  <div key={lm} className={`plw-lm-cell${kind !== "off" ? ` plw-lm-cell--${kind}` : ""}`}>
                    <div><strong>LM {lm}</strong></div>
                    <div>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="plw-modal-section">
            <h3 className="plw-modal-section__title">
              Annual Vacation Optimizer (§ 17 BEEG ·{" "}
              <WikiRefLink target={{ kind: WikiRefKind.Law,
                id: LawId.BEEG_4b }}>Elternzeit</WikiRefLink>
              )
            </h3>
            <p className="plw-card__hint">
              Employers may reduce annual vacation by 1/12 only for every <em>full calendar month</em> of parental leave.
              These inputs drive the Vacation Optimizer inside the <strong>Action Deadlines</strong> tab.
            </p>
            <div className="plw-modal-grid">
              <NumberField
                id="plw-modal-vac-annual"
                label="Contractual Annual Vacation Days"
                unit="days"
                compact
                min={20}
                max={45}
                step={1}
                value={activeChild.motherAnnualVacationDays ?? 30}
                onChange={(val) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                  motherAnnualVacationDays: Math.max(20, Math.min(45, Math.round(val))),
                })}
              />
              <NumberField
                id="plw-modal-vac-taken"
                label="Vacation Days Taken Pre-Leave"
                unit="days"
                compact
                min={0}
                max={45}
                step={1}
                value={activeChild.motherVacationDaysTakenPreLeave ?? 0}
                onChange={(val) => updateWorkbenchPregnancy(activeChild.pregnancyId, {
                  motherVacationDaysTakenPreLeave: Math.max(0, Math.min(45, Math.round(val))),
                })}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="plw-card__hint">Add a child in Section 2 first to configure day-exact due dates and vacation days.</p>
      )}
    </ModalDialog>
  );
}
