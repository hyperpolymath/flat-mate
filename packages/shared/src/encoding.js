// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Entity encoding for verisimdb hexad titles. Packs entity payloads into base64url tokens
// embedded within searchable title strings, enabling text-based entity retrieval.

const safeToken = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const ENTITY_KINDS = {
  PROFILE: "flatmate_profile",
  LISTING: "flatmate_listing",
  SWIPE: "flatmate_swipe"
};

function base64Encode(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64Decode(value) {
  const binary = atob(value);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function toBase64Url(bytes) {
  return base64Encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const withPlus = padded.replace(/-/g, "+").replace(/_/g, "/");
  return base64Decode(withPlus);
}

function encodePayload(payload) {
  const text = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(text);
  return toBase64Url(bytes);
}

function decodePayload(value) {
  const bytes = fromBase64Url(value);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

export function buildTitle(kind, payload) {
  const encoded = encodePayload(payload);

  if (kind === ENTITY_KINDS.PROFILE) {
    return [
      kind,
      "london_student",
      `user_${safeToken(payload.userId)}`,
      `uni_${safeToken(payload.university)}`,
      `borough_${safeToken(payload.preferredBorough)}`,
      `rent_${payload.minRent}_${payload.maxRent}`,
      encoded
    ].join(" ");
  }

  if (kind === ENTITY_KINDS.LISTING) {
    return [
      kind,
      "london_student",
      `listing_${safeToken(payload.listingId)}`,
      `owner_${safeToken(payload.ownerUserId)}`,
      `borough_${safeToken(payload.borough)}`,
      `rent_${payload.rentPcm}`,
      encoded
    ].join(" ");
  }

  return [
    kind,
    "london_student",
    `from_${safeToken(payload.fromUserId)}`,
    `to_${safeToken(payload.toUserId)}`,
    `like_${payload.liked ? "1" : "0"}`,
    encoded
  ].join(" ");
}

export function decodeTitlePayload(title) {
  if (!title || typeof title !== "string") {
    return null;
  }

  const parts = title.split(" ").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const encoded = parts[parts.length - 1];
  try {
    return decodePayload(encoded);
  } catch {
    return null;
  }
}
