import {
  type Brand,
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  closingCashBalance,
} from "#engine/lifeProfile/cashFlowFormula";

export type FundingAccountId = Brand<string, "FundingAccountId">;
export type ExpenseItemId = Brand<string, "ExpenseItemId">;

export function toFundingAccountId(value: string): FundingAccountId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Funding account ID must not be empty or contain surrounding whitespace.");
  }
  return value as FundingAccountId;
}

export function toExpenseItemId(value: string): ExpenseItemId {
  if (!value || value.trim() !== value) {
    throw new TypeError("Expense item ID must not be empty or contain surrounding whitespace.");
  }
  return value as ExpenseItemId;
}

export const ExpenseCategory = {
  Housing: "housing",
  Groceries: "groceries",
  Utilities: "utilities",
  Transport: "transport",
  Childcare: "childcare",
  Insurance: "insurance",
  Debt: "debt",
  Discretionary: "discretionary",
  Savings: "savings",
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export function toExpenseCategory(value: string): ExpenseCategory {
  if (!Object.values(ExpenseCategory).includes(value as ExpenseCategory)) {
    throw new TypeError("Invalid expense category.");
  }
  return value as ExpenseCategory;
}

export const ExpenseCadence = {
  Monthly: "monthly",
  Quarterly: "quarterly",
  Yearly: "yearly",
} as const;
export type ExpenseCadence = (typeof ExpenseCadence)[keyof typeof ExpenseCadence];

export function toExpenseCadence(value: string): ExpenseCadence {
  if (!Object.values(ExpenseCadence).includes(value as ExpenseCadence)) {
    throw new TypeError("Invalid expense cadence.");
  }
  return value as ExpenseCadence;
}

export interface FundingAccount {
  readonly id: FundingAccountId;
  readonly name: string;
  readonly monthlyInflowCents: EuroCents;
  readonly openingBalanceCents: EuroCents;
}

export interface ExpenseLineItem {
  readonly id: ExpenseItemId;
  readonly title: string;
  readonly category: ExpenseCategory;
  readonly tags: readonly string[];
  readonly accountId: FundingAccountId;
  readonly amountCents: EuroCents;
  readonly cadence: ExpenseCadence;
  readonly essential: boolean;
}

export interface SustainabilityScenarioInput {
  readonly label: string;
  /** Percentage of base monthly inflows (e.g. 100 = baseline, 75 = -25% income). */
  readonly incomePercent: number;
  /** Percentage of base monthly expenses (e.g. 100 = baseline, 115 = +15% higher costs). */
  readonly costPercent: number;
  /** If true, drops non-essential (discretionary) items to model emergency belt-tightening. */
  readonly essentialOnly: boolean;
  readonly horizonMonths: number;
}

export interface CategoryTotal {
  readonly category: ExpenseCategory;
  readonly monthlyCents: EuroCents;
  readonly sharePercent: number;
}

export interface TagTotal {
  readonly tag: string;
  readonly monthlyCents: EuroCents;
  readonly itemCount: number;
}

export interface AccountFundingStatus {
  readonly accountId: FundingAccountId;
  readonly accountName: string;
  readonly openingBalanceCents: EuroCents;
  readonly monthlyInflowCents: EuroCents;
  readonly monthlyExpensesCents: EuroCents;
  readonly monthlyNetCents: EuroCents;
  readonly fundedByInflow: boolean;
  readonly closingBalanceAfter12MonthsCents: EuroCents;
  readonly firstShortfallMonth?: number;
}

export interface SustainabilityScenarioResult {
  readonly label: string;
  readonly monthlyInflowCents: EuroCents;
  readonly monthlyExpenseCents: EuroCents;
  readonly monthlyNetCents: EuroCents;
  readonly endingBalanceCents: EuroCents;
  readonly solventMonths: number;
  readonly firstShortfallMonth?: number;
  readonly sustainable: boolean;
}

export interface ExpensePlanEvaluation {
  readonly totalMonthlyInflowCents: EuroCents;
  readonly totalOpeningBalanceCents: EuroCents;
  readonly totalMonthlyExpensesCents: EuroCents;
  readonly essentialMonthlyCents: EuroCents;
  readonly discretionaryMonthlyCents: EuroCents;
  readonly monthlyNetSurplusCents: EuroCents;
  readonly savingsRatePercent?: number;
  readonly categoryTotals: readonly CategoryTotal[];
  readonly tagTotals: readonly TagTotal[];
  readonly accountStatuses: readonly AccountFundingStatus[];
  readonly unallocatedExpenseCents: EuroCents;
  readonly scenarios: readonly SustainabilityScenarioResult[];
}

/** Converts a monthly, quarterly or yearly expense amount into its rounded monthly integer cent equivalent. */
export function monthlyEquivalentCents(amountCents: EuroCents, cadence: ExpenseCadence): EuroCents {
  if (amountCents < 0 || !Number.isSafeInteger(amountCents)) {
    throw new RangeError("Expense amount must be non-negative integer euro cents.");
  }
  if (cadence === ExpenseCadence.Quarterly) {
    return toEuroCents(Math.round(amountCents / 3));
  }
  if (cadence === ExpenseCadence.Yearly) {
    return toEuroCents(Math.round(amountCents / 12));
  }
  return amountCents;
}

function simulateBalanceHorizon(
  openingCents: EuroCents,
  monthlyInflowCents: EuroCents,
  monthlyExpenseCents: EuroCents,
  months: number,
): {
  readonly endingBalanceCents: EuroCents;
  readonly solventMonths: number;
  readonly firstShortfallMonth?: number;
} {
  let balance = openingCents;
  let firstShortfallMonth: number | undefined;
  for (let m = 1; m <= months; m++) {
    balance = closingCashBalance(balance, monthlyInflowCents, monthlyExpenseCents);
    if (firstShortfallMonth === undefined && balance < 0) {
      firstShortfallMonth = m;
    }
  }
  return {
    endingBalanceCents: balance,
    solventMonths: firstShortfallMonth === undefined ? months : firstShortfallMonth - 1,
    ...(firstShortfallMonth !== undefined ? { firstShortfallMonth } : {}),
  };
}

/**
 * Standalone pure evaluator for categorized & tagged household expenses, account-level funding
 * and sustainability stress scenarios. Works completely independently of Life Profile.
 */
export function evaluateExpensePlan(input: {
  readonly accounts: readonly FundingAccount[];
  readonly items: readonly ExpenseLineItem[];
  readonly scenarios: readonly SustainabilityScenarioInput[];
}): ExpensePlanEvaluation {
  const accountMap = new Map<FundingAccountId, FundingAccount>();
  let totalInflow = 0;
  let totalOpening = 0;
  for (const account of input.accounts) {
    accountMap.set(account.id, account);
    totalInflow += account.monthlyInflowCents;
    totalOpening += account.openingBalanceCents;
  }

  const byCategory = new Map<ExpenseCategory, number>();
  const byTag = new Map<string, { cents: number;
    count: number }>();
  const byAccount = new Map<FundingAccountId, number>();

  let totalExpenses = 0;
  let essentialTotal = 0;
  let discretionaryTotal = 0;
  let unallocated = 0;

  for (const item of input.items) {
    const monthly = monthlyEquivalentCents(item.amountCents, item.cadence);
    totalExpenses += monthly;
    if (item.essential) {
      essentialTotal += monthly;
    }
    else {
      discretionaryTotal += monthly;
    }
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + monthly);

    const uniqueTags = new Set(item.tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0));
    for (const tag of uniqueTags) {
      const prev = byTag.get(tag) ?? { cents: 0,
        count: 0 };
      byTag.set(tag, {
        cents: prev.cents + monthly,
        count: prev.count + 1,
      });
    }

    if (accountMap.has(item.accountId)) {
      byAccount.set(item.accountId, (byAccount.get(item.accountId) ?? 0) + monthly);
    }
    else {
      unallocated += monthly;
    }
  }

  const categoryTotals: CategoryTotal[] = [...byCategory.entries()]
    .map(([category, cents]) => Object.freeze({
      category,
      monthlyCents: toEuroCents(cents),
      sharePercent: totalExpenses > 0 ? Math.round((cents / totalExpenses) * 1000) / 10 : 0,
    }))
    .sort((left, right) => right.monthlyCents - left.monthlyCents);

  const tagTotals: TagTotal[] = [...byTag.entries()]
    .map(([tag, info]) => Object.freeze({
      tag,
      monthlyCents: toEuroCents(info.cents),
      itemCount: info.count,
    }))
    .sort((left, right) => right.monthlyCents - left.monthlyCents || left.tag.localeCompare(right.tag));

  const accountStatuses: AccountFundingStatus[] = input.accounts.map((account) => {
    const expenses = toEuroCents(byAccount.get(account.id) ?? 0);
    const monthlyNet = toEuroCents(account.monthlyInflowCents - expenses);
    const sim = simulateBalanceHorizon(account.openingBalanceCents, account.monthlyInflowCents, expenses, 12);
    return Object.freeze({
      accountId: account.id,
      accountName: account.name,
      openingBalanceCents: account.openingBalanceCents,
      monthlyInflowCents: account.monthlyInflowCents,
      monthlyExpensesCents: expenses,
      monthlyNetCents: monthlyNet,
      fundedByInflow: monthlyNet >= 0,
      closingBalanceAfter12MonthsCents: sim.endingBalanceCents,
      ...(sim.firstShortfallMonth !== undefined ? { firstShortfallMonth: sim.firstShortfallMonth } : {}),
    });
  });

  const scenarios: SustainabilityScenarioResult[] = input.scenarios.map((scenario) => {
    const horizon = Math.max(1, Math.min(60, Math.round(scenario.horizonMonths)));
    const stressedInflow = toEuroCents(Math.max(0, Math.round((totalInflow * scenario.incomePercent) / 100)));
    const baseCost = scenario.essentialOnly ? essentialTotal : totalExpenses;
    const stressedExpense = toEuroCents(Math.max(0, Math.round((baseCost * scenario.costPercent) / 100)));
    const monthlyNet = toEuroCents(stressedInflow - stressedExpense);
    const sim = simulateBalanceHorizon(toEuroCents(totalOpening), stressedInflow, stressedExpense, horizon);
    return Object.freeze({
      label: scenario.label,
      monthlyInflowCents: stressedInflow,
      monthlyExpenseCents: stressedExpense,
      monthlyNetCents: monthlyNet,
      endingBalanceCents: sim.endingBalanceCents,
      solventMonths: sim.solventMonths,
      ...(sim.firstShortfallMonth !== undefined ? { firstShortfallMonth: sim.firstShortfallMonth } : {}),
      sustainable: monthlyNet >= 0 && sim.firstShortfallMonth === undefined,
    });
  });

  const monthlyNetSurplusCents = toEuroCents(totalInflow - totalExpenses);
  const savingsRatePercent = totalInflow > 0
    ? Math.round((monthlyNetSurplusCents / totalInflow) * 1000) / 10
    : undefined;

  return Object.freeze({
    totalMonthlyInflowCents: toEuroCents(totalInflow),
    totalOpeningBalanceCents: toEuroCents(totalOpening),
    totalMonthlyExpensesCents: toEuroCents(totalExpenses),
    essentialMonthlyCents: toEuroCents(essentialTotal),
    discretionaryMonthlyCents: toEuroCents(discretionaryTotal),
    monthlyNetSurplusCents,
    ...(savingsRatePercent !== undefined ? { savingsRatePercent } : {}),
    categoryTotals: Object.freeze(categoryTotals),
    tagTotals: Object.freeze(tagTotals),
    accountStatuses: Object.freeze(accountStatuses),
    unallocatedExpenseCents: toEuroCents(unallocated),
    scenarios: Object.freeze(scenarios),
  });
}
