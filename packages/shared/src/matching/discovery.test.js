// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Discovery v2 tests: structural group detection, per-member solo-to-group
// scoring, ranking, tier redaction at the boundary.

import { strict as assert } from "node:assert";
import { createStudentProfile } from "./profile.js";
import { createGroup } from "./group.js";
import { discoverMatches, isGroup, scoreSoloToGroup } from "./discovery.js";
import { GOOD_GROUP_MEAN, POOR_MEMBER, TIER } from "./constants.js";
import { seedScenario } from "./seed.js";

const BASE = {
  universityEmail: "x@ucl.ac.uk",
  budgetMin: 800,
  budgetMax: 1000,
  preferredMoveInDate: "2026-09-01",
  leaseLengthMonths: 12,
  cleanliness: 4,
  cleanlinessTolerance: 3,
  bedtime: "23_to_1",
  noiseGenerated: "quiet",
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
const mk = (overrides) => createStudentProfile(raw(overrides));

Deno.test("groups are detected structurally — a persona string is not proof", () => {
  const impostor = { ...mk({ name: "Impostor" }), persona: "group" };
  assert.equal(isGroup(impostor), false);
  const seeker = mk({ name: "Seeker" });
  const ranked = discoverMatches(seeker, [impostor]);
  assert.equal(
    ranked[0].kind,
    "solo",
    "a plain profile claiming persona=group must not crash group scoring",
  );
});

Deno.test("solo-to-group scores every member; aggregate-good-but-one-poor-fit warns", () => {
  const seeker = mk({ name: "Seeker", noiseTolerance: "need_quiet" });
  const poor = raw({
    name: "Poppy",
    cleanliness: 1,
    cleanlinessTolerance: 1,
    noiseGenerated: "lively",
    noiseTolerance: "lively_ok",
    bedtime: "after_1",
    guestFrequency: "most_days",
    guestTolerance: "most_days",
    smoking: "indoors",
    smokingTolerance: "indoors_ok",
    drinking: "frequent",
    drinkingTolerance: "anything_ok",
    socialPreference: "social",
  });
  const group = createGroup({
    name: "Mostly Aligned",
    members: [
      raw({ name: "Aaa" }),
      raw({ name: "Bbb" }),
      raw({ name: "Ccc" }),
      raw({ name: "Ddd" }),
      poor,
    ],
    targetHouseholdSize: 6,
  });
  const r = scoreSoloToGroup(seeker, group);
  assert.equal(r.members.length, 5);
  assert.ok(r.meanMemberHarmony >= GOOD_GROUP_MEAN, `mean ${r.meanMemberHarmony} should look good`);
  assert.ok(r.minMemberHarmony < POOR_MEMBER, `min ${r.minMemberHarmony} should be poor`);
  assert.equal(r.worstMember, "Poppy");
  assert.ok(r.warnings.some((w) => /weak individual fit/.test(w)));
  assert.ok(r.harmony < r.meanMemberHarmony, "headline blends in the weakest link");
});

Deno.test("a dealbreaker conflict with any member makes the group not_viable", () => {
  const seeker = mk({ name: "Seeker", dealbreakers: ["any_smoking"] });
  const group = createGroup({
    name: "Has A Smoker",
    members: [raw({ name: "Clean" }), raw({ name: "Smoker", smoking: "outdoor_only" })],
    targetHouseholdSize: 3,
  });
  const r = scoreSoloToGroup(seeker, group);
  assert.equal(r.dealbreakerHit, true);
  assert.equal(r.verdict, "not_viable");
});

Deno.test("discoverMatches sorts by harmony, filters not_viable, honours limit", () => {
  const { seeker, soloCandidates, groups } = seedScenario();
  const ranked = discoverMatches(seeker, [...soloCandidates, ...groups]);
  for (let i = 1; i < ranked.length; i += 1) {
    assert.ok(ranked[i - 1].harmony >= ranked[i].harmony);
  }
  assert.ok(!ranked.some((r) => r.dealbreakerHit));
  assert.ok(
    !ranked.some((r) => r.name === "Bloomsbury Three"),
    "broken group conflicts with the non-smoking seeker",
  );
  assert.equal(discoverMatches(seeker, [...soloCandidates, ...groups], { limit: 2 }).length, 2);
  const withBad = discoverMatches(seeker, [...soloCandidates, ...groups], {
    includeNotViable: true,
  });
  assert.ok(withBad.some((r) => r.dealbreakerHit));
});

Deno.test("tier option redacts results at the discovery boundary", () => {
  const { seeker, soloCandidates } = seedScenario();
  const ranked = discoverMatches(seeker, soloCandidates, { tier: TIER.BAND });
  for (const r of ranked) {
    assert.deepEqual(Object.keys(r.detail).sort(), ["tier", "verdict"]);
  }
});
