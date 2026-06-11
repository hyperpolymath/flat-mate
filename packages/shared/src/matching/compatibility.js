// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Compatibility engine v2. Pure functions only — no UI, no I/O.
//
// v2 corrections over v1 (design §6, engine critique 2026-06-11):
//   - feasibility and harmony are SEPARATE scores, never blended
//   - directional scoring: behaviour vs tolerance, weakest direction governs
//   - budget pairs use the overlap coefficient (containment scores 1.0)
//   - missing answers score NEUTRAL (0.5) with a warning, never better
//   - dealbreakers are structured (token/label/holder/trigger) so the
//     conceal layer can rebuild unattributed views without string surgery
//   - banded verdicts (strong/workable/risky/not_viable)

import {
  BEDTIME,
  DEALBREAKER_RULES,
  DRINKING,
  DRINKING_TOLERANCE,
  ENGINE_VERSION,
  FEASIBILITY_WEIGHTS,
  GUEST_FREQUENCY,
  GUEST_TOLERANCE,
  HARMONY_WEIGHTS,
  MOVE_IN_WINDOW_DAYS,
  NARRATION,
  NEUTRAL_FACTOR,
  NOISE_GENERATED,
  NOISE_TOLERANCE,
  SMOKING,
  SMOKING_TOLERANCE,
  SOCIAL_PREFERENCES,
  STRONG_FACTOR,
  VERDICT_BANDS,
  WEAK_FACTOR,
} from "./constants.js";

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Index lookup that refuses corrupt input: values must be null or in-scale.
// Profiles that bypassed createStudentProfile fail loudly, not silently as 0.
const idx = (list, value) => {
  if (value === null || value === undefined) return null;
  const i = list.indexOf(value);
  if (i === -1) {
    throw new Error(`Unrecognized scale value "${value}" (expected one of: ${list.join(", ")})`);
  }
  return i;
};

// ---------------------------------------------------------------------------
// Directional fit: how well B's behaviour sits within A's tolerance.
// 1 = within tolerance; decreases linearly with the exceedance.
// ---------------------------------------------------------------------------
const directionalFit = (behaviourIdx, toleranceIdx, span) =>
  clamp01(1 - Math.max(0, behaviourIdx - toleranceIdx) / span);

// A behaviour/tolerance dimension scored in both directions; the weakest
// direction governs (one suffering party is enough to make a bad household).
// Returns { value, known }.
function directionalFactor(a, b, behaviourOf, toleranceOf, span) {
  const fits = [];
  const bBeh = behaviourOf(b);
  const aTol = toleranceOf(a);
  if (bBeh !== null && aTol !== null) fits.push(directionalFit(bBeh, aTol, span));
  const aBeh = behaviourOf(a);
  const bTol = toleranceOf(b);
  if (aBeh !== null && bTol !== null) fits.push(directionalFit(aBeh, bTol, span));
  if (!fits.length) return { value: NEUTRAL_FACTOR, known: false };
  return { value: Math.min(...fits), known: true };
}

// Similarity dimension (no behaviour/tolerance split): ordinal distance.
function similarityFactor(aValue, bValue, list) {
  const ai = idx(list, aValue);
  const bi = idx(list, bValue);
  if (ai === null || bi === null) return { value: NEUTRAL_FACTOR, known: false };
  const span = list.length - 1;
  return { value: clamp01(1 - Math.abs(ai - bi) / span), known: true };
}

// ---------------------------------------------------------------------------
// Feasibility factors
// ---------------------------------------------------------------------------

/**
 * Budget pair score: overlap coefficient (Szymkiewicz–Simpson),
 * overlap / min(span). Containment scores 1.0 — a generous budget fully
 * containing a narrow one is a perfect pairing, not a 10% Jaccard.
 */
export function budgetOverlapScore(a, b) {
  const low = Math.max(a.budgetMin, b.budgetMin);
  const high = Math.min(a.budgetMax, b.budgetMax);
  if (high < low) return 0;
  const minSpan = Math.min(a.budgetMax - a.budgetMin, b.budgetMax - b.budgetMin);
  if (minSpan <= 0) return 1; // a point budget inside the other's range
  return clamp01((high - low) / minSpan);
}

function moveInFactor(a, b) {
  const ta = a.preferredMoveInDate === null ? NaN : Date.parse(a.preferredMoveInDate);
  const tb = b.preferredMoveInDate === null ? NaN : Date.parse(b.preferredMoveInDate);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return { value: NEUTRAL_FACTOR, known: false };
  const daysApart = Math.abs(ta - tb) / 86_400_000;
  const flex = (a.moveInFlexDays ?? 0) + (b.moveInFlexDays ?? 0);
  const effective = Math.max(0, daysApart - flex);
  return { value: clamp01(1 - effective / MOVE_IN_WINDOW_DAYS), known: true };
}

function leaseFactor(a, b) {
  if (a.leaseLengthMonths === null || b.leaseLengthMonths === null) {
    return { value: NEUTRAL_FACTOR, known: false };
  }
  return {
    value: clamp01(1 - Math.abs(a.leaseLengthMonths - b.leaseLengthMonths) / 12),
    known: true,
  };
}

// ---------------------------------------------------------------------------
// Harmony factors
// ---------------------------------------------------------------------------

function cleanlinessFactor(a, b) {
  // Directional: violation when the other's behaviour is BELOW my minimum
  // standard. Cleanliness behaviour is required; tolerance may be null.
  const fits = [];
  if (a.cleanlinessTolerance !== null) {
    fits.push(clamp01(1 - Math.max(0, a.cleanlinessTolerance - b.cleanliness) / 4));
  }
  if (b.cleanlinessTolerance !== null) {
    fits.push(clamp01(1 - Math.max(0, b.cleanlinessTolerance - a.cleanliness) / 4));
  }
  if (!fits.length) return { value: NEUTRAL_FACTOR, known: false };
  return { value: Math.min(...fits), known: true };
}

// Effective guest pressure folds a frequent partner into hosting frequency
// (a partner most nights is an extra near-resident).
const PARTNER_PRESSURE = { never: 0, occasional: 1, frequent: 3 };

function guestBehaviourIdx(p) {
  const g = idx(GUEST_FREQUENCY, p.guestFrequency);
  const partner = p.partnerStays === null ? null : PARTNER_PRESSURE[p.partnerStays];
  if (g === null && partner === null) return null;
  return Math.max(g ?? 0, partner ?? 0);
}

// ---------------------------------------------------------------------------
// Dealbreakers — one evaluator over data-driven rules.
// ---------------------------------------------------------------------------

function ruleTriggered(rule, other) {
  const value = other[rule.field];
  if (value === null || value === undefined) return { triggered: false, unverifiable: true };
  if (rule.anyOf) return { triggered: rule.anyOf.includes(value), unverifiable: false };
  if (rule.atMost !== undefined) {
    return { triggered: Number(value) <= rule.atMost, unverifiable: false };
  }
  if (rule.atLeast !== undefined) {
    return { triggered: Number(value) >= rule.atLeast, unverifiable: false };
  }
  if (rule.equals !== undefined) return { triggered: value === rule.equals, unverifiable: false };
  return { triggered: false, unverifiable: false };
}

/** Structured dealbreaker evaluation: hits held by `holder` against `other`. */
export function dealbreakersHit(holder, other) {
  const hits = [];
  const unverifiable = [];
  for (const token of holder.dealbreakers ?? []) {
    const rule = DEALBREAKER_RULES[token];
    if (!rule) continue;
    const outcome = ruleTriggered(rule, other);
    if (outcome.triggered) {
      hits.push({ token, label: rule.label, holder: holder.name, trigger: other.name });
    } else if (outcome.unverifiable) {
      unverifiable.push({ token, label: rule.label, field: rule.field });
    }
  }
  return { hits, unverifiable };
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

const band = (harmony) =>
  harmony >= VERDICT_BANDS.strong
    ? "strong"
    : harmony >= VERDICT_BANDS.workable
    ? "workable"
    : "risky";

/**
 * Score two normalized v2 profiles.
 * @returns {{ engineVersion, harmony, feasibility, verdict,
 *             reasons: string[], warnings: string[],
 *             dealbreakers: object[], dealbreakerHit: boolean,
 *             factors: { feasibility: object, harmony: object },
 *             unanswered: string[] }}
 */
export function scoreCompatibility(a, b) {
  const feasibilityFactors = {
    budget: { value: budgetOverlapScore(a, b), known: true },
    moveIn: moveInFactor(a, b),
    lease: leaseFactor(a, b),
  };

  const harmonyFactors = {
    cleanliness: cleanlinessFactor(a, b),
    noise: directionalFactor(
      a,
      b,
      (p) => idx(NOISE_GENERATED, p.noiseGenerated),
      (p) => idx(NOISE_TOLERANCE, p.noiseTolerance),
      NOISE_GENERATED.length - 1,
    ),
    guests: directionalFactor(
      a,
      b,
      guestBehaviourIdx,
      (p) => idx(GUEST_TOLERANCE, p.guestTolerance),
      GUEST_FREQUENCY.length - 1,
    ),
    bedtime: similarityFactor(a.bedtime, b.bedtime, BEDTIME),
    smoking: directionalFactor(
      a,
      b,
      (p) => idx(SMOKING, p.smoking),
      (p) => idx(SMOKING_TOLERANCE, p.smokingTolerance),
      SMOKING.length - 1,
    ),
    drinking: directionalFactor(
      a,
      b,
      (p) => idx(DRINKING, p.drinking),
      (p) => idx(DRINKING_TOLERANCE, p.drinkingTolerance),
      DRINKING.length - 1,
    ),
    social: similarityFactor(a.socialPreference, b.socialPreference, SOCIAL_PREFERENCES),
  };

  const reasons = [];
  const warnings = [];
  const unanswered = [];

  const flatten = (table) => {
    const out = {};
    for (const key of Object.keys(table)) {
      const { value, known } = table[key];
      out[key] = value;
      if (!known) unanswered.push(key);
      else if (value >= STRONG_FACTOR) {
        reasons.push(`${NARRATION[key].strong} (${Math.round(value * 100)}%)`);
      } else if (value <= WEAK_FACTOR) {
        warnings.push(`${NARRATION[key].weak} (${Math.round(value * 100)}%)`);
      }
    }
    return out;
  };

  const feas = flatten(feasibilityFactors);
  const harm = flatten(harmonyFactors);

  if (feas.budget === 0) warnings.push("no shared budget range — not jointly viable as priced");
  if (unanswered.length) {
    warnings.push(`unanswered: ${unanswered.join(", ")} — scored neutrally, never favourably`);
  }

  // Hard dealbreakers, both directions, structured.
  const dbAB = dealbreakersHit(a, b);
  const dbBA = dealbreakersHit(b, a);
  const dealbreakers = [...dbAB.hits, ...dbBA.hits];
  const dealbreakerHit = dealbreakers.length > 0;
  for (const hit of dealbreakers) {
    warnings.push(`Dealbreaker: ${hit.holder} will not live with ${hit.label} (${hit.trigger}).`);
  }
  for (const [holder, list] of [[a, dbAB.unverifiable], [b, dbBA.unverifiable]]) {
    for (const u of list) {
      warnings.push(
        `${holder.name}'s dealbreaker "${u.token}" cannot be checked — the other party hasn't answered ${u.field}.`,
      );
    }
  }

  // Behavioural moderators (warnings only, never scored):
  if (Math.abs(a.cleanliness - b.cleanliness) >= 3) {
    warnings.push("very different personal cleanliness standards — agree a rota early");
  }
  for (const p of [a, b]) {
    if (p.partnerStays === "frequent") {
      warnings.push(
        `${p.name}'s partner stays most nights — effectively an extra housemate; agree cost-sharing and occupancy up front.`,
      );
    }
  }
  if (
    a.conflictStyle === "avoid" && b.conflictStyle === "avoid" &&
    Object.values(harm).some((v) => v <= WEAK_FACTOR)
  ) {
    warnings.push(
      "both tend to avoid conflict — small breaches will accumulate; agree a 48-hour raise-it rule",
    );
  }

  const weighted = (weights, values) =>
    Math.round(
      clamp01(Object.keys(weights).reduce((sum, k) => sum + weights[k] * values[k], 0)) * 100,
    );

  const feasibility = weighted(FEASIBILITY_WEIGHTS, feas);
  const harmony = weighted(HARMONY_WEIGHTS, harm);
  const verdict = dealbreakerHit ? "not_viable" : band(harmony);

  return {
    engineVersion: ENGINE_VERSION,
    harmony,
    feasibility,
    verdict,
    reasons,
    warnings,
    dealbreakers,
    dealbreakerHit,
    factors: { feasibility: feas, harmony: harm },
    unanswered,
  };
}
