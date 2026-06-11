// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Artifact tests: house-agreement draft and search brief — the two things a
// Squad Audit user actually takes away.

import { strict as assert } from "node:assert";
import { buildHouseAgreement, renderAgreementMarkdown } from "./agreement.js";
import { buildSearchBrief, renderBriefMarkdown } from "./brief.js";
import { auditGroup, createGroup } from "./group.js";
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

const UNIVERSAL = ["access-needs", "guarantors", "conflict", "exit", "money", "cleaning"];

Deno.test("universal sections appear for EVERY group — including perfectly aligned ones", () => {
  const aligned = createGroup({
    name: "Clones",
    members: [raw({ name: "Aaa" }), raw({ name: "Bbb" })],
    targetHouseholdSize: 2,
  });
  const agreement = buildHouseAgreement(aligned, auditGroup(aligned));
  const ids = agreement.sections.map((s) => s.id);
  for (const id of UNIVERSAL) assert.ok(ids.includes(id), `missing universal section ${id}`);
  // Access & needs carries the zero-stored-signal promise.
  const access = agreement.sections.find((s) => s.id === "access-needs");
  assert.ok(/stores nothing/.test(access.body));
});

Deno.test("divergence sections are generated from the group's actual gaps", () => {
  const broken = seedBrokenGroup();
  const agreement = buildHouseAgreement(broken, auditGroup(broken));
  const byId = Object.fromEntries(agreement.sections.map((s) => [s.id, s]));
  assert.ok(byId["quiet-hours"], "bedtimes span before_23..after_1");
  assert.ok(
    byId.smoking && /Cira/.test(byId.smoking.body),
    "the smoker is named at full (in-group) tier",
  );
  assert.ok(byId.guests.fromDivergence);
  assert.ok(byId.cleaning.fromDivergence === false || byId.cleaning.fromDivergence === true); // present either way
});

Deno.test("agreement renders to markdown with divergence markers", () => {
  const broken = seedBrokenGroup();
  const md = renderAgreementMarkdown(buildHouseAgreement(broken, auditGroup(broken)));
  assert.ok(md.startsWith("# House agreement draft — Bloomsbury Three"));
  assert.ok(md.includes("⚠"));
  assert.ok(md.includes("48-hour"));
});

Deno.test("search brief: budget intersection, HMO note scales with household size", () => {
  const brief = buildSearchBrief(seedFeasibleGroup());
  assert.deepEqual(brief.budget.perPersonIntersection, { min: 750, max: 950 });
  assert.ok(
    /additional licensing/.test(brief.hmoNote),
    "size 4 -> borough additional-licensing note",
  );

  const five = createGroup({
    name: "Big House",
    members: [raw({ name: "Aaa" })],
    targetHouseholdSize: 5,
  });
  assert.ok(/mandatory HMO licence/.test(buildSearchBrief(five).hmoNote));

  const two = createGroup({
    name: "Pair",
    members: [raw({ name: "Aaa" })],
    targetHouseholdSize: 2,
  });
  assert.ok(/no HMO licensing/.test(buildSearchBrief(two).hmoNote));
});

Deno.test("brief checklist carries guarantor + scam-safety prompts with zero stored data", () => {
  const brief = buildSearchBrief(seedFeasibleGroup());
  assert.ok(brief.checklist.some((c) => /guarantor/.test(c) && /stores no guarantor data/.test(c)));
  assert.ok(brief.checklist.some((c) => /Never pay before a viewing/.test(c)));
  const md = renderBriefMarkdown(brief);
  assert.ok(md.includes("£750–£950"));
});
