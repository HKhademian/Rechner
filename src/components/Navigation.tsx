import "./Navigation.css";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";
import ThemeToggle from "#components/ThemeToggle";
import PrivacyStatus from "#components/PrivacyStatus";
import LawReferenceModal from "#components/laws/LawReferenceModal";
import {
  CalculatorNavigationIcon,
  ChevronDownIcon,
  StatutorySectionIcon,
} from "#components/Icons";
import {
  AppId,
  CalculatorReleaseStatus,
  lawCatalogPath,
  lawDetailPath,
  lifeProfilePath,
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  allCalculatorApps,
  calculatorAtPath,
} from "#/apps/registry.ts";
import {
  LawId,
} from "#engine/laws/types";
import {
  isPlainPrimaryClick,
  openLawReference,
} from "#store/lawReferenceStore";
import {
  calculatorNavigationItems,
  isActiveRoute,
  normalizeRoutePath,
} from "#utils/uiHelpers";

export interface NavigationProps {
  readonly currentPath?: string;
}

/** Shared sticky top header with Home, Tools dropdown switcher, Life Profile, Laws, Quick § Ref, Privacy, and Theme controls. */
export default function Navigation({ currentPath = "/" }: NavigationProps): JSX.Element {
  const toolsDetailsRef = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const app = calculatorAtPath(currentPath);
  const home = normalizeRoutePath(currentPath) === normalizeRoutePath(sitePath("/"));
  const onLawsPage = isActiveRoute(currentPath, lawCatalogPath());
  const onProfilePage = isActiveRoute(currentPath, lifeProfilePath());
  const toolItems = calculatorNavigationItems(allCalculatorApps, currentPath);

  useEffect(() => {
    const closeWhenOutside = (event: Event): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const details = toolsDetailsRef.current;
      if (details?.open && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      const details = toolsDetailsRef.current;
      if (details?.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  let defaultLawId: LawId = LawId.EStG_32a;
  if (app?.id === AppId.ParentalLeave) {
    defaultLawId = LawId.BEEG_1;
  }
  else if (app?.id === AppId.Visa) {
    defaultLawId = LawId.AufenthG_18g;
  }
  else if (app?.id === AppId.PermanentResidency) {
    defaultLawId = LawId.AufenthG_18c;
  }
  else if (app?.id === AppId.TaxClassSwitch) {
    defaultLawId = LawId.EStG_38b;
  }
  else if (app?.id === AppId.FamilyMilestones) {
    defaultLawId = LawId.BEEG_1;
  }
  else if (app?.id === AppId.ChildcarePlanner) {
    defaultLawId = LawId.EStG_10_1_5;
  }
  else if (app?.id === AppId.CompanyCar) {
    defaultLawId = LawId.EStG_6_1_4;
  }
  else if (app?.id === AppId.SolarEnergy) {
    defaultLawId = LawId.EEG_48;
  }
  else if (app?.id === AppId.Housing) {
    defaultLawId = LawId.KfW_300;
  }
  else if (app?.id === AppId.Kita) {
    defaultLawId = LawId.EStG_10_1_5;
  }
  else if (app?.id === AppId.MinijobMidijob) {
    defaultLawId = LawId.SGB4_20;
  }
  else if (app?.id === AppId.CommuterAllowance) {
    defaultLawId = LawId.EStG_9_1_4;
  }
  const quickLawHref = lawDetailPath(defaultLawId);

  return <>
    <a className="calculator-skip-link" href="#main-content">Skip to content</a>
    <header id="main-navigation" className="calculator-navigation">
      <div className="calculator-navigation__inner">
        <a href={sitePath("/")} className="calculator-navigation__brand" aria-label="Rechner home">
          <span className="calculator-navigation__mark"><CalculatorNavigationIcon size={22} /></span>
          <span><strong>Rechner</strong><small>Life in Germany, calculated</small></span>
        </a>
        <button type="button" className="calculator-navigation__menu-toggle" aria-expanded={menuOpen} aria-controls="navigation-menu" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
        <div id="navigation-menu" className={`calculator-navigation__menu${menuOpen ? " is-open" : ""}`}>
          <nav aria-label="Main navigation" className="calculator-navigation__links">
            <a href={sitePath("/")} aria-current={home ? "page" : undefined}>All calculators</a>
            <details ref={toolsDetailsRef} className="calculator-navigation__tools">
              <summary
                className={app ? "is-active" : undefined}
                aria-label="Switch calculator tool"
              >
                <span>{app ? app.title : "Tools"}</span>
                {app?.releaseStatus === CalculatorReleaseStatus.Draft && (
                  <span className="calculator-navigation__tool-badge">Demo</span>
                )}
                <ChevronDownIcon size={13} className="calculator-navigation__tools-chevron" />
              </summary>
              <div
                className="calculator-navigation__tools-panel"
                role="region"
                aria-label="Calculators and planning tools"
              >
                {toolItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className="calculator-navigation__tool-item"
                    aria-current={item.isCurrent ? "page" : undefined}
                  >
                    <span className="calculator-navigation__tool-header">
                      <span className="calculator-navigation__tool-title">{item.title}</span>
                      {item.isDraft && (
                        <span className="calculator-navigation__tool-badge">Demo</span>
                      )}
                    </span>
                    <span className="calculator-navigation__tool-meta">{item.category}</span>
                  </a>
                ))}
              </div>
            </details>
            <a href={lifeProfilePath()} aria-current={onProfilePage ? "page" : undefined}>Life Profile</a>
            <a href={lawCatalogPath()} aria-current={onLawsPage ? "page" : undefined}>Laws &amp; Rules</a>
            <a href={sitePath("/topics/")} aria-current={isActiveRoute(currentPath, sitePath("/topics/")) ? "page" : undefined}>Topics</a>
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
      </div>
    </header>
    <LawReferenceModal />
  </>;
}
