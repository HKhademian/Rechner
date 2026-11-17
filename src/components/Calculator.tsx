import {
  AppId,
  calculatorPath,
  sitePath,
} from "#/apps/appDefinition.ts";
import type {
  JSX,
} from "preact";
import CalculatorPeriodControl from "#components/CalculatorPeriodControl";
import ComparisonTable from "#components/ComparisonTable";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";

export default function Calculator(): JSX.Element {
  return (
    <AppShell currentPath={calculatorPath(AppId.NetPay)} wide>
      <PageHeader
        eyebrow="Salary & Payroll"
        title="Net Pay Calculator"
        subtitle="Compare take-home pay across salary and household scenarios."
        actions={<CalculatorPeriodControl />}
      />
      <ComparisonTable />
      <p>Explore <a href={sitePath("/topics/taxable-income/")}>taxable income</a>, <a href={sitePath("/formulas/")}>formulas</a>, and <a href={sitePath("/constants/")}>rates and assumptions</a>.</p>
      <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.NetPayFocus} />
    </AppShell>
  );
}
