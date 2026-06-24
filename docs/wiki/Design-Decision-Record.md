<!--
SPDX-License-Identifier: CC-BY-SA-4.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Design Decision Record

Summary of the four decisions made on **2026-06-11** after a five-lens survey (matching theory, market landscape, empirical harmony research, repo intent audit, adversarial engine critique). The full spec lives in-repo at [`docs/design/squad-audit-v1.adoc`](../blob/main/docs/design/squad-audit-v1.adoc) — that document is the product spec, and **where code and spec disagree, the spec wins until amended**.

## 1. User moment (v1): Squad Audit

An **already-formed friend group** gets a harmony + feasibility audit, an auto-drafted house agreement, and a search brief.

**Rationale.** UK structure creates an unserved moment: first-years are allocated halls by the university; by January they must form private-market groups of 3–6 with people they met eight weeks earlier, with no compatibility input. No incumbent serves this. SpareRoom owns listings liquidity, so flat-mate sits **upstream** of it — the output is a vetted household plus a search brief to take to the listings market. Crucially, Squad Audit **works at n=3 with zero marketplace liquidity**: no chicken-and-egg problem. Stranger discovery and solo-joins-household are deferred roadmap (see [[Theory-Foundations]] for why solo-joins-household is the one theory-clean centralized mechanism we can add later).

See [[Squad-Audit-Walkthrough]] for the flow end-to-end on real fixtures.

## 2. Data architecture: epistemic-typed server

VerisimDB persistence, ordinary Art. 6 UK GDPR controller duties accepted, **no Art. 9 (special-category) fields by schema construction**. Every stored field carries governance metadata `{purpose, revealingness, minTier}` enforced at read time.

**Rationale.** The cheapest special-category data problem is the one you structurally cannot have. The v1 schema removed `accessibilityNeeds` (health data; even a boolean indirectly reveals disability — CJEU C-184/20) and never stores guarantor status (a nationality proxy). Both are replaced by the *universal-prompt pattern*: the conversation is prompted unconditionally for every group, and the platform stores nothing. Details in [[Data-Governance]].

## 3. Disclosure model: conceal lattice with reciprocity

Tiers **T0 band / T1 relational / T2 full**; what A sees of B is `min(tierA, tierB)` (LinkedIn semantics — you may see at most what you yourself grant). Joining an audit group elects T2 within that group.

**Rationale.** Explainable matching output is itself personal data about *two* people; the lattice makes over-tier disclosure impossible rather than merely checked, and the reciprocity rule removes the asymmetric-stalker failure mode. The engine's implementation mirrors a formally verified Idris2 core in `proven-servers/protocols/proven-epistemic` where the lattice properties are machine-checked theorems. Details in [[Conceal-Lattice]].

## 4. Target wave: Jan–May 2027, London second years

One user moment, one university to seed, legal posture resolved by December 2026.

**Rationale.** The academic cycle gives the market its thickness for free (a Roth-style cohort window — see [[Theory-Foundations]]); London-first is an estate invariant; and a single seeded university makes the cold-start tractable for a product that needs no liquidity at all for its v1 moment.

## Architecture consequence: three layers

| Layer | Role | Status |
|---|---|---|
| Harmony engine | Predicts whether a set of people will live well together. Pure functions, explainable output. | Built — engine v2, see [[Engine-v2-Reference]]. |
| Feasibility engine | PLACE constraint satisfaction: budget intersection, move-in window, lease length, household size vs HMO licensing. | v2 splits it out of the harmony score; grows toward commute/borough later. |
| Market mechanisms | Sequenced by liquidity: (1) squad audit → (2) solo top-up discovery with conceal tiers → (3) DA rounds for solo-joins-household → (4) optional batch match days. | v1 ships only (1). |

Matching rules live in `packages/shared/src/matching/` and **never in UI components** — including the conceal/redaction layer, for the same reason (see [[Development]]).

**Honest status note:** the engine and its artifacts are built and tested; the apps (`apps/api`, `apps/web`, `apps/mobile`) are **not yet wired to engine v2** and still carry the legacy v0 swipe+listings flow.
