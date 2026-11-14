import assert from "node:assert/strict";
import {
  readdirSync,
  readFileSync,
} from "node:fs";
import {
  join,
  relative,
} from "node:path";
import {
  describe,
  it,
} from "node:test";
import ts from "typescript";

const ALLOWED_EXTERNAL_LINK_FILES = new Set<string>([
  "src/components/laws/LawReferenceModal.tsx",
  "src/components/laws/LawReferencePage.tsx",
  "src/components/parameters/ParameterObserverSection.tsx",
  "src/components/SourceRevision.tsx",
]);

const EXTERNAL_STATUTORY_HOSTS = [
  "gesetze-im-internet.de",
  "bmf-steuerrechner.de",
  "familienportal.de",
  "bundesgesundheitsministerium.de",
  "gkv-spitzenverband.de",
  "bmbfsfj.bund.de",
  "recht.bund.de",
  "kfw.de",
] as const;

function collectUiFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectUiFiles(fullPath));
    }
    else if (/\.(tsx|astro)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function getAttrName(attr: ts.JsxAttributeLike): string | undefined {
  if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) {
    return undefined;
  }
  return attr.name.text;
}

function findDirectAnchorViolations(
  filePath: string,
  sourceText: string,
): string[] {
  const violations: string[] = [];
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const inspectAttributes = (attributes: ts.JsxAttributes, line: number): void => {
    const hasBlankTarget = attributes.properties.some(
      (prop) => getAttrName(prop) === "target" &&
        ts.isJsxAttribute(prop) &&
        prop.initializer !== undefined &&
        prop.initializer.getText(sourceFile).includes("_blank"),
    );
    const hrefAttr = attributes.properties.find((prop) => getAttrName(prop) === "href");
    const hrefText = hrefAttr && ts.isJsxAttribute(hrefAttr) && hrefAttr.initializer
      ? hrefAttr.initializer.getText(sourceFile)
      : "";

    if (hasBlankTarget) {
      violations.push(`${filePath}:${line} renders <a target="_blank"> directly instead of <LawRefLink>`);
    }
    if (
      hrefText.includes("TAX_ASSESSMENT_SOURCE") ||
      hrefText.includes("papPublication.source") ||
      hrefText.includes("parameter.source") ||
      hrefText.includes("f.source")
    ) {
      violations.push(`${filePath}:${line} binds <a href=${hrefText}> directly to an external statutory source`);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (ts.isIdentifier(node.tagName) && node.tagName.text === "a") {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        inspectAttributes(node.attributes, line);
      }
    }
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      for (const host of EXTERNAL_STATUTORY_HOSTS) {
        if (node.text.includes(host)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          violations.push(`${filePath}:${line} embeds direct statutory host literal "${host}"`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

describe("Universal Law Link Adoption Across Calculators", () => {
  it("routes all statutory links in calculator UI through LawRefLink rather than external blank-target anchors", () => {
    const repoRoot = process.cwd();
    const scanRoots = ["src/components", "src/apps", "src/pages"];
    const uiFiles = scanRoots.flatMap((root) => collectUiFiles(join(repoRoot, root)));

    const violations: string[] = [];

    for (const fullPath of uiFiles) {
      const relPath = relative(repoRoot, fullPath).replace(/\\/g, "/");
      if (ALLOWED_EXTERNAL_LINK_FILES.has(relPath)) {
        continue;
      }

      const content = readFileSync(fullPath, "utf8");

      if (relPath.endsWith(".tsx")) {
        violations.push(...findDirectAnchorViolations(relPath, content));
      }
      else {
        if (/target\s*=\s*["']_blank["']/.test(content)) {
          violations.push(`${relPath} contains target="_blank" outside allowed reference pages`);
        }
        for (const host of EXTERNAL_STATUTORY_HOSTS) {
          if (content.includes(host)) {
            violations.push(`${relPath} embeds direct statutory host "${host}"`);
          }
        }
      }

      if (content.includes("scrollToLegalRule(")) {
        violations.push(`${relPath} uses legacy button handler scrollToLegalRule() instead of <LawRefLink>`);
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Direct statutory links found outside LawReferenceModal / LawReferencePage:\n${violations.join("\n")}`,
    );
  });
});
