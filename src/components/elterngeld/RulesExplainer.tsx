import "./ElterngeldPanels.css";
import {
  formatEurOrUnavailable,
} from "#utils/currencyFormat";
import {
  DEFAULT_TIMELINE_CONVENTIONS,
} from "#engine/config/timelineConventions";
import {
  TargetPerson,
} from "#engine/types";
import {
  DEFAULT_BENEFIT_RULES,
} from "#engine/config/benefitRules";
import type {
  JSX, 
} from "preact";
import {
  type LegalRuleKeyType,
  LEGAL_RULE_LAW_MAP,
  activeLegalRuleKey,
  currentScenarioData,
  LegalRuleKey,
} from "#store/elterngeldStore";
import {
  getLawGroupEntry,
} from "#engine/laws/registry";
import {
  type LawId as LawIdType,
  LawId,
} from "#engine/laws/types";
import LawRefLink from "#components/laws/LawRefLink";
import {
  LegalStatuteDocumentationIcon,
  OptimizationInsightIcon,
  CitationReferenceIcon,
  LawBenefitAdvantageIcon,
  LawAntiBenefitCaveatIcon,
  StatutorySectionIcon,
} from "#components/Icons";

/**
 * Typed Statutory Reference Pill inside RulesExplainer.
 */
interface TypedLawLink {
  /** Strongly-typed statutory LawId in the central Law Registry. */
  readonly lawId: LawIdType;
  /** Display label for the statutory reference. */
  readonly label: string;
  /** Contextual description of the citation. */
  readonly description: string;
}

/**
 * Statutory Legal Framework Rule Item Specification.
 */
interface RuleItem {
  /** Unique statutory rule key for deep-linking. */
  readonly key: LegalRuleKeyType;
  /** User-facing rule title. */
  readonly title: string;
  /** Formal law statute code reference (e.g. 'BEEG § 2b'). */
  readonly lawRef: string;
  /** Short badge tag. */
  readonly tag: string;
  /** Concise executive summary description. */
  readonly summary: string;
  /** Formatted statutory legal text and analysis. */
  readonly statutoryText: JSX.Element;
  /** Concrete financial scenario example. */
  readonly example: JSX.Element;
  /** Typed statutory references opening the unified Law Reference popup. */
  readonly links: readonly TypedLawLink[];
}

export default function RulesExplainer(): JSX.Element {
  const current = currentScenarioData.value;
  const benefits = current.configuration?.benefitRules ?? DEFAULT_BENEFIT_RULES;
  const conventions = current.configuration?.timelineConventions ?? DEFAULT_TIMELINE_CONVENTIONS;
  const money = (value: number | undefined) => formatEurOrUnavailable(value, 2);
  const rules: readonly RuleItem[] = [
    {
      key: LegalRuleKey.BEEG_TaxSwap,
      title: "1. Tax Class and Assessment History",
      lawRef: "§§ 2b, 2c BEEG",
      tag: "§ 2c BEEG",
      summary: "The assessment follows actual eligible earnings months; a switch does not guarantee a maximum payment.",
      statutoryText: <p>The lookback selects {benefits.assessmentMonths.value} eligible calendar months, replacing statutory exclusion months with earlier history. Deduction characteristics are selected from earned-income months; a tax-class tie uses the most recent class. Missing history repeats the initial salary/class only as a labeled assumption. A later switch does not rewrite the frozen assessment.</p>,
      example: <ul>{(current.benefitAssessments ?? []).map((audit) => (
        <li key={`${audit.pregnancyId}-${audit.parent}`}>{audit.parent === TargetPerson.Husband ? "Father" : "Mother"}, birth {audit.birthMonthId}: class {audit.taxClass}, pre-birth standardized net {money(audit.preBirthNet)}; {audit.assumedMonths.length} assumed months. {audit.reason}</li>
      ))}</ul>,
      links: [
        { lawId: LawId.BEEG_2b,
          label: "Assessment period (§ 2b BEEG)",
          description: "Eligible months and statutory exclusions." },
        { lawId: LawId.BEEG_2c,
          label: "Tax-class selection & Federal guidance (§ 2c BEEG)",
          description: "Selection of deduction characteristics from assessment history and tie-break guidance." },
        { lawId: LawId.EStG_38b,
          label: "Wage tax classes (§ 38b EStG)",
          description: "Statutory payroll deduction class definitions." },
      ],
    },
    {
      key: LegalRuleKey.MuSchG_Maternity,
      title: "2. Maternity Protection and Reference Pay",
      lawRef: "§§ 3, 19, 20 MuSchG; § 3 BEEG",
      tag: "MuSchG",
      summary: "Calendar planning windows approximate statutory protection periods; reference pay comes from preceding wages.",
      statutoryText: <p>The plan uses {conventions.maternityPreBirthMonths.value} calendar month(s) before birth and {conventions.maternityPostBirthMonths.value} beginning with birth. These are editable planning assumptions, not statutory day counts. The modeled combined maternity payment averages {benefits.maternityAverageMonths.value} preceding calendar wages and remains fixed through the protection window. Actual birth dates, special protection extensions and payer-specific eligibility need separate information.</p>,
      example: <p>Modeled maternity cash in this scenario: {money(current.summary.totalMutterschutz)}. Missing reference wages repeat the initial baseline only as a disclosed assumption. Maternity payments offset the mother's ordinary allowance allocation.</p>,
      links: [
        { lawId: LawId.MuSchG_3,
          label: "Protection periods (§ 3 MuSchG)",
          description: "Actual statutory periods and exceptions." },
        { lawId: LawId.MuSchG_20,
          label: "Employer supplement reference (§ 20 MuSchG)",
          description: "Reference earnings for the modeled payment." },
        { lawId: LawId.BEEG_3,
          label: "Maternity offset (§ 3 BEEG)",
          description: "Crediting maternity payments against parental allowance." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_SyntheticNet,
      title: "3. Standardized Benefit Net and Personal Plus Ceiling",
      lawRef: "§§ 2, 2c–2f, 4a BEEG",
      tag: "BEEG net",
      summary: "Benefit assessment net differs from payroll take-home and uses each parent's own frozen history.",
      statutoryText: <p>Assessable pre-birth net is limited to {money(benefits.maximumAssessableNet.value)}. The configured sliding replacement rate applies to the income loss. Plus is capped at {benefits.plusFraction.value * 100}% of that parent's Basis amount without post-birth income; {money(benefits.basisMaximum.value * benefits.plusFraction.value)} is the general ceiling, not a promised payment. Earning Plus and partnership months share the relevant positive-income average. Tax characteristics stay frozen after birth.</p>,
      example: <p>The audit above records each parent's pre-birth net, post-birth average and actual payments. Missing required PAP snapshots or prior-year household income evidence leave affected benefits unavailable. Manual take-home values become unverified assessment estimates only after explicit opt-in.</p>,
      links: [
        { lawId: LawId.BEEG_2,
          label: "Income loss, replacement and cap (§ 2 BEEG)",
          description: "Source-linked monetary and replacement parameters." },
        { lawId: LawId.BEEG_2e,
          label: "Standardized tax deductions (§ 2e BEEG)",
          description: "BEEG tax deductions are separate from cash payroll." },
        { lawId: LawId.BEEG_2f,
          label: "Standardized social deductions (§ 2f BEEG)",
          description: "Flat 9%/10%/2% social insurance deductions." },
        { lawId: LawId.BEEG_4a,
          label: "Personal Plus ceiling (§ 4a BEEG)",
          description: "Plus ceiling and claim rules." },
      ],
    },
    {
      key: LegalRuleKey.EStG_TaxSplitting,
      title: "4. Signed Annual Joint Tax Settlement",
      lawRef: "§§ 26b, 31, 32a, 32b, 36 EStG; SolzG",
      tag: "Annual tax",
      summary: "Credited tax minus supported annual liability can produce a refund or repayment.",
      statutoryText: <p>Complete calendar-year records aggregate actual gross, bonuses, deductible contributions, withholding and replacement benefits subject to progression. Joint assessment and the child-allowance comparison determine liability independently of withholding classes. Deductions reduce taxable income; they are not fixed cash refunds. Missing or unsupported tax details prevent a precise settlement.</p>,
      example: <ul>{(current.annualTaxRecords ?? []).map((record) => (
        <li key={record.calendarYear}>{record.calendarYear}: {money(record.assessment?.settlement)}; planned {record.settlementMonthId}, {record.scheduledMonthInHorizon ? "within" : "outside"} the cash period. {record.reasons.join(" ")}</li>
      ))}</ul>,
      links: [
        { lawId: LawId.EStG_26b,
          label: "Joint assessment (§ 26b EStG)",
          description: "Joint-spouse assessment basis." },
        { lawId: LawId.EStG_32b,
          label: "Progression (§ 32b EStG)",
          description: "Replacement benefits can affect the tax rate." },
        { lawId: LawId.EStG_36,
          label: "Credits and signed settlement (§ 36 EStG)",
          description: "Tax payments are reconciled against assessed liability." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_PartnershipBonus,
      title: "5. Ordinary Parent Claims and Partnership Bonus",
      lawRef: "§§ 1, 4, 4a, 4b BEEG",
      tag: "Parent claims",
      summary: "Each parent needs their own income assessment, eligible hours and available claim budget.",
      statutoryText: <p>Ordinary Plus claims require hours no higher than {benefits.maximumWeeklyHours.value} per week. Partnership months require both parents within {benefits.partnershipMinimumHours.value}–{benefits.maximumWeeklyHours.value} hours for {benefits.partnershipMinimumMonths.value}–{benefits.partnershipMaximumMonths.value} consecutive months. Minimum duration and individual/family budgets also apply. The father's payment is not a universal minimum. Reallocation fills only unfulfilled requested months and cannot create extra claims.</p>,
      example: <p>This plan requests {conventions.partnershipBonusMonths.value} partnership calendar months per cohort. Actual modeled father payments total {money(current.summary.totalHusbandElterngeld)}; mother payments total {money(current.summary.totalWifeElterngeld)}. Availability and overlapping credits are shown in each payment audit.</p>,
      links: [
        { lawId: LawId.BEEG_1,
          label: "Hours and eligibility (§ 1 BEEG)",
          description: "Weekly-hours condition for ordinary claims." },
        { lawId: LawId.BEEG_4,
          label: "Claim budgets (§ 4 BEEG)",
          description: "Individual and combined claim limits." },
        { lawId: LawId.BEEG_4b,
          label: "Partnership bonus (§ 4b BEEG)",
          description: "Hours corridor and consecutive-month requirements." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_SiblingBonus,
      title: "6. Household Sibling Bonus",
      lawRef: "§§ 2a, 4a BEEG",
      tag: "Sibling bonus",
      summary: "Qualifying sibling ages affect an addition to a positive parental allowance.",
      statutoryText: <p>The configured addition is {benefits.siblingRate.value * 100}% with a Plus minimum addition of {money(benefits.siblingMinimumBasis.value * benefits.plusFraction.value)}. Ordinary age routes include another child younger than {benefits.siblingAgeLimitMonths.value} months, or at least {benefits.siblingMultipleMinimumCount.value} other children younger than {benefits.siblingMultipleAgeLimitMonths.value} months. The threshold birthday month is included in this calendar approximation. Disability routes need separate evidence. An ineligible base payment stays zero.</p>,
      example: <p>The scenario has {current.months.filter((month) => month.hasSiblingBonus).length} modeled months with a sibling addition. Missing preexisting-child ages can make the addition unavailable; no age is inferred from a child count.</p>,
      links: [
        { lawId: LawId.BEEG_2a,
          label: "Sibling addition and household conditions (§ 2a BEEG)",
          description: "Official source for the configured bonus and age routes." },
        { lawId: LawId.BEEG_4a,
          label: "Plus treatment (§ 4a BEEG)",
          description: "Plus minimums and ceilings use the applicable fraction." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_Child2Dilution,
      title: "7. Assessment for a Later Child",
      lawRef: "§§ 2b, 2c BEEG",
      tag: "Later birth",
      summary: "Every later birth gets a new history-based assessment; there is no fixed full-time/part-time blend.",
      statutoryText: <p>The lookback selects {benefits.assessmentMonths.value} eligible months before that birth and replaces maternity and eligible older-child benefit exclusions with earlier history. Older benefit exclusions use the configured {benefits.olderBenefitExclusionLifeMonths.value}-life-month window. Actual earnings and selected deduction characteristics determine the new basis. Denied older claims create no benefit-receipt exclusions; unknown receipt propagates uncertainty.</p>,
      example: <ul>{(current.benefitAssessments ?? []).filter((audit) => audit.parent === TargetPerson.Wife).map((audit) => (
        <li key={audit.pregnancyId}>Birth {audit.birthMonthId}: selected {audit.selectedMonths[0]}–{audit.selectedMonths.at(-1)}, {audit.excludedMonths.length} excluded and {audit.assumedMonths.length} assumed months; pre-birth net {money(audit.preBirthNet)}. {audit.reason}</li>
      ))}</ul>,
      links: [
        { lawId: LawId.BEEG_2b,
          label: "Assessment and exclusions (§ 2b BEEG)",
          description: "Actual eligible history replaces fixed scenario blends." },
        { lawId: LawId.BEEG_2c,
          label: "Employment-income deductions (§ 2c BEEG)",
          description: "History-based deduction characteristics." },
      ],
    },
    {
      key: LegalRuleKey.EStG_Kindergeld,
      title: "8. Configured Child Benefit",
      lawRef: "§§ 62–66 EStG",
      tag: "Kindergeld",
      summary: "Modeled qualifying children receive the supplied monthly planning rate.",
      statutoryText: <p>Each month multiplies the modeled qualifying child count by the supplied rate. The rate is held through the forecast and should be checked for the applicable year. Existing children are assumed to qualify; age, education and other entitlement conditions need personal evidence. The annual tax child-allowance comparison uses the applicable statutory profile separately.</p>,
      example: <p>Supplied per-child monthly rate: {money(current.months[0]?.kindergeldDetails?.monthlyPerChild)}. Modeled cash over the visible period: {money(current.summary.totalKindergeld)}. Each monthly explanation retains its actual count, rate and source.</p>,
      links: [
        { lawId: LawId.EStG_66,
          label: "Monthly amount (§ 66 EStG)",
          description: "Official amount for checking the supplied planning input." },
        { lawId: LawId.EStG_62,
          label: "Entitlement (§ 62 EStG)",
          description: "Child-benefit entitlement has additional personal conditions." },
        { lawId: LawId.EStG_31,
          label: "Tax-allowance favorability check (§ 31 EStG)",
          description: "Günstigerprüfung netting between Kindergeld and Kinderfreibetrag." },
      ],
    },
  ];

  const activeKey = activeLegalRuleKey.value;
  const currentRule = rules.find((r) => r.key === activeKey) || rules[0];
  const currentMapping = LEGAL_RULE_LAW_MAP[currentRule.key];
  const currentGroup = getLawGroupEntry(currentMapping.groupId);

  return (
    <div id="statutory-legal-framework" className="ui-card eg-rules">
      <div className="eg-rules__header">
        <div className="eg-rules__title-wrap">
          <div className="eg-rules__icon">
            <LegalStatuteDocumentationIcon size={22} />
          </div>
          <div>
            <h3 className="eg-rules__title">
              Statutory Legal Framework &amp; Judicial Precedents
            </h3>
            <p className="eg-rules__subtitle">
              Source-linked BEEG, MuSchG and EStG references for the supported
              planning model, with actual scenario audit values.
            </p>
          </div>
        </div>

        <span className="badge-brand">
          <StatutorySectionIcon size={13} />
          <span>{rules.length} Statutory Modules Active</span>
        </span>
      </div>

      <div className="eg-rules__layout">
        <div className="eg-rules__nav">
          {rules.map((rule) => {
            const isSelected = rule.key === currentRule.key;
            return (
              <button
                key={rule.key}
                id={`legal-nav-${rule.key}`}
                onClick={() => {
                  activeLegalRuleKey.value = rule.key;
                }}
                type="button"
                className={`eg-rules__nav-btn${isSelected ? " is-selected" : ""}`}
              >
                <div className="eg-rules__nav-top">
                  <span className="eg-rules__nav-title">{rule.title}</span>
                  <span className="eg-rules__nav-tag">{rule.tag}</span>
                </div>
                <div className="eg-rules__nav-ref">{rule.lawRef}</div>
              </button>
            );
          })}
        </div>

        <div className="eg-rules__pane">
          <div className="eg-rules__pane-head">
            <div>
              <div className="eg-rules__pane-title-row">
                <span className="badge-brand">{currentRule.tag}</span>
                <h4 className="eg-rules__pane-title">{currentRule.title}</h4>
              </div>
              <div className="eg-rules__authority">
                <span>Statutory Authority:</span>
                <LawRefLink
                  lawId={currentMapping.lawId}
                  groupId={currentGroup.id}
                  label={currentRule.lawRef}
                  variant="badge"
                />
              </div>
            </div>

            <span className="badge-gain">Active in Simulator</span>
          </div>

          {(currentGroup.benefit || currentGroup.antiBenefit) && (
            <div className="eg-rules__callouts">
              {currentGroup.benefit && (
                <div className="eg-rules__callout eg-rules__callout--gain">
                  <div className="eg-rules__callout-head">
                    <LawBenefitAdvantageIcon size={13} />
                    <span>Benefit</span>
                  </div>
                  <span>{currentGroup.benefit}</span>
                </div>
              )}
              {currentGroup.antiBenefit && (
                <div className="eg-rules__callout eg-rules__callout--warn">
                  <div className="eg-rules__callout-head">
                    <LawAntiBenefitCaveatIcon size={13} />
                    <span>Caveat / Anti-Benefit</span>
                  </div>
                  <span>{currentGroup.antiBenefit}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="eg-rules__section-heading">
              <LegalStatuteDocumentationIcon size={14} />
              <span>Statutory Mandate &amp; Legal Rule</span>
            </div>
            <div className="eg-rules__prose">{currentRule.statutoryText}</div>
          </div>

          <div>
            <div className="eg-rules__section-heading">
              <OptimizationInsightIcon size={14} />
              <span>Real-World Simulation Example</span>
            </div>
            <div className="eg-rules__prose">{currentRule.example}</div>
          </div>

          <div className="eg-rules__links-section">
            <div className="eg-rules__section-heading">
              <CitationReferenceIcon size={14} />
              <span>Statutory Sections &amp; External Official Sources</span>
            </div>
            <div className="eg-rules__link-list">
              {currentRule.links.map((link) => (
                <div key={link.lawId} className="eg-rules__link-item">
                  <LawRefLink
                    lawId={link.lawId}
                    groupId={currentGroup.id}
                    label={link.label}
                  />
                  <div className="eg-rules__link-desc">{link.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
