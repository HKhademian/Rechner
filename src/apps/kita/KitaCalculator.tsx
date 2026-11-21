import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  DEFAULT_KITA_EVALUATION,
  DEFAULT_KITA_STATE,
  kitaEvaluation,
  kitaState,
  resetKitaCalculator,
  syncKitaFromLifeProfile,
  updateKitaField,
} from "#/apps/kita/kitaStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  CalculatorWorkspace,
  FieldGroup,
  FieldRow,
  LawReferenceBar,
} from "#components/ui/CalculatorWorkspace";
import {
  Card,
  CardHeader,
} from "#components/ui/Card";
import {
  ChoiceSelect,
} from "#components/ui/ChoiceSelect";
import {
  type DataTableColumn,
  DataColumnAlign,
  DataTable,
} from "#components/ui/DataTable";
import {
  Disclosure,
} from "#components/ui/Disclosure";
import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  BannerTone,
  StatusBanner,
} from "#components/ui/StatusBanner";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  getAllMunicipalDaycarePresets,
} from "#engine/benefits/childcare";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  FederalStateKitaPresetId,
  toEuroAmount,
  toFederalStateKitaPresetId,
  toGrossSalary,
} from "#engine/types";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";

function formatEur(value: number): string {
  return formatSharedEur(value);
}

const FEE_SCHEDULE_OPTIONS = [
  ...getAllMunicipalDaycarePresets().map((preset) => ({
    value: preset.id,
    label: preset.label,
  })),
  {
    value: FederalStateKitaPresetId.Custom,
    label: "Custom monthly fee per child",
  },
] as const;

const CHILD_AGE_FIELDS = [
  {
    key: "child1AgeMonths",
    label: "Child 1 Age",
  },
  {
    key: "child2AgeMonths",
    label: "Child 2 Age",
  },
  {
    key: "child3AgeMonths",
    label: "Child 3 Age",
  },
  {
    key: "child4AgeMonths",
    label: "Child 4 Age",
  },
] as const;

interface KitaBreakdownRow {
  readonly id: string;
  readonly label: string;
  readonly careFee: string;
  readonly mealsFee: string;
  readonly deduction: string;
  readonly total?: boolean;
}

const KITA_COLUMNS: readonly DataTableColumn<KitaBreakdownRow>[] = [
  {
    key: "label",
    header: "Child",
    render: (row) => row.label,
  },
  {
    key: "careFee",
    header: "Care Fee / mo",
    align: DataColumnAlign.Right,
    render: (row) => row.careFee,
  },
  {
    key: "mealsFee",
    header: "Meals / mo",
    align: DataColumnAlign.Right,
    render: (row) => row.mealsFee,
  },
  {
    key: "deduction",
    header: "§ 10 EStG Deduction / yr",
    align: DataColumnAlign.Right,
    render: (row) => row.deduction,
  },
];

export default function KitaCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const s = hydrated ? kitaState.value : DEFAULT_KITA_STATE;
  const evalResult = hydrated ? kitaEvaluation.value : DEFAULT_KITA_EVALUATION;
  const visibleChildAgeFields = CHILD_AGE_FIELDS.slice(0, s.childrenCount);
  const effectivePercentLabel = `${Math.round(evalResult.deductibleFraction * 100)}%`;

  const breakdownRows: readonly KitaBreakdownRow[] = [
    ...evalResult.perChildBreakdown.map((row) => ({
      id: `child-${row.childIndex}`,
      label: `Child ${row.childIndex} (${row.ageMonths}m${
        row.isFeeFreeByAge ? ", age-exempt" : row.siblingCareRank > 1 ? `, sibling #${row.siblingCareRank}` : ""
      })`,
      careFee: formatEur(row.monthlyCareFeeEur),
      mealsFee: formatEur(row.monthlyMealFeeEur),
      deduction: formatEur(row.annualDeductibleEur),
    })),
    {
      id: "totals",
      label: `Annual Totals (${evalResult.careMonthsPerYear} mo funded)`,
      careFee: formatEur(evalResult.annualCareFeeTotalEur),
      mealsFee: formatEur(evalResult.annualMealFeeTotalEur),
      deduction: formatEur(evalResult.annualDeductibleSonderausgabenEur),
      total: true,
    },
  ];

  return (
    <AppShell
      currentPath={calculatorPath(AppId.Kita)}
      footerNote="Demo tool: municipal fee tables are illustrative reference models; meals (Verpflegungsgeld) are always excluded under § 10 Abs. 1 Nr. 5 EStG."
    >
      <PageHeader
        eyebrow="Childcare &amp; Tax"
        title="Kita Fee &amp; Tax Offset"
        subtitle="Estimate municipal or custom Kita care costs, sibling discounts, and your net monthly household impact after § 10 EStG tax relief."
        actions={(
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncKitaFromLifeProfile}
            onResetDefaults={resetKitaCalculator}
            syncTooltip="Load planning year, federal state fee table, children, gross income, and taxable income from your Life Profile"
            inactiveInLifeProfileMessage={
              unifiedLifeProfile.value.dependentChildrenCount < 1
                ? "Life Profile currently has 0 dependent children"
                : undefined
            }
          />
        )}
      />

      <CalculatorWorkspace
        inputs={(
          <Card ariaLabelledBy="kita-inputs-heading">
            <CardHeader
              headingId="kita-inputs-heading"
              title="Care Setup &amp; Household Tax"
              subtitle="Municipal schedule, children in care, meal fees, and household tax base."
            />
            <FieldGroup>
              <ChoiceSelect
                id="kita-preset"
                topicId="childcare"
                label="Daycare Fee Schedule"
                value={s.presetId}
                options={FEE_SCHEDULE_OPTIONS}
                onChange={(value) => updateKitaField("presetId", toFederalStateKitaPresetId(value))}
              />

              {s.presetId === FederalStateKitaPresetId.Custom && (
                <NumberField
                  id="kita-custom-fee"
                  topicId="childcare"
                  label="Monthly Care Fee per Child"
                  unit="€"
                  min={0}
                  max={3000}
                  step={10}
                  value={s.customMonthlyCareFeePerChildEur}
                  onChange={(num) => updateKitaField("customMonthlyCareFeePerChildEur", toEuroAmount(num))}
                />
              )}

              <FieldRow>
                <NumberField
                  id="kita-meal-fee"
                  topicId="childcare"
                  label="Meals / Verpflegungsgeld"
                  unit="€/mo"
                  min={0}
                  max={500}
                  step={5}
                  value={s.monthlyMealFeePerChildEur}
                  onChange={(num) => updateKitaField("monthlyMealFeePerChildEur", toEuroAmount(num))}
                />

                <NumberField
                  id="kita-months-per-year"
                  label="Care Months / Year"
                  unit="mo"
                  min={1}
                  max={12}
                  step={1}
                  value={s.careMonthsPerYear}
                  onChange={(num) => updateKitaField("careMonthsPerYear", Math.round(num))}
                />
              </FieldRow>

              <FieldRow>
                <NumberField
                  id="kita-children-count"
                  label="Children in Care"
                  min={1}
                  max={4}
                  step={1}
                  value={s.childrenCount}
                  onChange={(num) => updateKitaField("childrenCount", Math.round(num))}
                />

                <NumberField
                  id="kita-household-gross"
                  label="Household Annual Gross"
                  unit="€"
                  min={0}
                  max={1000000}
                  step={2500}
                  value={s.householdAnnualGrossEur}
                  onChange={(num) => updateKitaField("householdAnnualGrossEur", toGrossSalary(num))}
                />
              </FieldRow>

              <FieldRow>
                {visibleChildAgeFields.map((field) => (
                  <NumberField
                    key={field.key}
                    id={`kita-${field.key}`}
                    label={field.label}
                    unit="mo"
                    min={0}
                    max={167}
                    step={1}
                    value={s[field.key]}
                    onChange={(num) => updateKitaField(field.key, Math.round(num))}
                  />
                ))}
              </FieldRow>

              <Disclosure
                title="Annual Income Tax Assessment (§ 32a EStG)"
                meta={s.isMarriedJointAssessment ? "Joint" : "Individual"}
                subtle
              >
                <FieldGroup>
                  <NumberField
                    id="kita-zve"
                    topicId="taxable-income"
                    label="Household Taxable Income (zvE)"
                    unit="€"
                    min={0}
                    max={1000000}
                    step={2000}
                    value={s.householdTaxableIncomeZvEEur}
                    onChange={(num) => updateKitaField("householdTaxableIncomeZvEEur", toEuroAmount(num))}
                  />

                  <ToggleSwitch
                    id="kita-joint-assessment"
                    topicId="joint-assessment"
                    label="Joint spousal splitting (§ 26b EStG)"
                    hint="Doubles progressive brackets before tax refund delta"
                    checked={s.isMarriedJointAssessment}
                    onChange={(checked) => updateKitaField("isMarriedJointAssessment", checked)}
                  />

                  <ToggleSwitch
                    id="kita-church-tax"
                    label="Include church tax refund effect"
                    hint="Adds 9% standard church tax delta (or 8% BY/BW)"
                    checked={s.hasChurchTax}
                    onChange={(checked) => updateKitaField("hasChurchTax", checked)}
                  />

                  {s.hasChurchTax && (
                    <ToggleSwitch
                      id="kita-by-bw"
                      label="Bavaria / Baden-Württemberg (8% rate)"
                      checked={s.isBavariaOrBadenWuerttemberg}
                      onChange={(checked) => updateKitaField("isBavariaOrBadenWuerttemberg", checked)}
                    />
                  )}
                </FieldGroup>
              </Disclosure>
            </FieldGroup>
          </Card>
        )}
        results={(
          <>
            <StatusBanner
              tone={evalResult.annualTaxSavingsEur > 0 ? BannerTone.Success : BannerTone.Warning}
              title={
                evalResult.annualTaxSavingsEur > 0
                  ? `§ 10 EStG offsets ${Math.round(evalResult.effectiveOffsetRate * 100)}% of total cash outflow (${formatEur(evalResult.annualTaxSavingsEur)}/yr refund)`
                  : `Gross Kita cost is ${formatEur(evalResult.monthlyGrossOutflowEur)}/mo with zero extra tax refund at current zvE`
              }
              actions={<LawRefLink lawId={LawId.EStG_10_1_5} label="Read § 10 Abs. 1 Nr. 5" />}
            >
              {evalResult.calendarYear} deductibility: {effectivePercentLabel} of qualifying care fees up to{" "}
              {formatEur(evalResult.maxAnnualDeductionPerChildEur)}/child (age &lt; {evalResult.maxChildAgeYears}).
            </StatusBanner>

            <div className="domain-calc-kpis">
              <MetricCard
                label="Monthly Cash Outflow"
                value={formatEur(evalResult.monthlyGrossOutflowEur)}
                subtitle={`${formatEur(evalResult.monthlyCareFeeTotalEur)} care + ${formatEur(evalResult.monthlyMealFeeTotalEur)} meals`}
                tone={MetricTone.Loss}
              />
              <MetricCard
                label="Est. Tax Refund / Month"
                value={`+${formatEur(evalResult.monthlyTaxSavingsEur)}`}
                subtitle={`${formatEur(evalResult.annualTaxSavingsEur)} / yr (${formatEur(evalResult.annualDeductibleSonderausgabenEur)} Sonderausgaben)`}
                tone={MetricTone.Gain}
              />
              <MetricCard
                label="Net Monthly Kita Cost"
                value={formatEur(evalResult.netMonthlyHouseholdCostEur)}
                subtitle={`${formatEur(evalResult.netAnnualHouseholdCostEur)} / yr net household cost`}
                tone={MetricTone.Primary}
              />
            </div>

            <Card ariaLabelledBy="kita-breakdown-heading">
              <CardHeader
                headingId="kita-breakdown-heading"
                title="Per-Child Care Fee &amp; Tax Deduction"
              />
              <DataTable
                columns={KITA_COLUMNS}
                rows={breakdownRows}
                rowKey={(row) => row.id}
                isTotalRow={(row) => Boolean(row.total)}
              />
              <LawReferenceBar>
                <LawRefLink lawId={LawId.EStG_10_1_5} label="EStG § 10 Abs. 1 Nr. 5" />
                <LawRefLink lawId={LawId.EStG_32a} label="EStG § 32a" />
                <LawRefLink lawId={LawId.EStG_26b} label="EStG § 26b" />
              </LawReferenceBar>
            </Card>

            <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.KitaFocus} />
          </>
        )}
      />
    </AppShell>
  );
}
