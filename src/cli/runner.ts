#!/usr/bin/env node

// Universal Telemetry & Analytics Opt-Out
process.env.ASTRO_TELEMETRY_DISABLED = '1';
process.env.DO_NOT_TRACK = '1';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.VITE_TELEMETRY_DISABLED = '1';
process.env.CHECKPOINT_DISABLE = '1';

/**
 * Headless CLI Scenario Runner for German Elterngeld Financial Simulator
 *
 * Runs deterministic multi-year scenarios (Batches 0..4) directly in Node.js
 * without requiring web browser rendering or DOM captures.
 */

import { fileURLToPath } from 'node:url';
import { runScenarioBatches, calculateSimulationStartDate } from '#engine/simulator/timelineGenerator';
import {
  TaxClass,
  ScenarioId,
  TargetPerson,
  CliOutputFormat,
  FieldColumnKey,
  toCliOutputFormat,
  toNetSalary,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type SimulationResult,
  type TimelineMonth
} from '#engine/types';
import {
  getFieldExplanation,
  getRowExplanation,
  type FieldExplanation,
  type RowExplanation
} from '#engine/explanation/timelineExplainer';

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const GRAY = '\x1b[90m';

export const CliScenarioTarget = {
  A: ScenarioId.A,
  B: ScenarioId.B,
  C: ScenarioId.C,
  Compare: 'compare'
} as const;
export type CliScenarioTarget = (typeof CliScenarioTarget)[keyof typeof CliScenarioTarget];

export function toCliScenarioTarget(val: string): CliScenarioTarget {
  const upper = val.toUpperCase();
  if (upper === 'A' || upper === 'B' || upper === 'C') {
    return upper as CliScenarioTarget;
  }
  if (upper === 'COMPARE') {
    return CliScenarioTarget.Compare;
  }
  throw new TypeError(`Invalid CLI scenario target: ${val}. Expected 'A', 'B', 'C', or 'compare'.`);
}

export function parseMonthArg(val: string): number {
  if (!val) {
    throw new TypeError('Missing month argument. Example: explain M21 or --explain 21');
  }
  const clean = val.trim().replace(/^[Mm](?:onth)?\s*/i, '');
  const num = parseInt(clean, 10);
  if (Number.isNaN(num) || num < 1 || num > 120) {
    throw new TypeError(`Invalid month argument "${val}". Expected integer between 1 and 120 (e.g. M21 or 21).`);
  }
  return num;
}

export function parseFieldArg(val: string): FieldColumnKey {
  if (!val) {
    throw new TypeError('Missing field argument. Available fields: partner, mother, mutterschutz, husband, wife, taxClass, kindergeld, special, net, cumulative, phase, month.');
  }
  const normalized = val.trim().toLowerCase().replace(/[-_\s]+/g, '');
  switch (normalized) {
    case 'partner':
    case 'father':
    case 'fatherelterngeld':
    case 'husbandelterngeld':
    case 'partnermonths':
    case 'partnershipbonus':
    case 'partnerbonus':
      return FieldColumnKey.HusbandElterngeld;

    case 'mother':
    case 'wifeelterngeld':
    case 'egplus':
    case 'elterngeldplus':
    case 'elterngeld':
    case 'parentalallowance':
      return FieldColumnKey.WifeElterngeld;

    case 'mutterschutz':
    case 'maternity':
    case 'muschg':
      return FieldColumnKey.Mutterschutz;

    case 'husband':
    case 'husbandsalary':
    case 'fathersalary':
    case 'fathergross':
      return FieldColumnKey.HusbandSalary;

    case 'wife':
    case 'wifesalary':
    case 'mothersalary':
    case 'mothergross':
      return FieldColumnKey.WifeSalary;

    case 'tax':
    case 'taxclass':
    case 'taxclasses':
    case 'classes':
    case 'class':
      return FieldColumnKey.TaxClass;

    case 'kindergeld':
    case 'childbenefit':
    case 'child':
    case 'children':
      return FieldColumnKey.Kindergeld;

    case 'special':
    case 'specialevents':
    case 'bonus':
    case 'taxreturn':
    case 'refund':
      return FieldColumnKey.SpecialEvents;

    case 'net':
    case 'netinflow':
    case 'monthlynet':
    case 'monthlytotal':
    case 'inflow':
    case 'total':
      return FieldColumnKey.NetInflow;

    case 'cumulative':
    case 'cumulativetotal':
    case 'cumulated':
    case 'balance':
    case 'wealth':
      return FieldColumnKey.CumulativeTotal;

    case 'phase':
    case 'status':
    case 'event':
    case 'eventtag':
      return FieldColumnKey.Phase;

    case 'month':
    case 'date':
    case 'calendar':
      return FieldColumnKey.Month;

    default: {
      const validNames = [
        'partner (or husbandElterngeld)',
        'mother (or wifeElterngeld, egplus)',
        'mutterschutz',
        'husband (or husbandSalary)',
        'wife (or wifeSalary)',
        'taxClass',
        'kindergeld',
        'special (or specialEvents)',
        'net (or netInflow)',
        'cumulative (or cumulativeTotal)',
        'phase',
        'month'
      ];
      throw new TypeError(`Unknown explanation field: "${val}". Available fields are: ${validNames.join(', ')}.`);
    }
  }
}

interface CliOptions {
  scenario: CliScenarioTarget;
  startYear: number;
  startMonth: number;
  duration: number;
  pregStartSimMonth: number;
  birthSpacing: number;
  annualRaise: number;
  format: CliOutputFormat;
  enable13th: boolean;
  taxReturnMonth: number;
  pregYear?: number;
  pregMonth?: number;
  explainMonth?: number;
  explainField?: FieldColumnKey;
}

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = {
    scenario: CliScenarioTarget.Compare,
    startYear: 2026,
    startMonth: 1,
    duration: 60,
    pregStartSimMonth: 9, // September 2026
    birthSpacing: 27,
    annualRaise: 0,
    format: CliOutputFormat.Table,
    enable13th: true,
    taxReturnMonth: 3
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === 'explain') {
      const nextArg = args[++i];
      if (nextArg) {
        opts.explainMonth = parseMonthArg(nextArg);
      }
      // Check if following arguments provide 'field <fieldName>' or '--field <fieldName>'
      if (i + 1 < args.length) {
        const peek = args[i + 1];
        if (peek === 'field' || peek === '--field') {
          i += 1;
          opts.explainField = parseFieldArg(args[++i]);
        }
      }
    } else if (arg === '--explain' || arg === '-e') {
      opts.explainMonth = parseMonthArg(args[++i]);
    } else if (arg === '--explain-month') {
      opts.explainMonth = parseMonthArg(args[++i]);
    } else if (arg === '--explain-field' || arg === '--field') {
      opts.explainField = parseFieldArg(args[++i]);
    } else if (arg === '--scenario' || arg === '-s') {
      opts.scenario = toCliScenarioTarget(args[++i] || 'compare');
    } else if (arg === '--start-year') {
      opts.startYear = Number(args[++i]) || 2026;
    } else if (arg === '--start-month') {
      opts.startMonth = Number(args[++i]) || 1;
    } else if (arg === '--duration' || arg === '-d') {
      opts.duration = Number(args[++i]) || 60;
    } else if (arg === '--preg-start') {
      opts.pregStartSimMonth = Number(args[++i]) || 9;
    } else if (arg === '--preg-year') {
      opts.pregYear = Number(args[++i]);
    } else if (arg === '--preg-month') {
      opts.pregMonth = Number(args[++i]);
    } else if (arg === '--spacing') {
      opts.birthSpacing = Number(args[++i]) || 27;
    } else if (arg === '--raise' || arg === '-r') {
      opts.annualRaise = Number(args[++i]) || 0;
    } else if (arg === '--format' || arg === '-f') {
      opts.format = toCliOutputFormat(args[++i] || 'table');
    } else if (arg === '--no-13th') {
      opts.enable13th = false;
    } else if (arg === '--tax-month') {
      opts.taxReturnMonth = Number(args[++i]) || 3;
    }
  }

  // Auto-calibrate start date if pregYear & pregMonth are passed
  if (opts.pregYear && opts.pregMonth) {
    const cal = calculateSimulationStartDate(opts.pregYear, opts.pregMonth);
    opts.startYear = cal.startCalendarYear;
    opts.startMonth = cal.startCalendarMonth;
    opts.pregStartSimMonth = cal.pregnancySimulationMonth;
  }

  return opts;
}

function printHelp() {
  console.log(`
${BOLD}${CYAN}German Elterngeld Headless Scenario Runner & Statutory Explainer${RESET}
${DIM}Simulate multi-year financial cash flows, tax classes (§ 2b BEEG), and step-by-step formula derivations.${RESET}

${BOLD}Usage:${RESET}
  npm run sim -- [options]
  npm run sim -- explain <month> [field <fieldName>] [options]
  node src/cli/runner.ts [options]
  node src/cli/runner.ts explain <month> [field <fieldName>] [options]

${BOLD}Explanation Commands:${RESET}
  explain <month>                  Full statutory and cash flow audit for a specific month (e.g. explain M21 or explain 14)
  explain <month> field <name>     Detailed step-by-step calculation & statutory citation for a specific field:
                                   • ${BOLD}partner${RESET}       (Father's Partner Months / Partnership Bonus allowance)
                                   • ${BOLD}mother${RESET}        (Mother's ElterngeldPlus replacement calculation)
                                   • ${BOLD}mutterschutz${RESET}  (Maternity Protection 100% wage guarantee)
                                   • ${BOLD}husband${RESET}       (Husband's net take-home salary)
                                   • ${BOLD}wife${RESET}          (Wife's earned part-time salary)
                                   • ${BOLD}taxClass${RESET}      (Spousal tax class withholding assignment)
                                   • ${BOLD}kindergeld${RESET}    (Child benefit under § 66 EStG)
                                   • ${BOLD}special${RESET}       (Bonuses, tax refunds & one-off events)
                                   • ${BOLD}net${RESET}           (Total monthly net household inflow)
                                   • ${BOLD}cumulative${RESET}    (Progressive 5-year cumulative total)

${BOLD}Options:${RESET}
  -s, --scenario <A|B|C|compare>   Scenario to execute (default: compare)
  -d, --duration <months>          Simulation horizon in months (default: 60)
  --start-year <year>              Simulation start calendar year (default: 2026)
  --start-month <1..12>            Simulation start calendar month (default: 1)
  --preg-start <month>             Child 1 positive test simulation month (default: 9 / Sep 2026)
  --spacing <months>               Birth spacing between Child 1 and Child 2 (default: 27)
  -r, --raise <decimal>            Annual salary raise decimal rate, e.g. 0.03 for 3% (default: 0)
  -f, --format <table|summary|milestones|json> Output display format (default: table)
  -e, --explain <month>            Inspect full month audit (e.g. -e M21)
  --field <fieldName>              Field to inspect with --explain (e.g. --field partner)
  --no-13th                        Disable 13th month bonuses (Vacation & Christmas)
  --tax-month <1..12>              Filing month for annual tax refund reconciliation (default: 3)
  -h, --help                       Show this help message

${BOLD}Examples:${RESET}
  npm run sim                                    # Full 5-year comparison table
  npm run sim -- explain M21                     # Full cash flow audit for Month 21
  npm run sim -- explain M21 field partner       # Step-by-step calculation for Father Partner Months
  npm run sim -- explain M14 field mother        # Formula derivation for Mother's ElterngeldPlus
  npm run sim -- explain M12 field mutterschutz  # Maternity Protection allowance breakdown
  npm run sim -- -s C -f milestones              # Milestone events for Scenario C
  npm run sim -- --format json > result.json     # Export full JSON ledger
`);
}

function printFieldExplanation(
  exp: FieldExplanation,
  monthNum: number,
  scenarioId: ScenarioId,
  m: TimelineMonth
): void {
  const line = '═'.repeat(80);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(`${BOLD}${CYAN}FIELD EXPLANATION: ${exp.fieldTitle} (Month ${m.month} · ${m.calendarLabel})${RESET}`);
  console.log(`${DIM}Scenario: ${scenarioId} · Spousal Tax Classes: ${m.taxClassLabel}${RESET}`);
  console.log(`${BOLD}${CYAN}${line}${RESET}\n`);

  console.log(`  ${BOLD}Value:${RESET}              ${GREEN}${BOLD}${exp.valueFormatted}${RESET}`);
  if (exp.derivationFormula) {
    console.log(`  ${BOLD}Derivation Formula:${RESET} ${YELLOW}${exp.derivationFormula}${RESET}`);
  }
  if (exp.legalCitation) {
    console.log(`  ${BOLD}Legal Citation:${RESET}     ${BLUE}${exp.legalCitation}${RESET}`);
  }
  if (exp.diffVsBFormatted) {
    console.log(`  ${BOLD}Comparison vs. B:${RESET}   ${exp.diffVsBFormatted.includes('+') ? GREEN : RED}${exp.diffVsBFormatted}${RESET}`);
  }

  console.log(`\n${BOLD}Description:${RESET}`);
  console.log(`  ${exp.explanation}`);

  if (exp.contributingFactors && exp.contributingFactors.length > 0) {
    console.log(`\n${BOLD}Contributing Parameters / Factors:${RESET}`);
    exp.contributingFactors.forEach((f) => {
      console.log(`  • ${BOLD}${f.name}:${RESET} ${CYAN}${f.value}${RESET}${f.description ? ` (${DIM}${f.description}${RESET})` : ''}`);
    });
  }

  if (exp.calculationSteps && exp.calculationSteps.length > 0) {
    console.log(`\n${BOLD}Step-by-Step Calculation Breakdown:${RESET}`);
    exp.calculationSteps.forEach((s) => {
      console.log(`  ${BOLD}[${s.stepNumber}] ${s.description}${RESET}`);
      console.log(`      ${DIM}Formula:${RESET} ${YELLOW}${s.formula}${RESET}`);
      console.log(`      ${DIM}Result:${RESET}  ${GREEN}${BOLD}${s.result}${RESET}`);
    });
  }

  console.log(`\n${CYAN}${line}${RESET}\n`);
}

function printMonthExplanation(
  rowExp: RowExplanation,
  m: TimelineMonth,
  scenarioId: ScenarioId
): void {
  const line = '═'.repeat(80);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(`${BOLD}${CYAN}FULL MONTHLY AUDIT: ${rowExp.title}${RESET}`);
  console.log(`${DIM}${rowExp.subtitle} · Scenario: ${scenarioId}${RESET}`);
  console.log(`${BOLD}${CYAN}${line}${RESET}\n`);

  console.log(`  ${BOLD}Phase / Status:${RESET}      ${MAGENTA}${rowExp.phaseOrCategory}${RESET}`);
  console.log(`  ${BOLD}Monthly Net Inflow:${RESET}  ${GREEN}${BOLD}${rowExp.totalNetInflowFormatted}${RESET}${rowExp.diffVsBFormatted ? ` (${rowExp.diffVsBFormatted} vs Scenario B)` : ''}`);
  console.log(`  ${BOLD}Progressive Total:${RESET}   ${CYAN}${BOLD}${rowExp.cumulatedTotalFormatted}${RESET}`);
  if (rowExp.legalCitation) {
    console.log(`  ${BOLD}Statutory Basis:${RESET}     ${BLUE}${rowExp.legalCitation}${RESET}`);
  }

  console.log(`\n${BOLD}Audit Summary:${RESET}`);
  console.log(`  ${rowExp.summaryDescription}`);

  if (rowExp.streams.length > 0) {
    console.log(`\n${BOLD}Itemized Cash Flow Breakdown:${RESET}`);
    rowExp.streams.forEach((st) => {
      console.log(`  • ${BOLD}${st.label.padEnd(38)}:${RESET} ${GREEN}${st.valueFormatted.padStart(10)}${RESET} ${DIM}[${st.formula || st.notes}]${RESET}`);
    });
    console.log(`  ${'─'.repeat(52)}`);
    console.log(`    ${BOLD}${'Total Net Household Inflow'.padEnd(36)}:${RESET} ${GREEN}${BOLD}${rowExp.totalNetInflowFormatted.padStart(10)}${RESET}`);
  }

  if (m.startingActions && m.startingActions.length > 0) {
    console.log(`\n${BOLD}Pre-Month Action Milestones:${RESET}`);
    m.startingActions.forEach((act) => {
      console.log(`  ⚡ ${BOLD}${act.title}${RESET}`);
      console.log(`     ↳ ${DIM}${act.description}${RESET}`);
    });
  }

  if (m.specialEvents && m.specialEvents.length > 0) {
    console.log(`\n${BOLD}Special Fiscal Events in Month ${m.month}:${RESET}`);
    m.specialEvents.forEach((ev) => {
      const isCost = (ev.amount as number) < 0;
      console.log(`  💰 ${BOLD}${ev.title}${RESET} (${isCost ? RED : GREEN}${(ev.amount as number).toLocaleString('de-DE')} €${RESET})`);
      console.log(`     ↳ ${DIM}${ev.description || ev.category}${RESET}`);
    });
  }

  console.log(`\n${CYAN}${line}${RESET}\n`);
}

function formatEuro(amount: number): string {
  return `${amount.toLocaleString('de-DE')} €`;
}

function formatDiff(val: number): string {
  if (val > 0) return `${GREEN}+${val.toLocaleString('de-DE')} €${RESET}`;
  if (val < 0) return `${RED}${val.toLocaleString('de-DE')} €${RESET}`;
  return `${GRAY}0 €${RESET}`;
}

function buildSimulation(scenarioKey: ScenarioId, opts: CliOptions): SimulationResult {
  const b1 = opts.pregStartSimMonth + 8; // 9 months of pregnancy -> delivery at pregStart + 8 (e.g. M9 -> M17)
  const b2 = b1 + opts.birthSpacing;
  const lead = 7;

  // Batch 0: Preexisting conditions
  const preexisting: PreexistingConditions = {
    startCalendarYear: opts.startYear,
    startCalendarMonth: toCalendarMonth(opts.startMonth),
    simulationDurationMonths: opts.duration,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(2895),
    husbandInitialClass5Net: toNetSalary(2191),
    husbandWeeklyHours: toEuroAmount(32) as unknown as import('#engine/types').WorkingHours,
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1975),
    wifeInitialClass3FullTimeNet: toNetSalary(2603),
    wifeInitialPartTimeClass5Net: toNetSalary(1328),
    wifeInitialPartTimeClass3Net: toNetSalary(1648),
    wifeWeeklyHours: toEuroAmount(40) as unknown as import('#engine/types').WorkingHours,
    existingChildrenCount: 0,
    kindergeldPerChild: toEuroAmount(259),
    enable13thSalary: opts.enable13th,
    bonus40Month: toCalendarMonth(5),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(opts.taxReturnMonth)
  };

  // Batch 1: Pregnancy Actions
  const pregnancies: PregnancyAction[] = [
    {
      pregnancyId: toPregnancyId('PREG-CHILD-1'),
      childIndex: 1,
      positiveTestCalendarMonth: toCalendarMonth(((opts.startMonth - 1 + opts.pregStartSimMonth - 1) % 12) + 1),
      positiveTestCalendarYear: opts.startYear + Math.floor((opts.startMonth - 1 + opts.pregStartSimMonth - 1) / 12),
      positiveTestSimulationMonth: toSimulationMonth(opts.pregStartSimMonth),
      calculatedDeliverySimulationMonth: toSimulationMonth(b1),
      motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
      motherPostBirthPartTimeClass5Net: toNetSalary(1328),
      motherPostBirthPartTimeClass3Net: toNetSalary(1648),
      fatherPartnerMonthsCount: 4
    },
    {
      pregnancyId: toPregnancyId('PREG-CHILD-2'),
      childIndex: 2,
      positiveTestCalendarMonth: toCalendarMonth(((opts.startMonth - 1 + (b2 - 9)) % 12) + 1),
      positiveTestCalendarYear: opts.startYear + Math.floor((opts.startMonth - 1 + (b2 - 9)) / 12),
      positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
      calculatedDeliverySimulationMonth: toSimulationMonth(b2),
      motherPostBirthPartTimeHours: toEuroAmount(24) as unknown as import('#engine/types').WorkingHours,
      motherPostBirthPartTimeClass5Net: toNetSalary(1328),
      motherPostBirthPartTimeClass3Net: toNetSalary(1648),
      fatherPartnerMonthsCount: 4
    }
  ];

  // Batch 2: Tax Class Switches
  const preM1 = b1 - 1;
  const swap1Start = Math.max(1, preM1 - lead);
  const preM2 = b2 - 1;
  const swap2Start = Math.max(b1 + 2, preM2 - lead);

  const taxClassSwitches: TaxClassSwitchAction[] = [
    {
      switchId: toSwitchId('SWAP-CHILD-1'),
      effectiveSimulationMonth: toSimulationMonth(swap1Start),
      effectiveCalendarMonth: toCalendarMonth(((opts.startMonth - 1 + swap1Start - 1) % 12) + 1),
      effectiveCalendarYear: opts.startYear + Math.floor((opts.startMonth - 1 + swap1Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason: 'Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)',
      revertSimulationMonth: toSimulationMonth(b1)
    },
    {
      switchId: toSwitchId('SWAP-CHILD-2'),
      effectiveSimulationMonth: toSimulationMonth(swap2Start),
      effectiveCalendarMonth: toCalendarMonth(((opts.startMonth - 1 + swap2Start - 1) % 12) + 1),
      effectiveCalendarYear: opts.startYear + Math.floor((opts.startMonth - 1 + swap2Start - 1) / 12),
      targetHusbandTaxClass: TaxClass.V,
      targetWifeTaxClass: TaxClass.III,
      statutoryReason: 'Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)',
      revertSimulationMonth: toSimulationMonth(b2)
    }
  ];

  // Batch 3: Salary Raises
  const salaryRaises: SalaryRaiseAction[] = [];
  if (opts.annualRaise > 0) {
    const totalYears = Math.ceil(opts.duration / 12);
    for (let y = 2; y <= totalYears; y++) {
      const raiseMonth = (y - 1) * 12 + 1;
      if (raiseMonth <= opts.duration) {
        salaryRaises.push({
          raiseId: toRaiseId(`RAISE-Y${y}`),
          effectiveSimulationMonth: toSimulationMonth(raiseMonth),
          effectiveCalendarMonth: toCalendarMonth(opts.startMonth),
          effectiveCalendarYear: opts.startYear + y - 1,
          targetPerson: TargetPerson.Both,
          percentageIncrease: opts.annualRaise,
          reason: `Year ${y} Tariff Adjustment (+${(opts.annualRaise * 100).toFixed(1)}%)`
        });
      }
    }
  }

  return runScenarioBatches({
    scenarioKey,
    preexisting,
    pregnancies,
    taxClassSwitches,
    salaryRaises
  });
}

function printSummaryScorecard(resA: SimulationResult, resB: SimulationResult, resC: SimulationResult) {
  const gainOverB = (resC.summary.grandTotal as number) - (resB.summary.grandTotal as number);
  const gainOverA = (resC.summary.grandTotal as number) - (resA.summary.grandTotal as number);
  const benefitGainOverB = (resC.summary.totalBenefits as number) - (resB.summary.totalBenefits as number);

  console.log(`\n${BOLD}${CYAN}========================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}                   GERMAN ELTERNGELD SIMULATION KPI SCORECARD                          ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================================${RESET}\n`);

  console.log(`  ${BOLD}Category${RESET}                       ${BOLD}Scenario A (Status Quo)${RESET}  ${BOLD}Scenario B (Unoptimized)${RESET} ${BOLD}Scenario C (Optimized)${RESET}`);
  console.log(`  --------------------------------------------------------------------------------------`);
  console.log(`  Earned Net Salaries:          ${String(formatEuro(resA.summary.totalSalaries as number)).padStart(15)}  ${String(formatEuro(resB.summary.totalSalaries as number)).padStart(16)}  ${String(formatEuro(resC.summary.totalSalaries as number)).padStart(15)}`);
  console.log(`  State Parental Benefits:      ${String(formatEuro(resA.summary.totalBenefits as number)).padStart(15)}  ${String(formatEuro(resB.summary.totalBenefits as number)).padStart(16)}  ${String(formatEuro(resC.summary.totalBenefits as number)).padStart(15)}`);
  console.log(`  13th Month Special Bonuses:   ${String(formatEuro(resA.summary.total13thSalaries as number)).padStart(15)}  ${String(formatEuro(resB.summary.total13thSalaries as number)).padStart(16)}  ${String(formatEuro(resC.summary.total13thSalaries as number)).padStart(15)}`);
  console.log(`  Annual Tax Returns (§ 26b):   ${String(formatEuro(resA.summary.totalTaxRefunds as number)).padStart(15)}  ${String(formatEuro(resB.summary.totalTaxRefunds as number)).padStart(16)}  ${String(formatEuro(resC.summary.totalTaxRefunds as number)).padStart(15)}`);
  console.log(`  --------------------------------------------------------------------------------------`);
  console.log(`  ${BOLD}Grand Total Cash Inflow:      ${String(formatEuro(resA.summary.grandTotal as number)).padStart(15)}  ${String(formatEuro(resB.summary.grandTotal as number)).padStart(16)}  ${GREEN}${BOLD}${String(formatEuro(resC.summary.grandTotal as number)).padStart(15)}${RESET}`);
  console.log(`  ======================================================================================\n`);

  console.log(`  ${BOLD}${GREEN}✔ Net Optimization Advantage (Scenario C vs B):${RESET}  ${BOLD}${GREEN}+${formatEuro(gainOverB)}${RESET}`);
  console.log(`  ${BOLD}${GREEN}✔ State Benefit Surplus (§ 2b BEEG Maxed EG+):${RESET}   ${BOLD}${GREEN}+${formatEuro(benefitGainOverB)}${RESET}`);
  console.log(`  ${BOLD}${CYAN}✔ Net Financial Gain vs Status Quo (C vs A):${RESET}     ${BOLD}${CYAN}+${formatEuro(gainOverA)}${RESET}\n`);
}

function printLedgerTable(res: SimulationResult, resB?: SimulationResult) {
  console.log(`\n${BOLD}Simulation Ledger: ${res.scenarioKey === ScenarioId.C ? 'Scenario C (Optimized Tax Classes)' : 'Scenario ' + res.scenarioKey}${RESET}`);
  console.log(`${DIM}All amounts in EUR (€). Colored diffs indicate variance against Scenario B baseline.${RESET}\n`);

  const header = `| Month | Calendar | Phase & Milestone              | Classes     | Husband Net | Wife Net  | M-Schutz | Elterngeld | Kindergeld | Bonuses | Tax Return | Monthly Total | Cum. Total |`;
  const sep = `|-------|----------|--------------------------------|-------------|-------------|-----------|----------|------------|------------|---------|------------|---------------|------------|`;

  console.log(header);
  console.log(sep);

  res.months.forEach((m, idx) => {
    const bMonth = resB?.months[idx];
    const diffTotal = bMonth ? (m.monthlyTotal as number) - (bMonth.monthlyTotal as number) : 0;
    const diffStr = bMonth && diffTotal !== 0 ? ` (${diffTotal > 0 ? '+' : ''}${diffTotal}€)` : '';

    // Print Action Milestone Rows immediately BEFORE Month m
    if (m.startingActions && m.startingActions.length > 0) {
      m.startingActions.forEach((act) => {
        const isDelivery = act.type === 'CHILD_DELIVERY';
        const isPregnancy = act.type === 'PREGNANCY_POSITIVE';
        const isTaxRevert = act.type === 'TAX_CLASS_SWITCH_REVERT';
        const isTaxSwitch = act.category === 'TAX_SWITCH';
        const isRaise = act.category === 'SALARY_RAISE';

        const color = isDelivery ? CYAN : isPregnancy ? MAGENTA : isTaxRevert ? BLUE : isTaxSwitch ? BLUE : YELLOW;
        const tag = isDelivery ? '[Birth]' : isPregnancy ? '[Preg]' : isTaxRevert ? '[Revert]' : isTaxSwitch ? '[Swap]' : '[Raise]';
        const cleanTitle = act.title.replace(/^ACTION:\s*/, '');
        const actTitle = `↳ ${cleanTitle}`;

        const actRow = [
          `M${String(m.month).padEnd(2)} ${tag}`,
          m.calendarLabel.padEnd(8),
          `${color}${actTitle.slice(0, 30)}${RESET}`.padEnd(30 + color.length + RESET.length),
          (act.taxClassLabel || '—').slice(0, 11).padEnd(11),
          '—'.padStart(11),
          '—'.padStart(9),
          '—'.padStart(8),
          '—'.padStart(10),
          '—'.padStart(10),
          '—'.padStart(7),
          '—'.padStart(10),
          '—'.padStart(15),
          '—'.padStart(10)
        ].join(' | ');
        console.log(`| ${actRow} |`);
      });
    }

    // Print Special Fiscal Event Rows immediately BEFORE Month m
    if (m.specialEvents && m.specialEvents.length > 0) {
      const prevMonthIdx = (m.month as number) - 2;
      const prevCum = prevMonthIdx >= 0 ? (res.months[prevMonthIdx]?.cumulatedTotal as number) || 0 : 0;
      const bPrevCum = prevMonthIdx >= 0 && resB ? (resB.months[prevMonthIdx]?.cumulatedTotal as number) || 0 : 0;

      m.specialEvents.forEach((ev, evIdx) => {
        const isBonus = (ev.type as string).startsWith('bonus');
        const isCost = (ev.amount as number) < 0;
        const color = isCost ? RED : isBonus ? YELLOW : CYAN;
        const tag = isCost ? '[Cost]' : isBonus ? '[Bon]' : '[Evt]';
        const evTitle = `↳ ${ev.category}: ${ev.title}`;

        const priorEventsSum = m.specialEvents.slice(0, evIdx).reduce((acc, it) => acc + (it.amount as number), 0);
        const evCumulated = prevCum + priorEventsSum + (ev.amount as number);

        const bEvents = bMonth?.specialEvents || [];
        const bMatchIdx = bEvents.findIndex((it) => it.eventId === ev.eventId || it.title === ev.title || it.type === ev.type);
        const bPriorSum = bMatchIdx >= 0 ? bEvents.slice(0, bMatchIdx + 1).reduce((acc, it) => acc + (it.amount as number), 0) : 0;
        const bEvCumulated = bPrevCum + bPriorSum;
        const diffEvCumulated = resB ? evCumulated - bEvCumulated : 0;
        const diffCumStr = resB && diffEvCumulated !== 0 ? ` (${diffEvCumulated > 0 ? '+' : ''}${diffEvCumulated}€)` : '';

        const evRow = [
          `M${String(m.month).padEnd(2)} ${tag}`,
          ev.calendarLabel.padEnd(8),
          `${color}${evTitle.slice(0, 30)}${RESET}`.padEnd(30 + color.length + RESET.length),
          (ev.taxClassLabel || '—').slice(0, 11).padEnd(11),
          '—'.padStart(11),
          '—'.padStart(9),
          '—'.padStart(8),
          '—'.padStart(10),
          '—'.padStart(10),
          isBonus ? String(ev.amount).padStart(7) : '—'.padStart(7),
          !isBonus && !isCost ? String(ev.amount).padStart(10) : (isCost ? String(ev.amount).padStart(10) : '—'.padStart(10)),
          `${String(ev.amount).padStart(7)}${''.padStart(8)}`,
          `${String(evCumulated).padStart(7)}${diffCumStr.padStart(3)}`
        ].join(' | ');
        console.log(`| ${evRow} |`);
      });
    }

    const row = [
      `M${String(m.month).padEnd(4)}`,
      m.calendarLabel.padEnd(8),
      m.phaseLabel.slice(0, 30).padEnd(30),
      m.taxClassLabel.slice(0, 11).padEnd(11),
      String(m.husbandSalary).padStart(11),
      String(m.wifeSalary).padStart(9),
      String(m.mutterschutz).padStart(8),
      String((m.wifeElterngeld as number) + (m.husbandElterngeld as number)).padStart(10),
      String(m.kindergeld).padStart(10),
      String(m.specialBonusTotal).padStart(7),
      String(m.taxRefund).padStart(10),
      `${String(m.monthlyTotal).padStart(7)}${diffStr.padStart(8)}`,
      String(m.cumulatedTotal).padStart(10)
    ].join(' | ');

    console.log(`| ${row} |`);
  });

  console.log(sep + '\n');
}

function printMilestones(res: SimulationResult) {
  console.log(`\n${BOLD}${CYAN}Key Life Milestones & Special Events Timeline (${res.months.length} Months):${RESET}\n`);

  res.months.forEach((m) => {
    // Print starting actions before month
    if (m.startingActions && m.startingActions.length > 0) {
      m.startingActions.forEach((act) => {
        console.log(`  ${BOLD}${MAGENTA}⚡ ${act.title}${RESET} [Triggered before ${m.calendarLabel} / M${m.month}]`);
        console.log(`    ↳ ${DIM}${act.description}${RESET}`);
      });
    }

    const events: string[] = [];
    if (m.isMutterschutz) events.push(`${MAGENTA}Mutterschutz (${formatEuro(m.mutterschutz as number)})${RESET}`);
    if ((m.wifeElterngeld as number) > 0) events.push(`${CYAN}ElterngeldPlus (${formatEuro(m.wifeElterngeld as number)})${RESET}`);
    if (m.hasSiblingBonus) events.push(`${GREEN}Sibling Bonus (+10%)${RESET}`);
    if (m.isPartnerschaftsbonus) events.push(`${BLUE}Partnerschaftsbonus${RESET}`);
    if (m.isSwapActive) events.push(`${YELLOW}Tax Swap Active (H: V | W: III)${RESET}`);
    if ((m.specialBonusTotal as number) > 0) events.push(`${GREEN}13th Salary Bonus (${formatEuro(m.specialBonusTotal as number)})${RESET}`);
    if ((m.taxRefund as number) > 0) events.push(`${BOLD}${GREEN}Tax Return Refund (§ 26b EStG: ${formatEuro(m.taxRefund as number)})${RESET}`);

    if (events.length > 0 || m.relativeBirthLabel.includes('Birth') || m.relativeBirthLabel.includes('M-8')) {
      console.log(`  ${BOLD}${m.calendarLabel}${RESET} (${BOLD}M${m.month}${RESET} / ${m.relativeBirthLabel}): ${m.phaseLabel}`);
      if (events.length > 0) {
        console.log(`    ↳ ${events.join(' • ')}`);
      }
    }
  });
  console.log('');
}

// Main Execution
export function runCli(argv: string[] = process.argv.slice(2)): void {
  const opts = parseArgs(argv);

  if (opts.explainMonth !== undefined) {
    const scenarioKey = opts.scenario === CliScenarioTarget.Compare ? ScenarioId.C : (opts.scenario as ScenarioId);
    const targetSim = buildSimulation(scenarioKey, opts);
    const bSim = buildSimulation(ScenarioId.B, opts);

    const monthIdx = opts.explainMonth - 1;
    if (monthIdx < 0 || monthIdx >= targetSim.months.length) {
      console.error(`Error: Month ${opts.explainMonth} is outside simulation duration (${targetSim.months.length} months).`);
      process.exit(1);
    }

    const m = targetSim.months[monthIdx];
    const bMonth = bSim.months[monthIdx];

    if (opts.explainField) {
      const fieldExp = getFieldExplanation(opts.explainField, m, bMonth, scenarioKey);
      if (opts.format === CliOutputFormat.Json) {
        console.log(JSON.stringify({
          simulationMonth: opts.explainMonth,
          calendarMonth: m.calendarLabel,
          scenario: scenarioKey,
          fieldKey: opts.explainField,
          explanation: fieldExp
        }, null, 2));
      } else {
        printFieldExplanation(fieldExp, opts.explainMonth, scenarioKey, m);
      }
    } else {
      const rowExp = getRowExplanation(m, bMonth, scenarioKey);
      if (opts.format === CliOutputFormat.Json) {
        console.log(JSON.stringify({
          simulationMonth: opts.explainMonth,
          calendarMonth: m.calendarLabel,
          scenario: scenarioKey,
          rowExplanation: rowExp,
          monthDetails: m
        }, null, 2));
      } else {
        printMonthExplanation(rowExp, m, scenarioKey);
      }
    }
  } else if (opts.format === CliOutputFormat.Json) {
    const resA = buildSimulation(ScenarioId.A, opts);
    const resB = buildSimulation(ScenarioId.B, opts);
    const resC = buildSimulation(ScenarioId.C, opts);
    console.log(JSON.stringify({ options: opts, scenarioA: resA, scenarioB: resB, scenarioC: resC }, null, 2));
  } else {
    const resA = buildSimulation(ScenarioId.A, opts);
    const resB = buildSimulation(ScenarioId.B, opts);
    const resC = buildSimulation(ScenarioId.C, opts);

    printSummaryScorecard(resA, resB, resC);

    if (opts.format === CliOutputFormat.Milestones) {
      printMilestones(resC);
    } else if (opts.format === CliOutputFormat.Table) {
      const target = opts.scenario === CliScenarioTarget.A ? resA : (opts.scenario === CliScenarioTarget.B ? resB : resC);
      printLedgerTable(target, opts.scenario === CliScenarioTarget.Compare || opts.scenario === CliScenarioTarget.C ? resB : undefined);
    }
  }
}

const isDirectRun = Boolean(
  process.argv[1] && (
    fileURLToPath(import.meta.url) === process.argv[1] ||
    process.argv[1].endsWith('runner.ts') ||
    process.argv[1].endsWith('runner.js')
  )
);

if (isDirectRun) {
  runCli(process.argv.slice(2));
}
