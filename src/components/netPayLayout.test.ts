import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import {
  join,
} from "node:path";
import {
  describe,
  it,
} from "node:test";
import ts from "typescript";

function parseTsx(relPath: string): {
  readonly sourceText: string;
  readonly sourceFile: ts.SourceFile;
} {
  const fullPath = join(process.cwd(), relPath);
  const sourceText = readFileSync(fullPath, "utf8");
  return {
    sourceText,
    sourceFile: ts.createSourceFile(
      relPath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
  };
}

function getJsxTagName(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): string {
  return ts.isIdentifier(node.tagName) ? node.tagName.text : node.tagName.getText();
}

function getStringAttribute(
  attributes: ts.JsxAttributes,
  name: string,
): string | undefined {
  for (const prop of attributes.properties) {
    if (
      ts.isJsxAttribute(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === name &&
      prop.initializer &&
      ts.isStringLiteral(prop.initializer)
    ) {
      return prop.initializer.text;
    }
  }
  return undefined;
}

describe("Unified Net Pay Comparison Layout", () => {
  it("mounts ComparisonTable directly under PageHeader without NetPayWorkspace", () => {
    const repoRoot = process.cwd();
    assert.equal(existsSync(join(repoRoot, "src/components/NetPayWorkspace.tsx")), false);
    assert.equal(existsSync(join(repoRoot, "src/components/NetPayWorkspace.css")), false);

    const netPayPage = readFileSync(join(repoRoot, "src/pages/calculators/net-pay.astro"), "utf8");
    assert.equal(
      /<AppShell[\s>]/.test(netPayPage) && netPayPage.includes("wide"),
      true,
      "src/pages/calculators/net-pay.astro must wrap NetPayApp in wide <AppShell>",
    );

    const { sourceText, sourceFile } = parseTsx("src/components/Calculator.tsx");
    assert.equal(sourceText.includes("NetPayWorkspace"), false);

    let rootFragment: ts.JsxFragment | undefined;
    const findFragment = (node: ts.Node): void => {
      if (ts.isJsxFragment(node)) {
        rootFragment = node;
        return;
      }
      ts.forEachChild(node, findFragment);
    };
    findFragment(sourceFile);

    assert.ok(rootFragment, "Calculator.tsx must render a root fragment inside AppShell.astro");
    const mainChildTags = rootFragment.children
      .map((child) => {
        if (ts.isJsxElement(child)) {
          return getJsxTagName(child.openingElement);
        }
        if (ts.isJsxSelfClosingElement(child)) {
          return getJsxTagName(child);
        }
        return undefined;
      })
      .filter((tag): tag is string => tag !== undefined);

    const headerIndex = mainChildTags.indexOf("PageHeader");
    const comparisonIndex = mainChildTags.indexOf("ComparisonTable");
    assert.notEqual(headerIndex, -1, "Calculator.tsx must render PageHeader");
    assert.equal(
      comparisonIndex,
      headerIndex + 1,
      "ComparisonTable must appear immediately after PageHeader",
    );
  });

  it("always renders #household-comparison-table with ordered tbodies and editable live controls", () => {
    const { sourceFile } = parseTsx("src/components/ComparisonTable.tsx");

    let contentFn: ts.FunctionDeclaration | undefined;
    const findContentFn = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === "ComparisonTableContent") {
        contentFn = node;
        return;
      }
      ts.forEachChild(node, findContentFn);
    };
    findContentFn(sourceFile);
    assert.ok(contentFn?.body, "ComparisonTable.tsx must export ComparisonTableContent");

    const topLevelReturns = contentFn.body.statements.filter(ts.isReturnStatement);
    assert.equal(
      topLevelReturns.length,
      1,
      "ComparisonTableContent must have a single top-level return so the table renders even with 0 saved scenarios",
    );

    const emptyLengthEarlyReturns: number[] = [];
    const inspectEarlyReturns = (node: ts.Node): void => {
      if (ts.isIfStatement(node) && node.expression.getText(sourceFile).includes("savedScenarios.value.length === 0")) {
        emptyLengthEarlyReturns.push(
          sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        );
      }
      ts.forEachChild(node, inspectEarlyReturns);
    };
    inspectEarlyReturns(contentFn.body);
    assert.deepEqual(
      emptyLengthEarlyReturns,
      [],
      "ComparisonTableContent must not guard rendering on savedScenarios.value.length === 0",
    );

    let hasTableId = false;
    const tbodyLabels: string[] = [];
    const jsxTags = new Set<string>();
    const calledIdentifiers = new Set<string>();

    const collectStructure = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = getJsxTagName(node);
        jsxTags.add(tag);
        if (tag === "table" && getStringAttribute(node.attributes, "id") === "household-comparison-table") {
          hasTableId = true;
        }
        if (tag === "tbody") {
          const label = getStringAttribute(node.attributes, "aria-label");
          if (label !== undefined) {
            tbodyLabels.push(label);
          }
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        calledIdentifiers.add(node.expression.text);
      }
      ts.forEachChild(node, collectStructure);
    };
    collectStructure(sourceFile);

    assert.equal(hasTableId, true, "ComparisonTable must render #household-comparison-table");
    assert.deepEqual(tbodyLabels, [
      "Headline net pay summary",
      "Inputs",
      "Detailed deduction breakdown",
    ]);

    for (const expectedTag of [
      "CalculatorGrossInput",
      "LiveChoiceInput",
      "LiveNumberInput",
      "LiveToggleInput",
      "LiveCalculatorSettings",
      "LiveColumnImport",
    ]) {
      assert.equal(
        jsxTags.has(expectedTag),
        true,
        `ComparisonTable must retain editable live control <${expectedTag}>`,
      );
    }

    assert.equal(
      calledIdentifiers.has("saveWhatIfScenario"),
      true,
      "ComparisonTable must retain saveWhatIfScenario presets",
    );
    assert.equal(
      calledIdentifiers.has("formatSignedEurDelta"),
      true,
      "ComparisonTable must retain formatSignedEurDelta for Net Difference vs Live",
    );
  });
});
