import {
  AppId,
  calculatorPath,
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
        subtitle="Edit your live salary and household setup beside saved scenarios to compare take-home pay side by side."
        actions={<CalculatorPeriodControl />}
      />
      <ComparisonTable />
      <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.NetPayFocus} />
    </AppShell>
  );
}
