import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import type {
  JSX, 
} from "preact";
import ComparisonTable from "#components/ComparisonTable";
import Navigation from "#components/Navigation";

export default function Calculator(): JSX.Element {
  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.NetPay)} />
      <main id="main-content">
        <div
          style={{
            textAlign: "center",
            marginBottom: "20px",
            marginTop: "20px",
          }}
        >
          <h1
            style={{
              fontSize: "2.8rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
            }}
          >
            German Net Pay Calculator
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "1.1rem",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Instantly see how your salary, tax bracket, state, and family
            situation affect your net income in Germany.
          </p>
        </div>

        <ComparisonTable />
      </main>


    </>
  );
}
