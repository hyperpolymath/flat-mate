// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Deterministic seed/demo data v2 — no randomness, no clock.
//
// "Bloomsbury Three" is DELIBERATELY BROKEN and kept as the canonical demo
// of what auditGroup catches: it shipped in v1 with two internal dealbreaker
// kills (Ava×Cira smoking, Ben×Cira guests) that nothing detected. The bug
// became the product. "Whitechapel Three" is the feasible counterpart.

import { createStudentProfile } from "./profile.js";
import { createGroup } from "./group.js";

const RAW = {
  ava: {
    id: "ava",
    name: "Ava Chen",
    universityEmail: "ava.chen@ucl.ac.uk",
    university: "UCL",
    budgetMin: 700,
    budgetMax: 950,
    preferredMoveInDate: "2026-09-01",
    moveInFlexDays: 7,
    leaseLengthMonths: 12,
    cleanliness: 4,
    cleanlinessTolerance: 3,
    bedtime: "23_to_1",
    noiseGenerated: "moderate",
    noiseTolerance: "average_ok",
    socialPreference: "balanced",
    guestFrequency: "monthly",
    guestTolerance: "weekly",
    partnerStays: "occasional",
    smoking: "no",
    smokingTolerance: "none",
    drinking: "social",
    drinkingTolerance: "social_ok",
    hasPets: false,
    petTolerance: "open_to_discuss",
    conflictStyle: "direct",
    billSplitPreference: "split_bills_only",
    dealbreakers: ["any_smoking"],
  },
  ben: {
    id: "ben",
    name: "Ben Okoye",
    universityEmail: "b.okoye@kcl.ac.uk",
    university: "KCL",
    budgetMin: 750,
    budgetMax: 1000,
    preferredMoveInDate: "2026-09-08",
    moveInFlexDays: 7,
    leaseLengthMonths: 12,
    cleanliness: 4,
    cleanlinessTolerance: 3,
    bedtime: "before_23",
    noiseGenerated: "quiet",
    noiseTolerance: "need_quiet",
    socialPreference: "homebody",
    guestFrequency: "rarely",
    guestTolerance: "monthly",
    partnerStays: "never",
    smoking: "no",
    smokingTolerance: "none",
    drinking: "none",
    drinkingTolerance: "social_ok",
    hasPets: false,
    petTolerance: "no_pets",
    conflictStyle: "house_meeting",
    billSplitPreference: "split_everything",
    dealbreakers: ["any_smoking", "frequent_guests"],
  },
  cira: {
    id: "cira",
    name: "Cira Patel",
    universityEmail: "cira.patel@lse.ac.uk",
    university: "LSE",
    budgetMin: 800,
    budgetMax: 1100,
    preferredMoveInDate: "2026-09-15",
    moveInFlexDays: 0,
    leaseLengthMonths: 12,
    cleanliness: 3,
    cleanlinessTolerance: 2,
    bedtime: "after_1",
    noiseGenerated: "lively",
    noiseTolerance: "lively_ok",
    socialPreference: "social",
    guestFrequency: "most_days",
    guestTolerance: "most_days",
    partnerStays: "frequent",
    smoking: "outdoor_only",
    smokingTolerance: "outdoor_only",
    drinking: "frequent",
    drinkingTolerance: "anything_ok",
    hasPets: false,
    petTolerance: "pets_welcome",
    conflictStyle: "avoid",
    billSplitPreference: "fully_separate",
    dealbreakers: [],
  },
  dom: {
    id: "dom",
    name: "Dom Rossi",
    universityEmail: "d.rossi@imperial.ac.uk",
    university: "Imperial",
    budgetMin: 650,
    budgetMax: 850,
    preferredMoveInDate: "2026-09-03",
    moveInFlexDays: 14,
    leaseLengthMonths: 9,
    cleanliness: 2,
    cleanlinessTolerance: 1,
    bedtime: "after_1",
    noiseGenerated: "lively",
    noiseTolerance: "lively_ok",
    socialPreference: "social",
    guestFrequency: "weekly",
    guestTolerance: "most_days",
    partnerStays: "never",
    smoking: "indoors",
    smokingTolerance: "indoors_ok",
    drinking: "frequent",
    drinkingTolerance: "anything_ok",
    hasPets: true,
    petTolerance: "pets_welcome",
    conflictStyle: "hints",
    billSplitPreference: "fully_separate",
    dealbreakers: ["early_riser"],
  },
  tomas: {
    id: "tomas",
    name: "Tomas Lindqvist",
    universityEmail: "t.lindqvist@qmul.ac.uk",
    university: "Queen Mary",
    budgetMin: 720,
    budgetMax: 980,
    preferredMoveInDate: "2026-09-05",
    moveInFlexDays: 10,
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
    hasPets: false,
    petTolerance: "open_to_discuss",
    conflictStyle: "direct",
    billSplitPreference: "split_bills_only",
    dealbreakers: [],
  },
};

/** A solo student looking to join a household. */
export const seekerInput = {
  id: "remy",
  name: "Remy Hale",
  universityEmail: "remy.hale@soas.ac.uk",
  university: "SOAS",
  budgetMin: 720,
  budgetMax: 980,
  preferredMoveInDate: "2026-09-05",
  moveInFlexDays: 10,
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
  hasPets: false,
  petTolerance: "open_to_discuss",
  conflictStyle: "direct",
  billSplitPreference: "split_bills_only",
  dealbreakers: ["any_smoking"],
};

export function seedProfiles() {
  return Object.values(RAW).map(createStudentProfile);
}

export function seedSeeker() {
  return createStudentProfile(seekerInput);
}

/** The deliberately broken fixture: two internal dealbreaker kills. */
export function seedBrokenGroup() {
  return createGroup({
    name: "Bloomsbury Three",
    members: [RAW.ava, RAW.ben, RAW.cira],
    targetHouseholdSize: 4,
    openToSoloJoiners: true,
  });
}

/** A feasible group: compatible members, non-empty budget intersection. */
export function seedFeasibleGroup() {
  return createGroup({
    name: "Whitechapel Three",
    members: [RAW.ava, RAW.ben, RAW.tomas],
    targetHouseholdSize: 4,
    openToSoloJoiners: true,
  });
}

/** Demo bundle: one seeker + solo candidates + one broken and one good group. */
export function seedScenario() {
  return {
    seeker: seedSeeker(),
    soloCandidates: seedProfiles(),
    groups: [seedFeasibleGroup(), seedBrokenGroup()],
  };
}
