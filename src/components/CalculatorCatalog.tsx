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
  calculatorPath,
  lifeProfilePath,
  toCalculatorCategory,
} from "#/apps/appDefinition.ts";
import {
  calculatorApps,
  catalogPage,
  CATALOG_PAGE_SIZE,
} from "#/apps/registry.ts";
import {
  CalculatorNavigationIcon,
  CompanyCarMobilityIcon,
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
  TextField,
} from "#components/ui/TextField";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";

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
      return <HomeAcquisitionIcon size={24} />;
    case AppId.NetPay:
      return <CalculatorNavigationIcon size={24} />;
  }
}

/** The marketplace imports manifests, never a calculator entry or financial store. */
export default function CalculatorCatalog({ apps = calculatorApps, pageSize = CATALOG_PAGE_SIZE }: {
  apps?: readonly CalculatorAppDefinition[];
  pageSize?: number;
}): JSX.Element {
  const query = useSignal("");
  const category = useSignal<CalculatorCategory | undefined>(undefined);
  const requestedPage = useSignal(1);
  const search = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLElement>(null);
  const categories = [...new Set(apps.map((app) => app.category))];
  const page = catalogPage(apps, query.value, category.value, requestedPage.value, pageSize);

  // URL state makes searches, category choices and future multi-page results bookmarkable.
  useEffect(() => {
    const readLocation = (): void => {
      const parameters = new URLSearchParams(window.location.search);
      let selected: CalculatorCategory | undefined;
      try {
        selected = parameters.has("category") ? toCalculatorCategory(parameters.get("category")!) : undefined;
      }
      catch {
        selected = undefined;
      }
      if (selected && !categories.includes(selected)) {
        selected = undefined;
      }
      const found = catalogPage(apps, parameters.get("q") ?? "", selected, Number(parameters.get("page") ?? 1), pageSize);
      batch(() => {
        query.value = parameters.get("q") ?? "";
        category.value = selected;
        requestedPage.value = found.page;
      });
    };
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, [apps, pageSize]);

  const update = (term: string, selected: CalculatorCategory | undefined, number: number, replace = false): void => {
    const next = catalogPage(apps, term, selected, number, pageSize);
    batch(() => {
      query.value = term;
      category.value = selected;
      requestedPage.value = next.page;
    });
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    for (const [key, value] of [["q", term], ["category", selected ?? ""], ["page", next.page === 1 ? "" : String(next.page)]]) {
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
          onChange={(nextValue) => update(nextValue, category.value, 1, true)}
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
        {(query.value || category.value) && <button type="button" className="ui-btn" onClick={clear}>Clear filters</button>}
      </form>

      <section id="calculator-results" ref={results} tabIndex={-1} aria-labelledby="catalog-results-heading">
        <div className="calculator-catalog__results-heading">
          <h2 id="catalog-results-heading">Calculators</h2>
          <p role="status" aria-live="polite">{page.total} {page.total === 1 ? "tool" : "tools"}{page.pages > 1 ? ` · Page ${page.page} of ${page.pages}` : ""}</p>
        </div>
        <div className="calculator-catalog__grid">
          {page.items.map((app) => <article key={app.id} className="ui-card calculator-catalog__card">
            <div className="calculator-catalog__card-top"><span className="calculator-catalog__icon" aria-hidden="true">{renderAppIcon(app.id)}</span><span className="calculator-catalog__category">{app.category}</span></div>
            <h3>{app.title}</h3>
            <p>{app.description}</p>
            <ul>{app.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <a href={calculatorPath(app.id)} className="ui-btn ui-btn--primary calculator-catalog__open" aria-label={`Open ${app.title}`}>Open</a>
          </article>)}
        </div>
        {page.total === 0 && <div className="ui-card calculator-catalog__empty"><h3>No matching calculators</h3><p>Try another keyword or clear filters.</p><button type="button" className="ui-btn" onClick={clear}>Show all</button></div>}
        {page.pages > 1 && <nav className="calculator-catalog__pagination" aria-label="Calculator catalog pages">
          <button type="button" className="ui-btn" disabled={page.page === 1} onClick={() => changePage(page.page - 1)}>Previous</button>
          {Array.from({ length: page.pages }, (_, index) => <button key={index} type="button" className={page.page === index + 1 ? "ui-btn ui-btn--tint" : "ui-btn"} aria-label={`Page ${index + 1}`} aria-current={page.page === index + 1 ? "page" : undefined} onClick={() => changePage(index + 1)}>{index + 1}</button>)}
          <button type="button" className="ui-btn" disabled={page.page === page.pages} onClick={() => changePage(page.page + 1)}>Next</button>
        </nav>}
      </section>
    </AppShell>
  );
}
