import type { JSX } from "preact";
import ThemeToggle from "#components/ThemeToggle";
import {
  CalculatorNavigationIcon,
  SimulatorNavigationIcon,
  StatutorySectionIcon,
} from "#components/Icons";

/**
 * Top-Level Navigation Header Component Properties.
 */
export interface NavigationProps {
  /** Active routing pathname (e.g. '/' or '/elterngeld'). */
  currentPath?: string;
}

export default function Navigation({
  currentPath = "/",
}: NavigationProps): JSX.Element {
  const isNetCalculator = currentPath === "/" || currentPath === "";
  const isElterngeld =
    currentPath === "/elterngeld" || currentPath.startsWith("/elterngeld");

  return (
    <header
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        boxShadow: "var(--shadow-sm)",
        transition: "var(--transition)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Brand Logo & Title */}
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--border-radius-sm)",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              color: "#ffffff",
              fontWeight: 800,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <StatutorySectionIcon size={20} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "1.05rem",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
              }}
            >
              German Net Salary &amp; Parental Allowance Planner
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                letterSpacing: "0.02em",
              }}
            >
              Household Financial &amp; Parental Leave Optimization (BEEG /
              EStG)
            </div>
          </div>
        </a>

        {/* Navigation Tabs & Theme Toggle Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Navigation Tabs */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--bg-surface-secondary)",
              padding: "3px",
              borderRadius: "var(--border-radius)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* Tab 1: Net Pay Calculator */}
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "var(--border-radius-sm)",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: isNetCalculator ? 700 : 500,
                color: isNetCalculator ? "#ffffff" : "var(--text-secondary)",
                backgroundColor: isNetCalculator
                  ? "var(--color-primary)"
                  : "transparent",
                boxShadow: isNetCalculator ? "var(--shadow-sm)" : "none",
                transition: "var(--transition)",
              }}
            >
              <CalculatorNavigationIcon size={15} />
              <span>Net Pay Calculator</span>
            </a>

            {/* Tab 2: Elterngeld 5-Year Financial Simulator */}
            <a
              href="/elterngeld"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "var(--border-radius-sm)",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: isElterngeld ? 700 : 500,
                color: isElterngeld ? "#ffffff" : "var(--text-secondary)",
                backgroundColor: isElterngeld
                  ? "var(--color-primary)"
                  : "transparent",
                boxShadow: isElterngeld ? "var(--shadow-sm)" : "none",
                transition: "var(--transition)",
              }}
            >
              <SimulatorNavigationIcon size={15} />
              <span>Elterngeld 5-Year Simulator</span>
              <span
                style={{
                  fontSize: "0.66rem",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: isElterngeld
                    ? "rgba(255, 255, 255, 0.25)"
                    : "var(--color-primary-bg)",
                  color: isElterngeld ? "#ffffff" : "var(--color-primary)",
                  fontWeight: 700,
                }}
              >
                PRO
              </span>
            </a>
          </nav>

          {/* Theme Toggle (Light / Dark / Auto) */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
