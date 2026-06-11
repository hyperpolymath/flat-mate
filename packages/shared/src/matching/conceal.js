// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Conceal lattice (design §8): tiered disclosure with LinkedIn-style
// reciprocity. What A sees of B is governed by min(tierA, tierB).
//
// This module MIRRORS the formally verified reference semantics in
// proven-servers/protocols/proven-epistemic (Idris2): there, the properties
// below are machine-checked theorems, not comments —
//   meetSym        : effectiveTier(a,b) = effectiveTier(b,a)   (reciprocity)
//   meetLowerLeft  : effectiveTier(a,b) <= a   (never above your own grant)
//   meetLowerRight : effectiveTier(a,b) <= b   (never above their grant)
//   bandAbsorbs    : one refusing party caps the session at BAND
// Tier-1 views are REBUILT from structured factors/dealbreakers, never by
// editing tier-2 strings — string surgery leaks.
//
// Documented caveat (design §8): redaction cannot prevent SELF-INFERENCE —
// a smoker told "smoking is a hard incompatibility between you" learns the
// counterpart's dealbreaker from their own data. Inherent to explainable
// matching; disclosed, not denied.

import { NARRATION, STRONG_FACTOR, TIER, WEAK_FACTOR } from "./constants.js";

/** Effective disclosure tier between two grants: the lattice meet (min). */
export function effectiveTier(tierA, tierB) {
  return Math.min(tierA, tierB);
}

/**
 * Project a scoreCompatibility (or scoreSoloToGroup) result to a tier view.
 *   FULL       — the result unchanged.
 *   RELATIONAL — verdict + scores + relationally-rephrased reasons/warnings
 *                rebuilt from factors; dealbreakers unattributed.
 *   BAND       — verdict only.
 */
export function redactResult(result, tier) {
  if (tier >= TIER.FULL) return { ...result, tier: TIER.FULL };

  if (tier === TIER.RELATIONAL) {
    const reasons = [];
    const warnings = [];
    const tables = result.factors ? Object.values(result.factors) : [];
    for (const table of tables) {
      for (const key of Object.keys(table)) {
        const value = table[key];
        if (result.unanswered?.includes(key)) continue;
        if (!NARRATION[key]) continue;
        if (value >= STRONG_FACTOR) reasons.push(NARRATION[key].strong);
        else if (value <= WEAK_FACTOR) warnings.push(NARRATION[key].weak);
      }
    }
    // Dealbreakers: dimension named, never who holds it or who triggers it.
    for (const label of new Set((result.dealbreakers ?? []).map((d) => d.label))) {
      warnings.push(`hard incompatibility between you: ${label}`);
    }
    if (result.unanswered?.length) {
      warnings.push("some dimensions are unanswered and were scored neutrally");
    }
    return {
      tier: TIER.RELATIONAL,
      verdict: result.verdict,
      harmony: result.harmony,
      feasibility: result.feasibility,
      dealbreakerHit: result.dealbreakerHit,
      reasons,
      warnings,
    };
  }

  // BAND: the verdict and nothing else. Dealbreakers already fold into
  // "not_viable" without attribution or dimension.
  return { tier: TIER.BAND, verdict: result.verdict };
}
