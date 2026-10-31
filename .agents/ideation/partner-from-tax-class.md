---
name: Open calculator partner inputs from tax-class selection
status: in_progress
created: 2026-10-31
---

# Open calculator partner inputs from tax-class selection

The user requested that selecting an appropriate tax class automatically enable the second partner in a Net Pay Calculator scenario. Apply the same editing behavior to the live calculation and an active saved-scenario draft.

## Selected behavior

- Selecting III, IV or V for the primary earner enables Include partner and reveals the existing partner inputs.
- I, II and VI leave the partner switch unchanged; switching classes must not silently remove a partner. VI represents additional employment, not a spouse signal.
- Keep the manual switch available, including switching it off while III/IV/V remains selected. This is a convenience, not a legal inference: III includes widowhood and other special cases.
- Preserve existing partner salary, tax class, personal details and schedule. Show a short source-linked explanation prompting review of partner inputs. Do not invent a paired tax class or additional financial defaults.
- Change only the selected editing target. Saved scenarios remain unchanged until Save; live changes do not mutate drafts. Loading existing data and pure calculation must not override a saved explicit partner setting.
- Validate the entire candidate before publishing either the class or partner switch, and batch related live signal updates.

Official definitions verified on 2026-10-31: https://www.gesetze-im-internet.de/estg/__38b.html (III/IV/V and the III exceptions; VI for additional employment).

## Atomic scopes and checks

1. Add the source-backed editing policy and validated live/draft transitions, with regressions for III/IV/V, VI, manual override, state preservation and rejection without partial writes.
2. Wire the live tax-class selector to that transition and add the concise official-source explanation in the shared parameter row. Verify partner-field visibility and target isolation through real handlers and browser interactions.

Run formatter before staging, full audit and build for each code scope. Preserve simulator inputs, financial formulas, published profiles, ledger ordering and unrelated test-random files.
