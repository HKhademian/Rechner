#!/usr/bin/env node

// Universal Telemetry & Analytics Opt-Out
process.env.ASTRO_TELEMETRY_DISABLED = "1";
process.env.DO_NOT_TRACK = "1";
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.VITE_TELEMETRY_DISABLED = "1";
process.env.CHECKPOINT_DISABLE = "1";

/**
 * Headless CLI Scenario Runner for German Elterngeld Financial Simulator
 *
 * Runs deterministic multi-year scenarios (Batches 0..4) directly in Node.js
 * without requiring web browser rendering or DOM captures.
 */

import {
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  fileURLToPath,
} from "node:url";
import {
  runScenarioBatches,
  calculateSimulationStartDate,
} from "#engine/simulator/timelineGenerator";
import {
  type PreexistingConditions,
  type GrossSalary,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type SalaryRaiseAction,
  type SimulationResult,
  type TimelineMonth,
  type GrossToNetBreakdown,
  type SpousalGrossToNetSet,
  TaxClass,
  SimulationStrategy,
  ScenarioId,
  TargetPerson,
  CliOutputFormat,
  FieldColumnKey,
  SalaryInputMode,
  SalaryPeriod,
  ActionCategory,
  ActionType,
  toTaxClass,
  toStrategyId,
  toGrossSalary,
  toWorkingHours,
  toCliOutputFormat,
  toSalaryPeriod,
  toEuroAmount,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toMonthDuration,
  toChildrenCount,
  toChildIndex,
  toPercentageRate,
  toPregnancyId,
  toSwitchId,
  toRaiseId,
  toMonthId,
  toMonthSimRef,
} from "#engine/types";
import {
  computeGrossToNetBreakdown,
  deriveSpousalNetSalaries,
} from "#engine/tax/wageTax";
import fs from "node:fs";
import path from "node:path";
import {
  type FieldExplanation,
  type RowExplanation,
  getFieldExplanation,
  getRowExplanation,
} from "#engine/explanation/timelineExplainer";
import {
  type ElterngeldPersistedState,
  getDefaultPersistedState,
  getTestPersistedState,
  loadScenarioById,
  setUserScenarioOverride,
  validateAndSanitizePersistedState,
} from "#engine/storage/persistence";
import {
  BUILTIN_SCENARIO_CATALOG,
} from "#data/scenarios/scenarioRegistry";

// ANSI Color Codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";

function formatEuro(amount: number): string {
  return `${amount.toLocaleString("de-DE")} €`;
}

/**
 * CLI Strategy Execution Target Filter (StatusQuo, UnoptimizedBaseline, StatutoryOptimized, or Compare).
 */
export const CliScenarioTarget = {
  StatusQuo: SimulationStrategy.StatusQuo,
  UnoptimizedBaseline: SimulationStrategy.UnoptimizedBaseline,
  StatutoryOptimized: SimulationStrategy.StatutoryOptimized,
  Compare: "compare",
  A: SimulationStrategy.StatusQuo,
  B: SimulationStrategy.UnoptimizedBaseline,
  C: SimulationStrategy.StatutoryOptimized,
} as const;
export type CliScenarioTarget =
  (typeof CliScenarioTarget)[keyof typeof CliScenarioTarget];

/**
 * Validates and normalizes string input into a strongly-typed `CliScenarioTarget`.
 *
 * @param val - Strategy target flag argument ('status_quo', 'unoptimized_baseline', 'statutory_optimized', 'compare', or legacy 'A'/'B'/'C').
 * @returns Strongly-typed `CliScenarioTarget`.
 * @throws {TypeError} if input does not match expected target options.
 */
export function toCliScenarioTarget(val: string): CliScenarioTarget {
  const norm = val.trim().toLowerCase();
  if (norm === "compare" || norm === "all") {
    return CliScenarioTarget.Compare;
  }
  return toStrategyId(val) as CliScenarioTarget;
}

export function parseMonthArg(val: string): string | number {
  if (!val) {
    throw new TypeError(
      "Missing month argument. Example: explain M09.2027, explain Sim21, explain M12, or --explain 21",
    );
  }
  const trimmed = val.trim();
  const matchMonthId = trimmed.match(/^M(0[1-9]|1[0-2])\.?(\d{4})$/i);
  if (matchMonthId) {
    return toMonthId(trimmed);
  }
  const matchSim = trimmed.match(/^Sim(\d+)$/i);
  if (matchSim) {
    const num = parseInt(matchSim[1], 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 120) {
      return num;
    }
  }
  const clean = trimmed.replace(/^[Mm](?:onth)?\s*/i, "");
  const num = parseInt(clean, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= 120) {
    return num;
  }
  return trimmed;
}

export function parseFieldArg(val: string): FieldColumnKey {
  if (!val) {
    throw new TypeError(
      "Missing field argument. Available fields: partner, mother, mutterschutz, husband, wife, taxClass, kindergeld, special, net, cumulative, phase, month.",
    );
  }
  const normalized = val
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, "");
  switch (normalized) {
    case "partner":
    case "father":
    case "fatherelterngeld":
    case "husbandelterngeld":
    case "partnermonths":
    case "partnershipbonus":
    case "partnerbonus":
      return FieldColumnKey.HusbandElterngeld;

    case "mother":
    case "wifeelterngeld":
    case "egplus":
    case "elterngeldplus":
    case "elterngeld":
    case "parentalallowance":
      return FieldColumnKey.WifeElterngeld;

    case "mutterschutz":
    case "maternity":
    case "muschg":
      return FieldColumnKey.Mutterschutz;

    case "husband":
    case "husbandsalary":
    case "fathersalary":
    case "fathergross":
      return FieldColumnKey.HusbandSalary;

    case "wife":
    case "wifesalary":
    case "mothersalary":
    case "mothergross":
      return FieldColumnKey.WifeSalary;

    case "tax":
    case "taxclass":
    case "taxclasses":
    case "classes":
    case "class":
      return FieldColumnKey.TaxClass;

    case "kindergeld":
    case "childbenefit":
    case "child":
    case "children":
      return FieldColumnKey.Kindergeld;

    case "special":
    case "specialevents":
    case "bonus":
    case "taxreturn":
    case "refund":
      return FieldColumnKey.SpecialEvents;

    case "net":
    case "netinflow":
    case "monthlynet":
    case "monthlytotal":
    case "inflow":
    case "total":
      return FieldColumnKey.NetInflow;

    case "cumulative":
    case "cumulativetotal":
    case "cumulated":
    case "balance":
    case "wealth":
      return FieldColumnKey.CumulativeTotal;

    case "phase":
    case "status":
    case "event":
    case "eventtag":
      return FieldColumnKey.Phase;

    case "month":
    case "date":
    case "calendar":
      return FieldColumnKey.Month;

    default: {
      const validNames = [
        "partner (or husbandElterngeld)",
        "mother (or wifeElterngeld, egplus)",
        "mutterschutz",
        "husband (or husbandSalary)",
        "wife (or wifeSalary)",
        "taxClass",
        "kindergeld",
        "special (or specialEvents)",
        "net (or netInflow)",
        "cumulative (or cumulativeTotal)",
        "phase",
        "month",
      ];
      throw new TypeError(
        `Unknown explanation field: "${val}". Available fields are: ${validNames.join(", ")}.`,
      );
    }
  }
}

export const CliMode = {
  Simulate: "SIMULATE",
  GrossToNet: "GROSS_TO_NET",
  SpousalNet: "SPOUSAL_NET",
  ListScenarios: "LIST_SCENARIOS",
} as const;
export type CliMode = (typeof CliMode)[keyof typeof CliMode];

interface CliOptions {
  mode: CliMode;
  scenario: CliScenarioTarget;
  startYear?: number;
  startMonth?: number;
  duration?: number;
  pregStartSimMonth?: number;
  birthSpacing?: number;
  annualRaise: number;
  format: CliOutputFormat;
  enable13th: boolean;
  taxReturnMonth: number;
  period: SalaryPeriod;
  gross?: number;
  taxClass?: TaxClass;
  childrenCount: number;
  bonus?: number;
  husbandGross?: number;
  wifeGross?: number;
  husbandHours?: number;
  wifeHours?: number;
  annualBonusGross?: number;
  investmentReturnMonthly?: number;
  salaryMode?: SalaryInputMode;
  pregYear?: number;
  pregMonth?: number;
  explainMonth?: string | number;
  explainField?: FieldColumnKey;
  scenarioFile?: string;
}

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = {
    mode: CliMode.Simulate,
    scenario: CliScenarioTarget.Compare,
    annualRaise: 0,
    format: CliOutputFormat.Table,
    enable13th: true,
    taxReturnMonth: 3,
    period: SalaryPeriod.Monthly,
    childrenCount: 0,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    else if (
      arg === "--list-scenarios" ||
      arg === "--scenarios" ||
      arg === "scenarios" ||
      arg === "list-scenarios"
    ) {
      opts.mode = CliMode.ListScenarios;
    }
    else if (
      arg === "gross-to-net" ||
      arg === "gross2net" ||
      arg === "brutto-netto"
    ) {
      opts.mode = CliMode.GrossToNet;
    }
    else if (
      arg === "spousal-net" ||
      arg === "spousal" ||
      arg === "couple-net"
    ) {
      opts.mode = CliMode.SpousalNet;
    }
    else if (arg === "explain") {
      const nextArg = args[++i];
      if (nextArg) {
        opts.explainMonth = parseMonthArg(nextArg);
      }
      // Check if following arguments provide 'field <fieldName>' or '--field <fieldName>'
      if (i + 1 < args.length) {
        const peek = args[i + 1];
        if (peek === "field" || peek === "--field") {
          i += 1;
          opts.explainField = parseFieldArg(args[++i]);
        }
      }
    }
    else if (arg === "--explain" || arg === "-e") {
      opts.explainMonth = parseMonthArg(args[++i]);
    }
    else if (arg === "--explain-month") {
      opts.explainMonth = parseMonthArg(args[++i]);
    }
    else if (arg === "--explain-field" || arg === "--field") {
      opts.explainField = parseFieldArg(args[++i]);
    }
    else if (
      arg === "--scenario-file" ||
      arg === "--file" ||
      arg === "--preset" ||
      arg === "--scenario-name" ||
      arg === "-i"
    ) {
      opts.scenarioFile = args[++i];
    }
    else if (arg === "--scenario" || arg === "-s") {
      const val = args[++i] || "compare";
      const upper = val.toUpperCase();
      if (
        upper === "A" ||
        upper === "B" ||
        upper === "C" ||
        upper === "COMPARE"
      ) {
        opts.scenario = toCliScenarioTarget(val);
      }
      else {
        opts.scenarioFile = val;
      }
    }
    else if (arg === "--start-year") {
      opts.startYear = Number(args[++i]) || 2026;
    }
    else if (arg === "--start-month") {
      opts.startMonth = Number(args[++i]) || 1;
    }
    else if (arg === "--duration" || arg === "-d") {
      opts.duration = Number(args[++i]) || 60;
    }
    else if (arg === "--preg-start") {
      opts.pregStartSimMonth = Number(args[++i]) || 9;
    }
    else if (arg === "--preg-year") {
      opts.pregYear = Number(args[++i]);
    }
    else if (arg === "--preg-month") {
      opts.pregMonth = Number(args[++i]);
    }
    else if (arg === "--spacing") {
      opts.birthSpacing = Number(args[++i]) || 27;
    }
    else if (arg === "--raise" || arg === "-r") {
      opts.annualRaise = Number(args[++i]) || 0;
    }
    else if (arg === "--format" || arg === "-f") {
      opts.format = toCliOutputFormat(args[++i] || "table");
    }
    else if (arg === "--no-13th") {
      opts.enable13th = false;
    }
    else if (arg === "--tax-month") {
      opts.taxReturnMonth = Number(args[++i]) || 3;
    }
    else if (arg === "--period") {
      opts.period = toSalaryPeriod(args[++i]);
    }
    else if (arg === "--yearly" || arg === "-y" || arg === "--annual") {
      opts.period = SalaryPeriod.Yearly;
    }
    else if (arg === "--monthly") {
      opts.period = SalaryPeriod.Monthly;
    }
    else if (arg === "--gross" || arg === "-g") {
      opts.gross = Number(args[++i]);
    }
    else if (arg === "--tax-class" || arg === "--class" || arg === "-c") {
      opts.taxClass = toTaxClass(args[++i]);
    }
    else if (arg === "--children" || arg === "--kids") {
      opts.childrenCount = Number(args[++i]) || 0;
    }
    else if (arg === "--bonus" || arg === "-b") {
      opts.bonus = Number(args[++i]);
    }
    else if (arg === "--husband-gross" || arg === "--h-gross") {
      opts.husbandGross = Number(args[++i]);
    }
    else if (arg === "--wife-gross" || arg === "--w-gross") {
      opts.wifeGross = Number(args[++i]);
    }
    else if (arg === "--husband-hours" || arg === "--h-hours") {
      opts.husbandHours = Number(args[++i]);
    }
    else if (arg === "--wife-hours" || arg === "--w-hours") {
      opts.wifeHours = Number(args[++i]);
    }
    else if (
      arg === "--annual-bonus" ||
      arg === "--annual-bonus-gross" ||
      arg === "--bonus-gross"
    ) {
      opts.annualBonusGross = Number(args[++i]);
    }
    else if (
      arg === "--investment" ||
      arg === "--investment-return" ||
      arg === "--capital-inflow"
    ) {
      opts.investmentReturnMonthly = Number(args[++i]);
    }
    else if (arg === "--salary-mode") {
      opts.salaryMode =
        args[++i]?.toUpperCase() === "GROSS"
          ? SalaryInputMode.Gross
          : SalaryInputMode.Net;
    }
  }

  // Auto-calibrate start date if pregYear & pregMonth are passed
  if (opts.pregYear && opts.pregMonth) {
    const cal = calculateSimulationStartDate(
      toFullCalendarYear(opts.pregYear),
      toCalendarMonth(opts.pregMonth),
    );
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
  npm run sim -- gross-to-net --gross <amount> --tax-class <I|II|III|IV|V|VI> [options]
  npm run sim -- spousal-net --husband-gross <amount> --wife-gross <amount> [options]
  npm run sim -- explain <month> [field <fieldName>] [options]

${BOLD}Commands:${RESET}
  scenarios, --list-scenarios      List all available built-in scenarios and local *.local.json scenario files
  gross-to-net                     Compute full itemized § 38b/§ 39b Gross-to-Net breakdown
  spousal-net                      Derive complete household spousal net set across all tax class combinations
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

${BOLD}Gross-to-Net Options:${RESET}
  -g, --gross <amount>             Monthly gross salary in €
  -c, --tax-class <class>          German statutory tax class (I, II, III, IV, V, VI)
  --children <count>               Number of dependent children for § 55 SGB XI care rate discount (default: 0)
  -b, --bonus <amount>             Non-recurrent bonus amount (Sonstige Bezüge § 39b EStG)
  --husband-gross <amount>         Husband monthly gross salary in €
  --wife-gross <amount>            Wife full-time monthly gross salary in €
  --wife-hours <hours>             Wife post-birth part-time weekly hours (default: 24)

${BOLD}Simulation Options:${RESET}
  -s, --scenario <id|path|A|B|C>   Built-in scenario ID (e.g. empty, standard_3_children), path, or target A/B/C
  -i, --scenario-file <path>       Path to custom scenario JSON or *.local.json file
  --preset <name>                  Load a built-in scenario preset by ID
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
  npm run sim -- -i src/data/testScenario.json   # Run simulation using explicit scenario file
  npm run sim -- gross-to-net -g 4500 -c III     # Itemized breakdown for 4.500 € Gross in Tax Class III
  npm run sim -- gross-to-net -g 3000 -c V -b 2000 # With 2.000 € 13th month bonus in Class V
  npm run sim -- spousal-net --husband-gross 4500 --wife-gross 3000 # Full spousal tax class matrix
  npm run sim -- --husband-gross 4500 --wife-gross 3000 -s compare # Simulate using dynamic gross inputs
  npm run sim -- explain M21 field partner       # Step-by-step calculation for Father Partner Months
`);
}

function printGrossToNetBreakdown(
  b: GrossToNetBreakdown,
  period: SalaryPeriod = SalaryPeriod.Monthly,
): void {
  const isYearly = period === SalaryPeriod.Yearly;
  const line = "═".repeat(80);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(
    `${BOLD}${CYAN}STATUTORY GROSS-TO-NET BREAKDOWN (${isYearly ? "ANNUAL" : "MONTHLY"} · § 38b, § 39b EStG & SGB IV/V/VI/XI)${RESET}`,
  );
  console.log(
    `${DIM}Tax Class: ${b.taxClass} · Children: ${b.childrenCount} · Statutory Tariff Zone: ${b.wageTaxZone}${RESET}`,
  );
  console.log(`${BOLD}${CYAN}${line}${RESET}\n`);

  if (isYearly) {
    console.log(
      `  ${BOLD}Annual Gross Salary:${RESET}      ${GREEN}${BOLD}${formatEuro(b.annualGross)}${RESET} (${formatEuro(b.monthlyGross)} / month)`,
    );
  }
  else {
    console.log(
      `  ${BOLD}Monthly Gross Salary:${RESET}     ${GREEN}${BOLD}${formatEuro(b.monthlyGross)}${RESET} (${formatEuro(b.annualGross)} / year)`,
    );
  }
  if (b.oneOffBonusAmount) {
    console.log(
      `  ${BOLD}Non-Recurrent Bonus:${RESET}      ${YELLOW}${BOLD}+${formatEuro(b.oneOffBonusAmount)}${RESET} ${DIM}(Sonstige Bezüge § 39b EStG)${RESET}`,
    );
  }

  const mult = isYearly ? 12 : 1;
  const unit = isYearly ? " / yr" : " / mo";

  console.log(
    `\n${BOLD}Social Insurance Deductions (Employee Share${isYearly ? ", Annual" : ""}):${RESET}`,
  );
  console.log(
    `  • ${BOLD}Health Insurance (GKV ${(b.healthInsuranceRate * 100).toFixed(2)}%):${RESET}      ${RED}${formatEuro(b.healthInsurance * mult).padStart(10)}${RESET}${unit} ${DIM}[BBG ceiling: ${formatEuro(b.taxRules.parameters.healthCapMonthly.value)}/mo]${RESET}`,
  );
  console.log(
    `  • ${BOLD}Pension Insurance (GRV ${(b.pensionInsuranceRate * 100).toFixed(2)}%):${RESET}     ${RED}${formatEuro(b.pensionInsurance * mult).padStart(10)}${RESET}${unit} ${DIM}[BBG ceiling: ${formatEuro(b.taxRules.parameters.pensionCapMonthly.value)}/mo]${RESET}`,
  );
  console.log(
    `  • ${BOLD}Unemployment Insurance (${(b.unemploymentInsuranceRate * 100).toFixed(2)}%):${RESET}  ${RED}${formatEuro(b.unemploymentInsurance * mult).padStart(10)}${RESET}${unit}`,
  );
  console.log(
    `  • ${BOLD}Care Insurance (PV ${(b.careInsuranceRate * 100).toFixed(2)}%):${RESET}          ${RED}${formatEuro(b.careInsurance * mult).padStart(10)}${RESET}${unit} ${DIM}[§ 55 SGB XI child discount]${RESET}`,
  );
  console.log(`  ${"─".repeat(48)}`);
  console.log(
    `  ${BOLD}Total Social Security:${RESET}             ${RED}${BOLD}${formatEuro(b.totalSocialSecurity * mult).padStart(10)}${RESET}${unit}`,
  );

  console.log(
    `\n${BOLD}Statutory Tax Withholding (${isYearly ? "Annual Total, " : ""}§ 38b, § 39b EStG, SolzG):${RESET}`,
  );
  console.log(
    `  • ${BOLD}Wage Tax (${b.taxClass}):${RESET}                  ${RED}${formatEuro(b.monthlyWageTax * mult).padStart(10)}${RESET}${unit}`,
  );
  console.log(
    `  • ${BOLD}Solidarity Surcharge (Solz):${RESET}          ${RED}${formatEuro(b.monthlySolidaritySurcharge * mult).padStart(10)}${RESET}${unit}`,
  );
  if (b.bonusTaxDeduction) {
    console.log(
      `  • ${BOLD}Bonus Tax (Annual Differential):${RESET}      ${RED}${formatEuro(b.bonusTaxDeduction).padStart(10)}${RESET} ${DIM}[§ 39b Abs. 3 EStG]${RESET}`,
    );
  }
  console.log(`  ${"─".repeat(48)}`);
  console.log(
    `  ${BOLD}Total Tax Withholding:${RESET}             ${RED}${BOLD}${formatEuro(b.totalTaxWithholding * mult).padStart(10)}${RESET}${unit}`,
  );

  console.log(`\n${BOLD}Final Net Pay Summary:${RESET}`);
  if (isYearly) {
    console.log(
      `  ${BOLD}✔ Annual Net Take-Home Pay:${RESET}         ${GREEN}${BOLD}${formatEuro(b.monthlyNetTakeHome * 12)}${RESET} / year (${formatEuro(b.monthlyNetTakeHome)} / month)`,
    );
    console.log(
      `  ${BOLD}✔ Regular Net Excluding Bonuses:${RESET}  ${CYAN}${BOLD}${formatEuro(b.regularNetTakeHome)}${RESET} / month baseline (${formatEuro(b.regularNetTakeHome * 12)} / year)`,
    );
  }
  else {
    console.log(
      `  ${BOLD}✔ Monthly Net Take-Home Pay:${RESET}        ${GREEN}${BOLD}${formatEuro(b.monthlyNetTakeHome)}${RESET}`,
    );
    console.log(
      `  ${BOLD}✔ Regular Net Excluding Bonuses:${RESET}  ${CYAN}${BOLD}${formatEuro(b.regularNetTakeHome)}${RESET} ${DIM}(Excludes non-recurrent bonuses)${RESET}`,
    );
  }
  console.log(
    `  ${DIM}Effective Tax Rate: ${(b.effectiveTaxRatePercent * 100).toFixed(1)}% · Total Deductions: ${(b.effectiveTotalDeductionRatePercent * 100).toFixed(1)}%${RESET}`,
  );
  console.log(`  ${DIM}Legal Citation: ${b.statutoryCitation}${RESET}`);

  console.log(`\n${CYAN}${line}${RESET}\n`);
}

function printSpousalGrossToNetSet(
  set: SpousalGrossToNetSet,
  period: SalaryPeriod = SalaryPeriod.Monthly,
): void {
  const isYearly = period === SalaryPeriod.Yearly;
  const line = "═".repeat(80);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(
    `${BOLD}${CYAN}SPOUSAL HOUSEHOLD GROSS-TO-NET COMPARISON SET (${isYearly ? "ANNUAL" : "MONTHLY"} · § 38b EStG & § 2b BEEG)${RESET}`,
  );
  if (isYearly) {
    console.log(
      `${DIM}Husband Gross: ${formatEuro(set.husbandGross * 12)} / yr (${formatEuro(set.husbandGross)} / mo) · Wife Gross FT: ${formatEuro(set.wifeGrossFullTime * 12)} / yr (${formatEuro(set.wifeGrossFullTime)} / mo) (PT: ${formatEuro(set.wifeGrossPartTime * 12)} / yr)${RESET}`,
    );
  }
  else {
    console.log(
      `${DIM}Husband Gross: ${formatEuro(set.husbandGross)} · Wife Gross FT: ${formatEuro(set.wifeGrossFullTime)} (PT: ${formatEuro(set.wifeGrossPartTime)})${RESET}`,
    );
  }
  console.log(`${BOLD}${CYAN}${line}${RESET}\n`);

  if (isYearly) {
    const h3Y = set.husbandClass3Net * 12;
    const h5Y = set.husbandClass5Net * 12;
    const h4Y = set.husbandClass4Net * 12;
    const hDiffY = h5Y - h3Y;

    console.log(`  ${BOLD}Husband Annual Salary Breakdown:${RESET}`);
    console.log(
      `  • Tax Class III (Default):      ${GREEN}${BOLD}${formatEuro(h3Y)}${RESET} net / yr (${formatEuro(set.husbandClass3Net)} / mo)`,
    );
    console.log(
      `  • Tax Class V (Prenatal Swap):  ${YELLOW}${BOLD}${formatEuro(h5Y)}${RESET} net / yr (${formatEuro(set.husbandClass5Net)} / mo) ${RED}(Δ ${formatEuro(hDiffY)} / yr)${RESET}`,
    );
    console.log(
      `  • Tax Class IV (Proportional):  ${CYAN}${formatEuro(h4Y)}${RESET} net / yr (${formatEuro(set.husbandClass4Net)} / mo)`,
    );

    const w5Y = set.wifeClass5FullTimeNet * 12;
    const w3Y = set.wifeClass3FullTimeNet * 12;
    const w4Y = set.wifeClass4FullTimeNet * 12;
    const wBoostY = w3Y - w5Y;

    console.log(
      `\n  ${BOLD}Wife Full-Time (40h) Annual Salary Breakdown:${RESET}`,
    );
    console.log(
      `  • Tax Class V (Default):        ${YELLOW}${BOLD}${formatEuro(w5Y)}${RESET} net / yr (${formatEuro(set.wifeClass5FullTimeNet)} / mo)`,
    );
    console.log(
      `  • Tax Class III (Prenatal Swap):${GREEN}${BOLD}${formatEuro(w3Y)}${RESET} net / yr (${formatEuro(set.wifeClass3FullTimeNet)} / mo) ${GREEN}(+${formatEuro(wBoostY)} / yr Elterngeld Booster!)${RESET}`,
    );
    console.log(
      `  • Tax Class IV (Proportional):  ${CYAN}${formatEuro(w4Y)}${RESET} net / yr (${formatEuro(set.wifeClass4FullTimeNet)} / mo)`,
    );

    const wPt5Y = set.wifeClass5PartTimeNet * 12;
    const wPt3Y = set.wifeClass3PartTimeNet * 12;

    console.log(
      `\n  ${BOLD}Wife Post-Birth Part-Time (${set.wifePartTimeWeeklyHours}h) Annual Salary Breakdown:${RESET}`,
    );
    console.log(
      `  • Tax Class V (Reverted):       ${GREEN}${BOLD}${formatEuro(wPt5Y)}${RESET} net / yr (${formatEuro(set.wifeClass5PartTimeNet)} / mo)`,
    );
    console.log(
      `  • Tax Class III (Extended):     ${CYAN}${formatEuro(wPt3Y)}${RESET} net / yr (${formatEuro(set.wifeClass3PartTimeNet)} / mo)`,
    );

    console.log(
      `\n  ${BOLD}Prenatal Swap Net Cash Flow Impact (Annual):${RESET}`,
    );
    const defaultMonthlyInflow =
      set.husbandClass3Net + set.wifeClass5FullTimeNet;
    const swapMonthlyInflow = set.husbandClass5Net + set.wifeClass3FullTimeNet;
    const diff = swapMonthlyInflow - defaultMonthlyInflow;

    console.log(
      `  • Combined Net in Default (H: III | W: V): ${formatEuro(defaultMonthlyInflow * 12)} / yr (${formatEuro(defaultMonthlyInflow)} / mo)`,
    );
    console.log(
      `  • Combined Net in Swap (H: V | W: III):    ${formatEuro(swapMonthlyInflow * 12)} / yr (${formatEuro(swapMonthlyInflow)} / mo)`,
    );
    console.log(
      `  • Annual Temporary Tax Gap:               ${diff < 0 ? RED : GREEN}${diff >= 0 ? "+" : ""}${formatEuro(diff * 12)} / yr${RESET} ${DIM}(${formatEuro(diff)} / mo, Reconciled via § 26b Annual Tax Return)${RESET}`,
    );
  }
  else {
    console.log(`  ${BOLD}Husband Salary Breakdown:${RESET}`);
    console.log(
      `  • Tax Class III (Default):      ${GREEN}${BOLD}${formatEuro(set.husbandClass3Net)}${RESET} net / mo (${formatEuro(set.husbandClass3Net * 12)} / yr)`,
    );
    console.log(
      `  • Tax Class V (Prenatal Swap):  ${YELLOW}${BOLD}${formatEuro(set.husbandClass5Net)}${RESET} net / mo ${RED}(Δ ${formatEuro(set.husbandClass5Net - set.husbandClass3Net)})${RESET}`,
    );
    console.log(
      `  • Tax Class IV (Proportional):  ${CYAN}${formatEuro(set.husbandClass4Net)}${RESET} net / mo`,
    );

    console.log(`\n  ${BOLD}Wife Full-Time (40h) Salary Breakdown:${RESET}`);
    console.log(
      `  • Tax Class V (Default):        ${YELLOW}${BOLD}${formatEuro(set.wifeClass5FullTimeNet)}${RESET} net / mo (${formatEuro(set.wifeClass5FullTimeNet * 12)} / yr)`,
    );
    console.log(
      `  • Tax Class III (Prenatal Swap):${GREEN}${BOLD}${formatEuro(set.wifeClass3FullTimeNet)}${RESET} net / mo ${GREEN}(+${formatEuro(set.wifeClass3FullTimeNet - set.wifeClass5FullTimeNet)} Elterngeld Booster!)${RESET}`,
    );
    console.log(
      `  • Tax Class IV (Proportional):  ${CYAN}${formatEuro(set.wifeClass4FullTimeNet)}${RESET} net / mo`,
    );

    console.log(
      `\n  ${BOLD}Wife Post-Birth Part-Time (${set.wifePartTimeWeeklyHours}h) Salary Breakdown:${RESET}`,
    );
    console.log(
      `  • Tax Class V (Reverted):       ${GREEN}${BOLD}${formatEuro(set.wifeClass5PartTimeNet)}${RESET} net / mo`,
    );
    console.log(
      `  • Tax Class III (Extended):     ${CYAN}${formatEuro(set.wifeClass3PartTimeNet)}${RESET} net / mo`,
    );

    console.log(
      `\n  ${BOLD}Prenatal Swap Net Cash Flow Impact (Monthly):${RESET}`,
    );
    const defaultMonthlyInflow =
      set.husbandClass3Net + set.wifeClass5FullTimeNet;
    const swapMonthlyInflow = set.husbandClass5Net + set.wifeClass3FullTimeNet;
    const diff = swapMonthlyInflow - defaultMonthlyInflow;

    console.log(
      `  • Combined Net in Default (H: III | W: V): ${formatEuro(defaultMonthlyInflow)} / mo (${formatEuro(defaultMonthlyInflow * 12)} / yr)`,
    );
    console.log(
      `  • Combined Net in Swap (H: V | W: III):    ${formatEuro(swapMonthlyInflow)} / mo (${formatEuro(swapMonthlyInflow * 12)} / yr)`,
    );
    console.log(
      `  • Monthly Temporary Tax Gap:              ${diff < 0 ? RED : GREEN}${diff >= 0 ? "+" : ""}${formatEuro(diff)} / mo${RESET} ${DIM}(Reconciled via § 26b Annual Tax Return)${RESET}`,
    );
  }

  console.log(`\n${CYAN}${line}${RESET}\n`);
}

function printFieldExplanation(
  exp: FieldExplanation,
  _monthNum: number,
  scenarioId: ScenarioId,
  m: TimelineMonth,
): void {
  const line = "═".repeat(80);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(
    `${BOLD}${CYAN}FIELD EXPLANATION: ${exp.fieldTitle} (${m.monthRef || m.relativeMonthLabel || m.relativeBirthLabel} · ${m.monthId} · ${m.monthSimRef || toMonthSimRef(m.month)} · ${m.calendarLabel})${RESET}`,
  );
  console.log(
    `${DIM}Scenario: ${scenarioId} · Spousal Tax Classes: ${m.taxClassLabel}${RESET}`,
  );
  console.log(`${BOLD}${CYAN}${line}${RESET}\n`);

  console.log(
    `  ${BOLD}Value:${RESET}              ${GREEN}${BOLD}${exp.valueFormatted}${RESET}`,
  );
  if (exp.derivationFormula) {
    console.log(
      `  ${BOLD}Derivation Formula:${RESET} ${YELLOW}${exp.derivationFormula}${RESET}`,
    );
  }
  if (exp.legalCitation) {
    console.log(
      `  ${BOLD}Legal Citation:${RESET}     ${BLUE}${exp.legalCitation}${RESET}`,
    );
  }
  if (exp.diffVsBFormatted) {
    console.log(
      `  ${BOLD}Comparison vs. B:${RESET}   ${exp.diffVsBFormatted.includes("+") ? GREEN : RED}${exp.diffVsBFormatted}${RESET}`,
    );
  }

  console.log(`\n${BOLD}Description:${RESET}`);
  console.log(`  ${exp.explanation}`);

  if (exp.contributingFactors && exp.contributingFactors.length > 0) {
    console.log(`\n${BOLD}Contributing Parameters / Factors:${RESET}`);
    exp.contributingFactors.forEach((f) => {
      console.log(
        `  • ${BOLD}${f.name}:${RESET} ${CYAN}${f.value}${RESET}${f.description ? ` (${DIM}${f.description}${RESET})` : ""}`,
      );
    });
  }

  if (exp.calculationSteps && exp.calculationSteps.length > 0) {
    console.log(`\n${BOLD}Step-by-Step Calculation Breakdown:${RESET}`);
    exp.calculationSteps.forEach((s) => {
      console.log(`  ${BOLD}[${s.stepNumber}] ${s.description}${RESET}`);
      console.log(`      ${DIM}Formula:${RESET} ${YELLOW}${s.formula}${RESET}`);
      console.log(
        `      ${DIM}Result:${RESET}  ${GREEN}${BOLD}${s.result}${RESET}`,
      );
    });
  }

  console.log(`\n${CYAN}${line}${RESET}\n`);
}

function printMonthExplanation(
  rowExp: RowExplanation,
  m: TimelineMonth,
  scenarioId: ScenarioId,
): void {
  const line = "═".repeat(80);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(
    `${BOLD}${CYAN}FULL MONTHLY AUDIT: ${rowExp.title} (${m.monthRef || m.relativeMonthLabel || m.relativeBirthLabel} · ${m.monthId} · ${m.monthSimRef || toMonthSimRef(m.month)} · ${m.calendarLabel})${RESET}`,
  );
  console.log(`${DIM}${rowExp.subtitle} · Scenario: ${scenarioId}${RESET}`);
  console.log(`${BOLD}${CYAN}${line}${RESET}\n`);

  console.log(
    `  ${BOLD}Phase / Status:${RESET}      ${MAGENTA}${rowExp.phaseOrCategory}${RESET}`,
  );
  console.log(
    `  ${BOLD}Monthly Net Inflow:${RESET}  ${GREEN}${BOLD}${rowExp.totalNetInflowFormatted}${RESET}${rowExp.diffVsBFormatted ? ` (${rowExp.diffVsBFormatted} vs Scenario B)` : ""}`,
  );
  console.log(
    `  ${BOLD}Progressive Total:${RESET}   ${CYAN}${BOLD}${rowExp.cumulatedTotalFormatted}${RESET}`,
  );
  if (rowExp.legalCitation) {
    console.log(
      `  ${BOLD}Statutory Basis:${RESET}     ${BLUE}${rowExp.legalCitation}${RESET}`,
    );
  }

  console.log(`\n${BOLD}Audit Summary:${RESET}`);
  console.log(`  ${rowExp.summaryDescription}`);

  if (rowExp.streams.length > 0) {
    console.log(`\n${BOLD}Itemized Cash Flow Breakdown:${RESET}`);
    rowExp.streams.forEach((st) => {
      console.log(
        `  • ${BOLD}${st.label.padEnd(38)}:${RESET} ${GREEN}${st.valueFormatted.padStart(10)}${RESET} ${DIM}[${st.formula || st.notes}]${RESET}`,
      );
    });
    console.log(`  ${"─".repeat(52)}`);
    console.log(
      `    ${BOLD}${"Total Net Household Inflow".padEnd(36)}:${RESET} ${GREEN}${BOLD}${rowExp.totalNetInflowFormatted.padStart(10)}${RESET}`,
    );
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
      const isCost = ev.amount < 0;
      console.log(
        `  💰 ${BOLD}${ev.title}${RESET} (${isCost ? RED : GREEN}${ev.amount.toLocaleString("de-DE")} €${RESET})`,
      );
      console.log(`     ↳ ${DIM}${ev.description || ev.category}${RESET}`);
    });
  }

  console.log(`\n${CYAN}${line}${RESET}\n`);
}

/**
 * Prints the scenario catalog of all built-in scenarios and discovered *.local.json scenario files.
 */
export function runListScenarios(): void {
  const border = "═".repeat(78);
  console.log(`\n${BOLD}${CYAN}${border}${RESET}`);
  console.log(
    `${BOLD}${CYAN}   GERMAN ELTERNGELD & FINANCIAL SIMULATOR — AVAILABLE SCENARIOS CATALOG${RESET}`,
  );
  console.log(`${BOLD}${CYAN}${border}${RESET}\n`);

  console.log(`${BOLD}Built-in Scenarios (src/data/scenarios/):${RESET}\n`);
  for (const item of BUILTIN_SCENARIO_CATALOG) {
    const defaultTag = item.isDefault
      ? ` ${GREEN}${BOLD}(Default / Base)${RESET}`
      : "";
    console.log(` • ${BOLD}${CYAN}${item.id}${RESET}${defaultTag}`);
    console.log(`   ${BOLD}Name:${RESET} ${item.name}`);
    console.log(`   ${DIM}${item.description}${RESET}\n`);
  }

  // Check for any local untracked scenario files (*.local.json)
  const localDirs = [
    path.resolve(process.cwd(), "src/data/scenarios"),
    path.resolve(process.cwd(), "src/data"),
    process.cwd(),
  ];
  interface LocalFileEntry {
    name: string;
    path: string;
  }
  const localFound: LocalFileEntry[] = [];

  for (const dir of localDirs) {
    if (fs.existsSync(dir)) {
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          if (entry.endsWith(".local.json")) {
            const fullPath = path.join(dir, entry);
            if (!localFound.some((f) => f.path === fullPath)) {
              localFound.push({
                name: entry,
                path: fullPath,
              });
            }
          }
        }
      }
      catch {
        // Ignore read errors
      }
    }
  }

  if (localFound.length > 0) {
    console.log(`${BOLD}Local Untracked Scenarios (*.local.json):${RESET}\n`);
    for (const loc of localFound) {
      console.log(
        ` • ${BOLD}${YELLOW}${loc.name}${RESET} (${DIM}${loc.path}${RESET})`,
      );
    }
    console.log("");
  }

  console.log(
    `${DIM}Run any scenario with: npm run simulate -- -s <scenario_id_or_path>${RESET}\n`,
  );
}

/**
 * Loads the active scenario baseline state for CLI execution.
 * Priority:
 * 1. Matching built-in scenario ID from catalog (e.g. "empty", "standard_3_children", "high_earner_household")
 * 2. Explicitly provided CLI scenario file path or scenario name (`-s <id|path>`, `--scenario-file <path>`)
 * 3. Unversioned `*.local.json` or `userScenario.json` (if present and not in test mode)
 * 4. Repository default base empty scenario (via `getDefaultPersistedState()`)
 *
 * @param identifierOrPath - Optional scenario identifier key or path to custom JSON.
 * @returns Fully validated and sanitized `ElterngeldPersistedState`.
 */
export function resolveCliScenarioState(
  identifierOrPath?: string,
): ElterngeldPersistedState {
  if (identifierOrPath) {
    // 1. Check if matching built-in scenario ID
    const builtin = loadScenarioById(identifierOrPath);
    if (builtin) {
      return builtin;
    }

    // 2. Check if direct file exists
    const directPath = path.resolve(process.cwd(), identifierOrPath);
    if (fs.existsSync(directPath)) {
      try {
        const content = fs.readFileSync(directPath, "utf-8");
        const parsed = JSON.parse(content);
        return validateAndSanitizePersistedState(parsed);
      }
      catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `${RED}${BOLD}Error:${RESET} Failed to parse scenario file "${directPath}": ${msg}`,
        );
        process.exit(1);
      }
    }

    // 3. Check inside src/data/scenarios/ folder
    const scenarioDirCandidates = [
      path.resolve(process.cwd(), "src/data/scenarios", identifierOrPath),
      path.resolve(
        process.cwd(),
        "src/data/scenarios",
        `${identifierOrPath}.json`,
      ),
      path.resolve(
        process.cwd(),
        "src/data/scenarios",
        `${identifierOrPath}.local.json`,
      ),
      path.resolve(process.cwd(), "src/data", identifierOrPath),
      path.resolve(process.cwd(), "src/data", `${identifierOrPath}.json`),
      path.resolve(process.cwd(), "src/data", `${identifierOrPath}.local.json`),
    ];
    for (const candidate of scenarioDirCandidates) {
      if (fs.existsSync(candidate)) {
        try {
          const content = fs.readFileSync(candidate, "utf-8");
          const parsed = JSON.parse(content);
          return validateAndSanitizePersistedState(parsed);
        }
        catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `${RED}${BOLD}Error:${RESET} Failed to parse scenario file "${candidate}": ${msg}`,
          );
          process.exit(1);
        }
      }
    }

    console.error(
      `${RED}${BOLD}Error:${RESET} Scenario "${identifierOrPath}" not found as built-in preset or file path. Run with --list-scenarios to view catalog.`,
    );
    process.exit(1);
  }

  // In test mode without explicit scenario flag, use canonical test scenario for deterministic assertions
  if (process.env.NODE_ENV === "test" || process.env.SIMULATOR_TEST_MODE) {
    return getTestPersistedState();
  }

  // Check if unversioned *.local.json or userScenario.json exists in filesystem
  const userCandidates = [
    path.resolve(process.cwd(), "src/data/scenarios/user.local.json"),
    path.resolve(process.cwd(), "src/data/userScenario.local.json"),
    path.resolve(process.cwd(), "userScenario.local.json"),
    path.resolve(process.cwd(), "src/data/userScenario.json"),
    path.resolve(process.cwd(), "userScenario.json"),
  ];
  for (const candidate of userCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const content = fs.readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(content);
        setUserScenarioOverride(parsed);
        break;
      }
      catch {
        // Fall back gracefully
      }
    }
  }

  return getDefaultPersistedState();
}

function buildSimulation(
  scenarioKey: ScenarioId,
  opts: CliOptions,
  baseState?: ElterngeldPersistedState,
): SimulationResult {
  const def = baseState ?? resolveCliScenarioState(opts.scenarioFile);
  const startYear = opts.startYear ?? def.startCalendarYear;
  const startMonth = opts.startMonth ?? def.startCalendarMonth;
  const duration = opts.duration ?? def.simulationDurationMonths;

  // Calculate dynamic or default spousal nets (normalizing yearly inputs if provided)
  const husbandGrossMonthly = normalizeCliGross(opts.husbandGross, opts.period, def.husbandGross);
  const wifeGrossMonthly = normalizeCliGross(opts.wifeGross, opts.period, def.wifeGross);

  const spousal = deriveSpousalNetSalaries(
    toGrossSalary(husbandGrossMonthly),
    toGrossSalary(wifeGrossMonthly),
    toWorkingHours(opts.wifeHours ?? def.wifePostBirthHours),
    toWorkingHours(def.wifeInitialHours),
    opts.childrenCount,
    createTaxRules(toFullCalendarYear(startYear)),
    def.husbandPayrollOptions,
    def.wifePayrollOptions,
  );

  // Batch 0: Preexisting conditions
  const preexisting: PreexistingConditions = {
    husbandPayrollOptions: def.husbandPayrollOptions,
    wifePayrollOptions: def.wifePayrollOptions,
    startCalendarYear: toFullCalendarYear(startYear),
    startCalendarMonth: toCalendarMonth(startMonth),
    simulationDurationMonths: toMonthDuration(duration),
    assumeManualNetIsAssessmentNet: def.assumeManualNetIsAssessmentNet,
    salaryInputMode: def.salaryInputMode,
    salaryPeriod: opts.period,
    husbandGross: toGrossSalary(husbandGrossMonthly),
    wifeGross: toGrossSalary(wifeGrossMonthly),
    husbandInitialTaxClass: def.husbandInitialTaxClass ?? TaxClass.III,
    husbandInitialNet: spousal
      ? spousal.husbandClass3Net
      : def.husbandClass3Net,
    husbandInitialClass5Net: spousal
      ? spousal.husbandClass5Net
      : def.husbandClass5Net,
    husbandWeeklyHours: toWorkingHours(opts.husbandHours || def.husbandHours),
    wifeInitialTaxClass: def.wifeInitialTaxClass ?? TaxClass.V,
    wifeInitialFullTimeNet: spousal
      ? spousal.wifeClass5FullTimeNet
      : def.wifeClass5FullTimeNet,
    wifeInitialClass3FullTimeNet: spousal
      ? spousal.wifeClass3FullTimeNet
      : def.wifeClass3FullTimeNet,
    wifeInitialPartTimeClass5Net: spousal
      ? spousal.wifeClass5PartTimeNet
      : def.wifeClass5FullTimeNet,
    wifeInitialPartTimeClass3Net: spousal
      ? spousal.wifeClass3PartTimeNet
      : def.wifeClass3FullTimeNet,
    wifeWeeklyHours: toWorkingHours(def.wifeInitialHours),
    wifePostBirthWeeklyHours: toWorkingHours(
      opts.wifeHours ?? def.wifePostBirthHours,
    ),
    annualBonusGross: opts.annualBonusGross
      ? toEuroAmount(opts.annualBonusGross)
      : def.annualBonusGross,
    annualBonusMonth: def.annualBonusMonth,
    investmentReturnMonthly: opts.investmentReturnMonthly
      ? toEuroAmount(opts.investmentReturnMonthly)
      : def.investmentReturnMonthly,
    existingChildrenCount: toChildrenCount(opts.childrenCount),
    kindergeldPerChild: def.kindergeldPerChild,
    enable13thSalary: opts.enable13th,
    bonus40Month: def.bonus40Month,
    bonus60Month: def.bonus60Month,
    taxReturnMonth: toCalendarMonth(opts.taxReturnMonth),
  };

  const ptNet5 = spousal
    ? spousal.wifeClass5PartTimeNet
    : def.wifeClass5FullTimeNet;
  const ptNet3 = spousal
    ? spousal.wifeClass3PartTimeNet
    : def.wifeClass3FullTimeNet;

  let pregnancies: readonly PregnancyAction[] = def.customPregnancies;
  let taxClassSwitches: readonly TaxClassSwitchAction[] =
    def.customTaxClassSwitches;

  // If CLI explicitly supplied pregnancy start / spacing overrides, construct synthetic batches
  if (opts.pregStartSimMonth !== undefined || opts.birthSpacing !== undefined) {
    const pregStart =
      opts.pregStartSimMonth ?? def.prePregnancyPlanningMonths + 1;
    const spacing = opts.birthSpacing ?? def.birthSpacingMonths;
    const b1 = pregStart + 8;
    const b2 = b1 + spacing;
    const lead = def.swapLeadMonths ?? 7;

    pregnancies = [
      {
        pregnancyId: toPregnancyId("PREG-CHILD-1"),
        childIndex: toChildIndex(1),
        positiveTestCalendarMonth: toCalendarMonth(
          ((startMonth - 1 + pregStart - 1) % 12) + 1,
        ),
        positiveTestCalendarYear: toFullCalendarYear(
          startYear + Math.floor((startMonth - 1 + pregStart - 1) / 12),
        ),
        positiveTestSimulationMonth: toSimulationMonth(pregStart),
        calculatedDeliverySimulationMonth: toSimulationMonth(b1),
        motherPostBirthPartTimeHours: toWorkingHours(
          opts.wifeHours ?? def.wifePostBirthHours,
        ),
        motherPostBirthPartTimeClass5Net: ptNet5,
        motherPostBirthPartTimeClass3Net: ptNet3,
        fatherPartnerMonthsCount: toMonthDuration(4),
      },
      {
        pregnancyId: toPregnancyId("PREG-CHILD-2"),
        childIndex: toChildIndex(2),
        positiveTestCalendarMonth: toCalendarMonth(
          ((startMonth - 1 + (b2 - 9)) % 12) + 1,
        ),
        positiveTestCalendarYear: toFullCalendarYear(
          startYear + Math.floor((startMonth - 1 + (b2 - 9)) / 12),
        ),
        positiveTestSimulationMonth: toSimulationMonth(b2 - 8),
        calculatedDeliverySimulationMonth: toSimulationMonth(b2),
        motherPostBirthPartTimeHours: toWorkingHours(
          opts.wifeHours ?? def.wifePostBirthHours,
        ),
        motherPostBirthPartTimeClass5Net: ptNet5,
        motherPostBirthPartTimeClass3Net: ptNet3,
        fatherPartnerMonthsCount: toMonthDuration(4),
      },
    ];

    const preM1 = b1 - 1;
    const swap1Start = Math.max(1, preM1 - lead);
    const preM2 = b2 - 1;
    const swap2Start = Math.max(b1 + 2, preM2 - lead);

    taxClassSwitches = [
      {
        switchId: toSwitchId("SWAP-CHILD-1"),
        effectiveSimulationMonth: toSimulationMonth(swap1Start),
        effectiveCalendarMonth: toCalendarMonth(
          ((startMonth - 1 + swap1Start - 1) % 12) + 1,
        ),
        effectiveCalendarYear: toFullCalendarYear(
          startYear + Math.floor((startMonth - 1 + swap1Start - 1) / 12),
        ),
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        statutoryReason:
          "Optimize 12-month synthetic Elterngeld assessment baseline (§ 2b BEEG)",
        revertSimulationMonth: toSimulationMonth(b1),
      },
      {
        switchId: toSwitchId("SWAP-CHILD-2"),
        effectiveSimulationMonth: toSimulationMonth(swap2Start),
        effectiveCalendarMonth: toCalendarMonth(
          ((startMonth - 1 + swap2Start - 1) % 12) + 1,
        ),
        effectiveCalendarYear: toFullCalendarYear(
          startYear + Math.floor((startMonth - 1 + swap2Start - 1) / 12),
        ),
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        statutoryReason:
          "Optimize Child 2 Part-Time Elterngeld baseline (§ 2b BEEG)",
        revertSimulationMonth: toSimulationMonth(b2),
      },
    ];
  }

  // Batch 3: Salary Raises
  const salaryRaises: SalaryRaiseAction[] = [...def.customSalaryRaises];
  if (opts.annualRaise > 0) {
    const totalYears = Math.ceil(duration / 12);
    for (let y = 2; y <= totalYears; y++) {
      const raiseMonth = (y - 1) * 12 + 1;
      if (raiseMonth <= duration) {
        salaryRaises.push({
          raiseId: toRaiseId(`RAISE-Y${y}`),
          effectiveSimulationMonth: toSimulationMonth(raiseMonth),
          effectiveCalendarMonth: toCalendarMonth(startMonth),
          effectiveCalendarYear: toFullCalendarYear(startYear + y - 1),
          targetPerson: TargetPerson.Both,
          percentageIncrease: toPercentageRate(opts.annualRaise),
          reason: `Year ${y} Tariff Adjustment (+${(opts.annualRaise * 100).toFixed(1)}%)`,
        });
      }
    }
  }

  return runScenarioBatches({
    scenarioKey,
    preexisting,
    pregnancies,
    taxClassSwitches,
    salaryRaises,
    workingHoursChanges: def.customWorkingHoursChanges,
    financialEvents: def.customFinancialEvents,
  });
}

function printSummaryScorecard(
  resA: SimulationResult,
  resB: SimulationResult,
  resC: SimulationResult,
) {
  for (const result of [resA, resB, resC]) {
    console.log(`Scenario ${result.scenarioKey}: ${result.benefitsComplete ? "benefit calculation available under stated assumptions" : "incomplete benefit calculation; totals omit unavailable payments"}`);
    for (const reason of result.unavailableReasons ?? []) {
      console.log(`  Unavailable: ${reason}`);
    }
    for (const assumption of result.assumptions ?? []) {
      console.log(`  Assumption: ${assumption}`);
    }
  }
  const gainOverB = resC.summary.grandTotal - resB.summary.grandTotal;
  const gainOverA = resC.summary.grandTotal - resA.summary.grandTotal;
  const benefitGainOverB =
    resC.summary.totalBenefits - resB.summary.totalBenefits;

  console.log(
    `\n${BOLD}${CYAN}========================================================================================${RESET}`,
  );
  console.log(
    `${BOLD}${CYAN}                   GERMAN ELTERNGELD SIMULATION KPI SCORECARD                          ${RESET}`,
  );
  console.log(
    `${BOLD}${CYAN}========================================================================================${RESET}\n`,
  );

  console.log(
    `  ${BOLD}Category${RESET}                       ${BOLD}Scenario A (Status Quo)${RESET}  ${BOLD}Scenario B (Unoptimized)${RESET} ${BOLD}Scenario C (Optimized)${RESET}`,
  );
  console.log(
    "  --------------------------------------------------------------------------------------",
  );
  console.log(
    `  Earned Net Salaries:          ${String(formatEuro(resA.summary.totalSalaries)).padStart(15)}  ${String(formatEuro(resB.summary.totalSalaries)).padStart(16)}  ${String(formatEuro(resC.summary.totalSalaries)).padStart(15)}`,
  );
  console.log(
    `  State Parental Benefits:      ${String(formatEuro(resA.summary.totalBenefits)).padStart(15)}  ${String(formatEuro(resB.summary.totalBenefits)).padStart(16)}  ${String(formatEuro(resC.summary.totalBenefits)).padStart(15)}`,
  );
  console.log(
    `  13th Month Special Bonuses:   ${String(formatEuro(resA.summary.total13thSalaries)).padStart(15)}  ${String(formatEuro(resB.summary.total13thSalaries)).padStart(16)}  ${String(formatEuro(resC.summary.total13thSalaries)).padStart(15)}`,
  );
  console.log(
    `  Annual Tax Returns (§ 26b):   ${String(formatEuro(resA.summary.totalTaxRefunds)).padStart(15)}  ${String(formatEuro(resB.summary.totalTaxRefunds)).padStart(16)}  ${String(formatEuro(resC.summary.totalTaxRefunds)).padStart(15)}`,
  );
  console.log(
    "  --------------------------------------------------------------------------------------",
  );
  console.log(
    `  ${BOLD}Grand Total Cash Inflow:      ${String(formatEuro(resA.summary.grandTotal)).padStart(15)}  ${String(formatEuro(resB.summary.grandTotal)).padStart(16)}  ${GREEN}${BOLD}${String(formatEuro(resC.summary.grandTotal)).padStart(15)}${RESET}`,
  );
  console.log(
    "  ======================================================================================\n",
  );

  console.log(
    `  ${BOLD}${GREEN}✔ Net Optimization Advantage (Scenario C vs B):${RESET}  ${BOLD}${GREEN}+${formatEuro(gainOverB)}${RESET}`,
  );
  console.log(
    `  ${BOLD}${GREEN}✔ State Benefit Surplus (§ 2b BEEG Maxed EG+):${RESET}   ${BOLD}${GREEN}+${formatEuro(benefitGainOverB)}${RESET}`,
  );
  console.log(
    `  ${BOLD}${CYAN}✔ Net Financial Gain vs Status Quo (C vs A):${RESET}     ${BOLD}${CYAN}+${formatEuro(gainOverA)}${RESET}\n`,
  );
}

function printMilestones(res: SimulationResult) {
  console.log(
    `\n${BOLD}${CYAN}Key Life Milestones & Special Events Timeline (${res.months.length} Months):${RESET}\n`,
  );

  res.months.forEach((m) => {
    // Print starting actions before month
    if (m.startingActions && m.startingActions.length > 0) {
      m.startingActions.forEach((act) => {
        console.log(
          `  ${BOLD}${MAGENTA}⚡ ${act.title}${RESET} [Triggered before ${m.calendarLabel} / ${act.relativeMonthLabel || m.relativeMonthLabel || m.relativeBirthLabel} · ${act.monthId || m.monthId}]`,
        );
        console.log(`    ↳ ${DIM}${act.description}${RESET}`);
      });
    }

    const events: string[] = [];
    if (m.isMutterschutz) {
      events.push(
        `${MAGENTA}Mutterschutz (${formatEuro(m.mutterschutz)})${RESET}`,
      );
    }
    if (m.wifeElterngeld > 0) {
      events.push(
        `${CYAN}ElterngeldPlus (${formatEuro(m.wifeElterngeld)})${RESET}`,
      );
    }
    if (m.hasSiblingBonus) {
      events.push(`${GREEN}Sibling Bonus (+10%)${RESET}`);
    }
    if (m.isPartnerschaftsbonus) {
      events.push(`${BLUE}Partnerschaftsbonus${RESET}`);
    }
    if (m.isSwapActive) {
      events.push(`${YELLOW}Tax Swap Active (H: V | W: III)${RESET}`);
    }
    if (m.specialBonusTotal > 0) {
      events.push(
        `${GREEN}13th Salary Bonus (${formatEuro(m.specialBonusTotal)})${RESET}`,
      );
    }
    if (m.taxRefund > 0) {
      events.push(
        `${BOLD}${GREEN}Tax Return Refund (§ 26b EStG: ${formatEuro(m.taxRefund)})${RESET}`,
      );
    }

    if (
      events.length > 0 ||
      (m.relativeMonthLabel || m.relativeBirthLabel).includes("Birth") ||
      (m.relativeMonthLabel || m.relativeBirthLabel).includes("Pregnancy") ||
      (m.relativeMonthLabel || m.relativeBirthLabel).includes("M-8")
    ) {
      console.log(
        `  ${BOLD}${m.calendarLabel}${RESET} (${BOLD}${m.monthRef || m.relativeMonthLabel || m.relativeBirthLabel}${RESET} · ${m.monthId} · ${m.monthSimRef || toMonthSimRef(m.month)}): ${m.phaseLabel}`,
      );
      if (events.length > 0) {
        console.log(`    ↳ ${events.join(" • ")}`);
      }
    }
  });
  console.log("");
}

// Main Execution
/** CLI salary amounts describe ordinary pay; extras are supplied separately. Never infer units from size. */
export function normalizeCliGross(amount: number | undefined, period: SalaryPeriod, fallback: GrossSalary): GrossSalary {
  return amount === undefined ? fallback : toGrossSalary(period === SalaryPeriod.Yearly ? amount / 12 : amount);
}

export function runCli(argv: string[] = process.argv.slice(2)): void {
  const opts = parseArgs(argv);

  if (opts.mode === CliMode.ListScenarios) {
    runListScenarios();
    return;
  }

  const baseState = resolveCliScenarioState(opts.scenarioFile);

  if (opts.mode === CliMode.GrossToNet) {
    const grossMonthly = normalizeCliGross(opts.gross, opts.period, baseState.husbandGross);
    const taxClassVal = opts.taxClass || TaxClass.IV;
    const breakdown = computeGrossToNetBreakdown(
      toGrossSalary(grossMonthly),
      taxClassVal,
      opts.childrenCount,
      opts.bonus ? toEuroAmount(opts.bonus) : undefined,
      undefined,
      createTaxRules(toFullCalendarYear(opts.startYear ?? baseState.startCalendarYear)),
      baseState.husbandPayrollOptions,
    );

    if (opts.format === CliOutputFormat.Json) {
      console.log(
        JSON.stringify({ ...breakdown,
          period: opts.period }, null, 2),
      );
    }
    else {
      printGrossToNetBreakdown(breakdown, opts.period);
    }
    return;
  }

  if (opts.mode === CliMode.SpousalNet) {
    const def = baseState;
    const hGrossMonthly = normalizeCliGross(opts.husbandGross, opts.period, def.husbandGross);
    const wGrossMonthly = normalizeCliGross(opts.wifeGross, opts.period, def.wifeGross);
    const wHours = opts.wifeHours ?? def.wifePostBirthHours;
    const spousal = deriveSpousalNetSalaries(
      toGrossSalary(hGrossMonthly),
      toGrossSalary(wGrossMonthly),
      toWorkingHours(wHours),
      toWorkingHours(def.wifeInitialHours),
      opts.childrenCount,
      createTaxRules(toFullCalendarYear(opts.startYear ?? def.startCalendarYear)),
      def.husbandPayrollOptions,
      def.wifePayrollOptions,
    );

    if (opts.format === CliOutputFormat.Json) {
      console.log(JSON.stringify({ ...spousal,
        period: opts.period }, null, 2));
    }
    else {
      printSpousalGrossToNetSet(spousal, opts.period);
    }
    return;
  }

  if (opts.explainMonth !== undefined) {
    const scenarioKey =
      opts.scenario === CliScenarioTarget.Compare
        ? ScenarioId.C
        : (opts.scenario as ScenarioId);
    const targetSim = buildSimulation(scenarioKey, opts, baseState);
    const bSim = buildSimulation(ScenarioId.B, opts, baseState);

    let monthIdx: number;
    if (typeof opts.explainMonth === "number") {
      monthIdx = opts.explainMonth - 1;
    }
    else {
      const q = String(opts.explainMonth).trim();
      monthIdx = targetSim.months.findIndex(
        (m) =>
          m.monthId.toLowerCase() === q.toLowerCase() ||
          m.monthRef.toLowerCase().startsWith(q.toLowerCase()) ||
          m.relativeMonthLabel.toLowerCase().startsWith(q.toLowerCase()) ||
          m.monthSimRef.toLowerCase() === q.toLowerCase() ||
          m.calendarLabel === q ||
          m.month === parseInt(q.replace(/^(?:Sim|M)/i, ""), 10),
      );
    }

    if (monthIdx < 0 || monthIdx >= targetSim.months.length) {
      console.error(
        `Error: Month "${opts.explainMonth}" is outside simulation duration (${targetSim.months.length} months).`,
      );
      process.exit(1);
    }

    const m = targetSim.months[monthIdx];
    const bMonth = bSim.months[monthIdx];

    if (opts.explainField) {
      const fieldExp = getFieldExplanation(
        opts.explainField,
        m,
        bMonth,
        scenarioKey,
      );
      if (opts.format === CliOutputFormat.Json) {
        console.log(
          JSON.stringify(
            {
              monthId: m.monthId,
              relativeMonthLabel: m.relativeMonthLabel,
              simulationMonth: m.month,
              calendarMonth: m.calendarLabel,
              scenario: scenarioKey,
              fieldKey: opts.explainField,
              explanation: fieldExp,
            },
            null,
            2,
          ),
        );
      }
      else {
        printFieldExplanation(fieldExp, m.month, scenarioKey, m);
      }
    }
    else {
      const rowExp = getRowExplanation(m, bMonth, scenarioKey);
      if (opts.format === CliOutputFormat.Json) {
        console.log(
          JSON.stringify(
            {
              monthId: m.monthId,
              relativeMonthLabel: m.relativeMonthLabel,
              simulationMonth: m.month,
              calendarMonth: m.calendarLabel,
              scenario: scenarioKey,
              rowExplanation: rowExp,
              monthDetails: m,
            },
            null,
            2,
          ),
        );
      }
      else {
        printMonthExplanation(rowExp, m, scenarioKey);
      }
    }
  }
  else if (opts.format === CliOutputFormat.Json) {
    const resA = buildSimulation(ScenarioId.A, opts, baseState);
    const resB = buildSimulation(ScenarioId.B, opts, baseState);
    const resC = buildSimulation(ScenarioId.C, opts, baseState);
    console.log(
      JSON.stringify(
        { options: opts,
          scenarioA: resA,
          scenarioB: resB,
          scenarioC: resC },
        null,
        2,
      ),
    );
  }
  else {
    const resA = buildSimulation(ScenarioId.A, opts, baseState);
    const resB = buildSimulation(ScenarioId.B, opts, baseState);
    const resC = buildSimulation(ScenarioId.C, opts, baseState);

    printSummaryScorecard(resA, resB, resC);

    if (opts.format === CliOutputFormat.Milestones) {
      printMilestones(resC);
    }
    else if (opts.format === CliOutputFormat.Table) {
      const target =
        opts.scenario === CliScenarioTarget.A
          ? resA
          : opts.scenario === CliScenarioTarget.B
            ? resB
            : resC;
      printLedgerTable(
        target,
        opts.scenario === CliScenarioTarget.Compare ||
          opts.scenario === CliScenarioTarget.C
          ? resB
          : undefined,
      );
    }
  }
}

function printLedgerTable(res: SimulationResult, resB?: SimulationResult) {
  console.log(
    `\n${BOLD}Simulation Ledger: ${res.scenarioKey === ScenarioId.C ? "Scenario C (Optimized Tax Classes)" : `Scenario ${res.scenarioKey}`}${RESET}`,
  );
  console.log(
    `${DIM}All amounts in EUR (€). Colored diffs indicate variance against Scenario B baseline.${RESET}\n`,
  );

  const header =
    "| Rel. Month (monthRef)    | Month ID  | Sim Ref | Calendar | Phase & Milestone              | Classes     | Husband Net | Wife Net  | M-Schutz | Elterngeld | Kindergeld | Bonuses | Tax Return | Monthly Total | Cum. Total |";
  const sep =
    "|--------------------------|-----------|---------|----------|--------------------------------|-------------|-------------|-----------|----------|------------|------------|---------|------------|---------------|------------|";

  console.log(header);
  console.log(sep);

  res.months.forEach((m, idx) => {
    const bMonth = resB?.months[idx];
    const diffTotal = bMonth ? m.monthlyTotal - bMonth.monthlyTotal : 0;
    const diffStr =
      bMonth && diffTotal !== 0
        ? ` (${diffTotal > 0 ? "+" : ""}${diffTotal}€)`
        : "";

    // Print Action Milestone Rows immediately BEFORE Month m
    if (m.startingActions && m.startingActions.length > 0) {
      m.startingActions.forEach((act) => {
        const isDelivery = act.type === ActionType.ChildDelivery;
        const isPregnancy = act.type === ActionType.PregnancyPositive;
        const isTaxRevert = act.type === ActionType.TaxClassSwitchRevert;
        const isTaxSwitch = act.category === ActionCategory.TaxSwitch;
        const isReallocation = act.type === ActionType.ElterngeldReallocation;

        const color = isDelivery
          ? CYAN
          : isPregnancy
            ? MAGENTA
            : isTaxRevert
              ? BLUE
              : isTaxSwitch
                ? BLUE
                : isReallocation
                  ? GREEN
                  : YELLOW;
        const cleanTitle = act.title.replace(/^ACTION:\s*/, "");
        const actTitle = `↳ ${cleanTitle}`;

        const actRow = [
          (act.relativeMonthLabel || act.monthRef || m.relativeMonthLabel || "")
            .slice(0, 24)
            .padEnd(24),
          (act.monthId || m.monthId).padEnd(9),
          (act.monthSimRef || m.monthSimRef || toMonthSimRef(m.month)).padEnd(
            7,
          ),
          m.calendarLabel.padEnd(8),
          `${color}${actTitle.slice(0, 30)}${RESET}`.padEnd(
            30 + color.length + RESET.length,
          ),
          (act.taxClassLabel || "—").slice(0, 11).padEnd(11),
          "—".padStart(11),
          "—".padStart(9),
          "—".padStart(8),
          "—".padStart(10),
          "—".padStart(10),
          "—".padStart(7),
          "—".padStart(10),
          "—".padStart(15),
          "—".padStart(10),
        ].join(" | ");
        console.log(`| ${actRow} |`);
      });
    }

    // Print Special Fiscal Event Rows immediately BEFORE Month m
    if (m.specialEvents && m.specialEvents.length > 0) {
      const prevMonthIdx = m.month - 2;
      const prevCum =
        prevMonthIdx >= 0 ? res.months[prevMonthIdx]?.cumulatedTotal || 0 : 0;
      const bPrevCum =
        prevMonthIdx >= 0 && resB
          ? resB.months[prevMonthIdx]?.cumulatedTotal || 0
          : 0;

      m.specialEvents.forEach((ev, evIdx) => {
        const isBonus = (ev.type as string).startsWith("bonus");
        const isCost = ev.amount < 0;
        const color = isCost ? RED : isBonus ? YELLOW : CYAN;
        const evTitle = `↳ ${ev.category}: ${ev.title}`;

        const priorEventsSum = m.specialEvents
          .slice(0, evIdx)
          .reduce((acc, it) => acc + it.amount, 0);
        const evCumulated = prevCum + priorEventsSum + ev.amount;

        const bEvents = bMonth?.specialEvents || [];
        const bMatchIdx = bEvents.findIndex(
          (it) =>
            it.eventId === ev.eventId ||
            it.title === ev.title ||
            it.type === ev.type,
        );
        const bPriorSum =
          bMatchIdx >= 0
            ? bEvents
              .slice(0, bMatchIdx + 1)
              .reduce((acc, it) => acc + it.amount, 0)
            : 0;
        const bEvCumulated = bPrevCum + bPriorSum;
        const diffEvCumulated = resB ? evCumulated - bEvCumulated : 0;
        const diffCumStr =
          resB && diffEvCumulated !== 0
            ? ` (${diffEvCumulated > 0 ? "+" : ""}${diffEvCumulated}€)`
            : "";

        const evRow = [
          (ev.relativeMonthLabel || ev.monthRef || m.relativeMonthLabel || "")
            .slice(0, 24)
            .padEnd(24),
          (ev.monthId || m.monthId).padEnd(9),
          (ev.monthSimRef || m.monthSimRef || toMonthSimRef(m.month)).padEnd(7),
          ev.calendarLabel.padEnd(8),
          `${color}${evTitle.slice(0, 30)}${RESET}`.padEnd(
            30 + color.length + RESET.length,
          ),
          (ev.taxClassLabel || "—").slice(0, 11).padEnd(11),
          "—".padStart(11),
          "—".padStart(9),
          "—".padStart(8),
          "—".padStart(10),
          "—".padStart(10),
          isBonus ? String(ev.amount).padStart(7) : "—".padStart(7),
          !isBonus && !isCost
            ? String(ev.amount).padStart(10)
            : isCost
              ? String(ev.amount).padStart(10)
              : "—".padStart(10),
          `${String(ev.amount).padStart(7)}${"".padStart(8)}`,
          `${String(evCumulated).padStart(7)}${diffCumStr.padStart(3)}`,
        ].join(" | ");
        console.log(`| ${evRow} |`);
      });
    }

    const row = [
      (m.monthRef || m.relativeMonthLabel || m.relativeBirthLabel || "")
        .slice(0, 24)
        .padEnd(24),
      m.monthId.padEnd(9),
      m.monthSimRef.padEnd(7),
      m.calendarLabel.padEnd(8),
      m.phaseLabel.slice(0, 30).padEnd(30),
      m.taxClassLabel.slice(0, 11).padEnd(11),
      String(m.husbandSalary).padStart(11),
      String(m.wifeSalary).padStart(9),
      String(m.mutterschutz).padStart(8),
      String(m.wifeElterngeld + m.husbandElterngeld).padStart(10),
      String(m.kindergeld).padStart(10),
      String(m.specialBonusTotal).padStart(7),
      String(m.taxRefund).padStart(10),
      `${String(m.monthlyTotal).padStart(7)}${diffStr.padStart(8)}`,
      String(m.cumulatedTotal).padStart(10),
    ].join(" | ");

    console.log(`| ${row} |`);
  });

  console.log(`${sep}\n`);
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
    process.argv[1].endsWith("runner.ts") ||
    process.argv[1].endsWith("runner.js")),
);

if (isDirectRun) {
  runCli(process.argv.slice(2));
}
