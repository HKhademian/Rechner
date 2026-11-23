import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";


import {
  blueCardEvaluation,
  opportunityCardEvaluation,
  resetVisaCalculator,
  syncVisaFromLifeProfile,
  updateVisaField,
  visaState,
} from "#/apps/visa/visaStore.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";


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
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  BannerTone,
  StatusBanner,
} from "#components/ui/StatusBanner";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  BlueCardEligibilityStatus,
  GermanLanguageLevel,
  VisaOccupationRoute,
  toGermanLanguageLevel,
} from "#engine/formulas/pure/visaFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";
import {
  toGrossSalary,
} from "#engine/types";

function formatEur(value: number): string {
  return formatSharedEur(value);
}

const OCCUPATION_ROUTE_OPTIONS = [
  {
    value: VisaOccupationRoute.Standard,
    label: "Standard",
  },
  {
    value: VisaOccupationRoute.ShortageOrGraduate,
    label: "Shortage / IT / Grad",
  },
] as const;

const GERMAN_LEVEL_OPTIONS = [
  {
    value: GermanLanguageLevel.NoneOrBasic,
    label: "Below A1 / Basic",
  },
  {
    value: GermanLanguageLevel.A1,
    label: "A1 Elementary",
  },
  {
    value: GermanLanguageLevel.A2,
    label: "A2 Pre-Intermediate",
  },
  {
    value: GermanLanguageLevel.B1Plus,
    label: "B1 or higher",
  },
] as const;

interface VisaPointsRow {
  readonly id: string;
  readonly criterion: string;
  readonly points: string;
  readonly total?: boolean;
}

const VISA_POINTS_COLUMNS: readonly DataTableColumn<VisaPointsRow>[] = [
  {
    key: "criterion",
    header: "Criterion",
    render: (row) => row.criterion,
  },
  {
    key: "points",
    header: "Points / Value",
    align: DataColumnAlign.Right,
    render: (row) => row.points,
  },
];

export default function VisaCalculator(): JSX.Element {
  const s = visaState.value;
  const blueCard = blueCardEvaluation.value.value;
  const chancenkarte = opportunityCardEvaluation.value.value;

  const isEligible =
    blueCard.status === BlueCardEligibilityStatus.EligibleStandard ||
    blueCard.status === BlueCardEligibilityStatus.EligibleShortageOrGraduate;

  const statusHeadline =
    blueCard.status === BlueCardEligibilityStatus.EligibleStandard
      ? "Eligible for Standard EU Blue Card (§ 18g Abs. 1 AufenthG)"
      : blueCard.status === BlueCardEligibilityStatus.EligibleShortageOrGraduate
        ? "Eligible for Reduced-Threshold EU Blue Card (§ 18g Abs. 1 S. 2)"
        : `Shortfall of ${formatEur(Math.abs(blueCard.salarySurplusOrShortfall))} vs Blue Card threshold`;

  const pointsRows: readonly VisaPointsRow[] = [
    {
      id: "partial-recognition",
      criterion: "Partial recognition deficit notice",
      points: `${chancenkarte.breakdown.partialRecognition} pts`,
    },
    {
      id: "experience",
      criterion: `Skilled professional experience (${s.qualifiedExperienceYears} yrs)`,
      points: `${chancenkarte.breakdown.experience} pts`,
    },
    {
      id: "german",
      criterion: "German language level",
      points: `${chancenkarte.breakdown.germanLanguage} pts`,
    },
    {
      id: "english",
      criterion: "English C1 / native bonus",
      points: `${chancenkarte.breakdown.englishLanguage} pts`,
    },
    {
      id: "age",
      criterion: "Age bracket bonus (under 35 / under 40)",
      points: `${chancenkarte.breakdown.age} pts`,
    },
    {
      id: "extra",
      criterion: "Shortage occupation / prior stay / partner",
      points: `${chancenkarte.breakdown.shortageBonus + chancenkarte.breakdown.priorStayInGermany + chancenkarte.breakdown.partnerBonus} pts`,
    },
    {
      id: "total",
      criterion: "Total Opportunity Card Score (Threshold: 6 pts or Recognized Degree)",
      points: `${chancenkarte.totalPoints} pts`,
      total: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Visa &amp; Residence"
        title="EU Blue Card &amp; Visa Planner"
        subtitle="Check Blue Card salary limits, permanent residency timelines, and Opportunity Card points."
        actions={(
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncVisaFromLifeProfile}
            onResetDefaults={resetVisaCalculator}
            syncTooltip="Load planning year, gross salary offer, age, Blue Card track, and German level from your Life Profile"
          />
        )}
      />

      <CalculatorWorkspace
        inputs={(
          <Card ariaLabelledBy="visa-inputs-heading">
            <CardHeader
              headingId="visa-inputs-heading"
              title="Applicant &amp; Job Offer"
              subtitle="Salary threshold and language rules adjust by year."
            />
            <FieldGroup>
              <NumberField
                id="visa-gross-salary"
                topicId="blue-card"
                label="Annual Gross Salary Offer"
                unit="€"
                min={0}
                step={500}
                value={s.annualGrossSalary}
                onChange={(num) => updateVisaField("annualGrossSalary", toGrossSalary(num))}
              />

              <FieldRow>
                <NumberField
                  id="visa-age"
                  label="Applicant Age"
                  unit="yrs"
                  min={18}
                  max={80}
                  step={1}
                  value={s.applicantAgeYears}
                  onChange={(num) => updateVisaField("applicantAgeYears", Math.round(num))}
                />

                <NumberField
                  id="visa-experience"
                  topicId="opportunity-points"
                  label="Skilled Experience"
                  unit="yrs"
                  min={0}
                  max={40}
                  step={1}
                  value={s.qualifiedExperienceYears}
                  onChange={(num) => updateVisaField("qualifiedExperienceYears", Math.round(num))}
                />
              </FieldRow>

              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Blue Card Track</span>
                </div>
                <SegmentedControl
                  label="Blue Card occupation track"
                  topicId="blue-card"
                  value={s.occupationRoute}
                  options={OCCUPATION_ROUTE_OPTIONS}
                  fullWidth
                  onChange={(value) => updateVisaField("occupationRoute", value)}
                />
              </div>

              <ChoiceSelect
                id="visa-german"
                topicId="opportunity-points"
                label="German Language Level"
                value={s.germanLevel}
                options={GERMAN_LEVEL_OPTIONS}
                onChange={(value) => updateVisaField("germanLevel", toGermanLanguageLevel(value))}
              />

              <Disclosure
                title="Opportunity Card Factors (Chancenkarte)"
                meta={
                  chancenkarte.directSkilledWorkerTrack
                    ? "Direct Track"
                    : `${chancenkarte.totalPoints} / ${chancenkarte.pointsRequired} pts`
                }
                subtle
              >
                <FieldGroup>
                  <ToggleSwitch
                    id="visa-full-degree"
                    topicId="qualification-recognition"
                    label="Fully recognized university degree"
                    hint="Direct skilled-worker track (no point threshold needed)"
                    checked={s.hasRecognizedGermanOrEquivalentDegree}
                    onChange={(checked) => updateVisaField("hasRecognizedGermanOrEquivalentDegree", checked)}
                  />

                  <ToggleSwitch
                    id="visa-partial"
                    topicId="qualification-recognition"
                    label="Partial recognition deficit notice (+4 pts)"
                    checked={s.hasVocationalOrPartialRecognition}
                    onChange={(checked) => updateVisaField("hasVocationalOrPartialRecognition", checked)}
                  />

                  <ToggleSwitch
                    id="visa-english"
                    topicId="opportunity-points"
                    label="English C1 or native proficiency (+1 pt)"
                    checked={s.hasEnglishC1OrNative}
                    onChange={(checked) => updateVisaField("hasEnglishC1OrNative", checked)}
                  />

                  <ToggleSwitch
                    id="visa-shortage-flag"
                    topicId="opportunity-points"
                    label="EU shortage / bottleneck occupation (+1 pt)"
                    checked={s.isShortageOccupation}
                    onChange={(checked) => updateVisaField("isShortageOccupation", checked)}
                  />

                  <ToggleSwitch
                    id="visa-prior-stay"
                    topicId="opportunity-points"
                    label="6+ months legal stay in Germany (+1 pt)"
                    checked={s.hasPriorSixMonthLegalStayInGermany}
                    onChange={(checked) => updateVisaField("hasPriorSixMonthLegalStayInGermany", checked)}
                  />

                  <ToggleSwitch
                    id="visa-partner-applies"
                    topicId="opportunity-points"
                    label="Partner also qualifies for Opportunity Card (+1 pt)"
                    checked={s.partnerAlsoAppliesSkilled}
                    onChange={(checked) => updateVisaField("partnerAlsoAppliesSkilled", checked)}
                  />

                  <NumberField
                    id="visa-stay-months"
                    topicId="opportunity-card"
                    label="Opportunity Card Stay Duration"
                    unit="mo"
                    min={1}
                    max={12}
                    step={1}
                    value={s.stayDurationMonths}
                    onChange={(num) => updateVisaField("stayDurationMonths", Math.min(12, Math.round(num)))}
                  />
                </FieldGroup>
              </Disclosure>
            </FieldGroup>
          </Card>
        )}
        results={(
          <>
            <StatusBanner
              tone={isEligible ? BannerTone.Success : BannerTone.Warning}
              title={statusHeadline}
              actions={<LawRefLink lawId={LawId.AufenthG_18g} label="Read § 18g AufenthG" />}
            >
              {blueCard.age45PensionProofRequired && !blueCard.age45SalarySatisfied
                ? "Age 45+ rule: adequate pension proof is required unless your salary meets the threshold."
                : `Permanent residency available after ${blueCard.requiredSettlementMonths} months of qualified employment.`}
            </StatusBanner>

            <div className="domain-calc-kpis">
              <MetricCard
                label="Applicable Threshold"
                value={formatEur(blueCard.applicableSalaryThreshold)}
                subtitle={`Margin ${blueCard.salarySurplusOrShortfall >= 0 ? "+" : ""}${formatEur(blueCard.salarySurplusOrShortfall)}`}
                tone={MetricTone.Primary}
              />
              <MetricCard
                label="Settlement Permit (PR)"
                value={`${blueCard.requiredSettlementMonths} months`}
                subtitle={
                  blueCard.settlementMonthsSavedByB1 > 0
                    ? `B1 accelerates by ${blueCard.settlementMonthsSavedByB1} months`
                    : "B1 German cuts timeline to 21 months"
                }
                tone={MetricTone.Gain}
              />
              <MetricCard
                label="Chancenkarte Points"
                value={
                  chancenkarte.directSkilledWorkerTrack
                    ? "Direct Track"
                    : `${chancenkarte.totalPoints} / ${chancenkarte.pointsRequired} pts`
                }
                subtitle={`Blocked account ${formatEur(chancenkarte.requiredBlockedAccountTotal)}`}
                tone={chancenkarte.eligibleOverall ? MetricTone.Gain : MetricTone.Neutral}
              />
            </div>

            <Card ariaLabelledBy="chancenkarte-breakdown-heading">
              <CardHeader
                headingId="chancenkarte-breakdown-heading"
                title="Opportunity Card Points &amp; Savings"
              />
              <DataTable
                columns={VISA_POINTS_COLUMNS}
                rows={pointsRows}
                rowKey={(row) => row.id}
                isTotalRow={(row) => Boolean(row.total)}
              />
              <LawReferenceBar>
                <LawRefLink lawId={LawId.AufenthG_18g} label="AufenthG § 18g" />
                <LawRefLink lawId={LawId.AufenthG_18c} label="AufenthG § 18c" />
                <LawRefLink lawId={LawId.AufenthG_20a} label="AufenthG § 20a" />
                <LawRefLink lawId={LawId.AufenthG_18_2_5} label="AufenthG § 18 Abs. 2 Nr. 5" />
              </LawReferenceBar>
            </Card>

            <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.VisaFocus} />
          </>
        )}
      />
    </>
  );
}
