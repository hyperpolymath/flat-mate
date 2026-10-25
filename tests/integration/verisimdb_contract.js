// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// Opt-in live integration test. Run explicitly against the v0.2.0 checkout;
// this file is intentionally not matched by Bun's default *.test discovery.

import { strict as assert } from "node:assert";
import { test } from "bun:test";
import {
  requestCreateOctad,
  requestTextSearch,
  requestUpdateOctad,
  requestVectorSearch,
  VERISIMDB_CONTRACT,
} from "../../apps/api/src/verisimTransport.js";

const baseUrl = Bun.env.VERISIMDB_BASE_URL;
const attestedCommit = Bun.env.VERISIMDB_CONTRACT_COMMIT;

if (!baseUrl) {
  throw new Error(
    "Set VERISIMDB_BASE_URL to the pinned VeriSimDB test server.",
  );
}
if (attestedCommit !== VERISIMDB_CONTRACT.serverCommit) {
  throw new Error(
    `Start VeriSimDB at ${VERISIMDB_CONTRACT.serverTag} (${VERISIMDB_CONTRACT.serverCommit}) ` +
      "and set VERISIMDB_CONTRACT_COMMIT to that full commit. The health endpoint cannot attest a Git commit.",
  );
}

test("live v0.2.0 OctadInput -> OctadRequest -> search round trip", async () => {
  const health = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/v1/health`);
  assert.equal(health.status, 200, "pinned VeriSimDB health endpoint");
  await health.body?.cancel();

  const token = `contract${Date.now()}`;
  const userId = `user-${token}`;
  const originalTitle = `flatmate_profile london_student ${token} original`;
  const updatedTitle = `flatmate_profile london_student ${token} updated`;
  const embedding = Array.from(
    { length: 384 },
    (_, index) => index === 0 ? 1 : 0,
  );
  let octadId;

  try {
    const created = await requestCreateOctad(baseUrl, {
      document: {
        title: originalTitle,
        body: JSON.stringify({ userId, name: "Contract Test" }),
      },
      vector: { embedding },
      semantic: { types: ["flatmate:Profile", "student:London"] },
      metadata: { entityKind: "flatmate_profile", userId },
    });

    octadId = created.id;
    assert.equal(typeof octadId, "string");
    assert.equal(
      created.has_document,
      true,
      "document must not be dropped by the REST adapter",
    );
    assert.equal(
      created.has_vector,
      true,
      "vector must not be dropped by the REST adapter",
    );
    assert.equal(
      created.has_semantic,
      true,
      "semantic types must not be dropped by the REST adapter",
    );

    const textResults = await requestTextSearch(baseUrl, token, 100);
    const textHit = textResults.find((result) => result.id === octadId);
    assert.ok(textHit, "created octad must be visible through text search");
    assert.equal(textHit.title, originalTitle);
    assert.equal(typeof textHit.score, "number");

    const vectorResults = await requestVectorSearch(baseUrl, embedding, 100);
    const vectorHit = vectorResults.find((result) => result.id === octadId);
    assert.ok(vectorHit, "created octad must be visible through vector search");
    assert.equal(vectorHit.title, originalTitle);

    const updated = await requestUpdateOctad(baseUrl, octadId, {
      document: {
        title: updatedTitle,
        body: JSON.stringify({ userId, name: "Contract Test Updated" }),
      },
    });
    assert.equal(updated.id, octadId);
    assert.equal(updated.has_document, true);

    const updatedResults = await requestTextSearch(baseUrl, token, 100);
    assert.equal(
      updatedResults.find((result) => result.id === octadId)?.title,
      updatedTitle,
    );

    // OctadResponse flags describe the returned modality payloads, not all
    // modalities retained by the store. Verify partial-update retention by
    // searching with the omitted vector instead of relying on those flags.
    const retainedVectorResults = await requestVectorSearch(
      baseUrl,
      embedding,
      100,
    );
    const retainedVectorHit = retainedVectorResults.find((result) =>
      result.id === octadId
    );
    assert.ok(
      retainedVectorHit,
      "document-only update must retain the vector modality",
    );
    assert.equal(retainedVectorHit.title, updatedTitle);
  } finally {
    if (octadId) {
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/api/v1/octads/${
          encodeURIComponent(octadId)
        }`,
        { method: "DELETE" },
      );
      assert.equal(
        response.status,
        204,
        "contract test must clean up its octad",
      );
      await response.body?.cancel();
    }
  }
});
