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
  activeLegalRuleKey,
  currentScenarioData,
  LegalRuleKey,
} from "#store/elterngeldStore";
import {
  LegalStatuteDocumentationIcon,
  OptimizationInsightIcon,
  CitationReferenceIcon,
  ExternalLegalSourceIcon,
  StatutorySectionIcon,
  SimulatorNavigationIcon,
} from "#components/Icons";

/**
 * Official External Legal Reference Link.
 */
interface LegalLink {
  /** Display label for the legal source. */
  readonly label: string;
  /** External HTTP URL to official legal statute or court precedent. */
  readonly url: string;
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
  /** External authoritative legal links. */
  readonly links: readonly LegalLink[];
}

export default function RulesExplainer(): JSX.Element {
  const current = currentScenarioData.value;
  const benefits = current.configuration?.benefitRules ?? DEFAULT_BENEFIT_RULES;
  const conventions = current.configuration?.timelineConventions ?? DEFAULT_TIMELINE_CONVENTIONS;
  const money = (value: number | undefined) => value === undefined ? "Unavailable" : new Intl.NumberFormat("de-DE", { style: "currency",
    currency: "EUR" }).format(value);
  const rules: readonly RuleItem[] = [
    {
      key: LegalRuleKey.BEEG_TaxSwap,
      title: "1. Tax Class and Assessment History",
      lawRef: "BEEG §§ 2b, 2c",
      tag: "§ 2c BEEG",
      summary: "The assessment follows actual eligible earnings months; a switch does not guarantee a maximum payment.",
      statutoryText: <p>The lookback selects {benefits.assessmentMonths.value} eligible calendar months, replacing statutory exclusion months with earlier history. Deduction characteristics are selected from earned-income months; a tax-class tie uses the most recent class. Missing history repeats the initial salary/class only as a labeled assumption. A later switch does not rewrite the frozen assessment.</p>,
      example: <ul>{(current.benefitAssessments ?? []).map((audit) => (
        <li key={`${audit.pregnancyId}-${audit.parent}`}>{audit.parent === TargetPerson.Husband ? "Father" : "Mother"}, birth {audit.birthMonthId}: class {audit.taxClass}, pre-birth standardized net {money(audit.preBirthNet)}; {audit.assumedMonths.length} assumed months. {audit.reason}</li>
      ))}</ul>,
      links: [
        { label: "Assessment period (§ 2b BEEG)",
          url: benefits.assessmentMonths.source,
          description: "Eligible months and statutory exclusions." },
        { label: "Tax-class selection (§ 2c BEEG)",
          url: "https://www.gesetze-im-internet.de/beeg/__2c.html",
          description: "Selection of deduction characteristics from the assessment history." },
        { label: "Federal explanation of a tax-class change",
          url: "https://familienportal.de/familienportal/familienleistungen/elterngeld/arbeitssituation/auf-welche-steuerklasse-kommt-es-fuer-die-berechnung-meines-elterngelds-an-wenn-ich-die-steuerklasse-gewechselt-habe--124670",
          description: "Current official guidance, including equal-duration classes." },
      ],
    },
    {
      key: LegalRuleKey.MuSchG_Maternity,
      title: "2. Maternity Protection and Reference Pay",
      lawRef: "MuSchG §§ 3, 19, 20; BEEG § 3",
      tag: "MuSchG",
      summary: "Calendar planning windows approximate statutory protection periods; reference pay comes from preceding wages.",
      statutoryText: <p>The plan uses {conventions.maternityPreBirthMonths.value} calendar month(s) before birth and {conventions.maternityPostBirthMonths.value} beginning with birth. These are editable planning assumptions, not statutory day counts. The modeled combined maternity payment averages {benefits.maternityAverageMonths.value} preceding calendar wages and remains fixed through the protection window. Actual birth dates, special protection extensions and payer-specific eligibility need separate information.</p>,
      example: <p>Modeled maternity cash in this scenario: {money(current.summary.totalMutterschutz)}. Missing reference wages repeat the initial baseline only as a disclosed assumption. Maternity payments offset the mother's ordinary allowance allocation.</p>,
      links: [
        { label: "Protection periods (§ 3 MuSchG)",
          url: conventions.maternityPreBirthMonths.statutoryContext,
          description: "Actual statutory periods and exceptions." },
        { label: "Employer supplement reference (§ 20 MuSchG)",
          url: benefits.maternityAverageMonths.source,
          description: "Reference earnings for the modeled payment." },
        { label: "Maternity offset (§ 3 BEEG)",
          url: "https://www.gesetze-im-internet.de/beeg/__3.html",
          description: "Crediting maternity payments against parental allowance." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_SyntheticNet,
      title: "3. Standardized Benefit Net and Personal Plus Ceiling",
      lawRef: "BEEG §§ 2, 2c–2f, 4a",
      tag: "BEEG net",
      summary: "Benefit assessment net differs from payroll take-home and uses each parent's own frozen history.",
      statutoryText: <p>Assessable pre-birth net is limited to {money(benefits.maximumAssessableNet.value)}. The configured sliding replacement rate applies to the income loss. Plus is capped at {benefits.plusFraction.value * 100}% of that parent's Basis amount without post-birth income; {money(benefits.basisMaximum.value * benefits.plusFraction.value)} is the general ceiling, not a promised payment. Earning Plus and partnership months share the relevant positive-income average. Tax characteristics stay frozen after birth.</p>,
      example: <p>The audit above records each parent's pre-birth net, post-birth average and actual payments. Missing required PAP snapshots or prior-year household income evidence leave affected benefits unavailable. Manual take-home values become unverified assessment estimates only after explicit opt-in.</p>,
      links: [
        { label: "Income loss, replacement and cap (§ 2 BEEG)",
          url: benefits.maximumAssessableNet.source,
          description: "Source-linked monetary and replacement parameters." },
        { label: "Standardized tax deductions (§ 2e BEEG)",
          url: "https://www.gesetze-im-internet.de/beeg/__2e.html",
          description: "BEEG tax deductions are separate from cash payroll." },
        { label: "Personal Plus ceiling (§ 4a BEEG)",
          url: benefits.plusFraction.source,
          description: "Plus ceiling and claim rules." },
      ],
    },
    {
      key: LegalRuleKey.EStG_TaxSplitting,
      title: "4. Signed Annual Joint Tax Settlement",
      lawRef: "EStG §§ 26b, 31, 32a, 32b, 36; SolzG",
      tag: "Annual tax",
      summary: "Credited tax minus supported annual liability can produce a refund or repayment.",
      statutoryText: <p>Complete calendar-year records aggregate actual gross, bonuses, deductible contributions, withholding and replacement benefits subject to progression. Joint assessment and the child-allowance comparison determine liability independently of withholding classes. Deductions reduce taxable income; they are not fixed cash refunds. Missing or unsupported tax details prevent a precise settlement.</p>,
      example: <ul>{(current.annualTaxRecords ?? []).map((record) => (
        <li key={record.calendarYear}>{record.calendarYear}: {money(record.assessment?.settlement)}; planned {record.settlementMonthId}, {record.scheduledMonthInHorizon ? "within" : "outside"} the cash period. {record.reasons.join(" ")}</li>
      ))}</ul>,
      links: [
        { label: "Joint assessment (§ 26b EStG)",
          url: "https://www.gesetze-im-internet.de/estg/__26b.html",
          description: "Joint-spouse assessment basis." },
        { label: "Progression (§ 32b EStG)",
          url: "https://www.gesetze-im-internet.de/estg/__32b.html",
          description: "Replacement benefits can affect the tax rate." },
        { label: "Credits and signed settlement (§ 36 EStG)",
          url: "https://www.gesetze-im-internet.de/estg/__36.html",
          description: "Tax payments are reconciled against assessed liability." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_PartnershipBonus,
      title: "5. Ordinary Parent Claims and Partnership Bonus",
      lawRef: "BEEG §§ 1, 4, 4a, 4b",
      tag: "Parent claims",
      summary: "Each parent needs their own income assessment, eligible hours and available claim budget.",
      statutoryText: <p>Ordinary Plus claims require hours no higher than {benefits.maximumWeeklyHours.value} per week. Partnership months require both parents within {benefits.partnershipMinimumHours.value}–{benefits.maximumWeeklyHours.value} hours for {benefits.partnershipMinimumMonths.value}–{benefits.partnershipMaximumMonths.value} consecutive months. Minimum duration and individual/family budgets also apply. The father's payment is not a universal minimum. Reallocation fills only unfulfilled requested months and cannot create extra claims.</p>,
      example: <p>This plan requests {conventions.partnershipBonusMonths.value} partnership calendar months per cohort. Actual modeled father payments total {money(current.summary.totalHusbandElterngeld)}; mother payments total {money(current.summary.totalWifeElterngeld)}. Availability and overlapping credits are shown in each payment audit.</p>,
      links: [
        { label: "Hours and eligibility (§ 1 BEEG)",
          url: benefits.maximumWeeklyHours.source,
          description: "Weekly-hours condition for ordinary claims." },
        { label: "Claim budgets (§ 4 BEEG)",
          url: benefits.familyBasisMonths.source,
          description: "Individual and combined claim limits." },
        { label: "Partnership bonus (§ 4b BEEG)",
          url: benefits.partnershipMinimumMonths.source,
          description: "Hours corridor and consecutive-month requirements." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_SiblingBonus,
      title: "6. Household Sibling Bonus",
      lawRef: "BEEG §§ 2a, 4a",
      tag: "Sibling bonus",
      summary: "Qualifying sibling ages affect an addition to a positive parental allowance.",
      statutoryText: <p>The configured addition is {benefits.siblingRate.value * 100}% with a Plus minimum addition of {money(benefits.siblingMinimumBasis.value * benefits.plusFraction.value)}. Ordinary age routes include another child younger than {benefits.siblingAgeLimitMonths.value} months, or at least {benefits.siblingMultipleMinimumCount.value} other children younger than {benefits.siblingMultipleAgeLimitMonths.value} months. The threshold birthday month is included in this calendar approximation. Disability routes need separate evidence. An ineligible base payment stays zero.</p>,
      example: <p>The scenario has {current.months.filter((month) => month.hasSiblingBonus).length} modeled months with a sibling addition. Missing preexisting-child ages can make the addition unavailable; no age is inferred from a child count.</p>,
      links: [
        { label: "Sibling addition and household conditions (§ 2a BEEG)",
          url: benefits.siblingMinimumBasis.source,
          description: "Official source for the configured bonus and age routes." },
        { label: "Plus treatment (§ 4a BEEG)",
          url: benefits.plusFraction.source,
          description: "Plus minimums and ceilings use the applicable fraction." },
      ],
    },
    {
      key: LegalRuleKey.BEEG_Child2Dilution,
      title: "7. Assessment for a Later Child",
      lawRef: "BEEG §§ 2b, 2c",
      tag: "Later birth",
      summary: "Every later birth gets a new history-based assessment; there is no fixed full-time/part-time blend.",
      statutoryText: <p>The lookback selects {benefits.assessmentMonths.value} eligible months before that birth and replaces maternity and eligible older-child benefit exclusions with earlier history. Older benefit exclusions use the configured {benefits.olderBenefitExclusionLifeMonths.value}-life-month window. Actual earnings and selected deduction characteristics determine the new basis. Denied older claims create no benefit-receipt exclusions; unknown receipt propagates uncertainty.</p>,
      example: <ul>{(current.benefitAssessments ?? []).filter((audit) => audit.parent === TargetPerson.Wife).map((audit) => (
        <li key={audit.pregnancyId}>Birth {audit.birthMonthId}: selected {audit.selectedMonths[0]}–{audit.selectedMonths.at(-1)}, {audit.excludedMonths.length} excluded and {audit.assumedMonths.length} assumed months; pre-birth net {money(audit.preBirthNet)}. {audit.reason}</li>
      ))}</ul>,
      links: [
        { label: "Assessment and exclusions (§ 2b BEEG)",
          url: benefits.olderBenefitExclusionLifeMonths.source,
          description: "Actual eligible history replaces fixed scenario blends." },
        { label: "Employment-income deductions (§ 2c BEEG)",
          url: "https://www.gesetze-im-internet.de/beeg/__2c.html",
          description: "History-based deduction characteristics." },
      ],
    },
    {
      key: LegalRuleKey.EStG_Kindergeld,
      title: "8. Child Benefit (Kindergeld § 66 EStG)",
      lawRef: "EStG § 66 & BKGG (Federal Child Benefit Act)",
      tag: "§ 66 EStG",
      summary:
        "Universal tax-free child benefit of €259 / month per child paid from birth until at least age 18.",
      statutoryText: (
        <div>
          <p>
            Under{" "}
            <strong>
              § 66 EStG and the Federal Child Benefit Act
              (*Bundeskindergeldgesetz - BKGG*)
            </strong>
            , families in Germany are entitled to monthly child benefit
            (*Kindergeld*):
          </p>
          <ul
            style={{
              paddingLeft: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <li>
              <strong>Standard Statutory Amount:</strong> Unified rate of{" "}
              <strong>259.00 € / month per child</strong> (effective from
              2025/2026 onwards).
            </li>
            <li>
              <strong>Tax Exemption & Entitlement:</strong> Paid completely
              tax-free by the Family Benefits Office (*Familienkasse*) directly
              into the parent\'s account from the calendar month of birth.
            </li>
            <li>
              <strong>Independent of Parental Allowance:</strong> Kindergeld is
              paid simultaneously alongside Elterngeld and does not reduce or
              offset parental allowance in any way.
            </li>
          </ul>
        </div>
      ),
      example: (
        <div
          style={{
            background: "var(--bg-surface-secondary)",
            padding: "14px",
            borderRadius: "var(--border-radius-sm)",
            border: "1px solid var(--border-subtle)",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "var(--color-primary)",
              marginBottom: "8px",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <SimulatorNavigationIcon size={13} />
            <span>Worked Numerical Example:</span>
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <div>• Child 1 born Month 17 $\rightarrow$ 259 € / mo.</div>
            <div>
              • Child 2 born Month 44 $\rightarrow$ 259 € + 259 € ={" "}
              <strong style={{ color: "var(--color-gain)" }}>
                518 € / month
              </strong>{" "}
              combined child benefit.
            </div>
            <div>
              • Total 60-Month Inflow: 44 months (Child 1) + 17 months (Child 2)
              ={" "}
              <strong style={{ color: "var(--color-gain)" }}>
                15.800 € total tax-free cash support
              </strong>
              .
            </div>
          </div>
        </div>
      ),
      links: [
        {
          label: "§ 66 EStG - Höhe des Kindergeldes",
          url: "https://www.gesetze-im-internet.de/estg/__66.html",
          description:
            "Statutory child benefit monthly amounts and entitlement age rules.",
        },
        {
          label: "Familienkasse der Bundesagentur für Arbeit",
          url: "https://www.arbeitsagentur.de/familie-und-kinder",
          description:
            "Official application portal and payout tables for German child benefit.",
        },
      ],
    },
  ];

  const activeKey = activeLegalRuleKey.value;
  const currentRule = rules.find((r) => r.key === activeKey) || rules[0];

  return (
    <div
      id="statutory-legal-framework"
      className="glass-panel"
      style={{
        padding: "26px",
        marginTop: "36px",
        marginBottom: "28px",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-md)",
        scrollMarginTop: "24px",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "16px",
        }}
      >
        <div style={{ display: "flex",
          alignItems: "center",
          gap: "12px" }}>
          <div
            style={{
              background: "var(--color-primary-bg)",
              padding: "10px",
              borderRadius: "var(--border-radius-sm)",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LegalStatuteDocumentationIcon size={24} />
          </div>
          <div>
            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Statutory Legal Framework &amp; Judicial Precedents
            </h3>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                margin: "3px 0 0 0",
              }}
            >
              Official German Civil, Social, and Fiscal Code references (*BEEG,
              MuSchG, EStG, BFH*) governing all simulator calculations.
            </p>
          </div>
        </div>

        <div
          className="badge-brand"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <StatutorySectionIcon size={13} />
          <span>{rules.length} Statutory Modules Active</span>
        </div>
      </div>

      {/* Main Grid: Sidebar Rule Selector + Detailed Rule Viewer */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 340px) 1fr",
          gap: "24px",
        }}
      >
        {/* Left: Interactive Rule List */}
        <div style={{ display: "flex",
          flexDirection: "column",
          gap: "8px" }}>
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
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: "var(--border-radius-sm)",
                  border: "1px solid",
                  borderColor: isSelected
                    ? "var(--color-primary)"
                    : "var(--border-subtle)",
                  background: isSelected
                    ? "var(--color-primary-bg)"
                    : "var(--bg-surface)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  borderLeft: isSelected
                    ? "4px solid var(--color-primary)"
                    : "1px solid var(--border-subtle)",
                  boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.84rem",
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected
                        ? "var(--color-primary)"
                        : "var(--text-primary)",
                    }}
                  >
                    {rule.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      background: isSelected
                        ? "var(--color-primary)"
                        : "var(--bg-surface-secondary)",
                      color: isSelected ? "#ffffff" : "var(--text-muted)",
                      border: "1px solid var(--border-subtle)",
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {rule.tag}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: isSelected
                      ? "var(--color-primary)"
                      : "var(--text-muted)",
                    marginTop: "4px",
                    lineHeight: 1.3,
                  }}
                >
                  {rule.lawRef}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Rich Interactive Document Pane */}
        <div
          style={{
            background: "var(--bg-surface)",
            padding: "24px",
            borderRadius: "var(--border-radius)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Header of Active Rule */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "14px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <span className="badge-brand">{currentRule.tag}</span>
                <h4
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {currentRule.title}
                </h4>
              </div>
              <div
                style={{
                  fontSize: "0.80rem",
                  color: "var(--color-primary)",
                  fontWeight: 600,
                }}
              >
                Statutory Authority: {currentRule.lawRef}
              </div>
            </div>

            <span className="badge-gain">Active in Simulator</span>
          </div>

          {/* 1. Legal Overview & Statutory Mandate */}
          <div>
            <div
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <LegalStatuteDocumentationIcon size={14} />
              <span>Statutory Mandate &amp; Legal Rule</span>
            </div>
            <div
              style={{
                fontSize: "0.86rem",
                lineHeight: 1.6,
                color: "var(--text-secondary)",
              }}
            >
              {currentRule.statutoryText}
            </div>
          </div>

          {/* 2. Concrete Worked Calculation Example */}
          <div>
            <div
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <OptimizationInsightIcon size={14} />
              <span>Real-World Simulation Example</span>
            </div>
            {currentRule.example}
          </div>

          {/* 3. Official Legislation & Government Links */}
          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "14px",
              marginTop: "6px",
            }}
          >
            <div
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <CitationReferenceIcon size={14} />
              <span>Official Legislation &amp; Government References</span>
            </div>
            <div
              style={{ display: "flex",
                flexDirection: "column",
                gap: "8px" }}
            >
              {currentRule.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "var(--border-radius-sm)",
                    background: "var(--bg-surface-secondary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--color-primary)",
                    textDecoration: "none",
                    fontSize: "0.78rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>
                      {link.label}
                    </strong>
                    <div
                      style={{
                        fontSize: "0.70rem",
                        color: "var(--text-muted)",
                        marginTop: "1px",
                      }}
                    >
                      {link.description}
                    </div>
                  </div>
                  <ExternalLegalSourceIcon size={12} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
