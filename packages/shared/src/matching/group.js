// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Group v2: creation + the Squad Audit core (design §7).
//
// v2 corrections over v1:
//   - budget aggregates by INTERSECTION [max(mins), min(maxes)], never mean
//     (means manufacture windows no member can pay)
//   - full pairwise matrix with internal dealbreaker detection (the v1 demo
//     group shipped with two undetected internal kills)
//   - dispersion detection instead of mean-of-ordinals (a 2-early-birds +
//     2-night-owls group is SPLIT, not "average")
//   - shared-space forecast anchors on the MINIMUM member cleanliness
//     (norms converge to the laxest member), naming the friction nodes
//   - no fictional aggregate persona for ordinal preferences

import {
  BEDTIME,
  DRINKING,
  GUEST_FREQUENCY,
  NOISE_GENERATED,
  SMOKING,
  SOCIAL_PREFERENCES,
  VERDICT_BANDS,
} from "./constants.js";
import { createStudentProfile } from "./profile.js";
import { scoreCompatibility } from "./compatibility.js";

const known = (values) => values.filter((v) => v !== null && v !== undefined);

/** Budget intersection across members: the range EVERY member can pay, or null. */
export function budgetIntersection(members) {
  const min = Math.max(...members.map((m) => m.budgetMin));
  const max = Math.min(...members.map((m) => m.budgetMax));
  return max >= min ? { min, max } : null;
}

/** Move-in window across members with known dates, or null. */
export function moveInWindow(members) {
  const stamps = known(members.map((m) => m.preferredMoveInDate)).map((d) => Date.parse(d));
  if (!stamps.length) return null;
  const earliest = new Date(Math.min(...stamps)).toISOString().slice(0, 10);
  const latest = new Date(Math.max(...stamps)).toISOString().slice(0, 10);
  const spreadDays = Math.round((Math.max(...stamps) - Math.min(...stamps)) / 86_400_000);
  return { earliest, latest, spreadDays };
}

export function validateGroup(input) {
  const errors = [];
  if (!input || typeof input !== "object") return ["Group payload is missing or invalid."];
  if (!input.name || String(input.name).trim().length < 2) {
    errors.push("group name must be at least 2 characters.");
  }
  if (!Array.isArray(input.members) || input.members.length < 1) {
    errors.push("group must have at least one member.");
  }
  const size = Number(input.targetHouseholdSize);
  if (!Number.isFinite(size) || size < 2) {
    errors.push("targetHouseholdSize must be a number >= 2.");
  } else if (Array.isArray(input.members) && size < input.members.length) {
    errors.push("targetHouseholdSize cannot be smaller than the current member count.");
  }
  return errors;
}

/**
 * Build a group. Members are validated/normalized via createStudentProfile.
 * The aggregate carries only genuinely poolable fields — budget intersection,
 * move-in window, lease consensus. Ordinal preferences are NOT aggregated
 * (see auditGroup's dispersion reporting instead).
 */
export function createGroup(input) {
  const errors = validateGroup(input);
  if (errors.length) throw new Error(`Invalid group: ${errors.join(" ")}`);

  const members = input.members.map((m) => (m.schemaVersion === 2 ? m : createStudentProfile(m)));
  const leases = known(members.map((m) => m.leaseLengthMonths));

  return {
    name: String(input.name).trim(),
    persona: "group",
    members,
    targetHouseholdSize: Math.round(Number(input.targetHouseholdSize)),
    openToSoloJoiners: input.openToSoloJoiners ?? true,
    openSlots: Math.max(0, Math.round(Number(input.targetHouseholdSize)) - members.length),
    aggregate: {
      budget: budgetIntersection(members),
      moveInWindow: moveInWindow(members),
      leaseLengthMonths: leases.length
        ? Math.round(leases.reduce((s, l) => s + l, 0) / leases.length)
        : null,
      householdSize: Math.round(Number(input.targetHouseholdSize)),
    },
  };
}

// Ordinal dimensions checked for splits inside a group.
const DISPERSION_DIMENSIONS = [
  ["bedtime", BEDTIME, 2],
  ["socialPreference", SOCIAL_PREFERENCES, 2],
  ["guestFrequency", GUEST_FREQUENCY, 2],
  ["noiseGenerated", NOISE_GENERATED, 2],
  ["smoking", SMOKING, 2],
  ["drinking", DRINKING, 2],
];

/**
 * The Squad Audit core: full pairwise matrix + group-level structure checks.
 * @returns {{ groupName, feasible, budget, moveInWindow, pairs,
 *             internalDealbreakers, minPairHarmony, meanPairHarmony,
 *             weakestPair, dispersion, sharedSpaceForecast,
 *             verdict, reasons, warnings }}
 */
export function auditGroup(group) {
  const members = group.members;
  const warnings = [];
  const reasons = [];

  // --- pairwise matrix -----------------------------------------------------
  const pairs = [];
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      pairs.push({
        a: members[i].name,
        b: members[j].name,
        result: scoreCompatibility(members[i], members[j]),
      });
    }
  }

  const internalDealbreakers = pairs
    .filter((p) => p.result.dealbreakerHit)
    .flatMap((p) => p.result.dealbreakers);
  for (const hit of internalDealbreakers) {
    warnings.push(
      `Internal dealbreaker: ${hit.holder} will not live with ${hit.label} (${hit.trigger}).`,
    );
  }

  const harmonies = pairs.map((p) => p.result.harmony);
  const minPairHarmony = pairs.length ? Math.min(...harmonies) : 100;
  const meanPairHarmony = pairs.length
    ? Math.round(harmonies.reduce((s, h) => s + h, 0) / harmonies.length)
    : 100;
  const weakestPair = pairs.length
    ? pairs.reduce((lo, p) => (p.result.harmony < lo.result.harmony ? p : lo), pairs[0])
    : null;
  if (weakestPair && weakestPair.result.harmony < VERDICT_BANDS.workable) {
    warnings.push(
      `Weakest link: ${weakestPair.a} × ${weakestPair.b} (harmony ${weakestPair.result.harmony}) — this pair decides whether the household works.`,
    );
  }

  // --- feasibility ----------------------------------------------------------
  const budget = budgetIntersection(members);
  if (budget === null) {
    warnings.push("group has NO shared budget range — no room price works for every member");
  } else {
    reasons.push(`shared budget range £${budget.min}–£${budget.max} pcm per person`);
  }
  const window = moveInWindow(members);
  if (window && window.spreadDays > 45) {
    warnings.push(
      `move-in dates span ${window.spreadDays} days — someone pays for an empty room or moves twice`,
    );
  }

  // --- dispersion (splits, not averages) -------------------------------------
  const dispersion = [];
  for (const [dimension, list, gapThreshold] of DISPERSION_DIMENSIONS) {
    const values = known(members.map((m) => m[dimension]));
    if (values.length < 2) continue;
    const indices = values.map((v) => list.indexOf(v));
    if (Math.max(...indices) - Math.min(...indices) >= gapThreshold) {
      const counts = {};
      for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
      const split = Object.entries(counts).map(([v, n]) => `${n}× ${v}`).join(", ");
      dispersion.push({ dimension, counts, message: `group is split on ${dimension} (${split})` });
      warnings.push(
        `group is split on ${dimension} (${split}) — no "average" housemate exists here`,
      );
    }
  }
  const cleanlinessValues = members.map((m) => m.cleanliness);
  if (Math.max(...cleanlinessValues) - Math.min(...cleanlinessValues) >= 3) {
    dispersion.push({ dimension: "cleanliness", counts: null, message: "wide cleanliness spread" });
  }

  // --- shared-space forecast (norms converge to the laxest member) ----------
  const floor = Math.min(...cleanlinessValues);
  const highStandardMembers = members
    .filter((m) => m.cleanliness - floor >= 2)
    .map((m) => m.name);
  const sharedSpaceForecast = { level: floor, highStandardMembers };
  if (highStandardMembers.length) {
    warnings.push(
      `shared spaces will trend toward the lowest standard (${floor}/5); ${
        highStandardMembers.join(" and ")
      } will end up cleaning or seething — put a rota in the agreement`,
    );
  }

  // --- verdict ----------------------------------------------------------------
  const feasible = budget !== null;
  const verdict = internalDealbreakers.length
    ? "not_viable"
    : minPairHarmony >= VERDICT_BANDS.strong
    ? "strong"
    : minPairHarmony >= VERDICT_BANDS.workable
    ? "workable"
    : "risky";

  return {
    groupName: group.name,
    feasible,
    budget,
    moveInWindow: window,
    pairs,
    internalDealbreakers,
    minPairHarmony,
    meanPairHarmony,
    weakestPair: weakestPair
      ? { a: weakestPair.a, b: weakestPair.b, harmony: weakestPair.result.harmony }
      : null,
    dispersion,
    sharedSpaceForecast,
    verdict,
    reasons,
    warnings,
  };
}
