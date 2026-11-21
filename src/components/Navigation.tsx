import "./Navigation.css";
import {
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
  Badge,
  BadgeTone,
} from "#components/ui/Badge";
import {
  PopoverAlign,
  PopoverMenu,
} from "#components/ui/PopoverMenu";
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

const REFERENCE_LINKS = [
  {
    href: lawCatalogPath(),
    title: "Laws & Rules",
    description: "German statutory clauses (§ EStG, BEEG, AufenthG)",
  },
  {
    href: sitePath("/topics/"),
    title: "Topics",
    description: "Plain-language explanations of core rules",
  },
  {
    href: sitePath("/formulas/"),
    title: "Formulas",
    description: "Exact mathematical equations behind calculators",
  },
  {
    href: sitePath("/constants/"),
    title: "Rates & Assumptions",
    description: "Annual thresholds, brackets, and statutory figures",
  },
] as const;

/** Minimal sticky top navigation with unified Tools & Reference popovers, Quick § Ref, Privacy, and Appearance controls. */
export default function Navigation({ currentPath = "/" }: NavigationProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolFilter, setToolFilter] = useState("");
  const app = calculatorAtPath(currentPath);
  const home = normalizeRoutePath(currentPath) === normalizeRoutePath(sitePath("/"));
  const onLawsPage = isActiveRoute(currentPath, lawCatalogPath());
  const onProfilePage = isActiveRoute(currentPath, lifeProfilePath());
  const onReferencePage = REFERENCE_LINKS.some((item) => isActiveRoute(currentPath, item.href));
  const toolItems = calculatorNavigationItems(allCalculatorApps, currentPath);
  const trimmedFilter = toolFilter.trim().toLowerCase();
  const visibleTools = trimmedFilter
    ? toolItems.filter((item) =>
      `${item.title} ${item.category}`.toLowerCase().includes(trimmedFilter))
    : toolItems;

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
  else if (app?.id === AppId.Mutterschutz) {
    defaultLawId = LawId.MuSchG_19;
  }
  else if (app?.id === AppId.ProgressionTax) {
    defaultLawId = LawId.EStG_32b;
  }
  else if (app?.id === AppId.KindergeldComparison) {
    defaultLawId = LawId.EStG_66;
  }
  else if (app?.id === AppId.ElterngeldQuick) {
    defaultLawId = LawId.BEEG_1;
  }
  else if (app?.id === AppId.KalteProgression) {
    defaultLawId = LawId.InflG;
  }
  else if (app?.id === AppId.AgeRelief) {
    defaultLawId = LawId.EStG_24a;
  }
  const quickLawHref = lawDetailPath(defaultLawId);

  return (
    <>
      <a className="calculator-skip-link" href="#main-content">Skip to content</a>
      <header id="main-navigation" className="calculator-navigation">
        <div className="calculator-navigation__inner">
          <a href={sitePath("/")} className="calculator-navigation__brand" aria-label="Rechner home">
            <span className="calculator-navigation__mark">
              <CalculatorNavigationIcon size={18} />
            </span>
            <strong>Rechner</strong>
          </a>

          <button
            type="button"
            className="calculator-navigation__menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="navigation-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>

          <div id="navigation-menu" className={`calculator-navigation__menu${menuOpen ? " is-open" : ""}`}>
            <nav aria-label="Main navigation" className="calculator-navigation__links">
              <a href={sitePath("/")} aria-current={home ? "page" : undefined}>Calculators</a>

              <PopoverMenu
                className="calculator-navigation__tools"
                panelClassName="calculator-navigation__tools-panel"
                align={PopoverAlign.Left}
                summaryClassName={app ? "is-active" : undefined}
                summaryAriaLabel="Switch calculator tool"
                panelAriaLabel="Calculators and planning tools"
                summary={(
                  <>
                    <span>{app ? app.title : "Switch tool"}</span>
                    {app?.releaseStatus === CalculatorReleaseStatus.Draft && (
                      <Badge tone={BadgeTone.Warning} className="calculator-navigation__tool-badge">Demo</Badge>
                    )}
                    <ChevronDownIcon size={13} className="calculator-navigation__tools-chevron" />
                  </>
                )}
              >
                <div className="calculator-navigation__tools-search">
                  <input
                    type="search"
                    value={toolFilter}
                    placeholder="Filter tools…"
                    aria-label="Filter calculator tools"
                    onInput={(event) => setToolFilter(event.currentTarget.value)}
                  />
                </div>
                <div className="calculator-navigation__tools-list">
                  {visibleTools.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className="calculator-navigation__tool-item"
                      aria-current={item.isCurrent ? "page" : undefined}
                    >
                      <span className="calculator-navigation__tool-header">
                        <span className="calculator-navigation__tool-title">{item.title}</span>
                        {item.isDraft && (
                          <Badge tone={BadgeTone.Warning} className="calculator-navigation__tool-badge">Demo</Badge>
                        )}
                      </span>
                      <span className="calculator-navigation__tool-meta">{item.category}</span>
                    </a>
                  ))}
                  {visibleTools.length === 0 && (
                    <p className="calculator-navigation__tools-empty">No matching tools</p>
                  )}
                </div>
              </PopoverMenu>

              <a href={lifeProfilePath()} aria-current={onProfilePage ? "page" : undefined}>Life Profile</a>

              <PopoverMenu
                className="calculator-navigation__tools"
                panelClassName="calculator-navigation__ref-panel"
                align={PopoverAlign.Left}
                summaryClassName={onReferencePage ? "is-active" : undefined}
                summaryAriaLabel="Statutory reference and guides"
                panelAriaLabel="Reference pages"
                summary={(
                  <>
                    <span>Reference</span>
                    <ChevronDownIcon size={13} className="calculator-navigation__tools-chevron" />
                  </>
                )}
              >
                {REFERENCE_LINKS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="calculator-navigation__tool-item"
                    aria-current={isActiveRoute(currentPath, item.href) ? "page" : undefined}
                  >
                    <span className="calculator-navigation__tool-title">{item.title}</span>
                    <span className="calculator-navigation__tool-meta">{item.description}</span>
                  </a>
                ))}
              </PopoverMenu>
            </nav>

            <div className="calculator-navigation__preferences">
              {!onLawsPage && (
                <a
                  href={quickLawHref}
                  className="calculator-navigation__law-btn"
                  aria-label="Open quick law reference popup or Ctrl+Click for full law page"
                  title="Quick statutory preview · Ctrl+Click for full Law Page"
                  onClick={(event) => {
                    if (!isPlainPrimaryClick(event)) {
                      return;
                    }
                    event.preventDefault();
                    openLawReference(defaultLawId);
                  }}
                >
                  <StatutorySectionIcon size={13} />
                  <span>§ Laws</span>
                </a>
              )}
              <PrivacyStatus />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <LawReferenceModal />
    </>
  );
}
