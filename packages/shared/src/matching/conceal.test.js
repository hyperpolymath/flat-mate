// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Conceal lattice tests. The reference semantics is formally verified in
// proven-servers/protocols/proven-epistemic — these tests pin the JS mirror
// to the same truth table.

import { strict as assert } from "node:assert";
import { effectiveTier, redactResult } from "./conceal.js";
import { TIER } from "./constants.js";
import { createStudentProfile } from "./profile.js";
import { scoreCompatibility } from "./compatibility.js";

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
  smokingTolerance: "none",
  drinking: "social",
  drinkingTolerance: "social_ok",
  dealbreakers: [],
};
const mk = (overrides) => createStudentProfile({ id: overrides.name, ...BASE, ...overrides });

Deno.test("effectiveTier is the lattice meet: symmetric, idempotent, never above either grant", () => {
  const tiers = [TIER.BAND, TIER.RELATIONAL, TIER.FULL];
  for (const a of tiers) {
    assert.equal(effectiveTier(a, a), a); // meetIdem
    for (const b of tiers) {
      const e = effectiveTier(a, b);
      assert.equal(e, effectiveTier(b, a)); // meetSym (reciprocity)
      assert.ok(e <= a && e <= b); // meetLowerLeft / meetLowerRight
    }
    assert.equal(effectiveTier(TIER.BAND, a), TIER.BAND); // bandAbsorbs
  }
});

Deno.test("BAND view carries the verdict and nothing else", () => {
  const r = scoreCompatibility(mk({ name: "Aaa" }), mk({ name: "Bbb" }));
  const t0 = redactResult(r, TIER.BAND);
  assert.deepEqual(Object.keys(t0).sort(), ["tier", "verdict"]);
});

Deno.test("RELATIONAL view leaks no names, no attribution, no habit values", () => {
  const holder = mk({ name: "Casimir", dealbreakers: ["any_smoking"] });
  const smoker = mk({ name: "Wilhelmina", smoking: "indoors", partnerStays: "frequent" });
  const full = scoreCompatibility(holder, smoker);
  const t1 = redactResult(full, TIER.RELATIONAL);

  const blob = JSON.stringify(t1);
  assert.ok(!blob.includes("Casimir") && !blob.includes("Wilhelmina"), "no names at T1");
  assert.ok(!blob.includes("indoors"), "no attribute values at T1");
  assert.ok(
    t1.warnings.some((w) => /hard incompatibility between you/.test(w)),
    "dealbreaker dimension named, unattributed",
  );
  assert.equal(t1.dealbreakerHit, true);
  assert.equal(t1.verdict, "not_viable");
});

Deno.test("FULL view is the unredacted result", () => {
  const r = scoreCompatibility(mk({ name: "Aaa" }), mk({ name: "Bbb" }));
  const t2 = redactResult(r, TIER.FULL);
  assert.equal(t2.harmony, r.harmony);
  assert.deepEqual(t2.reasons, r.reasons);
  assert.equal(t2.tier, TIER.FULL);
});
