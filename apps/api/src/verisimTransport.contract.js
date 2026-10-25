// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Consumer contract tests for the pinned VeriSimDB v0.2.0 REST API.

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import manifest from "../../../tests/contracts/verisimdb/v0.2.0/manifest.json" with {
  type: "json",
};
import octadInputSchema from "../../../tests/contracts/verisimdb/v0.2.0/octad-input.json" with {
  type: "json",
};
import {
  requestCreateOctad,
  requestTextSearch,
  requestUpdateOctad,
  requestVectorSearch,
  toOctadRequest,
  VERISIMDB_CONTRACT,
} from "./verisimTransport.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateOctadInput = ajv.compile(octadInputSchema);

function assertOctadInput(value) {
  assert.equal(
    validateOctadInput(value),
    true,
    `OctadInput schema mismatch: ${ajv.errorsText(validateOctadInput.errors)}`,
  );
}

function captureJson(body, status = 200) {
  const calls = [];
  const fetchImpl = (url, options) => {
    calls.push({ url, options });
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return { calls, fetchImpl };
}

function requestBody(call) {
  return JSON.parse(call.options.body);
}

const PROFILE_INPUT = {
  document: {
    title: "flatmate_profile london_student user_alice encoded-payload",
    body: JSON.stringify({ userId: "alice", name: "Alice" }),
  },
  vector: { embedding: [0.1, -0.2, 0.3] },
  semantic: { types: ["flatmate:Profile", "student:London"] },
  metadata: { entityKind: "flatmate_profile", userId: "alice" },
};

test("the schema, transport, and manifest pin the same VeriSimDB release", () => {
  assert.deepEqual(VERISIMDB_CONTRACT, {
    serverTag: "v0.2.0",
    serverCommit: "10f8a21f4d0f2eacce84eee29e504f66fbe9e332",
    apiPrefix: "/api/v1",
    inputSchema: "OctadInput",
    wireRequest: "OctadRequest",
  });
  assert.equal(manifest.serverCommit, VERISIMDB_CONTRACT.serverCommit);
  assert.equal(
    manifest.octadInput.sourceSha256,
    "0b7570a1b17dcf6fa376fc1a19e554953c0d700136da95e6eaa470db66356946",
  );
  const schemaBytes = readFileSync(
    new URL(
      "../../../tests/contracts/verisimdb/v0.2.0/octad-input.json",
      import.meta.url,
    ),
  );
  assert.equal(schemaBytes[schemaBytes.length - 1], 10, "one trailing LF");
  assert.notEqual(schemaBytes[schemaBytes.length - 2], 10);
  const canonicalBytes = schemaBytes.subarray(0, schemaBytes.length - 1);
  assert.equal(
    createHash("sha256").update(canonicalBytes).digest("hex"),
    manifest.octadInput.canonicalSha256,
  );
  assert.equal(octadInputSchema.title, "OctadInput");
  assert.equal(octadInputSchema.additionalProperties, false);
});

test("create uses /octads and adapts a user profile's three input modalities to OctadRequest", async () => {
  assertOctadInput(PROFILE_INPUT);
  const { calls, fetchImpl } = captureJson({ id: "octad-123" }, 201);

  const created = await requestCreateOctad(
    "http://verisim.test/",
    PROFILE_INPUT,
    fetchImpl,
  );

  assert.equal(created.id, "octad-123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://verisim.test/api/v1/octads");
  assert.equal(calls[0].options.method, "POST");
  assert.ok(!calls[0].url.includes("/hexads"));
  assert.deepEqual(requestBody(calls[0]), {
    title: PROFILE_INPUT.document.title,
    body: PROFILE_INPUT.document.body,
    embedding: PROFILE_INPUT.vector.embedding,
    types: PROFILE_INPUT.semantic.types,
    metadata: PROFILE_INPUT.metadata,
  });

  // The domain user profile remains intact in document.body/metadata. Its
  // document+vector+semantic selection is the VeriSimDB modality profile.
  assert.equal(JSON.parse(requestBody(calls[0]).body).userId, "alice");
  assert.equal(requestBody(calls[0]).metadata.userId, "alice");
});

test("a listing write selects document+semantic and does not invent a vector modality", async () => {
  const input = {
    document: {
      title: "flatmate_listing london_student",
      body: '{"listingId":"listing-1"}',
    },
    semantic: { types: ["flatmate:Listing", "student:London"] },
    metadata: { entityKind: "flatmate_listing", borough: "camden" },
  };
  assertOctadInput(input);
  const { calls, fetchImpl } = captureJson({ id: "octad-listing" }, 201);

  await requestCreateOctad("http://verisim.test", input, fetchImpl);

  assert.deepEqual(requestBody(calls[0]), {
    title: input.document.title,
    body: input.document.body,
    types: input.semantic.types,
    metadata: input.metadata,
  });
  assert.equal("embedding" in requestBody(calls[0]), false);
});

test("update uses the octad route and leaves omitted modalities absent", async () => {
  const input = {
    document: { title: "replacement title", body: "replacement body" },
  };
  assertOctadInput(input);
  const { calls, fetchImpl } = captureJson({ id: "octad-123" });

  await requestUpdateOctad(
    "http://verisim.test",
    "octad-123",
    input,
    fetchImpl,
  );

  assert.equal(calls[0].url, "http://verisim.test/api/v1/octads/octad-123");
  assert.equal(calls[0].options.method, "PUT");
  assert.deepEqual(requestBody(calls[0]), {
    title: "replacement title",
    body: "replacement body",
  });
});

test("the adapter covers the other lossless OctadInput modality mappings", () => {
  const input = {
    graph: { relationships: [{ predicate: "knows", target_id: "octad-456" }] },
    tensor: { shape: [2, 2], data: [1, 2, 3, 4] },
    provenance: {
      event_type: "imported",
      actor: "contract-test",
      source: "fixture",
      description: "Contract fixture import",
    },
    spatial: {
      latitude: 51.5074,
      longitude: -0.1278,
      geometry_type: "Point",
      srid: 4326,
      properties: { city: "London" },
    },
  };
  assertOctadInput(input);

  assert.deepEqual(toOctadRequest(input), {
    relationships: [["knows", "octad-456"]],
    tensor: { shape: [2, 2], data: [1, 2, 3, 4] },
    provenance: input.provenance,
    spatial: input.spatial,
  });
});

test("unrepresentable optional data fails instead of being silently dropped", () => {
  const invalidCases = [
    { document: { title: "title", body: "body", fields: { author: "Alice" } } },
    { vector: { embedding: [0.1], model: "unrepresented-model" } },
    { semantic: { types: [], properties: { key: "unrepresented-value" } } },
  ];

  for (const input of invalidCases) {
    assertOctadInput(input);
    assert.throws(() => toOctadRequest(input), /cannot preserve/);
  }
});

test("text and vector search retain the verified v0.2.0 request/result shapes", async () => {
  const searchResults = [{
    id: "octad-123",
    score: 0.75,
    title: "encoded title",
  }];
  const text = captureJson(searchResults);
  const textResult = await requestTextSearch(
    "http://verisim.test",
    "flat mate & friends",
    25,
    text.fetchImpl,
  );

  assert.equal(
    text.calls[0].url,
    "http://verisim.test/api/v1/search/text?q=flat%20mate%20%26%20friends&limit=25",
  );
  assert.equal(text.calls[0].options.method, "GET");
  assert.equal(text.calls[0].options.body, undefined);
  assert.deepEqual(textResult, searchResults);
  assert.equal(textResult[0].title, "encoded title");

  const vector = captureJson(searchResults);
  const vectorResult = await requestVectorSearch(
    "http://verisim.test",
    [0.1, 0.2],
    5,
    vector.fetchImpl,
  );
  assert.equal(vector.calls[0].url, "http://verisim.test/api/v1/search/vector");
  assert.deepEqual(requestBody(vector.calls[0]), { vector: [0.1, 0.2], k: 5 });
  assert.deepEqual(vectorResult, searchResults);
});

test("the actual v0.2.0 error envelope is surfaced", async () => {
  const { fetchImpl } = captureJson({
    error: "Bad request: invalid vector",
    code: 400,
  }, 400);

  await assert.rejects(
    requestVectorSearch("http://verisim.test", [Number.NaN], 1, fetchImpl),
    /VerisimDB POST \/api\/v1\/search\/vector failed: Bad request: invalid vector/,
  );
});
