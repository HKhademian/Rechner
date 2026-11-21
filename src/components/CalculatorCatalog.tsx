import "./CalculatorCatalog.css";
import {
  type JSX,
} from "preact";
import {
  useEffect,
  useRef,
} from "preact/hooks";
import {
  batch,
  useSignal,
} from "@preact/signals";
import {
  type CalculatorAppDefinition,
  type CalculatorCategory,
  AppId,
  CalculatorReleaseStatus,
  calculatorPath,
  toCalculatorCategory,
} from "#/apps/appDefinition.ts";
import {
  CATALOG_PAGE_SIZE,
  allCalculatorApps,
  catalogPage,
  visibleCatalogApps,
} from "#/apps/registry.ts";
import {
  CalculatorNavigationIcon,
  ChildcareKitaIcon,
  CityMapNavigationIcon,
  CommuterAllowanceIcon,
  CompanyCarMobilityIcon,
  EmploymentTransitionIcon,
  ExpensePlannerIcon,
  HomeAcquisitionIcon,
  PaymentQrCodeIcon,
  PlanningDashboardIcon,
  SimulatorNavigationIcon,
  SolarEnergyIcon,
  StepTransitionIcon,
  TaxClassSwitchIcon,
  TravelPlannerIcon,
  VisaResidenceIcon,
} from "#components/Icons";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  Badge,
  BadgeTone,
} from "#components/ui/Badge";
import {
  Button,
  ButtonVariant,
} from "#components/ui/Button";
import {
  EmptyState,
} from "#components/ui/EmptyState";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  Pagination,
} from "#components/ui/Pagination";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  TextField,
} from "#components/ui/TextField";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";

const catalogStorage = browserAppStorage(AppId.Catalog);

function renderAppIcon(appId: CalculatorAppDefinition["id"]): JSX.Element {
  switch (appId) {
    case AppId.ParentalLeave:
    case AppId.FamilyMilestones:
    case AppId.Mutterschutz:
    case AppId.KindergeldComparison:
    case AppId.ElterngeldQuick:
      return <SimulatorNavigationIcon size={20} />;
    case AppId.MunichMap:
      return <CityMapNavigationIcon size={20} />;
    case AppId.GiroCode:
      return <PaymentQrCodeIcon size={20} />;
    case AppId.Visa:
    case AppId.PermanentResidency:
    case AppId.Citizenship:
      return <VisaResidenceIcon size={20} />;
    case AppId.CompanyCar:
      return <CompanyCarMobilityIcon size={20} />;
    case AppId.SolarEnergy:
      return <SolarEnergyIcon size={20} />;
    case AppId.Housing:
    case AppId.Mortgage:
    case AppId.AssetAffordability:
      return <HomeAcquisitionIcon size={20} />;
    case AppId.Kita:
    case AppId.ChildcarePlanner:
      return <ChildcareKitaIcon size={20} />;
    case AppId.MinijobMidijob:
    case AppId.ResignationRunway:
    case AppId.SalaryRaise:
      return <EmploymentTransitionIcon size={20} />;
    case AppId.CommuterAllowance:
      return <CommuterAllowanceIcon size={20} />;
    case AppId.ExpensePlanner:
    case AppId.CashReconciliation:
      return <ExpensePlannerIcon size={20} />;
    case AppId.TravelPlanner:
      return <TravelPlannerIcon size={20} />;
    case AppId.TaxClassSwitch:
    case AppId.ProgressionTax:
    case AppId.KalteProgression:
    case AppId.AgeRelief:
      return <TaxClassSwitchIcon size={20} />;
    case AppId.PlanningDashboard:
      return <PlanningDashboardIcon size={20} />;
    case AppId.NetPay:
      return <CalculatorNavigationIcon size={20} />;
  }
}

/** Minimal local-first calculator directory; imports manifests only, never calculator entries or stores. */
export default function CalculatorCatalog({ apps = allCalculatorApps, pageSize = CATALOG_PAGE_SIZE }: {
  apps?: readonly CalculatorAppDefinition[];
  pageSize?: number;
}): JSX.Element {
  const query = useSignal("");
  const category = useSignal<CalculatorCategory | undefined>(undefined);
  const showDemos = useSignal(false);
  const requestedPage = useSignal(1);
  const search = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLElement>(null);
  const demoCount = apps.filter((app) => app.releaseStatus === CalculatorReleaseStatus.Draft).length;
  const visibleApps = visibleCatalogApps(apps, showDemos.value);
  const categories = [...new Set(visibleApps.map((app) => app.category))];
  const page = catalogPage(visibleApps, query.value, category.value, requestedPage.value, pageSize);
  const hiddenDemoMatchCount = !showDemos.value
    ? catalogPage(
      apps.filter((app) => app.releaseStatus === CalculatorReleaseStatus.Draft),
      query.value,
      category.value,
      1,
      pageSize,
    ).total
    : 0;

  useEffect(() => {
    const readLocation = (): void => {
      const parameters = new URLSearchParams(window.location.search);
      const demosParam = parameters.get("demos");
      const includeDemos = demosParam !== null
        ? demosParam === "1"
        : catalogStorage.getItem("showDemos") === "1";
      const scopedApps = visibleCatalogApps(apps, includeDemos);
      const scopedCategories = [...new Set(scopedApps.map((app) => app.category))];
      let selected: CalculatorCategory | undefined;
      try {
        selected = parameters.has("category") ? toCalculatorCategory(parameters.get("category")!) : undefined;
      }
      catch {
        selected = undefined;
      }
      if (selected && !scopedCategories.includes(selected)) {
        selected = undefined;
      }
      const found = catalogPage(scopedApps, parameters.get("q") ?? "", selected, Number(parameters.get("page") ?? 1), pageSize);
      batch(() => {
        showDemos.value = includeDemos;
        query.value = parameters.get("q") ?? "";
        category.value = selected;
        requestedPage.value = found.page;
      });
    };
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, [apps, pageSize]);

  const update = (
    term: string,
    selected: CalculatorCategory | undefined,
    number: number,
    includeDemos = showDemos.value,
    replace = false,
  ): void => {
    const scopedApps = visibleCatalogApps(apps, includeDemos);
    const next = catalogPage(scopedApps, term, selected, number, pageSize);
    batch(() => {
      showDemos.value = includeDemos;
      query.value = term;
      category.value = selected;
      requestedPage.value = next.page;
    });
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    for (const [key, value] of [
      ["q", term],
      ["category", selected ?? ""],
      ["demos", includeDemos ? "1" : ""],
      ["page", next.page === 1 ? "" : String(next.page)],
    ]) {
      if (value) {
        url.searchParams.set(key, value);
      }
      else {
        url.searchParams.delete(key);
      }
    }
    if (url.href !== window.location.href) {
      if (replace) {
        window.history.replaceState(null, "", url);
      }
      else {
        window.history.pushState(null, "", url);
      }
    }
  };
  const changePage = (number: number): void => {
    update(query.value, category.value, number);
    results.current?.focus();
  };
  const toggleDemos = (includeDemos: boolean): void => {
    catalogStorage.setItem("showDemos", includeDemos ? "1" : "0");
    update(query.value, category.value, 1, includeDemos);
  };
  const clear = (): void => {
    update("", undefined, 1);
    search.current?.focus();
  };

  return (
    <AppShell currentPath="/" mainClassName="calculator-catalog">
      <PageHeader
        title="Life in Germany, calculated."
        subtitle="Private, local-first calculators grounded in German statutory formulas."
      />

      <form className="calculator-catalog__filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <div className="calculator-catalog__category-filter">
          <SegmentedControl
            label="Filter by category"
            value={category.value ?? "__all__"}
            onChange={(selected) => update(query.value, selected === "__all__" ? undefined : toCalculatorCategory(String(selected)), 1)}
            options={[
              {
                value: "__all__",
                label: "All",
              },
              ...categories.map((item) => ({
                value: item,
                label: item,
              })),
            ]}
          />
        </div>
        <div className="calculator-catalog__search-wrap">
          <TextField
            id="calculator-search"
            inputRef={search}
            type="search"
            label="Find a calculator"
            placeholder="Search salary, Elterngeld, housing…"
            ariaControls="calculator-results"
            className="calculator-catalog__search-field"
            compact
            value={query.value}
            onChange={(nextValue) => update(nextValue, category.value, 1, showDemos.value, true)}
          />
          {(query.value || category.value) && (
            <Button variant={ButtonVariant.Ghost} onClick={clear}>Clear</Button>
          )}
        </div>
      </form>

      <section id="calculator-results" ref={results} tabIndex={-1} aria-labelledby="catalog-results-heading">
        <div className="calculator-catalog__results-heading">
          <div className="calculator-catalog__results-meta">
            <h2 id="catalog-results-heading">Calculators</h2>
            <p role="status" aria-live="polite">
              {page.total} {page.total === 1 ? "tool" : "tools"}
              {!showDemos.value && demoCount > 0 ? ` · ${demoCount} demos hidden` : ""}
              {page.pages > 1 ? ` · Page ${page.page} of ${page.pages}` : ""}
            </p>
          </div>
          {demoCount > 0 && (
            <div className="calculator-catalog__demo-toggle">
              <ToggleSwitch
                id="calculator-show-demos"
                label={`Show demos (${demoCount})`}
                plain
                checked={showDemos.value}
                onChange={toggleDemos}
              />
            </div>
          )}
        </div>

        <div className="calculator-catalog__grid">
          {page.items.map((app) => (
            <a
              key={app.id}
              href={calculatorPath(app.id)}
              className="ui-card ui-card--interactive calculator-catalog__card"
              aria-label={`Open ${app.title}`}
            >
              <div className="calculator-catalog__card-top">
                <span className="calculator-catalog__icon" aria-hidden="true">{renderAppIcon(app.id)}</span>
                <span className="calculator-catalog__card-badges">
                  {app.releaseStatus === CalculatorReleaseStatus.Draft && (
                    <Badge tone={BadgeTone.Warning} className="calculator-catalog__demo-badge">Demo</Badge>
                  )}
                  <span className="calculator-catalog__category">{app.category}</span>
                  <span className="calculator-catalog__arrow" aria-hidden="true">
                    <StepTransitionIcon size={14} />
                  </span>
                </span>
              </div>
              <h3 className="calculator-catalog__card-title">{app.title}</h3>
              <p className="calculator-catalog__card-desc">{app.description}</p>
            </a>
          ))}
        </div>

        {page.total === 0 && (
          <EmptyState
            title="No matching calculators"
            description={
              hiddenDemoMatchCount > 0
                ? `${hiddenDemoMatchCount} matching demo ${hiddenDemoMatchCount === 1 ? "tool is" : "tools are"} currently hidden.`
                : "Try another keyword or clear filters."
            }
            actions={(
              <>
                {hiddenDemoMatchCount > 0 && (
                  <Button variant={ButtonVariant.Tint} onClick={() => toggleDemos(true)}>
                    Show demo tools
                  </Button>
                )}
                <Button onClick={clear}>Show all</Button>
              </>
            )}
          />
        )}

        <Pagination
          page={page.page}
          totalPages={page.pages}
          ariaLabel="Calculator catalog pages"
          onChange={changePage}
        />
      </section>
    </AppShell>
  );
}
