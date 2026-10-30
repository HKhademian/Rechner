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
      title: "2. Maternity Protection & Wage Replacement",
      lawRef: "MuSchG § 3, § 19, § 20 & BEEG § 3 Para. 1",
      tag: "§ 3 MuSchG",
      summary:
        "100% net wage replacement; legally consumes parental allowance months 1 & 2.",
      statutoryText: (
        <div>
          <p>
            Under the{" "}
            <strong>
              Maternity Protection Act (*Mutterschutzgesetz - MuSchG*)
            </strong>
            , employed expectant mothers are placed on mandatory paid leave:
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
              <strong>Protection Windows:</strong> 6 weeks prior to the expected
              delivery date (§ 3 Abs. 1 MuSchG) and 8 weeks following delivery
              (§ 3 Abs. 2 MuSchG; 12 weeks for premature/multiple births).
            </li>
            <li>
              <strong>100% Wage Guarantee (§ 20 MuSchG):</strong> Statutory
              health insurance pays up to €13 / day (*Mutterschaftsgeld* under §
              19 MuSchG), and the employer is legally mandated to pay the
              employer supplement (*Arbeitgeberzuschuss*) ensuring 100% of the
              average net salary.
            </li>
            <li>
              <strong>Statutory Offset (§ 3 Abs. 1 BEEG):</strong> Months in
              which maternity allowance is drawn legally count as used Basic
              Elterngeld months for the mother, meaning regular ElterngeldPlus
              disbursements start in life month 3.
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
            <div>
              • Mother in Tax Class III earns{" "}
              <strong>2.603 € net / month</strong> prior to leave.
            </div>
            <div>
              • Health insurance pays: 13 € × 30 days = <strong>390 €</strong>{" "}
              (*Mutterschaftsgeld*).
            </div>
            <div>
              • Employer pays statutory supplement: 2.603 € - 390 € ={" "}
              <strong>2.420 €</strong>.
            </div>
            <div>
              • <strong>Total Inflow to Mother:</strong> Exactly{" "}
              <strong style={{ color: "var(--color-gain)" }}>
                2.603 € / month (100% net preservation)
              </strong>{" "}
              during all 3.5 months of protection.
            </div>
          </div>
        </div>
      ),
      links: [
        {
          label: "§ 3 MuSchG - Schutzfristen vor und nach der Entbindung",
          url: "https://www.gesetze-im-internet.de/muschg_2018/__3.html",
          description:
            "Statutory 6-week pre-birth and 8-week post-birth mandatory employment bans.",
        },
        {
          label: "§ 20 MuSchG - Zuschuss zum Mutterschaftsgeld",
          url: "https://www.gesetze-im-internet.de/muschg_2018/__20.html",
          description:
            "Employer obligation to top up maternity benefit to full previous average net salary.",
        },
      ],
    },
    {
      key: LegalRuleKey.BEEG_SyntheticNet,
      title: "3. Synthetic Net Principle (Fiktives Netto)",
      lawRef: "BEEG § 2e (Standardized Deductions) & § 4",
      tag: "§ 2e BEEG",
      summary:
        "Swapping back to Tax Class V post-birth does not reduce approved Elterngeld amounts.",
      statutoryText: (
        <div>
          <p>
            Under <strong>§ 2e BEEG</strong>, parental allowance is calculated
            using a{" "}
            <strong>
              standardized synthetic net income (*pauschaliertes Netto*)
            </strong>{" "}
            established strictly during the pre-birth assessment window.
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
              <strong>Fixed Rate Protection:</strong> Once the assessment
              baseline is established (e.g. 2.603 €), the statutory Elterngeld
              award is locked in for the entire benefit period.
            </li>
            <li>
              <strong>Post-Birth Tax Swap Immunity:</strong> Immediately
              swapping the mother back to Tax Class V (and the husband to Tax
              Class III) after birth does not reduce her locked-in Elterngeld
              amount.
            </li>
            <li>
              <strong>ElterngeldPlus Maximum Cap (§ 4 BEEG):</strong> Replaces
              65% of the post-birth earnings loss, subject to the absolute
              statutory monthly ceiling of <strong>900.00 € / month</strong>.
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
            <div>
              • Locked-in Pre-Birth Net (Tax Class III):{" "}
              <strong>2.603 €</strong>
            </div>
            <div>
              • Post-Birth Part-Time (24h in Tax Class V):{" "}
              <strong>1.254 €</strong>
            </div>
            <div>
              • Statutory Income Loss ($\Delta Net$): 2.603 € - 1.254 € ={" "}
              <strong>1.556 €</strong>
            </div>
            <div>
              • 65% Statutory Replacement: 1.556 € × 0.65 ={" "}
              <strong>1.011,40 €</strong> $\rightarrow$ Capped at{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                900.00 € / mo
              </strong>
              .
            </div>
            <div>
              • <strong>Total Mother Cash Inflow:</strong> 1.254 € (PT Net) +
              900 € (EG+) ={" "}
              <strong style={{ color: "var(--color-gain)" }}>
                2.154 € / month
              </strong>
              .
            </div>
          </div>
        </div>
      ),
      links: [
        {
          label: "§ 2e BEEG - Abzüge für Steuern und Sozialabgaben",
          url: "https://www.gesetze-im-internet.de/beeg/__2e.html",
          description:
            "Standardized lump-sum tax deductions and synthetic net formula under federal law.",
        },
        {
          label: "§ 4 BEEG - Art und Dauer des Bezugs (ElterngeldPlus)",
          url: "https://www.gesetze-im-internet.de/beeg/__4.html",
          description:
            "Statutory rules governing ElterngeldPlus entitlement and monthly benefit limits.",
        },
      ],
    },
    {
      key: LegalRuleKey.EStG_TaxSplitting,
      title: "4. Annual Marital Tax Splitting Reconciliation",
      lawRef: "EStG § 26, § 26b (Ehegatten-Splitting) & § 32a",
      tag: "§ 26b EStG",
      summary:
        "Excess wage tax withheld during the temporary swap period is 100% refunded via the annual tax return.",
      statutoryText: (
        <div>
          <p>
            Under <strong>§§ 26, 26b EStG (Income Tax Act)</strong>, married
            spouses filing jointly are taxed under the{" "}
            <strong>
              German Marital Splitting Tariff (*Splittingverfahren*)
            </strong>
            .
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
              <strong>Monthly Withholding vs. Final Tax Liability:</strong>{" "}
              Monthly tax classes (III/V vs IV/IV) represent only advance wage
              tax prepayments (*Lohnsteuervorauszahlung*). Final annual tax
              liability is computed strictly on combined household annual
              income.
            </li>
            <li>
              <strong>Mandatory Assessment (§ 46 EStG):</strong> Couples with
              III/V combinations are required by law to file an annual income
              tax return.
            </li>
            <li>
              <strong>Guaranteed Refund:</strong> Any temporary decrease in the
              husband's monthly salary while in Tax Class V is fully refunded by
              the Tax Office (*Finanzamt*) upon filing the annual return.
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
            <div>
              • Husband temporarily in Tax Class V: monthly salary reduced from
              2.895 € to 2.191 € (<strong>-995 € / mo</strong>).
            </div>
            <div>
              • Over 6 swap months in Year 1: excess withholding ={" "}
              <strong>5.970 €</strong>.
            </div>
            <div>
              • Annual Tax Return Reconciliation (§ 26b EStG) refund paid out in
              March:{" "}
              <strong style={{ color: "var(--color-gain)" }}>
                +2.800 € to +3.600 € lump-sum refund
              </strong>
              .
            </div>
            <div>
              • <strong>Net Result:</strong> Zero permanent payroll loss;
              maximum parental benefits achieved without tax penalties.
            </div>
          </div>
        </div>
      ),
      links: [
        {
          label: "§ 26b EStG - Zusammenveranlagung von Ehegatten",
          url: "https://www.gesetze-im-internet.de/estg/__26b.html",
          description:
            "Joint income tax assessment and marital splitting calculation under German income tax law.",
        },
        {
          label: "§ 32a EStG - Einkommensteuertarif & Splittingtabelle",
          url: "https://www.gesetze-im-internet.de/estg/__32a.html",
          description: "Progressive tariff curves and splitting formula.",
        },
      ],
    },
    {
      key: LegalRuleKey.BEEG_PartnershipBonus,
      title:
        "5. Parental Leave Allocation & Partnership Bonus (Partnerschaftsbonus)",
      lawRef: "BEEG § 4, § 4a, § 4b (Elterngeld & Partnership Bonus)",
      tag: "§ 4b BEEG",
      summary:
        "65% salary loss replacement; 2 full / 4 PT months (father) + 10 full / 20 PT months (mother) + 4 bonus months each (24–32h).",
      statutoryText: (
        <div>
          <p>
            Under <strong>§ 4, § 4a, and § 4b BEEG</strong>, parental allowance
            covers <strong>65% of the net salary drop</strong> (&Delta;Net =
            Pre-birth Net &minus; Post-birth Net) with a structured baseline
            allocation:
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
              <strong>Mother's Entitlement:</strong> 2 months covered by 100%
              statutory <em>Mutterschutz</em> (which consume 2 Base months) +{" "}
              <strong>10 full Basiselterngeld months</strong> (0h / week) OR{" "}
              <strong>20 half ElterngeldPlus months</strong> (&le; 32h / week).
            </li>
            <li>
              <strong>Father's Partner Months (§ 4 Abs. 3):</strong>{" "}
              <strong>2 full Basiselterngeld months</strong> (0h / week) OR{" "}
              <strong>4 half ElterngeldPlus months</strong> (&le; 32h / week).
            </li>
            <li>
              <strong>Partnership Bonus Exception (§ 4b BEEG):</strong>{" "}
              <strong>4 additional bonus months for EACH partner</strong> (4
              months for mother + 4 months for father = 8 bonus months total)
              when{" "}
              <strong>
                both partners work between 24 and 32 hours per week
                simultaneously
              </strong>{" "}
              in the same month!
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
            <span>Statutory Allocation &amp; Payout Example:</span>
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <div>
              • <strong>Mother:</strong> 20 ElterngeldPlus months (up to{" "}
              <strong>900 € / mo</strong>) + 4 Partnership Bonus months (
              <strong>900 € / mo</strong>) ={" "}
              <strong>24 ElterngeldPlus months</strong>.
            </div>
            <div>
              • <strong>Father:</strong> 4 ElterngeldPlus partner months (
              <strong>150 € / mo</strong>) + 4 Partnership Bonus months (
              <strong>150 € / mo</strong>) ={" "}
              <strong>8 ElterngeldPlus months</strong>.
            </div>
            <div>
              • 4 Partnership Bonus Months total payout: (900 € + 150 €) × 4
              months ={" "}
              <strong style={{ color: "var(--color-gain)" }}>
                +4.200 € total cash benefit
              </strong>
              .
            </div>
          </div>
        </div>
      ),
      links: [
        {
          label: "§ 4b BEEG - Partnerschaftsbonus",
          url: "https://www.gesetze-im-internet.de/beeg/__4b.html",
          description:
            "Statutory requirements for the 24–32 hour working corridor and 4 bonus months per parent.",
        },
        {
          label: "§ 4a BEEG - ElterngeldPlus",
          url: "https://www.gesetze-im-internet.de/beeg/__4a.html",
          description:
            "Conversion rule: 1 Basiselterngeld month = 2 ElterngeldPlus months while working up to 32h/week.",
        },
      ],
    },
    {
      key: LegalRuleKey.BEEG_SiblingBonus,
      title: "6. Sibling Bonus (Geschwisterbonus)",
      lawRef: "BEEG § 2a (Sibling Surcharge)",
      tag: "§ 2a BEEG",
      summary:
        "+10% surcharge on Child 2 Elterngeld until Child 1 turns 3 years old (36 months).",
      statutoryText: (
        <div>
          <p>
            Under <strong>§ 2a BEEG</strong>, parents with more than one young
            child living in the same household receive an automatic statutory
            surcharge on parental allowance:
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
              <strong>Eligibility Criterion:</strong> At least one older child
              under <strong>3 years of age (under 36 life months)</strong> lives
              in the household.
            </li>
            <li>
              <strong>Surcharge Calculation:</strong> +10% on top of the
              calculated parental allowance (with a guaranteed statutory minimum
              of <strong>+75 € / month for ElterngeldPlus</strong> or{" "}
              <strong>+150 € / month for Basic Elterngeld</strong>).
            </li>
            <li>
              <strong>Expiry Threshold:</strong> The bonus applies until the
              exact month the older child reaches their 36th life month.
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
            <div>
              • Child 2 ElterngeldPlus base entitlement:{" "}
              <strong>485,58 € / mo</strong>.
            </div>
            <div>
              • +10% Sibling Bonus surcharge (§ 2a BEEG):{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                +75.00 € / mo (statutory minimum)
              </strong>
              .
            </div>
            <div>
              • Total monthly Child 2 benefit: 485,58 € + 75,00 € ={" "}
              <strong style={{ color: "var(--color-gain)" }}>
                560,58 € / month
              </strong>{" "}
              until Child 1 turns 36 months.
            </div>
          </div>
        </div>
      ),
      links: [
        {
          label: "§ 2a BEEG - Geschwisterbonus und Mehrlingszuschlag",
          url: "https://www.gesetze-im-internet.de/beeg/__2a.html",
          description:
            "Official legislation for sibling and multiple-birth bonus surcharges.",
        },
      ],
    },
    {
      key: LegalRuleKey.BEEG_Child2Dilution,
      title: "7. Consecutive Child Assessment & Dilution Mitigation",
      lawRef: "BEEG § 2b Para. 1 & § 2b Para. 2 (Exclusion Periods)",
      tag: "§ 2b Abs. 1 BEEG",
      summary:
        "Avoiding the base rate trap on Child 2 through a timed secondary tax class swap.",
      statutoryText: (
        <div>
          <p>
            When having children in close succession, the assessment window for
            Child 2 consists of the{" "}
            <strong>
              12 calendar months prior to Child 2's maternity protection
            </strong>
            :
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
              <strong>The Dilution Trap (Scenario B):</strong> Because the
              mother worked part-time (24h) between births, her income is lower.
              If she remains in Tax Class V, the Elterngeld for Child 2
              collapses to the statutory minimum base rate of{" "}
              <strong>150 € / month</strong>.
            </li>
            <li>
              <strong>The Strategic Solution (Scenario C):</strong> Executing a
              timely second swap to Tax Class III during the intermediate
              part-time employment raises the assessment net salary to{" "}
              <strong>1.686 € / mo</strong>.
            </li>
            <li>
              <strong>Resulting Award:</strong> Child 2 ElterngeldPlus increases
              from 150 € / mo to{" "}
              <strong style={{ color: "var(--color-gain)" }}>
                560,58 € / mo
              </strong>{" "}
              (+8.211 € total extra benefit).
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "10px",
              fontSize: "0.78rem",
            }}
          >
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ color: "var(--color-loss)",
                fontWeight: 700 }}>
                Scenario B (No 2nd Swap)
              </div>
              <div>
                Part-Time Net (Class V): <strong>1.254 €</strong>
              </div>
              <div>
                Child 2 ElterngeldPlus:{" "}
                <strong style={{ color: "var(--color-loss)" }}>
                  150 € / mo (Min)
                </strong>
              </div>
              <div>
                Total 20-Mo Payout: <strong>3.000 €</strong>
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid var(--color-primary-border)",
              }}
            >
              <div style={{ color: "var(--color-gain)",
                fontWeight: 700 }}>
                Scenario C (2nd Swap to Class III)
              </div>
              <div>
                Part-Time Net (Class III): <strong>1.686 €</strong>
              </div>
              <div>
                Child 2 ElterngeldPlus:{" "}
                <strong style={{ color: "var(--color-primary)" }}>
                  560,58 € / mo
                </strong>
              </div>
              <div>
                Total 20-Mo Payout:{" "}
                <strong style={{ color: "var(--color-gain)" }}>
                  11.211 € (+8.211 € gain)
                </strong>
              </div>
            </div>
          </div>
        </div>
      ),
      links: [
        {
          label: "§ 2b BEEG - Bemessungszeitraum bei mehreren Kindern",
          url: "https://www.gesetze-im-internet.de/beeg/__2b.html",
          description:
            "Rules governing intermediate part-time work and exclusion periods for older siblings.",
        },
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
