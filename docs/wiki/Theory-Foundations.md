<!--
SPDX-License-Identifier: MPL-2.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# Theory Foundations

Why flat-mate **never promises a "stable matching"**, and what it legitimately imports from fifty years of matching theory instead. These are mathematical results, not engineering choices: product copy and mechanism design must respect them. Spec §4 of [`docs/design/squad-audit-v1.adoc`](../blob/main/docs/design/squad-audit-v1.adoc).

## The negative results (what forbids the promise)

### 1. Stability guarantees live in *bipartite* markets — ours isn't one

Gale and Shapley proved that **two-sided** (bipartite) markets — students/colleges, men/women in the original framing — always admit a stable matching, found by deferred acceptance (DA) [1]. The roommate market is **one-sided**: anyone can match with anyone. That single structural fact destroys the guarantee.

### 2. Stable roommate matchings may not exist (Irving)

For the one-sided **Stable Roommates** problem, stable matchings can simply fail to exist; Irving gave the efficient algorithm that finds one *or reports none exists* [2]. So even at n=2-per-room with strict preferences, "we found you a stable assignment" is sometimes a promise no algorithm can keep.

### 3. Nonexistence is the *typical* case (Chin–Michelen, 2026)

Chin and Michelen (January 2026) proved that in random instances, the probability a stable roommate matching exists **vanishes as the market grows** — nonexistence is not an edge case, it is the expected regime at scale [3]. This closed the question of whether a roommate platform could hope stability "usually" works out: it cannot.

### 4. Ties make even *deciding* existence NP-complete

Real questionnaires produce integer scores, hence ties. With ties (indifference), deciding whether a stable roommate matching exists is **NP-complete** (Ronn) [4]. Our scores are banded integers — see [[Engine-v2-Reference]] — so we are squarely in this regime.

### 5. Couples void guarantees everywhere

Stable matching **with couples** is NP-complete (Ronn) [4], and couples destroy existence guarantees even in otherwise-bipartite hospital/resident-style markets. flat-mate therefore models couples as first-class composite units routed through **heuristic-plus-verification, never a guarantee path** (today's engine already folds a frequent partner into guest pressure as "an extra near-resident").

### 6. Households of 3+ are hedonic coalition formation — and it's worse

Forming groups (not pairs) is a **hedonic game**. Core-stable partitions may fail to exist [5][6]; deciding whether one exists is NP-complete in general representations [7] and **Σ₂ᵖ-complete** for additively separable preferences (Woeginger) [8]; even *verifying* that a given partition is core-stable is coNP-complete [8][9]. A "stably matched household of four" is a claim nobody can verify, let alone guarantee.

**Product consequence:** the verdicts are `strong / workable / risky / not_viable` — banded *predictions of harmony*, never claims of stability. See [[Squad-Audit-Walkthrough]] for what the engine actually asserts.

## The legitimate imports (what we use instead)

| Import | Source | Use in flat-mate |
|---|---|---|
| **Market design**: thickness, congestion control, safety | Roth [10] | The academic-cycle cohort (Jan–May wave) provides thickness for free; one seeded university; sequencing market mechanisms by liquidity (see [[Design-Decision-Record]]). |
| **Blocking-pair detection** as a polynomial *advisory* audit | stability theory, used diagnostically | Deferred roadmap: a private, bounded "stability audit" over the discovery graph — finding pair deviations is polynomial even when guaranteeing their absence is not. |
| **Nash-stable, welfare-maximising partitions** | Bogomolnaia & Jackson [6] | For *symmetric* additively separable scores (ours are: `score(a,b) = score(b,a)`), Nash-stable partitions are **guaranteed to exist** via a potential-function argument. This is the engine behind future squad *suggestions* — an existence guarantee we may honestly use. |
| **Deferred acceptance** for the genuinely bipartite sub-market | Gale & Shapley [1]; Roth [10] | Solo-joins-household *is* two-sided (seekers on one side, households with vacancies on the other), so DA legitimately applies there: deferred roadmap item (3), one vacancy per household per round, couples via heuristic + blocking-pair verification. |

The current v1 product needs none of the deferred machinery: a **Squad Audit** of an already-formed group requires zero liquidity and makes no stability claim at all — it reports pairwise harmony, internal dealbreakers, and feasibility constraints, which are all checkable in polynomial time.

## References

1. D. Gale, L. S. Shapley, "College Admissions and the Stability of Marriage", *American Mathematical Monthly* 69(1), 1962, 9–15.
2. R. W. Irving, "An efficient algorithm for the 'stable roommates' problem", *Journal of Algorithms* 6(4), 1985, 577–595.
3. B. Chin, M. Michelen, on the typical nonexistence of stable roommate matchings in large random markets, arXiv:2601.07612, January 2026. (Cited per the design doc.)
4. E. Ronn, "NP-complete stable matching problems", *Journal of Algorithms* 11(2), 1990, 285–304.
5. S. Banerjee, H. Konishi, T. Sönmez, "Core in a simple coalition formation game", *Social Choice and Welfare* 18, 2001, 135–153.
6. A. Bogomolnaia, M. O. Jackson, "The stability of hedonic coalition structures", *Games and Economic Behavior* 38(2), 2002, 201–230.
7. C. Ballester, "NP-completeness in hedonic games", *Games and Economic Behavior* 49(1), 2004, 1–30.
8. G. J. Woeginger, "Core stability in hedonic coalition formation", *SOFSEM 2013: Theory and Practice of Computer Science*, LNCS 7741, 2013, 33–50.
9. S.-C. Sung, D. Dimitrov, "Computational complexity in additive hedonic games", *European Journal of Operational Research* 203(3), 2010, 635–639.
10. A. E. Roth, "What have we learned from market design?", *Economic Journal* 118(527), 2008, 285–310; A. E. Roth, M. Sotomayor, *Two-Sided Matching*, Cambridge University Press, 1990.
