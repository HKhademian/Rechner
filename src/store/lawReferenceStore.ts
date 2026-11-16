import {
  getLawEntry,
  getLawGroupEntry,
} from "#engine/laws/registry";
import {
  type LawGroupId,
  type LawId,
  type LawTag,
} from "#engine/laws/types";
import {
  signal,
} from "@preact/signals";

/**
 * Navigation state for the unified Law Reference Popup modal.
 */
export interface LawReferenceContext {
  readonly title: string;
  readonly topicId?: string;
  readonly description: string;
  readonly calculatorEffect: string;
}

export interface LawReferenceModalState {
  readonly currentLawId: LawId;
  readonly context?: LawReferenceContext;
  readonly activeGroupId?: LawGroupId;
  readonly history: readonly LawId[];
}

/** Reactive active state of the unified Law Reference popup (`null` when closed). */
export const activeLawModalState = signal<LawReferenceModalState | null>(null);

/** Reactive active tag filter inside the modal directory/explorer drawer. */
export const activeLawTagFilter = signal<LawTag | undefined>(undefined);

/** Reactive search query inside the modal directory/explorer drawer. */
export const activeLawSearchQuery = signal<string>("");

/** Opens the unified Law Reference popup focused on a specific typed `LawId`. */
export function openLawReference(
  lawId: LawId,
  groupId?: LawGroupId,
  context?: LawReferenceContext,
): void {
  const entry = getLawEntry(lawId);
  activeLawModalState.value = {
    currentLawId: lawId,
    context,
    activeGroupId: groupId ?? entry.groupId,
    history: [],
  };
}

/** Opens the unified Law Reference popup focused on a thematic `LawGroupId`. */
export function openLawGroupReference(groupId: LawGroupId): void {
  const group = getLawGroupEntry(groupId);
  activeLawModalState.value = {
    currentLawId: group.primaryLawId,
    activeGroupId: groupId,
    history: [],
  };
}

/** Navigates inside the open popup to a cross-referenced `LawId`, preserving back history. */
export function navigateToRelatedLaw(lawId: LawId): void {
  const current = activeLawModalState.value;
  if (!current) {
    openLawReference(lawId);
    return;
  }
  if (current.currentLawId === lawId) {
    return;
  }
  const nextEntry = getLawEntry(lawId);
  activeLawModalState.value = {
    currentLawId: lawId,
    activeGroupId: nextEntry.groupId,
    history: [...current.history, current.currentLawId],
  };
}

/** Returns to the previously inspected law in the popup history stack. */
export function navigateLawHistoryBack(): void {
  const current = activeLawModalState.value;
  if (!current || current.history.length === 0) {
    return;
  }
  const previousLawId = current.history[current.history.length - 1];
  const previousEntry = getLawEntry(previousLawId);
  activeLawModalState.value = {
    currentLawId: previousLawId,
    activeGroupId: previousEntry.groupId,
    history: current.history.slice(0, -1),
  };
}

/** Closes the unified Law Reference popup and clears transient filter state. */
export function closeLawReference(): void {
  activeLawModalState.value = null;
  activeLawTagFilter.value = undefined;
  activeLawSearchQuery.value = "";
}

/** Updates the optional `LawTag` filter inside the Law Reference popup explorer. */
export function setLawTagFilter(tag: LawTag | undefined): void {
  activeLawTagFilter.value = tag;
}

/** Updates the search query inside the Law Reference popup explorer. */
export function setLawSearchQuery(query: string): void {
  activeLawSearchQuery.value = query;
}

/**
 * Returns true only for an unmodified primary click (plain left click without Ctrl/Cmd/Shift/Alt),
 * letting Ctrl+Click / Cmd+Click / middle-click on semantic `<a>` law links open the full Law Page.
 */
export function isPlainPrimaryClick(
  event: Readonly<{
    readonly button: number;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
  }>,
): boolean {
  return (
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
