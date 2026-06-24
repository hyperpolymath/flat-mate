<!--
SPDX-License-Identifier: CC-BY-SA-4.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Data Governance

flat-mate's data posture in one sentence: **ordinary UK GDPR Art. 6 controller duties accepted; no Art. 9 (special-category) data by schema construction; every stored field carries machine-readable governance metadata.** This is Art. 25 data-protection-by-design — a risk reducer and obligation organiser, **not** a compliance exemption. Spec §5/§5.1 of [`docs/design/squad-audit-v1.adoc`](../blob/main/docs/design/squad-audit-v1.adoc).

## No Art. 9 by construction

The schema (`packages/shared/src/matching/profile.js`) contains **no special-category fields, and no fields from which one is straightforwardly derived**:

- **Removed: `accessibilityNeeds` free text.** It is Art. 9 health data — and even a boolean flag indirectly reveals disability. The governing authority is CJEU C-184/20: derived data liable to reveal a sensitive attribute inherits special-category status. So neither the text nor the flag exists.
- **Never stored: guarantor status.** Whether a student has a UK guarantor is a strong nationality proxy; storing or filtering on it creates indirect-discrimination exposure. No field exists.

The constants registry states this as policy: there are **deliberately no `revealingness: "sensitive"` fields** in the schema; any future sensitive field must set `minTier: 2` *and* go through explicit-consent design first (modelled as `WellGoverned` in the proven core — see [[Conceal-Lattice]]).

## The universal-prompt pattern

Removing the fields does not remove the *needs* — it relocates the conversation to where no data is stored. The pattern: **prompt the conversation unconditionally for every group, store zero signal.**

| Need | Where it surfaces | What is stored |
|---|---|---|
| Access needs | The house agreement draft (`agreement.js`) includes an **"Access & needs"** section for *every* group, unconditionally: "is there anything about the home setup you need to work — access, allergies, medical storage, prayer or study space, temperature, anything else? Discuss in person; the platform deliberately stores nothing here." | **Nothing.** Because the section is universal, its presence reveals nothing about any member. |
| Guarantors | The agreement's **"Guarantors & tenancy setup"** section and the search brief checklist (`brief.js`) carry an unconditional per-member guarantor confirmation item ("the platform stores no guarantor data"). | **Nothing.** |

Same conversation prompted, zero stored signal. See [[Squad-Audit-Walkthrough]] for these sections in the real artifact output.

## The field governance registry

Every profile field is registered in `FIELD_GOVERNANCE` (`packages/shared/src/matching/constants.js`) with three coordinates:

```
{ purpose: identity | feasibility | harmony | agreement,
  revealingness: innocuous | contextual   (sensitive: deliberately unused),
  minTier: 0 | 1 | 2 }
```

`minTier` gates the **raw value**; tier-1 views carry only relational narration rebuilt from structured factors (see [[Conceal-Lattice]]). Current registry, as in code:

| Fields | purpose | revealingness | minTier |
|---|---|---|---|
| `name`, `universityEmail` | identity | contextual | 2 (FULL) |
| `university`, `moveInFlexDays`, `leaseLengthMonths` | feasibility | innocuous | 1 (RELATIONAL) |
| `budgetMin`, `budgetMax`, `preferredMoveInDate` | feasibility | contextual | 1 (RELATIONAL) |
| all harmony fields (`cleanliness`, `cleanlinessTolerance`, `bedtime`, `noiseGenerated`, `noiseTolerance`, `socialPreference`, `guestFrequency`, `guestTolerance`, `partnerStays`, `smoking`, `smokingTolerance`, `drinking`, `drinkingTolerance`, `hasPets`, `petTolerance`, `dealbreakers`) | harmony | contextual | 2 (FULL) |
| `conflictStyle`, `billSplitPreference` | agreement | contextual | 2 (FULL) |

This registry is designed to be the **single source** for (a) read-time tier gating on the server, (b) the conceal lattice's redaction rules, (c) the future retention schedule and DPIA documentation. The schema mirrors the formally verified field-governance types in `proven-servers/protocols/proven-epistemic`.

## Adjacent honesty: what the engine refuses to infer

- Missing answers are stored as `null` and scored neutrally (0.5) **with a warning** — absence of evidence never scores better than adverse evidence ([[Engine-v2-Reference]]).
- The disclosed-output caveat is owned, not hidden: redaction cannot prevent *self-inference* from one's own data ([[Conceal-Lattice]]).

## What remains owed before launch

Stated in the spec and restated here so it cannot quietly disappear:

1. **Privacy notice** (Art. 13/14).
2. **Retention schedule**, driven off the `FIELD_GOVERNANCE` registry.
3. **Verified VerisimDB erasure + subject-access-export story** — VerisimDB is the estate's sole persistence layer, and "we can delete you and show you your data" must be *demonstrated*, not asserted.

**Honest status note:** today the registry and lattice live in the engine library and its tests. Server-side read-time enforcement does not exist yet — the apps (`apps/api`, `apps/web`, `apps/mobile`) are **not wired to engine v2** and still implement the legacy v0 flow. The legacy v0 schema (`packages/shared/src/domain.js`) predates this posture; it is marked LEGACY and is not the v1 product surface. Until the wiring lands, the governance posture is a property of the engine, not of any deployed system.
