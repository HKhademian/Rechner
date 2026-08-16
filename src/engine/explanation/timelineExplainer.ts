import {
  type TimelineMonth,
  type SpecialEventItem,
  type ActionRowItem,
  ScenarioId,
  TaxClass,
  ActionType,
  ActionCategory,
  SpecialEventType,
  SpecialEventCategory
} from '#engine/types';
import { LegalRuleKey, type LegalRuleKeyType } from '#store/elterngeldStore';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export type FieldColumnKey =
  | 'month'
  | 'phase'
  | 'taxClass'
  | 'husbandSalary'
  | 'wifeSalary'
  | 'mutterschutz'
  | 'wifeElterngeld'
  | 'husbandElterngeld'
  | 'kindergeld'
  | 'specialEvents'
  | 'netInflow'
  | 'cumulativeTotal';

export interface FieldExplanation {
  readonly fieldKey: string;
  readonly fieldTitle: string;
  readonly valueFormatted: string;
  readonly derivationFormula?: string;
  readonly explanation: string;
  readonly legalCitation?: string;
  readonly legalRuleKey?: LegalRuleKeyType;
  readonly diffVsBFormatted?: string;
}

export interface RowItemStream {
  readonly label: string;
  readonly value: number;
  readonly valueFormatted: string;
  readonly formula?: string;
  readonly notes?: string;
}

export interface RowExplanation {
  readonly rowType: 'month' | 'action' | 'special_event';
  readonly title: string;
  readonly subtitle: string;
  readonly phaseOrCategory: string;
  readonly taxClasses?: string;
  readonly summaryDescription: string;
  readonly streams: readonly RowItemStream[];
  readonly totalNetInflow: number;
  readonly totalNetInflowFormatted: string;
  readonly cumulatedTotal: number;
  readonly cumulatedTotalFormatted: string;
  readonly diffVsB?: number;
  readonly diffVsBFormatted?: string;
  readonly legalCitation?: string;
  readonly legalRuleKey?: LegalRuleKeyType;
  readonly actionDetails?: {
    readonly category: string;
    readonly targetPerson?: string;
    readonly effectiveMonth: number;
    readonly details: Record<string, string>;
  };
}

/**
 * Builds a field-level explanation for any column in a standard monthly row.
 */
export function getFieldExplanation(
  columnKey: FieldColumnKey,
  m: TimelineMonth,
  bMonth?: TimelineMonth,
  scenarioId: ScenarioId = ScenarioId.C
): FieldExplanation {
  const hSalary = m.husbandSalary as number;
  const wSalary = m.wifeSalary as number;
  const mutterschutzVal = m.mutterschutz as number;
  const wElterngeld = m.wifeElterngeld as number;
  const hElterngeld = m.husbandElterngeld as number;
  const kg = m.kindergeld as number;
  const spTotal = m.specialEventsTotal as number;
  const netInflow = m.monthlyTotal as number;
  const cumTotal = m.cumulatedTotal as number;

  const bNetInflow = bMonth ? (bMonth.monthlyTotal as number) : 0;
  const diffNet = netInflow - bNetInflow;
  const diffNetStr = diffNet !== 0 ? `${diffNet > 0 ? '+' : ''}${formatCurrency(diffNet)} vs Scenario B` : 'Identical to Scenario B';

  switch (columnKey) {
    case 'month':
      return {
        fieldKey: 'month',
        fieldTitle: `Simulation Month ${m.month} (${m.calendarLabel})`,
        valueFormatted: `Month ${m.month} · Year ${m.year}`,
        derivationFormula: `Start Year + (${m.month} - 1) div 12 $\\rightarrow$ Calendar Date`,
        explanation: `This represents Simulation Month ${m.month}, falling in ${m.calendarLabel} (${m.relativeBirthLabel}). In the 5-year multi-scenario simulation, every financial cash flow and milestone is mapped deterministically to this calendar month.`,
        legalCitation: 'BEEG § 2b (Bemessungszeitraum nach Lebens- & Kalendermonaten)'
      };

    case 'phase':
      return {
        fieldKey: 'phase',
        fieldTitle: 'Lifecycle / Employment Phase',
        valueFormatted: m.eventTag || m.phaseLabel,
        derivationFormula: 'Determined by pregnancy delivery offset and parental leave schedule',
        explanation: `In Month ${m.month}, the family is in the phase "${m.phaseLabel}". This phase governs active employment hours, maternity leave protections, parental allowance claims, and tax class configurations.`,
        legalCitation: 'BEEG § 4 (Basiselterngeld) & § 4a (ElterngeldPlus)'
      };

    case 'taxClass':
      return {
        fieldKey: 'taxClass',
        fieldTitle: 'Spousal Tax Class Combination (§ 38b EStG)',
        valueFormatted: m.taxClassLabel,
        derivationFormula: m.taxClassLabel.includes('III') ? 'Husband: Tax Class III / Wife: Tax Class V (or III swap)' : 'Standard baseline tax class assignment',
        explanation: `In Month ${m.month}, the spouses are assigned "${m.taxClassLabel}". Monthly wage tax withholding is calculated according to § 38b EStG. Any temporary withholding variance between III/V and IV/IV is reconciled annually via joint tax assessment (§ 26b EStG).`,
        legalCitation: 'EStG § 38b (Lohnsteuerklassen) & § 26b (Zusammenveranlagung)',
        legalRuleKey: LegalRuleKey.EStG_TaxSplitting
      };

    case 'husbandSalary': {
      const bHusband = bMonth ? (bMonth.husbandSalary as number) : hSalary;
      const diffH = hSalary - bHusband;
      return {
        fieldKey: 'husbandSalary',
        fieldTitle: "Husband's Monthly Net Salary",
        valueFormatted: formatCurrency(hSalary),
        derivationFormula: `Gross Salary $\\rightarrow$ § 38b Wage Tax (${m.taxClassLabel.split('/')[0] || 'Class III'}) $\\rightarrow$ Social Contributions $\\rightarrow$ Net`,
        explanation: `The husband's take-home pay for Month ${m.month} is ${formatCurrency(hSalary)}. When temporarily switched to Tax Class V during the prenatal swap, withholding increases, but the difference is fully refunded upon filing the annual tax return.`,
        legalCitation: 'EStG § 38b (Lohnsteuerabzug) & § 32a (Einkommensteuertarif)',
        legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        diffVsBFormatted: diffH !== 0 ? `${diffH > 0 ? '+' : ''}${formatCurrency(diffH)} vs B` : undefined
      };
    }

    case 'wifeSalary': {
      const bWife = bMonth ? (bMonth.wifeSalary as number) : wSalary;
      const diffW = wSalary - bWife;
      return {
        fieldKey: 'wifeSalary',
        fieldTitle: "Wife's Earned Net Salary",
        valueFormatted: formatCurrency(wSalary),
        derivationFormula: wSalary === 0
          ? '0 € (Full Maternity Leave / Mutterschutz § 3 MuSchG)'
          : `Full-Time Net × (Post-Birth Hours / Initial Hours) $\\rightarrow$ ${formatCurrency(wSalary)}`,
        explanation: wSalary === 0
          ? `The mother earns 0 € direct employment salary in Month ${m.month} because she is on statutory Maternity Protection (Mutterschutz) or full parental leave.`
          : `The mother earns ${formatCurrency(wSalary)} in Month ${m.month} from part-time gainful employment. Her earned net salary is calculated proportionally based on her weekly working hours.`,
        legalCitation: 'BEEG § 1 Abs. 1 Nr. 4 (Zulässige Teilzeit bis 32h/Woche)',
        legalRuleKey: LegalRuleKey.BEEG_SyntheticNet,
        diffVsBFormatted: diffW !== 0 ? `${diffW > 0 ? '+' : ''}${formatCurrency(diffW)} vs B` : undefined
      };
    }

    case 'mutterschutz': {
      const bMutterschutz = bMonth ? (bMonth.mutterschutz as number) : mutterschutzVal;
      const diffM = mutterschutzVal - bMutterschutz;
      return {
        fieldKey: 'mutterschutz',
        fieldTitle: 'Maternity Protection Allowance (Mutterschaftsgeld & AG-Zuschuss)',
        valueFormatted: formatCurrency(mutterschutzVal),
        derivationFormula: mutterschutzVal > 0
          ? 'Health Insurance (€13/day) + Employer Supplement (§ 20 MuSchG) = 100% Net Salary'
          : '0 € (Outside statutory 6-week pre-birth / 8-week post-birth protection window)',
        explanation: mutterschutzVal > 0
          ? `Under §§ 19, 20 MuSchG, the mother receives 100% wage replacement (${formatCurrency(mutterschutzVal)}) during the statutory protection period (6 weeks pre-birth to 8 weeks post-birth). In Scenario C, because of the prenatal tax class swap, this benefit is evaluated using the higher Tax Class III net salary!`
          : `0 € because Month ${m.month} falls outside the active maternity protection window.`,
        legalCitation: 'MuSchG § 19, § 20 & BEEG § 3 Abs. 1',
        legalRuleKey: LegalRuleKey.MuSchG_Maternity,
        diffVsBFormatted: diffM !== 0 ? `${diffM > 0 ? '+' : ''}${formatCurrency(diffM)} vs B` : undefined
      };
    }

    case 'wifeElterngeld': {
      const bWifeEg = bMonth ? (bMonth.wifeElterngeld as number) : wElterngeld;
      const diffWeg = wElterngeld - bWifeEg;
      return {
        fieldKey: 'wifeElterngeld',
        fieldTitle: "Mother's ElterngeldPlus / Parental Allowance",
        valueFormatted: formatCurrency(wElterngeld),
        derivationFormula: wElterngeld > 0
          ? 'Min(900 €, Max(150 €, 65% × (Pre-Birth Baseline Net - Post-Birth Part-Time Net)))'
          : '0 € (Outside parental allowance period or working > 32h/week § 1 BEEG)',
        explanation: wElterngeld > 0
          ? `The mother receives ${formatCurrency(wElterngeld)} in parental allowance under § 4a BEEG. In Scenario C, because the predominant pre-birth tax class was Class III (§ 2b BEEG), the baseline net income is locked at the maximum rate, yielding the statutory ceiling of 900 € / month!`
          : `0 € in Month ${m.month} because the mother is either in Mutterschutz (covered by 100% wage guarantee), outside the benefit period, or working more than 32 hours per week.`,
        legalCitation: 'BEEG § 2 (Ersatzrate), § 2b (Bemessungszeitraum), § 4a (ElterngeldPlus)',
        legalRuleKey: LegalRuleKey.BEEG_SyntheticNet,
        diffVsBFormatted: diffWeg !== 0 ? `${diffWeg > 0 ? '+' : ''}${formatCurrency(diffWeg)} vs B` : undefined
      };
    }

    case 'husbandElterngeld': {
      const bHusbandEg = bMonth ? (bMonth.husbandElterngeld as number) : hElterngeld;
      const diffHeg = hElterngeld - bHusbandEg;
      return {
        fieldKey: 'husbandElterngeld',
        fieldTitle: "Father's Partner Months / Partnership Bonus Allowance",
        valueFormatted: formatCurrency(hElterngeld),
        derivationFormula: hElterngeld > 0
          ? 'Statutory Minimum Floor 150 € / month (or 65% of salary loss up to 900 € / month)'
          : '0 € (Outside partner leave months / outside 24-32h partnership corridor)',
        explanation: hElterngeld > 0
          ? `The father receives ${formatCurrency(hElterngeld)} under § 4 Abs. 3 (Partner Months) or § 4b BEEG (Partnerschaftsbonus). In the Partnership Bonus months, both parents work concurrently between 24 and 32 hours per week, unlocking extra allowance for both.`
          : `0 € because the father is not claiming parental allowance in Month ${m.month}.`,
        legalCitation: 'BEEG § 4 Abs. 3 (Partnermonate) & § 4b (Partnerschaftsbonus)',
        legalRuleKey: LegalRuleKey.BEEG_PartnershipBonus,
        diffVsBFormatted: diffHeg !== 0 ? `${diffHeg > 0 ? '+' : ''}${formatCurrency(diffHeg)} vs B` : undefined
      };
    }

    case 'kindergeld': {
      return {
        fieldKey: 'kindergeld',
        fieldTitle: 'Statutory Child Benefit (Kindergeld § 66 EStG)',
        valueFormatted: formatCurrency(kg),
        derivationFormula: '250 € / month per qualifying living child living in household',
        explanation: `Under § 66 EStG / BKGG, the family receives ${formatCurrency(kg)} per month in child benefit (${Math.round(kg / 250)} child/children × 250 €). Kindergeld is paid universally and is tax-free.`,
        legalCitation: 'EStG § 66 (Höhe des Kindergeldes) & BKGG',
        legalRuleKey: LegalRuleKey.EStG_Kindergeld
      };
    }

    case 'specialEvents': {
      const bSpecial = bMonth ? (bMonth.specialEventsTotal as number) : spTotal;
      const diffSp = spTotal - bSpecial;
      return {
        fieldKey: 'specialEvents',
        fieldTitle: 'Special Payments, Bonuses & Tax Returns',
        valueFormatted: formatCurrency(spTotal),
        derivationFormula: 'Sum of all special fiscal events in this month (13th Salary + Tax Return + One-Off Inflows/Costs)',
        explanation: spTotal !== 0
          ? `Month ${m.month} includes ${formatCurrency(spTotal)} in special transactions (e.g. annual salary bonus, tax refund from joint assessment § 26b EStG, or one-off childcare expenses).`
          : `0 € (No one-off special fiscal payments or tax returns scheduled in Month ${m.month}).`,
        legalCitation: 'EStG § 26b (Steuererstattung) & § 2c BEEG (Sonstige Bezüge)',
        legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        diffVsBFormatted: diffSp !== 0 ? `${diffSp > 0 ? '+' : ''}${formatCurrency(diffSp)} vs B` : undefined
      };
    }

    case 'netInflow': {
      return {
        fieldKey: 'netInflow',
        fieldTitle: 'Total Monthly Net Household Inflow',
        valueFormatted: formatCurrency(netInflow),
        derivationFormula: 'Husband Salary + Wife Salary + Mutterschutz + Wife EG + Husband EG + Kindergeld + Special Payments',
        explanation: `The net liquid cash entering the household in Month ${m.month} is ${formatCurrency(netInflow)}. (${diffNetStr})`,
        legalCitation: 'EStG, MuSchG, BEEG Gesamtliquiditätsrechnung',
        diffVsBFormatted: diffNet !== 0 ? `${diffNet > 0 ? '+' : ''}${formatCurrency(diffNet)} vs B` : undefined
      };
    }

    case 'cumulativeTotal': {
      const bCum = bMonth ? (bMonth.cumulatedTotal as number) : cumTotal;
      const diffCum = cumTotal - bCum;
      return {
        fieldKey: 'cumulativeTotal',
        fieldTitle: 'Progressive Cumulative 5-Year Total',
        valueFormatted: formatCurrency(cumTotal),
        derivationFormula: 'Previous Month Cumulative Balance + Current Month Net Inflow',
        explanation: `The progressive cumulative net wealth accumulated from Month 1 through Month ${m.month} is ${formatCurrency(cumTotal)}. In Scenario C, this reflects all optimized tax swap benefits and parental allowance entitlements. (${diffCum > 0 ? `+${formatCurrency(diffCum)} ahead of Scenario B` : 'Baseline comparison'})`,
        legalCitation: '5-Year Multi-Scenario Financial Trajectory',
        diffVsBFormatted: diffCum !== 0 ? `${diffCum > 0 ? '+' : ''}${formatCurrency(diffCum)} vs B` : undefined
      };
    }
  }
}

/**
 * Builds a field-level explanation for an action milestone row.
 */
export function getActionFieldExplanation(
  fieldKey: string,
  act: ActionRowItem,
  m: TimelineMonth
): FieldExplanation {
  const isDelivery = act.type === ActionType.ChildDelivery;
  const isPregnancy = act.type === ActionType.PregnancyPositive;
  const isTaxSwitch = act.category === ActionCategory.TaxSwitch;

  switch (fieldKey) {
    case 'month':
      return {
        fieldKey: 'month',
        fieldTitle: `Action Milestone Event (Month ${m.month})`,
        valueFormatted: `↳ M${m.month} Event (${m.calendarLabel})`,
        derivationFormula: `Lifecycle action scheduled before Month ${m.month}`,
        explanation: `This row represents a discrete user action / lifecycle milestone occurring immediately prior to Month ${m.month} (${m.calendarLabel}).`,
        legalCitation: 'BEEG & EStG Lifecycle Trigger'
      };

    case 'title':
    case 'phase':
      return {
        fieldKey: 'title',
        fieldTitle: act.title,
        valueFormatted: act.title,
        derivationFormula: `Action Type: ${act.type} (${act.category})`,
        explanation: `${act.description} This action establishes the legal preconditions for subsequent benefits, salary calculations, and tax assessment.`,
        legalCitation: isTaxSwitch
          ? 'EStG § 38b & BFH Decision VI R 2/13 (Steuerklassenwechsel)'
          : isDelivery
          ? 'MuSchG § 3 Abs. 2 & BEEG § 4 (Geburt & Schutzfrist)'
          : isPregnancy
          ? 'MuSchG § 3 Abs. 1 (Mitteilung der Schwangerschaft)'
          : 'BGB § 611a (Gehaltsanpassung)',
        legalRuleKey: isTaxSwitch
          ? LegalRuleKey.BEEG_TaxSwap
          : isDelivery || isPregnancy
          ? LegalRuleKey.MuSchG_Maternity
          : undefined
      };

    case 'taxClass':
      return {
        fieldKey: 'taxClass',
        fieldTitle: 'Tax Class Configuration',
        valueFormatted: act.taxClassLabel || '—',
        derivationFormula: act.taxClassLabel || 'No tax class change',
        explanation: act.taxClassLabel
          ? `The spousal tax class is updated to "${act.taxClassLabel}".`
          : 'This action does not alter the spousal tax class.',
        legalCitation: 'EStG § 38b',
        legalRuleKey: LegalRuleKey.BEEG_TaxSwap
      };

    default:
      return {
        fieldKey,
        fieldTitle: 'Non-Monetary Action Row',
        valueFormatted: '—',
        explanation: `This is a non-monetary lifecycle milestone. It establishes status and timelines without directly altering monthly cash inflows on this specific event line.`,
        legalCitation: 'Statutory Milestone Precondition'
      };
  }
}

/**
 * Builds a field-level explanation for a special fiscal event row.
 */
export function getSpecialEventFieldExplanation(
  fieldKey: string,
  ev: SpecialEventItem,
  m: TimelineMonth,
  evCumulated: number,
  diffEvCumulated: number
): FieldExplanation {
  const isCost = (ev.amount as number) < 0;

  switch (fieldKey) {
    case 'month':
      return {
        fieldKey: 'month',
        fieldTitle: `Special Fiscal Event (Month ${m.month})`,
        valueFormatted: `↳ M${m.month} Event (${m.calendarLabel})`,
        derivationFormula: `Fiscal event triggering in Month ${m.month}`,
        explanation: `This row represents a discrete monetary transaction occurring in Month ${m.month} (${m.calendarLabel}).`,
        legalCitation: 'Fiscal Ledger Transaction'
      };

    case 'title':
    case 'phase':
      return {
        fieldKey: 'title',
        fieldTitle: ev.title,
        valueFormatted: ev.title,
        derivationFormula: `Event ID: ${ev.eventId} · Category: ${ev.category}`,
        explanation: `${ev.description || ev.title}. This transaction is credited/debited directly to the household ledger in Month ${m.month}.`,
        legalCitation: ev.type === SpecialEventType.TaxReturnRefund
          ? 'EStG § 26b (Einkommensteuererstattung)'
          : ev.type === SpecialEventType.AnnualSalaryBonus
          ? 'EStG § 38a (Sonstige Bezüge)'
          : 'BGB § 241 (Sonderzahlung / Aufwand)',
        legalRuleKey: ev.type === SpecialEventType.TaxReturnRefund ? LegalRuleKey.EStG_TaxSplitting : undefined
      };

    case 'amount':
    case 'specialEvents':
    case 'netInflow':
      return {
        fieldKey: 'amount',
        fieldTitle: isCost ? 'Fiscal Outflow / Expense' : 'Fiscal Inflow / Income',
        valueFormatted: formatCurrency(ev.amount as number),
        derivationFormula: `${isCost ? 'Debit (-)' : 'Credit (+)'} ${formatCurrency(Math.abs(ev.amount as number))}`,
        explanation: isCost
          ? `A one-off expenditure of ${formatCurrency(Math.abs(ev.amount as number))} reduces the monthly net inflow and cumulative total.`
          : `A one-off payment of ${formatCurrency(ev.amount as number)} increases the monthly net inflow and cumulative total.`,
        legalCitation: ev.type === SpecialEventType.TaxReturnRefund ? 'EStG § 26b (Zusammenveranlagung)' : undefined,
        legalRuleKey: ev.type === SpecialEventType.TaxReturnRefund ? LegalRuleKey.EStG_TaxSplitting : undefined
      };

    case 'cumulativeTotal':
      return {
        fieldKey: 'cumulativeTotal',
        fieldTitle: 'Progressive Cumulative Balance at Event',
        valueFormatted: formatCurrency(evCumulated),
        derivationFormula: 'Previous Month Cumulative Balance + Prior Events in Month + This Event Amount',
        explanation: `Progressive cumulative total balance immediately after applying this fiscal transaction is ${formatCurrency(evCumulated)}.`,
        diffVsBFormatted: diffEvCumulated !== 0 ? `${diffEvCumulated > 0 ? '+' : ''}${formatCurrency(diffEvCumulated)} vs B` : undefined
      };

    default:
      return {
        fieldKey,
        fieldTitle: 'Fiscal Event Detail',
        valueFormatted: '—',
        explanation: 'Event transaction parameter.',
        legalCitation: 'Fiscal Ledger Item'
      };
  }
}

/**
 * Builds a comprehensive full-row explanation for an entire standard monthly row.
 */
export function getRowExplanation(
  m: TimelineMonth,
  bMonth?: TimelineMonth,
  scenarioId: ScenarioId = ScenarioId.C
): RowExplanation {
  const hSalary = m.husbandSalary as number;
  const wSalary = m.wifeSalary as number;
  const mutterschutzVal = m.mutterschutz as number;
  const wElterngeld = m.wifeElterngeld as number;
  const hElterngeld = m.husbandElterngeld as number;
  const kg = m.kindergeld as number;
  const spTotal = m.specialEventsTotal as number;
  const netInflow = m.monthlyTotal as number;
  const cumTotal = m.cumulatedTotal as number;

  const bNetInflow = bMonth ? (bMonth.monthlyTotal as number) : 0;
  const diffNet = netInflow - bNetInflow;
  const bCum = bMonth ? (bMonth.cumulatedTotal as number) : cumTotal;
  const diffCum = cumTotal - bCum;

  const streams: RowItemStream[] = [];

  if (hSalary > 0) {
    streams.push({
      label: "Husband's Salary",
      value: hSalary,
      valueFormatted: formatCurrency(hSalary),
      formula: `Tax Class ${m.taxClassLabel.split('/')[0] || 'III'} Net Salary`,
      notes: 'Monthly employment wage'
    });
  }

  if (wSalary > 0) {
    streams.push({
      label: "Wife's Salary",
      value: wSalary,
      valueFormatted: formatCurrency(wSalary),
      formula: 'Part-Time Proportional Net',
      notes: 'Part-time employment earnings'
    });
  }

  if (mutterschutzVal > 0) {
    streams.push({
      label: 'Maternity Protection (Mutterschaftsgeld)',
      value: mutterschutzVal,
      valueFormatted: formatCurrency(mutterschutzVal),
      formula: '100% Net Wage Guarantee (Health Insurance + Employer)',
      notes: '§§ 19, 20 MuSchG'
    });
  }

  if (wElterngeld > 0) {
    streams.push({
      label: "Mother's ElterngeldPlus",
      value: wElterngeld,
      valueFormatted: formatCurrency(wElterngeld),
      formula: '65% of Pre-Birth vs Post-Birth Net Loss (Capped at 900 € / mo)',
      notes: '§ 4a BEEG'
    });
  }

  if (hElterngeld > 0) {
    streams.push({
      label: "Father's Elterngeld / Partner Bonus",
      value: hElterngeld,
      valueFormatted: formatCurrency(hElterngeld),
      formula: '150 € / mo Statutory Minimum (or 65% loss replacement)',
      notes: '§ 4 Abs. 3 / § 4b BEEG'
    });
  }

  if (kg > 0) {
    streams.push({
      label: 'Kindergeld',
      value: kg,
      valueFormatted: formatCurrency(kg),
      formula: `${Math.round(kg / 250)} Child(ren) × 250 € / mo`,
      notes: '§ 66 EStG'
    });
  }

  if (spTotal !== 0) {
    streams.push({
      label: 'Special Fiscal Payments / Tax Returns',
      value: spTotal,
      valueFormatted: formatCurrency(spTotal),
      formula: 'One-off transaction sum',
      notes: 'Bonuses, Refunds, or Custom Costs'
    });
  }

  return {
    rowType: 'month',
    title: `Month ${m.month} (${m.calendarLabel}) · Year ${m.year}`,
    subtitle: `${m.relativeBirthLabel} · Spousal Tax Classes: ${m.taxClassLabel}`,
    phaseOrCategory: m.phaseLabel,
    taxClasses: m.taxClassLabel,
    summaryDescription: `Detailed cash flow and statutory audit for Simulation Month ${m.month}. Total household net inflow for this month is ${formatCurrency(netInflow)}, bringing the progressive 5-year total to ${formatCurrency(cumTotal)}.`,
    streams,
    totalNetInflow: netInflow,
    totalNetInflowFormatted: formatCurrency(netInflow),
    cumulatedTotal: cumTotal,
    cumulatedTotalFormatted: formatCurrency(cumTotal),
    diffVsB: diffNet,
    diffVsBFormatted: diffNet !== 0 ? `${diffNet > 0 ? '+' : ''}${formatCurrency(diffNet)}` : '0 €',
    legalCitation: 'EStG, MuSchG & BEEG Statutory Framework',
    legalRuleKey: m.isSwapActive ? LegalRuleKey.BEEG_TaxSwap : LegalRuleKey.BEEG_SyntheticNet
  };
}

/**
 * Builds a full-row explanation for an action milestone row.
 */
export function getActionRowExplanation(
  act: ActionRowItem,
  m: TimelineMonth,
  scenarioId: ScenarioId = ScenarioId.C
): RowExplanation {
  const isDelivery = act.type === ActionType.ChildDelivery;
  const isPregnancy = act.type === ActionType.PregnancyPositive;
  const isTaxSwitch = act.category === ActionCategory.TaxSwitch;

  return {
    rowType: 'action',
    title: act.title,
    subtitle: `Scheduled prior to Month ${m.month} (${m.calendarLabel})`,
    phaseOrCategory: act.category,
    taxClasses: act.taxClassLabel || undefined,
    summaryDescription: `${act.description} This lifecycle milestone establishes the statutory preconditions for parental leave rights, wage replacement calculation periods, and tax class assignments.`,
    streams: [],
    totalNetInflow: 0,
    totalNetInflowFormatted: '— (Non-Monetary Action)',
    cumulatedTotal: 0,
    cumulatedTotalFormatted: '—',
    legalCitation: isTaxSwitch
      ? 'EStG § 38b & BFH VI R 2/13 (Steuerklassenwahl)'
      : isDelivery
      ? 'MuSchG § 3 Abs. 2 (Schutzfrist nach der Entbindung)'
      : 'MuSchG § 3 Abs. 1 (Mitteilung der Schwangerschaft)',
    legalRuleKey: isTaxSwitch
      ? LegalRuleKey.BEEG_TaxSwap
      : LegalRuleKey.MuSchG_Maternity,
    actionDetails: {
      category: act.category,
      effectiveMonth: m.month as number,
      details: {
        'Action ID': act.actionId,
        'Action Type': act.type,
        'Calendar Date': m.calendarLabel,
        'Effective Month': `Month ${m.month}`,
        'Description': act.description
      }
    }
  };
}

/**
 * Builds a full-row explanation for a special fiscal event row.
 */
export function getSpecialEventRowExplanation(
  ev: SpecialEventItem,
  m: TimelineMonth,
  bMonth?: TimelineMonth,
  prevMonthCumulated: number = 0,
  scenarioId: ScenarioId = ScenarioId.C
): RowExplanation {
  const evAmount = ev.amount as number;
  const isCost = evAmount < 0;

  const bEvents = bMonth?.specialEvents || [];
  const bMatch = bEvents.find(it => it.eventId === ev.eventId || it.title === ev.title || it.type === ev.type);
  const bEvAmount = bMatch ? (bMatch.amount as number) : 0;
  const diffEv = evAmount - bEvAmount;

  const evCumulated = prevMonthCumulated + evAmount;

  return {
    rowType: 'special_event',
    title: ev.title,
    subtitle: `Fiscal Event in Month ${m.month} (${m.calendarLabel})`,
    phaseOrCategory: ev.category,
    summaryDescription: `${ev.description || ev.title}. This transaction represents a ${isCost ? 'one-off expenditure' : 'special income/refund'} affecting the monthly net inflow and progressive balance.`,
    streams: [
      {
        label: ev.title,
        value: evAmount,
        valueFormatted: formatCurrency(evAmount),
        formula: `${isCost ? 'Deduction' : 'Credit'} of ${formatCurrency(Math.abs(evAmount))}`,
        notes: ev.category
      }
    ],
    totalNetInflow: evAmount,
    totalNetInflowFormatted: formatCurrency(evAmount),
    cumulatedTotal: evCumulated,
    cumulatedTotalFormatted: formatCurrency(evCumulated),
    diffVsB: diffEv,
    diffVsBFormatted: diffEv !== 0 ? `${diffEv > 0 ? '+' : ''}${formatCurrency(diffEv)}` : '0 €',
    legalCitation: ev.type === SpecialEventType.TaxReturnRefund ? 'EStG § 26b (Zusammenveranlagung)' : 'Fiscal Ledger Event',
    legalRuleKey: ev.type === SpecialEventType.TaxReturnRefund ? LegalRuleKey.EStG_TaxSplitting : undefined
  };
}
