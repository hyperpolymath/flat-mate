<!--
SPDX-License-Identifier: CC-BY-SA-4.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Development

How to work on flat-mate. Honest state first: **the tested, working v1 code is the engine library; the apps are legacy v0, have no tests, and are not wired to engine v2.**

## Repo layout

```
flat-mate/
├── docs/design/squad-audit-v1.adoc   # THE product spec — where code and spec disagree, the spec wins
├── packages/shared/
│   └── src/
│       ├── matching/                 # ★ Engine v2 (Squad Audit) — 10 modules + 5 test files, 35 tests
│       │   ├── index.js              #   barrel — the only import surface consumers should use
│       │   ├── constants.js          #   scales, weights, verdict bands, dealbreaker rules, FIELD_GOVERNANCE
│       │   ├── profile.js            #   student profile v2 (validate + normalize)
│       │   ├── compatibility.js      #   pair engine (scoreCompatibility)
│       │   ├── group.js              #   groups + auditGroup (the v1 product core)
│       │   ├── discovery.js          #   deferred solo/top-up discovery
│       │   ├── conceal.js            #   disclosure tiers T0/T1/T2 (see Conceal-Lattice)
│       │   ├── agreement.js          #   house agreement draft generator
│       │   ├── brief.js              #   search brief generator
│       │   ├── seed.js               #   deterministic fixtures (Bloomsbury/Whitechapel Three)
│       │   └── *.test.js             #   compatibility / group / discovery / conceal / artifacts
│       ├── domain.js                 # LEGACY v0 (swipe domain)
│       └── encoding.js               # LEGACY v0 (VerisimDB payload encoding)
├── apps/
│   ├── api/                          # LEGACY v0 Deno API over VerisimDB — NOT wired to engine v2; no tests
│   ├── web/                          # LEGACY v0 React + Vite client — NOT wired to engine v2; no tests
│   └── mobile/                       # LEGACY v0 Expo React Native client — NOT wired to engine v2; no tests
├── deno.json                         # workspace + tasks (check/test/fmt:check target the engine)
└── Justfile                          # doctor, tour, assail, crg-grade, ...
```

See [[Engine-v2-Reference]] for the module-by-module API and [[Squad-Audit-Walkthrough]] for the fixtures in action.

## Commands that work today

```bash
# Engine tests (35 tests; includes the broken Bloomsbury Three fixture)
deno test --allow-read packages/shared/src/matching/
deno task test                 # same thing, via deno.json

# Type-check + lint (engine and the api entry points)
deno task check

# Format check (engine only)
deno task fmt:check

# Repo self-diagnostic / discovery
just doctor
just --list
```

Legacy app tasks exist (`deno task dev:api`, `deno task dev:web`, `deno task dev:mobile`) but drive the **v0** flow and expect a running VerisimDB instance; they are not the v1 product.

## The TypeScript carve-out

Estate policy is Deno-first, **JS-first — no new TypeScript**. This repo has exactly **four approved TS exemptions**, all in `apps/api` (documented in `.claude/CLAUDE.md` with unblock conditions tied to AffineScript's Node target):

`apps/api/main.ts` · `apps/api/src/config.ts` · `apps/api/src/repository.ts` · `apps/api/src/verisimClient.ts`

New TypeScript files outside this list are blocked by the RSR antipattern check. Adding to the list requires explicit owner approval plus a written unblock condition. Write new code in JS with JSDoc types (the engine is the house style to copy).

## How to add a dealbreaker token

Dealbreakers are **data-driven rules** — a curated vocabulary in `constants.js`, one shared evaluator in `compatibility.js`. You should not need to write any logic:

1. Add an entry to `DEALBREAKER_RULES` in `packages/shared/src/matching/constants.js`:

   ```js
   my_token: { label: "human-readable thing", field: "someProfileField", anyOf: ["bad_value"] },
   ```

   Supported predicates: `anyOf: [...]` (enum membership), `atMost: n` / `atLeast: n` (numeric), `equals: v` (exact, e.g. booleans).
2. That's the whole change: `DEALBREAKER_TOKENS` is derived from the rule keys, so profile validation (`validateStudentProfile`) accepts the new token automatically, the evaluator picks it up, and `not_viable` folding, structured attribution and conceal-tier redaction all follow.
3. **Respect the category rule**: a rule must test the *other party's behaviour* (or an explicit demand like `spotless_required`), **never their tolerance**. Tolerating smoke is not smoking — the v1 engine made exactly this category error, and there is a regression test pinning it.
4. Add a test in `compatibility.test.js` (trigger + non-trigger case), and remember the missing-data policy: if the other party hasn't answered the rule's field, the engine emits an "unverifiable" warning rather than silently passing — your rule gets that behaviour for free.

The full vocabulary and predicate table is in [[Engine-v2-Reference]].

## Engine purity rule

**Matching rules live in `packages/shared/src/matching/` and never in UI components** — and that includes the conceal/redaction layer (`conceal.js`), for the same reason: a redaction rule implemented in a UI component is a disclosure bug waiting for a second client. Concretely:

- Engine modules are pure: no I/O, no network, no persistence, no clock, no randomness (`seed.js` is deterministic by design).
- Apps may *call* `scoreCompatibility` / `auditGroup` / `redactResult` and render the results; they may not reimplement, post-process scores, or re-derive redacted views from fuller ones.
- Disclosure decisions go through `effectiveTier` + `redactResult` ([[Conceal-Lattice]]); T1 views are rebuilt from structured records, never by editing T2 strings.

## Contributing ground rules

- The spec wins: change [`docs/design/squad-audit-v1.adoc`](../blob/main/docs/design/squad-audit-v1.adoc) first (or simultaneously) when changing engine semantics. See [[Design-Decision-Record]].
- Never let copy promise a "stable matching" — see [[Theory-Foundations]] for why that promise is mathematically unavailable.
- No special-category fields, no guarantor field, ever — see [[Data-Governance]] before touching the schema; new fields must be registered in `FIELD_GOVERNANCE`.
- Weight tables must sum to 1 (asserted in tests); verdicts stay banded.
- Estate invariants: VerisimDB sole persistence, London-first, MPL-2.0 (SPDX headers on source files), Expo for mobile.

## The big open task

Wiring the apps to engine v2 — replacing the v0 swipe+listings flow with the Squad Audit flow (group creation → `auditGroup` → agreement + brief artifacts) behind an epistemic-typed API. Until that lands, nothing on this page above the engine boundary is product.
