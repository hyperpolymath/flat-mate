// SPDX-License-Identifier: PMPL-1.0-or-later
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// Web client API wrapper. Provides typed fetch calls to the flat-mate REST API.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error ?? payload?.errors?.join(", ") ?? "Request failed");
  }

  return payload;
}

export const api = {
  createProfile: (input) =>
    request("/profiles", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  getFeed: (userId) => request(`/feed/${encodeURIComponent(userId)}?limit=20`),
  getListings: (borough = "") =>
    request(`/listings${borough ? `?borough=${encodeURIComponent(borough)}` : ""}`),
  createListing: (input) =>
    request("/listings", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  swipe: (input) =>
    request("/swipes", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  getMatches: (userId) => request(`/matches/${encodeURIComponent(userId)}`)
};
