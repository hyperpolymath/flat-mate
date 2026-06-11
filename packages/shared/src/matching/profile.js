// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Student roommate profile v2: behaviour AND tolerance per dimension.
//
// Schema policy (design §5):
//   - Unanswered optional fields are stored as null, never defaulted to a
//     fake middle value. Scoring treats null as neutral-with-warning:
//     absence of evidence never scores better than adverse evidence.
//   - There is NO accessibilityNeeds field. Free-text accessibility data is
//     UK GDPR Art. 9 health data, and even a boolean indirectly reveals
//     disability (CJEU C-184/20). The house-agreement draft instead carries
//     a UNIVERSAL "access & needs" section for every group: same
//     conversation prompted, zero stored signal. Guarantor status follows
//     the same pattern (nationality proxy; checklist item, never a field).

import {
  BEDTIME,
  BILL_SPLIT,
  CLEANLINESS_SCALE,
  CONFLICT_STYLES,
  DEALBREAKER_TOKENS,
  DRINKING,
  DRINKING_TOLERANCE,
  GUEST_FREQUENCY,
  GUEST_TOLERANCE,
  NOISE_GENERATED,
  NOISE_TOLERANCE,
  PARTNER_STAYS,
  PET_TOLERANCE,
  SMOKING,
  SMOKING_TOLERANCE,
  SOCIAL_PREFERENCES,
} from "./constants.js";

const slug = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const isoDate = (value) => {
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};

// Optional field: undefined/null -> null (validation already enforced the
// enum membership in validateStudentProfile).
const orNull = (value) => (value === undefined || value === null ? null : value);

const OPTIONAL_ENUM_FIELDS = [
  ["bedtime", BEDTIME],
  ["noiseGenerated", NOISE_GENERATED],
  ["noiseTolerance", NOISE_TOLERANCE],
  ["socialPreference", SOCIAL_PREFERENCES],
  ["guestFrequency", GUEST_FREQUENCY],
  ["guestTolerance", GUEST_TOLERANCE],
  ["partnerStays", PARTNER_STAYS],
  ["smoking", SMOKING],
  ["smokingTolerance", SMOKING_TOLERANCE],
  ["drinking", DRINKING],
  ["drinkingTolerance", DRINKING_TOLERANCE],
  ["petTolerance", PET_TOLERANCE],
  ["conflictStyle", CONFLICT_STYLES],
  ["billSplitPreference", BILL_SPLIT],
];

/** A university email is an academic address: *.edu, *.edu.<cc>, or *.ac.<cc>. */
export function isUniversityEmail(value) {
  if (!value) return false;
  const cleaned = String(value).trim().toLowerCase();
  const at = cleaned.lastIndexOf("@");
  if (at < 1) return false;
  const domain = cleaned.slice(at + 1);
  return /\.edu$/.test(domain) || /\.edu\.[a-z]{2,}$/.test(domain) ||
    /\.ac\.[a-z]{2,}$/.test(domain);
}

/** Returns an array of human-readable validation errors (empty == valid). */
export function validateStudentProfile(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return ["Profile payload is missing or invalid."];
  }

  if (!input.name || String(input.name).trim().length < 2) {
    errors.push("name must be at least 2 characters.");
  }
  if (!isUniversityEmail(input.universityEmail)) {
    errors.push("universityEmail must be a university address (.edu, .edu.<cc>, or .ac.<cc>).");
  }

  const min = Number(input.budgetMin);
  const max = Number(input.budgetMax);
  if (!Number.isFinite(min) || min < 0) errors.push("budgetMin must be a non-negative number.");
  if (!Number.isFinite(max) || max < 0) errors.push("budgetMax must be a non-negative number.");
  if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
    errors.push("budgetMax must be >= budgetMin.");
  }

  if (
    input.preferredMoveInDate !== undefined && input.preferredMoveInDate !== null &&
    isoDate(input.preferredMoveInDate) === null
  ) {
    errors.push("preferredMoveInDate must be a parseable date.");
  }
  if (input.moveInFlexDays !== undefined && input.moveInFlexDays !== null) {
    const flex = Number(input.moveInFlexDays);
    if (!Number.isFinite(flex) || flex < 0) errors.push("moveInFlexDays must be >= 0.");
  }
  if (input.leaseLengthMonths !== undefined && input.leaseLengthMonths !== null) {
    const lease = Number(input.leaseLengthMonths);
    if (!Number.isFinite(lease) || lease < 1) {
      errors.push("leaseLengthMonths must be a positive number of months.");
    }
  }

  const clean = Number(input.cleanliness);
  if (!Number.isFinite(clean) || clean < CLEANLINESS_SCALE[0] || clean > CLEANLINESS_SCALE[1]) {
    errors.push("cleanliness (shared-space behaviour) is required, between 1 and 5.");
  }
  if (input.cleanlinessTolerance !== undefined && input.cleanlinessTolerance !== null) {
    const tol = Number(input.cleanlinessTolerance);
    if (!Number.isFinite(tol) || tol < CLEANLINESS_SCALE[0] || tol > CLEANLINESS_SCALE[1]) {
      errors.push("cleanlinessTolerance must be between 1 and 5.");
    }
  }

  for (const [field, list] of OPTIONAL_ENUM_FIELDS) {
    const value = input[field];
    if (value !== undefined && value !== null && !list.includes(value)) {
      errors.push(`${field} must be one of: ${list.join(", ")}.`);
    }
  }

  if (input.hasPets !== undefined && input.hasPets !== null && typeof input.hasPets !== "boolean") {
    errors.push("hasPets must be a boolean.");
  }

  for (const token of input.dealbreakers ?? []) {
    if (!DEALBREAKER_TOKENS.includes(token)) {
      errors.push(`Unknown dealbreaker "${token}". Known: ${DEALBREAKER_TOKENS.join(", ")}.`);
    }
  }

  return errors;
}

/**
 * Validate and normalize raw input into a canonical v2 profile.
 * Idempotent. Throws with all collected messages on invalid input.
 */
export function createStudentProfile(input) {
  const errors = validateStudentProfile(input);
  if (errors.length) {
    throw new Error(`Invalid student profile: ${errors.join(" ")}`);
  }

  const budgetMin = Math.max(0, Math.round(Number(input.budgetMin)));
  const budgetMax = Math.max(budgetMin, Math.round(Number(input.budgetMax)));

  const profile = {
    schemaVersion: 2,
    id: slug(input.id ?? input.name),
    name: String(input.name).trim(),
    universityEmail: String(input.universityEmail).trim().toLowerCase(),
    university: input.university ? String(input.university).trim() : null,
    persona: "solo",
    budgetMin,
    budgetMax,
    preferredMoveInDate: input.preferredMoveInDate == null
      ? null
      : isoDate(input.preferredMoveInDate),
    moveInFlexDays: input.moveInFlexDays == null ? 0 : Math.round(Number(input.moveInFlexDays)),
    leaseLengthMonths: input.leaseLengthMonths == null
      ? null
      : Math.round(Number(input.leaseLengthMonths)),
    cleanliness: Math.round(Number(input.cleanliness)),
    cleanlinessTolerance: input.cleanlinessTolerance == null
      ? null
      : Math.round(Number(input.cleanlinessTolerance)),
    hasPets: input.hasPets == null ? null : Boolean(input.hasPets),
    dealbreakers: [...new Set(input.dealbreakers ?? [])],
  };

  for (const [field] of OPTIONAL_ENUM_FIELDS) {
    profile[field] = orNull(input[field]);
  }

  return profile;
}
