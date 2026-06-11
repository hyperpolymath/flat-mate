// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Engine v2 unit tests: directional scoring, feasibility/harmony split,
// dealbreaker semantics, missing-data policy. Run: `deno test packages/shared`.

import { strict as assert } from "node:assert";
import { createStudentProfile } from "./profile.js";
import { budgetOverlapScore, scoreCompatibility } from "./compatibility.js";
import { FEASIBILITY_WEIGHTS, HARMONY_WEIGHTS } from "./constants.js";

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
  hasPets: false,
  petTolerance: "open_to_discuss",
  conflictStyle: "direct",
  billSplitPreference: "split_bills_only",
  dealbreakers: [],
};
const mk = (overrides) => createStudentProfile({ id: overrides.name, ...BASE, ...overrides });

Deno.test("weights each sum to 1 (asserted, not assumed)", () => {
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum(FEASIBILITY_WEIGHTS) - 1) < 1e-9);
  assert.ok(Math.abs(sum(HARMONY_WEIGHTS) - 1) < 1e-9);
});

Deno.test("result shape: split scores, banded verdict, structured dealbreakers", () => {
  const r = scoreCompatibility(mk({ name: "Aaa" }), mk({ name: "Bbb" }));
  assert.equal(typeof r.harmony, "number");
  assert.equal(typeof r.feasibility, "number");
  assert.ok(["strong", "workable", "risky", "not_viable"].includes(r.verdict));
  assert.ok(Array.isArray(r.reasons) && Array.isArray(r.warnings) && Array.isArray(r.dealbreakers));
  assert.equal(typeof r.engineVersion, "string");
});

Deno.test("identical fully-answered profiles score 100/100 strong", () => {
  const r = scoreCompatibility(mk({ name: "Same1" }), mk({ name: "Same2" }));
  assert.equal(r.harmony, 100);
  assert.equal(r.feasibility, 100);
  assert.equal(r.verdict, "strong");
  assert.equal(r.dealbreakerHit, false);
});

Deno.test("v1 REGRESSION: a tolerant non-smoker is not killed by an any_smoking dealbreaker", () => {
  const holder = mk({ name: "Holder", dealbreakers: ["any_smoking"], smokingTolerance: "none" });
  const tolerantNonSmoker = mk({ name: "Tolerant", smoking: "no", smokingTolerance: "indoors_ok" });
  const r = scoreCompatibility(holder, tolerantNonSmoker);
  assert.equal(r.dealbreakerHit, false, "tolerating smoke is not smoking");
});

Deno.test("an actual smoker IS killed by any_smoking: not_viable, attributed both ways", () => {
  const holder = mk({ name: "Holder", dealbreakers: ["any_smoking"], smokingTolerance: "none" });
  const smoker = mk({ name: "Smoker", smoking: "outdoor_only" });
  const r = scoreCompatibility(holder, smoker);
  assert.equal(r.dealbreakerHit, true);
  assert.equal(r.verdict, "not_viable");
  assert.deepEqual(r.dealbreakers.map((d) => [d.holder, d.trigger]), [["Holder", "Smoker"]]);
});

Deno.test("dealbreakers are symmetric — the second argument's rules also fire", () => {
  const slob = mk({ name: "Slob", cleanliness: 1, cleanlinessTolerance: 1 });
  const neat = mk({
    name: "Neat",
    dealbreakers: ["messy"],
    cleanliness: 5,
    cleanlinessTolerance: 4,
  });
  const r = scoreCompatibility(slob, neat);
  assert.equal(r.dealbreakerHit, true);
  assert.equal(r.dealbreakers[0].holder, "Neat");
});

Deno.test("budget: containment scores 1 (overlap coefficient, not Jaccard)", () => {
  assert.equal(
    budgetOverlapScore({ budgetMin: 500, budgetMax: 1500 }, { budgetMin: 800, budgetMax: 900 }),
    1,
  );
});

Deno.test("budget: no overlap scores 0 and warns", () => {
  const r = scoreCompatibility(
    mk({ name: "Lo", budgetMin: 300, budgetMax: 450 }),
    mk({ name: "Hi", budgetMin: 1200, budgetMax: 1500 }),
  );
  assert.equal(r.factors.feasibility.budget, 0);
  assert.ok(r.warnings.some((w) => /no shared budget/.test(w)));
});

Deno.test("directional: the weakest direction governs (lively generator vs quiet-needing)", () => {
  const quietNeed = mk({ name: "Quiet", noiseGenerated: "quiet", noiseTolerance: "need_quiet" });
  const lively = mk({ name: "Lively", noiseGenerated: "lively", noiseTolerance: "lively_ok" });
  const r = scoreCompatibility(quietNeed, lively);
  assert.equal(
    r.factors.harmony.noise,
    0,
    "Lively exceeds Quiet's tolerance; Lively's own tolerance cannot rescue it",
  );
});

Deno.test("drinking is an interaction, not a distance: heavy×heavy is fine, heavy×dry is 0", () => {
  const heavy1 = mk({ name: "H1", drinking: "frequent", drinkingTolerance: "anything_ok" });
  const heavy2 = mk({ name: "H2", drinking: "frequent", drinkingTolerance: "anything_ok" });
  const dry = mk({ name: "Dry", drinking: "none", drinkingTolerance: "dry_household" });
  assert.equal(scoreCompatibility(heavy1, heavy2).factors.harmony.drinking, 1);
  assert.equal(scoreCompatibility(heavy1, dry).factors.harmony.drinking, 0);
});

Deno.test("missing data scores neutral with a warning — never favourably", () => {
  const known = scoreCompatibility(mk({ name: "A1" }), mk({ name: "A2" }));
  const unknownMove = scoreCompatibility(
    mk({ name: "B1", preferredMoveInDate: null }),
    mk({ name: "B2" }),
  );
  assert.equal(unknownMove.factors.feasibility.moveIn, 0.5);
  assert.ok(unknownMove.unanswered.includes("moveIn"));
  assert.ok(unknownMove.warnings.some((w) => /unanswered/.test(w)));
  assert.ok(
    unknownMove.feasibility <= known.feasibility,
    "absence of evidence never beats matching evidence",
  );
});

Deno.test("a dealbreaker that cannot be checked produces a warning, not a silent pass", () => {
  const holder = mk({ name: "Holder", dealbreakers: ["heavy_drinking"] });
  const silent = mk({ name: "Silent", drinking: null, drinkingTolerance: null });
  const r = scoreCompatibility(holder, silent);
  assert.equal(r.dealbreakerHit, false);
  assert.ok(r.warnings.some((w) => /cannot be checked/.test(w)));
});

Deno.test("corrupt enum values throw instead of silently scoring as index 0", () => {
  const ok = mk({ name: "Ok" });
  const corrupt = { ...mk({ name: "Bad" }), bedtime: "noonish" };
  assert.throws(() => scoreCompatibility(ok, corrupt), /Unrecognized scale value/);
});

Deno.test("both-avoiders with a weak factor get the 48-hour-rule warning", () => {
  const a = mk({
    name: "Av1",
    conflictStyle: "avoid",
    noiseGenerated: "lively",
    noiseTolerance: "lively_ok",
  });
  const b = mk({
    name: "Av2",
    conflictStyle: "avoid",
    noiseTolerance: "need_quiet",
    noiseGenerated: "quiet",
  });
  const r = scoreCompatibility(a, b);
  assert.ok(r.warnings.some((w) => /48-hour/.test(w)));
});
