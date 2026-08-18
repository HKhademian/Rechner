import {
  type TimelineMonth,
  type SpecialEventItem,
  type ActionRowItem,
  ScenarioId,
  ActionType,
  ActionCategory,
  SpecialEventType,
  FieldColumnKey,
  ExplanationFieldKey,
  ExplainerRowType,
  toFieldColumnKey,
  toExplanationFieldKey,
  toStatutoryCitation,
  toEuroAmount,
  type StatutoryCitation,
  type EuroAmount,
} from "#engine/types";
import {
  LegalRuleKey, type LegalRuleKeyType, 
} from "#store/elterngeldStore";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Contributing Factor in a Financial Derivation Breakdown.
 * Itemizes key input assumptions, legal parameters, or intermediate calculation values.
 */
export interface CalculationFactor {
  /** Name or title of the contributing factor (e.g. 'Statutory Replacement Rate'). */
  readonly name: string;
  /** Formatted display value (e.g. '65.0%', '1.975 €'). */
  readonly value: string;
  /** Optional contextual note or statutory justification. */
  readonly description?: string;
}

/**
 * Sequential Step in a Mathematical Derivation Breakdown.
 * Shows intermediate calculation steps and formulas in human-readable notation.
 */
export interface CalculationStep {
  /** 1-based sequential step order number. */
  readonly stepNumber: number;
  /** Description of what this calculation step performs. */
  readonly description: string;
  /** Mathematical formula string with substituted numbers. */
  readonly formula: string;
  /** Intermediate or final computed result of the step. */
  readonly result: string;
}

/**
 * Detailed Field-Level Explanation Structure.
 * Supplies comprehensive mathematical, statutory, and comparative drill-down data for a single column cell.
 */
export interface FieldExplanation {
  /** Field column key being explained. */
  readonly fieldKey: ExplanationFieldKey;
  /** User-facing display title header. */
  readonly fieldTitle: string;
  /** Formatted financial value string (e.g. '2.603 €'). */
  readonly valueFormatted: string;
  /** High-level mathematical derivation formula string. */
  readonly derivationFormula?: string;
  /** Rich explanatory text with domain rules and legal context. */
  readonly explanation: string;
  /** Itemized list of contributing calculation factors. */
  readonly contributingFactors?: readonly CalculationFactor[];
  /** Step-by-step arithmetic derivation steps. */
  readonly calculationSteps?: readonly CalculationStep[];
  /** Formal statutory legal citation reference. */
  readonly legalCitation?: StatutoryCitation;
  /** Key identifying the corresponding statutory legal framework card for deep linking. */
  readonly legalRuleKey?: LegalRuleKeyType;
  /** Formatted financial variance versus unoptimized Scenario B (e.g. '+720 €'). */
  readonly diffVsBFormatted?: string;
}

/**
 * Itemized Cash Flow Stream within a Timeline Row Explanation.
 */
export interface RowItemStream {
  /** Stream display label (e.g. "Husband's Salary", "ElterngeldPlus"). */
  readonly label: string;
  /** Numeric euro monetary value. */
  readonly value: EuroAmount;
  /** Formatted euro currency string. */
  readonly valueFormatted: string;
  /** Arithmetic formula describing the stream's origin. */
  readonly formula?: string;
  /** Explanatory notes or statutory basis. */
  readonly notes?: string;
}

/**
 * Comprehensive Full-Row Explanation Structure.
 * Supplies complete month, action milestone, or special event cash flow breakdowns and scenario delta comparisons.
 */
export interface RowExplanation {
  /** Explainer row structural type (MONTH, ACTION, or SPECIAL_EVENT). */
  readonly rowType: ExplainerRowType;
  /** Primary modal header title. */
  readonly title: string;
  /** Secondary subtitle (e.g. calendar date and simulation month). */
  readonly subtitle: string;
  /** Life phase or action category description. */
  readonly phaseOrCategory: string;
  /** Active tax class bracket configuration during this row. */
  readonly taxClasses?: string;
  /** High-level summary description of the row's financial events. */
  readonly summaryDescription: string;
  /** Itemized cash flow component streams making up total inflow. */
  readonly streams: readonly RowItemStream[];
  /** Total net household cash inflow for the month in EUR. */
  readonly totalNetInflow: EuroAmount;
  /** Formatted total net inflow string. */
  readonly totalNetInflowFormatted: string;
  /** Running cumulative household net total from simulation start through this row in EUR. */
  readonly cumulatedTotal: EuroAmount;
  /** Formatted running cumulative total string. */
  readonly cumulatedTotalFormatted: string;
  /** Net cash flow variance versus unoptimized Scenario B in EUR. */
  readonly diffVsB?: EuroAmount;
  /** Formatted delta versus Scenario B string (e.g. '+720 €'). */
  readonly diffVsBFormatted?: string;
  /** Statutory legal citation reference. */
  readonly legalCitation?: StatutoryCitation;
  /** Key identifying the statutory legal framework card for deep linking. */
  readonly legalRuleKey?: LegalRuleKeyType;
  /** Detailed structural properties for milestone action rows. */
  readonly actionDetails?: {
    readonly category: ActionCategory;
    readonly targetPerson?: string;
    readonly effectiveMonth: number;
    readonly details: Record<string, string>;
  };
}

function parseTaxReturnDetails(ev: SpecialEventItem, m: TimelineMonth) {
  const desc = ev.description || "";
  const swapDeficitMatch = desc.match(
    /Tax Class V wage withholding deficit \(\+([\d.]+)\s*€\)/,
  );
  const baseDeductionMatch = desc.match(
    /statutory deductions return \(\+([\d.]+)\s*€\)/,
  );
  const guenstigerMatch = desc.match(
    /Kinderfreibetrag Günstigerprüfung bonus \(\+([\d.]+)\s*€ over Kindergeld\)/,
  );
  const taxYearMatch = desc.match(/Tax Year (\d+)/);

  const taxYear = taxYearMatch
    ? taxYearMatch[1]
    : String(m.calendarYearNum - 1);
  const swapDeficitStr = swapDeficitMatch ? `+${swapDeficitMatch[1]} €` : "0 €";
  const swapDeficitNum = swapDeficitMatch
    ? Number(swapDeficitMatch[1].replace(/\./g, ""))
    : 0;
  const baseReturnStr = baseDeductionMatch
    ? `+${baseDeductionMatch[1]} €`
    : "+850 €";
  const baseReturnNum = baseDeductionMatch
    ? Number(baseDeductionMatch[1].replace(/\./g, ""))
    : 850;
  const guenstigerBonusStr = guenstigerMatch
    ? `+${guenstigerMatch[1]} € (Child Tax Allowance Bonus over Kindergeld)`
    : "Kindergeld minimum floor retained (0 € extra)";
  const guenstigerBonusNum = guenstigerMatch
    ? Number(guenstigerMatch[1].replace(/\./g, ""))
    : 0;

  const totalRefundNum = (ev.amount as number) || 0;

  const contributingFactors: CalculationFactor[] = [
    {
      name: "Assessed Tax Year",
      value: `Tax Year ${taxYear}`,
      description: `Reconciled in Month ${m.month} (${m.calendarLabel})`,
    },
    {
      name: "Assessment Method & Tariff",
      value: "Joint Assessment (§ 26b EStG)",
      description: "Ehegatten-Splitting (§ 32a Abs. 5 EStG)",
    },
    {
      name: "Wage Tax Swap Recovery (§ 38b EStG)",
      value: swapDeficitStr,
      description: "Reconciliation of interim Class V withholding deficit",
    },
    {
      name: "Statutory Base Deductions Return",
      value: baseReturnStr,
      description: "Werbungskosten & Sonderausgaben standard allowance",
    },
    {
      name: "Child Allowance Günstigerprüfung (§ 31 EStG)",
      value: guenstigerBonusStr,
      description: "Kinderfreibetrag (€9.540/child) vs. received Kindergeld",
    },
    {
      name: "Total Liquid Tax Return Refund",
      value: formatCurrency(totalRefundNum),
      description: "Lump-sum cash refund disbursed by the Tax Office",
    },
  ];

  const calculationSteps: CalculationStep[] = [
    {
      stepNumber: 1,
      description: `Reconcile interim wage tax withholding deficit (Class V vs Splitting tariff) for Tax Year ${taxYear}`,
      formula:
        "Sum of monthly Class V withholding differences across active swap months",
      result: swapDeficitStr,
    },
    {
      stepNumber: 2,
      description:
        "Credit statutory baseline deductions & Werbungskosten return",
      formula: "Statutory standard deduction allowance",
      result: baseReturnStr,
    },
    {
      stepNumber: 3,
      description:
        "Execute § 31 EStG Günstigerprüfung (compare joint tax with Kinderfreibetrag vs received Kindergeld)",
      formula:
        "Max(0, Tax Savings with Kinderfreibetrag - Received Kindergeld)",
      result:
        guenstigerBonusNum > 0
          ? `+${guenstigerBonusNum.toLocaleString("de-DE")} €`
          : "0 € (Kindergeld floor protected)",
    },
    {
      stepNumber: 4,
      description:
        "Sum all reconciliation components into total liquid tax return refund",
      formula: `${swapDeficitNum > 0 ? `${formatCurrency(swapDeficitNum)} (Swap Deficit) + ` : ""}${formatCurrency(baseReturnNum)} (Base Return)${guenstigerBonusNum > 0 ? ` + ${formatCurrency(guenstigerBonusNum)} (Günstigerprüfung)` : ""}`,
      result: formatCurrency(totalRefundNum),
    },
  ];

  const detailedExplanation = `Annual income tax reconciliation (*Einkommensteuererklärung / Steuerbescheid*) for Tax Year ${taxYear}. Under § 26b and § 46 Abs. 2 Nr. 3a EStG, married couples utilizing Tax Classes III/V are subject to mandatory joint assessment with splitting tariff (*Ehegatten-Splitting* § 32a Abs. 5 EStG). This legally guarantees 100% recovery of the interim Class V withholding deficit (${swapDeficitStr}), grants standard statutory deductions (${baseReturnStr}), and automatically executes the § 31 EStG *Günstigerprüfung* to add any child tax allowance savings above received Kindergeld. The resulting ${formatCurrency(totalRefundNum)} is credited directly to household liquidity in Month ${m.month}.`;

  return {
    taxYear,
    swapDeficitStr,
    swapDeficitNum,
    baseReturnStr,
    baseReturnNum,
    guenstigerBonusStr,
    guenstigerBonusNum,
    totalRefundNum,
    contributingFactors,
    calculationSteps,
    detailedExplanation,
  };
}

/**
 * Builds a comprehensive field-level explanation for any column in a standard monthly row.
 * Generates mathematical formulas, step-by-step calculation proofs, statutory legal citations,
 * and scenario comparison deltas.
 *
 * @param columnKey - The ledger column key being queried.
 * @param m - The monthly timeline ledger entry.
 * @param bMonth - Optional corresponding month in unoptimized Scenario B for delta comparison.
 * @param scenarioId - Active scenario identifier (defaults to Scenario C).
 * @returns Fully populated `FieldExplanation` structure.
 */
export function getFieldExplanation(
  columnKey: FieldColumnKey,
  m: TimelineMonth,
  bMonth?: TimelineMonth,
  scenarioId: ScenarioId = ScenarioId.C,
): FieldExplanation {
  const validatedKey = toFieldColumnKey(columnKey);
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
  const diffNetStr =
    diffNet !== 0
      ? `${diffNet > 0 ? "+" : ""}${formatCurrency(diffNet)} vs Scenario B`
      : "Identical to Scenario B";

  switch (validatedKey) {
    case FieldColumnKey.Month:
      return {
        fieldKey: ExplanationFieldKey.Month,
        fieldTitle: `Simulation Month ${m.month} (${m.calendarLabel})`,
        valueFormatted: `Month ${m.month} · Year ${m.year}`,
        derivationFormula: `Start Year + (${m.month} - 1) div 12 $\\rightarrow$ Calendar Date`,
        explanation: `This represents Simulation Month ${m.month}, falling in ${m.calendarLabel} (${m.relativeBirthLabel}). In the 5-year multi-scenario simulation, every financial cash flow and milestone is mapped deterministically to this calendar month.`,
        contributingFactors: [
          {
            name: "Simulation Month",
            value: `Month ${m.month} of 60`,
            description: "Progressive timeline index",
          },
          {
            name: "Calendar Date",
            value: m.calendarLabel,
            description: "Statutory assessment calendar month",
          },
          {
            name: "Relative Birth Offset",
            value: m.relativeBirthLabel,
            description: "Distance from delivery milestone",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Compute calendar year offset",
            formula: `2026 + floor((${m.month} - 1) / 12)`,
            result: `Year ${m.year}`,
          },
          {
            stepNumber: 2,
            description: "Compute calendar month",
            formula: `((${m.month} - 1) % 12) + 1`,
            result: m.calendarLabel,
          },
        ],
        legalCitation: toStatutoryCitation(
          "BEEG § 2b (Bemessungszeitraum nach Lebens- & Kalendermonaten)",
        ),
      };

    case FieldColumnKey.Phase:
      return {
        fieldKey: ExplanationFieldKey.Phase,
        fieldTitle: "Lifecycle / Employment Phase",
        valueFormatted: m.eventTag || m.phaseLabel,
        derivationFormula:
          "Determined by pregnancy delivery offset and parental leave schedule",
        explanation: `In Month ${m.month}, the family is in the phase "${m.phaseLabel}". This phase governs active employment hours, maternity leave protections, parental allowance claims, and tax class configurations.`,
        contributingFactors: [
          {
            name: "Active Phase",
            value: m.phaseLabel,
            description: "Statutory benefit or employment phase",
          },
          {
            name: "Mother Work Status",
            value:
              wSalary === 0 && mutterschutzVal > 0
                ? "Maternity Protection (100% leave)"
                : wSalary > 0
                  ? "Part-Time Work (24h/wk)"
                  : "Parental Leave",
            description: "Gainful employment status",
          },
        ],
        legalCitation: toStatutoryCitation(
          "BEEG § 4 (Basiselterngeld) & § 4a (ElterngeldPlus)",
        ),
      };

    case FieldColumnKey.TaxClass:
      return {
        fieldKey: ExplanationFieldKey.TaxClass,
        fieldTitle: "Spousal Tax Class Combination (§ 38b EStG)",
        valueFormatted: m.taxClassLabel,
        derivationFormula: m.taxClassLabel.includes("III")
          ? "Husband: Tax Class III / Wife: Tax Class V (or III swap)"
          : "Standard baseline tax class assignment",
        explanation: `In Month ${m.month}, the spouses are assigned "${m.taxClassLabel}". Monthly wage tax withholding is calculated according to § 38b EStG. Any temporary withholding variance between III/V and IV/IV is reconciled annually via joint tax assessment (§ 26b EStG).`,
        contributingFactors: [
          {
            name: "Active Spousal Classes",
            value: m.taxClassLabel,
            description: "Monthly payroll tax withholding configuration",
          },
          {
            name: "Tax Swap Status",
            value: m.isSwapActive
              ? "Active Prenatal Optimization Swap"
              : "Standard Baseline Combination",
            description: "Optimized vs unoptimized classification",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Determine spousal monthly withholding class",
            formula: "EStG § 38b table mapping",
            result: m.taxClassLabel,
          },
          {
            stepNumber: 2,
            description: "Reconcile spousal splitting tariff variance",
            formula: "Joint Assessment (§ 26b EStG)",
            result: "Excess withholding fully refunded annually",
          },
        ],
        legalCitation: toStatutoryCitation(
          "EStG § 38b (Lohnsteuerklassen) & § 26b (Zusammenveranlagung)",
        ),
        legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
      };

    case FieldColumnKey.HusbandSalary: {
      const bHusband = bMonth ? (bMonth.husbandSalary as number) : hSalary;
      const diffH = hSalary - bHusband;
      const activeClass = m.taxClassLabel.split("/")[0] || "Class III";
      return {
        fieldKey: ExplanationFieldKey.HusbandSalary,
        fieldTitle: "Husband's Monthly Net Salary",
        valueFormatted: formatCurrency(hSalary),
        derivationFormula: `Gross Salary $\\rightarrow$ § 38b Wage Tax (${activeClass}) $\\rightarrow$ Social Contributions $\\rightarrow$ Net`,
        explanation: `The husband's take-home pay for Month ${m.month} is ${formatCurrency(hSalary)}. When temporarily switched to Tax Class V during the prenatal swap, withholding increases, but the difference is fully refunded upon filing the annual tax return.`,
        contributingFactors: [
          {
            name: "Base Gross Salary",
            value: "~4.500 € / month",
            description: "Regular full-time employment gross",
          },
          {
            name: "Active Tax Class",
            value: activeClass,
            description: "Withholding wage tax tariff",
          },
          {
            name: "Statutory Social Contributions",
            value: "~1.065 € / month",
            description: "Health, Pension, Care, Unemployment insurance",
          },
          {
            name: "Wage Tax Withholding",
            value: activeClass.includes("III")
              ? "~1.200 € / month"
              : "~2.195 € / month",
            description: "Advance payroll tax deduction (§ 38b EStG)",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Compute social security deductions",
            formula: "BBG assessment ceilings applied",
            result: "~1.065 €",
          },
          {
            stepNumber: 2,
            description: `Compute wage tax withholding for ${activeClass}`,
            formula: "§ 32a progressive tariff formula",
            result: activeClass.includes("III") ? "~1.200 €" : "~2.195 €",
          },
          {
            stepNumber: 3,
            description: "Compute net take-home salary",
            formula: "Gross - Social Security - Wage Tax",
            result: formatCurrency(hSalary),
          },
        ],
        legalCitation: toStatutoryCitation(
          "EStG § 38b (Lohnsteuerabzug) & § 32a (Einkommensteuertarif)",
        ),
        legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        diffVsBFormatted:
          diffH !== 0
            ? `${diffH > 0 ? "+" : ""}${formatCurrency(diffH)} vs B`
            : undefined,
      };
    }

    case FieldColumnKey.WifeSalary: {
      const bWife = bMonth ? (bMonth.wifeSalary as number) : wSalary;
      const diffW = wSalary - bWife;
      const isFullLeave = wSalary === 0;
      const ftBase = 1975;
      return {
        fieldKey: ExplanationFieldKey.WifeSalary,
        fieldTitle: "Wife's Earned Net Salary",
        valueFormatted: formatCurrency(wSalary),
        derivationFormula: isFullLeave
          ? "0 € (Full Maternity Leave / Mutterschutz § 3 MuSchG)"
          : `Full-Time Net (${formatCurrency(ftBase)}) × (24h / 40h) $\\rightarrow$ ${formatCurrency(wSalary)}`,
        explanation: isFullLeave
          ? `The mother earns 0 € direct employment salary in Month ${m.month} because she is on statutory Maternity Protection (Mutterschutz) or full parental leave.`
          : `The mother earns ${formatCurrency(wSalary)} in Month ${m.month} from part-time gainful employment. Her earned net salary is calculated proportionally based on her weekly working hours.`,
        contributingFactors: [
          {
            name: "Full-Time Baseline Net",
            value: `${formatCurrency(ftBase)} / month (Class V)`,
            description: "Full 40h/week baseline salary",
          },
          {
            name: "Initial Contract Hours",
            value: "40 hours / week",
            description: "Standard contractual working week",
          },
          {
            name: "Post-Birth Part-Time Hours",
            value: isFullLeave ? "0 hours / week" : "24 hours / week",
            description: "Actual working hours in this month",
          },
          {
            name: "Hours Scaling Ratio",
            value: isFullLeave ? "0%" : "60.0% (24 / 40)",
            description: "Proportional working time",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Determine working time ratio",
            formula: isFullLeave ? "0h / 40h" : "24h / 40h",
            result: isFullLeave ? "0.0" : "0.60",
          },
          {
            stepNumber: 2,
            description: "Scale full-time net salary",
            formula: `${formatCurrency(ftBase)} × ${isFullLeave ? "0.0" : "0.60"}`,
            result: formatCurrency(wSalary),
          },
        ],
        legalCitation: toStatutoryCitation(
          "BEEG § 1 Abs. 1 Nr. 4 (Zulässige Teilzeit bis 32h/Woche)",
        ),
        legalRuleKey: LegalRuleKey.BEEG_SyntheticNet,
        diffVsBFormatted:
          diffW !== 0
            ? `${diffW > 0 ? "+" : ""}${formatCurrency(diffW)} vs B`
            : undefined,
      };
    }

    case FieldColumnKey.Mutterschutz: {
      const bMutterschutz = bMonth
        ? (bMonth.mutterschutz as number)
        : mutterschutzVal;
      const diffM = mutterschutzVal - bMutterschutz;
      const preNet = scenarioId === ScenarioId.C ? 2603 : 1975;
      return {
        fieldKey: ExplanationFieldKey.Mutterschutz,
        fieldTitle:
          "Maternity Protection Allowance (Mutterschaftsgeld & AG-Zuschuss)",
        valueFormatted: formatCurrency(mutterschutzVal),
        derivationFormula:
          mutterschutzVal > 0
            ? "Health Insurance (€13/day) + Employer Supplement (§ 20 MuSchG) = 100% Net Salary"
            : "0 € (Outside statutory 6-week pre-birth / 8-week post-birth protection window)",
        explanation:
          mutterschutzVal > 0
            ? `Under §§ 19, 20 MuSchG, the mother receives 100% wage replacement (${formatCurrency(mutterschutzVal)}) during the statutory protection period (6 weeks pre-birth to 8 weeks post-birth). In Scenario C, because of the prenatal tax class swap, this benefit is evaluated using the higher Tax Class III net salary!`
            : `0 € because Month ${m.month} falls outside the active maternity protection window.`,
        contributingFactors:
          mutterschutzVal > 0
            ? [
              {
                name: "Pre-Birth Average Net Baseline",
                value: `${formatCurrency(preNet)} / month`,
                description: `Evaluated in ${scenarioId === ScenarioId.C ? "Tax Class III (Optimized)" : "Tax Class V"}`,
              },
              {
                name: "Health Insurance Mutterschaftsgeld",
                value: "13 € / day (390 € / mo)",
                description:
                    "Statutory health insurance daily benefit (§ 19 MuSchG)",
              },
              {
                name: "Employer Mandatory Supplement",
                value: `${formatCurrency(Math.max(0, preNet - 390))} / month`,
                description: "Arbeitgeberzuschuss under § 20 MuSchG",
              },
              {
                name: "Statutory Protection Window",
                value: "6 weeks pre-birth + 8 weeks post-birth",
                description: "Mandatory paid leave (§ 3 MuSchG)",
              },
            ]
            : [
              {
                name: "Protection Window Status",
                value: "Inactive (0 €)",
                description:
                    "Outside 6-week pre-birth / 8-week post-birth window",
              },
            ],
        calculationSteps:
          mutterschutzVal > 0
            ? [
              {
                stepNumber: 1,
                description: "Compute health insurance daily grant",
                formula: "30 days × 13 € / day",
                result: "390 €",
              },
              {
                stepNumber: 2,
                description: "Compute mandatory employer supplement",
                formula: `${formatCurrency(preNet)} - 390 €`,
                result: formatCurrency(Math.max(0, preNet - 390)),
              },
              {
                stepNumber: 3,
                description: "Combine for 100% wage guarantee",
                formula: `390 € + ${formatCurrency(Math.max(0, preNet - 390))}`,
                result: formatCurrency(mutterschutzVal),
              },
            ]
            : [
              {
                stepNumber: 1,
                description: "Check statutory maternity window",
                formula: "Month in [delivery - 1, delivery, delivery + 1]",
                result: "0 € (Outside protection window)",
              },
            ],
        legalCitation: toStatutoryCitation(
          "MuSchG § 19, § 20 & BEEG § 3 Abs. 1",
        ),
        legalRuleKey: LegalRuleKey.MuSchG_Maternity,
        diffVsBFormatted:
          diffM !== 0
            ? `${diffM > 0 ? "+" : ""}${formatCurrency(diffM)} vs B`
            : undefined,
      };
    }

    case FieldColumnKey.WifeElterngeld: {
      const bWifeEg = bMonth ? (bMonth.wifeElterngeld as number) : wElterngeld;
      const diffWeg = wElterngeld - bWifeEg;
      const preNet = scenarioId === ScenarioId.C ? 2603 : 1975;
      const ptNet = wSalary;
      const netLoss = Math.max(0, preNet - ptNet);
      const rawBenefit = Math.round(netLoss * 0.65);
      return {
        fieldKey: ExplanationFieldKey.WifeElterngeld,
        fieldTitle: "Mother's ElterngeldPlus / Parental Allowance",
        valueFormatted: formatCurrency(wElterngeld),
        derivationFormula:
          wElterngeld > 0
            ? `Min(900 €, Max(150 €, 65% × (${formatCurrency(preNet)} - ${formatCurrency(ptNet)}))) = ${formatCurrency(wElterngeld)}`
            : "0 € (Outside parental allowance period or working > 32h/week § 1 BEEG)",
        explanation:
          wElterngeld > 0
            ? `The mother receives ${formatCurrency(wElterngeld)} in parental allowance under § 4a BEEG. In Scenario C, because the predominant pre-birth tax class was Class III (§ 2b BEEG), the baseline net income is locked at ${formatCurrency(preNet)}, yielding the statutory ceiling of 900 € / month!`
            : `0 € in Month ${m.month} because the mother is either in Mutterschutz (covered by 100% wage guarantee), outside the benefit period, or working more than 32 hours per week.`,
        contributingFactors:
          wElterngeld > 0
            ? [
              {
                name: "Pre-Birth Assessment Net (§ 2b BEEG)",
                value: `${formatCurrency(preNet)} / month`,
                description:
                    scenarioId === ScenarioId.C
                      ? "Locked at Tax Class III Synthetic Net"
                      : "Unoptimized Tax Class V Net",
              },
              {
                name: "Post-Birth Part-Time Net (24h/wk)",
                value: `${formatCurrency(ptNet)} / month`,
                description: "Actual earned employment income",
              },
              {
                name: "Net Income Loss (ΔNet)",
                value: `${formatCurrency(netLoss)} / month`,
                description: "Pre-Birth Net - Post-Birth Net",
              },
              {
                name: "Statutory Replacement Rate (§ 2 BEEG)",
                value: "65.0%",
                description: "Wage replacement percentage",
              },
              {
                name: "Statutory Maximum Cap (§ 4a BEEG)",
                value: "900 € / month",
                description: "50% of monthly full entitlement cap",
              },
            ]
            : [
              {
                name: "Benefit Status",
                value: "0 € / month",
                description: "Outside claim window or working > 32h/week",
              },
            ],
        calculationSteps:
          wElterngeld > 0
            ? [
              {
                stepNumber: 1,
                description: "Calculate monthly net salary drop (ΔNet)",
                formula: `${formatCurrency(preNet)} - ${formatCurrency(ptNet)}`,
                result: formatCurrency(netLoss),
              },
              {
                stepNumber: 2,
                description: "Apply 65% statutory replacement rate",
                formula: `${formatCurrency(netLoss)} × 65%`,
                result: `${formatCurrency(rawBenefit)} / month`,
              },
              {
                stepNumber: 3,
                description: "Apply statutory ElterngeldPlus cap / floor",
                formula: `Min(900 €, Max(150 €, ${formatCurrency(rawBenefit)}))`,
                result: formatCurrency(wElterngeld),
              },
            ]
            : [
              {
                stepNumber: 1,
                description:
                    "Evaluate statutory eligibility (§ 1 & § 4 BEEG)",
                formula:
                    "Check active leave phase and working hours (<= 32h)",
                result: "0 € (Ineligible in this month)",
              },
            ],
        legalCitation: toStatutoryCitation(
          "BEEG § 2 (Ersatzrate), § 2b (Bemessungszeitraum), § 4a (ElterngeldPlus)",
        ),
        legalRuleKey: LegalRuleKey.BEEG_SyntheticNet,
        diffVsBFormatted:
          diffWeg !== 0
            ? `${diffWeg > 0 ? "+" : ""}${formatCurrency(diffWeg)} vs B`
            : undefined,
      };
    }

    case FieldColumnKey.HusbandElterngeld: {
      const bHusbandEg = bMonth
        ? (bMonth.husbandElterngeld as number)
        : hElterngeld;
      const diffHeg = hElterngeld - bHusbandEg;
      return {
        fieldKey: ExplanationFieldKey.HusbandElterngeld,
        fieldTitle: "Father's Partner Months / Partnership Bonus Allowance",
        valueFormatted: formatCurrency(hElterngeld),
        derivationFormula:
          hElterngeld > 0
            ? "Statutory Minimum Floor 150 € / month (or 65% of salary loss up to 900 € / month)"
            : "0 € (Outside partner leave months / outside 24-32h partnership corridor)",
        explanation:
          hElterngeld > 0
            ? `The father receives ${formatCurrency(hElterngeld)} under § 4 Abs. 3 (Partner Months) or § 4b BEEG (Partnerschaftsbonus). In the Partnership Bonus months, both parents work concurrently between 24 and 32 hours per week, unlocking extra allowance for both.`
            : `0 € because the father is not claiming parental allowance in Month ${m.month}.`,
        contributingFactors:
          hElterngeld > 0
            ? [
              {
                name: "Father Post-Birth Hours",
                value: "32 hours / week (Part-Time)",
                description: "Working within statutory 24-32h corridor",
              },
              {
                name: "Entitlement Type",
                value: m.phaseLabel.includes("Partnerschaftsbonus")
                  ? "Partnerschaftsbonus (§ 4b BEEG)"
                  : "Partner Months (§ 4 Abs. 3 BEEG)",
                description: "Statutory benefit category",
              },
              {
                name: "Statutory Minimum Allowance Floor",
                value: "150 € / month",
                description: "Guaranteed statutory minimum benefit",
              },
            ]
            : [
              {
                name: "Benefit Status",
                value: "0 € / month",
                description: "Not claiming parental allowance in this month",
              },
            ],
        calculationSteps:
          hElterngeld > 0
            ? [
              {
                stepNumber: 1,
                description: "Verify statutory working hours corridor",
                formula: "24h <= 32h <= 32h per week (§ 4b BEEG)",
                result: "Eligible (Within Corridor)",
              },
              {
                stepNumber: 2,
                description: "Apply statutory ElterngeldPlus minimum rate",
                formula: "Max(150 €, 65% × Salary Loss)",
                result: formatCurrency(hElterngeld),
              },
            ]
            : [
              {
                stepNumber: 1,
                description: "Check father claim schedule",
                formula:
                    "Month in Partner Months or Partnership Bonus window",
                result: "0 € (Inactive)",
              },
            ],
        legalCitation: toStatutoryCitation(
          "BEEG § 4 Abs. 3 (Partnermonate) & § 4b (Partnerschaftsbonus)",
        ),
        legalRuleKey: LegalRuleKey.BEEG_PartnershipBonus,
        diffVsBFormatted:
          diffHeg !== 0
            ? `${diffHeg > 0 ? "+" : ""}${formatCurrency(diffHeg)} vs B`
            : undefined,
      };
    }

    case FieldColumnKey.Kindergeld: {
      const childCount = Math.max(1, Math.round(kg / 250));
      return {
        fieldKey: ExplanationFieldKey.Kindergeld,
        fieldTitle: "Statutory Child Benefit (Kindergeld § 66 EStG)",
        valueFormatted: formatCurrency(kg),
        derivationFormula: `${childCount} Child(ren) × 250 € / month = ${formatCurrency(kg)}`,
        explanation: `Under § 66 EStG / BKGG, the family receives ${formatCurrency(kg)} per month in child benefit (${childCount} child/children × 250 €). Kindergeld is paid universally and is tax-free.`,
        contributingFactors: [
          {
            name: "Eligible Living Children",
            value: `${childCount} child(ren)`,
            description: "Children living in household",
          },
          {
            name: "Statutory Monthly Rate per Child",
            value: "250 € / month",
            description: "Universal child benefit (§ 66 EStG)",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Multiply child count by statutory rate",
            formula: `${childCount} × 250 €`,
            result: formatCurrency(kg),
          },
        ],
        legalCitation: toStatutoryCitation(
          "EStG § 66 (Höhe des Kindergeldes) & BKGG",
        ),
        legalRuleKey: LegalRuleKey.EStG_Kindergeld,
      };
    }

    case FieldColumnKey.SpecialEvents: {
      const bSpecial = bMonth ? (bMonth.specialEventsTotal as number) : spTotal;
      const diffSp = spTotal - bSpecial;
      const taxReturnEvent = m.specialEvents?.find(
        (e: SpecialEventItem) => e.type === SpecialEventType.TaxReturn,
      );

      if (taxReturnEvent) {
        const taxDetails = parseTaxReturnDetails(taxReturnEvent, m);
        return {
          fieldKey: ExplanationFieldKey.SpecialEvents,
          fieldTitle: "Annual Tax Return & Special Fiscal Events",
          valueFormatted: formatCurrency(spTotal),
          derivationFormula:
            "Swap Withholding Deficit Refund + Base Deductions (+850 €) + § 31 EStG Günstigerprüfung Bonus",
          explanation: taxDetails.detailedExplanation,
          contributingFactors: taxDetails.contributingFactors,
          calculationSteps: taxDetails.calculationSteps,
          legalCitation: toStatutoryCitation(
            "EStG § 26b (*Ehegatten-Splitting*), § 31 (*Günstigerprüfung*), § 46 Abs. 2 Nr. 3a",
          ),
          legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
          diffVsBFormatted:
            diffSp !== 0
              ? `${diffSp > 0 ? "+" : ""}${formatCurrency(diffSp)} vs B`
              : undefined,
        };
      }

      const explText =
        spTotal !== 0
          ? `Month ${m.month} includes ${formatCurrency(spTotal)} in special transactions (e.g. 13th month salary bonus or one-off childcare expenses).`
          : `0 € (No one-off special fiscal payments or tax returns scheduled in Month ${m.month}).`;

      const factors: CalculationFactor[] = [
        {
          name: "Total Special Inflows",
          value: spTotal > 0 ? formatCurrency(spTotal) : "0 €",
          description: "Bonuses or Special Receipts",
        },
        {
          name: "Total Special Outflows",
          value: spTotal < 0 ? formatCurrency(Math.abs(spTotal)) : "0 €",
          description: "One-off costs or investments",
        },
      ];

      return {
        fieldKey: ExplanationFieldKey.SpecialEvents,
        fieldTitle: "Special Payments, Bonuses & Fiscal Events",
        valueFormatted: formatCurrency(spTotal),
        derivationFormula:
          "Sum of all special fiscal events in this month (13th Salary + One-Off Inflows/Costs)",
        explanation: explText,
        contributingFactors: factors,
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Aggregate special transactions for month",
            formula: "Sum(Credits) - Sum(Debits)",
            result: formatCurrency(spTotal),
          },
        ],
        legalCitation: toStatutoryCitation(
          "EStG § 38a (Sonstige Bezüge) & § 2c BEEG",
        ),
        legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        diffVsBFormatted:
          diffSp !== 0
            ? `${diffSp > 0 ? "+" : ""}${formatCurrency(diffSp)} vs B`
            : undefined,
      };
    }

    case FieldColumnKey.NetInflow: {
      return {
        fieldKey: ExplanationFieldKey.NetInflow,
        fieldTitle: "Total Monthly Net Household Inflow",
        valueFormatted: formatCurrency(netInflow),
        derivationFormula:
          "Husband Salary + Wife Salary + Mutterschutz + Wife EG + Husband EG + Kindergeld + Special Payments",
        explanation: `The net liquid cash entering the household in Month ${m.month} is ${formatCurrency(netInflow)}. (${diffNetStr})`,
        contributingFactors: [
          {
            name: "Husband's Net Salary",
            value: formatCurrency(hSalary),
            description: "Regular take-home employment pay",
          },
          {
            name: "Wife's Net Salary / Mutterschutz",
            value: formatCurrency(wSalary + mutterschutzVal),
            description: "Earnings or 100% maternity wage replacement",
          },
          {
            name: "Parental Allowance (Wife + Husband)",
            value: formatCurrency(wElterngeld + hElterngeld),
            description: "ElterngeldPlus and Partner Months",
          },
          {
            name: "Kindergeld",
            value: formatCurrency(kg),
            description: "Universal child benefit",
          },
          {
            name: "Special Payments / Refunds",
            value: formatCurrency(spTotal),
            description: "Bonuses, Tax refunds, or One-off costs",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Sum employment earnings",
            formula: `${formatCurrency(hSalary)} + ${formatCurrency(wSalary + mutterschutzVal)}`,
            result: formatCurrency(hSalary + wSalary + mutterschutzVal),
          },
          {
            stepNumber: 2,
            description: "Sum statutory parental benefits",
            formula: `${formatCurrency(wElterngeld + hElterngeld)} + ${formatCurrency(kg)}`,
            result: formatCurrency(wElterngeld + hElterngeld + kg),
          },
          {
            stepNumber: 3,
            description: "Add special payments / one-off events",
            formula: `${formatCurrency(hSalary + wSalary + mutterschutzVal + wElterngeld + hElterngeld + kg)} + ${formatCurrency(spTotal)}`,
            result: formatCurrency(netInflow),
          },
        ],
        legalCitation: toStatutoryCitation(
          "EStG, MuSchG, BEEG Gesamtliquiditätsrechnung",
        ),
        diffVsBFormatted:
          diffNet !== 0
            ? `${diffNet > 0 ? "+" : ""}${formatCurrency(diffNet)} vs B`
            : undefined,
      };
    }

    case FieldColumnKey.CumulativeTotal: {
      const bCum = bMonth ? (bMonth.cumulatedTotal as number) : cumTotal;
      const diffCum = cumTotal - bCum;
      const prevBal = cumTotal - netInflow;
      return {
        fieldKey: ExplanationFieldKey.CumulativeTotal,
        fieldTitle: "Progressive Cumulative 5-Year Total",
        valueFormatted: formatCurrency(cumTotal),
        derivationFormula:
          "Previous Month Cumulative Balance + Current Month Net Inflow",
        explanation: `The progressive cumulative net wealth accumulated from Month 1 through Month ${m.month} is ${formatCurrency(cumTotal)}. In Scenario C, this reflects all optimized tax swap benefits and parental allowance entitlements. (${diffCum > 0 ? `+${formatCurrency(diffCum)} ahead of Scenario B` : "Baseline comparison"})`,
        contributingFactors: [
          {
            name: "Prior Cumulative Balance (M - 1)",
            value: formatCurrency(prevBal),
            description: `Accumulated net wealth through Month ${m.month - 1}`,
          },
          {
            name: "Current Month Net Inflow",
            value: `+${formatCurrency(netInflow)}`,
            description: `Total liquidity in Month ${m.month}`,
          },
          {
            name: "Scenario B Reference Balance",
            value: bMonth
              ? formatCurrency(bMonth.cumulatedTotal as number)
              : "—",
            description: "Comparison baseline",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Add current monthly net inflow to prior balance",
            formula: `${formatCurrency(prevBal)} + ${formatCurrency(netInflow)}`,
            result: formatCurrency(cumTotal),
          },
          {
            stepNumber: 2,
            description: "Calculate cumulative advantage vs Scenario B",
            formula: `${formatCurrency(cumTotal)} - ${bMonth ? formatCurrency(bMonth.cumulatedTotal as number) : "0 €"}`,
            result:
              diffCum !== 0
                ? `${diffCum > 0 ? "+" : ""}${formatCurrency(diffCum)}`
                : "0 €",
          },
        ],
        legalCitation: toStatutoryCitation(
          "5-Year Multi-Scenario Financial Trajectory",
        ),
        diffVsBFormatted:
          diffCum !== 0
            ? `${diffCum > 0 ? "+" : ""}${formatCurrency(diffCum)} vs B`
            : undefined,
      };
    }
  }
}

/**
 * Builds a field-level explanation for an action milestone row.
 */
export function getActionFieldExplanation(
  fieldKey: ExplanationFieldKey | string,
  act: ActionRowItem,
  m: TimelineMonth,
): FieldExplanation {
  const isDelivery = act.type === ActionType.ChildDelivery;
  const isPregnancy = act.type === ActionType.PregnancyPositive;
  const isTaxSwitch = act.category === ActionCategory.TaxSwitch;
  const key = toExplanationFieldKey(fieldKey);
  const relLabel = m.relativeMonthLabel || m.relativeBirthLabel;

  switch (key) {
    case ExplanationFieldKey.Month:
      return {
        fieldKey: ExplanationFieldKey.Month,
        fieldTitle: `Action Milestone Event (${relLabel} · ${m.calendarLabel})`,
        valueFormatted: `↳ ${relLabel} Event (${m.calendarLabel}) · ${m.monthId}`,
        derivationFormula: `Lifecycle action scheduled before ${relLabel} (${m.calendarLabel})`,
        explanation: `This row represents a discrete user action / lifecycle milestone occurring immediately prior to ${relLabel} (${m.calendarLabel}) [ID: ${m.monthId}].`,
        contributingFactors: [
          {
            name: "Action ID",
            value: act.actionId,
            description: "Unique action identifier",
          },
          {
            name: "Month ID",
            value: m.monthId,
            description: "Immutable calendar month identifier",
          },
          {
            name: "Milestone Type",
            value: act.type,
            description: "Lifecycle categorization",
          },
          {
            name: "Trigger Month",
            value: `${relLabel} (${m.calendarLabel})`,
            description: "Scheduled timeline placement",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Evaluate lifecycle trigger",
            formula: "Execute action before month cash flow",
            result: "Preconditions updated",
          },
        ],
        legalCitation: toStatutoryCitation("BEEG & EStG Lifecycle Trigger"),
      };

    case ExplanationFieldKey.Title:
    case ExplanationFieldKey.Phase:
      return {
        fieldKey: ExplanationFieldKey.Title,
        fieldTitle: act.title,
        valueFormatted: act.title,
        derivationFormula: `Action Type: ${act.type} (${act.category})`,
        explanation: `${act.description} This action establishes the legal preconditions for subsequent benefits, salary calculations, and tax assessment.`,
        contributingFactors: [
          {
            name: "Category",
            value: act.category,
            description: "Domain classification",
          },
          {
            name: "Action Type",
            value: act.type,
            description: "Discrete lifecycle behavior",
          },
          {
            name: "Parameters",
            value: act.description,
            description: "User-specified settings",
          },
          {
            name: "Action ID",
            value: act.actionId,
            description: "Unique action key",
          },
        ],
        legalCitation: toStatutoryCitation(
          isTaxSwitch
            ? "EStG § 38b & BFH Decision VI R 2/13 (Steuerklassenwechsel)"
            : isDelivery
              ? "MuSchG § 3 Abs. 2 & BEEG § 4 (Geburt & Schutzfrist)"
              : isPregnancy
                ? "MuSchG § 3 Abs. 1 (Mitteilung der Schwangerschaft)"
                : "BGB § 611a (Gehaltsanpassung)",
        ),
        legalRuleKey: isTaxSwitch
          ? LegalRuleKey.BEEG_TaxSwap
          : isDelivery || isPregnancy
            ? LegalRuleKey.MuSchG_Maternity
            : undefined,
      };

    case ExplanationFieldKey.TaxClass:
      return {
        fieldKey: ExplanationFieldKey.TaxClass,
        fieldTitle: "Tax Class Configuration",
        valueFormatted: act.taxClassLabel || "—",
        derivationFormula: act.taxClassLabel || "No tax class change",
        explanation: act.taxClassLabel
          ? `The spousal tax class is updated to "${act.taxClassLabel}".`
          : "This action does not alter the spousal tax class.",
        contributingFactors: [
          {
            name: "Updated Combination",
            value: act.taxClassLabel || "Unchanged",
            description: "Assigned wage tax classes",
          },
        ],
        legalCitation: toStatutoryCitation("EStG § 38b"),
        legalRuleKey: LegalRuleKey.BEEG_TaxSwap,
      };

    default:
      return {
        fieldKey: key,
        fieldTitle: "Action Milestone",
        valueFormatted: act.title,
        explanation: act.description,
        legalCitation: toStatutoryCitation("BEEG / EStG Lifecycle Trigger"),
      };
  }
}

/**
 * Derives comprehensive explanation for a special event / secondary row (13th Month bonus, tax return, custom cost)
 */
export function getSpecialEventFieldExplanation(
  fieldKey: string,
  ev: SpecialEventItem,
  m: TimelineMonth,
  evCumulated: number,
  diffEvCumulated: number,
): FieldExplanation {
  const isCost = (ev.amount as number) < 0;
  const key = toExplanationFieldKey(fieldKey);
  const isTaxReturn = ev.type === SpecialEventType.TaxReturn;
  const relLabel = m.relativeMonthLabel || m.relativeBirthLabel;

  if (isTaxReturn) {
    const taxDetails = parseTaxReturnDetails(ev, m);
    switch (key) {
      case ExplanationFieldKey.Month:
        return {
          fieldKey: ExplanationFieldKey.Month,
          fieldTitle: `Annual Tax Return (${relLabel} · ${m.calendarLabel})`,
          valueFormatted: `↳ ${relLabel} Tax Return (${m.calendarLabel}) · ${m.monthId}`,
          derivationFormula: `EStG § 26b, § 31 (*Günstigerprüfung*) for Tax Year ${taxDetails.taxYear}`,
          explanation: taxDetails.detailedExplanation,
          contributingFactors: [
            ...taxDetails.contributingFactors,
            {
              name: "Month ID",
              value: m.monthId,
              description: "Immutable calendar month identifier",
            },
          ],
          calculationSteps: taxDetails.calculationSteps,
          legalCitation: toStatutoryCitation(
            "EStG § 26b (*Ehegatten-Splitting*), § 31 (*Günstigerprüfung*), § 46 Abs. 2 Nr. 3a",
          ),
          legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        };

      case ExplanationFieldKey.Title:
      case ExplanationFieldKey.Phase:
        return {
          fieldKey: ExplanationFieldKey.Title,
          fieldTitle: ev.title,
          valueFormatted: ev.title,
          derivationFormula: `Joint Assessment (§ 26b EStG) + Günstigerprüfung (§ 31 EStG) for Tax Year ${taxDetails.taxYear}`,
          explanation: taxDetails.detailedExplanation,
          contributingFactors: taxDetails.contributingFactors,
          calculationSteps: taxDetails.calculationSteps,
          legalCitation: toStatutoryCitation(
            "EStG § 26b (*Ehegatten-Splitting*), § 31 (*Günstigerprüfung*), § 46 Abs. 2 Nr. 3a",
          ),
          legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        };

      case ExplanationFieldKey.Amount:
      case ExplanationFieldKey.SpecialEvents:
      case ExplanationFieldKey.NetInflow:
        return {
          fieldKey: ExplanationFieldKey.Amount,
          fieldTitle: "Annual Income Tax Return Refund",
          valueFormatted: formatCurrency(ev.amount as number),
          derivationFormula:
            "Swap Withholding Deficit Refund + Base Deductions (+850 €) + § 31 EStG Günstigerprüfung Bonus",
          explanation: taxDetails.detailedExplanation,
          contributingFactors: taxDetails.contributingFactors,
          calculationSteps: taxDetails.calculationSteps,
          legalCitation: toStatutoryCitation(
            "EStG § 26b (*Ehegatten-Splitting*), § 31 (*Günstigerprüfung*), § 46 Abs. 2 Nr. 3a",
          ),
          legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        };

      case ExplanationFieldKey.CumulativeTotal:
        return {
          fieldKey: ExplanationFieldKey.CumulativeTotal,
          fieldTitle: "Progressive Cumulative Balance at Tax Return",
          valueFormatted: formatCurrency(evCumulated),
          derivationFormula:
            "Previous Month Cumulative Balance + Prior Events + Tax Return Refund",
          explanation: `Progressive cumulative balance immediately after receiving the ${formatCurrency(ev.amount as number)} tax return refund is ${formatCurrency(evCumulated)}.`,
          contributingFactors: [
            {
              name: "Balance Prior to Tax Return",
              value: formatCurrency(evCumulated - (ev.amount as number)),
              description: "Prior progressive total",
            },
            {
              name: "Tax Return Refund",
              value: `+${formatCurrency(ev.amount as number)}`,
              description: `Tax Year ${taxDetails.taxYear} refund`,
            },
          ],
          calculationSteps: [
            {
              stepNumber: 1,
              description:
                "Credit annual tax return to household cumulative balance",
              formula: `${formatCurrency(evCumulated - (ev.amount as number))} + ${formatCurrency(ev.amount as number)}`,
              result: formatCurrency(evCumulated),
            },
          ],
          diffVsBFormatted:
            diffEvCumulated !== 0
              ? `${diffEvCumulated > 0 ? "+" : ""}${formatCurrency(diffEvCumulated)} vs B`
              : undefined,
        };

      default:
        return {
          fieldKey: key,
          fieldTitle: "Annual Tax Return Parameter",
          valueFormatted: formatCurrency(ev.amount as number),
          explanation: taxDetails.detailedExplanation,
          contributingFactors: taxDetails.contributingFactors,
          calculationSteps: taxDetails.calculationSteps,
          legalCitation: toStatutoryCitation(
            "EStG § 26b (*Ehegatten-Splitting*), § 31 (*Günstigerprüfung*), § 46 Abs. 2 Nr. 3a",
          ),
          legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        };
    }
  }

  switch (key) {
    case ExplanationFieldKey.Month:
      return {
        fieldKey: ExplanationFieldKey.Month,
        fieldTitle: `Special Fiscal Event (${relLabel} · ${m.calendarLabel})`,
        valueFormatted: `↳ ${relLabel} Event (${m.calendarLabel}) · ${m.monthId}`,
        derivationFormula: `Fiscal event triggering in ${relLabel} (${m.calendarLabel})`,
        explanation: `This row represents a discrete monetary transaction occurring in ${relLabel} (${m.calendarLabel}) [ID: ${m.monthId}].`,
        contributingFactors: [
          {
            name: "Event ID",
            value: ev.eventId,
            description: "Ledger item identifier",
          },
          {
            name: "Transaction Category",
            value: ev.category,
            description: "Fiscal classification",
          },
          {
            name: "Transaction Amount",
            value: formatCurrency(ev.amount as number),
            description: isCost ? "Expense" : "Income",
          },
        ],
        legalCitation: toStatutoryCitation("Fiscal Ledger Transaction"),
      };

    case ExplanationFieldKey.Title:
    case ExplanationFieldKey.Phase:
      return {
        fieldKey: ExplanationFieldKey.Title,
        fieldTitle: ev.title,
        valueFormatted: ev.title,
        derivationFormula: `Event ID: ${ev.eventId} · Category: ${ev.category}`,
        explanation: `${ev.description || ev.title}. This transaction is credited/debited directly to the household ledger in Month ${m.month}.`,
        contributingFactors: [
          {
            name: "Event Category",
            value: ev.category,
            description: "Classification",
          },
          {
            name: "Transaction Type",
            value: ev.type,
            description: "Type identifier",
          },
          {
            name: "Description",
            value: ev.description || ev.title,
            description: "Operational note",
          },
        ],
        legalCitation: toStatutoryCitation(
          ev.type === SpecialEventType.Bonus40 ||
            ev.type === SpecialEventType.Bonus60
            ? "EStG § 38a (Sonstige Bezüge)"
            : "BGB § 241 (Sonderzahlung / Aufwand)",
        ),
        legalRuleKey: undefined,
      };

    case ExplanationFieldKey.Amount:
    case ExplanationFieldKey.SpecialEvents:
    case ExplanationFieldKey.NetInflow:
      return {
        fieldKey: ExplanationFieldKey.Amount,
        fieldTitle: isCost
          ? "Fiscal Outflow / Expense"
          : "Fiscal Inflow / Income",
        valueFormatted: formatCurrency(ev.amount as number),
        derivationFormula: `${isCost ? "Debit (-)" : "Credit (+)"} ${formatCurrency(Math.abs(ev.amount as number))}`,
        explanation: isCost
          ? `A one-off expenditure of ${formatCurrency(Math.abs(ev.amount as number))} reduces the monthly net inflow and cumulative total.`
          : `A one-off payment of ${formatCurrency(ev.amount as number)} increases the monthly net inflow and cumulative total.`,
        contributingFactors: [
          {
            name: "Transaction Amount",
            value: formatCurrency(ev.amount as number),
            description: isCost
              ? "Direct expenditure (Outflow)"
              : "Direct income (Inflow)",
          },
          {
            name: "Ledger Direction",
            value: isCost ? "Debit (-)" : "Credit (+)",
            description: "Balance movement",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Apply transaction to monthly net inflow",
            formula: `${isCost ? "-" : "+"}${formatCurrency(Math.abs(ev.amount as number))}`,
            result: formatCurrency(ev.amount as number),
          },
        ],
        legalCitation: toStatutoryCitation(
          "BGB § 241 (Sonderzahlung / Aufwand)",
        ),
        legalRuleKey: undefined,
      };

    case ExplanationFieldKey.CumulativeTotal:
      return {
        fieldKey: ExplanationFieldKey.CumulativeTotal,
        fieldTitle: "Progressive Cumulative Balance at Event",
        valueFormatted: formatCurrency(evCumulated),
        derivationFormula:
          "Previous Month Cumulative Balance + Prior Events in Month + This Event Amount",
        explanation: `Progressive cumulative total balance immediately after applying this fiscal transaction is ${formatCurrency(evCumulated)}.`,
        contributingFactors: [
          {
            name: "Balance Prior to Event",
            value: formatCurrency(evCumulated - (ev.amount as number)),
            description: "Prior progressive total",
          },
          {
            name: "Event Transaction Value",
            value: `${(ev.amount as number) >= 0 ? "+" : ""}${formatCurrency(ev.amount as number)}`,
            description: "Credit or debit",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Update cumulative progressive total",
            formula: `${formatCurrency(evCumulated - (ev.amount as number))} + ${formatCurrency(ev.amount as number)}`,
            result: formatCurrency(evCumulated),
          },
        ],
        diffVsBFormatted:
          diffEvCumulated !== 0
            ? `${diffEvCumulated > 0 ? "+" : ""}${formatCurrency(diffEvCumulated)} vs B`
            : undefined,
      };

    default:
      return {
        fieldKey: key,
        fieldTitle: "Fiscal Event Detail",
        valueFormatted: "—",
        explanation: "Event transaction parameter.",
        legalCitation: toStatutoryCitation("Fiscal Ledger Item"),
      };
  }
}

/**
 * Builds a comprehensive full-row explanation for an entire standard monthly timeline row.
 * Aggregates all itemized cash flow streams, computes comparative variance versus Scenario B,
 * and attaches relevant statutory legal citations.
 *
 * @param m - The monthly timeline ledger entry.
 * @param bMonth - Optional corresponding month in unoptimized Scenario B for delta comparison.
 * @param scenarioId - Active scenario identifier (defaults to Scenario C).
 * @returns Fully populated `RowExplanation` structure.
 */
export function getRowExplanation(
  m: TimelineMonth,
  bMonth?: TimelineMonth,
  _scenarioId: ScenarioId = ScenarioId.C,
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

  const streams: RowItemStream[] = [];

  if (hSalary > 0) {
    streams.push({
      label: "Husband's Net Salary",
      value: toEuroAmount(hSalary),
      valueFormatted: formatCurrency(hSalary),
      notes: `Tax Class ${m.isSwapActive ? "V" : "III"}`,
    });
  }

  if (wSalary > 0) {
    streams.push({
      label: "Wife's Net Salary",
      value: toEuroAmount(wSalary),
      valueFormatted: formatCurrency(wSalary),
      notes: `Tax Class ${m.isSwapActive ? "III" : "V"} · Part-Time`,
    });
  }

  if (mutterschutzVal > 0) {
    streams.push({
      label: "Mutterschutzlohn (100% Net Replacement)",
      value: toEuroAmount(mutterschutzVal),
      valueFormatted: formatCurrency(mutterschutzVal),
      notes: "MuSchG § 19, § 20",
    });
  }

  if (wElterngeld > 0) {
    streams.push({
      label: "Mother's Elterngeld / ElterngeldPlus",
      value: toEuroAmount(wElterngeld),
      valueFormatted: formatCurrency(wElterngeld),
      notes: "BEEG § 2, § 4a",
    });
  }

  if (hElterngeld > 0) {
    streams.push({
      label: "Father's Partner Months / Bonus",
      value: toEuroAmount(hElterngeld),
      valueFormatted: formatCurrency(hElterngeld),
      notes: "BEEG § 4b",
    });
  }

  if (kg > 0) {
    streams.push({
      label: "Kindergeld (Universal Child Benefit)",
      value: toEuroAmount(kg),
      valueFormatted: formatCurrency(kg),
      notes: "EStG § 66",
    });
  }

  if (spTotal !== 0) {
    streams.push({
      label: "Special Events / Bonuses / Tax Returns",
      value: toEuroAmount(spTotal),
      valueFormatted: formatCurrency(spTotal),
      notes: "EStG § 26b, § 31",
    });
  }

  return {
    rowType: ExplainerRowType.Month,
    title: `Month ${m.month} · ${m.calendarLabel}`,
    subtitle: m.relativeBirthLabel,
    phaseOrCategory: m.phaseLabel || "Standard Cash Flow",
    taxClasses:
      m.taxClassLabel ||
      (m.isSwapActive ? "Husband: V | Wife: III" : "Husband: III | Wife: V"),
    summaryDescription: `Comprehensive cash flow breakdown for Month ${m.month} (${m.calendarLabel}). Total net cash inflow is ${formatCurrency(netInflow)}, resulting in a progressive balance of ${formatCurrency(cumTotal)}.`,
    streams,
    totalNetInflow: toEuroAmount(netInflow),
    totalNetInflowFormatted: formatCurrency(netInflow),
    cumulatedTotal: toEuroAmount(cumTotal),
    cumulatedTotalFormatted: formatCurrency(cumTotal),
    diffVsB: toEuroAmount(diffNet),
    diffVsBFormatted:
      diffNet !== 0
        ? `${diffNet > 0 ? "+" : ""}${formatCurrency(diffNet)}`
        : "0 €",
    legalCitation: toStatutoryCitation(
      "BEEG § 1, § 2, § 4 & EStG § 26b, § 38b, § 66",
    ),
    legalRuleKey: LegalRuleKey.BEEG_SyntheticNet,
  };
}

/**
 * Builds a full-row explanation for an action milestone row.
 */
export function getActionRowExplanation(
  act: ActionRowItem,
  m: TimelineMonth,
  _scenarioId: ScenarioId = ScenarioId.C,
): RowExplanation {
  const isDelivery = act.type === ActionType.ChildDelivery;
  const isTaxSwitch = act.category === ActionCategory.TaxSwitch;

  return {
    rowType: ExplainerRowType.Action,
    title: act.title,
    subtitle: `Scheduled prior to Month ${m.month} (${m.calendarLabel})`,
    phaseOrCategory: act.category,
    taxClasses: act.taxClassLabel || undefined,
    summaryDescription: `${act.description} This lifecycle milestone establishes the statutory preconditions for parental leave rights, wage replacement calculation periods, and tax class assignments.`,
    streams: [],
    totalNetInflow: toEuroAmount(0),
    totalNetInflowFormatted: "— (Non-Monetary Action)",
    cumulatedTotal: toEuroAmount(0),
    cumulatedTotalFormatted: "—",
    legalCitation: toStatutoryCitation(
      isTaxSwitch
        ? "EStG § 38b & BFH VI R 2/13 (Steuerklassenwahl)"
        : isDelivery
          ? "MuSchG § 3 Abs. 2 (Schutzfrist nach der Entbindung)"
          : "MuSchG § 3 Abs. 1 (Mitteilung der Schwangerschaft)",
    ),
    legalRuleKey: isTaxSwitch
      ? LegalRuleKey.BEEG_TaxSwap
      : LegalRuleKey.MuSchG_Maternity,
    actionDetails: {
      category: act.category,
      effectiveMonth: m.month as number,
      details: {
        "Action ID": act.actionId,
        "Action Type": act.type,
        "Calendar Date": m.calendarLabel,
        "Effective Month": `Month ${m.month}`,
        Description: act.description,
      },
    },
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
  _scenarioId: ScenarioId = ScenarioId.C,
): RowExplanation {
  const evAmount = ev.amount as number;
  const isCost = evAmount < 0;

  const bEvents = bMonth?.specialEvents || [];
  const bMatch = bEvents.find(
    (it: SpecialEventItem) =>
      it.eventId === ev.eventId || it.title === ev.title || it.type === ev.type,
  );
  const bEvAmount = bMatch ? (bMatch.amount as number) : 0;
  const diffEv = evAmount - bEvAmount;

  const evCumulated = prevMonthCumulated + evAmount;

  if (ev.type === SpecialEventType.TaxReturn) {
    const taxDetails = parseTaxReturnDetails(ev, m);
    const streams: RowItemStream[] = [];

    if (taxDetails.swapDeficitNum > 0) {
      streams.push({
        label: "Wage Tax Swap Recovery (Class V Reconciliation)",
        value: toEuroAmount(taxDetails.swapDeficitNum),
        valueFormatted: formatCurrency(taxDetails.swapDeficitNum),
        formula: "Full recovery of temporary Class V withholding deficit",
        notes: "EStG § 26b, § 38b",
      });
    }

    streams.push({
      label: "Statutory Base Deductions & Werbungskosten Return",
      value: toEuroAmount(taxDetails.baseReturnNum),
      valueFormatted: formatCurrency(taxDetails.baseReturnNum),
      formula: "Standard deductions & Sonderausgaben allowance",
      notes: "EStG § 9a, § 10",
    });

    if (taxDetails.guenstigerBonusNum > 0) {
      streams.push({
        label: "§ 31 EStG Child Tax Allowance Bonus (Günstigerprüfung)",
        value: toEuroAmount(taxDetails.guenstigerBonusNum),
        valueFormatted: formatCurrency(taxDetails.guenstigerBonusNum),
        formula: "Tax savings from Kinderfreibetrag minus received Kindergeld",
        notes: "EStG § 31, § 32 Abs. 6",
      });
    }

    return {
      rowType: ExplainerRowType.SpecialEvent,
      title: ev.title,
      subtitle: `Annual Income Tax Assessment (Tax Year ${taxDetails.taxYear}) in Month ${m.month} (${m.calendarLabel})`,
      phaseOrCategory: "Tax Office (*Finanzamt*)",
      taxClasses: "Joint Assessment (*Splitting*)",
      summaryDescription: taxDetails.detailedExplanation,
      streams,
      totalNetInflow: toEuroAmount(evAmount),
      totalNetInflowFormatted: formatCurrency(evAmount),
      cumulatedTotal: toEuroAmount(evCumulated),
      cumulatedTotalFormatted: formatCurrency(evCumulated),
      diffVsB: toEuroAmount(diffEv),
      diffVsBFormatted:
        diffEv !== 0
          ? `${diffEv > 0 ? "+" : ""}${formatCurrency(diffEv)}`
          : "0 €",
      legalCitation: toStatutoryCitation(
        "EStG § 26b (*Ehegatten-Splitting*), § 31 (*Günstigerprüfung*), § 46 Abs. 2 Nr. 3a",
      ),
      legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
    };
  }

  return {
    rowType: ExplainerRowType.SpecialEvent,
    title: ev.title,
    subtitle: `Fiscal Event in Month ${m.month} (${m.calendarLabel})`,
    phaseOrCategory: ev.category,
    summaryDescription: `${ev.description || ev.title}. This transaction represents a ${isCost ? "one-off expenditure" : "special income/refund"} affecting the monthly net inflow and progressive balance.`,
    streams: [
      {
        label: ev.title,
        value: toEuroAmount(evAmount),
        valueFormatted: formatCurrency(evAmount),
        formula: `${isCost ? "Deduction" : "Credit"} of ${formatCurrency(Math.abs(evAmount))}`,
        notes: ev.category,
      },
    ],
    totalNetInflow: toEuroAmount(evAmount),
    totalNetInflowFormatted: formatCurrency(evAmount),
    cumulatedTotal: toEuroAmount(evCumulated),
    cumulatedTotalFormatted: formatCurrency(evCumulated),
    diffVsB: toEuroAmount(diffEv),
    diffVsBFormatted:
      diffEv !== 0
        ? `${diffEv > 0 ? "+" : ""}${formatCurrency(diffEv)}`
        : "0 €",
    legalCitation: toStatutoryCitation("Fiscal Ledger Event"),
    legalRuleKey: undefined,
  };
}
