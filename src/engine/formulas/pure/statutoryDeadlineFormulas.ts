import {
  type IsoCalendarDate,
  StatutoryDeadlineCategory,
  StatutoryDeadlineSeverity,
  formatGermanDate,
  toIsoCalendarDate,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  addCalendarDays,
  addCalendarMonthsClamped,
  buildIsoDate,
  checkReturnDateLifeMonthOverlapFormula,
  diffCalendarDays,
  evaluateBeegMotherAssessmentWindowFormula,
  evaluateElterngeldLifeMonthFormula,
  evaluateMutterschutzWindowFormula,
  parseIsoDateParts,
} from "#engine/formulas/pure/maternityAndLifeMonthFormulas";
import {
  type ParentalLeaveVacationResult,
  evaluateParentalLeaveVacationFormula,
} from "#engine/formulas/pure/vacationOptimizationFormulas";

/**
 * Tier 1 Pure Statutory Action Deadlines, Tax-Switch Guards & Return-Date Diagnostics
 * for German Parental Leave, Maternity Protection, and Vacation Optimization.
 */

export interface StatutoryDeadlineItem {
  readonly deadlineId: string;
  readonly childIndex: number;
  readonly category: StatutoryDeadlineCategory;
  readonly severity: StatutoryDeadlineSeverity;
  readonly targetDate: IsoCalendarDate;
  readonly windowStartDate?: IsoCalendarDate;
  readonly windowEndDate?: IsoCalendarDate;
  readonly title: string;
  readonly recipient: string;
  readonly statutoryCitation: string;
  readonly lawId: LawId;
  readonly summary: string;
}

export interface StatutoryDeadlinesFormulaInputs {
  readonly childIndex: number;
  readonly expectedDueDate: IsoCalendarDate;
  readonly isMultipleOrPrematureBirth?: boolean;
  /** Optional configured tax switch INTO V/III effective date (1st of effective month). */
  readonly taxSwitchIntoEffectiveDate?: IsoCalendarDate;
  /** Optional configured tax switch BACK to III/V effective date (1st of revert month). */
  readonly taxSwitchRevertEffectiveDate?: IsoCalendarDate;
  /** Optional mother's planned return-to-work / part-time start date (`YYYY-MM-DD`). */
  readonly motherReturnToWorkDate?: IsoCalendarDate;
  /** Number of consecutive Basiselterngeld Life Months mother takes at 0h (e.g. 6 including MuSchG LM 1–2). */
  readonly motherBasisLifeMonthsCount?: number;
  /** Optional father's planned Elternzeit start date (`YYYY-MM-DD`, defaults to birth date if partner months > 0). */
  readonly fatherElternzeitStartDate?: IsoCalendarDate;
  readonly fatherPartnerMonthsCount?: number;
  /** Mother's contractual annual vacation entitlement in working days (default 30). */
  readonly motherAnnualVacationDays?: number;
  /** Mother's planned vacation days consumed before Mutterschutz in the birth year (default 0). */
  readonly motherVacationDaysTakenPreLeave?: number;
  /** Optional end date of a directly chained next pregnancy's Elternzeit. */
  readonly chainedNextElternzeitEndDate?: IsoCalendarDate;
}

export interface StatutoryDeadlinesFormulaResult {
  readonly childIndex: number;
  readonly expectedDueDate: IsoCalendarDate;
  readonly mutterschutzStart: IsoCalendarDate;
  readonly mutterschutzEnd: IsoCalendarDate;
  readonly firstElternzeitDay: IsoCalendarDate;
  readonly assessmentWindowStart: IsoCalendarDate;
  readonly assessmentWindowEnd: IsoCalendarDate;
  readonly vacationAnalysis: ParentalLeaveVacationResult;
  readonly deadlines: readonly StatutoryDeadlineItem[];
}

/**
 * Evaluates a chronologically sorted German statutory checklist & diagnostic notification feed
 * anchored to exact calendar dates (`expectedDueDate`, tax switches, return-to-work date, and
 * vacation days).
 */
export function evaluateStatutoryDeadlinesFormula(
  inputs: Readonly<StatutoryDeadlinesFormulaInputs>,
): StatutoryDeadlinesFormulaResult {
  const expectedDueDate = toIsoCalendarDate(inputs.expectedDueDate);
  const childIndex = Math.max(1, Math.trunc(inputs.childIndex));
  const mutterschutz = evaluateMutterschutzWindowFormula({
    expectedDueDate,
    isMultipleOrPrematureBirth: inputs.isMultipleOrPrematureBirth,
  });
  const assessmentWindow = evaluateBeegMotherAssessmentWindowFormula(expectedDueDate);
  const firstAssess = assessmentWindow[0];
  const lastAssess = assessmentWindow[assessmentWindow.length - 1];
  const assessmentWindowStart = buildIsoDate(firstAssess.year, firstAssess.month, 1);
  const lastAssessMonthStart = buildIsoDate(lastAssess.year, lastAssess.month, 1);
  const assessmentWindowEnd = addCalendarDays(addCalendarMonthsClamped(lastAssessMonthStart, 1), -1);

  // Optimal tax switch INTO V/III: at least 6 months inside the 12-month assessment window
  // (index 6 in 0..11 gives exactly 6 full months; index 5 gives 7 months for a 1-month safety buffer)
  const minOptimalTaxInMonth = assessmentWindow[6]; // 6 full months inside 12-mo window (tie-breaker wins)
  const latestSafeTaxInEffective = buildIsoDate(minOptimalTaxInMonth.year, minOptimalTaxInMonth.month, 1);
  const latestSafeTaxInApply = addCalendarDays(latestSafeTaxInEffective, -1); // apply by end of prior month

  // Earliest safe tax switch BACK to III/V: 1st of Mutterschutz start month (strictly after MuSchG 3-mo & BEEG 12-mo windows close)
  const preStartParts = parseIsoDateParts(mutterschutz.preBirthStart);
  const earliestSafeRevertEffective = buildIsoDate(preStartParts.year, preStartParts.month, 1);
  const earliestSafeRevertApply = addCalendarDays(earliestSafeRevertEffective, -15);

  const deadlines: StatutoryDeadlineItem[] = [];

  // 1. Tax Class Switch INTO V/III (§ 2b Abs. 1 Satz 3 BEEG)
  if (inputs.taxSwitchIntoEffectiveDate) {
    const swIn = toIsoCalendarDate(inputs.taxSwitchIntoEffectiveDate);
    const swInParts = parseIsoDateParts(swIn);
    const swInOrd = swInParts.year * 12 + (swInParts.month - 1);
    const monthsInWindow = assessmentWindow.filter(
      (entry) => entry.year * 12 + (entry.month - 1) >= swInOrd,
    ).length;

    if (monthsInWindow >= 6) {
      deadlines.push(
        Object.freeze({
          deadlineId: `DL-C${childIndex}-TAX-IN`,
          childIndex,
          category: StatutoryDeadlineCategory.TaxClassSwitch,
          severity: StatutoryDeadlineSeverity.Optimal,
          targetDate: addCalendarDays(swIn, -1),
          title: `ELSTER Tax Switch → Mother Class III (Child #${childIndex})`,
          recipient: "Finanzamt (ELSTER)",
          statutoryCitation: "§ 2b Abs. 1 Satz 3 BEEG / § 38b EStG",
          lawId: LawId.BEEG_2b,
          summary: `Submit ELSTER application before ${formatGermanDate(swIn)} so Tax Class III is active for ${monthsInWindow}/12 months of the BEEG assessment window (${firstAssess.monthId}–${lastAssess.monthId}).`,
        }),
      );
    }
    else {
      deadlines.push(
        Object.freeze({
          deadlineId: `DL-C${childIndex}-TAX-IN`,
          childIndex,
          category: StatutoryDeadlineCategory.TaxClassSwitch,
          severity: StatutoryDeadlineSeverity.Warning,
          targetDate: latestSafeTaxInApply,
          title: `Tax Switch Too Late for § 2b BEEG Majority (Child #${childIndex})`,
          recipient: "Finanzamt (ELSTER)",
          statutoryCitation: "§ 2b Abs. 1 Satz 3 BEEG",
          lawId: LawId.BEEG_2b,
          summary: `Effective date ${formatGermanDate(swIn)} yields only ${monthsInWindow}/12 months in Class III inside ${firstAssess.monthId}–${lastAssess.monthId} (minimum 6 required). Move effective date to ${formatGermanDate(latestSafeTaxInEffective)} or earlier.`,
        }),
      );
    }
  }
  else {
    deadlines.push(
      Object.freeze({
        deadlineId: `DL-C${childIndex}-TAX-IN`,
        childIndex,
        category: StatutoryDeadlineCategory.TaxClassSwitch,
        severity: StatutoryDeadlineSeverity.ActionNeeded,
        targetDate: latestSafeTaxInApply,
        title: `Recommended ELSTER Tax Switch → Mother Class III (Child #${childIndex})`,
        recipient: "Finanzamt (ELSTER)",
        statutoryCitation: "§ 2b Abs. 1 Satz 3 BEEG",
        lawId: LawId.BEEG_2b,
        summary: `Apply via ELSTER by ${formatGermanDate(latestSafeTaxInApply)} (effective ${formatGermanDate(latestSafeTaxInEffective)}) to lock ≥6 months of Class III inside the 12-month assessment window (${firstAssess.monthId}–${lastAssess.monthId}).`,
      }),
    );
  }

  // 2. Tax Class Switch BACK to III/V (§ 20 MuSchG + § 2b BEEG protection)
  if (inputs.taxSwitchRevertEffectiveDate) {
    const revDate = toIsoCalendarDate(inputs.taxSwitchRevertEffectiveDate);
    const isTooEarly = diffCalendarDays(revDate, earliestSafeRevertEffective) > 0;
    deadlines.push(
      Object.freeze({
        deadlineId: `DL-C${childIndex}-TAX-REVERT`,
        childIndex,
        category: StatutoryDeadlineCategory.TaxClassSwitch,
        severity: isTooEarly
          ? StatutoryDeadlineSeverity.Warning
          : StatutoryDeadlineSeverity.Optimal,
        targetDate: isTooEarly ? earliestSafeRevertApply : addCalendarDays(revDate, -1),
        title: isTooEarly
          ? `Tax Switch Back Too Early — Damages MuSchG Net! (Child #${childIndex})`
          : `ELSTER Tax Switch Back → Husband III / Wife V (Child #${childIndex})`,
        recipient: "Finanzamt (ELSTER)",
        statutoryCitation: "§ 20 Abs. 1 MuSchG & § 2b BEEG",
        lawId: LawId.MuSchG_20,
        summary: isTooEarly
          ? `Switching back on ${formatGermanDate(revDate)} falls inside the 3-month MuSchG reference window (${mutterschutz.threeMonthReferenceMonths.map((m) => m.monthId).join(", ")}) and lowers Mutterschutz pay! Delay revert until ${formatGermanDate(earliestSafeRevertEffective)} or later.`
          : `Safe to apply in ELSTER before ${formatGermanDate(revDate)} — both the 3-month MuSchG window (${mutterschutz.threeMonthReferenceMonths.map((m) => m.monthId).join(", ")}) and the 12-month BEEG window (${firstAssess.monthId}–${lastAssess.monthId}) are already locked.`,
      }),
    );
  }
  else {
    deadlines.push(
      Object.freeze({
        deadlineId: `DL-C${childIndex}-TAX-REVERT`,
        childIndex,
        category: StatutoryDeadlineCategory.TaxClassSwitch,
        severity: StatutoryDeadlineSeverity.Info,
        targetDate: earliestSafeRevertApply,
        title: `Earliest Safe ELSTER Switch Back → Husband III / Wife V (Child #${childIndex})`,
        recipient: "Finanzamt (ELSTER)",
        statutoryCitation: "§ 20 Abs. 1 MuSchG & § 2b BEEG",
        lawId: LawId.MuSchG_20,
        summary: `Once ${lastAssess.monthId} closes, submit ELSTER switch back to take effect from ${formatGermanDate(earliestSafeRevertEffective)} (restoring Husband's monthly Class III liquidity without affecting MuSchG or Elterngeld).`,
      }),
    );
  }

  // 3. GKV Mutterschaftsgeld Certificate (earliest 7 weeks before due date, § 19 MuSchG)
  const gkvCertEarliest = addCalendarDays(expectedDueDate, -49);
  deadlines.push(
    Object.freeze({
      deadlineId: `DL-C${childIndex}-GKV-MUSCHG`,
      childIndex,
      category: StatutoryDeadlineCategory.Mutterschutz,
      severity: StatutoryDeadlineSeverity.ActionNeeded,
      targetDate: gkvCertEarliest,
      windowStartDate: gkvCertEarliest,
      windowEndDate: mutterschutz.preBirthStart,
      title: `Submit OB/GYN Due-Date Certificate for Mutterschaftsgeld (Child #${childIndex})`,
      recipient: "Krankenkasse (GKV) & Mother's Employer",
      statutoryCitation: "§ 3 & § 19 MuSchG",
      lawId: LawId.MuSchG_19,
      summary: `OB/GYN issues the official "Bescheinigung über den mutmaßlichen Tag der Entbindung" earliest 7 weeks before due date (${formatGermanDate(gkvCertEarliest)}). Mutterschutz runs ${formatGermanDate(mutterschutz.preBirthStart)} – ${formatGermanDate(mutterschutz.postBirthEnd)} (${mutterschutz.totalProtectedDays} days).`,
    }),
  );

  // 4. Mother's Elternzeit Written Registration (§ 16 Abs. 1 BEEG: 7 weeks before Mutterschutz ends = 1 week post-birth!)
  const motherElternzeitDeadline = addCalendarDays(mutterschutz.firstElternzeitDay, -49);
  deadlines.push(
    Object.freeze({
      deadlineId: `DL-C${childIndex}-MOTHER-EZ`,
      childIndex,
      category: StatutoryDeadlineCategory.Elternzeit,
      severity: StatutoryDeadlineSeverity.ActionNeeded,
      targetDate: motherElternzeitDeadline,
      windowStartDate: expectedDueDate,
      windowEndDate: motherElternzeitDeadline,
      title: `Mother's Written Elternzeit Notice (§ 16 BEEG — 7-Week Rule, Child #${childIndex})`,
      recipient: "Mother's Employer (HR — Wet Signature / Textform)",
      statutoryCitation: "§ 16 Abs. 1 BEEG",
      lawId: LawId.BEEG_4,
      summary: `Tight post-birth deadline: submit written Elternzeit notice by ${formatGermanDate(motherElternzeitDeadline)} (7 weeks before Elternzeit begins on ${formatGermanDate(mutterschutz.firstElternzeitDay)}, which is only 1 week after delivery for standard 8-week Mutterschutz).`,
    }),
  );

  // 5. Father's Elternzeit Registration (§ 18 Abs. 1 BEEG: exact 8-to-7-week Kündigungsschutz window!)
  if ((inputs.fatherPartnerMonthsCount ?? 0) > 0) {
    const fatherStart = inputs.fatherElternzeitStartDate
      ? toIsoCalendarDate(inputs.fatherElternzeitStartDate)
      : expectedDueDate;
    const fatherWindowStart = addCalendarDays(fatherStart, -56); // 8 weeks before
    const fatherWindowEnd = addCalendarDays(fatherStart, -49); // 7 weeks before
    deadlines.push(
      Object.freeze({
        deadlineId: `DL-C${childIndex}-FATHER-EZ`,
        childIndex,
        category: StatutoryDeadlineCategory.Elternzeit,
        severity: StatutoryDeadlineSeverity.ActionNeeded,
        targetDate: fatherWindowEnd,
        windowStartDate: fatherWindowStart,
        windowEndDate: fatherWindowEnd,
        title: `Father's Elternzeit Notice — Exact 8-to-7-Week Window (Child #${childIndex})`,
        recipient: "Father's Employer (HR)",
        statutoryCitation: "§ 16 Abs. 1 & § 18 Abs. 1 BEEG",
        lawId: LawId.BEEG_4b,
        summary: `Submit strictly between ${formatGermanDate(fatherWindowStart)} (8 wks prior) and ${formatGermanDate(fatherWindowEnd)} (7 wks prior) for leave starting ${formatGermanDate(fatherStart)}. Filing earlier than 8 weeks exposes the gap before dismissal protection (Kündigungsschutz) begins.`,
      }),
    );
  }

  // 6. Mother's Working Hours Change / Return-to-Work (§ 15 Abs. 7 BEEG + Life-Month Overlap Check)
  const basisCount = inputs.motherBasisLifeMonthsCount ?? 6;
  const defaultSafeReturn = addCalendarDays(
    evaluateElterngeldLifeMonthFormula(expectedDueDate, Math.max(1, basisCount)).endDate,
    1,
  );
  const effectiveReturnDate = inputs.motherReturnToWorkDate
    ? toIsoCalendarDate(inputs.motherReturnToWorkDate)
    : defaultSafeReturn;
  const fullElternzeitEndDate = addCalendarDays(effectiveReturnDate, -1);

  const overlapCheck = checkReturnDateLifeMonthOverlapFormula(
    expectedDueDate,
    effectiveReturnDate,
    basisCount,
  );
  const partTimeNoticeDeadline = addCalendarDays(effectiveReturnDate, -49); // 7 weeks under § 15 Abs. 7 BEEG
  deadlines.push(
    Object.freeze({
      deadlineId: `DL-C${childIndex}-WORK-HOURS`,
      childIndex,
      category: StatutoryDeadlineCategory.WorkingHours,
      severity: overlapCheck.overlapsActiveBasisLifeMonth
        ? StatutoryDeadlineSeverity.Warning
        : StatutoryDeadlineSeverity.ActionNeeded,
      targetDate: partTimeNoticeDeadline,
      title: overlapCheck.overlapsActiveBasisLifeMonth
        ? `Return Date Overlaps Active Basiselterngeld Life Month #${overlapCheck.overlappedLifeMonth?.lifeMonthNumber}! (Child #${childIndex})`
        : `Register Part-Time Working Hours Change (§ 15 Abs. 7 BEEG, Child #${childIndex})`,
      recipient: "Mother's Employer (HR)",
      statutoryCitation: "§ 15 Abs. 7 BEEG & § 4 Abs. 1 BEEG",
      lawId: LawId.BEEG_4a,
      summary: overlapCheck.overlapsActiveBasisLifeMonth
        ? `Returning on ${formatGermanDate(effectiveReturnDate)} overlaps Life Month #${overlapCheck.overlappedLifeMonth?.lifeMonthNumber} (${formatGermanDate(overlapCheck.overlappedLifeMonth!.startDate)}–${formatGermanDate(overlapCheck.overlappedLifeMonth!.endDate)}) by ${overlapCheck.overlapDaysInLifeMonth} day(s), triggering Elterngeld income offset! Shift return to ${formatGermanDate(overlapCheck.suggestedSafeReturnDate)} and notify HR by ${formatGermanDate(addCalendarDays(overlapCheck.suggestedSafeReturnDate, -49))}.`
        : `Notify employer by ${formatGermanDate(partTimeNoticeDeadline)} (7 weeks prior for Teilzeit in Elternzeit under § 15 Abs. 7 BEEG; 3 months prior under § 8 TzBfG if outside Elternzeit) for return on ${formatGermanDate(effectiveReturnDate)}.`,
    }),
  );

  // 7. Elterngeld Application (§ 7 BEEG: after birth; max 3 life months retroactive)
  const elterngeldRetroCutoff = addCalendarMonthsClamped(expectedDueDate, 3);
  deadlines.push(
    Object.freeze({
      deadlineId: `DL-C${childIndex}-ELTERNGELD`,
      childIndex,
      category: StatutoryDeadlineCategory.Elterngeld,
      severity: StatutoryDeadlineSeverity.ActionNeeded,
      targetDate: addCalendarDays(expectedDueDate, 14),
      windowStartDate: expectedDueDate,
      windowEndDate: elterngeldRetroCutoff,
      title: `Submit Elterngeld Application (Child #${childIndex})`,
      recipient: "Elterngeldstelle (e.g. ZBFS Bayern)",
      statutoryCitation: "§ 7 Abs. 1 Satz 2 BEEG",
      lawId: LawId.BEEG_1,
      summary: `Submit immediately after birth certificate arrives (target ~${formatGermanDate(addCalendarDays(expectedDueDate, 14))}). Hard statutory retroactive cap: 3 life months (by ${formatGermanDate(elterngeldRetroCutoff)}) — late months are permanently forfeited.`,
    }),
  );

  // 8. Kindergeld Application (§ 70 EStG: after child Steuer-ID arrives; max 6 months retroactive)
  const kindergeldRetroCutoff = addCalendarMonthsClamped(expectedDueDate, 6);
  deadlines.push(
    Object.freeze({
      deadlineId: `DL-C${childIndex}-KINDERGELD`,
      childIndex,
      category: StatutoryDeadlineCategory.Kindergeld,
      severity: StatutoryDeadlineSeverity.ActionNeeded,
      targetDate: addCalendarDays(expectedDueDate, 21),
      windowStartDate: expectedDueDate,
      windowEndDate: kindergeldRetroCutoff,
      title: `Submit Kindergeld Application (Child #${childIndex})`,
      recipient: "Familienkasse (Bundesagentur für Arbeit)",
      statutoryCitation: "§ 66 & § 70 Abs. 1 EStG",
      lawId: LawId.EStG_66,
      summary: `Apply online once the newborn's Steuer-ID arrives (~2–4 weeks post-birth). Retroactive payment is strictly capped at 6 months (${formatGermanDate(kindergeldRetroCutoff)}).`,
    }),
  );

  // 9. Vacation Carryover & Optimization Notification (§ 17 BEEG / § 24 MuSchG)
  const vacationAnalysis = evaluateParentalLeaveVacationFormula({
    annualVacationDays: inputs.motherAnnualVacationDays ?? 30,
    expectedDueDate,
    isMultipleOrPrematureBirth: inputs.isMultipleOrPrematureBirth,
    fullElternzeitStartDate: mutterschutz.firstElternzeitDay,
    fullElternzeitEndDate,
    vacationDaysTakenPreLeave: inputs.motherVacationDaysTakenPreLeave ?? 0,
    chainedNextElternzeitEndDate: inputs.chainedNextElternzeitEndDate,
  });

  if (vacationAnalysis.monthEndOptimization.hasMonthEndTrap) {
    deadlines.push(
      Object.freeze({
        deadlineId: `DL-C${childIndex}-VACATION-OPT`,
        childIndex,
        category: StatutoryDeadlineCategory.Vacation,
        severity: StatutoryDeadlineSeverity.Warning,
        targetDate: vacationAnalysis.monthEndOptimization.recommendedReturnDate,
        title: `Month-End Vacation Trap: Save +${vacationAnalysis.monthEndOptimization.vacationDaysDelta} Paid Days! (Child #${childIndex})`,
        recipient: "Mother's Employer (Elternzeit End Date)",
        statutoryCitation: "§ 17 Abs. 1 BEEG",
        lawId: LawId.MuSchG_3,
        summary: vacationAnalysis.monthEndOptimization.explanation,
      }),
    );
  }
  else {
    deadlines.push(
      Object.freeze({
        deadlineId: `DL-C${childIndex}-VACATION-CARRYOVER`,
        childIndex,
        category: StatutoryDeadlineCategory.Vacation,
        severity: vacationAnalysis.birthYearOverusedDays > 0
          ? StatutoryDeadlineSeverity.Info
          : StatutoryDeadlineSeverity.Optimal,
        targetDate: vacationAnalysis.carryoverExpiryDate,
        title: `Vacation Entitlement & Carryover Protected through ${formatGermanDate(vacationAnalysis.carryoverExpiryDate)} (Child #${childIndex})`,
        recipient: "Mother's Employer (HR Vacation Ledger)",
        statutoryCitation: "§ 24 MuSchG & § 17 Abs. 1, 2, 4 BEEG",
        lawId: LawId.MuSchG_3,
        summary:
          vacationAnalysis.birthYearOverusedDays > 0
            ? `Birth-year post-cut entitlement is ${vacationAnalysis.birthYearEntitledDaysAfterCut}d (${vacationAnalysis.totalFullCalendarMonthsCut}/12 cut). Taking ${vacationAnalysis.vacationDaysTakenPreLeave}d pre-leave exceeds entitlement by ${vacationAnalysis.birthYearOverusedDays}d — deductible from next year's vacation under § 17 Abs. 4 BEEG (zero cash clawback).`
            : `${vacationAnalysis.monthEndOptimization.explanation} Unused entitlement (${vacationAnalysis.remainingUnusedCarryoverDays}d) carries over until ${formatGermanDate(vacationAnalysis.carryoverExpiryDate)}.`,
      }),
    );
  }

  deadlines.sort((a, b) => diffCalendarDays(b.targetDate, a.targetDate));

  return Object.freeze({
    childIndex,
    expectedDueDate,
    mutterschutzStart: mutterschutz.preBirthStart,
    mutterschutzEnd: mutterschutz.postBirthEnd,
    firstElternzeitDay: mutterschutz.firstElternzeitDay,
    assessmentWindowStart,
    assessmentWindowEnd,
    vacationAnalysis,
    deadlines: Object.freeze(deadlines),
  });
}
