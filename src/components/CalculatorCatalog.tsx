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
  CalculatorCategory as Categories,
  calculatorPath,
  toCalculatorCategory,
} from "#/apps/appDefinition.ts";
import {
  calculatorApps,
  catalogPage,
  CATALOG_PAGE_SIZE,
} from "#/apps/registry.ts";
import Navigation from "#components/Navigation";
import {
  CalculatorNavigationIcon,
  SimulatorNavigationIcon,
} from "#components/Icons";

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
  return <>
    <Navigation currentPath="/" />
    <main id="main-content" className="calculator-catalog" tabIndex={-1}>
      <header className="calculator-catalog__intro">
        <div>
          <p className="calculator-catalog__eyebrow">Calculator marketplace</p>
          <h1>What would you like to calculate?</h1>
          <p>Choose a tool for work, family and everyday planning. Each calculator keeps its own inputs and saved scenarios.</p>
        </div>
        <aside className="calculator-catalog__privacy"><strong>Your own workspace</strong><p>No account needed. Calculations run in your browser, with saved inputs on this device.</p></aside>
      </header>

      <form className="calculator-catalog__filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <label for="calculator-search">Search calculators
          <input ref={search} id="calculator-search" type="search" placeholder="Try salary, Netto or Elterngeld" value={query.value} aria-controls="calculator-results"
            onInput={(event) => update(event.currentTarget.value, category.value, 1, true)} />
        </label>
        <label for="calculator-category">Category
          <select id="calculator-category" value={category.value ?? ""} aria-controls="calculator-results" onChange={(event) => update(query.value, event.currentTarget.value === "" ? undefined : toCalculatorCategory(event.currentTarget.value), 1)}>
            <option value="">All calculators</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        {(query.value || category.value) && <button type="button" onClick={clear}>Clear filters</button>}
      </form>

      <section id="calculator-results" ref={results} tabIndex={-1} aria-labelledby="catalog-results-heading">
        <div className="calculator-catalog__results-heading">
          <h2 id="catalog-results-heading">Available calculators</h2>
          <p role="status" aria-live="polite">{page.total} {page.total === 1 ? "calculator" : "calculators"}{page.pages > 1 ? ` · Page ${page.page} of ${page.pages}` : ""}</p>
        </div>
        <div className="calculator-catalog__grid">
          {page.items.map((app) => <article key={app.id} className="calculator-catalog__card">
            <div className="calculator-catalog__card-top"><span className="calculator-catalog__icon" aria-hidden="true">{app.category === Categories.Family ? <SimulatorNavigationIcon size={24} /> : <CalculatorNavigationIcon size={24} />}</span><span className="calculator-catalog__category">{app.category}</span></div>
            <h3>{app.title}</h3>
            <p>{app.description}</p>
            <ul>{app.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <a href={calculatorPath(app.id)} className="calculator-catalog__open" aria-label={`Open ${app.title}`}>Open calculator</a>
          </article>)}
        </div>
        {page.total === 0 && <div className="calculator-catalog__empty"><h3>No matching calculators</h3><p>Try another search term or choose a different category.</p><button type="button" onClick={clear}>Show all calculators</button></div>}
        {page.pages > 1 && <nav className="calculator-catalog__pagination" aria-label="Calculator catalog pages">
          <button type="button" disabled={page.page === 1} onClick={() => changePage(page.page - 1)}>Previous</button>
          {Array.from({ length: page.pages }, (_, index) => <button key={index} type="button" aria-label={`Page ${index + 1}`} aria-current={page.page === index + 1 ? "page" : undefined} onClick={() => changePage(index + 1)}>{index + 1}</button>)}
          <button type="button" disabled={page.page === page.pages} onClick={() => changePage(page.page + 1)}>Next</button>
        </nav>}
      </section>
      <footer className="calculator-catalog__footer"><p>Separate calculators. Your inputs stay with the tool you use.</p><p>Review the assumptions and source references beside each calculation.</p></footer>
    </main>
  </>;
}
