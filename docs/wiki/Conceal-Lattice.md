<!--
SPDX-License-Identifier: CC-BY-SA-4.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Conceal Lattice

The disclosure model for everything the engine says about a pair of people. A compatibility result is personal data about **two** data subjects at once; the conceal lattice governs who may learn what, with **reciprocity** (LinkedIn semantics: you may see at most what you yourself grant). Implementation: `packages/shared/src/matching/conceal.js`; spec §8 of [`docs/design/squad-audit-v1.adoc`](../blob/main/docs/design/squad-audit-v1.adoc); decision summary in [[Design-Decision-Record]].

## The tiers

`TIER = { BAND: 0, RELATIONAL: 1, FULL: 2 }` (in `constants.js`).

| Tier | Name | What A sees of B |
|---|---|---|
| **T0** | Band | The verdict band only (`strong` / `workable` / `risky` / `not_viable`). Dealbreakers fold into `not_viable` — no attribution, no dimension. Nothing else: `redactResult` at T0 returns `{ tier: 0, verdict }`. |
| **T1** | Relational | T0 plus the `harmony`/`feasibility` scores, `dealbreakerHit`, and **relationally phrased** reasons/warnings ("guest norms clash", "budgets overlap comfortably") rebuilt from the structured `factors`. Dealbreakers name the *dimension* ("hard incompatibility between you: a smoker") but never who holds the rule or who triggers it. No habit values, no names. Unanswered dimensions are disclosed only as "some dimensions are unanswered and were scored neutrally". |
| **T2** | Full | The unredacted result: full reasons, warnings, factor tables, and attributed dealbreakers (`{token, label, holder, trigger}`). The default **within a consented audit group** — joining an audit group elects T2 within that group. |

## Reciprocity: the meet

```js
effectiveTier(tierA, tierB) === Math.min(tierA, tierB)
```

What A sees of B is governed by the lattice **meet** of the two grants. Consequences:

- it is symmetric — neither side can arrange to see more than the other;
- you never see above what *you* granted, and never above what *they* granted;
- one party choosing T0 caps the whole exchange at band level (deny-by-default absorbs).

`discoverMatches(..., { tier })` applies `redactResult` at the discovery boundary, so redaction is a property of the engine's output surface, not a UI courtesy (see [[Engine-v2-Reference]]).

## No string surgery

Tier-1 views are **rebuilt** from the structured `factors` and `dealbreakers` records using the `NARRATION` table (whose phrasings are relational by construction), never by editing tier-2 strings — string surgery leaks. This is why `scoreCompatibility` emits structured dealbreaker records rather than only prose warnings. The test suite asserts the T1 view leaks no names, no attribution, and no habit values.

## The self-inference caveat

Redaction cannot prevent **self-inference**: a smoker told "hard incompatibility between you: a smoker" learns the counterpart holds an anti-smoking dealbreaker *from their own data*. This is inherent to explainable matching — any disclosed function output reveals information about its inputs — and the project's posture is that it is **disclosed, not denied**. (It is an epistemic fact about functions, not a gap in the lattice; differential privacy and SMPC address different layers and are explicitly out of scope of this core.)

## The formally verified core

`conceal.js` deliberately **mirrors** a formally verified reference semantics: `proven-servers/protocols/proven-epistemic` (Idris2), adopted by ADR [`proven-servers/docs/decisions/0002-add-proven-epistemic-disclosure-core.md`](https://github.com/hyperpolymath/proven-servers/blob/main/docs/decisions/0002-add-proven-epistemic-disclosure-core.md). There, the properties this page asserts in prose are **machine-checked theorems** over the tier lattice (`Band < Relational < Full`):

| Theorem | Statement | Meaning here |
|---|---|---|
| `meetSym` | `meet a b = meet b a` | Reciprocity is symmetric (the "LinkedIn property"). |
| `meetLowerLeft` | `meet a b ≤ a` | You never see above what **you** granted. |
| `meetLowerRight` | `meet a b ≤ b` | You never see above what **the other party** granted. |
| `bandAbsorbs` | `meet Band t = Band` | Deny-by-default is absorbing: one refusing party caps the session at BAND. |

The JS in this repo is the consumer-side mirror, kept small enough to audit by eye against those theorems; the Idris2 core also carries the field-governance types (`{purpose, revealingness, minTier}` — see [[Data-Governance]]) and a session lifecycle in which over-tier disclosure is unrepresentable rather than merely checked. The "epistemic type server" framing is the estate's coinage, but the substance is classical lattice-based information-flow control (Denning 1976) in dependent types.

**Honest status note:** the lattice is enforced today inside the engine library (and exercised by tests). Server-side read-time enforcement is part of the epistemic-typed server target — the apps are not yet wired to engine v2, so no deployed surface currently exercises these tiers.
