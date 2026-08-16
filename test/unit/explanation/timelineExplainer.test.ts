import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getFieldExplanation,
  getActionFieldExplanation,
  getSpecialEventFieldExplanation,
  getRowExplanation,
  getActionRowExplanation,
  getSpecialEventRowExplanation,
  type FieldColumnKey
} from '#engine/explanation/timelineExplainer';
import { runScenarioBatches } from '#engine/simulator/timelineGenerator';
import {
  TaxClass,
  ScenarioId,
  ActionType,
  ActionCategory,
  SpecialEventType,
  SpecialEventCategory,
  toNetSalary,
  toEuroAmount,
  toWorkingHours,
  toSimulationMonth,
  toCalendarMonth,
  toPregnancyId,
  toSwitchId,
  toFinancialEventId,
  type PreexistingConditions,
  type PregnancyAction,
  type TaxClassSwitchAction,
  type ActionRowItem,
  type SpecialEventItem
} from '#engine/types';

describe('Timeline Explanation Engine (Field-Level & Full-Row Audits)', () => {
  const basePreexisting: PreexistingConditions = {
    startCalendarYear: 2026,
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: 60,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: toNetSalary(2895),
    husbandInitialClass5Net: toNetSalary(2191),
    husbandWeeklyHours: toWorkingHours(32),
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: toNetSalary(1975),
    wifeInitialClass3FullTimeNet: toNetSalary(2603),
    wifeInitialPartTimeClass5Net: toNetSalary(1328),
    wifeInitialPartTimeClass3Net: toNetSalary(1648),
    wifeWeeklyHours: toWorkingHours(40),
    existingChildrenCount: 0,
    kindergeldPerChild: toEuroAmount(250),
    enable13thSalary: true,
    bonus40Month: toCalendarMonth(6),
    bonus60Month: toCalendarMonth(11),
    taxReturnMonth: toCalendarMonth(3)
  };

  const preg: PregnancyAction = {
    pregnancyId: toPregnancyId('PREG-1'),
    childIndex: 1,
    positiveTestCalendarMonth: toCalendarMonth(4),
    positiveTestCalendarYear: 2026,
    positiveTestSimulationMonth: toSimulationMonth(4),
    calculatedDeliverySimulationMonth: toSimulationMonth(12),
    motherPostBirthPartTimeHours: toWorkingHours(24),
    motherPostBirthPartTimeClass5Net: toNetSalary(1328),
    motherPostBirthPartTimeClass3Net: toNetSalary(1648),
    fatherPartnerMonthsCount: 4
  };

  const simC = runScenarioBatches({
    scenarioKey: ScenarioId.C,
    preexisting: basePreexisting,
    pregnancies: [preg],
    taxClassSwitches: [],
    salaryRaises: [],
    financialEvents: []
  });

  const simB = runScenarioBatches({
    scenarioKey: ScenarioId.B,
    preexisting: basePreexisting,
    pregnancies: [preg],
    taxClassSwitches: [],
    salaryRaises: [],
    financialEvents: []
  });

  describe('getFieldExplanation - All 12 Column Keys', () => {
    const allKeys: FieldColumnKey[] = [
      'month',
      'phase',
      'taxClass',
      'husbandSalary',
      'wifeSalary',
      'mutterschutz',
      'wifeElterngeld',
      'husbandElterngeld',
      'kindergeld',
      'specialEvents',
      'netInflow',
      'cumulativeTotal'
    ];

    it('generates valid explanations with formulas and citations for every column key in month 14 (ElterngeldPlus)', () => {
      const m14C = simC.months[13];
      const m14B = simB.months[13];

      for (const key of allKeys) {
        const exp = getFieldExplanation(key, m14C, m14B, ScenarioId.C);
        assert.ok(exp.fieldTitle, `fieldTitle must exist for ${key}`);
        assert.ok(exp.valueFormatted, `valueFormatted must exist for ${key}`);
        assert.ok(exp.explanation.length > 10, `explanation must be detailed for ${key}`);
        assert.ok(exp.legalCitation, `legalCitation must exist for ${key}`);
      }
    });

    it('provides exact mathematical formula for ElterngeldPlus column', () => {
      const m14C = simC.months[13];
      const exp = getFieldExplanation('wifeElterngeld', m14C, undefined, ScenarioId.C);
      assert.equal(exp.valueFormatted, '900\u00a0€');
      assert.ok(exp.derivationFormula?.includes('65%'));
      assert.ok(exp.explanation.includes('Class III'));
    });

    it('provides exact mathematical formula for Mutterschutz column during protection window', () => {
      const m12C = simC.months[11]; // Delivery month
      const exp = getFieldExplanation('mutterschutz', m12C, undefined, ScenarioId.C);
      assert.ok((m12C.mutterschutz as number) > 0);
      assert.ok(exp.derivationFormula?.includes('100% Net'));
      assert.ok(exp.legalCitation?.includes('MuSchG'));
    });
  });

  describe('getActionFieldExplanation & getActionRowExplanation', () => {
    it('generates valid explanations for pregnancy positive action row', () => {
      const act: ActionRowItem = {
        actionId: 'ACT-PREG-1',
        title: 'ACTION: Positive Pregnancy Test (Child 1)',
        category: ActionCategory.Pregnancy,
        type: ActionType.PregnancyPositive,
        description: 'Positive pregnancy test logged.'
      };

      const m4 = simC.months[3];
      const fieldExp = getActionFieldExplanation('title', act, m4);
      assert.ok(fieldExp.fieldTitle.includes('Positive Pregnancy Test'));
      assert.ok(fieldExp.explanation.includes('preconditions'));

      const rowExp = getActionRowExplanation(act, m4, ScenarioId.C);
      assert.equal(rowExp.rowType, 'action');
      assert.ok(rowExp.title.includes('Positive Pregnancy Test'));
      assert.ok(rowExp.legalRuleKey);
    });

    it('generates valid explanations for tax class switch action row', () => {
      const act: ActionRowItem = {
        actionId: 'ACT-SWAP-1',
        title: 'ACTION: Tax Class Switch (III / V Swap)',
        category: ActionCategory.TaxSwitch,
        type: ActionType.TaxClassSwitchSwap,
        description: 'Prenatal spousal tax class optimization switch.',
        taxClassLabel: 'III (Wife) / V (Husband)'
      };

      const m4 = simC.months[3];
      const fieldExp = getActionFieldExplanation('taxClass', act, m4);
      assert.equal(fieldExp.valueFormatted, 'III (Wife) / V (Husband)');
      assert.ok(fieldExp.legalCitation?.includes('EStG § 38b'));

      const rowExp = getActionRowExplanation(act, m4, ScenarioId.C);
      assert.equal(rowExp.taxClasses, 'III (Wife) / V (Husband)');
      assert.ok(rowExp.legalCitation?.includes('BFH VI R 2/13'));
    });
  });

  describe('getSpecialEventFieldExplanation & getSpecialEventRowExplanation', () => {
    it('generates valid explanations for tax return refund special event', () => {
      const ev: SpecialEventItem = {
        eventId: 'EV-TAX-REFUND-1',
        type: SpecialEventType.TaxReturnRefund,
        category: SpecialEventCategory.TaxReconciliation,
        title: 'Tax Return Refund (Year 1)',
        description: 'Splitting tariff refund from joint tax assessment.',
        amount: toEuroAmount(3200),
        taxClassLabel: 'III / V'
      };

      const m15 = simC.months[14];
      const fieldExp = getSpecialEventFieldExplanation('amount', ev, m15, 50000, 3200);
      assert.equal(fieldExp.valueFormatted, '3.200\u00a0€');
      assert.ok(fieldExp.derivationFormula?.includes('Credit (+)'));

      const rowExp = getSpecialEventRowExplanation(ev, m15, undefined, 50000, ScenarioId.C);
      assert.equal(rowExp.rowType, 'special_event');
      assert.equal(rowExp.totalNetInflow, 3200);
      assert.equal(rowExp.cumulatedTotal, 50000);
      assert.ok(rowExp.legalCitation?.includes('EStG § 26b'));
    });
  });

  describe('getRowExplanation - Full Monthly Audit', () => {
    it('generates itemized streams, totals, and variance for standard month', () => {
      const m14C = simC.months[13];
      const m14B = simB.months[13];

      const rowExp = getRowExplanation(m14C, m14B, ScenarioId.C);
      assert.equal(rowExp.rowType, 'month');
      assert.ok(rowExp.streams.length >= 4, 'Must include multiple income streams');
      assert.ok(rowExp.totalNetInflow > 0);
      assert.ok(rowExp.cumulatedTotal > 0);
      assert.ok(rowExp.diffVsBFormatted?.includes('+') || rowExp.diffVsBFormatted === '0 €');
      assert.ok(rowExp.summaryDescription.includes('Month 14'));
    });
  });
});
