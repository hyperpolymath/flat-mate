// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Discovery v2: rank a seeker against solos and groups (the deferred
// top-up/discovery flow — the Squad Audit itself lives in group.js).
//
// v2 corrections over v1:
//   - solo-to-group scores against EVERY MEMBER (mean of scores + min),
//     never against a fictional aggregate persona (mean-of-ordinals lied
//     about bimodal groups)
//   - groups are detected structurally (members + aggregate), not by a
//     spoofable persona string
//   - headline = 0.5*mean + 0.5*min so one bad fit can't hide
//   - optional conceal-tier redaction at the boundary

import { GOOD_GROUP_MEAN, POOR_MEMBER, VERDICT_BANDS } from "./constants.js";
import { scoreCompatibility } from "./compatibility.js";
import { redactResult } from "./conceal.js";

/** Structural group detection — a persona string is not proof of groupness. */
export const isGroup = (candidate) =>
  Array.isArray(candidate?.members) && candidate?.aggregate !== undefined;

/**
 * Compare a solo seeker to a group: every member, individually.
 * @returns {{ harmony, feasibility, verdict, meanMemberHarmony,
 *             minMemberHarmony, worstMember, members, reasons, warnings,
 *             dealbreakers, dealbreakerHit, unanswered }}
 */
export function scoreSoloToGroup(solo, group) {
  const members = group.members.map((member) => ({
    member: member.name,
    result: scoreCompatibility(solo, member),
  }));

  const harmonies = members.map((m) => m.result.harmony);
  const minMemberHarmony = Math.min(...harmonies);
  const meanMemberHarmony = Math.round(harmonies.reduce((s, h) => s + h, 0) / harmonies.length);
  const worst = members.reduce(
    (lo, m) => (m.result.harmony < lo.result.harmony ? m : lo),
    members[0],
  );

  const feasibilities = members.map((m) => m.result.feasibility);
  const feasibility = Math.round(feasibilities.reduce((s, f) => s + f, 0) / feasibilities.length);

  const dealbreakers = members.flatMap((m) => m.result.dealbreakers);
  const dealbreakerHit = dealbreakers.length > 0;

  const reasons = [];
  const warnings = [];
  if (group.aggregate.budget === null) {
    warnings.push(
      "the group itself has no shared budget range — audit the group before joining it",
    );
  } else if (
    solo.budgetMax < group.aggregate.budget.min || solo.budgetMin > group.aggregate.budget.max
  ) {
    warnings.push("your budget does not overlap the group's shared range");
  }
  for (const m of members) {
    if (m.result.dealbreakerHit) warnings.push(`dealbreaker conflict with ${m.member}`);
  }
  // The headline case: looks good on average, but one member is a poor fit.
  if (meanMemberHarmony >= GOOD_GROUP_MEAN && minMemberHarmony < POOR_MEMBER) {
    warnings.push(
      `the group looks strong on average (${meanMemberHarmony}) but ${worst.member} is a weak individual fit (${worst.result.harmony})`,
    );
  }

  const harmony = Math.round(0.5 * meanMemberHarmony + 0.5 * minMemberHarmony);
  const verdict = dealbreakerHit
    ? "not_viable"
    : harmony >= VERDICT_BANDS.strong
    ? "strong"
    : harmony >= VERDICT_BANDS.workable
    ? "workable"
    : "risky";

  // Merge factor tables (mean over members) so conceal can rebuild T1 views.
  const factorMean = (path) => {
    const out = {};
    const tables = members.map((m) => m.result.factors[path]);
    for (const key of Object.keys(tables[0])) {
      out[key] = tables.reduce((s, t) => s + t[key], 0) / tables.length;
    }
    return out;
  };
  const unanswered = [...new Set(members.flatMap((m) => m.result.unanswered))];

  return {
    engineVersion: members[0].result.engineVersion,
    harmony,
    feasibility,
    verdict,
    meanMemberHarmony,
    minMemberHarmony,
    worstMember: worst.member,
    members,
    reasons,
    warnings,
    dealbreakers,
    dealbreakerHit,
    factors: { feasibility: factorMean("feasibility"), harmony: factorMean("harmony") },
    unanswered,
  };
}

/**
 * Rank a seeker against a mixed candidate list (solos and groups).
 * Dealbreaker-hit candidates drop unless includeNotViable. If opts.tier is
 * given, each result is redacted to that conceal tier at the boundary.
 */
export function discoverMatches(
  seeker,
  candidates,
  { limit, includeNotViable = false, tier } = {},
) {
  const ranked = candidates
    .map((candidate) => {
      const grouped = isGroup(candidate);
      const detail = grouped
        ? scoreSoloToGroup(seeker, candidate)
        : scoreCompatibility(seeker, candidate);
      return {
        kind: grouped ? "group" : "solo",
        name: candidate.name,
        harmony: detail.harmony,
        feasibility: detail.feasibility,
        verdict: detail.verdict,
        dealbreakerHit: detail.dealbreakerHit,
        detail: tier === undefined ? detail : redactResult(detail, tier),
      };
    })
    .filter((m) => includeNotViable || !m.dealbreakerHit)
    .sort((x, y) => y.harmony - x.harmony);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
