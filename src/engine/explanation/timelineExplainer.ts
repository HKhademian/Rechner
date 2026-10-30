import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  type SourceUrl,
} from "#engine/config/benefitRules";
import {
  LedgerRowKind,
  projectLedgerMonth,
} from "#engine/ledger/rows";
import {
  type TimelineMonth,
  type SpecialEventItem,
  type ActionRowItem,
  type StatutoryCitation,
  type EuroAmount,
  ScenarioId,
  TargetPerson,
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
} from "#engine/types";
import {
  type LegalRuleKeyType,
  LegalRuleKey,
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
  /** Official reference for the recorded parameter or deduction, when available. */
  readonly source?: SourceUrl;
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

function formatTaxAmount(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 }).format(amount);
}

/** Explain stored assessment evidence; descriptive prose is never a financial data source. */
function taxSettlementDetails(ev: SpecialEventItem, m: TimelineMonth) {
  const audit = ev.taxSettlement;
  const taxYear = audit ? String(audit.calendarYear) : "not recorded";
  const credits = audit ? toEuroAmount(audit.creditedIncomeTax + audit.creditedSolidarity) : undefined;
  const contributingFactors: CalculationFactor[] = [
    { name: "Assessed Tax Year",
      value: taxYear },
    { name: "Credited Income Tax",
      value: audit ? formatTaxAmount(audit.creditedIncomeTax) : "Not recorded" },
    { name: "Credited Solidarity",
      value: audit ? formatTaxAmount(audit.creditedSolidarity) : "Not recorded" },
    { name: "Annual Tax Liability",
      value: audit ? formatTaxAmount(audit.totalLiability) : "Not recorded" },
    { name: "Signed Settlement",
      value: formatTaxAmount(ev.amount) },
  ];
  const calculationSteps: CalculationStep[] = audit && credits !== undefined ? [
    { stepNumber: 1,
      description: "Sum the statutory credits for actual taxes withheld",
      formula: `${formatTaxAmount(audit.creditedIncomeTax)} + ${formatTaxAmount(audit.creditedSolidarity)}`,
      result: formatTaxAmount(credits) },
    { stepNumber: 2,
      description: "Subtract modeled annual liability",
      formula: `${formatTaxAmount(credits)} - ${formatTaxAmount(audit.totalLiability)}`,
      result: formatTaxAmount(ev.amount) },
  ] : [{ stepNumber: 1,
    description: "Show the recorded cash flow; assessment details are unavailable",
    formula: "Recorded signed amount",
    result: formatTaxAmount(ev.amount) }];
  const detailedExplanation = audit
    ? `Joint annual assessment (Einkommensteuererklärung / Steuerbescheid), Tax Year ${taxYear}: credited actual wage and bonus taxes ${formatTaxAmount(credits!)} less modeled annual liability ${formatTaxAmount(audit.totalLiability)} gives ${formatTaxAmount(ev.amount)}. Liability accounts for actual employment deductions, progression (§ 32b EStG), year-specific child allowance comparison (Kinderfreibetrag / Günstigerprüfung, § 31 EStG) and solidarity. Positive balances are refunds; negative balances are repayments. This signed amount reaches the ledger once in ${m.calendarLabel}. Annual records disclose projections and unsupported data.`
    : "Only the recorded signed tax cash flow is available. No assessment credits, deductions, tax year or liability can be inferred from an event description.";
  const streams: RowItemStream[] = audit ? [
    { label: "Credited Income Tax",
      value: audit.creditedIncomeTax,
      valueFormatted: formatTaxAmount(audit.creditedIncomeTax),
      notes: "EStG § 36" },
    { label: "Credited Solidarity",
      value: audit.creditedSolidarity,
      valueFormatted: formatTaxAmount(audit.creditedSolidarity),
      notes: "SolzG § 1" },
    { label: "Annual Tax Liability",
      value: toEuroAmount(-audit.totalLiability),
      valueFormatted: formatTaxAmount(-audit.totalLiability),
      notes: "EStG §§ 31, 32a, 32b; SolzG §§ 3, 4" },
  ] : [{ label: "Recorded Tax Cash Flow",
    value: ev.amount,
    valueFormatted: formatTaxAmount(ev.amount) }];
  return { taxYear,
    contributingFactors,
    calculationSteps,
    detailedExplanation,
    streams };
}

/** Display recorded monthly payroll evidence; never infer deductions from supplied net pay. */
function recordedSalaryExplanation(
  month: TimelineMonth,
  parent: Exclude<TargetPerson, typeof TargetPerson.Both>,
  baseline?: TimelineMonth,
): FieldExplanation {
  const husband = parent === TargetPerson.Husband;
  const salary = husband ? month.husbandSalary : month.wifeSalary;
  const baselineSalary = husband ? baseline?.husbandSalary : baseline?.wifeSalary;
  const payroll = husband ? month.payroll?.husband : month.payroll?.wife;
  const difference = salary - (baselineSalary ?? salary);
  const profile = payroll ? createTaxRules(payroll.taxRules.sourceYear) : undefined;
  const factors: CalculationFactor[] = [
    { name: "Ledger month",
      value: `${month.monthId} · ${month.calendarLabel}` },
    { name: "Earned net salary",
      value: formatTaxAmount(salary),
      description: "Recorded salary cash flow; benefits and bonus payments are separate." },
  ];
  if (payroll && profile) {
    factors.push(
      { name: "Recorded gross salary",
        value: formatTaxAmount(payroll.monthlyGross) },
      { name: "Actual tax class",
        value: payroll.taxClass,
        source: profile.papPublication.source },
      { name: "Wage tax withheld",
        value: formatTaxAmount(payroll.monthlyWageTax),
        source: profile.papPublication.source },
      { name: "Solidarity surcharge",
        value: formatTaxAmount(payroll.monthlySolidaritySurcharge),
        source: profile.parameters.solidarityRate.source },
      { name: "Church tax withheld",
        value: formatTaxAmount(payroll.monthlyChurchTax),
        source: profile.parameters.churchRateOther.source },
      { name: "Health insurance",
        value: formatTaxAmount(payroll.healthInsurance),
        source: profile.parameters.healthEmployeeRate.source },
      { name: "Pension insurance",
        value: formatTaxAmount(payroll.pensionInsurance),
        source: profile.parameters.pensionEmployeeRate.source },
      { name: "Unemployment insurance",
        value: formatTaxAmount(payroll.unemploymentInsurance),
        source: profile.parameters.unemploymentEmployeeRate.source },
      { name: "Care insurance",
        value: formatTaxAmount(payroll.careInsurance),
        source: profile.parameters.careEmployeeBaseRate.source },
      { name: "Total social insurance",
        value: formatTaxAmount(payroll.totalSocialSecurity) },
      { name: "Regular payroll net",
        value: formatTaxAmount(payroll.regularNetTakeHome) },
      { name: "Payroll rule profile",
        value: `${payroll.taxRules.sourceYear}${payroll.taxRules.projected ? ` projected to ${payroll.taxRules.calendarYear}` : ""}`,
        source: profile.papPublication.source },
    );
  }
  return {
    fieldKey: husband ? ExplanationFieldKey.HusbandSalary : ExplanationFieldKey.WifeSalary,
    fieldTitle: husband ? "Husband's Earned Net Salary" : "Wife's Earned Net Salary",
    valueFormatted: formatTaxAmount(salary),
    derivationFormula: payroll
      ? "Recorded gross − social insurance − wage tax − solidarity surcharge − church tax = regular payroll net"
      : "Supplied net salary → recorded monthly earned salary",
    explanation: payroll
      ? `This month uses the stored payroll breakdown and actual tax class. Earned salary follows the ledger after working-hour and leave decisions; bonuses and benefits are separate. Annual assessment may produce a refund or a payment due. Source links identify the governing rules.${payroll.payrollLimitations.length > 0 ? ` Provisional payroll: ${payroll.payrollLimitations.join(" ")}` : ""}`
      : "Payroll deductions are unavailable for this supplied net salary. Gross pay, withholding and contributions cannot be reconstructed from net pay. A zero salary alone does not establish the reason for an absence of earnings.",
    contributingFactors: factors,
    calculationSteps: payroll ? [
      { stepNumber: 1,
        description: "Reconcile recorded regular payroll",
        formula: `${formatTaxAmount(payroll.monthlyGross)} − ${formatTaxAmount(payroll.totalSocialSecurity)} − ${formatTaxAmount(payroll.monthlyWageTax)} − ${formatTaxAmount(payroll.monthlySolidaritySurcharge)} − ${formatTaxAmount(payroll.monthlyChurchTax)}`,
        result: formatTaxAmount(payroll.regularNetTakeHome) },
      { stepNumber: 2,
        description: "Read earned salary after the timeline's work and leave decisions",
        formula: `Recorded earned salary at ${month.monthId}`,
        result: formatTaxAmount(salary) },
    ] : [],
    legalCitation: toStatutoryCitation("EStG §§ 38b, 39b; SGB V, VI, III, XI; SolzG"),
    diffVsBFormatted: difference === 0 ? undefined : `${difference > 0 ? "+" : ""}${formatTaxAmount(difference)} vs B`,
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
  _scenarioId: ScenarioId = ScenarioId.C,
): FieldExplanation {
  const validatedKey = toFieldColumnKey(columnKey);
  const hSalary = m.husbandSalary;
  const wSalary = m.wifeSalary;
  const mutterschutzVal = m.mutterschutz;
  const wElterngeld = m.wifeElterngeld;
  const hElterngeld = m.husbandElterngeld;
  const kg = m.kindergeld;
  const spTotal = m.specialEventsTotal;
  const netInflow = m.monthlyTotal;
  const cumTotal = m.cumulatedTotal;

  const bNetInflow = bMonth ? bMonth.monthlyTotal : 0;
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

    case FieldColumnKey.HusbandSalary:
      return recordedSalaryExplanation(m, TargetPerson.Husband, bMonth);

    case FieldColumnKey.WifeSalary:
      return recordedSalaryExplanation(m, TargetPerson.Wife, bMonth);

    case FieldColumnKey.Mutterschutz: {
      const diff = mutterschutzVal - (bMonth?.mutterschutz ?? mutterschutzVal);
      return {
        fieldKey: ExplanationFieldKey.Mutterschutz,
        fieldTitle: "Maternity protection wage replacement",
        valueFormatted: formatCurrency(mutterschutzVal),
        derivationFormula: "Average regular cash wages before the protection episode; fixed during that episode",
        explanation: "The configured maternity reference uses the preceding regular wage months, including their actual classes and hours. The simulator uses disclosed calendar-month protection windows; it does not calculate daily insurer and employer payments separately.",
        contributingFactors: [
          { name: "Fixed maternity reference",
            value: formatCurrency(mutterschutzVal) },
          { name: "Protection episode",
            value: m.isMutterschutz ? "Active" : "Inactive" },
          { name: "Missing history assumptions",
            value: (m.assumptions ?? []).join(" ") || "None recorded" },
        ],
        calculationSteps: [
          { stepNumber: 1,
            description: "Average preceding regular wages",
            formula: "Sum reference wages / reference month count",
            result: "Fixed reference for the episode" },
          { stepNumber: 2,
            description: "Apply configured protection window",
            formula: "Active episode × fixed reference",
            result: formatCurrency(mutterschutzVal) },
        ],
        legalCitation: toStatutoryCitation("MuSchG §§ 3, 19, 20"),
        legalRuleKey: LegalRuleKey.MuSchG_Maternity,
        diffVsBFormatted: diff !== 0 ? `${diff > 0 ? "+" : ""}${formatCurrency(diff)} vs B` : undefined,
      };
    }

    case FieldColumnKey.WifeElterngeld:
    case FieldColumnKey.HusbandElterngeld: {
      const husband = validatedKey === FieldColumnKey.HusbandElterngeld;
      const amount = husband ? hElterngeld : wElterngeld;
      const baseline = husband ? bMonth?.husbandElterngeld : bMonth?.wifeElterngeld;
      const payments = (m.benefitPayments ?? []).filter((payment) => payment.parent === (husband ? TargetPerson.Husband : TargetPerson.Wife));
      const entitlement = payments.reduce((sum, payment) => sum + payment.grossEntitlement, 0);
      const offset = payments.reduce((sum, payment) => sum + payment.offset, 0);
      const unavailable = m.benefitAssessmentAvailable === false;
      return {
        fieldKey: husband ? ExplanationFieldKey.HusbandElterngeld : ExplanationFieldKey.WifeElterngeld,
        fieldTitle: `${husband ? "Father's" : "Mother's"} ElterngeldPlus`,
        valueFormatted: unavailable && payments.length === 0 ? "Unavailable" : formatCurrency(amount),
        derivationFormula: `${formatCurrency(entitlement)} - ${formatCurrency(offset)} = ${formatCurrency(amount)}`,
        explanation: unavailable ? `Assessment data is incomplete. ${(m.unavailableReasons ?? []).join(" ")}`
          : "Each parent's frozen pre-birth standardized net and average positive earnings across the Plus claim period determine entitlement. Personal ceilings, hours, sibling eligibility, claim budgets and overlap credits apply. Assessment history and assumptions are shown above the scorecard; a scenario label never chooses the assessment class.",
        contributingFactors: [
          { name: "Parent's claim cohorts",
            value: payments.map((payment) => payment.pregnancyId).join(", ") || "None" },
          { name: "Entitlement before overlap credits",
            value: formatCurrency(entitlement) },
          { name: "Overlap credits",
            value: formatCurrency(offset) },
        ],
        calculationSteps: [
          { stepNumber: 1,
            description: "Sum each eligible cohort entitlement",
            formula: payments.map((payment) => formatCurrency(payment.grossEntitlement)).join(" + ") || "0",
            result: formatCurrency(entitlement) },
          { stepNumber: 2,
            description: "Deduct applicable overlap credits",
            formula: `${formatCurrency(entitlement)} - ${formatCurrency(offset)}`,
            result: formatCurrency(amount) },
        ],
        legalCitation: toStatutoryCitation("BEEG §§ 2, 2a-2f, 3, 4, 4a, 4b"),
        legalRuleKey: husband ? LegalRuleKey.BEEG_PartnershipBonus : LegalRuleKey.BEEG_SyntheticNet,
        diffVsBFormatted: baseline !== undefined && amount !== baseline ? `${amount > baseline ? "+" : ""}${formatCurrency(amount - baseline)} vs B` : undefined,
      };
    }

    case FieldColumnKey.Kindergeld: {
      const details = m.kindergeldDetails;
      if (!details) {
        return { fieldKey: ExplanationFieldKey.Kindergeld,
          fieldTitle: "Recorded Child Benefit (Kindergeld)",
          valueFormatted: formatCurrency(kg),
          derivationFormula: `Recorded total: ${formatCurrency(kg)}`,
          explanation: "The recorded total has no per-child rate/count audit; these inputs cannot be inferred from the amount.",
          contributingFactors: [],
          calculationSteps: [],
          legalCitation: toStatutoryCitation("EStG § 66"),
          legalRuleKey: LegalRuleKey.EStG_Kindergeld };
      }
      const childCount = details.children;
      const rate = formatCurrency(details.monthlyPerChild);
      return {
        fieldKey: ExplanationFieldKey.Kindergeld,
        fieldTitle: "Statutory Child Benefit (Kindergeld § 66 EStG)",
        valueFormatted: formatCurrency(kg),
        derivationFormula: `${childCount} Child(ren) × ${rate} / month = ${formatCurrency(kg)}`,
        explanation: `The model counts ${childCount} qualifying child/children at the supplied ${rate} monthly rate. This is a planning input; actual entitlement conditions and the applicable rate must be checked. ${details.source}`,
        contributingFactors: [
          {
            name: "Eligible Living Children",
            value: `${childCount} child(ren)`,
            description: "Children living in household",
          },
          {
            name: "Supplied Monthly Rate per Child",
            value: `${rate} / month`,
            description: details.source,
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Multiply modeled qualifying children by the supplied rate",
            formula: `${childCount} × ${rate}`,
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
      const bSpecial = bMonth ? bMonth.specialEventsTotal : spTotal;
      const diffSp = spTotal - bSpecial;
      const taxReturnEvent = m.specialEvents?.find(
        (e: SpecialEventItem) => e.type === SpecialEventType.TaxReturn,
      );

      if (taxReturnEvent) {
        const taxDetails = taxSettlementDetails(taxReturnEvent, m);
        return {
          fieldKey: ExplanationFieldKey.SpecialEvents,
          fieldTitle: "Annual Tax Settlement & Special Fiscal Events",
          valueFormatted: formatTaxAmount(spTotal),
          derivationFormula: m.specialEvents.map((event) => formatTaxAmount(event.amount)).join(" + "),
          explanation: taxDetails.detailedExplanation,
          contributingFactors: [...taxDetails.contributingFactors,
            { name: "Other Financial Events",
              value: formatTaxAmount(spTotal - taxReturnEvent.amount) }],
          calculationSteps: [...taxDetails.calculationSteps, ...(m.specialEvents.length > 1 ? [{
            stepNumber: taxDetails.calculationSteps.length + 1,
            description: "Add other signed financial events in this month",
            formula: `${formatTaxAmount(taxReturnEvent.amount)} + (${formatTaxAmount(spTotal - taxReturnEvent.amount)})`,
            result: formatTaxAmount(spTotal),
          }] : [])],
          legalCitation: toStatutoryCitation(
            "EStG § 26b, § 31, § 32a, § 32b, § 36; SolzG §§ 1, 3, 4",
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
      const bCum = bMonth ? bMonth.cumulatedTotal : cumTotal;
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
            value: bMonth ? formatCurrency(bMonth.cumulatedTotal) : "—",
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
            formula: `${formatCurrency(cumTotal)} - ${bMonth ? formatCurrency(bMonth.cumulatedTotal) : "0 €"}`,
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
  fieldKey: ExplanationFieldKey,
  act: ActionRowItem,
  m: TimelineMonth,
): FieldExplanation {
  const isDelivery = act.type === ActionType.ChildDelivery;
  const isPregnancy = act.type === ActionType.PregnancyPositive;
  const isTaxSwitch = act.category === ActionCategory.TaxSwitch;
  const key = fieldKey;
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
            ? "EStG § 38b & BEEG § 2c(3) (Steuerklassenwechsel)"
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
  const isCost = ev.amount < 0;
  const key = toExplanationFieldKey(fieldKey);
  const isTaxReturn = ev.type === SpecialEventType.TaxReturn;
  const relLabel = m.relativeMonthLabel || m.relativeBirthLabel;

  if (isTaxReturn) {
    const taxDetails = taxSettlementDetails(ev, m);
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
            "EStG § 26b, § 31, § 32a, § 32b, § 36; SolzG §§ 1, 3, 4",
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
            "EStG § 26b, § 31, § 32a, § 32b, § 36; SolzG §§ 1, 3, 4",
          ),
          legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        };

      case ExplanationFieldKey.Amount:
      case ExplanationFieldKey.SpecialEvents:
      case ExplanationFieldKey.NetInflow:
        return {
          fieldKey: ExplanationFieldKey.Amount,
          fieldTitle: "Annual Income Tax Settlement",
          valueFormatted: formatTaxAmount(ev.amount),
          derivationFormula:
            "Credited Income Tax + Credited Solidarity - Annual Tax Liability",
          explanation: taxDetails.detailedExplanation,
          contributingFactors: taxDetails.contributingFactors,
          calculationSteps: taxDetails.calculationSteps,
          legalCitation: toStatutoryCitation(
            "EStG § 26b, § 31, § 32a, § 32b, § 36; SolzG §§ 1, 3, 4",
          ),
          legalRuleKey: LegalRuleKey.EStG_TaxSplitting,
        };

      case ExplanationFieldKey.CumulativeTotal:
        return {
          fieldKey: ExplanationFieldKey.CumulativeTotal,
          fieldTitle: "Progressive Cumulative Balance at Tax Return",
          valueFormatted: formatCurrency(evCumulated),
          derivationFormula:
            "Previous Month Cumulative Balance + Prior Events + Signed Tax Settlement",
          explanation: `Progressive cumulative balance after posting the signed ${formatTaxAmount(ev.amount)} settlement is ${formatTaxAmount(evCumulated)}.`,
          contributingFactors: [
            {
              name: "Balance Prior to Tax Return",
              value: formatCurrency(evCumulated - ev.amount),
              description: "Prior progressive total",
            },
            {
              name: "Signed Tax Settlement",
              value: formatTaxAmount(ev.amount),
              description: `Tax Year ${taxDetails.taxYear} settlement`,
            },
          ],
          calculationSteps: [
            {
              stepNumber: 1,
              description:
                "Post the signed annual settlement to household cumulative balance",
              formula: `${formatCurrency(evCumulated - ev.amount)} + ${formatTaxAmount(ev.amount)}`,
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
          valueFormatted: formatTaxAmount(ev.amount),
          explanation: taxDetails.detailedExplanation,
          contributingFactors: taxDetails.contributingFactors,
          calculationSteps: taxDetails.calculationSteps,
          legalCitation: toStatutoryCitation(
            "EStG § 26b, § 31, § 32a, § 32b, § 36; SolzG §§ 1, 3, 4",
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
            value: formatCurrency(ev.amount),
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
        valueFormatted: formatCurrency(ev.amount),
        derivationFormula: `${isCost ? "Debit (-)" : "Credit (+)"} ${formatCurrency(Math.abs(ev.amount))}`,
        explanation: isCost
          ? `A one-off expenditure of ${formatCurrency(Math.abs(ev.amount))} reduces the monthly net inflow and cumulative total.`
          : `A one-off payment of ${formatCurrency(ev.amount)} increases the monthly net inflow and cumulative total.`,
        contributingFactors: [
          {
            name: "Transaction Amount",
            value: formatCurrency(ev.amount),
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
            formula: `${isCost ? "-" : "+"}${formatCurrency(Math.abs(ev.amount))}`,
            result: formatCurrency(ev.amount),
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
            value: formatCurrency(evCumulated - ev.amount),
            description: "Prior progressive total",
          },
          {
            name: "Event Transaction Value",
            value: `${ev.amount >= 0 ? "+" : ""}${formatCurrency(ev.amount)}`,
            description: "Credit or debit",
          },
        ],
        calculationSteps: [
          {
            stepNumber: 1,
            description: "Update cumulative progressive total",
            formula: `${formatCurrency(evCumulated - ev.amount)} + ${formatCurrency(ev.amount)}`,
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
  const hSalary = m.husbandSalary;
  const wSalary = m.wifeSalary;
  const mutterschutzVal = m.mutterschutz;
  const wElterngeld = m.wifeElterngeld;
  const hElterngeld = m.husbandElterngeld;
  const kg = m.kindergeld;
  const spTotal = m.specialEventsTotal;
  const netInflow = m.monthlyTotal;
  const cumTotal = m.cumulatedTotal;

  const bNetInflow = bMonth ? bMonth.monthlyTotal : 0;
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
  const isReallocation = act.type === ActionType.ElterngeldReallocation;

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
      isReallocation
        ? "BEEG § 3 Abs. 1 & § 7 Abs. 2 (Partnerübertragung)"
        : isTaxSwitch
          ? "EStG § 38b & BEEG § 2c(3) (Steuerklassenwahl)"
          : isDelivery
            ? "MuSchG § 3 Abs. 2 (Schutzfrist nach der Entbindung)"
            : "MuSchG § 3 Abs. 1 (Mitteilung der Schwangerschaft)",
    ),
    legalRuleKey: isReallocation
      ? LegalRuleKey.BEEG_SyntheticNet
      : isTaxSwitch
        ? LegalRuleKey.BEEG_TaxSwap
        : LegalRuleKey.MuSchG_Maternity,
    actionDetails: {
      category: act.category,
      effectiveMonth: m.month,
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
  const evAmount = ev.amount;
  const isCost = evAmount < 0;

  const projected = projectLedgerMonth(m, bMonth).find((row) => row.kind === LedgerRowKind.FinancialEvent && row.rowId === ev.eventId);
  const baselineEvent = bMonth?.specialEvents.find((candidate) => candidate.eventId === ev.eventId);
  const diffEv = projected?.deltaAmount ?? toEuroAmount(evAmount - (baselineEvent?.amount ?? 0));
  // Standalone legacy event records retain only the explicitly supplied opening balance.
  const evCumulated = projected?.cumulative ?? toEuroAmount(prevMonthCumulated + evAmount);

  if (ev.type === SpecialEventType.TaxReturn) {
    const taxDetails = taxSettlementDetails(ev, m);
    const streams = taxDetails.streams;

    return {
      rowType: ExplainerRowType.SpecialEvent,
      title: ev.title,
      subtitle: `Annual Income Tax Assessment (Tax Year ${taxDetails.taxYear}) in Month ${m.month} (${m.calendarLabel})`,
      phaseOrCategory: "Tax Office (*Finanzamt*)",
      taxClasses: "Joint Assessment (*Splitting*)",
      summaryDescription: taxDetails.detailedExplanation,
      streams,
      totalNetInflow: toEuroAmount(evAmount),
      totalNetInflowFormatted: formatTaxAmount(evAmount),
      cumulatedTotal: toEuroAmount(evCumulated),
      cumulatedTotalFormatted: formatCurrency(evCumulated),
      diffVsB: toEuroAmount(diffEv),
      diffVsBFormatted:
        diffEv !== 0
          ? `${diffEv > 0 ? "+" : ""}${formatCurrency(diffEv)}`
          : "0 €",
      legalCitation: toStatutoryCitation(
        "EStG § 26b, § 31, § 32a, § 32b, § 36; SolzG §§ 1, 3, 4",
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
