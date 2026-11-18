# Event-based Life Profile: exploration

Status: exploration, not an approved implementation plan. The user endorsed Life Profile as the home for shared life information and requested the event areas below.

## Direction

Make Life Profile a growing, understandable picture of a person's or household's life over time. People can add life events as they happen or as plans emerge; calculators can use relevant information at the right date and explain where it came from. Keep the Parental Leave Planner's existing event experience and calculations intact.

An event timeline should be the primary way to understand and extend the profile, not another collection of calculator-specific settings. Static facts remain useful where there is no meaningful date or the date is unknown.

## What exists today

- `src/engine/lifeProfile/types.ts` defines a version 1 profile of mostly current, flat fields, including income, household and home details. Its default values describe an example household, so they cannot safely be treated as confirmed personal history.
- The parental planner already has event-like actions for pregnancy, tax class switches, salary changes, working hours and financial events (`src/engine/types.ts`). These actions include simulation-relative dates and planner-specific decisions. They are a strong interaction reference, but are not automatically a general-purpose life-event schema.
- The planner explicitly copies selected profile fields into its own state (`src/components/elterngeld/ElterngeldDashboard.tsx`). That is a manual, one-way transfer, not event synchronization. Other calculators also have their own state and profile transfers.
- Profile persistence and shared backup already exist (`src/engine/lifeProfile/storage.ts`, `src/engine/storage/appStorage.ts`). Any evolution must preserve existing data, backups, storage modes and calculator isolation.

## Experience to explore

1. Start with the person and household; add only information the user knows. Show unknown values as unknown, not zero or example data.
2. Present a chronological timeline with a clear distinction between confirmed events and plans. Add an event through a small form appropriate to its type, with an optional date or date precision when the exact day is unknown.
3. Let a person add more events over time: a job or salary change, move, pregnancy or child birth, relationship or household change, leave, education, care, and other financial changes. Start with a small set that existing calculators can actually use; the rest are candidates, not promises of support.
4. Show what can be calculated from the timeline, the date it applies to, the information used, and what is missing. Offer relevant calculators with a preview of the inputs they would receive.
5. Let calculators retain their specialized input flows and private what-if scenarios. A transfer into an existing scenario should be explicit and previewable; never silently overwrite a user's planner work.

Example: someone records a job starting in March with a gross salary, then a planned reduction in working hours in October. Profile can show the applicable gross salary and planned hours for a selected month, provided the necessary details are known. If they later add a pregnancy, the parental planner can offer a preview to use the relevant household and income information. A predicted birth is tentative, and an actual birth should be linked to that prediction rather than silently creating an unrelated duplicate. Calculations such as net pay or benefits remain estimates made by the relevant calculator, with their own required inputs and rules; an event alone does not establish eligibility.

## Life information to accumulate

The user wants the profile to grow beyond parental planning. These are candidate inputs and useful derived views, not claims that the current app supports them:

- **Birthdates and family:** record each person's birthdate and family events; derive age on a chosen date and surface upcoming birthdays. A birthdate is a fact about a person and may also appear as a birth event in the timeline, without duplicating the underlying information.
- **Visa and residency:** record optional citizenship and relevant visa or residence-permit details, issue and expiry dates, residency periods and application milestones. Surface upcoming dates, elapsed recorded residence and missing information; offer a relevant check when supported. Any eligibility estimate must state the applicable rules, date, assumptions and missing evidence, and must not present a document date or elapsed duration alone as a legal conclusion.
- **Locations:** record moves and residence periods, with only the location detail needed for the user's purpose. Derive the location applicable on a date and offer it to relevant calculators; support uncertain dates and time spent in different places.
- **Employment:** record starting or leaving a job, employer changes, pay and hours changes, and leave. Derive applicable employment, income and hours for a selected period without assuming there can be only one job.
- **Cars:** record a vehicle purchase, sale or other ownership change with optional date, price and relevant details; show ownership periods and offer relevant inputs to a car calculator where supported.
- **Solar:** record an installation and subsequent changes with optional commissioning date, system details and costs; show the applicable system over time and offer relevant inputs to a solar calculator where supported.
- **Purchases generally:** allow meaningful purchases and their dates, costs and categories to be captured without requiring every purchase to become a specialized object. Link a purchase to a car, property or installation where applicable, rather than counting the same expense twice. Decide later which categories need richer forms and calculations.

These entries can be added gradually, including historical, current and planned information. Users choose what to record; sensitive immigration and location details should remain optional and follow the app's existing storage and backup choices. A derived view needs to distinguish what is recorded from what has actually been checked or calculated.

## Proposed model boundaries

- **People and baseline facts:** stable person identities, household relationships and facts that may have no known start date. Do not infer that example defaults are verified facts.
- **Life events:** stable IDs, event type, affected person(s), actual/planned status, date or date range with precision, relevant typed details, and provenance. Support corrections and changes over time; decide how to represent recurring or ongoing situations when real use cases require it.
- **Assumptions and decisions:** keep user-entered estimates, planned choices and calculator-specific settings distinguishable from confirmed events. Scenario-only events belong to their scenario unless the user chooses to share them.
- **Derived views:** calculate a dated snapshot from baseline facts and applicable events. Each derived value should retain its source, effective date, assumptions and missing information. Conflicting or overlapping events need an explicit resolution rather than an arbitrary winner.
- **Calculator adapters:** translate a dated profile snapshot and, where useful, selected events into each calculator's own input model. Preserve fields that the profile cannot represent. The planner's action batches, month mapping and simulation logic remain its own contract.

This need not be a full event-sourcing architecture. An editable structured timeline and deterministic projections may be sufficient. Define ordering for events with the same effective date, partial dates and conflicting corrections before relying on automatic projections.

## Sharing and automatic calculations

The recommended initial boundary is shared confirmed or explicitly shared life information, with calculator scenarios remaining local. Automatically recompute Profile's derived view when its source information changes, but require an explicit preview and apply step before changing an existing calculator scenario. A future opt-in link could offer updates, provided the user can see and resolve differences. Whether planner events can be promoted back into Profile, and how ongoing links behave, remain product decisions.

Calculation results should distinguish entered facts, assumptions and computed estimates; show the period and source; and indicate missing or ambiguous inputs. Version rules and calculation context where needed for reproducibility. Do not infer tax or benefit eligibility merely from an event, or imply support for calculators that have no adapter.

Avoid duplicate events and repeated imports with stable IDs and explicit links. A predicted event and its confirmed outcome need a relationship and correction path. Multiple employments, people and overlapping dates must not collapse into a single salary without an explicit rule.

## Incremental path

1. **Design with existing flows:** review the parental event interactions and inventory actual data needed by each calculator. Prototype the timeline and event entry with a few useful events, without changing the planner.
2. **Additive profile model:** introduce versioned people, facts and events beside existing fields. Preserve old profiles and backups; migrate idempotently and preserve uncertainty and provenance. Do not turn default examples into historical events. Continue reading old exports.
3. **Read-only projections:** derive date-specific values with traceable sources, missing-data handling and tests for dates, conflicts and corrections. Compare projections with existing calculator inputs without applying them.
4. **First explicit bridge:** choose one calculator and offer a clear preview of mapped changes, retaining unmapped inputs and existing scenarios. Verify calculations and round trips against existing behavior. No automatic back-sync or silent rebase.
5. **Expand deliberately:** add supported event types and adapters based on demonstrated value, then evaluate opt-in linking, planner-to-profile promotion and scenario comparison. Keep unsupported event types clearly separate from calculations.

At every phase, existing planner inputs, events, scenarios, storage and calculations must continue to work. Migration and import need coverage for older data, absent dates, duplicates, conflicting events and backup restoration.

## Decisions to make together

- The user endorsed Life Profile as the home for shared life information. Which planned events should be shared, and how should calculator-specific what-if scenarios remain separate?
- Should users primarily create events in Profile, or also promote existing planner events into it? What should happen when either copy is edited later?
- Which first end-to-end journey is most valuable: employment and income, pregnancy and birth, visa and residency, a purchase, or a different life change?
- What should the timeline show when a date or amount is uncertain, and how should conflicting information be resolved?
- How should existing flat profile values be presented for confirmation, given that some may be example defaults?
