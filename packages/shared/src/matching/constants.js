// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Engine v2 constants: behaviour/tolerance scales, weights, verdict bands,
// data-driven dealbreaker rules, narration, and the epistemic field-governance
// registry. Spec: docs/design/squad-audit-v1.adoc (the design doc wins).

export const ENGINE_VERSION = "2.0.0";

export const PERSONAS = ["solo", "group"];

// ---------------------------------------------------------------------------
// Behaviour scales (what I do) — ordered low -> high pressure on housemates.
// ---------------------------------------------------------------------------
export const SMOKING = ["no", "outdoor_only", "indoors"];
export const DRINKING = ["none", "social", "frequent"];
export const GUEST_FREQUENCY = ["rarely", "monthly", "weekly", "most_days"]; // overnight guests hosted
export const PARTNER_STAYS = ["never", "occasional", "frequent"]; // frequent ~ 3+ nights/week
export const NOISE_GENERATED = ["quiet", "moderate", "lively"];
export const BEDTIME = ["before_23", "23_to_1", "after_1"];
export const SOCIAL_PREFERENCES = ["homebody", "balanced", "social"];
export const CONFLICT_STYLES = ["direct", "hints", "house_meeting", "avoid"];
export const BILL_SPLIT = ["split_everything", "split_bills_only", "fully_separate"];

// ---------------------------------------------------------------------------
// Tolerance scales (what I can live with) — index-aligned with the matching
// behaviour scale so "behaviourIdx > toleranceIdx" means a violation.
// ---------------------------------------------------------------------------
export const SMOKING_TOLERANCE = ["none", "outdoor_only", "indoors_ok"];
export const DRINKING_TOLERANCE = ["dry_household", "social_ok", "anything_ok"];
export const GUEST_TOLERANCE = ["rarely", "monthly", "weekly", "most_days"]; // max comfortable
export const NOISE_TOLERANCE = ["need_quiet", "average_ok", "lively_ok"];
export const PET_TOLERANCE = ["no_pets", "open_to_discuss", "pets_welcome"];

// Cleanliness is behaviour-anchored, not an abstract self-rating
// (self-reports inflate; anchors keep answers comparable).
export const CLEANLINESS_SCALE = [1, 5];
export const CLEANLINESS_ANCHORS = {
  1: "mess doesn't register; cleaning happens when someone else does it",
  2: "dishes pile for days; tidy when guests are coming",
  3: "shared spaces reset roughly weekly",
  4: "dishes done same day; weekly clean is routine",
  5: "everything cleaned immediately; visible mess is stressful",
};

// ---------------------------------------------------------------------------
// Weights. Feasibility and harmony are SEPARATE scores (design §6) — v1
// blended 40% logistics into "harmony", which conflated the two problems.
// Harmony weights are literature-seeded (cleanliness is the #1 conflict
// predictor and curvilinear; substance mismatch is the only causally
// identified factor) and remain config pending the calibration flywheel.
// Each table must sum to 1 — asserted in tests.
// ---------------------------------------------------------------------------
export const FEASIBILITY_WEIGHTS = { budget: 0.6, moveIn: 0.25, lease: 0.15 };
export const HARMONY_WEIGHTS = {
  cleanliness: 0.3,
  noise: 0.2,
  guests: 0.15,
  bedtime: 0.1,
  smoking: 0.1,
  drinking: 0.1,
  social: 0.05,
};

// Banded verdicts — raw integers imply false precision until calibrated.
export const VERDICT_BANDS = { strong: 75, workable: 55 }; // risky below; not_viable on dealbreaker

export const STRONG_FACTOR = 0.7; // at/above -> reason
export const WEAK_FACTOR = 0.45; // at/below -> warning
export const NEUTRAL_FACTOR = 0.5; // unanswered dimensions score here, never better

// Move-in alignment window (days). 60 ≈ the slack within one academic-cycle
// search wave (London second-year wave: properties live ~Jan, peak Apr-May).
export const MOVE_IN_WINDOW_DAYS = 60;

// Solo-to-group thresholds: warn when the group looks good on average but
// one member is a poor individual fit.
export const GOOD_GROUP_MEAN = 70;
export const POOR_MEMBER = 45;

// ---------------------------------------------------------------------------
// Hard dealbreakers — curated vocabulary, rules as data (one evaluator).
// Rules test the OTHER party's BEHAVIOUR (or an explicit demand), never
// their tolerance: tolerating smoke is not smoking (the v1 category error).
// `spotless_required` is the curvilinear tail: a maximal cleanliness DEMAND
// is itself something housemates live with.
// ---------------------------------------------------------------------------
export const DEALBREAKER_RULES = {
  any_smoking: { label: "a smoker", field: "smoking", anyOf: ["outdoor_only", "indoors"] },
  smoking_indoors: { label: "indoor smoking", field: "smoking", anyOf: ["indoors"] },
  frequent_guests: {
    label: "near-daily overnight guests",
    field: "guestFrequency",
    anyOf: ["most_days"],
  },
  live_in_partner: { label: "a live-in partner", field: "partnerStays", anyOf: ["frequent"] },
  night_owl: { label: "a night-owl schedule", field: "bedtime", anyOf: ["after_1"] },
  early_riser: { label: "an early-riser schedule", field: "bedtime", anyOf: ["before_23"] },
  messy: { label: "a very low cleanliness standard", field: "cleanliness", atMost: 2 },
  spotless_required: {
    label: "a demand for constant spotlessness",
    field: "cleanlinessTolerance",
    atLeast: 5,
  },
  heavy_drinking: { label: "frequent heavy drinking", field: "drinking", anyOf: ["frequent"] },
  pets: { label: "pets in the home", field: "hasPets", equals: true },
};

export const DEALBREAKER_TOKENS = Object.keys(DEALBREAKER_RULES);

// ---------------------------------------------------------------------------
// Narration — relational phrasing by construction (safe at conceal tier T1:
// no attribute values, no attribution). Keys match factor keys.
// ---------------------------------------------------------------------------
export const NARRATION = {
  budget: { strong: "budgets overlap comfortably", weak: "budgets barely overlap" },
  moveIn: { strong: "move-in timing lines up", weak: "move-in timing is misaligned" },
  lease: { strong: "lease length preferences align", weak: "lease length preferences differ" },
  cleanliness: { strong: "compatible cleanliness standards", weak: "cleanliness standards clash" },
  noise: { strong: "noise levels suit you both", weak: "noise needs clash" },
  guests: { strong: "aligned on guests", weak: "guest norms clash" },
  bedtime: { strong: "compatible sleep schedules", weak: "clashing sleep schedules" },
  smoking: { strong: "aligned on smoking", weak: "smoking norms clash" },
  drinking: { strong: "aligned on drinking", weak: "drinking norms clash" },
  social: { strong: "similar social energy", weak: "different social energy" },
};

// ---------------------------------------------------------------------------
// Epistemic field governance (design §5.1). Mirrors proven-servers/
// protocols/proven-epistemic: every field carries {purpose, revealingness,
// minTier}. minTier gates the RAW VALUE; tier-1 views carry only relational
// narration. There are deliberately NO `revealingness: "sensitive"` fields
// in this schema — any future sensitive field must set minTier 2 AND go
// through explicit-consent design first (WellGoverned, in the proven core).
// ---------------------------------------------------------------------------
export const TIER = { BAND: 0, RELATIONAL: 1, FULL: 2 };

export const FIELD_GOVERNANCE = {
  name: { purpose: "identity", revealingness: "contextual", minTier: TIER.FULL },
  universityEmail: { purpose: "identity", revealingness: "contextual", minTier: TIER.FULL },
  university: { purpose: "feasibility", revealingness: "innocuous", minTier: TIER.RELATIONAL },
  budgetMin: { purpose: "feasibility", revealingness: "contextual", minTier: TIER.RELATIONAL },
  budgetMax: { purpose: "feasibility", revealingness: "contextual", minTier: TIER.RELATIONAL },
  preferredMoveInDate: {
    purpose: "feasibility",
    revealingness: "contextual",
    minTier: TIER.RELATIONAL,
  },
  moveInFlexDays: { purpose: "feasibility", revealingness: "innocuous", minTier: TIER.RELATIONAL },
  leaseLengthMonths: {
    purpose: "feasibility",
    revealingness: "innocuous",
    minTier: TIER.RELATIONAL,
  },
  cleanliness: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  cleanlinessTolerance: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  bedtime: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  noiseGenerated: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  noiseTolerance: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  socialPreference: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  guestFrequency: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  guestTolerance: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  partnerStays: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  smoking: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  smokingTolerance: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  drinking: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  drinkingTolerance: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  hasPets: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  petTolerance: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
  conflictStyle: { purpose: "agreement", revealingness: "contextual", minTier: TIER.FULL },
  billSplitPreference: { purpose: "agreement", revealingness: "contextual", minTier: TIER.FULL },
  dealbreakers: { purpose: "harmony", revealingness: "contextual", minTier: TIER.FULL },
};
