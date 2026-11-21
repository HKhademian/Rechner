import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import {
  describe,
  it,
} from "node:test";
import {
  h,
  hydrate,
  options,
  render,
} from "preact";
import ts from "typescript";
import {
  type TimeSeriesChartPoint,
  TimeSeriesChartCore,
} from "#/components/ui/timeSeriesChartCore.ts";
import {
  type ChartSeriesDefinition,
  DEFAULT_CHART_DIMENSIONS,
  TimeSeriesChartMode,
  computeChartYAxisScale,
  computeStackedBarSegments,
  createChartVisibilityMap,
  resolveChartDimensions,
} from "#/components/ui/timeSeriesChartEngine.ts";

const SeriesKey = {
  Primary: "primary",
  Secondary: "secondary",
  Adjustment: "adjustment",
} as const;
type SeriesKey = (typeof SeriesKey)[keyof typeof SeriesKey];

const SERIES_DEFS: readonly ChartSeriesDefinition<SeriesKey>[] = Object.freeze([
  Object.freeze({
    key: SeriesKey.Primary,
    label: "Primary Flow",
    color: "var(--color-primary)",
  }),
  Object.freeze({
    key: SeriesKey.Secondary,
    label: "Secondary Flow",
    color: "var(--color-gain)",
  }),
  Object.freeze({
    key: SeriesKey.Adjustment,
    label: "Adjustment",
    color: "var(--color-warning)",
  }),
]);

const SERIES_ORDER: readonly SeriesKey[] = Object.freeze(SERIES_DEFS.map((s) => s.key));

class MockNode {
  parentNode: MockElement | null = null;
  readonly nodeType: number;

  constructor(nodeType: number) {
    this.nodeType = nodeType;
  }

  get nextSibling(): MockNode | null {
    if (!this.parentNode) {
      return null;
    }
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    if (idx === -1 || idx + 1 >= siblings.length) {
      return null;
    }
    return siblings[idx + 1];
  }
}

class MockText extends MockNode {
  data: string;

  constructor(data: string) {
    super(3);
    this.data = data;
  }
}

type EventHandler = (event: unknown) => void;

class MockElement extends MockNode {
  readonly localName: string;
  readonly namespaceURI: string;
  readonly childNodes: MockNode[] = [];
  readonly attrMap = new Map<string, string>();
  readonly listeners = new Map<string, Set<EventHandler>>();
  readonly style: {
    cssText: string;
    left: string;
    setProperty(name: string, value: string): void;
  };
  value = "";
  onclick: unknown = null;
  onmousemove: unknown = null;
  onmouseleave: unknown = null;

  constructor(tagName: string, namespaceURI = "http://www.w3.org/1999/xhtml") {
    super(1);
    this.localName = tagName;
    this.namespaceURI = namespaceURI;
    const styleProps = new Map<string, string>();
    this.style = {
      cssText: "",
      left: "",
      setProperty(name: string, value: string): void {
        styleProps.set(name, value);
      },
    };
  }

  get firstChild(): MockNode | null {
    return this.childNodes[0] ?? null;
  }

  get className(): string {
    return this.attrMap.get("class") ?? "";
  }

  set className(next: string) {
    if (next) {
      this.attrMap.set("class", next);
    }
    else {
      this.attrMap.delete("class");
    }
  }

  get textContent(): string {
    return this.childNodes
      .map((child) => {
        if (child instanceof MockText) {
          return child.data;
        }
        if (child instanceof MockElement) {
          return child.textContent;
        }
        return "";
      })
      .join("");
  }

  setAttribute(name: string, value: string): void {
    const strVal = String(value);
    if (name === "value") {
      this.value = strVal;
    }
    this.attrMap.set(name, strVal);
  }

  removeAttribute(name: string): void {
    this.attrMap.delete(name);
  }

  getAttribute(name: string): string | null {
    return this.attrMap.get(name) ?? null;
  }

  appendChild<T extends MockNode>(child: T): T {
    return this.insertBefore(child, null);
  }

  insertBefore<T extends MockNode>(child: T, refChild: MockNode | null): T {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    if (!refChild) {
      this.childNodes.push(child);
      return child;
    }
    const idx = this.childNodes.indexOf(refChild);
    if (idx === -1) {
      this.childNodes.push(child);
    }
    else {
      this.childNodes.splice(idx, 0, child);
    }
    return child;
  }

  removeChild<T extends MockNode>(child: T): T {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  addEventListener(type: string, handler: EventHandler): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler);
  }

  removeEventListener(type: string, handler: EventHandler): void {
    this.listeners.get(type)?.delete(handler);
  }

  click(): void {
    const handlers = this.listeners.get("click");
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler.call(this, {
        type: "click",
        target: this,
        currentTarget: this,
        preventDefault: () => {},
      });
    }
  }
}

function findAll(
  root: MockElement,
  predicate: (el: MockElement) => boolean,
  out: MockElement[] = [],
): MockElement[] {
  for (const child of root.childNodes) {
    if (child instanceof MockElement) {
      if (predicate(child)) {
        out.push(child);
      }
      findAll(child, predicate, out);
    }
  }
  return out;
}

interface CapturedBarRect {
  readonly pointId: string;
  readonly seriesKey: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
}

function capturePlotBarRects(root: MockElement): readonly CapturedBarRect[] {
  const plotLayer = findAll(
    root,
    (el) => el.localName === "g" && el.getAttribute("data-layer") === "plot-series",
  )[0];
  if (!plotLayer) {
    return [];
  }
  const rects: CapturedBarRect[] = [];
  const barGroups = findAll(
    plotLayer,
    (el) => el.localName === "g" && el.getAttribute("data-point-id") !== null,
  );
  for (const group of barGroups) {
    const pointId = group.getAttribute("data-point-id") ?? "";
    for (const child of group.childNodes) {
      if (child instanceof MockElement && child.localName === "rect") {
        rects.push({
          pointId,
          seriesKey: child.getAttribute("data-series-key") ?? "",
          x: Number(child.getAttribute("x")),
          y: Number(child.getAttribute("y")),
          width: Number(child.getAttribute("width")),
          height: Number(child.getAttribute("height")),
          fill: child.getAttribute("fill") ?? "",
        });
      }
    }
  }
  return rects;
}

async function withMockDom(run: (flush: () => Promise<void>) => Promise<void>): Promise<void> {
  const rafQueue: (() => void)[] = [];
  const previousRaf = options.requestAnimationFrame;
  const previousDoc = Object.getOwnPropertyDescriptor(globalThis, "document");

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: {
      createElement: (tag: string) => new MockElement(tag),
      createElementNS: (ns: string, tag: string) => new MockElement(tag, ns),
      createTextNode: (text: string) => new MockText(text),
    },
  });
  options.requestAnimationFrame = (cb) => {
    rafQueue.push(cb);
  };

  const flush = async (): Promise<void> => {
    for (let guard = 0; guard < 10; guard++) {
      while (rafQueue.length > 0) {
        const pending = rafQueue.splice(0, rafQueue.length);
        for (const cb of pending) {
          cb();
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (rafQueue.length === 0) {
        break;
      }
    }
  };

  try {
    await run(flush);
    await flush();
  }
  finally {
    options.requestAnimationFrame = previousRaf;
    if (previousDoc) {
      Object.defineProperty(globalThis, "document", previousDoc);
    }
    else {
      Reflect.deleteProperty(globalThis, "document");
    }
  }
}

function makeSamplePoints(count: number, scale = 1): readonly TimeSeriesChartPoint<SeriesKey>[] {
  return Array.from({ length: count }, (_, i) =>
    Object.freeze({
      id: `slot-${i + 1}`,
      order: i + 1,
      xLabel: `P${i + 1}`,
      xSubLabel: `0${(i % 9) + 1}.2027`,
      groupSeparatorLabel: i > 0 && i % 12 === 0 ? `Y${Math.floor(i / 12) + 1}` : undefined,
      values: Object.freeze({
        [SeriesKey.Primary]: Math.round(3000 * scale),
        [SeriesKey.Secondary]: i % 2 === 0 ? Math.round(1500 * scale) : 0,
        [SeriesKey.Adjustment]: i % 5 === 0 ? Math.round(-600 * scale) : Math.round(400 * scale),
      }),
    }));
}

describe("TimeSeriesChart (Abstract Component Verification)", () => {
  it("contains zero calculator, tax, law, or domain-store imports (strict abstraction boundary)", () => {
    const abstractFiles = [
      "src/components/ui/TimeSeriesChart.tsx",
      "src/components/ui/timeSeriesChartCore.ts",
      "src/components/ui/timeSeriesChartEngine.ts",
    ];
    const forbiddenPrefixes = [
      "#engine/",
      "#store/",
      "#components/elterngeld/",
      "#components/laws/",
      "#apps/",
      "#data/",
    ];

    for (const filePath of abstractFiles) {
      const sourceText = readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const violations: string[] = [];

      const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const spec = node.moduleSpecifier.text;
          if (forbiddenPrefixes.some((prefix) => spec.startsWith(prefix))) {
            violations.push(`${filePath} imports forbidden domain module "${spec}"`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);

      assert.deepEqual(
        violations,
        [],
        `Abstract chart module must stay domain-agnostic:\n${violations.join("\n")}`,
      );
    }
  });

  it("hydrates cleanly from SSR without stale SVG rects and matches All-Off -> All-On geometry bit-for-bit on initial load", async () => {
    await withMockDom(async (flush) => {
      // Step 1: Render SSR snapshot (simulating default empty/small SSR dataset before client mount)
      const ssrContainer = new MockElement("astro-island");
      render(
        h(TimeSeriesChartCore<SeriesKey>, {
          title: "Abstract Series",
          mode: TimeSeriesChartMode.StackedBar,
          series: SERIES_DEFS,
          points: makeSamplePoints(6, 0.5),
          formatValue: (v) => `${v}`,
          hydrated: false,
        }),
        ssrContainer as unknown as Element,
      );

      // SSR must render the layout-preserving stage and ZERO <svg> elements so hydrate() never adopts stale coords
      assert.equal(findAll(ssrContainer, (el) => el.localName === "svg").length, 0);
      assert.equal(
        findAll(ssrContainer, (el) => el.className.includes("ui-chart__plot-stage")).length,
        1,
      );

      // Step 2: Hydrate the existing SSR DOM with a DIFFERENT persisted client dataset (18 points, 2x scale)
      const clientPoints = makeSamplePoints(18, 2);
      hydrate(
        h(TimeSeriesChartCore<SeriesKey>, {
          title: "Abstract Series",
          mode: TimeSeriesChartMode.StackedBar,
          series: SERIES_DEFS,
          points: clientPoints,
          formatValue: (v) => `${v}`,
        }),
        ssrContainer as unknown as Element,
      );
      await flush();

      // Immediately after initial mount (WITHOUT clicking All Off / All On), SVG must exist with exact geometry
      const initialRects = capturePlotBarRects(ssrContainer);
      assert.ok(initialRects.length > 0, "Initial mount must render stacked bar <rect> segments");

      const geom = resolveChartDimensions(DEFAULT_CHART_DIMENSIONS);
      const allVis = createChartVisibilityMap(SERIES_DEFS, true);
      const scale = computeChartYAxisScale(-1200, 9800, 5);
      const expectedFirstSlotSegments = computeStackedBarSegments(
        clientPoints[0],
        SERIES_ORDER,
        allVis,
        scale.yMin,
        scale.yMax,
        geom.plotHeight,
        geom.marginTop,
      );
      const renderedFirstSlot = initialRects.filter((r) => r.pointId === "slot-1");
      assert.equal(renderedFirstSlot.length, expectedFirstSlotSegments.length);
      for (let i = 0; i < expectedFirstSlotSegments.length; i++) {
        assert.equal(renderedFirstSlot[i].seriesKey, expectedFirstSlotSegments[i].key);
        assert.ok(Math.abs(renderedFirstSlot[i].y - expectedFirstSlotSegments[i].y) < 1e-6);
        assert.ok(Math.abs(renderedFirstSlot[i].height - expectedFirstSlotSegments[i].height) < 1e-6);
      }

      // Step 3: Click "All Off", verify 0 rects, then click "All On" and assert 100% identical geometry
      const allOffBtn = findAll(
        ssrContainer,
        (el) => el.localName === "button" && el.textContent.trim() === "All Off",
      )[0];
      const allOnBtn = findAll(
        ssrContainer,
        (el) => el.localName === "button" && el.textContent.trim() === "All On",
      )[0];
      assert.ok(allOffBtn, "All Off button must be rendered");
      assert.ok(allOnBtn, "All On button must be rendered");

      allOffBtn.click();
      await flush();
      assert.equal(capturePlotBarRects(ssrContainer).length, 0);

      allOnBtn.click();
      await flush();
      const afterToggleRects = capturePlotBarRects(ssrContainer);
      assert.deepEqual(
        initialRects,
        afterToggleRects,
        "Initial-load SVG bar geometry must match post-(All Off -> All On) geometry identically",
      );
    });
  });

  it("toggles individual series accurately and switches cleanly across StackedBar, Lines, Area, and Overlay modes", async () => {
    await withMockDom(async (flush) => {
      const container = new MockElement("div");
      const points = makeSamplePoints(12, 1);

      render(
        h(TimeSeriesChartCore<SeriesKey>, {
          title: "Interactive Chart",
          mode: TimeSeriesChartMode.StackedBar,
          series: SERIES_DEFS,
          points,
          formatValue: (v) => `${v}`,
          hydrated: true,
        }),
        container as unknown as Element,
      );
      await flush();

      const secondaryBtn = findAll(
        container,
        (el) => el.localName === "button" && el.getAttribute("data-series-key") === SeriesKey.Secondary,
      )[0];
      assert.ok(secondaryBtn);
      assert.equal(secondaryBtn.getAttribute("aria-pressed"), "true");

      secondaryBtn.click();
      await flush();
      assert.equal(secondaryBtn.getAttribute("aria-pressed"), "false");
      const rectsAfterHide = capturePlotBarRects(container);
      assert.equal(
        rectsAfterHide.some((r) => r.seriesKey === SeriesKey.Secondary),
        false,
        "Hidden series must not render any SVG bar segments",
      );

      // Switch to Lines mode -> paths rendered, zero stacked bar rects
      render(
        h(TimeSeriesChartCore<SeriesKey>, {
          title: "Interactive Chart",
          mode: TimeSeriesChartMode.Lines,
          series: SERIES_DEFS,
          points,
          formatValue: (v) => `${v}`,
          hydrated: true,
        }),
        container as unknown as Element,
      );
      await flush();
      assert.equal(capturePlotBarRects(container).length, 0);
      const plotLayerLines = findAll(
        container,
        (el) => el.localName === "g" && el.getAttribute("data-layer") === "plot-series",
      )[0];
      assert.equal(plotLayerLines.getAttribute("data-mode"), TimeSeriesChartMode.Lines);
      assert.ok(findAll(plotLayerLines, (el) => el.localName === "path").length >= 2);

      // Switch to Area mode
      render(
        h(TimeSeriesChartCore<SeriesKey>, {
          title: "Interactive Chart",
          mode: TimeSeriesChartMode.Area,
          series: SERIES_DEFS,
          points,
          formatValue: (v) => `${v}`,
          hydrated: true,
        }),
        container as unknown as Element,
      );
      await flush();
      const plotLayerArea = findAll(
        container,
        (el) => el.localName === "g" && el.getAttribute("data-layer") === "plot-series",
      )[0];
      assert.equal(plotLayerArea.getAttribute("data-mode"), TimeSeriesChartMode.Area);
      assert.ok(findAll(plotLayerArea, (el) => el.localName === "path").length >= 2);

      // Switch to Overlay mode
      render(
        h(TimeSeriesChartCore<SeriesKey>, {
          title: "Interactive Chart",
          mode: TimeSeriesChartMode.Overlay,
          series: SERIES_DEFS,
          points,
          overlaySeries: [
            {
              key: "base",
              label: "Base",
              color: "var(--text-muted)",
              values: points.map((_, i) => 2000 + i * 100),
            },
            {
              key: "alt",
              label: "Alt",
              color: "var(--color-gain)",
              values: points.map((_, i) => 2500 + i * 150),
            },
          ],
          formatValue: (v) => `${v}`,
          hydrated: true,
        }),
        container as unknown as Element,
      );
      await flush();
      const plotLayerOverlay = findAll(
        container,
        (el) => el.localName === "g" && el.getAttribute("data-layer") === "plot-series",
      )[0];
      assert.equal(plotLayerOverlay.getAttribute("data-mode"), TimeSeriesChartMode.Overlay);
      assert.equal(findAll(plotLayerOverlay, (el) => el.localName === "path").length, 2);
    });
  });
});
