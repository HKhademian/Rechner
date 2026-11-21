import "./TimelineTable.css";
import {
  LedgerRowKind,
  projectLedgerMonth,
} from "#engine/ledger/rows";
import {
  exportScenarioToCsv,
} from "#engine/storage/ledgerCsv";
import type {
  JSX,
} from "preact";
import {
  useState,
  useEffect,
} from "preact/hooks";
import LawRefLink from "#components/laws/LawRefLink";
import {
  currentScenarioData,
  activeScenario,
  scenarioBData,
  hoveredMonth,
  showSpecialEventRows,
  LEGAL_RULE_LAW_MAP,
  LegalRuleKey,
  activeLegalRuleKey,
} from "#store/elterngeldStore";
import {
  type CalendarYear,
  type StrategyId,
  type TimelineMonth,
  type SpecialEventItem,
  ActionType,
  ActionCategory,
  FieldColumnKey,
  ExplanationFieldKey,
  SimulationStrategy,
  ActiveStrategyView,
  toCalendarYear,
  toMonthSimRef,
} from "#engine/types";
import {
  ExportDataIcon,
  ChildBirthMilestoneIcon,
  TaxClassSwapMilestoneIcon,
  CareerPromotionMilestoneIcon,
  FinancialInflowIcon,
  StatutorySectionIcon,
  InformationalNoticeIcon,
  StepTransitionIcon,
} from "#components/Icons";
import {
  Badge,
  BadgeTone,
} from "#components/ui/Badge";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#components/ui/Button";
import {
  formatEur,
} from "#utils/currencyFormat";
import FieldExplainerModal from "./FieldExplainerModal";
import RowExplainerModal from "./RowExplainerModal";
import {
  type FieldExplanation,
  type RowExplanation,
  getFieldExplanation,
  getActionFieldExplanation,
  getSpecialEventFieldExplanation,
  getRowExplanation,
  getActionRowExplanation,
  getSpecialEventRowExplanation,
} from "#engine/explanation/timelineExplainer";

const LedgerCellTone = {
  Primary: "primary",
  Husband: "husband",
  Wife: "wife",
  Mutterschutz: "mutterschutz",
  EgMother: "eg-mother",
  EgFather: "eg-father",
  Kindergeld: "kindergeld",
  Gain: "gain",
  Loss: "loss",
} as const;
type LedgerCellTone = (typeof LedgerCellTone)[keyof typeof LedgerCellTone];

function formatCurrency(amount: number): string {
  return formatEur(amount || 0);
}

export default function TimelineTable(): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<CalendarYear | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showDelta, setShowDelta] = useState<boolean>(true);
  const [selectedFieldExplanation, setSelectedFieldExplanation] =
    useState<FieldExplanation | null>(null);
  const [selectedRowExplanation, setSelectedRowExplanation] =
    useState<RowExplanation | null>(null);

  const scenario: StrategyId =
    activeScenario.value === ActiveStrategyView.Compare
      ? SimulationStrategy.StatutoryOptimized
      : (activeScenario.value as StrategyId);
  const current = currentScenarioData.value;
  const bData = scenarioBData.value;
  const isSpecialRowsActive = showSpecialEventRows.value;

  const years = [...new Set(current.months.map((month) => month.year))];
  const availableYear = selectedYear !== null && years.includes(selectedYear) ? selectedYear : null;

  useEffect(() => {
    if (selectedYear !== null && !current.months.some((month) => month.year === selectedYear)) {
      setSelectedYear(null);
    }
  }, [current.months, selectedYear]);

  const filteredMonths = current.months.filter((m) => {
    if (availableYear !== null && m.year !== availableYear) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchMonth =
        `m${m.month}`.includes(term) ||
        `month ${m.month}`.includes(term) ||
        m.monthId.toLowerCase().includes(term) ||
        m.calendarLabel.includes(term) ||
        (m.relativeMonthLabel || m.relativeBirthLabel).toLowerCase().includes(term);
      const matchPhase = m.phaseLabel.toLowerCase().includes(term);
      const matchTax = m.taxClassLabel.toLowerCase().includes(term);
      const matchEvent = m.eventTag && m.eventTag.toLowerCase().includes(term);
      const matchSpecial =
        m.specialEvents &&
        m.specialEvents.some(
          (e: SpecialEventItem) =>
            e.title.toLowerCase().includes(term) ||
            (e.category as string).toLowerCase().includes(term) ||
            e.monthId.toLowerCase().includes(term),
        );
      if (!matchMonth && !matchPhase && !matchTax && !matchEvent && !matchSpecial) {
        return false;
      }
    }
    return true;
  });

  const exportCSV = (): void => {
    const url = URL.createObjectURL(new Blob([exportScenarioToCsv(current, bData)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Elterngeld_Simulation_Scenario_${scenario}_${current.months.length}M_Ledger_v2.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const showTargetDiff = showDelta && scenario === SimulationStrategy.StatutoryOptimized;

  const renderDiffBadge = (diff: number): JSX.Element => {
    if (diff === 0) {
      return <span className="eg-ledger__diff">0 €</span>;
    }
    const isPositive = diff > 0;
    const prefix = isPositive ? "+" : "";
    return (
      <span className={`eg-ledger__diff ${isPositive ? "eg-ledger__diff--gain" : "eg-ledger__diff--loss"}`}>
        {prefix}{formatCurrency(diff)}
      </span>
    );
  };

  const renderCell = (
    value: number,
    diff: number,
    showZeroAsDash = true,
    tone: LedgerCellTone = LedgerCellTone.Primary,
    isBoldValue = false,
  ): JSX.Element => {
    const displayVal = value === 0 && showZeroAsDash ? "—" : formatCurrency(value);
    const toneClass = tone === LedgerCellTone.Primary ? "" : ` eg-ledger__val--${tone}`;
    return (
      <div className="eg-ledger__val-stack">
        <span className={`eg-ledger__val${isBoldValue ? " eg-ledger__val--bold" : ""}${toneClass}`}>
          {displayVal}
        </span>
        {showTargetDiff && renderDiffBadge(diff)}
      </div>
    );
  };

  return (
    <div className="ui-card eg-ledger">
      <div className="eg-ledger__toolbar">
        <div>
          <h3 className="eg-ledger__title">
            {current.months.length}-Month Cash Flow Ledger
          </h3>
          <p className="eg-ledger__subtitle">
            {showTargetDiff
              ? "Actual cash flow with differences compared to the unoptimized baseline."
              : "Monthly take-home salary, parental benefits, annual bonuses, and tax refunds."}
          </p>
        </div>

        <div className="eg-ledger__filters">
          {scenario === SimulationStrategy.StatutoryOptimized && (
            <Button
              size={ButtonSize.Sm}
              variant={showDelta ? ButtonVariant.Tint : ButtonVariant.Secondary}
              active={showDelta}
              onClick={() => setShowDelta(!showDelta)}
            >
              Show differences from baseline
            </Button>
          )}

          <Button
            size={ButtonSize.Sm}
            variant={isSpecialRowsActive ? ButtonVariant.Tint : ButtonVariant.Secondary}
            active={isSpecialRowsActive}
            onClick={() => {
              showSpecialEventRows.value = !showSpecialEventRows.value;
            }}
          >
            Show event rows separately
          </Button>

          <input
            type="text"
            aria-label="Filter phase, event, or month"
            placeholder="Filter phase, event, month..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="eg-ledger__search"
          />

          <select
            aria-label="Ledger simulation year"
            value={availableYear ?? "all"}
            className="ui-select ui-select--compact eg-ledger__year-select"
            onChange={(e) => {
              const value = e.currentTarget.value;
              setSelectedYear(value === "all" ? null : toCalendarYear(Number(value)));
            }}
          >
            <option value="all">All years</option>
            {years.map((year) => {
              const months = current.months.filter((month) => month.year === year);
              return (
                <option key={year} value={year}>
                  Year {year} (Months {months[0]?.month}–{months.at(-1)?.month})
                </option>
              );
            })}
          </select>

          <Button size={ButtonSize.Sm} onClick={exportCSV}>
            <ExportDataIcon size={14} />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      <p className="planner-ledger-scroll-hint">Scroll horizontally to see all columns.</p>
      <div
        tabIndex={0}
        role="region"
        aria-label="Monthly cash flow table; scroll horizontally to see all columns"
        className="eg-ledger__scroll"
      >
        <table className="eg-ledger__table">
          <thead>
            <tr className="eg-ledger__thead-row">
              <th className="eg-ledger__th-left">Month / Entry</th>
              <th className="eg-ledger__th-left">Phase / Milestone / Event</th>
              <th className="eg-ledger__th-left">Tax Classes (Steuerklassen)</th>
              <th>
                <div>Husband Base Salary</div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th>
                <div>Wife Base Salary</div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th>
                <div>
                  <span>Maternity </span>
                  <LawRefLink
                    lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.MuSchG_Maternity].lawId}
                    groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.MuSchG_Maternity].groupId}
                    variant="plain"
                    className="eg-ledger__law-link eg-ledger__law-link--primary"
                    onOpen={() => {
                      activeLegalRuleKey.value = LegalRuleKey.MuSchG_Maternity;
                    }}
                    title="§ 3 MuSchG statutory rule and example — Click for quick popup · Ctrl+Click for full page"
                  >
                    <span>(MuSchG)</span>
                    <StatutorySectionIcon size={10} />
                  </LawRefLink>
                </div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th>
                <div>
                  <span>Elterngeld </span>
                  <LawRefLink
                    lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_SyntheticNet].lawId}
                    groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_SyntheticNet].groupId}
                    variant="plain"
                    className="eg-ledger__law-link eg-ledger__law-link--gain"
                    onOpen={() => {
                      activeLegalRuleKey.value = LegalRuleKey.BEEG_SyntheticNet;
                    }}
                    title="§§ 4, 4a BEEG statutory rules (Basiselterngeld & ElterngeldPlus) — Click for quick popup · Ctrl+Click for full page"
                  >
                    <span>(§§ 4, 4a BEEG)</span>
                    <StatutorySectionIcon size={10} />
                  </LawRefLink>
                </div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th>
                <div>
                  <span>Partner Months </span>
                  <LawRefLink
                    lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_PartnershipBonus].lawId}
                    groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_PartnershipBonus].groupId}
                    variant="plain"
                    className="eg-ledger__law-link eg-ledger__law-link--warning"
                    onOpen={() => {
                      activeLegalRuleKey.value = LegalRuleKey.BEEG_PartnershipBonus;
                    }}
                    title="§ 4b BEEG Partnership Bonus statutory rule and example — Click for quick popup · Ctrl+Click for full page"
                  >
                    <span>(§ 4b BEEG)</span>
                    <StatutorySectionIcon size={10} />
                  </LawRefLink>
                </div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th>
                <div>
                  <span>Child Benefit </span>
                  <LawRefLink
                    lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_Kindergeld].lawId}
                    groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_Kindergeld].groupId}
                    variant="plain"
                    className="eg-ledger__law-link eg-ledger__law-link--kindergeld"
                    onOpen={() => {
                      activeLegalRuleKey.value = LegalRuleKey.EStG_Kindergeld;
                    }}
                    title="§ 66 EStG Kindergeld statutory rule and example — Click for quick popup · Ctrl+Click for full page"
                  >
                    <span>(§ 66 EStG)</span>
                    <StatutorySectionIcon size={10} />
                  </LawRefLink>
                </div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th>
                <div>
                  <span>Special / Tax </span>
                  <LawRefLink
                    lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_TaxSplitting].lawId}
                    groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.EStG_TaxSplitting].groupId}
                    variant="plain"
                    className="eg-ledger__law-link eg-ledger__law-link--tax"
                    onOpen={() => {
                      activeLegalRuleKey.value = LegalRuleKey.EStG_TaxSplitting;
                    }}
                    title="§ 26b EStG Marital Splitting statutory rule and example — Click for quick popup · Ctrl+Click for full page"
                  >
                    <span>(§ 26b)</span>
                    <StatutorySectionIcon size={10} />
                  </LawRefLink>
                </div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th className="eg-ledger__th-primary">
                <div>Net Inflow</div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
              <th className="eg-ledger__th-secondary">
                <div>Cumulated</div>
                {showTargetDiff && <div className="eg-ledger__th-sub">Target / Δ vs B</div>}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMonths.map((m: TimelineMonth) => {
              const isHovered = hoveredMonth.value === m.month;
              const bMonth = bData.months.find((baseline) => baseline.monthId === m.monthId);
              const projected = projectLedgerMonth(m, bMonth);
              const actionRows = projected.filter((row) => row.kind === LedgerRowKind.Action);
              const financialRows = projected.filter((row) => row.kind === LedgerRowKind.FinancialEvent);
              const baseRow = projected.find((row) => row.kind === LedgerRowKind.Month)!;

              const diffHusband = m.husbandSalary - (bMonth ? bMonth.husbandSalary : 0);
              const diffWife = m.wifeSalary - (bMonth ? bMonth.wifeSalary : 0);
              const diffMutterschutz = m.mutterschutz - (bMonth ? bMonth.mutterschutz : 0);
              const diffWifeElterngeld = m.wifeElterngeld - (bMonth ? bMonth.wifeElterngeld : 0);
              const diffHusbandElterngeld = m.husbandElterngeld - (bMonth ? bMonth.husbandElterngeld : 0);
              const diffKindergeld = m.kindergeld - (bMonth ? bMonth.kindergeld : 0);
              const diffSpecialEvents = m.specialEventsTotal - (bMonth ? bMonth.specialEventsTotal : 0);
              const diffRegularNetInflow = baseRow.deltaAmount ?? 0;
              const diffNetInflow = m.monthlyTotal - (bMonth ? bMonth.monthlyTotal : 0);
              const diffCumulated = baseRow.deltaCumulative ?? 0;
              const hasEvents = isSpecialRowsActive && financialRows.length > 0;

              return [
                actionRows.length > 0 &&
                  actionRows.map(({ action: act }) => {
                    const isDelivery = act.type === ActionType.ChildDelivery;
                    const isPregnancy = act.type === ActionType.PregnancyPositive;
                    const isTaxSwitch = act.category === ActionCategory.TaxSwitch;
                    const isReallocation = act.type === ActionType.ElterngeldReallocation;

                    const badgeTone = isDelivery || isTaxSwitch
                      ? BadgeTone.Brand
                      : isPregnancy
                        ? BadgeTone.Warning
                        : isReallocation
                          ? BadgeTone.Gain
                          : BadgeTone.Neutral;

                    const badgeLabel = isDelivery ? (
                      <>
                        <ChildBirthMilestoneIcon size={12} />
                        <span>BIRTH &amp; DELIVERY</span>
                      </>
                    ) : isPregnancy ? (
                      <>
                        <ChildBirthMilestoneIcon size={12} />
                        <span>PREGNANCY POSITIVE</span>
                      </>
                    ) : isTaxSwitch ? (
                      act.type === ActionType.TaxClassSwitchRevert ? (
                        <>
                          <TaxClassSwapMilestoneIcon size={12} />
                          <span>TAX REVERSION</span>
                        </>
                      ) : (
                        <>
                          <TaxClassSwapMilestoneIcon size={12} />
                          <span>TAX CLASS SWITCH</span>
                        </>
                      )
                    ) : isReallocation ? (
                      <>
                        <StepTransitionIcon size={12} />
                        <span>ELTERNGELD REALLOCATION</span>
                      </>
                    ) : (
                      <>
                        <CareerPromotionMilestoneIcon size={12} />
                        <span>SALARY RAISE</span>
                      </>
                    );

                    const cleanTitle = act.title.replace(/^ACTION:\s*/, "");

                    return (
                      <tr
                        key={act.actionId}
                        className={`eg-ledger__row eg-ledger__row--action${isHovered ? " is-hovered" : ""}`}
                        onMouseEnter={() => {
                          hoveredMonth.value = m.month;
                        }}
                        onMouseLeave={() => {
                          hoveredMonth.value = null;
                        }}
                      >
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact eg-ledger__cell--action-month"
                          title="Click to view action milestone derivation or inspect full row"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getActionFieldExplanation(ExplanationFieldKey.Month, act, m),
                            )
                          }
                        >
                          <div className="eg-ledger__month-flex">
                            <div>
                              <div>
                                ↳ {act.relativeMonthLabel || m.relativeMonthLabel || act.relativeBirthLabel} Event
                              </div>
                              <div className="eg-ledger__month-meta">
                                ({m.calendarLabel}) · {act.monthId}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="eg-ledger__inspect-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowExplanation(getActionRowExplanation(act, m, scenario));
                              }}
                              title="Inspect full action milestone details"
                            >
                              <InformationalNoticeIcon size={12} />
                            </button>
                          </div>
                        </td>
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact eg-ledger__cell--left"
                          title="Click to view milestone details and legal context"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getActionFieldExplanation(ExplanationFieldKey.Title, act, m),
                            )
                          }
                        >
                          <div className="eg-ledger__event-head">
                            <Badge tone={badgeTone}>{badgeLabel}</Badge>
                            <span className="eg-ledger__event-title">{cleanTitle}</span>
                          </div>
                          <div className="eg-ledger__event-desc">{act.description}</div>
                        </td>
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact eg-ledger__cell--left eg-ledger__cell--muted"
                          title="Click to view tax class assignment"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getActionFieldExplanation(ExplanationFieldKey.TaxClass, act, m),
                            )
                          }
                        >
                          {act.taxClassLabel || "—"}
                        </td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                      </tr>
                    );
                  }),

                hasEvents &&
                  financialRows.map((row) => {
                    const ev = row.event;
                    const evDiff = row.deltaAmount ?? 0;
                    const isCost = ev.amount < 0;
                    const evCumulated = row.cumulative;
                    const diffEvCumulated = row.deltaCumulative ?? 0;

                    const badgeTone = isCost
                      ? BadgeTone.Loss
                      : (ev.type as string).startsWith("bonus")
                        ? BadgeTone.Brand
                        : BadgeTone.Gain;

                    const valTone = isCost ? LedgerCellTone.Loss : LedgerCellTone.Gain;

                    return (
                      <tr
                        key={ev.eventId}
                        className={`eg-ledger__row eg-ledger__row--fiscal${isHovered ? " is-hovered" : ""}`}
                        onMouseEnter={() => {
                          hoveredMonth.value = m.month;
                        }}
                        onMouseLeave={() => {
                          hoveredMonth.value = null;
                        }}
                      >
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact eg-ledger__cell--fiscal-month"
                          title="Click to view event derivation or inspect full row"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.Month,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          <div className="eg-ledger__month-flex">
                            <div>
                              <div>
                                ↳ {ev.relativeMonthLabel || m.relativeMonthLabel || ev.relativeBirthLabel}{" "}
                                {isCost ? "Cost" : "Event"}
                              </div>
                              <div className="eg-ledger__month-meta">
                                ({ev.calendarLabel}) · {ev.monthId}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="eg-ledger__inspect-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRowExplanation(
                                  getSpecialEventRowExplanation(
                                    ev,
                                    m,
                                    bMonth,
                                    evCumulated - ev.amount,
                                    scenario,
                                  ),
                                );
                              }}
                              title="Inspect full fiscal event breakdown"
                            >
                              <InformationalNoticeIcon size={12} />
                            </button>
                          </div>
                        </td>
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact eg-ledger__cell--left"
                          title="Click to view event description and legal rule"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.Title,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          <div className="eg-ledger__event-head">
                            <Badge tone={badgeTone}>
                              {isCost ? <FinancialInflowIcon size={11} /> : null}
                              <span>{ev.category}</span>
                            </Badge>
                            <span className="eg-ledger__event-title">{ev.title}</span>
                          </div>
                          <div className="eg-ledger__event-desc">{ev.description}</div>
                        </td>
                        <td className="eg-ledger__cell--compact eg-ledger__cell--left eg-ledger__cell--muted">
                          <div>{ev.taxClassLabel}</div>
                          {showTargetDiff && (
                            <div className="eg-ledger__month-meta">
                              {evDiff !== 0 ? "Splitting Reconciled" : "Same as B"}
                            </div>
                          )}
                        </td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td className="eg-ledger__cell--dash">—</td>
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact"
                          title="Click to view transaction amount and formula derivation"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.Amount,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          {renderCell(ev.amount, evDiff, false, valTone, true)}
                        </td>
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact"
                          title="Click to view net inflow calculation"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.NetInflow,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          {renderCell(ev.amount, evDiff, false, valTone, true)}
                        </td>
                        <td
                          className="eg-ledger__cell eg-ledger__cell--compact"
                          title="Click to view cumulative balance derivation"
                          onClick={() =>
                            setSelectedFieldExplanation(
                              getSpecialEventFieldExplanation(
                                ExplanationFieldKey.CumulativeTotal,
                                ev,
                                m,
                                evCumulated,
                                diffEvCumulated,
                              ),
                            )
                          }
                        >
                          {renderCell(evCumulated, diffEvCumulated, false, LedgerCellTone.Primary, false)}
                        </td>
                      </tr>
                    );
                  }),

                <tr
                  key={m.monthId}
                  className={`eg-ledger__row${m.eventTag ? " eg-ledger__row--event-tagged" : ""}${isHovered ? " is-hovered" : ""}`}
                  onMouseEnter={() => {
                    hoveredMonth.value = m.month;
                  }}
                  onMouseLeave={() => {
                    hoveredMonth.value = null;
                  }}
                >
                  <td
                    className="eg-ledger__cell eg-ledger__cell--month"
                    title="Click to view month derivation or click info button to inspect the full row"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.Month, m, bMonth, scenario),
                      )
                    }
                  >
                    <div className="eg-ledger__month-flex">
                      <div>
                        <div className="eg-ledger__month-head">
                          <span className="eg-ledger__month-rel">
                            {m.relativeMonthLabel || m.relativeBirthLabel}
                          </span>
                          <span className="eg-ledger__month-cal">
                            ({m.calendarLabel})
                          </span>
                        </div>
                        <div className="eg-ledger__month-meta">
                          {m.monthId} · {m.monthSimRef || toMonthSimRef(m.month)} · Y{m.year}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="eg-ledger__inspect-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRowExplanation(getRowExplanation(m, bMonth, scenario));
                        }}
                        title="Inspect full monthly cash flow and statutory audit"
                      >
                        <InformationalNoticeIcon size={12} />
                      </button>
                    </div>
                  </td>
                  <td
                    className="eg-ledger__cell eg-ledger__cell--left"
                    title="Click to view lifecycle phase explanation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.Phase, m, bMonth, scenario),
                      )
                    }
                  >
                    {m.eventTag ? (
                      <Badge tone={BadgeTone.Brand}>{m.eventTag}</Badge>
                    ) : (
                      <span className="eg-ledger__phase-text">{m.phaseLabel}</span>
                    )}
                  </td>
                  <td
                    className="eg-ledger__cell eg-ledger__cell--left"
                    title="Click to view tax class derivation and legal basis"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.TaxClass, m, bMonth, scenario),
                      )
                    }
                  >
                    <div className={`eg-ledger__tax-class${m.isSwapActive ? " is-swapped" : ""}`}>
                      {m.taxClassLabel}
                    </div>
                    {showTargetDiff && (
                      <div className={`eg-ledger__tax-delta${m.isSwapActive ? " is-swapped" : ""}`}>
                        {m.isSwapActive ? "Swapped (vs. B: III/V)" : "Same as B (III/V)"}
                      </div>
                    )}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view husband gross-to-net calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.HusbandSalary, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(m.husbandSalary, diffHusband, true, LedgerCellTone.Husband, true)}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view wife gross-to-net calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.WifeSalary, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(m.wifeSalary, diffWife, true, LedgerCellTone.Wife, true)}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view statutory Mutterschutz wage replacement formula"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.Mutterschutz, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(m.mutterschutz, diffMutterschutz, true, LedgerCellTone.Mutterschutz, true)}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view § 4 BEEG synthetic net and Elterngeld derivation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.WifeElterngeld, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(m.wifeElterngeld, diffWifeElterngeld, true, LedgerCellTone.EgMother, true)}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view partner months calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.HusbandElterngeld, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(m.husbandElterngeld, diffHusbandElterngeld, true, LedgerCellTone.EgFather, true)}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view § 66 EStG Kindergeld calculation"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.Kindergeld, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(m.kindergeld, diffKindergeld, true, LedgerCellTone.Kindergeld, false)}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view 13th month / special tax events"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.SpecialEvents, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(
                      isSpecialRowsActive ? 0 : m.specialEventsTotal,
                      isSpecialRowsActive ? 0 : diffSpecialEvents,
                      true,
                      isSpecialRowsActive
                        ? LedgerCellTone.Primary
                        : m.specialEventsTotal < 0
                          ? LedgerCellTone.Loss
                          : LedgerCellTone.Gain,
                      true,
                    )}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view total monthly inflow sum"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.NetInflow, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(
                      isSpecialRowsActive ? baseRow.amount : m.monthlyTotal,
                      isSpecialRowsActive ? diffRegularNetInflow : diffNetInflow,
                      false,
                      LedgerCellTone.Primary,
                      true,
                    )}
                  </td>
                  <td
                    className="eg-ledger__cell"
                    title="Click to view cumulative total balance"
                    onClick={() =>
                      setSelectedFieldExplanation(
                        getFieldExplanation(FieldColumnKey.CumulativeTotal, m, bMonth, scenario),
                      )
                    }
                  >
                    {renderCell(baseRow.cumulative, diffCumulated, false, LedgerCellTone.Primary, true)}
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>

      {selectedFieldExplanation && (
        <FieldExplainerModal
          explanation={selectedFieldExplanation}
          onClose={() => setSelectedFieldExplanation(null)}
        />
      )}

      {selectedRowExplanation && (
        <RowExplainerModal
          explanation={selectedRowExplanation}
          onClose={() => setSelectedRowExplanation(null)}
        />
      )}
    </div>
  );
}
