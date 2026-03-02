// SPDX-License-Identifier: PMPL-1.0-or-later
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// Domain models, validation, sanitization, compatibility scoring, and vector encoding
// for flat-mate student profiles and room listings.

import {
  CLEANLINESS_RANGE,
  LONDON_BOROUGHS,
  LONDON_UNIVERSITIES,
  NOISE_RANGE,
  SOCIAL_RANGE,
  VECTOR_DIMENSION
} from "./constants.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normalizeRentRange(minRent, maxRent) {
  const min = Number.isFinite(minRent) ? Math.max(300, Math.round(minRent)) : 300;
  const max = Number.isFinite(maxRent) ? Math.max(min, Math.round(maxRent)) : Math.max(min, 600);
  return { minRent: min, maxRent: max };
}

export function validateProfileInput(input) {
  const errors = [];

  if (!input || typeof input !== "object") {
    return ["Profile payload is missing or invalid."];
  }

  if (!input.userId || String(input.userId).trim().length < 3) {
    errors.push("userId must be at least 3 characters.");
  }

  if (!input.name || String(input.name).trim().length < 2) {
    errors.push("name must be at least 2 characters.");
  }

  if (!input.studentEmail || !isTrustedStudentEmail(input.studentEmail)) {
    errors.push("studentEmail must be a valid .ac.uk address.");
  }

  if (!LONDON_UNIVERSITIES.includes(input.university)) {
    errors.push("university must be one of the supported London universities.");
  }

  if (!LONDON_BOROUGHS.includes(input.preferredBorough)) {
    errors.push("preferredBorough must be a supported London borough.");
  }

  const clean = Number(input.cleanliness ?? 3);
  const noise = Number(input.noiseTolerance ?? 3);
  const social = Number(input.socialLevel ?? 3);

  if (clean < CLEANLINESS_RANGE[0] || clean > CLEANLINESS_RANGE[1]) {
    errors.push("cleanliness must be between 1 and 5.");
  }

  if (noise < NOISE_RANGE[0] || noise > NOISE_RANGE[1]) {
    errors.push("noiseTolerance must be between 1 and 5.");
  }

  if (social < SOCIAL_RANGE[0] || social > SOCIAL_RANGE[1]) {
    errors.push("socialLevel must be between 1 and 5.");
  }

  return errors;
}

export function isTrustedStudentEmail(value) {
  if (!value) {
    return false;
  }

  const cleaned = String(value).trim().toLowerCase();
  const at = cleaned.lastIndexOf("@");
  if (at === -1) {
    return false;
  }
  const domain = cleaned.slice(at + 1);
  return domain.endsWith(".ac.uk");
}

export function sanitizeProfileInput(input) {
  const { minRent, maxRent } = normalizeRentRange(Number(input.minRent), Number(input.maxRent));

  return {
    userId: String(input.userId).trim(),
    name: String(input.name).trim(),
    studentEmail: String(input.studentEmail ?? "").trim().toLowerCase(),
    university: input.university,
    preferredBorough: input.preferredBorough,
    minRent,
    maxRent,
    cleanliness: clamp(Number(input.cleanliness ?? 3), 1, 5),
    noiseTolerance: clamp(Number(input.noiseTolerance ?? 3), 1, 5),
    socialLevel: clamp(Number(input.socialLevel ?? 3), 1, 5),
    smoking: Boolean(input.smoking),
    pets: Boolean(input.pets),
    bio: String(input.bio ?? "").trim().slice(0, 400),
    city: "london",
    audience: "student"
  };
}

export function validateListingInput(input) {
  const errors = [];

  if (!input?.ownerUserId || String(input.ownerUserId).trim().length < 3) {
    errors.push("ownerUserId must be at least 3 characters.");
  }

  if (!input?.title || String(input.title).trim().length < 6) {
    errors.push("title must be at least 6 characters.");
  }

  if (!input?.borough || !LONDON_BOROUGHS.includes(input.borough)) {
    errors.push("borough must be a supported London borough.");
  }

  if (!Number.isFinite(Number(input.rentPcm)) || Number(input.rentPcm) < 300) {
    errors.push("rentPcm must be a number greater than 300.");
  }

  return errors;
}

export function sanitizeListingInput(input) {
  return {
    listingId: String(input.listingId),
    ownerUserId: String(input.ownerUserId).trim(),
    title: String(input.title).trim(),
    borough: input.borough,
    postcodeArea: String(input.postcodeArea ?? "").trim().slice(0, 10).toUpperCase(),
    rentPcm: Math.round(Number(input.rentPcm)),
    billsIncluded: Boolean(input.billsIncluded),
    availableFrom: String(input.availableFrom ?? "").slice(0, 10),
    roomType: String(input.roomType ?? "double").trim(),
    description: String(input.description ?? "").trim().slice(0, 500),
    city: "london",
    audience: "student"
  };
}

function budgetOverlapScore(a, b) {
  const low = Math.max(a.minRent, b.minRent);
  const high = Math.min(a.maxRent, b.maxRent);
  if (high < low) {
    return 0;
  }

  const shared = high - low;
  const span = Math.max(a.maxRent, b.maxRent) - Math.min(a.minRent, b.minRent);
  if (span <= 0) {
    return 1;
  }

  return clamp(shared / span, 0, 1);
}

function lifestyleScore(a, b) {
  const cleanScore = 1 - Math.abs(a.cleanliness - b.cleanliness) / 4;
  const noiseScore = 1 - Math.abs(a.noiseTolerance - b.noiseTolerance) / 4;
  const socialScore = 1 - Math.abs(a.socialLevel - b.socialLevel) / 4;
  return clamp((cleanScore + noiseScore + socialScore) / 3, 0, 1);
}

function preferenceScore(a, b) {
  const smokingScore = a.smoking === b.smoking ? 1 : 0.4;
  const petsScore = a.pets === b.pets ? 1 : 0.5;
  const boroughScore = a.preferredBorough === b.preferredBorough ? 1 : 0.6;
  const uniScore = a.university === b.university ? 1 : 0.7;
  return clamp((smokingScore + petsScore + boroughScore + uniScore) / 4, 0, 1);
}

export function compatibilityScore(profileA, profileB) {
  const budget = budgetOverlapScore(profileA, profileB);
  const lifestyle = lifestyleScore(profileA, profileB);
  const preferences = preferenceScore(profileA, profileB);

  const score = budget * 0.4 + lifestyle * 0.4 + preferences * 0.2;
  return Math.round(clamp(score, 0, 1) * 100);
}

const token = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export function profileToVector(profile, dimension = VECTOR_DIMENSION) {
  const vector = Array.from({ length: dimension }, () => 0);

  const numericFeatures = [
    profile.minRent / 2500,
    profile.maxRent / 2500,
    profile.cleanliness / 5,
    profile.noiseTolerance / 5,
    profile.socialLevel / 5,
    profile.smoking ? 1 : 0,
    profile.pets ? 1 : 0
  ];

  numericFeatures.forEach((value, index) => {
    vector[index] = value;
  });

  const categorical = [profile.university, profile.preferredBorough, profile.city, profile.audience];
  categorical.forEach((value, idx) => {
    const base = token(value)
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    for (let i = 0; i < 16; i += 1) {
      const position = 32 + ((base + i * (idx + 3)) % (dimension - 32));
      vector[position] += 0.05;
    }
  });

  return vector.map((v) => Number(v.toFixed(6)));
}
