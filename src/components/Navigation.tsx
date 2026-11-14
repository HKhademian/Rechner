import "./Navigation.css";
import {
  type JSX,
} from "preact";
import ThemeToggle from "#components/ThemeToggle";
import PrivacyStatus from "#components/PrivacyStatus";
import LawReferenceModal from "#components/laws/LawReferenceModal";
import {
  CalculatorNavigationIcon,
  StatutorySectionIcon,
} from "#components/Icons";
import {
  AppId,
  calculatorPath,
  lawCatalogPath,
  lawDetailPath,
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  calculatorAtPath,
} from "#/apps/registry.ts";
import {
  LawId,
} from "#engine/laws/types";
import {
  isPlainPrimaryClick,
  openLawReference,
} from "#store/lawReferenceStore";

export interface NavigationProps {
  currentPath?: string;
}

/** A catalog link, law reference directory link, and active calculator nav item. */
export default function Navigation({ currentPath = "/" }: NavigationProps): JSX.Element {
  const app = calculatorAtPath(currentPath);
  const home = currentPath === "/" || currentPath === "";
  const lawsBasePath = lawCatalogPath().replace(/\/+$/, "");
  const normalizedCurrent = currentPath.replace(/\/+$/, "");
  const onLawsPage = normalizedCurrent === lawsBasePath ||
    normalizedCurrent.startsWith(`${lawsBasePath}/`);
  const defaultLawId = app?.id === AppId.ParentalLeave ? LawId.BEEG_1 : LawId.EStG_32a;
  const quickLawHref = lawDetailPath(defaultLawId);

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
          <a href={lawCatalogPath()} aria-current={onLawsPage ? "page" : undefined}>Laws &amp; Rules</a>
        </nav>
        <div className="calculator-navigation__preferences">
          {!onLawsPage && (
            <a
              href={quickLawHref}
              className="calculator-navigation__law-btn"
              aria-label="Open quick law reference popup or Ctrl+Click for full law page"
              title="Click for quick statutory preview · Ctrl+Click to open full Law Page"
              onClick={(event) => {
                if (!isPlainPrimaryClick(event)) {
                  return;
                }
                event.preventDefault();
                openLawReference(defaultLawId);
              }}
            >
              <StatutorySectionIcon size={13} />
              <span>Quick § Ref</span>
            </a>
          )}
          <PrivacyStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
    <LawReferenceModal />
  </>;
}
