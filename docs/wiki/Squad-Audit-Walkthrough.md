<!--
SPDX-License-Identifier: MPL-2.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Squad Audit Walkthrough

A narrative pass through the v1 product core using the **real, deterministic seed fixtures** in `packages/shared/src/matching/seed.js` (no randomness, no clock). Every number on this page is the actual output of `auditGroup` on those fixtures as of engine `2.0.0`.

Two groups ship as seeds:

- **Bloomsbury Three** (Ava Chen, Ben Okoye, Cira Patel) — *deliberately broken*. It shipped in v1 with internal dealbreaker kills that **no code detected**; the bug became the product, and the fixture is retained as the canonical demo of what `auditGroup` catches.
- **Whitechapel Three** (Ava Chen, Ben Okoye, Tomas Lindqvist) — the feasible counterpart.

```js
import { seedBrokenGroup, seedFeasibleGroup, auditGroup } from "./packages/shared/src/matching/index.js";

const broken = auditGroup(seedBrokenGroup());   // Bloomsbury Three
const good   = auditGroup(seedFeasibleGroup()); // Whitechapel Three
```

## Act 1 — Bloomsbury Three: `not_viable`

On paper this group looks plausible: budgets intersect at **£800–£950 pcm** (`feasible: true`) and move-in dates span only 14 days. The pairwise matrix says otherwise. Ava lists the dealbreaker token `any_smoking`; Ben lists `any_smoking` and `frequent_guests`; Cira's profile has `smoking: "outdoor_only"` and `guestFrequency: "most_days"`. Three structured dealbreaker hits result:

```json
"internalDealbreakers": [
  { "token": "any_smoking",     "label": "a smoker",                     "holder": "Ava Chen",  "trigger": "Cira Patel" },
  { "token": "any_smoking",     "label": "a smoker",                     "holder": "Ben Okoye", "trigger": "Cira Patel" },
  { "token": "frequent_guests", "label": "near-daily overnight guests",  "holder": "Ben Okoye", "trigger": "Cira Patel" }
]
```

So the verdict is `not_viable` — and the report explains *why*, in attributed warnings (this is the T2 view; see [[Conceal-Lattice]] for what lower tiers would show):

- `Internal dealbreaker: Ava Chen will not live with a smoker (Cira Patel).`
- `Internal dealbreaker: Ben Okoye will not live with a smoker (Cira Patel).`
- `Internal dealbreaker: Ben Okoye will not live with near-daily overnight guests (Cira Patel).`
- `Weakest link: Ben Okoye × Cira Patel (harmony 45) — this pair decides whether the household works.`

The pairwise matrix (real output):

| Pair | harmony | feasibility | verdict |
|---|---|---|---|
| Ava Chen × Ben Okoye | 83 | 88 | `strong` |
| Ava Chen × Cira Patel | 68 | 73 | `not_viable` |
| Ben Okoye × Cira Patel | 45 | 88 | `not_viable` |

Note the Ava×Cira row: harmony 68 would band as `workable` — a mean-based v1-style score would have waved this group through. Dealbreakers override bands, and `auditGroup` reports `minPairHarmony: 45` and `meanPairHarmony: 65` *separately* (no magic blend constants).

The audit also flags **dispersion** — splits, not averages. Bloomsbury is split on `bedtime` (1× `23_to_1`, 1× `before_23`, 1× `after_1`), `socialPreference`, `guestFrequency`, `noiseGenerated`, and `drinking`. Each becomes a warning of the form: `group is split on bedtime (…) — no "average" housemate exists here`.

## Act 2 — Whitechapel Three: `strong`

Swap Cira for Tomas Lindqvist (Queen Mary, `smoking: "no"`, `guestFrequency: "monthly"`) and the same engine reports:

| Pair | harmony | feasibility | verdict |
|---|---|---|---|
| Ava Chen × Ben Okoye | 83 | 88 | `strong` |
| Ava Chen × Tomas Lindqvist | 100 | 95 | `strong` |
| Ben Okoye × Tomas Lindqvist | 93 | 95 | `strong` |

- `internalDealbreakers: []`, `verdict: "strong"` (the group verdict bands on **min** pair harmony, here 83 ≥ 75)
- budget by **intersection**: `{ min: 750, max: 950 }` — `[max(mins), min(maxes)]`, the range *every* member can actually pay, never a mean (means manufacture windows no member can afford)
- `moveInWindow: { earliest: "2026-09-01", latest: "2026-09-08", spreadDays: 7 }`
- `sharedSpaceForecast: { level: 4, highStandardMembers: [] }` — shared spaces are forecast at the **minimum** member cleanliness (norms converge to the laxest member); anyone whose standard exceeds the floor by ≥2 would be named here as a predicted friction node.

## The audit output shape

`auditGroup(group)` returns (real field names):

```
{ groupName, feasible, budget, moveInWindow, pairs,
  internalDealbreakers, minPairHarmony, meanPairHarmony,
  weakestPair, dispersion, sharedSpaceForecast,
  verdict, reasons, warnings }
```

where each `pairs[i]` is `{ a, b, result }` with `result` a full `scoreCompatibility` record (see [[Engine-v2-Reference]] for that shape).

## Act 3 — the house agreement draft

`buildHouseAgreement(group, audit)` generates a structured draft **from the group's actual divergence points** — the one intervention with practitioner consensus. Each section is `{ id, title, body, fromDivergence }`. For Whitechapel Three the real sections are:

| id | title | fromDivergence |
|---|---|---|
| `cleaning` | Cleaning standard & rota | no (all three are 4/5 — a light rota is still recommended) |
| `quiet-hours` | Quiet hours | **yes** (`23_to_1` vs `before_23`) |
| `guests` | Guests & partners | **yes** (`guestFrequency` spread: `monthly` vs `rarely`) |
| `hosting` | Drinking & hosting | **yes** (`social` vs `none`) |
| `money` | Bills & shared costs | **yes** (`split_bills_only` vs `split_everything`) |
| `access-needs` | Access & needs | universal — every group, unconditionally |
| `guarantors` | Guarantors & tenancy setup | universal |
| `conflict` | Raising problems | universal (48-hour raise-it rule) |
| `exit` | Exit & replacement | universal (joint-and-several liability makes the weakest link financially literal) |

Bloomsbury Three additionally gets a `smoking` section (Cira smokes `outdoor_only`). The universal sections exist **regardless of answers** — `access-needs` and `guarantors` are the universal-prompt pattern with zero stored signal (see [[Data-Governance]]). `renderAgreementMarkdown(agreement)` renders the draft, marking divergence-derived sections; the preamble is explicit that this is *"a conversation script, not a contract"*.

## Act 4 — the search brief

`buildSearchBrief(group)` is the handoff to the listings market (flat-mate hosts none). Real output for Whitechapel Three:

```json
{
  "groupName": "Whitechapel Three",
  "engineVersion": "2.0.0",
  "householdSize": 4,
  "openSlots": 1,
  "budget": {
    "perPersonIntersection": { "min": 750, "max": 950 },
    "knownMembersTotal": { "min": 2170, "max": 2930 }
  },
  "moveInWindow": { "earliest": "2026-09-01", "latest": "2026-09-08", "spreadDays": 7 },
  "leaseLengthMonths": 12,
  "universities": ["UCL", "KCL", "Queen Mary"],
  "hmoNote": "4 unrelated sharers form an HMO; many London boroughs require additional licensing at this size — check the borough's scheme before committing.",
  "checklist": [ ... ]
}
```

`knownMembersTotal` sums current members only — open slots are priced when filled. The `hmoNote` scales with household size (mandatory licensing everywhere in England at 5+; many London boroughs run additional licensing at 3–4). The five-item `checklist` covers the per-member guarantor confirmation (stored nowhere — see [[Data-Governance]]), bills-included rent normalisation, joint-and-several liability, a per-campus commute check, and never-pay-before-viewing scam safety. `renderBriefMarkdown(brief)` renders it as a markdown handout.

## Try it yourself

```bash
cd flat-mate
deno test --allow-read packages/shared/src/matching/   # 35 tests, including these fixtures
```

The fixtures also include a solo seeker (`seedSeeker()` — Remy Hale, SOAS) and `seedScenario()` bundling seeker + solo candidates + both groups, used by the deferred discovery flow (see [[Engine-v2-Reference]]). **Note:** none of this is reachable from the apps yet — `apps/api`, `apps/web` and `apps/mobile` are still the legacy v0 flow and are not wired to engine v2.
