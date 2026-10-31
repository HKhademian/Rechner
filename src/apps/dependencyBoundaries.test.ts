import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import {
  createRequire,
} from "node:module";
import {
  dirname,
  resolve,
} from "node:path";
import {
  it,
} from "node:test";
import ts from "typescript";

/** Follow runtime source imports only; shared interfaces do not initialize another app. */
function runtimeDependencies(entry: string): Set<string> {
  const visited = new Set<string>();
  const visit = (file: string): void => {
    if (visited.has(file) || !/\.tsx?$/.test(file)) {
      return;
    }
    visited.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const follow = (specifier: string): void => {
      let target: string | undefined;
      if (specifier.startsWith("#")) {
        target = createRequire(file).resolve(specifier);
      }
      else if (specifier.startsWith(".")) {
        const base = resolve(dirname(file), specifier);
        target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(existsSync);
      }
      if (target) {
        visit(target);
      }
    };
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        const names = clause?.namedBindings;
        const typesOnly = clause?.isTypeOnly || (!clause?.name && names && ts.isNamedImports(names) && names.elements.every((item) => item.isTypeOnly));
        if (!typesOnly) {
          follow(statement.moduleSpecifier.text);
        }
      }
      if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const names = statement.exportClause;
        if (!names || !ts.isNamedExports(names) || names.elements.some((item) => !item.isTypeOnly)) {
          follow(statement.moduleSpecifier.text);
        }
      }
    }
  };
  visit(resolve(entry));
  return visited;
}

it("catalog and app entries cannot initialize another calculator's financial stores", () => {
  const netStore = resolve("src/store/calculatorStore.ts");
  const taxStore = resolve("src/store/taxConfigStore.ts");
  const parentalStore = resolve("src/store/elterngeldStore.ts");
  const catalog = runtimeDependencies("src/components/CalculatorCatalog.tsx");
  for (const store of [netStore, taxStore, parentalStore]) {
    assert.equal(catalog.has(store), false, `Catalog imports ${store}`);
  }
  const net = runtimeDependencies("src/apps/net-pay/App.tsx");
  assert.equal(net.has(netStore), true);
  assert.equal(net.has(parentalStore), false);
  const parental = runtimeDependencies("src/apps/parental-leave/App.tsx");
  assert.equal(parental.has(parentalStore), true);
  assert.equal(parental.has(netStore), false);
  assert.equal(parental.has(taxStore), false);
});
