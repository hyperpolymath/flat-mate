// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Search-brief generator (design §9.3): the joint constraint envelope a
// vetted group takes to the listings market. flat-mate sits UPSTREAM of
// SpareRoom — this artifact is the handoff.
//
// HMO note: 3+ unrelated sharers form an HMO in law; mandatory licensing at
// 5+ occupants nationally; many London boroughs run ADDITIONAL licensing
// down to 3–4 sharers, borough by borough. Group size shapes the legal
// supply of dwellings.

import { ENGINE_VERSION } from "./constants.js";
import { budgetIntersection, moveInWindow } from "./group.js";

function hmoNote(size) {
  if (size >= 5) {
    return `${size} sharers = mandatory HMO licence everywhere in England — the legal market is structurally thinner; confirm the property is licensed before viewing.`;
  }
  if (size >= 3) {
    return `${size} unrelated sharers form an HMO; many London boroughs require additional licensing at this size — check the borough's scheme before committing.`;
  }
  return "Two sharers: no HMO licensing applies.";
}

/**
 * Build the search brief from a (preferably audited) group.
 * @returns {{ groupName, engineVersion, householdSize, budget, moveInWindow,
 *             leaseLengthMonths, universities, hmoNote, checklist }}
 */
export function buildSearchBrief(group) {
  const members = group.members;
  const perPerson = budgetIntersection(members);
  const size = group.targetHouseholdSize;

  return {
    groupName: group.name,
    engineVersion: ENGINE_VERSION,
    householdSize: size,
    openSlots: group.openSlots,
    budget: {
      perPersonIntersection: perPerson,
      // Sum over current members only — open slots are priced when filled.
      knownMembersTotal: {
        min: members.reduce((s, m) => s + m.budgetMin, 0),
        max: members.reduce((s, m) => s + m.budgetMax, 0),
      },
    },
    moveInWindow: moveInWindow(members),
    leaseLengthMonths: group.aggregate.leaseLengthMonths,
    universities: [...new Set(members.map((m) => m.university).filter(Boolean))],
    hmoNote: hmoNote(size),
    checklist: [
      "Each member confirms a guarantor arrangement (UK guarantor at ~3x rent, or a paid guarantor service) — sort this BEFORE viewings; the platform stores no guarantor data.",
      "Normalise rents to bills-included before comparing listings (£40–80/month/person utilities is typical).",
      "UK joint tenancies are joint-and-several: each member is liable for ALL the rent. The agreement's exit clause matters.",
      "Commute check: test the journey from shortlisted areas to every member's campus, not the average.",
      "Never pay before a viewing (in person or live video) — pre-payment pressure is the signature of deposit scams.",
    ],
  };
}

/** Render a search brief as markdown. */
export function renderBriefMarkdown(brief) {
  const b = brief.budget.perPersonIntersection;
  const t = brief.budget.knownMembersTotal;
  const lines = [
    `# Search brief — ${brief.groupName}`,
    "",
    `- **Household size:** ${brief.householdSize}${
      brief.openSlots ? ` (${brief.openSlots} open slot${brief.openSlots > 1 ? "s" : ""})` : ""
    }`,
    `- **Per-person budget (works for every member):** ${
      b ? `£${b.min}–£${b.max} pcm` : "NONE — resolve before searching"
    }`,
    `- **Known members' combined budget:** £${t.min}–£${t.max} pcm`,
    `- **Move-in window:** ${
      brief.moveInWindow
        ? `${brief.moveInWindow.earliest} → ${brief.moveInWindow.latest} (${brief.moveInWindow.spreadDays} days spread)`
        : "not yet set"
    }`,
    `- **Lease length:** ${
      brief.leaseLengthMonths ? `~${brief.leaseLengthMonths} months` : "not yet set"
    }`,
    `- **Campuses:** ${brief.universities.join(", ") || "not stated"}`,
    "",
    `**Licensing:** ${brief.hmoNote}`,
    "",
    "## Before you search",
    ...brief.checklist.map((item) => `- [ ] ${item}`),
  ];
  return lines.join("\n");
}
