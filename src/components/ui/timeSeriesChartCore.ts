import {
  type ComponentChildren,
  type JSX,
  Fragment,
  h,
} from "preact";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import {
  ButtonSize,
  ButtonVariant,
  buttonClassName,
} from "#utils/uiHelpers";
import {
  type ChartDataPoint,
  type ChartDimensions,
  type ChartOverlaySeries,
  type ChartReferenceLine,
  type ChartSeriesDefinition,
  type PointSeriesTotals,
  TimeSeriesChartMode,
  TimeSeriesTone,
  computeChartDataDomain,
  computeChartYAxisScale,
  computeClampedTooltipLeftPx,
  computeNetTotalLinePath,
  computeOverlayLinePath,
  computePointSeriesTotals,
  computeSeriesLineGeometry,
  computeSlotMetrics,
  computeStackedAreaBands,
  computeStackedBarSegments,
  computeVisibleXTickIndices,
  createChartVisibilityMap,
  mapClientXToSlotIndex,
  resolveChartDimensions,
  sortChartPointsChronologically,
  syncChartVisibilityMap,
  valueToPlotY,
} from "#/components/ui/timeSeriesChartEngine.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";

/** Mode switcher option item for `<TimeSeriesChart />`. */
export interface TimeSeriesChartModeOption {
  readonly value: TimeSeriesChartMode;
  readonly label: string;
}

/** Enriched point carrying optional caller-defined metadata for custom tooltips. */
export type TimeSeriesChartPoint<TKey extends string = string, TMeta = undefined> =
  ChartDataPoint<TKey> & {
    readonly meta?: TMeta;
  };

/** Hover payload passed to custom `renderTooltip` renderers. */
export interface TimeSeriesChartHoverContext<TKey extends string = string, TMeta = undefined> {
  readonly index: number;
  readonly point: TimeSeriesChartPoint<TKey, TMeta>;
  readonly activeTotals: PointSeriesTotals;
  readonly visibleSeries: Readonly<Record<TKey, boolean>>;
  readonly mode: TimeSeriesChartMode;
  readonly overlayValues: Readonly<Record<string, number | null>>;
}

export interface TimeSeriesChartCoreProps<TKey extends string = string, TMeta = undefined> {
  readonly title: string;
  readonly subtitle?: string;
  readonly headerAside?: ComponentChildren;
  readonly mode: TimeSeriesChartMode;
  readonly modeControl?: ComponentChildren;
  readonly series: readonly ChartSeriesDefinition<TKey>[];
  readonly points: readonly TimeSeriesChartPoint<TKey, TMeta>[];
  readonly overlaySeries?: readonly ChartOverlaySeries[];
  readonly overlayLegendLabel?: string;
  readonly seriesLegendLabel?: string;
  readonly referenceLine?: ChartReferenceLine;
  readonly formatValue: (value: number) => string;
  readonly renderTooltip?: (
    context: TimeSeriesChartHoverContext<TKey, TMeta>,
  ) => ComponentChildren;
  readonly onHoverIndexChange?: (
    index: number | null,
    point: TimeSeriesChartPoint<TKey, TMeta> | null,
  ) => void;
  readonly initialVisibleSeries?: Readonly<Record<TKey, boolean>>;
  readonly dimensions?: Partial<ChartDimensions>;
  readonly tooltipWidthPx?: number;
  readonly minPositiveCeiling?: number;
  readonly emptyMessage?: string;
  readonly className?: string;
  /** Optional hydration override (defaults to `useHydrated()` to prevent SSR SVG adoption mismatches). */
  readonly hydrated?: boolean;
}

interface InternalHoverState {
  readonly index: number;
  readonly slotCenterSvgX: number;
  readonly leftPx: number;
}

const DEFAULT_TOOLTIP_WIDTH_PX = 280;

function toneClassName(tone: TimeSeriesTone | undefined, value: number): string {
  if (value < 0 || tone === TimeSeriesTone.Negative) {
    return "ui-chart__tooltip-row--negative";
  }
  if (tone === TimeSeriesTone.Positive) {
    return "ui-chart__tooltip-row--positive";
  }
  if (tone === TimeSeriesTone.Warning) {
    return "ui-chart__tooltip-row--warning";
  }
  return "";
}

/**
 * Pure-TS Preact implementation of the abstract `<TimeSeriesChart />` component.
 *
 * Hydration-safe: during SSR and Preact's initial `hydrate()` pass, renders a deterministic
 * layout-preserving stage without `<svg>`, preventing Preact from adopting stale SSR SVG
 * coordinates into differing client-persisted data. On mount, renders a fresh SVG tree
 * with isolated `<g data-layer>` groups.
 *
 * Strictly domain-agnostic: zero calculator, tax, law, or store imports.
 */
export function TimeSeriesChartCore<TKey extends string = string, TMeta = undefined>({
  title,
  subtitle,
  headerAside,
  mode,
  modeControl,
  series,
  points,
  overlaySeries = [],
  overlayLegendLabel = "Curves:",
  seriesLegendLabel = "Series:",
  referenceLine,
  formatValue,
  renderTooltip,
  onHoverIndexChange,
  initialVisibleSeries,
  dimensions,
  tooltipWidthPx = DEFAULT_TOOLTIP_WIDTH_PX,
  minPositiveCeiling = 2000,
  emptyMessage = "No data points available for this view.",
  className = "",
  hydrated: hydratedOverride,
}: TimeSeriesChartCoreProps<TKey, TMeta>): JSX.Element {
  const isHydrated = useHydrated();
  const isClientReady = hydratedOverride ?? isHydrated;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverState, setHoverState] = useState<InternalHoverState | null>(null);
  const [rawVisibleSeries, setRawVisibleSeries] = useState<Record<string, boolean>>(() =>
    initialVisibleSeries
      ? syncChartVisibilityMap(series, initialVisibleSeries, true)
      : createChartVisibilityMap(series, true));

  const visibleSeries = useMemo(
    () => syncChartVisibilityMap(series, rawVisibleSeries, true),
    [series, rawVisibleSeries],
  );

  const sortedPoints = useMemo(
    () => sortChartPointsChronologically(points),
    [points],
  );

  const seriesOrder = useMemo(
    () => series.map((item) => item.key),
    [series],
  );

  const seriesByKey = useMemo(() => {
    const map = {} as Record<TKey, ChartSeriesDefinition<TKey>>;
    for (const item of series) {
      map[item.key] = item;
    }
    return map;
  }, [series]);

  const seriesTopToBottom = useMemo(
    () => [...series].reverse(),
    [series],
  );

  useEffect(() => {
    setHoverState(null);
    onHoverIndexChange?.(null, null);
  }, [mode, sortedPoints.length, onHoverIndexChange]);

  const isOverlayMode = mode === TimeSeriesChartMode.Overlay;
  const geometry = useMemo(
    () => resolveChartDimensions(dimensions),
    [dimensions],
  );

  const { dataMin, dataMax } = useMemo(
    () =>
      computeChartDataDomain({
        mode,
        points: sortedPoints,
        seriesOrder,
        visibility: visibleSeries,
        overlaySeries,
        referenceValue: referenceLine?.value,
      }),
    [mode, sortedPoints, seriesOrder, visibleSeries, overlaySeries, referenceLine?.value],
  );

  const yAxisScale = useMemo(
    () => computeChartYAxisScale(dataMin, dataMax, 5, minPositiveCeiling),
    [dataMin, dataMax, minPositiveCeiling],
  );
  const { yMin, yMax, ticks: yTicks } = yAxisScale;
  const scaleY = (val: number): number =>
    valueToPlotY(val, yMin, yMax, geometry.plotHeight);
  const zeroLineY = geometry.marginTop + scaleY(0);

  const pointCount = sortedPoints.length;
  const { slotWidth, barWidth } = useMemo(
    () => computeSlotMetrics(geometry.plotWidth, pointCount),
    [geometry.plotWidth, pointCount],
  );
  const visibleXTickIndices = useMemo(
    () => new Set(computeVisibleXTickIndices(pointCount)),
    [pointCount],
  );

  const toggleSeries = (key: TKey): void => {
    setRawVisibleSeries((prev) => {
      const synced = syncChartVisibilityMap(series, prev, true);
      return {
        ...synced,
        [key]: !synced[key],
      };
    });
  };

  const setAllSeries = (visible: boolean): void => {
    setRawVisibleSeries(createChartVisibilityMap(series, visible));
  };

  const handleMouseMove = (e: JSX.TargetedMouseEvent<SVGSVGElement>): void => {
    const container = containerRef.current;
    if (!container || pointCount === 0) {
      return;
    }
    const svgRect = e.currentTarget.getBoundingClientRect();
    const index = mapClientXToSlotIndex({
      clientX: e.clientX,
      svgRectLeft: svgRect.left,
      svgRectWidth: svgRect.width,
      svgViewBoxWidth: geometry.width,
      marginLeft: geometry.marginLeft,
      plotWidth: geometry.plotWidth,
      slotCount: pointCount,
    });
    if (index === null) {
      setHoverState(null);
      onHoverIndexChange?.(null, null);
      return;
    }
    const slotCenterSvgX = geometry.marginLeft + (index + 0.5) * slotWidth;
    const containerRect = container.getBoundingClientRect();
    const leftPx = computeClampedTooltipLeftPx({
      slotCenterSvgX,
      svgViewBoxWidth: geometry.width,
      svgRectLeft: svgRect.left,
      svgRectWidth: svgRect.width,
      containerRectLeft: containerRect.left,
      containerWidth: container.clientWidth,
      containerScrollLeft: container.scrollLeft,
      tooltipWidth: tooltipWidthPx,
    });
    setHoverState({
      index,
      slotCenterSvgX,
      leftPx,
    });
    onHoverIndexChange?.(index, sortedPoints[index] ?? null);
  };

  const handleMouseLeave = (): void => {
    setHoverState(null);
    onHoverIndexChange?.(null, null);
  };

  const hoveredPoint =
    hoverState !== null && hoverState.index >= 0 && hoverState.index < pointCount
      ? sortedPoints[hoverState.index]
      : null;

  const hoverContext: TimeSeriesChartHoverContext<TKey, TMeta> | null =
    hoverState !== null && hoveredPoint !== null
      ? (() => {
        const overlayValues: Record<string, number | null> = {};
        for (const overlay of overlaySeries) {
          overlayValues[overlay.key] = overlay.values[hoverState.index] ?? null;
        }
        return {
          index: hoverState.index,
          point: hoveredPoint,
          activeTotals: computePointSeriesTotals(
            hoveredPoint,
            seriesOrder,
            visibleSeries,
          ),
          visibleSeries,
          mode,
          overlayValues,
        };
      })()
      : null;

  const areaBands = useMemo(
    () =>
      mode === TimeSeriesChartMode.Area
        ? computeStackedAreaBands(
          sortedPoints,
          series,
          visibleSeries,
          yMin,
          yMax,
          geometry,
        )
        : [],
    [mode, sortedPoints, series, visibleSeries, yMin, yMax, geometry],
  );

  const netTrendPath = useMemo(
    () =>
      mode === TimeSeriesChartMode.Lines || mode === TimeSeriesChartMode.Area
        ? computeNetTotalLinePath(
          sortedPoints,
          seriesOrder,
          visibleSeries,
          yMin,
          yMax,
          geometry,
        )
        : "",
    [mode, sortedPoints, seriesOrder, visibleSeries, yMin, yMax, geometry],
  );

  const rootClassName = ["ui-card", "ui-chart", className.trim()]
    .filter(Boolean)
    .join(" ");

  const toolbarContent = isOverlayMode
    ? h(
      "div",
      {
        className: "ui-chart__overlay-key",
        role: "list",
        "aria-label": "Overlay series legend",
      },
      [
        h("span", { className: "ui-chart__toggles-label" }, overlayLegendLabel),
        ...overlaySeries.map((overlay) =>
          h(
            "span",
            {
              key: overlay.key,
              className: "ui-chart__overlay-item",
              role: "listitem",
            },
            [
              h("span", {
                className: [
                  "ui-chart__overlay-swatch",
                  overlay.swatchClass ?? "",
                ].filter(Boolean).join(" "),
              }),
              h("span", null, overlay.label),
            ],
          )),
      ],
    )
    : h(Fragment, null, [
      h("div", { className: "ui-chart__toggles" }, [
        h("span", { className: "ui-chart__toggles-label" }, seriesLegendLabel),
        ...series.map((item) => {
          const isVisible = visibleSeries[item.key];
          return h(
            "button",
            {
              key: item.key,
              type: "button",
              "data-series-key": item.key,
              "aria-pressed": isVisible,
              onClick: () => toggleSeries(item.key),
              className: [
                "ui-chart__series-btn",
                item.seriesClass ?? "",
                isVisible ? "ui-chart__series-btn--active" : "",
              ].filter(Boolean).join(" "),
            },
            [
              h("span", { className: "ui-chart__dot" }),
              h("span", null, item.label),
              h("span", { className: "ui-chart__state-pill" }, isVisible ? "ON" : "OFF"),
            ],
          );
        }),
      ]),
      h("div", { className: "ui-chart__toolbar-actions" }, [
        h(
          "button",
          {
            type: "button",
            className: buttonClassName(ButtonVariant.Tint, ButtonSize.Sm),
            onClick: () => setAllSeries(true),
          },
          "All On",
        ),
        h(
          "button",
          {
            type: "button",
            className: buttonClassName(ButtonVariant.Secondary, ButtonSize.Sm),
            onClick: () => setAllSeries(false),
          },
          "All Off",
        ),
      ]),
    ]);

  const plotArea = !isClientReady
    ? h(
      "div",
      {
        className: "ui-chart__plot-stage",
        role: "status",
        "aria-label": "Loading chart",
      },
      "Loading chart...",
    )
    : pointCount === 0
      ? h("div", { className: "ui-chart__plot-stage" }, emptyMessage)
      : h(
        "svg",
        {
          viewBox: `0 0 ${geometry.width} ${geometry.height}`,
          className: "ui-chart__svg",
          onMouseMove: handleMouseMove,
          onMouseLeave: handleMouseLeave,
        },
        [
          // Layer 1: Y-Axis Gridlines & Labels
          h(
            "g",
            { "data-layer": "y-grid" },
            yTicks.map((tick) => {
              const y = geometry.marginTop + scaleY(tick);
              const isZero = tick === 0;
              return h("g", { key: `y-tick-${tick}` }, [
                h("line", {
                  x1: geometry.marginLeft,
                  y1: y,
                  x2: geometry.width - geometry.marginRight,
                  y2: y,
                  stroke: isZero ? "var(--border-medium)" : "var(--chart-grid-stroke)",
                  strokeWidth: isZero ? "1.25" : "1",
                  strokeDasharray: isZero ? undefined : "4 4",
                }),
                h(
                  "text",
                  {
                    x: geometry.marginLeft - 10,
                    y: y + 4,
                    textAnchor: "end",
                    fill: "var(--text-muted)",
                    fontSize: "11",
                    fontFamily: "monospace",
                  },
                  formatValue(tick),
                ),
              ]);
            }),
          ),

          // Layer 2: Group / Period Boundary Vertical Separators
          h(
            "g",
            { "data-layer": "group-separators" },
            sortedPoints.map((point, i) => {
              if (i === 0 || !point.groupSeparatorLabel) {
                return null;
              }
              const x = geometry.marginLeft + i * slotWidth;
              return h("g", { key: `sep-${point.id}` }, [
                h("line", {
                  x1: x,
                  y1: geometry.marginTop,
                  x2: x,
                  y2: geometry.height - geometry.marginBottom,
                  stroke: "var(--border-medium)",
                  strokeWidth: "1.25",
                  strokeDasharray: "2 2",
                }),
                h(
                  "text",
                  {
                    x: x + 4,
                    y: geometry.marginTop - 10,
                    fill: "var(--text-muted)",
                    fontSize: "11",
                    fontWeight: "700",
                  },
                  point.groupSeparatorLabel,
                ),
              ]);
            }),
          ),

          // Layer 3: Hover Highlight Band & Crosshair
          h(
            "g",
            { "data-layer": "hover-band" },
            hoverState !== null
              ? h("g", { key: "active-hover" }, [
                h("rect", {
                  x: geometry.marginLeft + hoverState.index * slotWidth,
                  y: geometry.marginTop,
                  width: slotWidth,
                  height: geometry.plotHeight,
                  fill: "var(--chart-hover-fill)",
                  rx: "2",
                }),
                h("line", {
                  x1: hoverState.slotCenterSvgX,
                  y1: geometry.marginTop,
                  x2: hoverState.slotCenterSvgX,
                  y2: geometry.height - geometry.marginBottom,
                  stroke: "var(--color-primary)",
                  strokeWidth: "1",
                  strokeDasharray: "3 3",
                  opacity: "0.65",
                }),
              ])
              : null,
          ),

          // Layer 4: Primary Plot Data (Isolated Per Mode)
          h(
            "g",
            {
              "data-layer": "plot-series",
              "data-mode": mode,
            },
            mode === TimeSeriesChartMode.StackedBar
              ? sortedPoints.map((point, i) => {
                const x =
                  geometry.marginLeft + i * slotWidth + (slotWidth - barWidth) / 2;
                const isHovered = hoverState !== null && hoverState.index === i;
                const segments = computeStackedBarSegments(
                  point,
                  seriesOrder,
                  visibleSeries,
                  yMin,
                  yMax,
                  geometry.plotHeight,
                  geometry.marginTop,
                );
                return h(
                  "g",
                  {
                    key: point.id,
                    "data-point-id": point.id,
                    opacity: isHovered ? 1 : 0.92,
                  },
                  segments.map((seg) =>
                    h("rect", {
                      key: seg.key,
                      "data-series-key": seg.key,
                      x,
                      y: seg.y,
                      width: barWidth,
                      height: seg.height,
                      fill: seriesByKey[seg.key].color,
                    })),
                );
              })
              : mode === TimeSeriesChartMode.Lines
                ? h("g", { key: "lines-layer" }, [
                  ...series.map((item) => {
                    if (!visibleSeries[item.key]) {
                      return null;
                    }
                    const lineGeom = computeSeriesLineGeometry(
                      sortedPoints,
                      item.key,
                      yMin,
                      yMax,
                      geometry,
                    );
                    if (!lineGeom.path) {
                      return null;
                    }
                    return h("g", { key: `line-${item.key}` }, [
                      h("path", {
                        d: lineGeom.path,
                        fill: "none",
                        stroke: item.color,
                        strokeWidth: "2.25",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      }),
                      ...lineGeom.markers.map((marker) =>
                        h("circle", {
                          key: `pt-${item.key}-${marker.pointId}`,
                          cx: marker.cx,
                          cy: marker.cy,
                          r: hoverState !== null && hoverState.index === marker.index ? 4.5 : 2,
                          fill: item.color,
                          stroke: "var(--bg-surface)",
                          strokeWidth: "1.25",
                        })),
                    ]);
                  }),
                  netTrendPath
                    ? h("path", {
                      d: netTrendPath,
                      fill: "none",
                      stroke: "var(--color-primary)",
                      strokeWidth: "2.5",
                      strokeDasharray: "4 2",
                    })
                    : null,
                ])
                : mode === TimeSeriesChartMode.Area
                  ? h("g", { key: "area-layer" }, [
                    ...areaBands.map((band) =>
                      h("path", {
                        key: `area-${band.series.key}`,
                        d: band.path,
                        fill: band.series.color,
                        opacity: "0.85",
                      })),
                    netTrendPath
                      ? h("path", {
                        d: netTrendPath,
                        fill: "none",
                        stroke: "var(--color-primary)",
                        strokeWidth: "2.25",
                      })
                      : null,
                  ])
                  : h(
                    "g",
                    { key: "overlay-layer" },
                    overlaySeries.map((overlay) => {
                      const path = computeOverlayLinePath(
                        overlay.values,
                        pointCount,
                        yMin,
                        yMax,
                        geometry,
                      );
                      if (!path) {
                        return null;
                      }
                      return h("path", {
                        key: `overlay-${overlay.key}`,
                        d: path,
                        fill: "none",
                        stroke: overlay.color,
                        strokeWidth: String(overlay.strokeWidth ?? 2.5),
                        strokeDasharray: overlay.strokeDasharray,
                      });
                    }),
                  ),
          ),

          // Layer 5: Optional Reference Benchmark Line
          h(
            "g",
            { "data-layer": "reference-line" },
            referenceLine
              ? h("g", { key: "ref-line" }, [
                h("line", {
                  x1: geometry.marginLeft,
                  y1: geometry.marginTop + scaleY(referenceLine.value),
                  x2: geometry.width - geometry.marginRight,
                  y2: geometry.marginTop + scaleY(referenceLine.value),
                  stroke: "var(--border-medium)",
                  strokeWidth: "1.25",
                  strokeDasharray: "6 3",
                }),
                h(
                  "text",
                  {
                    x: geometry.width - geometry.marginRight - 4,
                    y: geometry.marginTop + scaleY(referenceLine.value) - 6,
                    fill: "var(--text-muted)",
                    fontSize: "10",
                    textAnchor: "end",
                    fontFamily: "monospace",
                  },
                  referenceLine.label,
                ),
              ])
              : null,
          ),

          // Layer 6: Zero Baseline When Negative Values Exist
          h(
            "g",
            { "data-layer": "zero-baseline" },
            yMin < 0
              ? h("line", {
                x1: geometry.marginLeft,
                y1: zeroLineY,
                x2: geometry.width - geometry.marginRight,
                y2: zeroLineY,
                stroke: "var(--text-muted)",
                strokeWidth: "1.5",
              })
              : null,
          ),

          // Layer 7: Bottom X-Axis Baseline & Non-Overlapping Ticks
          h("g", { "data-layer": "x-axis" }, [
            h("line", {
              x1: geometry.marginLeft,
              y1: geometry.height - geometry.marginBottom,
              x2: geometry.width - geometry.marginRight,
              y2: geometry.height - geometry.marginBottom,
              stroke: "var(--border-medium)",
              strokeWidth: "1",
            }),
            ...sortedPoints.map((point, i) => {
              if (!visibleXTickIndices.has(i)) {
                return null;
              }
              const x = geometry.marginLeft + (i + 0.5) * slotWidth;
              return h("g", { key: `x-tick-${point.id}` }, [
                h("line", {
                  x1: x,
                  y1: geometry.height - geometry.marginBottom,
                  x2: x,
                  y2: geometry.height - geometry.marginBottom + 5,
                  stroke: "var(--text-muted)",
                }),
                h(
                  "text",
                  {
                    x,
                    y: geometry.height - geometry.marginBottom + 16,
                    textAnchor: "middle",
                    fill: "var(--text-muted)",
                    fontSize: "9",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                  },
                  point.xLabel,
                ),
                point.xSubLabel
                  ? h(
                    "text",
                    {
                      x,
                      y: geometry.height - geometry.marginBottom + 27,
                      textAnchor: "middle",
                      fill: "var(--color-primary)",
                      fontSize: "7.5",
                      fontFamily: "monospace",
                    },
                    point.xSubLabel,
                  )
                  : null,
              ]);
            }),
          ]),
        ],
      );

  const defaultTooltipContent =
    hoverContext !== null
      ? h(Fragment, null, [
        h("div", { className: "ui-chart__tooltip-header" }, [
          h("div", null, [
            h("span", { className: "ui-chart__tooltip-title" }, hoverContext.point.xLabel),
            hoverContext.point.xSubLabel
              ? h(
                "span",
                { className: "ui-chart__tooltip-sublabel" },
                `(${hoverContext.point.xSubLabel})`,
              )
              : null,
          ]),
          h(
            "span",
            { className: "ui-chart__tooltip-total tabular-nums" },
            formatValue(hoverContext.activeTotals.netTotal),
          ),
        ]),
        isOverlayMode
          ? h(
            "div",
            { className: "ui-chart__tooltip-list" },
            overlaySeries.map((overlay) => {
              const val = hoverContext.overlayValues[overlay.key];
              if (val === null || val === undefined) {
                return null;
              }
              return h("div", { key: overlay.key,
                className: "ui-chart__tooltip-row" }, [
                h("span", { className: "ui-chart__tooltip-row-label" }, [
                  h("span", {
                    className: [
                      "ui-chart__overlay-swatch",
                      overlay.swatchClass ?? "",
                    ].filter(Boolean).join(" "),
                  }),
                  `${overlay.label}:`,
                ]),
                h(
                  "span",
                  { className: "ui-chart__tooltip-row-val tabular-nums" },
                  formatValue(val),
                ),
              ]);
            }),
          )
          : h("div", { className: "ui-chart__tooltip-list" }, (() => {
            const activeRows = seriesTopToBottom.filter((item) => {
              if (!hoverContext.visibleSeries[item.key]) {
                return false;
              }
              return (hoverContext.point.values[item.key] ?? 0) !== 0;
            });
            if (activeRows.length === 0) {
              return h(
                "div",
                { className: "ui-chart__tooltip-empty" },
                "No visible series in this slot.",
              );
            }
            return activeRows.map((item) => {
              const val = hoverContext.point.values[item.key] ?? 0;
              return h(
                "div",
                {
                  key: item.key,
                  className: [
                    "ui-chart__tooltip-row",
                    item.seriesClass ?? "",
                    toneClassName(item.tooltipTone, val),
                  ].filter(Boolean).join(" "),
                },
                [
                  h("span", { className: "ui-chart__tooltip-row-label" }, [
                    h("span", { className: "ui-chart__dot" }),
                    item.tooltipLabel ?? `${item.label}:`,
                  ]),
                  h(
                    "span",
                    { className: "ui-chart__tooltip-row-val tabular-nums" },
                    `${val > 0 && item.showPositiveSign ? "+" : ""}${formatValue(val)}`,
                  ),
                ],
              );
            });
          })()),
      ])
      : null;

  return h("div", { className: rootClassName }, [
    h("div", { className: "ui-chart__header" }, [
      h("div", null, [
        h("h3", { className: "ui-chart__title" }, title),
        subtitle ? h("p", { className: "ui-chart__subtitle" }, subtitle) : null,
        headerAside ?? null,
      ]),
      modeControl ?? null,
    ]),
    h("div", { className: "ui-chart__toolbar" }, toolbarContent),
    h("div", { ref: containerRef,
      className: "ui-chart__plot-wrap" }, [
      plotArea,
      isClientReady && hoverState !== null && hoverContext !== null
        ? h(
          "div",
          {
            className: "ui-chart__tooltip",
            style: { left: `${hoverState.leftPx}px` },
          },
          renderTooltip ? renderTooltip(hoverContext) : defaultTooltipContent,
        )
        : null,
    ]),
  ]);
}
