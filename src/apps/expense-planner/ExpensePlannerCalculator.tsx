import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";


import {
  ExpenseCadence,
  ExpenseCategory,
  monthlyEquivalentCents,
  toExpenseCadence,
  toExpenseCategory,
  toExpenseItemId,
  toFundingAccountId,
} from "#/apps/expense-planner/expensePlannerEngine.ts";
import {
  DEFAULT_EXPENSE_PLAN_EVALUATION,
  DEFAULT_EXPENSE_PLANNER_STATE,
  addExpenseItem,
  addFundingAccount,
  expensePlanEvaluation,
  expensePlannerState,
  exportExpensePlannerJson,
  importExpensePlannerJson,
  removeExpenseItem,
  removeFundingAccount,
  resetExpensePlanner,
  updateStressControls,
} from "#/apps/expense-planner/expensePlannerStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";


import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  parseAmount,
} from "#engine/lifeProfile/cashAmount";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export default function ExpensePlannerCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? expensePlannerState.value : DEFAULT_EXPENSE_PLANNER_STATE;
  const evaluation = hydrated ? expensePlanEvaluation.value : DEFAULT_EXPENSE_PLAN_EVALUATION;

  // Add account state
  const [accountName, setAccountName] = useState("");
  const [accountInflowEur, setAccountInflowEur] = useState("");
  const [accountOpeningEur, setAccountOpeningEur] = useState("0");

  // Add expense item state
  const [itemTitle, setItemTitle] = useState("");
  const [itemCategory, setItemCategory] = useState<ExpenseCategory>(ExpenseCategory.Housing);
  const [itemTagsText, setItemTagsText] = useState("");
  const [itemAccountId, setItemAccountId] = useState<string>(state.accounts[0]?.id ?? "");
  const [itemAmountEur, setItemAmountEur] = useState("");
  const [itemCadence, setItemCadence] = useState<ExpenseCadence>(ExpenseCadence.Monthly);
  const [itemEssential, setItemEssential] = useState(true);

  // Filter & JSON transfer state
  const [tagFilter, setTagFilter] = useState("");
  const [importText, setImportText] = useState("");
  const [transferNotice, setTransferNotice] = useState("");
  const [formError, setFormError] = useState("");

  const activeAccountId = state.accounts.some((acc) => acc.id === itemAccountId)
    ? itemAccountId
    : state.accounts[0]?.id ?? "";

  function handleAddAccount(event: JSX.TargetedEvent<HTMLFormElement, Event>): void {
    event.preventDefault();
    try {
      if (!accountName.trim()) {
        throw new TypeError("Enter an account name.");
      }
      const inflow = parseAmount(accountInflowEur || "0", true);
      const opening = parseAmount(accountOpeningEur || "0", true);
      if (inflow === undefined || opening === undefined) {
        throw new TypeError("Enter valid euro amounts for the account.");
      }
      addFundingAccount({
        id: toFundingAccountId(crypto.randomUUID()),
        name: accountName.trim(),
        monthlyInflowCents: inflow,
        openingBalanceCents: opening,
      });
      setAccountName("");
      setAccountInflowEur("");
      setAccountOpeningEur("0");
      setFormError("");
    }
    catch (err) {
      setFormError(err instanceof Error ? err.message : "Check funding account details.");
    }
  }

  function handleAddExpense(event: JSX.TargetedEvent<HTMLFormElement, Event>): void {
    event.preventDefault();
    try {
      if (!itemTitle.trim() || !activeAccountId) {
        throw new TypeError("Enter an expense title and select a funding account.");
      }
      const amountCents = parseAmount(itemAmountEur, false);
      if (amountCents === undefined) {
        throw new TypeError("Enter a positive expense amount.");
      }
      const tags = itemTagsText
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      addExpenseItem({
        id: toExpenseItemId(crypto.randomUUID()),
        title: itemTitle.trim(),
        category: itemCategory,
        tags,
        accountId: toFundingAccountId(activeAccountId),
        amountCents,
        cadence: itemCadence,
        essential: itemEssential,
      });
      setItemTitle("");
      setItemTagsText("");
      setItemAmountEur("");
      setFormError("");
    }
    catch (err) {
      setFormError(err instanceof Error ? err.message : "Check expense details and amount.");
    }
  }

  const normalizedFilter = tagFilter.trim().toLowerCase();
  const visibleItems = normalizedFilter
    ? state.items.filter((item) => item.tags.some((t) => t.toLowerCase().includes(normalizedFilter))
      || item.category.toLowerCase().includes(normalizedFilter)
      || item.title.toLowerCase().includes(normalizedFilter))
    : state.items;

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Standalone Utility · Demo"
        title="Household Expense Planner"
        subtitle="Categorize and tag recurring expenses, check per-account funding coverage, and stress-test income drops or cost increases. Works completely offline without a Life Profile."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={resetExpensePlanner}>Reset to sample budget</button>}
      />

      {formError && <p role="alert">{formError}</p>}

      <section className="domain-calc-metrics" aria-label="Monthly household budget summary">
        <MetricCard
          label="Monthly Inflows"
          value={formatIntegerEuroCents(evaluation.totalMonthlyInflowCents)}
          subtitle={`Across ${state.accounts.length} funding account(s)`}
        />
        <MetricCard
          label="Monthly Expenses"
          value={formatIntegerEuroCents(evaluation.totalMonthlyExpensesCents)}
          subtitle={`Essential: ${formatIntegerEuroCents(evaluation.essentialMonthlyCents)} · Flexible: ${formatIntegerEuroCents(evaluation.discretionaryMonthlyCents)}`}
        />
        <MetricCard
          label="Monthly Net Surplus"
          value={formatIntegerEuroCents(evaluation.monthlyNetSurplusCents)}
          tone={evaluation.monthlyNetSurplusCents >= 0 ? MetricTone.Gain : MetricTone.Loss}
          subtitle={evaluation.savingsRatePercent !== undefined ? `Savings rate: ${evaluation.savingsRatePercent}%` : "Add inflows to compute savings rate"}
        />
        <MetricCard
          label="Combined Opening Buffer"
          value={formatIntegerEuroCents(evaluation.totalOpeningBalanceCents)}
          subtitle="Starting liquid balance across accounts"
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="accounts-heading">
        <h2 id="accounts-heading">1. Funding Accounts &amp; Coverage</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Opening balance</th>
                <th>Monthly inflow</th>
                <th>Allocated expenses</th>
                <th>Monthly net</th>
                <th>12-month closing</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.accountStatuses.map((acc) => <tr key={acc.accountId}>
                <th scope="row">{acc.accountName}</th>
                <td>{formatIntegerEuroCents(acc.openingBalanceCents)}</td>
                <td>{formatIntegerEuroCents(acc.monthlyInflowCents)}</td>
                <td>{formatIntegerEuroCents(acc.monthlyExpensesCents)}</td>
                <td>{formatIntegerEuroCents(acc.monthlyNetCents)}</td>
                <td>{formatIntegerEuroCents(acc.closingBalanceAfter12MonthsCents)}{acc.firstShortfallMonth ? ` (shortfall month ${acc.firstShortfallMonth})` : ""}</td>
                <td>
                  <button
                    type="button"
                    className="ui-btn ui-btn--sm"
                    disabled={state.accounts.length <= 1}
                    onClick={() => removeFundingAccount(acc.accountId)}
                  >
                    Remove
                  </button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <form className="life-people__form" onSubmit={handleAddAccount}>
          <label className="life-people__field">New account name
            <input required value={accountName} onInput={(e) => setAccountName(e.currentTarget.value)} placeholder="e.g. Family Savings" />
          </label>
          <label className="life-people__field">Monthly inflow (€)
            <input required type="number" min="0" step="0.01" value={accountInflowEur} onInput={(e) => setAccountInflowEur(e.currentTarget.value)} />
          </label>
          <label className="life-people__field">Opening balance (€)
            <input required type="number" step="0.01" value={accountOpeningEur} onInput={(e) => setAccountOpeningEur(e.currentTarget.value)} />
          </label>
          <button type="submit" className="ui-btn ui-btn--primary">Add account</button>
        </form>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="expenses-heading">
        <h2 id="expenses-heading">2. Categorized &amp; Tagged Expenses</h2>
        <div className="life-people__form">
          <label className="life-people__field">Filter by tag, category or title
            <input value={tagFilter} onInput={(e) => setTagFilter(e.currentTarget.value)} placeholder="e.g. fixed, housing, flexible" />
          </label>
        </div>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Tags</th>
                <th>Account</th>
                <th>Cadence</th>
                <th>Monthly eq.</th>
                <th>Priority</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const account = state.accounts.find((a) => a.id === item.accountId);
                return <tr key={item.id}>
                  <th scope="row">{item.title}</th>
                  <td>{item.category}</td>
                  <td>{item.tags.length > 0 ? item.tags.join(", ") : "—"}</td>
                  <td>{account?.name ?? "Unassigned"}</td>
                  <td>{formatIntegerEuroCents(item.amountCents)} / {item.cadence}</td>
                  <td>{formatIntegerEuroCents(monthlyEquivalentCents(item.amountCents, item.cadence))}</td>
                  <td>{item.essential ? "Essential" : "Flexible"}</td>
                  <td>
                    <button type="button" className="ui-btn ui-btn--sm" onClick={() => removeExpenseItem(item.id)}>Remove</button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <form className="life-people__form" onSubmit={handleAddExpense}>
          <label className="life-people__field">Expense title
            <input required value={itemTitle} onInput={(e) => setItemTitle(e.currentTarget.value)} placeholder="e.g. Deutschlandticket" />
          </label>
          <label className="life-people__field">Category
            <select value={itemCategory} onChange={(e) => setItemCategory(toExpenseCategory(e.currentTarget.value))}>
              <option value={ExpenseCategory.Housing}>Housing</option>
              <option value={ExpenseCategory.Groceries}>Groceries</option>
              <option value={ExpenseCategory.Utilities}>Utilities</option>
              <option value={ExpenseCategory.Transport}>Transport</option>
              <option value={ExpenseCategory.Childcare}>Childcare</option>
              <option value={ExpenseCategory.Insurance}>Insurance</option>
              <option value={ExpenseCategory.Debt}>Debt / Loans</option>
              <option value={ExpenseCategory.Discretionary}>Discretionary</option>
              <option value={ExpenseCategory.Savings}>Savings transfer</option>
            </select>
          </label>
          <label className="life-people__field">Tags (comma-separated)
            <input value={itemTagsText} onInput={(e) => setItemTagsText(e.currentTarget.value)} placeholder="e.g. fixed, commute" />
          </label>
          <label className="life-people__field">Funding account
            <select required value={activeAccountId} onChange={(e) => setItemAccountId(e.currentTarget.value)}>
              {state.accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </label>
          <label className="life-people__field">Amount (€)
            <input required type="number" min="0.01" step="0.01" value={itemAmountEur} onInput={(e) => setItemAmountEur(e.currentTarget.value)} />
          </label>
          <label className="life-people__field">Cadence
            <select value={itemCadence} onChange={(e) => setItemCadence(toExpenseCadence(e.currentTarget.value))}>
              <option value={ExpenseCadence.Monthly}>Monthly</option>
              <option value={ExpenseCadence.Quarterly}>Quarterly</option>
              <option value={ExpenseCadence.Yearly}>Yearly</option>
            </select>
          </label>
          <label><input type="checkbox" checked={itemEssential} onChange={(e) => setItemEssential(e.currentTarget.checked)} /> Essential expense</label>
          <button type="submit" className="ui-btn ui-btn--primary">Add expense</button>
        </form>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading">3. Category &amp; Tag Breakdown</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Monthly total</th>
                <th>Share of budget</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.categoryTotals.map((row) => <tr key={row.category}>
                <th scope="row">{row.category}</th>
                <td>{formatIntegerEuroCents(row.monthlyCents)}</td>
                <td>{row.sharePercent}%</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {evaluation.tagTotals.length > 0 && <p>
          <strong>By tag:</strong>{" "}
          {evaluation.tagTotals.map((t) => `${t.tag} (${formatIntegerEuroCents(t.monthlyCents)}/mo · ${t.itemCount})`).join(" · ")}
        </p>}
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="stress-heading">
        <h2 id="stress-heading">4. Sustainability Stress Scenarios</h2>
        <p>Uses the shared exact-cent closing cash balance formula to test reduced income, higher costs and emergency essentials-only budgets.</p>
        <div className="domain-calc-grid">
          <NumberField
            id="stress-income-pct"
            label="Reduced income level (%)"
            value={state.customIncomePercent}
            min={0}
            max={200}
            step={5}
            unit="%"
            onChange={(value) => updateStressControls({ customIncomePercent: value })}
          />
          <NumberField
            id="stress-cost-pct"
            label="Higher cost level (%)"
            value={state.customCostPercent}
            min={50}
            max={300}
            step={5}
            unit="%"
            onChange={(value) => updateStressControls({ customCostPercent: value })}
          />
          <NumberField
            id="stress-horizon-months"
            label="Stress horizon (months)"
            value={state.customHorizonMonths}
            min={1}
            max={60}
            step={1}
            unit="mo"
            onChange={(value) => updateStressControls({ customHorizonMonths: value })}
          />
        </div>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Monthly inflow</th>
                <th>Monthly expenses</th>
                <th>Monthly net</th>
                <th>Solvent months</th>
                <th>Ending balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.scenarios.map((sc) => <tr key={sc.label}>
                <th scope="row">{sc.label}</th>
                <td>{formatIntegerEuroCents(sc.monthlyInflowCents)}</td>
                <td>{formatIntegerEuroCents(sc.monthlyExpenseCents)}</td>
                <td>{formatIntegerEuroCents(sc.monthlyNetCents)}</td>
                <td>{sc.solventMonths} / {state.customHorizonMonths}</td>
                <td>{formatIntegerEuroCents(sc.endingBalanceCents)}</td>
                <td>{sc.sustainable ? "Sustainable" : sc.firstShortfallMonth ? `Shortfall in month ${sc.firstShortfallMonth}` : "Drawing down buffer"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="export-heading">
        <h2 id="export-heading">5. Standalone Backup (Export / Import JSON)</h2>
        <div className="life-people__actions">
          <button
            type="button"
            className="ui-btn ui-btn--sm"
            onClick={() => {
              setImportText(exportExpensePlannerJson());
              setTransferNotice("Exported versioned Household Expense Planner JSON below.");
            }}
          >
            Generate JSON export
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--sm"
            onClick={() => {
              if (importExpensePlannerJson(importText)) {
                setTransferNotice("Imported Household Expense Planner JSON.");
              }
              else {
                setTransferNotice("Invalid JSON or wrong calculator format; existing plan was kept.");
              }
            }}
          >
            Import JSON
          </button>
        </div>
        {transferNotice && <p>{transferNotice}</p>}
        <label className="life-people__field">Versioned JSON payload
          <textarea rows={4} value={importText} onInput={(e) => setImportText(e.currentTarget.value)} placeholder="Click Generate JSON export or paste a saved Household Expense Planner JSON document" />
        </label>
      </section>
    </main>
  </>;
}
