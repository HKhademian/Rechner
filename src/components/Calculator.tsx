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
import SourceRevision from "#components/SourceRevision";
import "./Calculator.css";

export default function Calculator(): JSX.Element {
  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.NetPay)} />
      <main id="main-content" tabIndex={-1}>
        <header className="net-pay-header">
          <h1>German Net Pay Calculator</h1>
          <CalculatorPeriodControl />
        </header>
        <ComparisonTable />
      </main>
      <footer className="source-revision-footer">
        <SourceRevision />
      </footer>
    </>
  );
}
