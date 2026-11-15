import {
  useEffect,
  useState,
} from "preact/hooks";

/**
 * Returns `false` during SSR and Preact's initial `hydrate()` pass, then flips
 * to `true` on mount so persisted browser state diffs cleanly against SSR DOM
 * without Preact hydration attribute or sibling-tag mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
