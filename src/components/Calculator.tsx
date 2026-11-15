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
import NetPayWorkspace from "#components/NetPayWorkspace";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import SourceRevision from "#components/SourceRevision";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import "./Calculator.css";

export default function Calculator(): JSX.Element {
  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.NetPay)} />
      <main id="main-content" className="ui-page ui-page--wide" tabIndex={-1}>
        <PageHeader
          eyebrow="Income & Payroll · EStG / SGB"
          title="German Net Pay Calculator"
          subtitle="Calculate your net take-home pay, income tax, and social contributions, then compare scenarios."
          actions={<CalculatorPeriodControl />}
        />
        <NetPayWorkspace />
        <ComparisonTable />
        <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.NetPayFocus} />
      </main>
      <footer className="source-revision-footer">
        <SourceRevision />
      </footer>
    </>
  );
}
