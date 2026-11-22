import {
  lawDetailPath,
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  STATUTORY_FORMULA_DESCRIPTORS,
} from "#engine/formulas/context/statutoryEvaluators";
import {
  type FormulaId,
} from "#engine/formulas/types";
import {
  getLawEntry,
} from "#engine/laws/registry";
import {
  type LawId,
} from "#engine/laws/types";
import {
  formatParameterValue,
  getParameterDefinition,
  resolveParameterForYear,
} from "#engine/parameters/registry";
import {
  type ParameterId,
} from "#engine/parameters/types";
import {
  getTopic,
  topicsForLaw,
} from "#engine/topics/registry";
import {
  type FullCalendarYear,
  toFullCalendarYear,
} from "#engine/types";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  plainContentText,
} from "#utils/contentLinks";
import {
  topicPath,
} from "#utils/topicPath";
import {
  BadgeTone,
} from "#utils/uiHelpers";

export const WikiRefKind = {
  Law: "law",
  Topic: "topic",
  Parameter: "parameter",
  Formula: "formula",
} as const;
export type WikiRefKind = (typeof WikiRefKind)[keyof typeof WikiRefKind];

export function toWikiRefKind(value: string): WikiRefKind {
  if (!Object.values(WikiRefKind).includes(value as WikiRefKind)) {
    throw new TypeError(`Unknown wiki reference kind: ${value}`);
  }
  return value as WikiRefKind;
}

export type WikiRefTarget =
  | {
    readonly kind: typeof WikiRefKind.Law;
    readonly id: LawId;
  }
  | {
    readonly kind: typeof WikiRefKind.Topic;
    readonly id: string;
  }
  | {
    readonly kind: typeof WikiRefKind.Parameter;
    readonly id: ParameterId;
  }
  | {
    readonly kind: typeof WikiRefKind.Formula;
    readonly id: FormulaId;
  };

export interface WikiRelatedLink {
  readonly label: string;
  readonly target: WikiRefTarget;
}

export interface WikiEntryView {
  readonly kind: WikiRefKind;
  readonly eyebrow: string;
  readonly tone: BadgeTone;
  readonly title: string;
  readonly summary: string;
  readonly valueLine?: string;
  readonly href: string;
  readonly related: readonly WikiRelatedLink[];
}

const MAX_RELATED_LINKS = 5;

function dedupeRelated(links: readonly WikiRelatedLink[]): readonly WikiRelatedLink[] {
  const seen = new Set<string>();
  const out: WikiRelatedLink[] = [];
  for (const item of links) {
    const key = `${item.target.kind}:${item.target.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
    if (out.length >= MAX_RELATED_LINKS) {
      break;
    }
  }
  return Object.freeze(out);
}

/**
 * Resolves any Law, Topic, Parameter/Constant, or Formula target against Rechner's
 * central registries into a unified cross-linked wiki preview card model.
 */
export function resolveWikiRef(
  target: WikiRefTarget,
  year: FullCalendarYear = toFullCalendarYear(DEFAULT_TAX_YEAR),
  overrides: Readonly<Partial<Record<ParameterId, number>>> = {},
): WikiEntryView | undefined {
  switch (target.kind) {
    case WikiRefKind.Law: {
      const law = getLawEntry(target.id);
      if (!law) {
        return undefined;
      }
      const related: WikiRelatedLink[] = [];
      for (const topic of topicsForLaw(law.id)) {
        related.push({
          label: topic.title,
          target: {
            kind: WikiRefKind.Topic,
            id: topic.id,
          },
        });
      }
      for (const relId of Object.keys(law.relatedLaws)) {
        const relLaw = getLawEntry(relId as LawId);
        if (relLaw) {
          related.push({
            label: relLaw.citation,
            target: {
              kind: WikiRefKind.Law,
              id: relLaw.id,
            },
          });
        }
      }
      return Object.freeze({
        kind: WikiRefKind.Law,
        eyebrow: `Law · ${law.code}`,
        tone: BadgeTone.Brand,
        title: `${law.citation} — ${law.title}`,
        summary: plainContentText(law.summary),
        href: lawDetailPath(law.id),
        related: dedupeRelated(related),
      });
    }
    case WikiRefKind.Topic: {
      const topic = getTopic(target.id);
      if (!topic) {
        return undefined;
      }
      const related: WikiRelatedLink[] = [];
      for (const lawId of topic.laws) {
        const law = getLawEntry(lawId);
        if (law) {
          related.push({
            label: law.citation,
            target: {
              kind: WikiRefKind.Law,
              id: law.id,
            },
          });
        }
      }
      for (const relTopicId of topic.relatedTopics ?? []) {
        const relTopic = getTopic(relTopicId);
        if (relTopic) {
          related.push({
            label: relTopic.title,
            target: {
              kind: WikiRefKind.Topic,
              id: relTopic.id,
            },
          });
        }
      }
      return Object.freeze({
        kind: WikiRefKind.Topic,
        eyebrow: "Topic",
        tone: BadgeTone.Brand,
        title: topic.title,
        summary: plainContentText(topic.description),
        valueLine: topic.calculatorEffect ? plainContentText(topic.calculatorEffect) : undefined,
        href: topicPath(topic.id),
        related: dedupeRelated(related),
      });
    }
    case WikiRefKind.Parameter: {
      const resolved = resolveParameterForYear(target.id, year, overrides);
      const formatted = formatParameterValue(resolved.activeValue, resolved.definition.unit);
      const valueLine = resolved.overridden
        ? `${formatted} (custom · statutory default ${formatParameterValue(resolved.baselineValue, resolved.definition.unit)})`
        : `${formatted} (${year} statutory value)`;
      const related: WikiRelatedLink[] = [];
      for (const lawId of resolved.definition.lawIds) {
        const law = getLawEntry(lawId);
        if (law) {
          related.push({
            label: law.citation,
            target: {
              kind: WikiRefKind.Law,
              id: law.id,
            },
          });
        }
      }
      return Object.freeze({
        kind: WikiRefKind.Parameter,
        eyebrow: `Constant · ${year}`,
        tone: BadgeTone.Warning,
        title: resolved.definition.label,
        summary: resolved.definition.description,
        valueLine,
        href: sitePath(`/constants/${target.id}/`),
        related: dedupeRelated(related),
      });
    }
    case WikiRefKind.Formula: {
      const descriptor = STATUTORY_FORMULA_DESCRIPTORS[target.id];
      if (!descriptor) {
        return undefined;
      }
      const related: WikiRelatedLink[] = [];
      for (const lawId of descriptor.governingLawIds) {
        const law = getLawEntry(lawId);
        if (law) {
          related.push({
            label: law.citation,
            target: {
              kind: WikiRefKind.Law,
              id: law.id,
            },
          });
        }
      }
      for (const paramId of descriptor.consumedParameterIds) {
        const def = getParameterDefinition(paramId);
        related.push({
          label: def.label,
          target: {
            kind: WikiRefKind.Parameter,
            id: paramId,
          },
        });
      }
      return Object.freeze({
        kind: WikiRefKind.Formula,
        eyebrow: "Formula",
        tone: BadgeTone.Gain,
        title: descriptor.label,
        summary: descriptor.description,
        href: sitePath(`/formulas/${target.id}/`),
        related: dedupeRelated(related),
      });
    }
  }
}

export const WikiPeekHorizontalAlign = {
  Start: "start",
  End: "end",
  Center: "center",
  ViewportDock: "viewport-dock",
} as const;
export type WikiPeekHorizontalAlign =
  (typeof WikiPeekHorizontalAlign)[keyof typeof WikiPeekHorizontalAlign];

export const WikiPeekVerticalAlign = {
  Below: "below",
  Above: "above",
} as const;
export type WikiPeekVerticalAlign =
  (typeof WikiPeekVerticalAlign)[keyof typeof WikiPeekVerticalAlign];

export interface WikiPeekPlacement {
  readonly horizontal: WikiPeekHorizontalAlign;
  readonly vertical: WikiPeekVerticalAlign;
}

export interface WikiPeekViewportGeometry {
  readonly triggerLeft: number;
  readonly triggerRight: number;
  readonly triggerTop: number;
  readonly triggerBottom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly preferEnd?: boolean;
  readonly peekWidthPx?: number;
  readonly estimatedPeekHeightPx?: number;
  readonly marginPx?: number;
}

/**
 * Pure viewport collision calculator for `WikiRefLink` peek cards.
 * Guarantees the floating card never overflows horizontally (which would trigger
 * unwanted page-level horizontal scrollbars) and flips above the trigger near the bottom fold.
 */
export function computeWikiPeekPlacement(
  geometry: WikiPeekViewportGeometry,
): WikiPeekPlacement {
  const margin = geometry.marginPx ?? 16;
  const peekWidth = Math.min(geometry.peekWidthPx ?? 340, geometry.viewportWidth * 0.86);
  const estimatedHeight = geometry.estimatedPeekHeightPx ?? 280;

  const fitsStart =
    geometry.triggerLeft >= margin &&
    geometry.triggerLeft + peekWidth <= geometry.viewportWidth - margin;
  const fitsEnd =
    geometry.triggerRight <= geometry.viewportWidth - margin &&
    geometry.triggerRight - peekWidth >= margin;
  const triggerCenter = (geometry.triggerLeft + geometry.triggerRight) / 2;
  const fitsCenter =
    triggerCenter - peekWidth / 2 >= margin &&
    triggerCenter + peekWidth / 2 <= geometry.viewportWidth - margin;

  let horizontal: WikiPeekHorizontalAlign;
  if (geometry.viewportWidth <= 640) {
    horizontal = WikiPeekHorizontalAlign.ViewportDock;
  }
  else if (geometry.preferEnd && fitsEnd) {
    horizontal = WikiPeekHorizontalAlign.End;
  }
  else if (!geometry.preferEnd && fitsStart) {
    horizontal = WikiPeekHorizontalAlign.Start;
  }
  else if (fitsEnd) {
    horizontal = WikiPeekHorizontalAlign.End;
  }
  else if (fitsStart) {
    horizontal = WikiPeekHorizontalAlign.Start;
  }
  else if (fitsCenter) {
    horizontal = WikiPeekHorizontalAlign.Center;
  }
  else {
    horizontal = WikiPeekHorizontalAlign.ViewportDock;
  }

  const spaceBelow = geometry.viewportHeight - geometry.triggerBottom;
  const spaceAbove = geometry.triggerTop;
  const vertical = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
    ? WikiPeekVerticalAlign.Above
    : WikiPeekVerticalAlign.Below;

  return Object.freeze({
    horizontal,
    vertical,
  });
}
