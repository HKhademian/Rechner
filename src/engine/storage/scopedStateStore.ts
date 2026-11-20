import {
  type Signal,
  signal,
} from "@preact/signals";
import {
  type AppId,
} from "#/apps/appDefinition.ts";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";

export interface ScopedStateStore<TState> {
  readonly defaultState: TState;
  readonly state: Signal<TState>;
  readonly update: (updater: (current: TState) => TState) => void;
  readonly replace: (next: TState) => void;
  readonly reset: () => void;
}

/**
 * Creates an isolated signal-backed store scoped to a single standalone calculator's
 * `browserAppStorage(appId)` namespace with strict validation and safe fallback.
 */
export function createScopedStateStore<TState>(options: {
  readonly appId: AppId;
  readonly field?: string;
  readonly createDefault: () => TState;
  readonly parse: (raw: unknown) => TState;
}): ScopedStateStore<TState> {
  const field = options.field ?? "state";
  const storage = browserAppStorage(options.appId);
  const defaultState = options.createDefault();

  function load(): TState {
    const raw = storage.getItem(field);
    if (!raw) {
      return options.createDefault();
    }
    try {
      return options.parse(JSON.parse(raw));
    }
    catch {
      return options.createDefault();
    }
  }

  const state = signal<TState>(load());

  function replace(next: TState): void {
    const validated = options.parse(next);
    state.value = validated;
    storage.setItem(field, JSON.stringify(validated));
  }

  function update(updater: (current: TState) => TState): void {
    replace(updater(state.value));
  }

  function reset(): void {
    const fresh = options.createDefault();
    state.value = fresh;
    storage.removeItem(field);
  }

  return Object.freeze({
    defaultState,
    state,
    update,
    replace,
    reset,
  });
}
