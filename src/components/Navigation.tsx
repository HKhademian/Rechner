import "./Navigation.css";
import {
  type JSX,
} from "preact";
import ThemeToggle from "#components/ThemeToggle";
import PrivacyStatus from "#components/PrivacyStatus";
import {
  CalculatorNavigationIcon,
} from "#components/Icons";
import {
  calculatorPath,
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  calculatorAtPath,
} from "#/apps/registry.ts";

export interface NavigationProps {
  currentPath?: string;
}

/** A catalog link and the current app scale without adding a tab for every future calculator. */
export default function Navigation({ currentPath = "/" }: NavigationProps): JSX.Element {
  const app = calculatorAtPath(currentPath);
  const home = currentPath === "/" || currentPath === "";
  return <>
    <a className="calculator-skip-link" href="#main-content">Skip to content</a>
    <header id="main-navigation" className="calculator-navigation">
      <div className="calculator-navigation__inner">
        <a href={sitePath("/")} className="calculator-navigation__brand" aria-label="Rechner home">
          <span className="calculator-navigation__mark"><CalculatorNavigationIcon size={22} /></span>
          <span><strong>Rechner</strong><small>Life in Germany, calculated</small></span>
        </a>
        <nav aria-label="Main navigation" className="calculator-navigation__links">
          <a href={sitePath("/")} aria-current={home ? "page" : undefined}>All calculators</a>
          {app && <a href={calculatorPath(app.id)} aria-current="page">{app.title}</a>}
        </nav>
        <div className="calculator-navigation__preferences">
          <PrivacyStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  </>;
}
