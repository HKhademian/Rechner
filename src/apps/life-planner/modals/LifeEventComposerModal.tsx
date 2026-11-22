import type {
  JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  AddActionIcon,
  DismissIcon,
} from "#components/Icons";
import {
  TaxClass,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
  toSimulationMonth,
  toTaxClass,
  toWorkingHours,
} from "#engine/types";
import {
  type LifeSimulatorEvent,
  CompanyCarPowertrain,
  JobEndCause,
  LifeEventDomain,
  LifeEventKind,
  LifePersonKey,
  ParentalLeavePlanMode,
  ResidencyMilestoneKind,
  TaxBucket,
  toCompanyCarPowertrain,
  toJobEndCause,
  toLifeEventId,
  toLifeEventKind,
  toLifePersonKey,
  toParentalLeavePlanMode,
  toResidencyMilestoneKind,
} from "#engine/lifeSimulator/types";
import {
  addLifeEvent,
  lifeWorkbenchPlan,
  updateLifeEvent,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  flushLifeWorkbenchCalculations,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  closeLifeEventComposer,
  editingLifeEventId,
  lifeEventComposerOpen,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

const COMPOSER_EVENT_OPTIONS: readonly {
  readonly domain: LifeEventDomain;
  readonly kind: LifeEventKind;
  readonly label: string;
  readonly defaultTitle: string;
}[] = Object.freeze([
  { domain: LifeEventDomain.Career,
    kind: LifeEventKind.SalaryRaise,
    label: "Salary Raise / Promotion",
    defaultTitle: "Salary Raise (+8%)" },
  { domain: LifeEventDomain.Career,
    kind: LifeEventKind.BonusSchedule,
    label: "Annual / One-Off Bonus",
    defaultTitle: "Annual Performance Bonus" },
  { domain: LifeEventDomain.Career,
    kind: LifeEventKind.JobChange,
    label: "New Job / Role Change",
    defaultTitle: "New Role" },
  { domain: LifeEventDomain.Career,
    kind: LifeEventKind.JobEnd,
    label: "Job End (Fired / Resigned / Sabbatical)",
    defaultTitle: "Career Break / Job Transition" },
  { domain: LifeEventDomain.Career,
    kind: LifeEventKind.CompanyCar,
    label: "Company Car (EV / PHEV / ICE)",
    defaultTitle: "EV Company Car (0.25%)" },
  { domain: LifeEventDomain.Career,
    kind: LifeEventKind.CommuterProfile,
    label: "Commuter & Home-Office (§ 9)",
    defaultTitle: "Commute & Home Office" },
  { domain: LifeEventDomain.Family,
    kind: LifeEventKind.ChildBirth,
    label: "Child Birth & Parental Leave",
    defaultTitle: "Child Birth & Elterngeld" },
  { domain: LifeEventDomain.Family,
    kind: LifeEventKind.ChildcareFee,
    label: "Kita / Krippe / Childcare Fee",
    defaultTitle: "Municipal Kita / Krippe" },
  { domain: LifeEventDomain.HousingAsset,
    kind: LifeEventKind.RentChange,
    label: "Rent Upgrade / Change",
    defaultTitle: "New Rental Home" },
  { domain: LifeEventDomain.HousingAsset,
    kind: LifeEventKind.HomePurchase,
    label: "Home Purchase & Mortgage",
    defaultTitle: "Home Purchase" },
  { domain: LifeEventDomain.HousingAsset,
    kind: LifeEventKind.SolarPvInstallation,
    label: "Solar PV System (§ 3 Nr. 72)",
    defaultTitle: "Rooftop Solar PV" },
  { domain: LifeEventDomain.Tax,
    kind: LifeEventKind.TaxClassSwitch,
    label: "Tax Class Switch",
    defaultTitle: "Tax Class Switch" },
  { domain: LifeEventDomain.Tax,
    kind: LifeEventKind.DeductibleExpenses,
    label: "Deductible Expenses (§§ 9, 10, 35a)",
    defaultTitle: "Annual Tax Deductibles & Credits" },
  { domain: LifeEventDomain.ExpenseTravel,
    kind: LifeEventKind.TravelTrip,
    label: "Planned Travel / Vacation",
    defaultTitle: "Family Vacation" },
  { domain: LifeEventDomain.ExpenseTravel,
    kind: LifeEventKind.OneOffCashflow,
    label: "One-Off Cashflow (+Inflow / -Outflow)",
    defaultTitle: "One-Off Cashflow" },
  { domain: LifeEventDomain.Residency,
    kind: LifeEventKind.ResidencyMilestone,
    label: "Residency / Blue Card / Citizenship",
    defaultTitle: "Permanent Residency (§ 18c AufenthG)" },
]);

/** Interactive multi-domain Life Event Composer modal. */
export function LifeEventComposerModal(): JSX.Element | null {
  const open = lifeEventComposerOpen.value;
  const editId = editingLifeEventId.value;
  const plan = lifeWorkbenchPlan.value;
  const horizon = plan.baseline.horizonMonths;
  const hasPartner = Boolean(plan.baseline.partner);
  const existingEvent = editId ? plan.events.find((e) => e.id === editId) : undefined;

  const [kind, setKind] = useState<LifeEventKind>(LifeEventKind.SalaryRaise);
  const [title, setTitle] = useState("Salary Raise (+8%)");
  const [effectiveMonth, setEffectiveMonth] = useState(12);
  const [personKey, setPersonKey] = useState<LifePersonKey>(LifePersonKey.Primary);

  // Domain-specific numeric/enum fields
  const [amountPrimary, setAmountPrimary] = useState(8);
  const [amountSecondary, setAmountSecondary] = useState(12);
  const [amountTertiary, setAmountTertiary] = useState(3.6);
  const [jobEndCause, setJobEndCause] = useState<JobEndCause>(JobEndCause.EmployerTermination);
  const [powertrain, setPowertrain] = useState<CompanyCarPowertrain>(CompanyCarPowertrain.Electric);
  const [leaveMode, setLeaveMode] = useState<ParentalLeavePlanMode>(ParentalLeavePlanMode.Basis);
  const [primaryTaxClass, setPrimaryTaxClass] = useState<TaxClass>(TaxClass.III);
  const [partnerTaxClass, setPartnerTaxClass] = useState<TaxClass>(TaxClass.V);
  const [milestoneKind, setMilestoneKind] = useState<ResidencyMilestoneKind>(
    ResidencyMilestoneKind.PermanentResidency18c,
  );

  useEffect(() => {
    if (!open || !existingEvent) {
      return;
    }
    setKind(existingEvent.kind);
    setTitle(existingEvent.title);
    setEffectiveMonth(existingEvent.effectiveMonth);
    switch (existingEvent.kind) {
      case LifeEventKind.SalaryRaise:
        setPersonKey(existingEvent.personKey);
        setAmountPrimary(Math.round(existingEvent.percentageIncrease * 1000) / 10);
        break;
      case LifeEventKind.BonusSchedule:
        setPersonKey(existingEvent.personKey);
        setAmountPrimary(existingEvent.grossBonusAmount);
        break;
      case LifeEventKind.JobChange:
        setPersonKey(existingEvent.personKey);
        setAmountPrimary(existingEvent.newMonthlyGross);
        setAmountSecondary(existingEvent.newWeeklyHours);
        break;
      case LifeEventKind.JobEnd:
        setPersonKey(existingEvent.personKey);
        setJobEndCause(existingEvent.cause);
        setAmountPrimary(existingEvent.unemploymentMonths);
        setAmountSecondary(existingEvent.severanceGross ?? 0);
        break;
      case LifeEventKind.CompanyCar:
        setPersonKey(existingEvent.personKey);
        setAmountPrimary(existingEvent.listPriceGross);
        setPowertrain(existingEvent.powertrain);
        setAmountSecondary(existingEvent.oneWayCommuteKm);
        break;
      case LifeEventKind.CommuterProfile:
        setPersonKey(existingEvent.personKey);
        setAmountPrimary(existingEvent.oneWayDistanceKm);
        setAmountSecondary(existingEvent.workDaysPerYear);
        setAmountTertiary(existingEvent.homeOfficeDaysPerYear);
        break;
      case LifeEventKind.ChildBirth:
        setPersonKey(existingEvent.parentOnLeave);
        setLeaveMode(existingEvent.leaveMode);
        setAmountPrimary(existingEvent.leaveMonths);
        setAmountSecondary(existingEvent.partnerLeaveMonths);
        break;
      case LifeEventKind.ChildcareFee:
        setAmountPrimary(existingEvent.monthlyFee);
        setAmountSecondary(existingEvent.durationMonths);
        break;
      case LifeEventKind.RentChange:
        setAmountPrimary(existingEvent.newMonthlyRent);
        break;
      case LifeEventKind.HomePurchase:
        setAmountPrimary(existingEvent.purchasePrice);
        setAmountSecondary(existingEvent.downPayment);
        setAmountTertiary(Math.round(existingEvent.annualInterestRate * 1000) / 10);
        break;
      case LifeEventKind.SolarPvInstallation:
        setAmountPrimary(existingEvent.upfrontCapex);
        setAmountSecondary(existingEvent.monthlyElectricitySavings + existingEvent.monthlyFeedInRevenue);
        break;
      case LifeEventKind.TaxClassSwitch:
        setPrimaryTaxClass(existingEvent.primaryTaxClass);
        if (existingEvent.partnerTaxClass) {
          setPartnerTaxClass(existingEvent.partnerTaxClass);
        }
        break;
      case LifeEventKind.DeductibleExpenses:
        setAmountPrimary(existingEvent.sonderausgabenAnnual);
        setAmountSecondary(existingEvent.householdServicesLaborAnnual);
        break;
      case LifeEventKind.TravelTrip:
        setAmountPrimary(existingEvent.totalCost);
        break;
      case LifeEventKind.OneOffCashflow:
        setAmountPrimary(existingEvent.signedAmount);
        break;
      case LifeEventKind.ResidencyMilestone:
        setMilestoneKind(existingEvent.milestoneKind);
        break;
      default:
        break;
    }
  }, [open, existingEvent]);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        closeLifeEventComposer();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleKindChange = (nextKind: LifeEventKind): void => {
    setKind(nextKind);
    const meta = COMPOSER_EVENT_OPTIONS.find((o) => o.kind === nextKind);
    if (meta) {
      setTitle(meta.defaultTitle);
    }
    switch (nextKind) {
      case LifeEventKind.SalaryRaise:
        setAmountPrimary(8);
        break;
      case LifeEventKind.BonusSchedule:
        setAmountPrimary(4500);
        break;
      case LifeEventKind.JobChange:
        setAmountPrimary(7200);
        setAmountSecondary(40);
        break;
      case LifeEventKind.JobEnd:
        setAmountPrimary(6);
        setAmountSecondary(0);
        break;
      case LifeEventKind.CompanyCar:
        setAmountPrimary(48000);
        setAmountSecondary(15);
        break;
      case LifeEventKind.CommuterProfile:
        setAmountPrimary(25);
        setAmountSecondary(150);
        setAmountTertiary(80);
        break;
      case LifeEventKind.ChildBirth:
        setAmountPrimary(10);
        setAmountSecondary(2);
        break;
      case LifeEventKind.ChildcareFee:
        setAmountPrimary(420);
        setAmountSecondary(36);
        break;
      case LifeEventKind.RentChange:
        setAmountPrimary(2200);
        break;
      case LifeEventKind.HomePurchase:
        setAmountPrimary(520000);
        setAmountSecondary(80000);
        setAmountTertiary(3.6);
        break;
      case LifeEventKind.SolarPvInstallation:
        setAmountPrimary(15000);
        setAmountSecondary(240);
        break;
      case LifeEventKind.DeductibleExpenses:
        setAmountPrimary(2400);
        setAmountSecondary(1200);
        break;
      case LifeEventKind.TravelTrip:
        setAmountPrimary(3500);
        break;
      case LifeEventKind.OneOffCashflow:
        setAmountPrimary(-5000);
        break;
      default:
        break;
    }
  };

  const handleSubmit = (): void => {
    const id = existingEvent ? existingEvent.id : toLifeEventId(`USER-${Date.now()}`);
    const month = toSimulationMonth(Math.max(1, Math.min(horizon, Math.trunc(effectiveMonth))));
    const cleanTitle = title.trim() || "Life Event";
    let event: LifeSimulatorEvent;

    switch (kind) {
      case LifeEventKind.SalaryRaise:
        event = {
          id,
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.SalaryRaise,
          effectiveMonth: month,
          title: cleanTitle,
          personKey,
          percentageIncrease: toPercentageRate(Math.max(0, amountPrimary) / 100),
        };
        break;
      case LifeEventKind.BonusSchedule:
        event = {
          id,
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.BonusSchedule,
          effectiveMonth: month,
          title: cleanTitle,
          personKey,
          grossBonusAmount: toEuroAmount(Math.max(0, amountPrimary)),
          recurringYearly: true,
        };
        break;
      case LifeEventKind.JobChange:
        event = {
          id,
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.JobChange,
          effectiveMonth: month,
          title: cleanTitle,
          personKey,
          newMonthlyGross: toGrossSalary(Math.max(0, amountPrimary)),
          newWeeklyHours: toWorkingHours(Math.max(1, Math.min(60, amountSecondary))),
        };
        break;
      case LifeEventKind.JobEnd:
        event = {
          id,
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.JobEnd,
          effectiveMonth: month,
          title: cleanTitle,
          personKey,
          cause: jobEndCause,
          unemploymentMonths: Math.max(1, Math.trunc(amountPrimary)),
          severanceGross: amountSecondary > 0 ? toEuroAmount(amountSecondary) : undefined,
        };
        break;
      case LifeEventKind.CompanyCar:
        event = {
          id,
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.CompanyCar,
          effectiveMonth: month,
          title: cleanTitle,
          personKey,
          listPriceGross: toEuroAmount(Math.max(0, amountPrimary)),
          powertrain,
          oneWayCommuteKm: Math.max(0, amountSecondary),
        };
        break;
      case LifeEventKind.CommuterProfile:
        event = {
          id,
          domain: LifeEventDomain.Career,
          kind: LifeEventKind.CommuterProfile,
          effectiveMonth: month,
          title: cleanTitle,
          personKey,
          oneWayDistanceKm: Math.max(0, amountPrimary),
          workDaysPerYear: Math.max(0, Math.min(365, amountSecondary)),
          homeOfficeDaysPerYear: Math.max(0, Math.min(365, amountTertiary)),
        };
        break;
      case LifeEventKind.ChildBirth:
        event = {
          id,
          domain: LifeEventDomain.Family,
          kind: LifeEventKind.ChildBirth,
          effectiveMonth: month,
          title: cleanTitle,
          parentOnLeave: personKey,
          leaveMode,
          leaveMonths: Math.max(1, Math.trunc(amountPrimary)),
          partnerLeaveMonths: Math.max(0, Math.trunc(amountSecondary)),
          includeMutterschutz: true,
        };
        break;
      case LifeEventKind.ChildcareFee:
        event = {
          id,
          domain: LifeEventDomain.Family,
          kind: LifeEventKind.ChildcareFee,
          effectiveMonth: month,
          title: cleanTitle,
          monthlyFee: toEuroAmount(Math.max(0, amountPrimary)),
          durationMonths: Math.max(1, Math.trunc(amountSecondary)),
          childIndex: 1,
          taxDeductible: true,
        };
        break;
      case LifeEventKind.RentChange:
        event = {
          id,
          domain: LifeEventDomain.HousingAsset,
          kind: LifeEventKind.RentChange,
          effectiveMonth: month,
          title: cleanTitle,
          newMonthlyRent: toEuroAmount(Math.max(0, amountPrimary)),
        };
        break;
      case LifeEventKind.HomePurchase:
        event = {
          id,
          domain: LifeEventDomain.HousingAsset,
          kind: LifeEventKind.HomePurchase,
          effectiveMonth: month,
          title: cleanTitle,
          purchasePrice: toEuroAmount(Math.max(0, amountPrimary)),
          closingCostsRate: toPercentageRate(0.085),
          downPayment: toEuroAmount(Math.max(0, amountSecondary)),
          annualInterestRate: toPercentageRate(Math.max(0, amountTertiary) / 100),
          initialRepaymentRate: toPercentageRate(0.02),
          monthlyMaintenanceReserve: toEuroAmount(300),
          annualAppreciationRate: toPercentageRate(0.02),
          replacesRent: true,
        };
        break;
      case LifeEventKind.SolarPvInstallation:
        event = {
          id,
          domain: LifeEventDomain.HousingAsset,
          kind: LifeEventKind.SolarPvInstallation,
          effectiveMonth: month,
          title: cleanTitle,
          upfrontCapex: toEuroAmount(Math.max(0, amountPrimary)),
          monthlyElectricitySavings: toEuroAmount(Math.max(0, amountSecondary * 0.7)),
          monthlyFeedInRevenue: toEuroAmount(Math.max(0, amountSecondary * 0.3)),
          durationMonths: 240,
        };
        break;
      case LifeEventKind.TaxClassSwitch:
        event = {
          id,
          domain: LifeEventDomain.Tax,
          kind: LifeEventKind.TaxClassSwitch,
          effectiveMonth: month,
          title: cleanTitle,
          primaryTaxClass,
          partnerTaxClass: hasPartner ? partnerTaxClass : undefined,
        };
        break;
      case LifeEventKind.DeductibleExpenses:
        event = {
          id,
          domain: LifeEventDomain.Tax,
          kind: LifeEventKind.DeductibleExpenses,
          effectiveMonth: month,
          title: cleanTitle,
          werbungskostenAnnual: toEuroAmount(0),
          sonderausgabenAnnual: toEuroAmount(Math.max(0, amountPrimary)),
          householdServicesLaborAnnual: toEuroAmount(Math.max(0, amountSecondary)),
          craftsmenLaborAnnual: toEuroAmount(0),
          recurringYearly: true,
        };
        break;
      case LifeEventKind.TravelTrip:
        event = {
          id,
          domain: LifeEventDomain.ExpenseTravel,
          kind: LifeEventKind.TravelTrip,
          effectiveMonth: month,
          title: cleanTitle,
          totalCost: toEuroAmount(Math.max(0, amountPrimary)),
        };
        break;
      case LifeEventKind.ResidencyMilestone:
        event = {
          id,
          domain: LifeEventDomain.Residency,
          kind: LifeEventKind.ResidencyMilestone,
          effectiveMonth: month,
          title: cleanTitle,
          milestoneKind,
          leadMonthsNotice: 3,
        };
        break;
      default:
        event = {
          id,
          domain: LifeEventDomain.ExpenseTravel,
          kind: LifeEventKind.OneOffCashflow,
          effectiveMonth: month,
          title: cleanTitle,
          signedAmount: toEuroAmount(amountPrimary),
          taxBucket: TaxBucket.NonTax,
        };
        break;
    }

    if (existingEvent) {
      updateLifeEvent(event);
    }
    else {
      addLifeEvent(event);
    }
    flushLifeWorkbenchCalculations();
    closeLifeEventComposer();
  };

  return (
    <div
      className="lpw-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={existingEvent ? "Edit Life Event" : "Add Life Event"}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeLifeEventComposer();
        }
      }}
    >
      <div className="lpw-modal">
        <div className="lpw-drawer__header">
          <h2 className="lpw-drawer__title">{existingEvent ? "Edit Life Event" : "Add Life Event"}</h2>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Ghost}
            onClick={closeLifeEventComposer}
            aria-label="Close Add Event modal"
          >
            <DismissIcon size={14} />
          </Button>
        </div>

        <div className="lpw-modal__body">
          <div className="lpw-field-grid">
            <div className="lpw-field">
              <label htmlFor="lpw-ev-kind">Event Type</label>
              <select
                id="lpw-ev-kind"
                value={kind}
                onChange={(e) => handleKindChange(toLifeEventKind(e.currentTarget.value))}
              >
                {COMPOSER_EVENT_OPTIONS.map((opt) => (
                  <option key={opt.kind} value={opt.kind}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="lpw-field">
              <label htmlFor="lpw-ev-month">Effective Month (1..{horizon})</label>
              <input
                id="lpw-ev-month"
                type="number"
                min={1}
                max={horizon}
                value={effectiveMonth}
                onInput={(e) => setEffectiveMonth(Number(e.currentTarget.value) || 1)}
              />
            </div>

            <div className="lpw-field">
              <label htmlFor="lpw-ev-title">Event Title</label>
              <input
                id="lpw-ev-title"
                type="text"
                value={title}
                onInput={(e) => setTitle(e.currentTarget.value)}
              />
            </div>

            {hasPartner && (
              <div className="lpw-field">
                <label htmlFor="lpw-ev-person">Person</label>
                <select
                  id="lpw-ev-person"
                  value={personKey}
                  onChange={(e) => setPersonKey(toLifePersonKey(e.currentTarget.value))}
                >
                  <option value={LifePersonKey.Primary}>Primary</option>
                  <option value={LifePersonKey.Partner}>Partner</option>
                </select>
              </div>
            )}
          </div>

          <div className="lpw-field-grid">
            {kind === LifeEventKind.SalaryRaise && (
              <div className="lpw-field">
                <label htmlFor="lpw-ev-p1">Raise Percentage (%)</label>
                <input
                  id="lpw-ev-p1"
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  value={amountPrimary}
                  onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                />
              </div>
            )}

            {kind === LifeEventKind.BonusSchedule && (
              <div className="lpw-field">
                <label htmlFor="lpw-ev-p1">Annual Gross Bonus (€)</label>
                <input
                  id="lpw-ev-p1"
                  type="number"
                  min={0}
                  step={500}
                  value={amountPrimary}
                  onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                />
              </div>
            )}

            {kind === LifeEventKind.JobChange && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">New Monthly Gross (€)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={0}
                    step={100}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Weekly Hours</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={1}
                    max={60}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 40)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.JobEnd && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-cause">Cause</label>
                  <select
                    id="lpw-ev-cause"
                    value={jobEndCause}
                    onChange={(e) => setJobEndCause(toJobEndCause(e.currentTarget.value))}
                  >
                    <option value={JobEndCause.EmployerTermination}>Fired (Immediate ALG I)</option>
                    <option value={JobEndCause.VoluntaryResignation}>Resigned (12w Sperrzeit)</option>
                    <option value={JobEndCause.Sabbatical}>Unpaid Sabbatical (€0 ALG I)</option>
                  </select>
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">Gap Duration (Months)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={1}
                    max={36}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 1)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Severance Gross (€, optional)</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={0}
                    step={1000}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.CompanyCar && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">List Price Gross (€)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={0}
                    step={1000}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-pt">Powertrain</label>
                  <select
                    id="lpw-ev-pt"
                    value={powertrain}
                    onChange={(e) => setPowertrain(toCompanyCarPowertrain(e.currentTarget.value))}
                  >
                    <option value={CompanyCarPowertrain.Electric}>Electric (0.25%)</option>
                    <option value={CompanyCarPowertrain.PlugInHybrid}>Plug-in Hybrid (0.5%)</option>
                    <option value={CompanyCarPowertrain.Combustion}>Combustion (1.0%)</option>
                  </select>
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">One-Way Commute (km)</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={0}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.CommuterProfile && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">One-Way Distance (km)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={0}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Office Days / Year</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={0}
                    max={300}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p3">Home-Office Days / Year</label>
                  <input
                    id="lpw-ev-p3"
                    type="number"
                    min={0}
                    max={250}
                    value={amountTertiary}
                    onInput={(e) => setAmountTertiary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.ChildBirth && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-lm">Elterngeld Mode</label>
                  <select
                    id="lpw-ev-lm"
                    value={leaveMode}
                    onChange={(e) => setLeaveMode(toParentalLeavePlanMode(e.currentTarget.value))}
                  >
                    <option value={ParentalLeavePlanMode.Basis}>Basis (up to €1,800/mo)</option>
                    <option value={ParentalLeavePlanMode.Plus}>Plus (up to €900/mo)</option>
                  </select>
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">Primary Leave Months</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={1}
                    max={24}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 1)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Partner Leave Months</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={0}
                    max={14}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.ChildcareFee && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">Monthly Kita Fee (€)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={0}
                    step={20}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Duration (Months)</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={1}
                    max={72}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 12)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.RentChange && (
              <div className="lpw-field">
                <label htmlFor="lpw-ev-p1">New Monthly Rent (€/mo)</label>
                <input
                  id="lpw-ev-p1"
                  type="number"
                  min={0}
                  step={50}
                  value={amountPrimary}
                  onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                />
              </div>
            )}

            {kind === LifeEventKind.HomePurchase && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">Purchase Price (€)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={0}
                    step={10000}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Down Payment (€)</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={0}
                    step={5000}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p3">Mortgage Interest Rate (%)</label>
                  <input
                    id="lpw-ev-p3"
                    type="number"
                    min={0}
                    max={15}
                    step={0.1}
                    value={amountTertiary}
                    onInput={(e) => setAmountTertiary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.SolarPvInstallation && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">Upfront Capex (€)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={0}
                    step={500}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Monthly Savings + Feed-in (€)</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={0}
                    step={10}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.TaxClassSwitch && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-tc1">Primary Tax Class</label>
                  <select
                    id="lpw-ev-tc1"
                    value={primaryTaxClass}
                    onChange={(e) => setPrimaryTaxClass(toTaxClass(e.currentTarget.value))}
                  >
                    {Object.values(TaxClass).map((tc) => (
                      <option key={tc} value={tc}>Class {tc}</option>
                    ))}
                  </select>
                </div>
                {hasPartner && (
                  <div className="lpw-field">
                    <label htmlFor="lpw-ev-tc2">Partner Tax Class</label>
                    <select
                      id="lpw-ev-tc2"
                      value={partnerTaxClass}
                      onChange={(e) => setPartnerTaxClass(toTaxClass(e.currentTarget.value))}
                    >
                      {Object.values(TaxClass).map((tc) => (
                        <option key={tc} value={tc}>Class {tc}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {kind === LifeEventKind.DeductibleExpenses && (
              <>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p1">Annual § 10 Sonderausgaben (€)</label>
                  <input
                    id="lpw-ev-p1"
                    type="number"
                    min={0}
                    step={100}
                    value={amountPrimary}
                    onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
                <div className="lpw-field">
                  <label htmlFor="lpw-ev-p2">Annual § 35a Household Labor (€)</label>
                  <input
                    id="lpw-ev-p2"
                    type="number"
                    min={0}
                    step={100}
                    value={amountSecondary}
                    onInput={(e) => setAmountSecondary(Number(e.currentTarget.value) || 0)}
                  />
                </div>
              </>
            )}

            {kind === LifeEventKind.TravelTrip && (
              <div className="lpw-field">
                <label htmlFor="lpw-ev-p1">Total Trip Cost (€)</label>
                <input
                  id="lpw-ev-p1"
                  type="number"
                  min={0}
                  step={100}
                  value={amountPrimary}
                  onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                />
              </div>
            )}

            {kind === LifeEventKind.OneOffCashflow && (
              <div className="lpw-field">
                <label htmlFor="lpw-ev-p1">Signed Amount (€, negative = outflow)</label>
                <input
                  id="lpw-ev-p1"
                  type="number"
                  step={500}
                  value={amountPrimary}
                  onInput={(e) => setAmountPrimary(Number(e.currentTarget.value) || 0)}
                />
              </div>
            )}

            {kind === LifeEventKind.ResidencyMilestone && (
              <div className="lpw-field">
                <label htmlFor="lpw-ev-res">Milestone Type</label>
                <select
                  id="lpw-ev-res"
                  value={milestoneKind}
                  onChange={(e) => setMilestoneKind(toResidencyMilestoneKind(e.currentTarget.value))}
                >
                  <option value={ResidencyMilestoneKind.PermanentResidency18c}>Permanent Residency (§ 18c AufenthG)</option>
                  <option value={ResidencyMilestoneKind.Citizenship10StAG}>German Citizenship (§ 10 StAG)</option>
                  <option value={ResidencyMilestoneKind.BlueCardIssued}>EU Blue Card (§ 18g AufenthG)</option>
                  <option value={ResidencyMilestoneKind.PermitRenewal}>Permit Renewal</option>
                  <option value={ResidencyMilestoneKind.ResidenceMove}>Residence Move (Anmeldung)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="lpw-modal__footer">
          <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={closeLifeEventComposer}>
            Cancel
          </Button>
          <Button size={ButtonSize.Sm} variant={ButtonVariant.Primary} onClick={handleSubmit}>
            <AddActionIcon size={13} />
            <span>{existingEvent ? "Save Changes" : "Add to Timeline"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
