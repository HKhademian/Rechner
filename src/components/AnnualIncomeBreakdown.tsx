import "./AnnualIncomeBreakdown.css";
import {
  type JSX,
} from "preact";
import {
  type EuroAmount,
  toEuroAmount,
} from "#engine/types";
import {
  type TaxRules,
} from "#engine/tax/taxRules";
import {
  type computeAnnualEmploymentTaxBase,
  type computeIndividualEmploymentTaxBase,
} from "#engine/tax/annualEmploymentIncome";

type IncomeContribution = ReturnType<typeof computeIndividualEmploymentTaxBase>["income"];
type TaxBase = Pick<ReturnType<typeof computeAnnualEmploymentTaxBase>, "pensionDeduction" | "insuranceDeduction" | "specialExpenses" | "taxableIncome">;

export interface AnnualIncomeBreakdownProps {
  readonly people: readonly { readonly label: string;
    readonly income?: IncomeContribution }[];
  readonly base?: TaxBase;
  readonly profile?: TaxRules;
}

function money(amount: EuroAmount | undefined): string {
  return amount === undefined ? "Unavailable" : new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Use the same contribution and deduction presentation for annual records and salary inputs. */
export default function AnnualIncomeBreakdown({ people, base, profile }: AnnualIncomeBreakdownProps): JSX.Element {
  const joint = people.length > 1;
  const combined = people.every((person) => person.income !== undefined)
    ? toEuroAmount(people.reduce((sum, person) => sum + person.income!.employmentIncome, 0))
    : undefined;
  return (
    <>
      <div className="annual-income__result">
        <h3>Income after modeled deductions</h3>
        <p className="annual-income__amount">{money(base?.taxableIncome)}</p>
        <p className="annual-income__caption">{base
          ? "After the deductible pension, insurance and expense amounts modeled below. Before child allowances and further personal adjustments needed to determine final taxable income (zvE)."
          : "See the unavailable-evidence details below."}</p>
        <p className="annual-income__caption"><a href="https://www.kfw.de/PDF/Download-Center/F%C3%B6rderprogramme-(Inlandsf%C3%B6rderung)/PDF-Dokumente/6000005060_M_300_WEF.pdf" target="_blank" rel="noreferrer">KfW 300 income evidence</a>{" · "}KfW uses the taxable income recorded on the relevant tax-assessment notices.</p>
      </div>
      <h3 className="annual-income__steps-heading">How the estimate is built</h3>
      <div className={`annual-income__partners${joint ? "" : " annual-income__partners--single"}`}>
        {people.map(({ label, income }) => (
          <div className="annual-income__card" key={label}>
            <h3>{label}</h3>
            <p className="annual-income__amount">{money(income?.employmentIncome)}</p>
            <p className="annual-income__caption">Employment income before {joint ? "shared" : "annual"} deductions</p>
            {income && (
              <dl>
                <div><dt>Annual gross, including bonuses</dt><dd>{money(income.gross)}</dd></div>
                <div><dt>{profile ? <a href={profile.parameters.workExpenseAllowance.source} target="_blank" rel="noreferrer">Work expenses</a> : "Work expenses"}</dt><dd>− {money(income.workExpenses)}</dd></div>
              </dl>
            )}
          </div>
        ))}
        {joint && <div className="annual-income__card annual-income__combined">
          <h3>Combined employment income</h3>
          <p className="annual-income__amount">{money(combined)}</p>
          <p className="annual-income__caption">Sum of both partners, before shared deductions</p>
        </div>}
      </div>
      {base ? (
        <div className="annual-income__joint">
          <h3>{joint ? "Joint assessment" : "Individual assessment"}</h3>
          <dl>
            <div><dt>{joint ? "Combined employment income" : "Employment income"}</dt><dd>{money(combined)}</dd></div>
            <div><dt>{profile ? <a href={profile.parameters.pensionDeductibleFraction.source} target="_blank" rel="noreferrer">Deductible pension contributions</a> : "Deductible pension contributions"}</dt><dd>− {money(base.pensionDeduction)}</dd></div>
            <div><dt>{profile ? <a href={profile.parameters.healthDeductibleFraction.source} target="_blank" rel="noreferrer">Deductible health, care and other insurance</a> : "Deductible health, care and other insurance"}</dt><dd>− {money(base.insuranceDeduction)}</dd></div>
            <div><dt>{profile ? <a href={profile.parameters.specialExpenseAllowance.source} target="_blank" rel="noreferrer">Special-expense allowance</a> : "Special-expense allowance"}</dt><dd>− {money(base.specialExpenses)}</dd></div>
            <div className="annual-income__total"><dt>{joint ? "Joint income after modeled deductions" : "Income after modeled deductions"}</dt><dd>{money(base.taxableIncome)}</dd></div>
          </dl>
          <p className="annual-income__caption">{joint ? "Shared deductions are applied to the household, without an invented split between partners. " : "Deductions use one person's limits. "}The model floors the amount at zero. Child allowances and additional personal deductions are separate steps toward final taxable income.</p>
        </div>
      ) : null}
    </>
  );
}
