// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Squad Audit core tests: budget intersection, internal dealbreaker
// detection, dispersion, shared-space forecast.

import { strict as assert } from "node:assert";
import { createStudentProfile } from "./profile.js";
import { auditGroup, budgetIntersection, createGroup, validateGroup } from "./group.js";
import { seedBrokenGroup, seedFeasibleGroup } from "./seed.js";

const BASE = {
  universityEmail: "x@ucl.ac.uk",
  budgetMin: 800,
  budgetMax: 1000,
  preferredMoveInDate: "2026-09-01",
  leaseLengthMonths: 12,
  cleanliness: 4,
  cleanlinessTolerance: 3,
  bedtime: "23_to_1",
  noiseGenerated: "moderate",
  noiseTolerance: "average_ok",
  socialPreference: "balanced",
  guestFrequency: "monthly",
  guestTolerance: "weekly",
  partnerStays: "never",
  smoking: "no",
  smokingTolerance: "outdoor_only",
  drinking: "social",
  drinkingTolerance: "social_ok",
  dealbreakers: [],
};
const raw = (overrides) => ({ id: overrides.name, ...BASE, ...overrides });

Deno.test("budget aggregates by INTERSECTION — the v1 mean over-promise is dead", () => {
  const lo = createStudentProfile(raw({ name: "Lo", budgetMin: 600, budgetMax: 800 }));
  const hi = createStudentProfile(raw({ name: "Hi", budgetMin: 1000, budgetMax: 1200 }));
  assert.equal(
    budgetIntersection([lo, hi]),
    null,
    "no window suits both — a mean would have invented £800–£1000",
  );

  const group = createGroup({
    name: "No Shared Budget",
    members: [
      raw({ name: "Lo2", budgetMin: 600, budgetMax: 800 }),
      raw({ name: "Hi2", budgetMin: 1000, budgetMax: 1200 }),
    ],
    targetHouseholdSize: 3,
  });
  const audit = auditGroup(group);
  assert.equal(audit.feasible, false);
  assert.ok(audit.warnings.some((w) => /NO shared budget/.test(w)));
});

Deno.test("the shipped broken fixture is caught: internal dealbreakers -> not_viable", () => {
  const audit = auditGroup(seedBrokenGroup());
  assert.equal(audit.verdict, "not_viable");
  assert.ok(audit.internalDealbreakers.length >= 2, "Bloomsbury Three hides at least two kills");
  const holders = audit.internalDealbreakers.map((d) => d.holder);
  assert.ok(holders.includes("Ava Chen") && holders.includes("Ben Okoye"));
  assert.ok(audit.internalDealbreakers.every((d) => d.trigger === "Cira Patel"));
});

Deno.test("the feasible fixture audits clean", () => {
  const audit = auditGroup(seedFeasibleGroup());
  assert.equal(audit.internalDealbreakers.length, 0);
  assert.equal(audit.verdict, "strong");
  assert.deepEqual(audit.budget, { min: 750, max: 950 });
});

Deno.test("bimodal groups are reported as SPLIT, not averaged", () => {
  const group = createGroup({
    name: "Two Tribes",
    members: [
      raw({ name: "Early1", bedtime: "before_23" }),
      raw({ name: "Early2", bedtime: "before_23" }),
      raw({ name: "Late1", bedtime: "after_1" }),
      raw({ name: "Late2", bedtime: "after_1" }),
    ],
    targetHouseholdSize: 4,
  });
  const audit = auditGroup(group);
  const split = audit.dispersion.find((d) => d.dimension === "bedtime");
  assert.ok(split, "bedtime split must be detected");
  assert.equal(split.counts.before_23, 2);
  assert.equal(split.counts.after_1, 2);
  assert.ok(audit.warnings.some((w) => /split on bedtime/.test(w)));
});

Deno.test("shared spaces forecast at the MINIMUM standard, naming the friction nodes", () => {
  const group = createGroup({
    name: "Standards Gap",
    members: [
      raw({ name: "Neat", cleanliness: 5, cleanlinessTolerance: 3 }),
      raw({ name: "Mid", cleanliness: 3, cleanlinessTolerance: 2 }),
      raw({ name: "Lax", cleanliness: 2, cleanlinessTolerance: 1 }),
    ],
    targetHouseholdSize: 3,
  });
  const audit = auditGroup(group);
  assert.equal(audit.sharedSpaceForecast.level, 2);
  assert.deepEqual(audit.sharedSpaceForecast.highStandardMembers, ["Neat"]);
  assert.ok(audit.warnings.some((w) => /cleaning or seething/.test(w)));
});

Deno.test("weakest pair is named", () => {
  const audit = auditGroup(seedFeasibleGroup());
  assert.ok(audit.weakestPair && audit.weakestPair.a && audit.weakestPair.b);
  assert.equal(audit.minPairHarmony, audit.weakestPair.harmony);
});

Deno.test("validateGroup rejects empty members and undersized households", () => {
  assert.ok(validateGroup({ name: "Empty", members: [], targetHouseholdSize: 3 }).length > 0);
  assert.ok(
    validateGroup({
      name: "Too Small",
      members: [raw({ name: "Aaa" }), raw({ name: "Bbb" })],
      targetHouseholdSize: 1,
    }).length > 0,
  );
  assert.equal(
    validateGroup({ name: "Fine", members: [raw({ name: "Aaa" })], targetHouseholdSize: 3 }).length,
    0,
  );
});
