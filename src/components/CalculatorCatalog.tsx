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
  lifeProfilePath,
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
  CommuterAllowanceIcon,
  CompanyCarMobilityIcon,
  EmploymentTransitionIcon,
  HomeAcquisitionIcon,
  PaymentQrCodeIcon,
  SimulatorNavigationIcon,
  SolarEnergyIcon,
  VisaResidenceIcon,
} from "#components/Icons";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  PageHeader,
} from "#components/ui/PageHeader";
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
      return <SimulatorNavigationIcon size={24} />;
    case AppId.GiroCode:
      return <PaymentQrCodeIcon size={24} />;
    case AppId.Visa:
      return <VisaResidenceIcon size={24} />;
    case AppId.CompanyCar:
      return <CompanyCarMobilityIcon size={24} />;
    case AppId.SolarEnergy:
      return <SolarEnergyIcon size={24} />;
    case AppId.Housing:
    case AppId.Mortgage:
      return <HomeAcquisitionIcon size={24} />;
    case AppId.Kita:
      return <ChildcareKitaIcon size={24} />;
    case AppId.MinijobMidijob:
      return <EmploymentTransitionIcon size={24} />;
    case AppId.CommuterAllowance:
      return <CommuterAllowanceIcon size={24} />;
    case AppId.NetPay:
      return <CalculatorNavigationIcon size={24} />;
  }
}

/** The marketplace imports manifests, never a calculator entry or financial store. */
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

  // URL state makes searches, category choices, and opt-in demo visibility bookmarkable.
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
        eyebrow="Rechner"
        title="German finance and tax calculators"
        subtitle="Simple, private estimates for take-home pay, parental leave, taxes, and everyday payments."
        actions={
          <>
            <span className="badge-neutral">Private · browser only</span>
            <a href={lifeProfilePath()} className="ui-btn ui-btn--tint">
              My Life Profile
            </a>
          </>
        }
      />

      <form className="ui-card calculator-catalog__filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <TextField
          id="calculator-search"
          inputRef={search}
          type="search"
          label="Find a calculator"
          placeholder="Salary, Netto, Elterngeld, GiroCode"
          ariaControls="calculator-results"
          className="calculator-catalog__search-field"
          value={query.value}
          onChange={(nextValue) => update(nextValue, category.value, 1, showDemos.value, true)}
        />
        <div className="calculator-catalog__category-filter">
          <span>Category</span>
          <SegmentedControl
            label="Filter by category"
            value={category.value ?? "__all__"}
            onChange={(selected) => update(query.value, selected === "__all__" ? undefined : toCalculatorCategory(String(selected)), 1)}
            options={[
              { value: "__all__",
                label: "All" },
              ...categories.map((item) => ({ value: item,
                label: item })),
            ]}
          />
        </div>
        {demoCount > 0 && (
          <div className="calculator-catalog__demo-toggle">
            <ToggleSwitch
              id="calculator-show-demos"
              label="Show demo tools"
              hint={`${demoCount} prerelease`}
              checked={showDemos.value}
              onChange={toggleDemos}
            />
          </div>
        )}
        {(query.value || category.value) && <button type="button" className="ui-btn" onClick={clear}>Clear filters</button>}
      </form>

      <section id="calculator-results" ref={results} tabIndex={-1} aria-labelledby="catalog-results-heading">
        <div className="calculator-catalog__results-heading">
          <h2 id="catalog-results-heading">Calculators</h2>
          <p role="status" aria-live="polite">
            {page.total} {page.total === 1 ? "tool" : "tools"}
            {!showDemos.value && demoCount > 0 ? ` · ${demoCount} demo hidden` : ""}
            {page.pages > 1 ? ` · Page ${page.page} of ${page.pages}` : ""}
          </p>
        </div>
        <div className="calculator-catalog__grid">
          {page.items.map((app) => <article key={app.id} className="ui-card calculator-catalog__card">
            <div className="calculator-catalog__card-top">
              <span className="calculator-catalog__icon" aria-hidden="true">{renderAppIcon(app.id)}</span>
              <span className="calculator-catalog__card-badges">
                {app.releaseStatus === CalculatorReleaseStatus.Draft && (
                  <span className="badge-warning calculator-catalog__demo-badge">Demo</span>
                )}
                <span className="calculator-catalog__category">{app.category}</span>
              </span>
            </div>
            <h3>{app.title}</h3>
            <p>{app.description}</p>
            <ul>{app.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <a href={calculatorPath(app.id)} className="ui-btn ui-btn--primary calculator-catalog__open" aria-label={`Open ${app.title}`}>Open</a>
          </article>)}
        </div>
        {page.total === 0 && (
          <div className="ui-card calculator-catalog__empty">
            <h3>No matching calculators</h3>
            <p>
              {hiddenDemoMatchCount > 0
                ? `${hiddenDemoMatchCount} matching demo ${hiddenDemoMatchCount === 1 ? "tool is" : "tools are"} currently hidden.`
                : "Try another keyword or clear filters."}
            </p>
            <div className="calculator-catalog__empty-actions">
              {hiddenDemoMatchCount > 0 && (
                <button type="button" className="ui-btn ui-btn--tint" onClick={() => toggleDemos(true)}>
                  Show demo tools
                </button>
              )}
              <button type="button" className="ui-btn" onClick={clear}>Show all</button>
            </div>
          </div>
        )}
        {page.pages > 1 && <nav className="calculator-catalog__pagination" aria-label="Calculator catalog pages">
          <button type="button" className="ui-btn" disabled={page.page === 1} onClick={() => changePage(page.page - 1)}>Previous</button>
          {Array.from({ length: page.pages }, (_, index) => <button key={index} type="button" className={page.page === index + 1 ? "ui-btn ui-btn--tint" : "ui-btn"} aria-label={`Page ${index + 1}`} aria-current={page.page === index + 1 ? "page" : undefined} onClick={() => changePage(index + 1)}>{index + 1}</button>)}
          <button type="button" className="ui-btn" disabled={page.page === page.pages} onClick={() => changePage(page.page + 1)}>Next</button>
        </nav>}
      </section>
    </AppShell>
  );
}
