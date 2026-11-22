import type {
  JSX,
} from "preact";
import {
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  FormulaId,
} from "#engine/formulas/types";

/** Tab 5: Live Statutory Parameters (ParentalLeaveFocus) & Cross-Linked Statutory Rules Primer. */
export function RulesAndParametersTab(): JSX.Element {
  return (
    <>
      <div className="plw-prose">
        <p>
          Every highlighted statutory citation, technical term, constant, and formula below is{" "}
          <strong>live-linked</strong>: hover or click to inspect exact legal rules and follow cross-links without leaving your plan,
          or <code>Ctrl+Click</code> to open the dedicated reference page.
        </p>
        <p>
          <strong>Core Parental Allowance Rules:</strong> Monthly{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Topic,
            id: "parental-allowance" }}>Basiselterngeld</WikiRefLink>{" "}
          replaces typically 65%–67% of pre-birth assessment net (
          <WikiRefLink target={{ kind: WikiRefKind.Formula,
            id: FormulaId.ParentalWageReplacementRate }}>replacement formula</WikiRefLink>
          ), bounded between{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Parameter,
            id: ParameterId.Benefit_BasisMinimum }}>€300 min</WikiRefLink>{" "}
          and{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Parameter,
            id: ParameterId.Benefit_BasisMaximum }}>€1,800 max</WikiRefLink>{" "}
          under{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_2 }}>§ 2 BEEG</WikiRefLink>.{" "}
          Couples with combined prior-year taxable income (ZvE) above{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Parameter,
            id: ParameterId.Benefit_CoupleTaxableIncomeMaximum }}>€175,000</WikiRefLink>{" "}
          are excluded under{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_1 }}>§ 1 Abs. 8 BEEG</WikiRefLink>.
        </p>
        <p>
          <strong>Tax-Class Optimization &amp; Work Limits:</strong> Switching tax classes under{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>{" "}
          requires holding the favorable class in at least 7 of the 12 assessment months before{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Topic,
            id: "maternity-protection" }}>Mutterschutz</WikiRefLink>.{" "}
          Part-time work during allowance receipt is permitted up to{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Parameter,
            id: ParameterId.Benefit_MaximumWeeklyHours }}>32 h/wk</WikiRefLink>{" "}
          (
          <WikiRefLink target={{ kind: WikiRefKind.Formula,
            id: FormulaId.ParentalWeeklyHoursEligibility }}>hours eligibility</WikiRefLink>
          ), and having a young sibling unlocks the{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Parameter,
            id: ParameterId.Benefit_SiblingRate }}>+10% Geschwisterbonus</WikiRefLink>{" "}
          under{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_2a }}>§ 2a BEEG</WikiRefLink>.
        </p>
      </div>

      <ParameterObserverSection
        embedded
        projectionProfile={FormProjectionProfileId.ParentalLeaveFocus}
      />
    </>
  );
}
