<!--
SPDX-License-Identifier: CC-BY-SA-4.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# flat-mate

> **Bring the group you already have; we'll tell you if it survives a lease — and hand you the agreement to make sure it does.**

flat-mate v1 is **Squad Audit**: an already-formed student friend group (the UK "second-year cliff" — first-years allocated halls, forced to form private-market households of 3–6 by January with people they met eight weeks earlier) gets a **harmony + feasibility audit**, an **auto-drafted house agreement**, and a **search brief** to take to the listings market. flat-mate sits *upstream* of SpareRoom: it hosts **no listings** and is not a SpareRoom rival. The output is a vetted household plus the brief that household takes shopping. Target wave: **Jan–May 2027, London second years**.

The authoritative spec is in-repo at [`docs/design/squad-audit-v1.adoc`](../blob/main/docs/design/squad-audit-v1.adoc) — where code and spec disagree, the spec wins. See [[Design-Decision-Record]] for the summary.

## Status snapshot (2026-06-11)

| Component | State |
|---|---|
| Matching engine v2 (`packages/shared/src/matching/`) | **Landed 2026-06-11.** 10 modules + 5 test files, 35 tests passing, lint/format clean. Pure functions, no I/O. |
| Conceal lattice (disclosure tiers T0/T1/T2) | Landed as part of engine v2 (`conceal.js`), mirroring the formally verified `proven-epistemic` Idris2 core. |
| Artifact generators (house agreement, search brief) | Landed (`agreement.js`, `brief.js`), with markdown renderers. |
| Apps (`apps/api`, `apps/web`, `apps/mobile`) | **NOT wired to engine v2.** They still implement the legacy v0 swipe+listings flow over VerisimDB and have **no tests**. |
| Legacy v0 (`domain.js`, `encoding.js`, the apps) | In-tree, marked LEGACY in the README, awaiting a quarantine/removal decision. Not the product. |

Honest framing: **the v1 product exists today as a library, not as a deployed service.** Everything below the engine boundary is real and tested; everything above it (API, web, mobile) is legacy v0 code that has not been migrated.

## Pages

- [[Design-Decision-Record]] — the four 2026-06-11 decisions and why.
- [[Squad-Audit-Walkthrough]] — the real seed fixtures end-to-end: the deliberately broken "Bloomsbury Three" and the feasible "Whitechapel Three".
- [[Engine-v2-Reference]] — every module, every exported function, the weights, verdict bands, dealbreaker vocabulary, missing-data policy.
- [[Conceal-Lattice]] — disclosure tiers, reciprocity, and the formally verified core behind them.
- [[Theory-Foundations]] — why we never promise a "stable matching", and what we legitimately import from matching theory instead.
- [[Data-Governance]] — the no-Art.-9-by-construction posture, the universal-prompt pattern, the field governance registry, and what is still owed before launch.
- [[Development]] — repo layout, commands, the TypeScript carve-out, how to add a dealbreaker, engine purity rules.

## Estate invariants

VerisimDB is the sole persistence layer; London-first MVP; Deno-first and JS-first (a four-file TypeScript carve-out in `apps/api`, see [[Development]]); MPL-2.0; mobile via Expo.
