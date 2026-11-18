# Event-based Life Profile project plan

Status: proposed roadmap, updated 18 November 2026. This plans incremental work toward a personal planning assistant; it does not imply that the features below already exist or approve a particular legal interpretation. Product vision and requested journeys: [event-based Life Profile exploration](event-based-life-profile.md).

## Implementation progress — 18 November 2026

- Step 1: compatibility inventory and proposed storage contracts documented in [life-profile-compatibility.md](life-profile-compatibility.md); baseline targeted tests passed.
- Step 2: Profile now notes that existing values may be examples. Individual legacy fields still cannot be reliably classified as user-confirmed; explicit confirmation remains future work.
- Steps 3–4: initial people UI supports optional birthdates and age on a selected date, backed by a separate validated record included in backup and storage modes. Unsupported records are protected from ordinary overwrites. People are linked to timeline events; calculator inputs change only through an explicit handoff. Further work remains for comprehensive restore-failure, cross-tab and UI interaction coverage before treating the complete compatibility contract as finished.
- Step 5: the first timeline supports named, dated actual or planned notes for a person, with editing and backup. Registered modules validate their own payloads; calculator inputs and parental planner scenarios remain separate. A linked person cannot be removed while events refer to them.
- Step 6: timeline entries can be edited and may use exact, month-only, year-only or unknown dates. Version 2 records preserve that precision; existing version 1 records remain readable.
- Steps 7–8: structured job-start and linked job-change events can record an employer, pay rates and weekly hours. A dated employment view shows sourced facts, optionally includes planned events, and marks ambiguous timing or conflicts. Job endings are not yet supported; job events do not automatically alter calculator inputs.
- Step 9 (initial slice): Net Pay can preview a known monthly job rate into a new named comparison without changing live inputs. The preview exposes the working-month and salary-payment assumptions; yearly rates are not transferred automatically. Session or device storage is needed for Profile data to survive navigation between pages. Full interactive end-to-end handoff verification and additional restore-failure and cross-tab coverage remain.
- Step 10 (initial slice): a generic monthly replay starts from an explicit opening month; a six-month month-end view shows recorded employment facts. A minimal residence/move module is registered and covered by mixed-domain and backup tests, but has no entry form yet. The runner does not yet calculate cash flows or expose accumulators.
- Next: deepen monthly scenarios and event entry, then add accumulators with explicit opening values and domain-owned formulas.

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

A user can add a person and optional birthdate, record a dated job start and gross-pay or hours change, see the timeline and the applicable recorded values for a selected date, then preview an explicit gross amount and pay basis and apply them to a named net-pay draft or new comparison. Show missing or conflicting information; preserve all unmapped scenario inputs. Backup and restore these new records in the storage modes supported by the app. This first release does not calculate residency eligibility, redesign the parental planner or provide personalized financial recommendations.

Acceptance: a new user can complete this journey without example defaults becoming their facts; an existing user retains their profile and scenarios; transfers are inspectable and never silently overwrite a calculator; restoring a backup reproduces the entered timeline. Show event sources and distinguish actual, planned, unknown and derived information.

## Architecture direction: a generic life-simulation harness

The user wants a reusable engine that can accommodate future event and entity types without placing their domain rules or mathematical formulas in the harness. The existing parental planner's month-by-month future, event milestones and cumulative values are the experience to learn from; keep its existing implementation and semantics intact. First inspect and selectively reuse existing ledger, timeline and rule infrastructure where its contracts fit; generalization does not require rewriting the parental planner.

- **Harness:** orchestrate validated entities, events, simulation periods, scenario inputs, ordering and registered domain modules. It knows how to advance time, invoke contributions, track dependencies and produce explainable results; it does not know visa, salary, pregnancy or car formulas. Unknown event/entity records must be preserved or rejected explicitly without data loss, never silently interpreted or discarded.
- **Domain modules:** supply typed schemas and validation, event handling and state projections, calculation dependencies, outputs and presentation metadata where appropriate. Register modules through explicit, type-safe contracts. A future event can be stored only under a defined versioned representation; making it meaningful still requires a tested handler or adapter. Prove extensibility with a second distinct module without editing the core harness, rather than assuming arbitrary unknown events automatically work.
- **Facts, rules and formulas:** keep observed/user-entered facts distinct from assumptions, domain rules and derived results. Implement mathematics as independently unit-tested pure functions with explicit units and inputs; compose them through domain evaluators. Feed in versioned, jurisdiction- and effective-date-aware rule values and links to laws and topics where applicable. Reuse existing formula/parameter/law architecture when appropriate, checking actual coverage; never hide statutory constants, legal decisions or financial math in orchestration.
- **Time and accumulators:** support absolute calendar-month identities and configurable simulation ranges, with history, actual events, planned events and forecast periods visibly distinct. A monthly snapshot can contain applicable facts, event milestones, domain outputs, flows and separately defined running accumulators. Each accumulator specifies its unit, initial value, scope, contribution and reset/carry rules; show unknown when inputs are missing. Example: opening savings + modeled monthly inflows − modeled monthly outflows = closing savings, only when those values and assumptions are supplied by the appropriate modules.
- **Traceability and isolation:** store result provenance (input events/facts, assumptions, module and formula versions, parameters, source references and effective period), indicate missing data and conflicts, and make a run reproducible. Scenario overlays do not mutate shared facts or other scenarios. Explicitly define same-month ordering, mid-month behavior, rounding and event corrections per domain before publishing results.
- **Compatibility and scope:** use existing typed constructors, storage modes and export boundaries. Do not couple every record to one predefined domain, invent a universal financial transaction model prematurely, or let an extension execute untrusted code. Support extension as a developer-facing module contract first; user-authored plugins or runtime scripting are not part of this plan.

## Small, usable delivery steps

Each numbered step is independently reviewable and leaves the application usable; release after a step when its acceptance condition is met. Earlier infrastructure may be internally delivered behind existing UI while providing visible value through the first small Profile slice. Every new persisted piece ships with appropriate backup/import, migration and tests, rather than postponing portability to the end. These steps refine the phase overview below; no calendar estimates are assumed.

1. **Inventory and protect current use:** map Profile, storage, backup, net-pay and parental flows; capture representative regression examples. Before persisting a person or event, decide the versioned read/write and restore contract: the v1 parser reconstructs records as v1 and the backup importer accepts shared payloads without Profile-schema validation. Preserve ambiguous legacy values for confirmation, protect unsupported future records from overwrite, and test old backups plus failed-restore rollback and data recovery. Deliverable: a verified compatibility map and concrete migration decisions with no behavior change.
2. **Clearer starting Profile:** improve empty/unknown and example-data presentation without converting defaults into personal facts. Usable result: people can see what they have actually provided.
3. **People and birthdates:** add a minimal person with optional birthdate, editing and age-as-of-date calculation in a separately tested function. Usable result: a saved household entry and a correct, explainable age.
4. **Portable people:** extend existing backup and restore for the new representation as part of step 3's release; deliver the compatibility and round-trip checks as a separately reviewable change, not a period where user data cannot be backed up.
5. **Timeline shell and first event:** add one typed, dated life event with planned/actual status, editing and a chronological list. Usable result: record and review one meaningful change without a calculator.
6. **Event corrections and incomplete dates:** support explicit unknown or partial dates, corrections and clear ambiguity. Usable result: people can record imperfect history without false precision.
7. **Employment events:** add a job and pay change as the first separately registered domain module. Usable result: a person's employment history and planned changes appear on the timeline.
8. **Date-specific facts:** derive the job and recorded gross pay applicable to a selected date, with provenance and conflict handling. Usable result: a simple dated Profile view.
9. **First calculator handoff:** preview a known gross amount and explicit pay basis into a named Net Pay draft or new comparison; apply only the shown patch and preserve live inputs, unrelated household/tax fields and other scenarios. The current Sync Life Profile button changes live inputs and must not serve as this contract. Verify working-month and salary-payment semantics, including a midyear raise and a 13-pay schedule; do not present a dated rate as annual earnings. Hours-only events remain useful on the timeline without inventing gross pay. Usable result: answer a take-home-pay question from supported timeline data.
10. **General monthly runner:** introduce a pure monthly runner and results contract with employment plus a minimal distinct residence/move module, registered and restored through the same contracts; the full residence UI can follow later. Establish opening state by replaying earlier events and modeled flows from an explicit origin or a valid checkpoint; unknown opening inputs stay unknown. For the same facts and scenario, an April-only view must match April in a January–April run, including balances; corrections or scenario revisions invalidate affected checkpoints and replay from the earliest affected point. Test a job change and move in the same month, two scenarios, and a backup/restore round trip without harness domain switches. Usable result: browse applicable recorded facts month by month.
11. **Monthly events and forecasts:** project confirmed and planned employment changes over a chosen range, distinguishing history, plans and unknown future values. Usable result: inspect how recorded facts change in future months.
12. **Generic accumulators:** add typed, named accumulator contracts and deterministic carry/reset semantics using a test module, with provenance and missing-input handling. Usable result: show a transparent running total for a supported, well-defined measure; do not infer net income or savings from gross salary.
13. **First financial projection:** independently implement and test a small cash-flow module with explicit opening balance, income and expense assumptions, then plug it into the runner. Usable result: monthly cash flow and savings runway with an explainable running balance and scenarios kept local.
14. **History and forecast visualization:** present the monthly results in a table and a chart, marking actuals, plans and estimates; compare at least two alternatives only when both have reproducible inputs. Usable result: see and compare a financial trajectory.
15. **Rule and formula linkage:** connect an applicable domain calculation to the project's formula, parameter, law and topic facilities; show rule period, source and assumptions. Before the first harness-owned statutory output, test a midyear rule change, unsupported date and jurisdiction: the existing year-based resolver can select another year and does not by itself establish intra-year or jurisdictional applicability. Unsupported rules must be marked unknown or explicitly projected with their source, never silently presented as current. Preserve resolved rule values, applicable interval, jurisdiction, formula version and source in the explanation. Any earlier statutory output must meet these requirements at its initial release, not wait for this step. Usable result: inspect why a supported result was calculated.
16. **Residence experience:** build on the minimal residence/move module proven in step 10 with editing, incomplete dates and a useful monthly history. Usable result: people can record and review residence periods; do not infer legal eligibility from time alone.
17. **Family and parental handoff:** add shared family and pregnancy milestones with explicit previewed transfer to the existing parental planner. Usable result: reuse selected information while preserving its scenarios and simulation behavior.
18. **Residency preparation:** build one verified pathway with independently tested rules and effective dates, missing-evidence handling and a qualified potential earliest date. Usable result: inspect a preparation timeline for that supported pathway, not a claim of official eligibility.
19. **More journeys one at a time:** add citizenship, childcare/school, travel, tax switches, purchases, car and solar as separate vertical slices, each with its own domain module, facts, tests, traceability and backup support. Usable result: one complete planning question at a time.
20. **Planning assistance:** add checklists, relevant next steps and wider scenario comparisons only on top of supported and explainable models. Usable result: an actionable plan that people can revise and control.

## Extension contract and release checks

For each new entity or event: define versioned schema and validated branded identities; declare references and time precision; provide typed module registration and migration; implement pure state transitions and formulas outside the harness; declare rule sources and versions; add UI and import/export mapping; test corrections, missing data, scenario isolation and backward/forward compatibility. Extending a domain should not require modifying generic monthly orchestration; where a core capability is genuinely missing, add it as a generic contract with tests rather than adding a domain switch.

Monthly release checks cover April-only versus January–April opening-state and accumulator equivalence, checkpoint invalidation after corrections and scenario revisions, deterministic replay, same-month ordering, inclusive/exclusive boundaries, year transitions, actual/planned separation, accumulator opening and closing reconciliation, resets, precision/rounding, unknowns, multiple entities, scenario isolation, historical corrections and serialization round trips. Formula tests are independent of the harness and include worked examples and edge cases; integration tests verify selected rule values and provenance for the right jurisdiction and date. Compare regression results against the existing parental planner without replacing its implementation.

## Phase overview

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

- Map an explicitly known gross amount and pay basis into a named net-pay draft or new comparison. Preview changed, missing and untouched fields; apply only the shown patch and preserve live inputs, unrelated household/tax fields and other scenarios. Do not reuse the existing live Sync Life Profile behavior as the transfer contract.
- Keep calculation ownership in the calculator; profile projections provide facts, not a second competing net-pay implementation. Define how planning year, pay cadence and household details map without inventing values.
- Confirm how working months and salary payment counts affect conversion; test a midyear raise and a 13-pay schedule so a dated rate is not mistaken for annual earnings. Hours-only events remain useful without inventing gross pay. Test differing dates, planned versus actual events, partial records, repeated transfers, user edits and backup restore; compare representative results against the existing calculator.
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
- **Compatibility:** decide the versioned Profile and restore contract before the first persisted person or event; validate shared Profile payloads and preserve unsupported future records against overwrite. Retain existing profiles, scenarios and backup imports; test old backups, failed-restore rollback, migrations and round trips before changing persistence. Provide recovery for invalid data and never silently replace unrelated scenario fields.
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
