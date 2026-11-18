# Event-based Life Profile project plan

Status: proposed roadmap, 18 November 2026. This plans incremental work toward a personal planning assistant; it does not imply that the features below already exist or approve a particular legal interpretation. Product vision and requested journeys: [event-based Life Profile exploration](event-based-life-profile.md).

## Outcome

A person can gradually build a private, understandable life timeline, see relevant information as of a date, and use it to prepare for decisions. Over time, focused calculators, explanations, scenario comparisons, and historical and projected charts can help them make plans that fit their circumstances.

The user endorsed Life Profile as the home for shared life information. Preserve the existing Parental Leave Planner and its event-based experience, calculations, scenarios, and data. Calculator-specific what-if scenarios remain separate by default; moving profile data into one is an explicit, previewed action.

## Starting point

- Life Profile currently stores a flat version 1 profile, with example defaults and manual transfers to calculators (`src/engine/lifeProfile/`, `src/store/lifeProfileStore.ts`). Do not interpret example defaults as confirmed life events.
- The parental planner already has rich event actions and its own simulation contract. Its profile transfer is manual and one-way (`src/components/elterngeld/ElterngeldDashboard.tsx`); preserve its input flow, action batches and dates.
- Existing shared storage, backup and import/export provide a starting point, but coverage of any new data must be verified (`src/engine/storage/`). Existing net pay is published; visa, Kita and mortgage manifests are draft. Existing features and legal accuracy must be evaluated before reuse or promotion.
- Related project work on rules, formulas and references is documented in [law reference and formula architecture](law-reference-and-formula-architecture.md). Reuse the existing content and design systems where appropriate.

## Recommended first release

**A useful personal timeline with a single calculator connection**, rather than a full assistant. Propose employment and income as the first vertical slice because it is relevant to multiple journeys and net pay already exists. Confirm the exact mapping against current net-pay inputs before implementation; if no safe mapping exists, choose another existing calculator after the inventory.

A user can add a person and optional birthdate, record a dated job start and gross-pay or hours change, see the timeline and the applicable recorded values for a selected date, then preview and explicitly apply supported values to a net-pay scenario. Show missing or conflicting information; preserve all unmapped scenario inputs. Backup and restore these new records in the storage modes supported by the app. This first release does not calculate residency eligibility, redesign the parental planner or provide personalized financial recommendations.

Acceptance: a new user can complete this journey without example defaults becoming their facts; an existing user retains their profile and scenarios; transfers are inspectable and never silently overwrite a calculator; restoring a backup reproduces the entered timeline. Show event sources and distinguish actual, planned, unknown and derived information.

## Delivery phases

### 0. Inventory and interaction design

- Trace Profile, parental planner and net-pay data ownership, existing scenario handoffs, storage modes, imports, exports and backup versions. Check which fields are actually accepted and where defaults or fallback parsing lose provenance.
- Review the parental planner's event inputs and identify interaction patterns worth keeping. Sketch a mobile-first timeline, event entry, dated view and transfer preview using the existing design system.
- Define the first slice's event types, date precision, status vocabulary, people and job identity, and what happens for missing dates or overlapping jobs. Agree on the initial bridge after mapping actual inputs.
- Exit: a reviewed mapping and interaction flow; explicit non-goals and acceptance examples; no changes to existing planner behavior.

### 1. Safe profile foundation and portability

- Add an additive, versioned representation for people, baseline facts and selected life events, with validated domain types and stable IDs. Distinguish actual and planned events, source, date precision and uncertainty; keep calculator-only decisions out of shared facts.
- Define editable event and correction semantics, references, deterministic ordering and conflict detection. Preserve raw old data where needed; surface ambiguous legacy values for confirmation instead of silently turning examples into facts. Do not invent birthdates or employment start dates.
- Extend storage and backup/import/export in the same phase as new persisted data. Support existing exports, all applicable persistence modes, validation, explicit conflicts and idempotent migrations/imports. Test corrupted, missing and future versions without losing the original data.
- Exit: old profiles and backups remain usable; new data can be saved, exported and restored; no existing scenario or planner output changes. Domain, migration and storage tests cover unknowns, dates, duplicates and recovery.

### 2. Timeline and dated projections

- Build person and event entry/editing, clear actual/planned labels, chronological browsing and an accessible empty state. Allow optional/partial dates without inventing precision.
- Compute a date-specific view using pure, testable projections. Show where a value came from and mark missing or conflicting inputs; do not arbitrarily sum overlapping employment or resolve conflicts silently.
- Verify keyboard use and mobile and desktop layouts; reuse project UI components and patterns.
- Exit: people can create, correct and reload the first events, understand what applies on a date, and see why a value is unavailable or ambiguous.

### 3. First calculator bridge

- Map only supported profile values into the selected net-pay scenario. Preview changed, missing and untouched fields; require an explicit apply action and preserve the original scenario until the user chooses the destination.
- Keep calculation ownership in the calculator; profile projections provide facts, not a second competing net-pay implementation. Define how planning year, pay cadence and household details map without inventing values.
- Test differing dates, planned versus actual events, partial records, repeated transfers, user edits and backup restore; compare representative results against the existing calculator.
- Exit: an end-to-end timeline-to-calculator journey works and does not modify parental or unrelated calculator scenarios. Revisit the first adapter if the inventory shows net pay cannot accept the intended facts safely.

### 4. Pregnancy and household planning

- Add only shared person, household, pregnancy and child information needed for a useful journey, with links between tentative and confirmed events. Study the planner's existing interactions before designing entry.
- Offer a previewed transfer to the parental planner, preserving its specific assumptions, action batches, simulation-month mapping and existing scenarios. Decide separately whether planner events can be promoted back to Profile; do not enable silent synchronization.
- Exit: representative existing planner scenarios and calculations are unchanged; users can understand and control any transfer, and predicted versus actual milestones stay distinct.

### 5. Broaden planning journeys incrementally

Prioritize each journey based on user value, available inputs, quality of existing tools and independently verified rules. Each gets a small end-to-end scope, a usable calculator or workflow, dated inputs, portability and validation before expansion:

- Residency and citizenship preparation: record residence and document history; explore a potential earliest application date, missing evidence and relevant pathways. Verify current jurisdiction-specific rules and dates; a projection is not a legal decision.
- Kita, Krippe and school: child's timeline, location, desired start, application milestones and costs; identify what is local or provider-dependent. Existing Kita calculator is draft and does not by itself establish availability or selection support.
- Travel: destination, dates, costs and relevant documents; entry and visa information must be checked against current authoritative sources for the actual circumstances.
- Tax class, job change, resignation and financial sustainability: scenario comparisons, estimated withholding, expected cash flows and savings runway with explicit benefit and timing assumptions.
- Purchases, car, solar and housing: dated ownership or installation events, affordability and ongoing costs; avoid counting the same purchase twice. Validate draft tools before treating them as dependable.

### 6. Shared planning capabilities and assistant

- Develop reusable focused calculators, documented formulas, laws/rules/topics references with effective dates, comparison models, and charts distinguishing recorded history from forecasts. Use the mortgage chart and net-pay comparison experiences as design references after verifying what can be reused.
- Add preparation checklists, relevant next steps and scenario exploration as the underlying inputs and models become reliable. Any suggestion must show assumptions, missing information, sources and limitations; users choose their priorities and make decisions.
- Consider optional linked updates or planner-to-profile promotion only after explicit ownership, conflict, deletion and undo behavior are designed and tested.
- Exit for each capability: outputs are reproducible from preserved inputs and rule/model versions where applicable; user-facing results distinguish facts, assumptions and estimates.

## Cross-cutting safeguards and verification

- **Data control:** respect current storage modes and offline behavior; do not add tracking or a server dependency. Keep sensitive location and immigration information optional. Clearly state what backups contain and whether they include sensitive data.
- **Compatibility:** retain existing profiles, scenarios and backup imports; test migrations and round trips before changing persistence. Provide recovery for invalid data and never silently replace unrelated scenario fields.
- **Temporal correctness:** test dates across years and month boundaries, uncertain precision, planned versus actual status, same-date conflicts, overlapping jobs and event corrections. Preserve planner-specific relative and absolute month rules.
- **Accuracy:** legal and financial features require current primary sources, effective dates, jurisdiction and independently checked examples. Mark missing inputs and unsupported routes; do not present estimates as official decisions.
- **Quality:** follow project domain typing and design rules; add meaningful domain, storage, adapter and regression tests. Run applicable project checks (`npm run fix`, targeted tests, typecheck and build; full `npm run check` for a release), and visually verify changed responsive UI. Keep commits small and atomic.

## Decisions before or during implementation

1. Confirm employment/net pay as the first journey after the input-mapping inventory; alternatively choose a different first calculator if it better fits the user's priorities.
2. Decide which planned events are shared versus scenario-only, and whether a planner event can later be promoted into Profile.
3. Choose how to represent and resolve conflicting partial dates and overlapping records in the UI.
4. Determine how to present existing example-like profile values for user confirmation without destroying prior choices.
5. Define the source maintenance and review process before shipping eligibility or legal-rule guidance.

No schedule or staffing estimates are implied; scope and sequencing can change after the first slice is reviewed.
