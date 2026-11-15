import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import type {
  JSX,
} from "preact";
import CalculatorPeriodControl from "#components/CalculatorPeriodControl";
import ComparisonTable from "#components/ComparisonTable";
import Navigation from "#components/Navigation";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import SourceRevision from "#components/SourceRevision";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";

export default function Calculator(): JSX.Element {
  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.NetPay)} />
      <main id="main-content" className="ui-page ui-page--wide" tabIndex={-1}>
        <PageHeader
          eyebrow="Salary & Payroll"
          title="Net Pay Calculator"
          subtitle="Edit your live salary and household setup beside saved scenarios to compare take-home pay side by side."
          actions={<CalculatorPeriodControl />}
        />
        <ComparisonTable />
        <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.NetPayFocus} />
      </main>
      <footer className="source-revision-footer">
        <SourceRevision />
      </footer>
    </>
  );
}
