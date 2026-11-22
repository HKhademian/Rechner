import type {
  JSX,
} from "preact";
import {
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  type PregnancyAction,
  AllowancePlanMode,
  ElterngeldVariant,
  toCalendarMonth,
  toChildIndex,
  toFullCalendarYear,
  toIsoCalendarDate,
  toMonthDuration,
  toPregnancyId,
  toSimulationMonth,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  calendarDateToSimMonth,
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  addWorkbenchPregnancy,
  removeWorkbenchPregnancy,
  updateWorkbenchPregnancy,
  workbenchDerivedSpousalSet,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  WorkbenchGranularModal,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

function monthInputValue(
  simMonth: number,
  startYear: number,
  startMonth: number,
): string {
  const cal = simMonthToCalendarDate(
    toSimulationMonth(simMonth),
    toFullCalendarYear(startYear),
    toCalendarMonth(startMonth),
  );
  return `${cal.calendarYear}-${String(cal.calendarMonth).padStart(2, "0")}`;
}

/** Card 2: Children & Leave matching the approved prototype with range sliders & 3-segment visual bar. */
export function ChildrenLeaveCard(): JSX.Element {
  const s = workbenchState.value;
  const spousal = workbenchDerivedSpousalSet.value;
  const children = s.customPregnancies;
  const primary = children[0];

  const handleAddChild = (): void => {
    const nextIndex = children.length + 1;
    const lastDelivery = children.length > 0
      ? Math.max(...children.map((c) => c.calculatedDeliverySimulationMonth))
      : 0;
    const deliverySim = Math.min(
      s.simulationDurationMonths,
      lastDelivery > 0 ? lastDelivery + 22 : 17,
    );
    const positiveSim = Math.max(1, deliverySim - 8);
    const posCal = simMonthToCalendarDate(
      toSimulationMonth(positiveSim),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    const delCal = simMonthToCalendarDate(
      toSimulationMonth(deliverySim),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    const dueIso = toIsoCalendarDate(
      `${delCal.calendarYear}-${String(delCal.calendarMonth).padStart(2, "0")}-14`,
    );
    const nextAction: PregnancyAction = {
      pregnancyId: toPregnancyId(`PREG-WB-${Date.now()}-${nextIndex}`),
      childIndex: toChildIndex(nextIndex),
      positiveTestSimulationMonth: toSimulationMonth(positiveSim),
      positiveTestCalendarMonth: posCal.calendarMonth,
      positiveTestCalendarYear: posCal.calendarYear,
      calculatedDeliverySimulationMonth: toSimulationMonth(deliverySim),
      expectedDueDate: dueIso,
      motherPostBirthPartTimeHours: s.wifePostBirthHours,
      motherPostBirthPartTimeClass5Net: spousal.wifeClass5PartTimeNet,
      motherPostBirthPartTimeClass3Net: spousal.wifeClass3PartTimeNet,
      fatherPartnerMonthsCount: toMonthDuration(2),
      motherAllowancePlanMode: AllowancePlanMode.Basis,
      motherAllowanceVariant: ElterngeldVariant.Basis,
      motherAllowanceMonthsCount: toMonthDuration(10),
      fatherAllowancePlanMode: AllowancePlanMode.Basis,
      fatherAllowanceVariant: ElterngeldVariant.Basis,
    };
    addWorkbenchPregnancy(nextAction);
  };

  const handleBirthMonthChange = (child: PregnancyAction, yyyyMm: string): void => {
    const [yearRaw, monthRaw] = yyyyMm.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return;
    }
    const rawDelivery = calendarDateToSimMonth(
      toFullCalendarYear(year),
      toCalendarMonth(month),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    const deliverySim = Math.max(1, Math.min(s.simulationDurationMonths, rawDelivery));
    const positiveSim = Math.max(1, deliverySim - 8);
    const posCal = simMonthToCalendarDate(
      toSimulationMonth(positiveSim),
      s.startCalendarYear,
      s.startCalendarMonth,
    );
    const dayPart = child.expectedDueDate?.slice(8, 10) ?? "14";
    updateWorkbenchPregnancy(child.pregnancyId, {
      calculatedDeliverySimulationMonth: toSimulationMonth(deliverySim),
      positiveTestSimulationMonth: toSimulationMonth(positiveSim),
      positiveTestCalendarMonth: posCal.calendarMonth,
      positiveTestCalendarYear: posCal.calendarYear,
      expectedDueDate: toIsoCalendarDate(`${year}-${String(month).padStart(2, "0")}-${dayPart}`),
    });
  };

  const handleModeChange = (child: PregnancyAction, nextMode: AllowancePlanMode): void => {
    const nextVariant = nextMode === AllowancePlanMode.Plus
      ? ElterngeldVariant.Plus
      : ElterngeldVariant.Basis;
    const defaultMotherPost = nextMode === AllowancePlanMode.Plus ? 20 : 10;
    const defaultFather = nextMode === AllowancePlanMode.Plus ? 4 : 2;
    updateWorkbenchPregnancy(child.pregnancyId, {
      motherAllowancePlanMode: nextMode,
      motherAllowanceVariant: nextVariant,
      motherAllowanceMonthsCount: toMonthDuration(defaultMotherPost),
      fatherAllowancePlanMode: nextMode,
      fatherAllowanceVariant: nextVariant,
      fatherPartnerMonthsCount: toMonthDuration(defaultFather),
    });
  };

  const primaryMode = primary?.motherAllowancePlanMode ?? AllowancePlanMode.Basis;
  const isPlus = primaryMode === AllowancePlanMode.Plus;
  const motherPost = primary?.motherAllowanceMonthsCount ?? 10;
  const motherDisplayMonths = 2 + motherPost;
  const fatherMonths = primary?.fatherPartnerMonthsCount ?? 2;
  const motherSliderMax = isPlus ? 22 : 12;
  const fatherSliderMax = isPlus ? 24 : 12;

  const motherEgUnits = Math.round(motherPost * (isPlus ? 0.5 : 1));
  const fatherEgUnits = Math.round(fatherMonths * (isPlus ? 0.5 : 1));
  const segments = Array.from({ length: 14 }, (_, idx) => {
    if (idx < 2) {
      return "muschg";
    }
    if (idx < 2 + motherEgUnits) {
      return "mother";
    }
    if (idx < 2 + motherEgUnits + fatherEgUnits) {
      return "father";
    }
    return "empty";
  });

  const handleMotherTotalSlider = (totalMonths: number): void => {
    if (!primary) {
      return;
    }
    const postMonths = Math.max(0, Math.min(isPlus ? 20 : 10, totalMonths - 2));
    const motherUnits = 2 + postMonths * (isPlus ? 0.5 : 1);
    const maxFatherUnits = Math.max(0, 14 - motherUnits);
    const maxFatherCount = isPlus ? Math.floor(maxFatherUnits * 2) : Math.floor(maxFatherUnits);
    const clampedFather = Math.min(fatherMonths, maxFatherCount);
    updateWorkbenchPregnancy(primary.pregnancyId, {
      motherAllowanceMonthsCount: toMonthDuration(postMonths),
      fatherPartnerMonthsCount: toMonthDuration(clampedFather),
    });
  };

  const handleFatherSlider = (requestedFather: number): void => {
    if (!primary) {
      return;
    }
    const safeFather = Math.max(0, Math.min(fatherSliderMax, requestedFather));
    const fatherUnits = safeFather * (isPlus ? 0.5 : 1);
    const maxMotherPostUnits = Math.max(0, Math.min(10, 14 - 2 - fatherUnits));
    const maxMotherPost = isPlus ? Math.floor(maxMotherPostUnits * 2) : Math.floor(maxMotherPostUnits);
    const clampedMotherPost = Math.min(motherPost, maxMotherPost);
    updateWorkbenchPregnancy(primary.pregnancyId, {
      motherAllowanceMonthsCount: toMonthDuration(clampedMotherPost),
      fatherPartnerMonthsCount: toMonthDuration(safeFather),
    });
  };

  return (
    <section className="plw-card" aria-labelledby="plw-sec-children">
      <div className="plw-card__header">
        <h2 id="plw-sec-children" className="plw-card__title">2. Children &amp; Leave</h2>
        <button type="button" className="plw-link-btn" onClick={handleAddChild}>
          {children.length === 0 ? "+ Add Child 1" : `+ Add Child ${children.length + 1}`}
        </button>
      </div>

      {primary ? (
        <>
          <div className="plw-field-grid">
            <div className="plw-inline-control">
              <label htmlFor="plw-child1-birth" className="plw-inline-control__label">
                Child 1 Expected Birth
              </label>
              <input
                id="plw-child1-birth"
                type="month"
                className="plw-date-input"
                value={monthInputValue(primary.calculatedDeliverySimulationMonth, s.startCalendarYear, s.startCalendarMonth)}
                onChange={(event) => handleBirthMonthChange(primary, event.currentTarget.value)}
              />
            </div>

            <div className="plw-inline-control">
              <label htmlFor="plw-child1-mode" className="plw-inline-control__label">
                Allowance Mode
              </label>
              <select
                id="plw-child1-mode"
                className="plw-select"
                value={primaryMode}
                onChange={(event) => handleModeChange(primary, event.currentTarget.value as AllowancePlanMode)}
              >
                <option value={AllowancePlanMode.Basis}>Basiselterngeld</option>
                <option value={AllowancePlanMode.Plus}>ElterngeldPlus</option>
                <option value={AllowancePlanMode.Auto}>Auto (Mixed)</option>
              </select>
            </div>
          </div>

          <div className="plw-field-grid">
            <div className="plw-slider-field">
              <div className="plw-slider-field__top">
                <label htmlFor="plw-mother-slider">Mother months</label>
                <span className="plw-slider-field__val">{motherDisplayMonths} mo</span>
              </div>
              <input
                id="plw-mother-slider"
                type="range"
                className="plw-range"
                min={2}
                max={motherSliderMax}
                value={motherDisplayMonths}
                onInput={(event) => handleMotherTotalSlider(Number(event.currentTarget.value))}
              />
            </div>

            <div className="plw-slider-field">
              <div className="plw-slider-field__top">
                <label htmlFor="plw-father-slider">Father months</label>
                <span className="plw-slider-field__val">{fatherMonths} mo</span>
              </div>
              <input
                id="plw-father-slider"
                type="range"
                className="plw-range"
                min={0}
                max={fatherSliderMax}
                value={fatherMonths}
                onInput={(event) => handleFatherSlider(Number(event.currentTarget.value))}
              />
            </div>
          </div>

          <div className="plw-inline-control">
            <div className="plw-leave-bar" role="img" aria-label={`Leave split: 2 Mutterschutz months, ${motherPost} Mother months, ${fatherMonths} Partner months`}>
              {segments.map((seg, i) => (
                <span key={i} className={`plw-leave-bar__seg plw-leave-bar__seg--${seg}`} />
              ))}
            </div>
            <div className="plw-leave-legend">
              <span>
                <WikiRefLink target={{ kind: WikiRefKind.Topic,
                  id: "maternity-protection" }}>Mutterschutz</WikiRefLink>{" "}
                (2m)
              </span>
              <span>{motherDisplayMonths + fatherMonths} planned months</span>
            </div>
          </div>
        </>
      ) : (
        <p className="plw-card__hint">
          No births scheduled. Click <strong>+ Add Child 1</strong> above to plan Mutterschutz, Elterngeld, and Kindergeld.
        </p>
      )}

      {children.length > 0 && (
        <div className="plw-chips" aria-label="Planned children">
          {children.map((child, idx) => (
            <span key={child.pregnancyId} className="plw-chip">
              <button
                type="button"
                className="plw-chip__action"
                onClick={() => openWorkbenchModal(WorkbenchGranularModal.Child, child.pregnancyId)}
              >
                Child {idx + 1} · {child.expectedDueDate?.slice(0, 7) ?? `M${child.calculatedDeliverySimulationMonth}`}
              </button>
              <button
                type="button"
                className="plw-chip__remove"
                aria-label={`Remove Child ${idx + 1}`}
                onClick={() => removeWorkbenchPregnancy(child.pregnancyId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="plw-card__footer">
        <span>
          Annual vacation (
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_4b }}>§ 17 BEEG</WikiRefLink>
          ), exact due date &amp; grid
        </span>
        <button
          type="button"
          className="plw-granular-btn"
          disabled={!primary}
          onClick={() => primary && openWorkbenchModal(WorkbenchGranularModal.Child, primary.pregnancyId)}
        >
          Day-exact &amp; grid…
        </button>
      </div>
    </section>
  );
}
