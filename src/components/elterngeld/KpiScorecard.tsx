import "./ElterngeldPanels.css";
import {
  formatEur,
} from "#utils/currencyFormat";
import CalculationStatus from "./CalculationStatus";
import type {
  JSX,
} from "preact";
import LawRefLink from "#components/laws/LawRefLink";
import {
  type MetricBreakdownItem,
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  displayedCurrentScenarioData,
  displayedComparisonMetrics,
  displayedScenarioBData,
  LEGAL_RULE_LAW_MAP,
  LegalRuleKey,
  activeLegalRuleKey,
} from "#store/elterngeldStore";
import {
  StatutorySectionIcon,
} from "#components/Icons";

/**
 * High-level KPI overview for Parental Leave net salaries, benefits, cash flow, and tax-switch impact.
 */
export default function KpiScorecard(): JSX.Element {
  const current = displayedCurrentScenarioData.value;
  const metrics = displayedComparisonMetrics.value;
  const bSummary = displayedScenarioBData.value.summary;

  const totalHusbandSalary = current.months.reduce((acc, m) => acc + m.husbandSalary, 0);
  const totalWifeSalary = current.months.reduce((acc, m) => acc + m.wifeSalary, 0);
  const isGainNegative = metrics.gainCvsB < 0;
  const gainTone = isGainNegative ? MetricTone.Loss : MetricTone.Gain;
  const percentGainCvsB = bSummary.grandTotal === 0
    ? undefined
    : ((metrics.gainCvsB / Math.abs(bSummary.grandTotal)) * 100).toFixed(1);

  const cashflowBreakdown: MetricBreakdownItem[] = [
    {
      label: "Average / Month",
      value: current.months.length > 0
        ? formatEur(current.summary.grandTotal / current.months.length)
        : "Unavailable",
    },
    ...(current.summary.realGrandTotal !== undefined &&
    current.summary.inflationRateApplied !== undefined &&
    current.summary.inflationRateApplied > 0
      ? [{
        label: `Real Value (M1 @ ${(current.summary.inflationRateApplied * 100).toFixed(1)}%)`,
        value: formatEur(current.summary.realGrandTotal),
      }]
      : []),
    ...(current.summary.totalChildcareFees !== undefined && current.summary.totalChildcareFees > 0
      ? [{
        label: "Kita Fees",
        value: `-${formatEur(current.summary.totalChildcareFees)}`,
        tone: MetricTone.Loss,
      }]
      : []),
    ...(current.summary.childcareTaxDeductionTotal !== undefined && current.summary.childcareTaxDeductionTotal > 0
      ? [{
        label: "Tax Deductible (§ 10(1)5 EStG)",
        value: formatEur(current.summary.childcareTaxDeductionTotal),
      }]
      : []),
  ];

  return (
    <div className="eg-kpi-grid">
      <CalculationStatus result={current} />

      <MetricCard
        label="Total Net Working Salaries"
        value={formatEur(current.summary.totalSalaries)}
        accentColor="var(--series-salary-husband)"
        breakdown={[
          {
            label: "Husband",
            value: formatEur(totalHusbandSalary),
          },
          {
            label: "Wife",
            value: formatEur(totalWifeSalary),
          },
        ]}
        footer="Salaries reflect modeled working hours and active tax classes."
      />

      <MetricCard
        label="Total State Benefits & Subsidies"
        value={formatEur(current.summary.totalBenefits)}
        tone={MetricTone.Gain}
        breakdown={[
          {
            label: "EG+",
            value: formatEur(current.summary.totalWifeElterngeld + current.summary.totalHusbandElterngeld),
          },
          {
            label: "KG",
            value: formatEur(current.summary.totalKindergeld),
          },
        ]}
        footer="Benefits follow each parent's assessment history and eligibility limits."
      />

      <MetricCard
        label={`${current.months.length}-Month Net Cash Flow`}
        value={formatEur(current.summary.grandTotal)}
        tone={MetricTone.Primary}
        breakdown={cashflowBreakdown}
        footer={`Combined household cash flow from ${current.months[0]?.calendarLabel ?? "—"} to ${current.months.at(-1)?.calendarLabel ?? "—"}.`}
      />

      <MetricCard
        label="Effect of your tax-class changes"
        subtitle="Compared with keeping your original tax classes for the same plan."
        value={`${metrics.gainCvsB > 0 ? "+" : ""}${formatEur(metrics.gainCvsB)}`}
        tone={gainTone}
        highlight
        breakdown={[
          {
            label: "Mother Elterngeld difference",
            value: `${metrics.wifeEgGainCvsB > 0 ? "+" : ""}${formatEur(metrics.wifeEgGainCvsB)}`,
            tone: metrics.wifeEgGainCvsB < 0 ? MetricTone.Loss : MetricTone.Gain,
          },
        ]}
        footer={
          <div className="eg-kpi-footer">
            <span className={`eg-kpi-delta ${isGainNegative ? "eg-kpi-delta--loss" : "eg-kpi-delta--gain"}`}>
              {percentGainCvsB === undefined
                ? "Percentage unavailable for a zero baseline"
                : `${Number(percentGainCvsB) > 0 ? "+" : ""}${percentGainCvsB}% cash-flow difference`}
            </span>
            <LawRefLink
              lawId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_TaxSwap].lawId}
              groupId={LEGAL_RULE_LAW_MAP[LegalRuleKey.BEEG_TaxSwap].groupId}
              variant="plain"
              className="eg-kpi-law-link"
              onOpen={() => {
                activeLegalRuleKey.value = LegalRuleKey.BEEG_TaxSwap;
              }}
              title="View § 2b BEEG legal basis and strategy — Click for quick popup · Ctrl+Click for full page"
            >
              <span>How is this calculated? (§ 2b BEEG)</span>
              <StatutorySectionIcon size={11} />
            </LawRefLink>
          </div>
        }
      />
    </div>
  );
}
