import {
  TopicHelp, 
} from "#components/topics/TopicHelp";
import {
  batch,
} from "@preact/signals";
import {
  AppId,
  calculatorPath,
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  currentScenarioData,
  setExistingChildrenCount,
  setHusbandGrossYearly,
  setWifeGrossYearly,
  startCalendarYear,
  updateChildcarePlan,
} from "#store/elterngeldStore";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  FederalStateKitaPresetId,
} from "#engine/types";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import type {
  JSX,
} from "preact";
import {
  SyncProfileActionIcon,
} from "#components/Icons";
import AnnualTaxableIncome from "#components/elterngeld/AnnualTaxableIncome";
import KpiScorecard from "#components/elterngeld/KpiScorecard";
import ScenarioSelector from "#components/elterngeld/ScenarioSelector";
import TimelineChart from "#components/elterngeld/TimelineChart";
import SandboxControls from "#components/elterngeld/SandboxControls";
import RulesExplainer from "#components/elterngeld/RulesExplainer";
import TimelineTable from "#components/elterngeld/TimelineTable";
import {
  DataExportImportModal,
} from "#components/elterngeld/DataExportImportModal";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#components/ui/Button";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";

function mapStateToKitaPreset(federalState: GermanFederalState): FederalStateKitaPresetId {
  switch (federalState) {
    case GermanFederalState.Berlin:
      return FederalStateKitaPresetId.Berlin;
    case GermanFederalState.NordrheinWestfalen:
      return FederalStateKitaPresetId.NrwDuesseldorf;
    case GermanFederalState.Bayern:
      return FederalStateKitaPresetId.BavariaMunich;
    case GermanFederalState.BadenWuerttemberg:
      return FederalStateKitaPresetId.BwStuttgart;
    case GermanFederalState.Hamburg:
      return FederalStateKitaPresetId.Hamburg;
    default:
      return FederalStateKitaPresetId.Custom;
  }
}

function syncParentalLeaveFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  batch(() => {
    startCalendarYear.value = lp.planningYear;
    setHusbandGrossYearly(lp.primaryAnnualGrossEur);
    setWifeGrossYearly(lp.hasPartner ? lp.partnerAnnualGrossEur : 0);
    setExistingChildrenCount(lp.dependentChildrenCount);
    updateChildcarePlan({ presetId: mapStateToKitaPreset(lp.federalState) });
  });
}

export default function ElterngeldDashboard(): JSX.Element {
  const hydrated = useHydrated();
  const months = hydrated ? currentScenarioData.value.months : [];
  return (
    <AppShell
      currentPath={calculatorPath(AppId.ParentalLeave)}
      wide
      footerNote="Calculated locally in your browser · No data transmitted"
    >
      <PageHeader
        eyebrow="Parental Leave · BEEG & EStG"
        title="Parental Leave Planner"
        subtitle="Start with your household and planned leave below, then compare the calculated results."
        actions={(
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onClick={syncParentalLeaveFromLifeProfile}
            title="Populate annual gross salaries, partner income, existing children, start year, and regional Kita preset from the Unified Life Profile"
          >
            <SyncProfileActionIcon size={14} />
            <span>Sync Life Profile</span>
          </Button>
        )}
        metaLabel="Planning period"
        meta={
          hydrated
            ? [
              {
                label: "Forecast period",
                value: `${months[0]?.calendarLabel ?? ""} – ${months.at(-1)?.calendarLabel ?? ""}`,
              },
              {
                label: "Duration",
                value: `${months.length} months`,
              },
            ]
            : undefined
        }
      />
      <p>Explore parental allowance <TopicHelp id="parental-allowance" /> and its <a href={sitePath("/formulas/formula.parentalAllowance.entitlement/")}>calculation</a>.</p>

      {hydrated && (
        <>
          {/* Set up the plan before choosing which calculated results to review. */}
          <SandboxControls />

          <ScenarioSelector />

          {/* Dynamic KPI Scorecard */}
          <KpiScorecard />

          <AnnualTaxableIncome result={currentScenarioData.value} />

          {/* Full 60-Month Cash Flow Table & Audit */}
          <TimelineTable />

          {/* Interactive 60-Month Stacked Timeline Chart */}
          <TimelineChart />

          {/* Unified Law-Linked Parameter Value Storage Observer & Editor */}
          <ParameterObserverSection
            embedded
            projectionProfile={FormProjectionProfileId.ParentalLeaveFocus}
          />

          {/* German Law Rules, Statutory Framework & Legal Precedents */}
          <RulesExplainer />

          {/* Data Export / Import Modal Dialog */}
          <DataExportImportModal />
        </>
      )}
    </AppShell>
  );
}
