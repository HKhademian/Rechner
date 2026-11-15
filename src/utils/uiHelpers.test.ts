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
});
