import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  BadgeTone,
  ButtonSize,
  ButtonVariant,
  badgeClassName,
  buttonClassName,
} from "#utils/uiHelpers";

describe("Reusable UI Primitive Helpers", () => {
  it("builds canonical Button class names from ButtonVariant and ButtonSize enums", () => {
    assert.equal(buttonClassName(), "ui-btn");
    assert.equal(buttonClassName(ButtonVariant.Primary), "ui-btn ui-btn--primary");
    assert.equal(buttonClassName(ButtonVariant.Ghost, ButtonSize.Sm), "ui-btn ui-btn--ghost ui-btn--sm");
    assert.equal(
      buttonClassName(ButtonVariant.Danger, ButtonSize.Md, "custom-action"),
      "ui-btn ui-btn--danger custom-action",
    );
  });

  it("builds canonical Badge class names from BadgeTone enum", () => {
    assert.equal(badgeClassName(), "badge-neutral");
    assert.equal(badgeClassName(BadgeTone.Gain), "badge-gain");
    assert.equal(badgeClassName(BadgeTone.Warning, "extra"), "badge-warning extra");
    assert.equal(badgeClassName(BadgeTone.Loss), "badge-loss");
    assert.equal(badgeClassName(BadgeTone.Brand), "badge-brand");
  });
});
