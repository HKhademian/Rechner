# Calculator column header tools

Selected: Import in the live header; Export in each saved header; move saved columns left/right while live stays first. Export saved values rather than unsaved drafts, clearly labeled. Import validates a versioned calculator-only JSON document in full before replacing live inputs; saved columns and open drafts remain untouched. Imported results are recalculated using verified profiles, never trusted from a file. Reordering persists the saved array and preserves scenario identity and active drafts. End controls are disabled.

Atomic progression: saved-order action with tests; calculator JSON roundtrip and transactional live import with tests; header controls and browser verification. Keep unrelated test-random files untouched.
