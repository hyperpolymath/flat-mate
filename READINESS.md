<!--
SPDX-License-Identifier: MPL-2.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# flat-mate Component Readiness Assessment

**Standard:** [Component Readiness Grades (CRG) v1.0](https://github.com/hyperpolymath/standards/tree/main/component-readiness-grades)
**Assessed:** 2026-06-11
**Assessor:** Jonathan D.A. Jewell

**Current Grade:** C

Grade carried over from the prior TEST-NEEDS.md claim (CRG C, 2026-04-04) and
re-assessed 2026-06-11. The grade applies to the matching engine library only —
see honest notes below.

## Grade Reference

| Grade | Name                  | Release Stage      | Meaning                                              |
|-------|-----------------------|--------------------|------------------------------------------------------|
| X     | Untested              | —                  | No testing performed. Status unknown.                |
| F     | Harmful / Wasteful    | —                  | Reject, deprecate, or delegate.                      |
| E     | Minimal / Salvageable | Pre-alpha          | Barely functional. Needs redesign or major work.     |
| D     | Partial / Inconsistent| Alpha              | Works on some things but not systematically.         |
| C     | Self-Validated        | Beta               | Dogfooded and reliable in home context.              |
| B     | Broadly Validated     | Release Candidate  | Tested on 6+ diverse external targets.               |
| A     | Field-Proven          | Stable             | Real-world feedback confirms value. No harm in wild. |

## Component Assessment

| Component                          | Grade | Release Stage | Evidence Summary                                                          | Last Assessed |
|------------------------------------|-------|---------------|---------------------------------------------------------------------------|---------------|
| `packages/shared/src/matching` (engine v2) | C | Beta    | 35 unit tests passing across 5 test files; deterministic seed fixtures incl. a deliberately-broken group; lint/fmt clean. | 2026-06-11 |
| `apps/api`                         | X     | —             | No tests; not wired to engine v2; no auth.                                | 2026-06-11    |
| `apps/web`                         | X     | —             | No tests; legacy v0 UI; not wired to engine v2.                           | 2026-06-11    |
| `apps/mobile`                      | X     | —             | No tests; Expo app; not wired to engine v2.                               | 2026-06-11    |
| `packages/shared/src/domain.js` (legacy v0) | X | —       | No tests; legacy swipe domain pending quarantine decision.                | 2026-06-11    |

## Detailed Assessment

### `packages/shared/src/matching` (engine v2)

- **Grade:** C (Beta)
- **Last assessed:** 2026-06-11
- **Evidence:** 35 unit tests covering directional behaviour/tolerance scoring,
  dealbreakers, group audit (pairwise matrix, budget intersection, dispersion,
  shared-space minimum forecast), conceal tiers T0/T1/T2, agreement + brief
  artifacts, and the missing-data policy. Run with
  `deno test packages/shared/src/matching/ --allow-read`.
- **Known limitations:** Library only — no app consumes it yet. Weights are
  literature-seeded, not fitted (calibration flywheel is roadmap LATER). No
  property-based tests.
- **Promotion path:** Wire `apps/web` to `auditGroup`, real-cohort dogfooding
  in the Jan–May 2027 wave, external validation targets.
- **Demotion risk:** Low — pure functions, deterministic fixtures.

## Notes

- **Not production-ready.** The tested engine is a library; the apps are
  unwired, untested, and have no authentication.
- The legacy v0 swipe+listings stack remains in-tree (marked LEGACY) pending a
  quarantine/removal decision — see ROADMAP.adoc NEXT.
- Grades are per-component, not per-project; the headline C reflects the
  engine library, the only dogfooded component.
- See the [full CRG standard](https://github.com/hyperpolymath/standards/tree/main/component-readiness-grades) for complete definitions, evidence requirements, and transition criteria.
