import {
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  type ExpenseLineItem,
  type ExpensePlanEvaluation,
  type FundingAccount,
  type FundingAccountId,
  type SustainabilityScenarioInput,
  ExpenseCadence,
  ExpenseCategory,
  evaluateExpensePlan,
  toExpenseCadence,
  toExpenseCategory,
  toExpenseItemId,
  toFundingAccountId,
} from "#/apps/expense-planner/expensePlannerEngine.ts";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  toEuroCents,
} from "#engine/types";

export interface ExpensePlannerState {
  readonly version: 1;
  readonly accounts: readonly FundingAccount[];
  readonly items: readonly ExpenseLineItem[];
  readonly customIncomePercent: number;
  readonly customCostPercent: number;
  readonly customHorizonMonths: number;
}

export interface ExpensePlannerExportDocument {
  readonly app: typeof AppId.ExpensePlanner;
  readonly version: 1;
  readonly state: ExpensePlannerState;
}

const STORAGE_FIELD = "state";
const expenseStorage = browserAppStorage(AppId.ExpensePlanner);

const DEFAULT_JOINT_ACCOUNT_ID = toFundingAccountId("account-household");
const DEFAULT_RESERVE_ACCOUNT_ID = toFundingAccountId("account-personal");

export function createDefaultExpensePlannerState(): ExpensePlannerState {
  return Object.freeze({
    version: 1,
    accounts: Object.freeze([
      Object.freeze({
        id: DEFAULT_JOINT_ACCOUNT_ID,
        name: "Main Household Account",
        monthlyInflowCents: toEuroCents(360000),
        openingBalanceCents: toEuroCents(600000),
      }),
      Object.freeze({
        id: DEFAULT_RESERVE_ACCOUNT_ID,
        name: "Personal & Flexible Account",
        monthlyInflowCents: toEuroCents(80000),
        openingBalanceCents: toEuroCents(200000),
      }),
    ]),
    items: Object.freeze([
      Object.freeze({
        id: toExpenseItemId("item-rent"),
        title: "Warm rent (Warmmiete)",
        category: ExpenseCategory.Housing,
        tags: Object.freeze(["fixed", "housing"]),
        accountId: DEFAULT_JOINT_ACCOUNT_ID,
        amountCents: toEuroCents(145000),
        cadence: ExpenseCadence.Monthly,
        essential: true,
      }),
      Object.freeze({
        id: toExpenseItemId("item-groceries"),
        title: "Groceries & household supplies",
        category: ExpenseCategory.Groceries,
        tags: Object.freeze(["essential", "weekly"]),
        accountId: DEFAULT_JOINT_ACCOUNT_ID,
        amountCents: toEuroCents(55000),
        cadence: ExpenseCadence.Monthly,
        essential: true,
      }),
      Object.freeze({
        id: toExpenseItemId("item-utilities"),
        title: "Electricity, internet & Rundfunkbeitrag",
        category: ExpenseCategory.Utilities,
        tags: Object.freeze(["fixed", "utilities"]),
        accountId: DEFAULT_JOINT_ACCOUNT_ID,
        amountCents: toEuroCents(18000),
        cadence: ExpenseCadence.Monthly,
        essential: true,
      }),
      Object.freeze({
        id: toExpenseItemId("item-insurance"),
        title: "Liability & household insurance",
        category: ExpenseCategory.Insurance,
        tags: Object.freeze(["fixed", "annual"]),
        accountId: DEFAULT_JOINT_ACCOUNT_ID,
        amountCents: toEuroCents(36000),
        cadence: ExpenseCadence.Yearly,
        essential: true,
      }),
      Object.freeze({
        id: toExpenseItemId("item-discretionary"),
        title: "Dining, culture & leisure",
        category: ExpenseCategory.Discretionary,
        tags: Object.freeze(["flexible", "lifestyle"]),
        accountId: DEFAULT_RESERVE_ACCOUNT_ID,
        amountCents: toEuroCents(45000),
        cadence: ExpenseCadence.Monthly,
        essential: false,
      }),
    ]),
    customIncomePercent: 75,
    customCostPercent: 115,
    customHorizonMonths: 12,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseExpensePlannerState(raw: unknown): ExpensePlannerState {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.accounts) || !Array.isArray(raw.items)) {
    throw new TypeError("Invalid Household Expense Planner state.");
  }
  const accounts: FundingAccount[] = raw.accounts.map((entry) => {
    if (!isRecord(entry)
      || typeof entry.id !== "string"
      || typeof entry.name !== "string" || !entry.name.trim()
      || typeof entry.monthlyInflowCents !== "number" || !Number.isSafeInteger(entry.monthlyInflowCents) || entry.monthlyInflowCents < 0
      || typeof entry.openingBalanceCents !== "number" || !Number.isSafeInteger(entry.openingBalanceCents)) {
      throw new TypeError("Invalid funding account entry.");
    }
    return Object.freeze({
      id: toFundingAccountId(entry.id),
      name: entry.name.trim(),
      monthlyInflowCents: toEuroCents(entry.monthlyInflowCents),
      openingBalanceCents: toEuroCents(entry.openingBalanceCents),
    });
  });

  const items: ExpenseLineItem[] = raw.items.map((entry) => {
    if (!isRecord(entry)
      || typeof entry.id !== "string"
      || typeof entry.title !== "string" || !entry.title.trim()
      || typeof entry.category !== "string"
      || !Array.isArray(entry.tags) || entry.tags.some((t) => typeof t !== "string")
      || typeof entry.accountId !== "string"
      || typeof entry.amountCents !== "number" || !Number.isSafeInteger(entry.amountCents) || entry.amountCents < 0
      || typeof entry.cadence !== "string"
      || typeof entry.essential !== "boolean") {
      throw new TypeError("Invalid expense line item.");
    }
    return Object.freeze({
      id: toExpenseItemId(entry.id),
      title: entry.title.trim(),
      category: toExpenseCategory(entry.category),
      tags: Object.freeze((entry.tags as string[]).map((t) => t.trim()).filter((t) => t.length > 0)),
      accountId: toFundingAccountId(entry.accountId),
      amountCents: toEuroCents(entry.amountCents),
      cadence: toExpenseCadence(entry.cadence),
      essential: entry.essential,
    });
  });

  const customIncomePercent = typeof raw.customIncomePercent === "number" && Number.isFinite(raw.customIncomePercent)
    ? Math.max(0, Math.min(200, Math.round(raw.customIncomePercent)))
    : 75;
  const customCostPercent = typeof raw.customCostPercent === "number" && Number.isFinite(raw.customCostPercent)
    ? Math.max(50, Math.min(300, Math.round(raw.customCostPercent)))
    : 115;
  const customHorizonMonths = typeof raw.customHorizonMonths === "number" && Number.isFinite(raw.customHorizonMonths)
    ? Math.max(1, Math.min(60, Math.round(raw.customHorizonMonths)))
    : 12;

  return Object.freeze({
    version: 1,
    accounts: Object.freeze(accounts),
    items: Object.freeze(items),
    customIncomePercent,
    customCostPercent,
    customHorizonMonths,
  });
}

function loadExpensePlannerState(): ExpensePlannerState {
  const raw = expenseStorage.getItem(STORAGE_FIELD);
  if (!raw) {
    return createDefaultExpensePlannerState();
  }
  try {
    return parseExpensePlannerState(JSON.parse(raw));
  }
  catch {
    return createDefaultExpensePlannerState();
  }
}

function persistState(next: ExpensePlannerState): void {
  expensePlannerState.value = next;
  expenseStorage.setItem(STORAGE_FIELD, JSON.stringify(next));
}

export const DEFAULT_EXPENSE_PLANNER_STATE = createDefaultExpensePlannerState();
export const expensePlannerState = signal<ExpensePlannerState>(loadExpensePlannerState());

export function buildScenariosForState(state: ExpensePlannerState): readonly SustainabilityScenarioInput[] {
  return Object.freeze([
    {
      label: "Current baseline",
      incomePercent: 100,
      costPercent: 100,
      essentialOnly: false,
      horizonMonths: state.customHorizonMonths,
    },
    {
      label: `Reduced income (${state.customIncomePercent}%)`,
      incomePercent: state.customIncomePercent,
      costPercent: 100,
      essentialOnly: false,
      horizonMonths: state.customHorizonMonths,
    },
    {
      label: `Higher costs (${state.customCostPercent}%)`,
      incomePercent: 100,
      costPercent: state.customCostPercent,
      essentialOnly: false,
      horizonMonths: state.customHorizonMonths,
    },
    {
      label: `Combined shock (${state.customIncomePercent}% income, ${state.customCostPercent}% costs)`,
      incomePercent: state.customIncomePercent,
      costPercent: state.customCostPercent,
      essentialOnly: false,
      horizonMonths: state.customHorizonMonths,
    },
    {
      label: `Emergency essentials-only (${state.customIncomePercent}% income)`,
      incomePercent: state.customIncomePercent,
      costPercent: 100,
      essentialOnly: true,
      horizonMonths: state.customHorizonMonths,
    },
  ]);
}

export const DEFAULT_EXPENSE_PLAN_EVALUATION: ExpensePlanEvaluation = evaluateExpensePlan({
  accounts: DEFAULT_EXPENSE_PLANNER_STATE.accounts,
  items: DEFAULT_EXPENSE_PLANNER_STATE.items,
  scenarios: buildScenariosForState(DEFAULT_EXPENSE_PLANNER_STATE),
});

export const expensePlanEvaluation = computed<ExpensePlanEvaluation>(() => {
  const state = expensePlannerState.value;
  return evaluateExpensePlan({
    accounts: state.accounts,
    items: state.items,
    scenarios: buildScenariosForState(state),
  });
});

export function addFundingAccount(account: FundingAccount): void {
  const state = expensePlannerState.value;
  persistState(parseExpensePlannerState({
    ...state,
    accounts: [...state.accounts, account],
  }));
}

export function removeFundingAccount(accountId: FundingAccountId): void {
  const state = expensePlannerState.value;
  const remaining = state.accounts.filter((acc) => acc.id !== accountId);
  if (remaining.length === 0) {
    return;
  }
  const fallbackId = remaining[0].id;
  const reassignedItems = state.items.map((item) => item.accountId === accountId
    ? { ...item,
      accountId: fallbackId }
    : item);
  persistState(parseExpensePlannerState({
    ...state,
    accounts: remaining,
    items: reassignedItems,
  }));
}

export function addExpenseItem(item: ExpenseLineItem): void {
  const state = expensePlannerState.value;
  persistState(parseExpensePlannerState({
    ...state,
    items: [...state.items, item],
  }));
}

export function removeExpenseItem(itemId: string): void {
  const state = expensePlannerState.value;
  persistState(parseExpensePlannerState({
    ...state,
    items: state.items.filter((item) => item.id !== itemId),
  }));
}

export function updateStressControls(patch: {
  readonly customIncomePercent?: number;
  readonly customCostPercent?: number;
  readonly customHorizonMonths?: number;
}): void {
  const state = expensePlannerState.value;
  persistState(parseExpensePlannerState({
    ...state,
    ...patch,
  }));
}

export function exportExpensePlannerJson(): string {
  const doc: ExpensePlannerExportDocument = {
    app: AppId.ExpensePlanner,
    version: 1,
    state: expensePlannerState.value,
  };
  return JSON.stringify(doc, null, 2);
}

export function importExpensePlannerJson(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.app !== AppId.ExpensePlanner || parsed.version !== 1) {
      return false;
    }
    const next = parseExpensePlannerState(parsed.state);
    persistState(next);
    return true;
  }
  catch {
    return false;
  }
}

export function resetExpensePlanner(): void {
  const defaults = createDefaultExpensePlannerState();
  expensePlannerState.value = defaults;
  expenseStorage.removeItem(STORAGE_FIELD);
}
