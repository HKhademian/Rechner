import "./ReferencePages.css";
import {
  ParameterValue,
} from "#components/reference/ParameterValue";
import type {
  JSX,
} from "preact";
import {
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  AppShell,
} from "#components/ui/AppShell";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  STATUTORY_FORMULA_DESCRIPTORS,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  FormulaId,
} from "#engine/formulas/types";
import {
  getParameterDefinition,
} from "#engine/parameters/registry";
import {
  type ParameterId,
  PARAMETER_MUTABILITY_LABELS,
} from "#engine/parameters/types";
import {
  useEffect,
} from "preact/hooks";
import {
  setParameterDomainFilter,
  setParameterMutabilityFilter,
  setParameterSearchQuery,
} from "#store/parameterStore";

export const REFERENCE_FORMULAS = [FormulaId.AnnualIncomeTaxTariff, FormulaId.SpousalSplittingIncomeTax, FormulaId.ParentalAllowanceEntitlement, FormulaId.ParentalWageReplacementRate] as const;

export function FormulaDirectory(): JSX.Element {
  return <AppShell currentPath={sitePath("/formulas/")}><div className="reference-page">
    <h1>Formulas</h1>
    <p>How selected calculations work.</p>
    <ul>{REFERENCE_FORMULAS.map((id) => <li key={id}><a href={sitePath(`/formulas/${id}/`)}>{STATUTORY_FORMULA_DESCRIPTORS[id].label}</a></li>)}</ul>
  </div></AppShell>;
}

export function FormulaPage({ id }: { readonly id: typeof REFERENCE_FORMULAS[number] }): JSX.Element {
  const formula = STATUTORY_FORMULA_DESCRIPTORS[id];
  return <AppShell currentPath={sitePath("/formulas/")}><div className="reference-page">
    <a href={sitePath("/formulas/")}>All formulas</a>
    <h1>{formula.label}</h1>
    <p>{formula.description}</p>
    {id === FormulaId.ParentalWageReplacementRate
      ? <section><h2>Calculation</h2><p>Let x be monthly pre-birth net income. The model uses these ranges:</p><ul>
        <li>At or below zero: <code>rate = standard rate</code></li>
        <li>Below the low-income threshold: <code>rate = min(maximum rate, standard rate + (threshold − x) × change per euro)</code></li>
        <li>From the low-income threshold through the decrease threshold: <code>rate = standard rate</code></li>
        <li>Above the decrease threshold and below the minimum-rate threshold: <code>rate = max(minimum rate, standard rate − (x − decrease threshold) × change per euro)</code></li>
        <li>At or above the minimum-rate threshold: <code>rate = minimum rate</code></li>
      </ul><p><a href={sitePath(`/formulas/${FormulaId.ParentalAllowanceEntitlement}/`)}>How the benefit uses this rate</a></p></section>
      : id === FormulaId.ParentalAllowanceEntitlement
        ? <section><h2>Calculation</h2><p>For an eligible parent, the model uses monthly income:</p><ul>
          <li><code>assessable income = min(pre-birth net, income cap)</code></li>
          <li><code>income loss = max(0, assessable income − part-time net)</code></li>
          <li><code>raw benefit = income loss × replacement rate</code></li>
          <li><code>Basiselterngeld = min(maximum, max(minimum, raw benefit))</code></li>
          <li><code>ElterngeldPlus = min(personal ceiling, max(Plus minimum, raw benefit))</code></li>
        </ul><p>The personal ceiling is the no-part-time Basis amount multiplied by the Plus fraction. The Plus minimum is the Basis minimum multiplied by the same fraction. The <a href={sitePath(`/formulas/${FormulaId.ParentalWageReplacementRate}/`)}>replacement rate</a> depends on pre-birth net income.</p><p>Working more than the hours limit makes this calculation zero. Other eligibility rules, bonuses and offsets are handled separately.</p></section>
        : id === FormulaId.SpousalSplittingIncomeTax
          ? <section><h2>Calculation</h2><p><code>tax = 2 × tariff(max(0, income₁ + income₂) / 2)</code></p><p>The tariff floors its income and result to whole euros. This models annual assessed income tax, not monthly payroll withholding.</p><p><a href={sitePath(`/formulas/${FormulaId.AnnualIncomeTaxTariff}/`)}>Income tax tariff</a></p></section>
          : <section><h2>Calculation</h2><p>Let x be taxable income, floored to whole euros and at least zero. The applicable zone uses the thresholds and coefficients below.</p><ul>
            <li>Up to the basic allowance: <code>tax = 0</code></li>
            <li>First progression zone: <code>tax = (a × y + b) × y</code>, where <code>y = (x − basic allowance) / divisor</code></li>
            <li>Second progression zone: <code>tax = (c × z + d) × z + offset</code>, where <code>z = (x − first zone ceiling) / divisor</code></li>
            <li>Higher zones: <code>tax = rate × x − offset</code></li>
          </ul><p>In the first zone, a and b are the first-zone quadratic and linear coefficients. In the second, c and d are the second-zone quadratic and linear coefficients; its offset is the second-zone constant. Each higher zone has its own rate and offset.</p><p>The result is floored to whole euros and cannot be negative. This is annual assessed income tax, not monthly payroll withholding.</p></section>}
    <section><h2>Rates and thresholds</h2><ul>{formula.consumedParameterIds.map((parameterId) => <li key={parameterId}><a href={sitePath(`/constants/${parameterId}/`)}>{getParameterDefinition(parameterId).label}</a></li>)}</ul></section>
    <section><h2>Related topics</h2><ul>{(id === FormulaId.ParentalAllowanceEntitlement || id === FormulaId.ParentalWageReplacementRate) ? <li><a href={sitePath("/topics/parental-allowance/")}>Parental allowance</a></li> : <li><a href={sitePath("/topics/taxable-income/")}>Taxable income</a></li>}{id === FormulaId.SpousalSplittingIncomeTax && <li><a href={sitePath("/topics/joint-assessment/")}>Joint assessment</a></li>}</ul></section>
    <section><h2>Law</h2><ul>{formula.governingLawIds.map((lawId) => <li key={lawId}><LawRefLink lawId={lawId} /></li>)}</ul></section>
  </div></AppShell>;
}

export function ConstantDirectory(): JSX.Element {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q") ?? "";
    setParameterDomainFilter(undefined);
    setParameterMutabilityFilter(undefined);
    setParameterSearchQuery(query);
  }, []);
  return <AppShell currentPath={sitePath("/constants/")}><div className="reference-page">
    <h1>Rates and assumptions</h1>
    <p>Inspect values by year and adjust eligible assumptions.</p>
    <ParameterObserverSection defaultExpanded embedded />
  </div></AppShell>;
}

export function ConstantPage({ id }: { readonly id: ParameterId }): JSX.Element {
  const parameter = getParameterDefinition(id);
  const formulas = REFERENCE_FORMULAS.filter((formulaId) => STATUTORY_FORMULA_DESCRIPTORS[formulaId].consumedParameterIds.includes(id));
  return <AppShell currentPath={sitePath("/constants/")}><div className="reference-page">
    <a href={sitePath("/constants/")}>All rates and assumptions</a>
    <h1>{parameter.label}</h1><p>{parameter.description}</p>
    <p>{PARAMETER_MUTABILITY_LABELS[parameter.mutability]}</p>
    <ParameterValue id={id} />
    {parameter.lawIds.length > 0 && <section><h2>Law</h2><ul>{parameter.lawIds.map((lawId) => <li key={lawId}><LawRefLink lawId={lawId} /></li>)}</ul></section>}
    {formulas.length > 0 && <section><h2>Formulas</h2><ul>{formulas.map((formulaId) => <li key={formulaId}><a href={sitePath(`/formulas/${formulaId}/`)}>{STATUTORY_FORMULA_DESCRIPTORS[formulaId].label}</a></li>)}</ul></section>}
  </div></AppShell>;
}
