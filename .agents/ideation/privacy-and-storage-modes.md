# Rechner Privacy and Storage Modes

**Date:** 2026-11-07  
**Status:** Product direction; implementation not started.

## Goal

Give Rechner users a clear choice about whether their calculator inputs survive a reload or browser restart. Avoid cookies and make the storage behavior easy to inspect and change from the app.

## User-facing choices

- **This tab only (memory):** Keep calculator state in memory. Reloading or closing the tab clears it.
- **This session (session storage):** Keep state in `sessionStorage` for the lifetime of the browser tab. Closing the tab clears it.
- **Save on this device (local storage):** Keep state in `localStorage` across visits, only after the user selects this option and acknowledges that household and financial inputs are saved in this browser profile.

The app should have no cookie reads or writes. Choosing a storage mode must be possible at first use and later from a visible privacy/data control. Explain mode changes and the effect on existing saved data before applying them. Provide a clear-data action.

## Storage abstraction

The existing `AppStorage` interface in `src/engine/storage/appStorage.ts` already isolates calculator stores from storage operations, but `browserAppStorage` currently always wraps `localStorage`. Evolve this boundary so calculator stores depend on one app-scoped storage provider selected by a user preference, rather than reaching for browser storage directly.

The provider should preserve the existing `getItem`, `setItem`, and `removeItem` behavior and select one backend:

1. An in-memory map for memory-only mode.
2. `sessionStorage` for tab-session mode.
3. `localStorage` for persistent mode.

Storage mode is a typed setting with explicit constructors/validation, following repository domain-type rules. Keep app namespaces so one calculator can clear or migrate its own keys without touching another app's data. UI code changes the selected mode through the provider; calculator stores remain unaware of which backend is active.

## First-use and mode-switch behavior

- Start without persistent writes until the user has made a choice. If no choice can be remembered without violating the selected mode, ask again on a later visit rather than silently creating a persistent preference.
- Selecting persistent mode is the only path that enables writes to `localStorage` and migration from legacy Rechner keys. Present an explicit acknowledgment before migrating existing values.
- Switching modes must have a defined, user-visible data transition. Copy current in-memory state to the newly selected backend only when the user chooses to keep it; when choosing memory-only, clear Rechner-owned persisted state after an explicit confirmation.
- A storage or quota failure must leave the calculator usable in memory and explain that the selected mode could not be applied.
- Keep exported JSON as a separate user-initiated file action; it is not implicit background storage.

## Network and offline boundary

Rechner can promise that its application code does not transmit calculator inputs and can avoid third-party requests. The current code search found no cookie API, analytics integration, or application `fetch`/XHR request path; the architecture documentation also describes financial data as browser-local. This code-level check is not a guarantee about hosting access logs, browser extensions, or the browser itself.

A web page cannot revoke the browser/device's network permission in the way Android can restrict an app. A stronger offline experience would require an installable, locally cached application and a restrictive Content Security Policy, with all runtime assets served locally and no third-party dependencies. Opening a legal source link still makes a user-initiated request to that external site. Keep offline packaging and network policy as a separate, later decision from storage mode.

## Current implementation evidence

- `src/engine/storage/appStorage.ts` exposes an app-scoped storage interface, but its browser provider is hard-coded to `localStorage` and it may copy legacy keys during reads/writes.
- `src/engine/storage/persistence.ts` saves, loads, and clears parental-leave state through that app-scoped provider; other stores also persist automatically.
- `src/store/elterngeldStore.ts` automatically persists reactive state changes.
- The repository already opts out of framework telemetry and tracking through Rule 18, but that does not itself define browser storage consent or a device-level network block.

## Open decisions

- Whether first use should start in memory-only mode or ask the user to select a mode before entering data.
- Whether session storage should be the default for users who want reload recovery without long-term persistence.
- Whether a later offline/PWA package is part of Rechner's release scope.
