import {
  type MonthlyLedgerEntry,
  type CalendarMonth,
  type TaxSettlementAudit,
  type SpecialEventItem,
  SpecialEventType,
  SpecialEventCategory,
  TransactionType,
  TransactionDirection,
  toEuroAmount,
  toEventId,
  toStatutoryCitation,
} from "#engine/types";
import {
  buildMonthlyLedgerEntry,
} from "#engine/ledger/ledger";
import {
  createTransaction,
} from "#engine/ledger/transaction";

export type AnnualTaxCashFlow = TaxSettlementAudit;

/** Post signed annual settlements in the configured following-year month, then rebuild balances. */
export function applyAnnualTaxSettlements(
  months: readonly MonthlyLedgerEntry[],
  settlements: readonly AnnualTaxCashFlow[],
  payoutMonth: CalendarMonth,
): readonly MonthlyLedgerEntry[] {
  if (new Set(settlements.map((item) => item.calendarYear)).size !== settlements.length) {
    throw new TypeError("Annual settlements contain duplicate tax years.");
  }
  for (const item of settlements) {
    if ([item.creditedIncomeTax, item.creditedSolidarity, item.totalLiability].some((amount) => !Number.isFinite(amount) || amount < 0)) {
      throw new TypeError("Tax credits and liabilities must be non-negative finite amounts.");
    }
    if (item.settlement !== toEuroAmount(item.creditedIncomeTax + item.creditedSolidarity - item.totalLiability)) {
      throw new TypeError("A tax settlement must equal credited withholding less annual liability.");
    }
  }
  if (months.some((month) => month.taxRefund !== 0 || month.specialEvents.some((event) => event.type === SpecialEventType.TaxReturn))) {
    throw new TypeError("Annual tax cash flows may only be posted once.");
  }
  let salaries = 0;
  let benefits = 0;
  let tax = 0;
  let total = 0;
  return Object.freeze(months.map((month) => {
    const item = month.calendarMonthNum === payoutMonth
      ? settlements.find((flow) => flow.calendarYear + 1 === month.calendarYearNum) : undefined;
    const amount = item?.settlement ?? toEuroAmount(0);
    const specialEvents = [...month.specialEvents];
    const transactions = [...month.transactions];
    let title: string | undefined;
    if (item && amount !== 0) {
      title = `Annual Tax Settlement (${amount > 0 ? "Refund" : "Repayment"})`;
      const description = `Tax Year ${item.calendarYear}: credited income tax ${item.creditedIncomeTax} plus credited solidarity ${item.creditedSolidarity}, less annual liability ${item.totalLiability}, equals signed settlement ${amount}.`;
      const event: SpecialEventItem = {monthId: month.monthId,
        monthRef: month.monthRef,
        monthSimRef: month.monthSimRef,
        month: month.month,
        year: month.year,
        calendarYearNum: month.calendarYearNum,
        calendarMonthNum: month.calendarMonthNum,
        calendarLabel: month.calendarLabel,
        relativeBirthLabel: month.relativeBirthLabel,
        relativeMonthLabel: month.relativeMonthLabel,
        taxClassLabel: month.taxClassLabel,
        taxSettlement: { calendarYear: item.calendarYear,
          settlement: amount,
          creditedIncomeTax: item.creditedIncomeTax,
          creditedSolidarity: item.creditedSolidarity,
          totalLiability: item.totalLiability },
        eventId: toEventId(`EVENT-${month.monthId}-TAX-SETTLEMENT`),
        type: SpecialEventType.TaxReturn,
        title,
        category: SpecialEventCategory.TaxOffice,
        statutory: toStatutoryCitation("EStG §§ 26b, 32a, 32b, 36; SolzG §§ 1, 3, 4"),
        amount,
        description };
      specialEvents.push(event);
      transactions.push(createTransaction({ ...month,
        transactionId: `TX-${month.monthId}-TAX-SETTLEMENT`,
        type: TransactionType.TaxReconciliationRefund,
        direction: amount > 0 ? TransactionDirection.Inflow : TransactionDirection.Outflow,
        amount: toEuroAmount(Math.abs(amount)),
        statutoryCitation: "EStG § 36 (annual tax settlement)",
        description: title,
        auditTrail: description }));
    }
    const rebuilt = buildMonthlyLedgerEntry({ ...month,
      specialEvents,
      transactions,
      taxRefund: amount,
      eventType: title ? SpecialEventType.TaxReturn : month.eventType,
      eventTag: title ? [month.eventTag, title].filter(Boolean).join(" + ") : month.eventTag }, salaries, benefits, tax, total);
    salaries = rebuilt.nextCumulatedSalaries;
    benefits = rebuilt.nextCumulatedBenefits;
    tax = rebuilt.nextCumulatedTaxRefunds;
    total = rebuilt.nextCumulatedTotal;
    return Object.freeze({ ...month,
      ...rebuilt.entry });
  }));
}
