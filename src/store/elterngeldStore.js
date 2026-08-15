import { signal, computed } from '@preact/signals';

// Default Financial Parameters (The Sandbox)
export const husbandClass3Net = signal(2895);
export const husbandClass5Net = signal(2191);
export const husbandHours = signal(32);

export const wifeClass5FullTimeNet = signal(1975);
export const wifeClass3FullTimeNet = signal(2603);
export const wifeClass5PartTimeNet = signal(1328);
export const wifeClass3PartTimeNet = signal(1648);
export const wifeInitialHours = signal(40);
export const wifePostBirthHours = signal(24);

export const kindergeldPerChild = signal(259);

// Timeline & Spacing Controls
export const prePregnancyPlanningMonths = signal(3); // Start 3 months before pregnancy
export const child1BirthMonth = signal(12); // Month 12 (3M pre-preg + 9M pregnancy)
export const birthSpacingMonths = signal(27); // Gap of 27 months -> Child 2 born at Month 39
export const swapLeadMonths = signal(7); // 7 months prior to Mutterschutz phase
export const preMutterschutzMonths = signal(1.5); // 6 weeks
export const postMutterschutzMonths = signal(2); // 8 weeks

// UI & View State
export const activeScenario = signal('C'); // 'A', 'B', 'C', or 'compare'
export const chartMode = signal('stacked_bar'); // 'stacked_bar', 'area', 'compare'
export const timeRangeFilter = signal('all'); // 'all', 'child1', 'child2', 'post'
export const hoveredMonth = signal(null);

export function resetToDefaults() {
  husbandClass3Net.value = 2895;
  husbandClass5Net.value = 2191;
  husbandHours.value = 32;

  wifeClass5FullTimeNet.value = 1975;
  wifeClass3FullTimeNet.value = 2603;
  wifeClass5PartTimeNet.value = 1328;
  wifeClass3PartTimeNet.value = 1648;
  wifeInitialHours.value = 40;
  wifePostBirthHours.value = 24;

  kindergeldPerChild.value = 259;
  prePregnancyPlanningMonths.value = 3;
  child1BirthMonth.value = 12;
  birthSpacingMonths.value = 27;
  swapLeadMonths.value = 7;
  preMutterschutzMonths.value = 1.5;
  postMutterschutzMonths.value = 2;
}

// 60-Month Cash Flow Engine for a given scenario ('A', 'B', or 'C')
export function computeTimelineData(scenarioKey) {
  const h3Net = husbandClass3Net.value;
  const h5Net = husbandClass5Net.value;
  const w5FT = wifeClass5FullTimeNet.value;
  const w3FT = wifeClass3FullTimeNet.value;
  const w5PT = wifeClass5PartTimeNet.value;
  const w3PT = wifeClass3PartTimeNet.value;
  const kgRate = kindergeldPerChild.value;

  const prePreg = prePregnancyPlanningMonths.value; // e.g. 3
  const preg1Start = prePreg + 1; // Month 4
  const b1 = child1BirthMonth.value; // e.g. 12 (Month 4 + 8-9M)
  const spacing = birthSpacingMonths.value; // e.g. 27
  const b2 = b1 + spacing; // e.g. 39
  const swapLead = swapLeadMonths.value; // e.g. 7

  // Pre-Mutterschutz 1 is 1 month before birth (e.g. Month 11)
  const preM1 = Math.max(1, b1 - 1);
  // Swap 1 Window: 7 months before Pre-Mutterschutz 1 (e.g. M4 to M10)
  const swap1Start = Math.max(1, preM1 - swapLead);
  const swap1End = preM1 - 1;

  // Mutterschutz 1: Pre-birth (M11) & Post-birth (M12, M13)
  const mutterschutz1Months = [preM1, b1, b1 + 1];

  // Elterngeld Child 1: Post-birth M14 to M25 (12 months EGPlus) + Partnerschaftsbonus M26 to M29 (4 months)
  const eg1Start = b1 + 2; // Month 14
  const eg1BaseEnd = eg1Start + 11; // Month 25
  const eg1BonusStart = eg1BaseEnd + 1; // Month 26
  const eg1BonusEnd = eg1BonusStart + 3; // Month 29

  // Pregnancy 2 Start (18 months gap after Birth 1: e.g. Month 12 + 18 = Month 30)
  const preg2Start = b1 + 18; // Month 30
  // Pre-Mutterschutz 2 is 1 month before Birth 2 (e.g. Month 38)
  const preM2 = Math.max(1, b2 - 1);
  // Swap 2 Window: 7 months before Pre-Mutterschutz 2 (e.g. M31 to M37)
  const swap2Start = Math.max(1, preM2 - swapLead);
  const swap2End = preM2 - 1;

  // Mutterschutz 2: Pre-birth (M38) & Post-birth (M39, M40)
  const mutterschutz2Months = [preM2, b2, b2 + 1];

  // Elterngeld Child 2: Post-birth M41 to M52 (12 months EGPlus) + Partnerschaftsbonus M53 to M56 (4 months)
  const eg2Start = b2 + 2; // Month 41
  const eg2BaseEnd = eg2Start + 11; // Month 52
  const eg2BonusStart = eg2BaseEnd + 1; // Month 53
  const eg2BonusEnd = eg2BonusStart + 3; // Month 56

  // Sibling Bonus (Geschwisterbonus) Condition:
  // Child 1 is born at b1. Child 1 turns 3 years old at month (b1 + 36).
  // Sibling bonus applies from b2 until month (b1 + 36) inclusive.
  const siblingBonusEndMonth = b1 + 36; // e.g. 12 + 36 = 48

  // Calculations for Elterngeld rates:
  // 1. Child 1:
  // Scenario B: Pre-birth Class V FT (€1975), Part-time Class V (€1328).
  // EGPlus B = 0.65 * (1975 - 1328) = 0.65 * 770 = 500.50 (capped at 900)
  const egPlusChild1B = Math.min(900, Math.max(150, 0.65 * Math.max(0, w5FT - w5PT)));

  // Scenario C: Swapped to Class III FT (€2603), Synthetic Rule applies post-birth (even if Class V PT €1328).
  // EGPlus C = 0.65 * (2603 - 1328) = 0.65 * 1490 = 968.50 -> Capped at 900.00
  const egPlusChild1C = Math.min(900, Math.max(150, 0.65 * Math.max(0, w3FT - w5PT)));

  // 2. Child 2 (The 14-Month Trap):
  // 12-month Bemessungszeitraum before Child 2 Mutterschutz captures 10 months PT and 2 months FT.
  // Scenario B (No swap): Blended pre-birth net = (10 * w5PT + 2 * w5FT) / 12
  const blendedPreBirthNetB = (10 * w5PT + 2 * w5FT) / 12;
  const baseEgChild2B = 0.65 * Math.max(0, blendedPreBirthNetB - w5PT);
  const baseEgPlusChild2B = Math.min(900, Math.max(150, baseEgChild2B));
  // Geschwisterbonus: +10% of Elterngeld (minimum +€75 for EGPlus under BEEG §2a)
  const siblingBonusAmountB = Math.max(75, baseEgPlusChild2B * 0.10);
  const egPlusChild2WithSiblingB = Math.min(900, baseEgPlusChild2B + siblingBonusAmountB);

  // Scenario C (Swap 2 active in Bemessungszeitraum):
  // Wife is in Class III: Blended pre-birth net = (10 * w3PT + 2 * w3FT) / 12
  const blendedPreBirthNetC = (10 * w3PT + 2 * w3FT) / 12;
  const baseEgChild2C = 0.65 * Math.max(0, blendedPreBirthNetC - w5PT);
  const baseEgPlusChild2C = Math.min(900, Math.max(150, baseEgChild2C));
  // Geschwisterbonus (+10% or min €75)
  const siblingBonusAmountC = Math.max(75, baseEgPlusChild2C * 0.10);
  const egPlusChild2WithSiblingC = Math.min(900, baseEgPlusChild2C + siblingBonusAmountC);

  const months = [];
  let cumulatedSalaries = 0;
  let cumulatedBenefits = 0;
  let cumulatedTaxRefunds = 0;
  let cumulatedTotal = 0;

  for (let m = 1; m <= 60; m++) {
    let husbandSalary = 0;
    let wifeSalary = 0;
    let mutterschutz = 0;
    let wifeElterngeld = 0;
    let husbandElterngeld = 0;
    let kindergeld = 0;
    let taxRefund = 0;
    let taxClassLabel = 'H: III | W: V';
    let phaseLabel = 'Standard FT';
    let isSwapActive = false;
    let isMutterschutz = false;
    let isPartnerschaftsbonus = false;
    let hasSiblingBonus = false;

    if (scenarioKey === 'A') {
      // Scenario A: Baseline - No children
      husbandSalary = h3Net;
      wifeSalary = w5FT;
      phaseLabel = 'Standard Career (No Leave)';
      taxClassLabel = 'H: III | W: V';
    } else if (scenarioKey === 'B') {
      // Scenario B: Unoptimized - Static Class III/V
      husbandSalary = h3Net;
      taxClassLabel = 'H: III | W: V';

      // Kindergeld
      if (m >= b1) kindergeld += kgRate;
      if (m >= b2) kindergeld += kgRate;

      // Mutterschutz 1
      if (mutterschutz1Months.includes(m)) {
        isMutterschutz = true;
        wifeSalary = 0;
        mutterschutz = w5FT; // 100% replacement of Class V FT
        phaseLabel = m === preM1 ? 'Pre-Birth Mutterschutz 1' : 'Post-Birth Mutterschutz 1';
      }
      // Mutterschutz 2
      else if (mutterschutz2Months.includes(m)) {
        isMutterschutz = true;
        wifeSalary = 0;
        mutterschutz = w5PT; // 100% replacement of Class V PT
        phaseLabel = m === preM2 ? 'Pre-Birth Mutterschutz 2' : 'Post-Birth Mutterschutz 2';
      }
      // Child 1 Elterngeld
      else if (m >= eg1Start && m <= eg1BonusEnd) {
        wifeSalary = w5PT;
        wifeElterngeld = egPlusChild1B;

        // Husband Partnermonate (M11 to M14 - 4 months)
        if (m >= eg1Start && m <= eg1Start + 3) {
          husbandElterngeld = 150;
        }
        // Partnerschaftsbonus (M23 to M26)
        if (m >= eg1BonusStart && m <= eg1BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = 150;
          phaseLabel = 'Partnerschaftsbonus 1 (Both 24-32h)';
        } else {
          phaseLabel = 'Child 1 ElterngeldPlus (Part-Time)';
        }
      }
      // Child 2 Elterngeld
      else if (m >= eg2Start && m <= eg2BonusEnd) {
        wifeSalary = w5PT;
        if (m <= siblingBonusEndMonth) {
          hasSiblingBonus = true;
          wifeElterngeld = egPlusChild2WithSiblingB;
          phaseLabel = 'Child 2 EGPlus + Sibling Bonus (+10%)';
        } else {
          wifeElterngeld = baseEgPlusChild2B;
          phaseLabel = 'Child 2 EGPlus (Sibling Bonus Expired)';
        }

        // Husband Partnermonate (M38 to M41 - 4 months)
        if (m >= eg2Start && m <= eg2Start + 3) {
          husbandElterngeld = 150;
        }
        // Partnerschaftsbonus 2 (M50 to M53)
        if (m >= eg2BonusStart && m <= eg2BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = 150;
          phaseLabel = 'Partnerschaftsbonus 2 (Both 24-32h)';
        }
      }
      // Regular Part-Time working periods after birth
      else if (m > b1) {
        wifeSalary = w5PT;
        phaseLabel = 'Family Part-Time (Post-Leave)';
      }
      // Before Birth 1
      else {
        wifeSalary = w5FT;
        phaseLabel = 'Pre-Birth Full-Time';
      }
    } else if (scenarioKey === 'C') {
      // Scenario C: Fully Optimized with Proactive Tax Class Swaps

      // Kindergeld
      if (m >= b1) kindergeld += kgRate;
      if (m >= b2) kindergeld += kgRate;

      // Swap 1 Phase (M1 to M7)
      if (m >= swap1Start && m <= swap1End) {
        isSwapActive = true;
        husbandSalary = h5Net; // drops to V
        wifeSalary = w3FT; // boosts to III
        taxClassLabel = 'H: V | W: III (Swap 1)';
        phaseLabel = 'Swap 1 Active (7M Pre-Mutterschutz)';
      }
      // Pre-Birth Mutterschutz 1 (M8)
      else if (m === preM1) {
        isMutterschutz = true;
        isSwapActive = true;
        husbandSalary = h5Net;
        wifeSalary = 0;
        mutterschutz = w3FT; // 100% replacement of Class III FT!
        taxClassLabel = 'H: V | W: III (Pre-M1)';
        phaseLabel = 'Pre-Birth Mutterschutz 1 (Class III Net)';
      }
      // Post-Birth Mutterschutz 1 (M9, M10)
      else if (m === b1 || m === b1 + 1) {
        isMutterschutz = true;
        // Revert to Husband Class III / Wife Class V
        husbandSalary = h3Net;
        wifeSalary = 0;
        mutterschutz = w3FT; // Based on pre-birth Class III net!
        taxClassLabel = 'H: III | W: V (Reverted)';
        phaseLabel = 'Post-Birth Mutterschutz 1 (Maxed Benefit)';
      }
      // Child 1 Elterngeld (M11 to M26)
      else if (m >= eg1Start && m <= eg1BonusEnd) {
        husbandSalary = h3Net;
        wifeSalary = w5PT;
        wifeElterngeld = egPlusChild1C; // Capped at €900/mo under synthetic rule!
        taxClassLabel = 'H: III | W: V';

        // Husband Partnermonate (M11 to M14)
        if (m >= eg1Start && m <= eg1Start + 3) {
          husbandElterngeld = 150;
        }
        // Partnerschaftsbonus 1 (M23 to M26)
        if (m >= eg1BonusStart && m <= eg1BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = 150;
          phaseLabel = 'Partnerschaftsbonus 1 (W: €900 + H: €150)';
        } else {
          phaseLabel = 'Child 1 EGPlus (Synthetic Class III Maxed €900)';
        }
      }
      // Swap 2 Phase (M28 to M34)
      else if (m >= swap2Start && m <= swap2End) {
        isSwapActive = true;
        husbandSalary = h5Net; // drops to V
        wifeSalary = w3PT; // boosts to III Part-Time
        taxClassLabel = 'H: V | W: III (Swap 2)';
        phaseLabel = 'Swap 2 Active (7M Pre-Mutterschutz 2)';
      }
      // Pre-Birth Mutterschutz 2 (M35)
      else if (m === preM2) {
        isMutterschutz = true;
        isSwapActive = true;
        husbandSalary = h5Net;
        wifeSalary = 0;
        mutterschutz = w3PT; // 100% of Class III PT
        taxClassLabel = 'H: V | W: III (Pre-M2)';
        phaseLabel = 'Pre-Birth Mutterschutz 2 (Class III PT)';
      }
      // Post-Birth Mutterschutz 2 (M36, M37)
      else if (m === b2 || m === b2 + 1) {
        isMutterschutz = true;
        husbandSalary = h3Net;
        wifeSalary = 0;
        mutterschutz = w3PT;
        taxClassLabel = 'H: III | W: V (Reverted)';
        phaseLabel = 'Post-Birth Mutterschutz 2 (Maxed Benefit)';
      }
      // Child 2 Elterngeld (M38 to M53)
      else if (m >= eg2Start && m <= eg2BonusEnd) {
        husbandSalary = h3Net;
        wifeSalary = w5PT;
        taxClassLabel = 'H: III | W: V';

        if (m <= siblingBonusEndMonth) {
          hasSiblingBonus = true;
          wifeElterngeld = egPlusChild2WithSiblingC;
          phaseLabel = 'Child 2 EGPlus + Sibling Bonus (+10%)';
        } else {
          wifeElterngeld = baseEgPlusChild2C;
          phaseLabel = 'Child 2 EGPlus (Post-Sibling Bonus)';
        }

        // Husband Partnermonate (M38 to M41)
        if (m >= eg2Start && m <= eg2Start + 3) {
          husbandElterngeld = 150;
        }
        // Partnerschaftsbonus 2 (M50 to M53)
        if (m >= eg2BonusStart && m <= eg2BonusEnd) {
          isPartnerschaftsbonus = true;
          husbandElterngeld = 150;
          phaseLabel = 'Partnerschaftsbonus 2 (Both 24-32h)';
        }
      }
      // Gap or post-leave periods
      else if (m > b1) {
        husbandSalary = h3Net;
        wifeSalary = w5PT;
        phaseLabel = 'Family Part-Time (Post-Leave)';
      }
      // Default
      else {
        husbandSalary = h3Net;
        wifeSalary = w5FT;
        phaseLabel = 'Pre-Birth Full-Time';
      }

      // Annual Tax Reconciliation Refund (Finanzamt reconciliation):
      // Swap 1 refund realized at Month 12 (Year 1 annual tax return)
      if (m === 12) {
        const swap1MonthsCount = (preM1 - swap1Start + 1); // 7-8 months
        const monthlyWithholdingDeficit1 = (h3Net + w5FT) - (h5Net + w3FT); // €6,125 - €5,850 = €275
        taxRefund = swap1MonthsCount * monthlyWithholdingDeficit1;
      }
      // Swap 2 refund realized at Month 39 (Year 3/4 annual tax return)
      if (m === b2) {
        const swap2MonthsCount = (preM2 - swap2Start + 1); // 7-8 months
        const monthlyWithholdingDeficit2 = (h3Net + w5PT) - (h5Net + w3PT); // €5,355 - €4,820 = €535
        taxRefund = swap2MonthsCount * monthlyWithholdingDeficit2;
      }
    }

    const monthlyTotal = husbandSalary + wifeSalary + mutterschutz + wifeElterngeld + husbandElterngeld + kindergeld + taxRefund;
    const earnedSalaries = husbandSalary + wifeSalary;
    const stateBenefits = mutterschutz + wifeElterngeld + husbandElterngeld + kindergeld;

    cumulatedSalaries += earnedSalaries;
    cumulatedBenefits += stateBenefits;
    cumulatedTaxRefunds += taxRefund;
    cumulatedTotal += monthlyTotal;

    // Check special life event tags
    let eventTag = null;
    let eventType = null;
    if (m === 1) {
      eventTag = 'Start Vorbereitungsphase (3M vor Schwangerschaft)';
      eventType = 'planning';
    } else if (m === preg1Start && scenarioKey === 'C') {
      eventTag = 'Schwangerschaft 1 & Steuerklassenwechsel (H: V / W: III)';
      eventType = 'swap';
    } else if (m === preg1Start && scenarioKey !== 'A') {
      eventTag = 'Schwangerschaft 1 (Beginn)';
      eventType = 'preg';
    } else if (m === b1 && scenarioKey !== 'A') {
      eventTag = 'Geburt Kind 1';
      eventType = 'birth';
    } else if (m === preg2Start && scenarioKey !== 'A') {
      eventTag = 'Schwangerschaft 2 (18M Abstand)';
      eventType = 'preg';
    } else if (m === swap2Start && scenarioKey === 'C') {
      eventTag = 'Steuerklassenwechsel 2 (H: V / W: III)';
      eventType = 'swap';
    } else if (m === b2 && scenarioKey !== 'A') {
      eventTag = 'Geburt Kind 2';
      eventType = 'birth';
    } else if (m === siblingBonusEndMonth && scenarioKey !== 'A') {
      eventTag = 'Kind 1 vollendet 3. Lbj. (Geschwisterbonus endet)';
      eventType = 'bonus_end';
    }

    months.push({
      month: m,
      year: Math.ceil(m / 12),
      monthInYear: ((m - 1) % 12) + 1,
      husbandSalary,
      wifeSalary,
      mutterschutz,
      wifeElterngeld,
      husbandElterngeld,
      kindergeld,
      taxRefund,
      monthlyTotal,
      earnedSalaries,
      stateBenefits,
      cumulatedSalaries,
      cumulatedBenefits,
      cumulatedTaxRefunds,
      cumulatedTotal,
      taxClassLabel,
      phaseLabel,
      eventTag,
      eventType,
      isSwapActive,
      isMutterschutz,
      isPartnerschaftsbonus,
      hasSiblingBonus
    });
  }

  return {
    scenarioKey,
    months,
    summary: {
      totalSalaries: cumulatedSalaries,
      totalBenefits: cumulatedBenefits,
      totalTaxRefunds: cumulatedTaxRefunds,
      grandTotal: cumulatedTotal,
      totalMutterschutz: months.reduce((acc, m) => acc + m.mutterschutz, 0),
      totalWifeElterngeld: months.reduce((acc, m) => acc + m.wifeElterngeld, 0),
      totalHusbandElterngeld: months.reduce((acc, m) => acc + m.husbandElterngeld, 0),
      totalKindergeld: months.reduce((acc, m) => acc + m.kindergeld, 0),
    }
  };
}

// Computed results for all 3 scenarios
export const scenarioAData = computed(() => computeTimelineData('A'));
export const scenarioBData = computed(() => computeTimelineData('B'));
export const scenarioCData = computed(() => computeTimelineData('C'));

// Current active scenario data
export const currentScenarioData = computed(() => {
  const key = activeScenario.value;
  if (key === 'A') return scenarioAData.value;
  if (key === 'B') return scenarioBData.value;
  return scenarioCData.value;
});

// Comparison metrics (C vs B and C vs A)
export const comparisonMetrics = computed(() => {
  const a = scenarioAData.value.summary;
  const b = scenarioBData.value.summary;
  const c = scenarioCData.value.summary;

  return {
    gainCvsB: c.grandTotal - b.grandTotal,
    benefitsGainCvsB: c.totalBenefits - b.totalBenefits,
    taxRefundC: c.totalTaxRefunds,
    gainCvsA: c.grandTotal - a.grandTotal,
    wifeEgGainCvsB: c.totalWifeElterngeld - b.totalWifeElterngeld,
    mutterschutzGainCvsB: c.totalMutterschutz - b.totalMutterschutz
  };
});
