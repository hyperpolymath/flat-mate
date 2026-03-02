// SPDX-License-Identifier: PMPL-1.0-or-later
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// Repository layer for flat-mate entities. Manages profiles, listings, swipes, and matches
// using verisimdb hexads as the underlying persistence mechanism.

import {
  buildTitle,
  compatibilityScore,
  decodeTitlePayload,
  ENTITY_KINDS,
  profileToVector,
  sanitizeListingInput,
  sanitizeProfileInput,
  validateListingInput,
  validateProfileInput,
} from "../../../packages/shared/src/index.js";

import { VerisimClient } from "./verisimClient.ts";

type ProfileRecord = Record<string, unknown> & {
  userId: string;
};

type ListingRecord = Record<string, unknown> & {
  ownerUserId: string;
};

export class FlatMateRepository {
  constructor(
    { verisimClient, vectorDimension }: {
      verisimClient: VerisimClient;
      vectorDimension: number;
    },
  ) {
    this.client = verisimClient;
    this.vectorDimension = vectorDimension;
  }

  private client: VerisimClient;
  private vectorDimension: number;

  async createOrUpdateProfile(input: Record<string, unknown>) {
    const errors = validateProfileInput(input);
    if (errors.length) {
      return { errors };
    }

    const profile = sanitizeProfileInput(input);
    const existing = await this.getProfileByUserId(profile.userId);
    const record = {
      entityKind: ENTITY_KINDS.PROFILE,
      profileId: existing?.profileId ?? crypto.randomUUID(),
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    const persisted = await this.persistProfile(record, existing?.hexadId);
    return { value: persisted };
  }

  async getProfileByUserId(userId: string) {
    const safe = this.safe(userId);
    const results = await this.client.textSearch(
      `flatmate_profile user_${safe}`,
      30,
    );
    const profiles = this.decodeEntities(results, ENTITY_KINDS.PROFILE);
    return profiles.find((profile) => profile.userId === userId) ?? null;
  }

  async listProfiles(
    { excludeUserId, search, limit = 100 }: {
      excludeUserId?: string;
      search?: string;
      limit?: number;
    },
  ) {
    const query = search?.trim()
      ? `flatmate_profile london_student ${search.trim()}`
      : "flatmate_profile london_student";

    const results = await this.client.textSearch(query, limit);
    const profiles = this.decodeEntities(results, ENTITY_KINDS.PROFILE)
      .filter((profile) => !excludeUserId || profile.userId !== excludeUserId)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

    return this.uniqueBy(profiles, (item) => item.userId);
  }

  async getFeed(userId: string, limit = 20) {
    const me = await this.getProfileByUserId(userId);
    if (!me) {
      return [];
    }

    const vector = profileToVector(me, this.vectorDimension);
    const results = await this.client.vectorSearch(
      vector,
      Math.max(30, limit * 2),
    );
    const decoded = this.decodeEntities(results, ENTITY_KINDS.PROFILE)
      .filter((profile) => profile.userId !== userId)
      .map((profile) => ({
        ...profile,
        compatibility: compatibilityScore(me, profile),
      }))
      .sort((a, b) => b.compatibility - a.compatibility);

    return this.uniqueBy(decoded, (item) => item.userId).slice(0, limit);
  }

  async createListing(input: Record<string, unknown>) {
    const listingInput = {
      listingId: crypto.randomUUID(),
      ...input,
    };

    const errors = validateListingInput(listingInput);
    if (errors.length) {
      return { errors };
    }

    const listing = {
      entityKind: ENTITY_KINDS.LISTING,
      ...sanitizeListingInput(listingInput),
      createdAt: new Date().toISOString(),
    };

    const created = await this.client.createHexad({
      title: buildTitle(ENTITY_KINDS.LISTING, listing),
      body: JSON.stringify(listing),
      types: ["flatmate:Listing", "student:London"],
      metadata: {
        entityKind: ENTITY_KINDS.LISTING,
        borough: (listing as ListingRecord).borough,
        ownerUserId: (listing as ListingRecord).ownerUserId,
      },
    });

    return { value: { ...listing, hexadId: created.id } };
  }

  async listListings(
    { borough, maxRent, ownerUserId, limit = 100 }: {
      borough?: string;
      maxRent?: number;
      ownerUserId?: string;
      limit?: number;
    },
  ) {
    const queryParts = ["flatmate_listing", "london_student"];
    if (borough) {
      queryParts.push(`borough_${String(borough).toLowerCase()}`);
    }
    if (ownerUserId) {
      queryParts.push(`owner_${this.safe(ownerUserId)}`);
    }

    const results = await this.client.textSearch(queryParts.join(" "), limit);
    return this.decodeEntities(results, ENTITY_KINDS.LISTING)
      .filter((listing) => !maxRent || listing.rentPcm <= Number(maxRent))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async recordSwipe(
    { fromUserId, toUserId, liked }: {
      fromUserId: string;
      toUserId: string;
      liked: boolean;
    },
  ) {
    if (!fromUserId || !toUserId || fromUserId === toUserId) {
      return {
        errors: ["fromUserId and toUserId must be different valid user IDs."],
      };
    }

    const swipe = {
      entityKind: ENTITY_KINDS.SWIPE,
      swipeId: crypto.randomUUID(),
      fromUserId: String(fromUserId).trim(),
      toUserId: String(toUserId).trim(),
      liked: Boolean(liked),
      createdAt: new Date().toISOString(),
    };

    const created = await this.client.createHexad({
      title: buildTitle(ENTITY_KINDS.SWIPE, swipe),
      body: JSON.stringify(swipe),
      types: ["flatmate:Swipe", "student:London"],
      metadata: {
        entityKind: ENTITY_KINDS.SWIPE,
        fromUserId: swipe.fromUserId,
        toUserId: swipe.toUserId,
        liked: String(swipe.liked),
      },
    });

    return { value: { ...swipe, hexadId: created.id } };
  }

  async listMatches(userId: string) {
    const [outgoing, incoming, profiles] = await Promise.all([
      this.client.textSearch(
        `flatmate_swipe from_${this.safe(userId)} like_1`,
        400,
      ),
      this.client.textSearch(
        `flatmate_swipe to_${this.safe(userId)} like_1`,
        400,
      ),
      this.listProfiles({ limit: 400 }),
    ]);

    const outgoingSwipes = this.decodeEntities(outgoing, ENTITY_KINDS.SWIPE)
      .filter(
        (item) => item.fromUserId === userId && item.liked,
      );
    const incomingSwipes = this.decodeEntities(incoming, ENTITY_KINDS.SWIPE)
      .filter(
        (item) => item.toUserId === userId && item.liked,
      );

    const likedByMe = new Set(outgoingSwipes.map((item) => item.toUserId));
    const likedMe = new Set(incomingSwipes.map((item) => item.fromUserId));

    const mutualIds = [...likedByMe].filter((candidate) =>
      likedMe.has(candidate)
    );
    return profiles
      .filter((profile) => mutualIds.includes(profile.userId))
      .map((profile) => ({
        ...profile,
        matchedAt: new Date().toISOString(),
      }));
  }

  private async persistProfile(
    record: Record<string, unknown>,
    hexadId?: string | null,
  ) {
    const payload = {
      title: buildTitle(ENTITY_KINDS.PROFILE, record),
      body: JSON.stringify(record),
      embedding: profileToVector(record, this.vectorDimension),
      types: ["flatmate:Profile", "student:London"],
      metadata: {
        entityKind: ENTITY_KINDS.PROFILE,
        userId: (record as ProfileRecord).userId,
      },
    };

    if (hexadId) {
      const updated = await this.client.updateHexad(hexadId, payload);
      return { ...record, hexadId: updated.id };
    }

    const created = await this.client.createHexad(payload);
    return { ...record, hexadId: created.id };
  }

  private decodeEntities(results: unknown, expectedKind: string) {
    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .map((result) => {
        if (
          !result || typeof result !== "object" ||
          typeof result.title !== "string"
        ) {
          return null;
        }

        const payload = decodeTitlePayload(result.title);
        if (!payload || payload.entityKind !== expectedKind) {
          return null;
        }

        return {
          ...payload,
          hexadId: result.id,
          score: result.score ?? null,
        };
      })
      .filter(Boolean);
  }

  private safe(value: unknown) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  }

  private uniqueBy(list: unknown[], keyFn: (item: any) => unknown) {
    const seen = new Set();
    const output = [];

    for (const item of list) {
      const key = keyFn(item);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      output.push(item);
    }

    return output;
  }
}
