import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  allCalculatorApps,
} from "#/apps/registry.ts";
import {
  BannerTone,
  ModalDialogSize,
  appShellMainClassName,
  bannerRoleForTone,
  calculatorNavigationItems,
  isActiveRoute,
  lockBodyScroll,
  modalDialogCardClassName,
  normalizeRoutePath,
  statusBannerClassName,
  toBannerTone,
  toModalDialogSize,
} from "#utils/uiHelpers";

describe("uiHelpers", () => {
  it("validates BannerTone and ModalDialogSize enums and rejects invalid values", () => {
    assert.equal(toBannerTone("info"), BannerTone.Info);
    assert.equal(toBannerTone("success"), BannerTone.Success);
    assert.equal(toBannerTone("warning"), BannerTone.Warning);
    assert.equal(toBannerTone("danger"), BannerTone.Danger);
    assert.throws(() => toBannerTone("neutral"), TypeError);

    assert.equal(toModalDialogSize("compact"), ModalDialogSize.Compact);
    assert.equal(toModalDialogSize("medium"), ModalDialogSize.Medium);
    assert.equal(toModalDialogSize("large"), ModalDialogSize.Large);
    assert.throws(() => toModalDialogSize("fullscreen"), TypeError);
  });

  it("maps banner tones to ARIA roles and class names", () => {
    assert.equal(bannerRoleForTone(BannerTone.Info), "status");
    assert.equal(bannerRoleForTone(BannerTone.Success), "status");
    assert.equal(bannerRoleForTone(BannerTone.Warning), "alert");
    assert.equal(bannerRoleForTone(BannerTone.Danger), "alert");

    assert.equal(
      statusBannerClassName(BannerTone.Success),
      "ui-status-banner ui-status-banner--success",
    );
    assert.equal(
      statusBannerClassName(BannerTone.Warning, true),
      "ui-status-banner ui-status-banner--warning ui-status-banner--compact",
    );
  });

  it("builds modal card and AppShell main class names cleanly", () => {
    assert.equal(modalDialogCardClassName(), "ui-modal__card ui-modal__card--medium");
    assert.equal(modalDialogCardClassName(ModalDialogSize.Large), "ui-modal__card ui-modal__card--large");

    assert.equal(appShellMainClassName(), "ui-page");
    assert.equal(appShellMainClassName(true), "ui-page ui-page--wide");
    assert.equal(
      appShellMainClassName(false, "  calculator-catalog  "),
      "ui-page calculator-catalog",
    );
  });

  it("normalizes routes and resolves active state without accidental prefix matches", () => {
    assert.equal(normalizeRoutePath(undefined), "/");
    assert.equal(normalizeRoutePath(""), "/");
    assert.equal(normalizeRoutePath("/calculators/net-pay/"), "/calculators/net-pay");
    assert.equal(normalizeRoutePath("https://rechner.test/laws/estg-32a/?tab=1#top"), "/laws/estg-32a");

    assert.equal(isActiveRoute("/", "/"), true);
    assert.equal(isActiveRoute("/profile/", "/"), false);
    assert.equal(isActiveRoute("/laws/estg-32a/", "/laws/"), true);
    assert.equal(isActiveRoute("/calculators/net-pay", "/calculators/net-pay/"), true);
    assert.equal(isActiveRoute("/calculators/net-pay-other/", "/calculators/net-pay/"), false);
  });

  it("builds navigation items for all registered calculators and highlights the current route", () => {
    const netPayPath = calculatorPath(AppId.NetPay);
    const items = calculatorNavigationItems(allCalculatorApps, netPayPath);
    assert.equal(items.length, allCalculatorApps.length);

    const netPayItem = items.find((item) => item.id === AppId.NetPay);
    assert.ok(netPayItem);
    assert.equal(netPayItem.href, netPayPath);
    assert.equal(netPayItem.isCurrent, true);
    assert.equal(netPayItem.isDraft, false);

    const visaItem = items.find((item) => item.id === AppId.Visa);
    assert.ok(visaItem);
    assert.equal(visaItem.isCurrent, false);
    assert.equal(visaItem.isDraft, true);
  });

  const createMockRootElement = (
    cssVars: Map<string, string>,
    resolveWidth: () => number,
  ): {
    readonly clientWidth: number;
    readonly style: {
      getPropertyValue: (property: string) => string;
      setProperty: (property: string, value: string) => void;
      removeProperty: (property: string) => string;
    };
  } => ({
    get clientWidth(): number {
      return resolveWidth();
    },
    style: {
      getPropertyValue: (property: string): string => cssVars.get(property) ?? "",
      setProperty: (property: string, value: string): void => {
        cssVars.set(property, value);
      },
      removeProperty: (property: string): string => {
        const prev = cssVars.get(property) ?? "";
        cssVars.delete(property);
        return prev;
      },
    },
  });

  it("compensates scrollbar collapse in lockBodyScroll and restores previous styles idempotently", () => {
    const cssVars = new Map<string, string>();
    const bodyStyle = {
      overflow: "auto",
      paddingRight: "",
    };

    const unlock = lockBodyScroll(
      {
        documentElement: createMockRootElement(
          cssVars,
          () => (bodyStyle.overflow === "hidden" ? 1200 : 1192),
        ),
        body: { style: bodyStyle },
      },
      () => "12px",
    );

    assert.equal(bodyStyle.overflow, "hidden");
    assert.equal(bodyStyle.paddingRight, "20px");
    assert.equal(cssVars.get("--scrollbar-compensation"), "8px");

    unlock();
    assert.equal(bodyStyle.overflow, "auto");
    assert.equal(bodyStyle.paddingRight, "");
    assert.equal(cssVars.has("--scrollbar-compensation"), false);

    // Second cleanup call is a safe no-op and does not clobber newer styles.
    bodyStyle.overflow = "scroll";
    unlock();
    assert.equal(bodyStyle.overflow, "scroll");
  });

  it("leaves paddingRight and --scrollbar-compensation untouched when clientWidth delta is zero", () => {
    const cssVars = new Map<string, string>();
    const bodyStyle = {
      overflow: "",
      paddingRight: "4px",
    };

    const unlock = lockBodyScroll(
      {
        documentElement: createMockRootElement(cssVars, () => 1200),
        body: { style: bodyStyle },
      },
      () => "4px",
    );

    assert.equal(bodyStyle.overflow, "hidden");
    assert.equal(bodyStyle.paddingRight, "4px");
    assert.equal(cssVars.has("--scrollbar-compensation"), false);

    unlock();
    assert.equal(bodyStyle.overflow, "");
    assert.equal(bodyStyle.paddingRight, "4px");
  });
});
