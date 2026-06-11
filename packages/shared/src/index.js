// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Barrel export for the shared package. Re-exports constants, domain logic, and encoding.

export * from "./constants.js";
export * from "./domain.js";
export * from "./encoding.js";

// Student roommate matching MVP (profiles, groups, compatibility engine, discovery, seed).
// Namespaced to keep it distinct from the flats/listings domain above.
export * as matching from "./matching/index.js";
