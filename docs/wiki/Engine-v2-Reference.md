<!--
SPDX-License-Identifier: MPL-2.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Engine v2 Reference

Module-by-module reference for the Squad Audit matching engine v2 at `packages/shared/src/matching/`. Engine version: **`2.0.0`**. All modules are **pure functions — no UI, no I/O**; the only consumer-facing entry point is the barrel `index.js`, which re-exports everything. Spec: [`docs/design/squad-audit-v1.adoc`](../blob/main/docs/design/squad-audit-v1.adoc) (the design doc wins). 35 tests across 5 test files pass as of 2026-06-11.

**Status caveat:** the engine is a tested library. The apps (`apps/api`, `apps/web`, `apps/mobile`) are **not wired to it** — they still run the legacy v0 flow.

## v2 corrections over v1 (why this engine exists)

1. **Feasibility and harmony are separate scores**, never blended (v1 put 40% logistics inside "harmony").
2. **Directional scoring**: *my behaviour* vs *your tolerance* are different variables; the weakest direction governs.
3. **Budget pairs use the overlap coefficient** (containment scores 1.0, fixing the Jaccard penalty on generous budgets).
4. **Missing answers score neutral (0.5) with a warning**, never favourably.
5. **Structured dealbreakers** (`{token, label, holder, trigger}`) so the conceal layer can rebuild unattributed views without string surgery.
6. **Banded verdicts** — raw integers imply false precision until calibrated.

## `constants.js` — scales, weights, rules, registry

Exports (data, no functions): `ENGINE_VERSION`, `PERSONAS`, the behaviour scales (`SMOKING`, `DRINKING`, `GUEST_FREQUENCY`, `PARTNER_STAYS`, `NOISE_GENERATED`, `BEDTIME`, `SOCIAL_PREFERENCES`, `CONFLICT_STYLES`, `BILL_SPLIT`), the tolerance scales (`SMOKING_TOLERANCE`, `DRINKING_TOLERANCE`, `GUEST_TOLERANCE`, `NOISE_TOLERANCE`, `PET_TOLERANCE`), `CLEANLINESS_SCALE` + `CLEANLINESS_ANCHORS` (behaviour-anchored 1–5, not abstract self-ratings), `FEASIBILITY_WEIGHTS`, `HARMONY_WEIGHTS`, `VERDICT_BANDS`, `STRONG_FACTOR` (0.7), `WEAK_FACTOR` (0.45), `NEUTRAL_FACTOR` (0.5), `MOVE_IN_WINDOW_DAYS` (60), `GOOD_GROUP_MEAN` (70), `POOR_MEMBER` (45), `DEALBREAKER_RULES`, `DEALBREAKER_TOKENS`, `NARRATION`, `TIER`, `FIELD_GOVERNANCE`.

Tolerance scales are **index-aligned** with their behaviour scale, so `behaviourIdx > toleranceIdx` means a violation.

### Factor weights

Each table must sum to 1 — **asserted in tests**, not assumed. Harmony weights are literature-seeded (cleanliness is the #1 conflict predictor and curvilinear; substance mismatch is the only causally identified factor) and remain config pending the calibration flywheel.

| Feasibility factor | weight | | Harmony factor | weight |
|---|---|---|---|---|
| `budget` | 0.60 | | `cleanliness` | 0.30 |
| `moveIn` | 0.25 | | `noise` | 0.20 |
| `lease` | 0.15 | | `guests` | 0.15 |
| | | | `bedtime` | 0.10 |
| | | | `smoking` | 0.10 |
| | | | `drinking` | 0.10 |
| | | | `social` | 0.05 |

### Verdict bands

`VERDICT_BANDS = { strong: 75, workable: 55 }`:

| Verdict | Condition |
|---|---|
| `strong` | harmony ≥ 75 |
| `workable` | 55 ≤ harmony < 75 |
| `risky` | harmony < 55 |
| `not_viable` | any dealbreaker hit, regardless of score |

For pairs the band applies to pair harmony; for groups, `auditGroup` bands on **min** pair harmony.

### Dealbreaker token vocabulary

Rules are **data** (one evaluator, `ruleTriggered`, lives in `compatibility.js`). Each rule tests the *other party's behaviour* (or an explicit demand), **never their tolerance** — tolerating smoke is not smoking (the v1 category error). `DEALBREAKER_TOKENS = Object.keys(DEALBREAKER_RULES)`:

| Token | Label | Tests | Predicate |
|---|---|---|---|
| `any_smoking` | a smoker | `smoking` | anyOf `outdoor_only`, `indoors` |
| `smoking_indoors` | indoor smoking | `smoking` | anyOf `indoors` |
| `frequent_guests` | near-daily overnight guests | `guestFrequency` | anyOf `most_days` |
| `live_in_partner` | a live-in partner | `partnerStays` | anyOf `frequent` |
| `night_owl` | a night-owl schedule | `bedtime` | anyOf `after_1` |
| `early_riser` | an early-riser schedule | `bedtime` | anyOf `before_23` |
| `messy` | a very low cleanliness standard | `cleanliness` | atMost 2 |
| `spotless_required` | a demand for constant spotlessness | `cleanlinessTolerance` | atLeast 5 |
| `heavy_drinking` | frequent heavy drinking | `drinking` | anyOf `frequent` |
| `pets` | pets in the home | `hasPets` | equals `true` |

`spotless_required` is the curvilinear tail: a maximal cleanliness *demand* is itself something housemates live with (it is the one rule keyed on a tolerance field, because there the demand *is* the behaviour). Both tails of cleanliness are covered (`messy` and `spotless_required`). How to add a token: see [[Development]].

`NARRATION` maps each factor key to relational `strong`/`weak` phrasings ("budgets overlap comfortably" / "guest norms clash") — relational by construction, so they are safe at conceal tier T1. `TIER` and `FIELD_GOVERNANCE` are covered in [[Conceal-Lattice]] and [[Data-Governance]].

### Missing-data policy

Unanswered optional fields are stored as `null`, never defaulted. Scoring treats `null` as `NEUTRAL_FACTOR` (0.5) **with a warning** — *absence of evidence never scores better than adverse evidence*. A dealbreaker that cannot be checked (the other party hasn't answered the field) produces an explicit warning, not a silent pass. Corrupt enum values (profiles that bypassed `createStudentProfile`) **throw** rather than silently scoring as index 0.

## `profile.js` — student profile v2

| Export | Purpose |
|---|---|
| `isUniversityEmail(value)` | True iff the address is academic: `*.edu`, `*.edu.<cc>`, or `*.ac.<cc>`. |
| `validateStudentProfile(input)` | Returns an array of human-readable validation errors (empty = valid). |
| `createStudentProfile(input)` | Validate + normalize raw input into a canonical v2 profile (`schemaVersion: 2`); idempotent; throws with all collected messages on invalid input. |

Required: `name`, `universityEmail`, `budgetMin`/`budgetMax`, `cleanliness` (1–5, anchored). Everything else is optional and nullable. There is deliberately **no `accessibilityNeeds` field** and no guarantor field — see [[Data-Governance]].

## `compatibility.js` — the pair engine

| Export | Purpose |
|---|---|
| `budgetOverlapScore(a, b)` | Budget pair score by overlap coefficient (Szymkiewicz–Simpson): `overlap / min(spanA, spanB)`; containment scores 1.0; disjoint scores 0. |
| `dealbreakersHit(holder, other)` | Structured evaluation of `holder`'s dealbreaker tokens against `other`'s behaviour: `{ hits: [{token,label,holder,trigger}], unverifiable: [...] }`. |
| `scoreCompatibility(a, b)` | The main engine. Returns `{ engineVersion, harmony, feasibility, verdict, reasons[], warnings[], dealbreakers[], dealbreakerHit, factors: {feasibility, harmony}, unanswered[] }`. |

Internals worth knowing: directional dimensions score `min(fit(A.behaviour → B.tolerance), fit(B.behaviour → A.tolerance))` — **the weakest direction governs** (one suffering party is enough to make a bad household). Drinking is an interaction, not a distance: heavy × intolerant is penalised sharply; heavy × heavy is not penalised at all. A frequent partner folds into guest pressure (a partner most nights is an extra near-resident). Behavioural moderators (very different personal cleanliness; partner staying most nights; both parties conflict-avoidant *and* a weak factor present → the 48-hour-rule warning) add warnings but never change scores.

## `group.js` — groups + the Squad Audit core

| Export | Purpose |
|---|---|
| `budgetIntersection(members)` | `[max(mins), min(maxes)]` as `{min, max}`, or `null` when empty — the range *every* member can pay; never a mean. |
| `moveInWindow(members)` | `{ earliest, latest, spreadDays }` over members with known dates, or `null`. |
| `validateGroup(input)` | Human-readable group validation errors (name, ≥1 member, `targetHouseholdSize` ≥ 2 and ≥ member count). |
| `createGroup(input)` | Build a group; members normalized via `createStudentProfile`; aggregate carries only genuinely poolable fields (budget intersection, move-in window, lease consensus) — ordinal preferences are **not** aggregated into a fictional persona. |
| `auditGroup(group)` | **The v1 product core**: full pairwise matrix, internal dealbreaker detection, min/mean pair harmony reported separately, weakest pair named, dispersion (splits, not averages) over six ordinal dimensions, shared-space forecast at the *minimum* member cleanliness with friction nodes named (standard ≥2 above the floor), banded group verdict. |

Output shape and a worked example: [[Squad-Audit-Walkthrough]].

## `discovery.js` — deferred solo/top-up discovery

This is the *deferred* roadmap flow (built, tested, not the v1 product moment).

| Export | Purpose |
|---|---|
| `isGroup(candidate)` | Structural group detection (`members` array + `aggregate` present) — a persona string is not proof of groupness. |
| `scoreSoloToGroup(solo, group)` | Scores the seeker against **every member individually** (never a fictional aggregate); headline harmony = `0.5*mean + 0.5*min` so one bad fit can't hide; warns when the group looks good on average (≥ `GOOD_GROUP_MEAN`) but one member is a poor fit (< `POOR_MEMBER`); returns merged factor tables so conceal can rebuild T1 views. |
| `discoverMatches(seeker, candidates, {limit, includeNotViable, tier})` | Rank a mixed solo/group candidate list by harmony; dealbreaker-hit candidates drop unless `includeNotViable`; optional conceal-tier redaction at the boundary via `tier`. |

## `conceal.js` — disclosure tiers

| Export | Purpose |
|---|---|
| `effectiveTier(tierA, tierB)` | The lattice meet: `min(tierA, tierB)` — reciprocity. |
| `redactResult(result, tier)` | Project a `scoreCompatibility`/`scoreSoloToGroup` result to a tier view (FULL unchanged / RELATIONAL rebuilt from structured factors / BAND verdict-only). |

Full semantics, the formally verified core, and the self-inference caveat: [[Conceal-Lattice]].

## `agreement.js` — house agreement draft

| Export | Purpose |
|---|---|
| `buildHouseAgreement(group, audit)` | Structured draft `{ groupName, engineVersion, sections: [{id, title, body, fromDivergence}] }` generated from the group's actual divergence points, plus four universal sections (access & needs, guarantors & tenancy setup, 48-hour raise-it conflict process, exit/replacement). |
| `renderAgreementMarkdown(agreement)` | Render the draft as markdown ("a conversation script, not a contract"), marking divergence-derived sections. |

## `brief.js` — search brief

| Export | Purpose |
|---|---|
| `buildSearchBrief(group)` | The joint constraint envelope a vetted group takes to the listings market: `{ groupName, engineVersion, householdSize, openSlots, budget: {perPersonIntersection, knownMembersTotal}, moveInWindow, leaseLengthMonths, universities, hmoNote, checklist }`. |
| `renderBriefMarkdown(brief)` | Render as a markdown handout with a tick-box checklist. |

The `hmoNote` encodes the legal supply constraint: 3+ unrelated sharers form an HMO; mandatory licensing at 5+ occupants nationally; many London boroughs run additional licensing down to 3–4.

## `seed.js` — deterministic fixtures

| Export | Purpose |
|---|---|
| `seekerInput` | Raw input for the solo seeker (Remy Hale, SOAS). |
| `seedProfiles()` | All five raw personas (Ava, Ben, Cira, Dom, Tomas) as normalized profiles. |
| `seedSeeker()` | The seeker as a normalized profile. |
| `seedBrokenGroup()` | **"Bloomsbury Three"** — deliberately broken (internal dealbreaker kills, retained as the canonical demo of what `auditGroup` catches). |
| `seedFeasibleGroup()` | **"Whitechapel Three"** — compatible members, non-empty budget intersection. |
| `seedScenario()` | Bundle: seeker + solo candidates + one good and one broken group. |

## `index.js` — barrel

Re-exports everything above: `constants.js`, `profile.js`, `compatibility.js`, `group.js`, `discovery.js`, `conceal.js`, `agreement.js`, `brief.js`, `seed.js`.

## Test files

`compatibility.test.js` (14 tests), `group.test.js` (7), `discovery.test.js` (5), `conceal.test.js` (4), `artifacts.test.js` (5) — 35 total, all passing. Highlights: weight tables assert sum=1; the v1 regression "a tolerant non-smoker is not killed by `any_smoking`" is pinned; the shipped broken fixture must be caught; T1 views are asserted to leak no names, no attribution, no habit values.
