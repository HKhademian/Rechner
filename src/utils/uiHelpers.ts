import {
  type CalculatorAppDefinition,
  type CalculatorCategory,
  CalculatorReleaseStatus,
  calculatorPath,
} from "#/apps/appDefinition.ts";

export const BannerTone = {
  Info: "info",
  Success: "success",
  Warning: "warning",
  Danger: "danger",
} as const;

export type BannerTone = (typeof BannerTone)[keyof typeof BannerTone];

/** Validates a banner tone value at runtime. */
export function toBannerTone(value: string): BannerTone {
  if (!Object.values(BannerTone).includes(value as BannerTone)) {
    throw new TypeError(`Unknown banner tone: ${value}`);
  }
  return value as BannerTone;
}

export const ModalDialogSize = {
  Compact: "compact",
  Medium: "medium",
  Large: "large",
} as const;

export type ModalDialogSize = (typeof ModalDialogSize)[keyof typeof ModalDialogSize];

/** Validates a modal dialog size value at runtime. */
export function toModalDialogSize(value: string): ModalDialogSize {
  if (!Object.values(ModalDialogSize).includes(value as ModalDialogSize)) {
    throw new TypeError(`Unknown modal dialog size: ${value}`);
  }
  return value as ModalDialogSize;
}

/** Returns the ARIA live-region role appropriate for a status banner tone. */
export function bannerRoleForTone(tone: BannerTone): "status" | "alert" {
  if (tone === BannerTone.Warning || tone === BannerTone.Danger) {
    return "alert";
  }
  return "status";
}

/** Builds deterministic CSS classes for the shared `StatusBanner` component. */
export function statusBannerClassName(
  tone: BannerTone,
  compact = false,
): string {
  return [
    "ui-status-banner",
    `ui-status-banner--${tone}`,
    compact ? "ui-status-banner--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Builds deterministic CSS classes for the shared `ModalDialog` card container. */
export function modalDialogCardClassName(
  size: ModalDialogSize = ModalDialogSize.Medium,
): string {
  return `ui-modal__card ui-modal__card--${size}`;
}

/** Builds deterministic CSS classes for the shared `AppShell` `<main>` container. */
export function appShellMainClassName(
  wide = false,
  className = "",
): string {
  return [
    "ui-page",
    wide ? "ui-page--wide" : "",
    className.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Normalizes a URL or route path for consistent active-route comparisons. */
export function normalizeRoutePath(path: string | undefined): string {
  if (!path) {
    return "/";
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }
  let pathname = trimmed;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    }
    catch {
      pathname = trimmed;
    }
  }
  const withoutHashOrQuery = pathname.split(/[?#]/, 1)[0] ?? "/";
  const normalized = withoutHashOrQuery.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

/** Checks whether `currentPath` matches `targetHref` (exact for root, exact or prefix for sub-routes). */
export function isActiveRoute(
  currentPath: string | undefined,
  targetHref: string,
): boolean {
  const current = normalizeRoutePath(currentPath);
  const target = normalizeRoutePath(targetHref);
  if (target === "/") {
    return current === "/";
  }
  return current === target || current.startsWith(`${target}/`);
}

export interface CalculatorNavigationItem {
  readonly id: CalculatorAppDefinition["id"];
  readonly title: string;
  readonly description: string;
  readonly category: CalculatorCategory;
  readonly href: string;
  readonly isDraft: boolean;
  readonly isCurrent: boolean;
}

/** Maps registry calculator definitions into navigation items for the Tools switcher menu. */
export function calculatorNavigationItems(
  apps: readonly CalculatorAppDefinition[],
  currentPath?: string,
): readonly CalculatorNavigationItem[] {
  return apps.map((app) => {
    const href = calculatorPath(app.id);
    return {
      id: app.id,
      title: app.title,
      description: app.description,
      category: app.category,
      href,
      isDraft: app.releaseStatus === CalculatorReleaseStatus.Draft,
      isCurrent: isActiveRoute(currentPath, href),
    };
  });
}
