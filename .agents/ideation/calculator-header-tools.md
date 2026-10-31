# Calculator column header tools

Selected: Import in the live header; Export in each saved header; move saved columns left/right while live stays first. Export saved values rather than unsaved drafts, clearly labeled. Import validates a versioned calculator-only JSON document in full before replacing live inputs; saved columns and open drafts remain untouched. Imported results are recalculated using verified profiles, never trusted from a file. Reordering persists the saved array and preserves scenario identity and active drafts. End controls are disabled.

Atomic progression: saved-order action with tests; calculator JSON roundtrip and transactional live import with tests; header controls and browser verification. Keep unrelated test-random files untouched.

## Completed

- `267e349`: Left/right saved-column actions persist the reordered list and preserve live inputs, scenario identity and active drafts. Missing IDs and boundary moves are no-ops.
- `f328349`: Versioned calculator JSON with explicit input validation and saved metadata, no cached financial results. Verified-year rules and payroll constructors validate imports before live state changes. Live assignments run in a batch; saved scenarios and drafts are untouched. Legacy saved cases export the same default verified year used by their calculation.
- Header UI: Import in live; Export saved and Move left/right in saved columns. Boundary buttons disabled. Import resets incomplete live field drafts while preserving saved drafts and their validation state. Export explicitly excludes unsaved edits.

Validation: formatter, full audit (zero errors/warnings), and build passed for every code scope. Permanent tests cover movement boundaries, draft/live isolation, JSON roundtrip, cents/zero partner income, rejecting malformed financial/settings/year payloads without partial updates, and ignoring file-supplied cached results. Existing column-render checks remain green.

Browser: downloaded a 50,000 saved case while its draft showed 80,000 and inspected the resulting JSON; verified invalid import rejection, valid import restoring a blank live field with the same original value, saved draft preservation, leftward movement of a 70,000 draft, disabled boundaries, and persisted order after reload. Import fit at 390px; restored viewport. Removed both temporary saved cases and restored the isolated localhost baseline. Screenshot: /tmp/calculator-header-tools.png. Unrelated test-random/ and user scenarios on other origins remain untouched. No exhaustive browser/accessibility matrix was run.
