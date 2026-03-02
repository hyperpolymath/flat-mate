// SPDX-License-Identifier: PMPL-1.0-or-later
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// flat-mate API entry point -- HTTP server routing for profiles, listings, swipes, and matches.

import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { config } from "./src/config.ts";
import { FlatMateRepository } from "./src/repository.ts";
import { VerisimClient } from "./src/verisimClient.ts";

const client = new VerisimClient({ baseUrl: config.verisimdbBaseUrl });
const repository = new FlatMateRepository({
  verisimClient: client,
  vectorDimension: config.vectorDimension,
});

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const handleRequest = async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  const { searchParams } = url;

  try {
    if (request.method === "GET" && pathname === "/health") {
      return jsonResponse(200, {
        status: "ok",
        service: "flat-mate-api",
        host: config.host,
        verisimdbBaseUrl: config.verisimdbBaseUrl,
      });
    }

    if (request.method === "POST" && pathname === "/profiles") {
      const body = await parseJson(request);
      const result = await repository.createOrUpdateProfile(body);
      if (result.errors) {
        return jsonResponse(400, { errors: result.errors });
      }
      return jsonResponse(201, result.value);
    }

    if (request.method === "GET" && pathname === "/profiles") {
      const profiles = await repository.listProfiles({
        excludeUserId: searchParams.get("excludeUserId") ?? undefined,
        search: searchParams.get("search") ?? undefined,
        limit: Number(searchParams.get("limit") ?? 100),
      });
      return jsonResponse(200, profiles);
    }

    if (request.method === "GET" && pathname.startsWith("/profiles/")) {
      const userId = decodeURIComponent(pathname.split("/")[2] ?? "");
      const profile = await repository.getProfileByUserId(userId);
      if (!profile) {
        return jsonResponse(404, { error: "Profile not found." });
      }
      return jsonResponse(200, profile);
    }

    if (request.method === "GET" && pathname.startsWith("/feed/")) {
      const userId = decodeURIComponent(pathname.split("/")[2] ?? "");
      const feed = await repository.getFeed(
        userId,
        Number(searchParams.get("limit") ?? 20),
      );
      return jsonResponse(200, feed);
    }

    if (request.method === "POST" && pathname === "/listings") {
      const body = await parseJson(request);
      const result = await repository.createListing(body);
      if (result.errors) {
        return jsonResponse(400, { errors: result.errors });
      }
      return jsonResponse(201, result.value);
    }

    if (request.method === "GET" && pathname === "/listings") {
      const listings = await repository.listListings({
        borough: searchParams.get("borough") ?? undefined,
        maxRent: searchParams.get("maxRent")
          ? Number(searchParams.get("maxRent"))
          : undefined,
        ownerUserId: searchParams.get("ownerUserId") ?? undefined,
        limit: Number(searchParams.get("limit") ?? 100),
      });
      return jsonResponse(200, listings);
    }

    if (request.method === "POST" && pathname === "/swipes") {
      const body = await parseJson(request);
      const result = await repository.recordSwipe(body);
      if (result.errors) {
        return jsonResponse(400, { errors: result.errors });
      }
      return jsonResponse(201, result.value);
    }

    if (request.method === "GET" && pathname.startsWith("/matches/")) {
      const userId = decodeURIComponent(pathname.split("/")[2] ?? "");
      const matches = await repository.listMatches(userId);
      return jsonResponse(200, matches);
    }

    return jsonResponse(404, { error: "Route not found." });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
};

console.log(`flat-mate API listening on http://${config.host}:${config.port}`);
await serve(handleRequest, { hostname: config.host, port: config.port });

async function parseJson(request: Request) {
  const text = await request.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}
