// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// VeriSimDB v0.2.0 REST transport. See docs/verisimdb-contract.adoc.

export const VERISIMDB_CONTRACT = Object.freeze({
  serverTag: "v0.2.0",
  serverCommit: "10f8a21f4d0f2eacce84eee29e504f66fbe9e332",
  apiPrefix: "/api/v1",
  inputSchema: "OctadInput",
  wireRequest: "OctadRequest",
});

const INPUT_KEYS = [
  "graph",
  "vector",
  "tensor",
  "semantic",
  "document",
  "provenance",
  "spatial",
  "metadata",
];

const present = (value) => value !== undefined && value !== null;

function record(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `${path} must be an object for ${VERISIMDB_CONTRACT.serverTag}.`,
    );
  }
  return value;
}

function onlyKeys(value, allowed, path) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(
        `${path}.${key} is not in the pinned ${VERISIMDB_CONTRACT.serverTag} contract.`,
      );
    }
  }
}

function strings(value, path) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${path} must be an array of strings.`);
  }
  return [...value];
}

function stringMap(value, path) {
  record(value, path);
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") {
      throw new Error(`${path}.${key} must be a string.`);
    }
  }
  return { ...value };
}

function numbers(value, path) {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "number" || !Number.isFinite(item))
  ) {
    throw new Error(`${path} must be an array of finite numbers.`);
  }
  return [...value];
}

/**
 * Convert the published OctadInput data schema to the flat OctadRequest that
 * the v0.2.0 REST handler actually deserializes. Do not post OctadInput
 * directly to that release: unknown nested fields are ignored by Serde.
 */
export function toOctadRequest(input) {
  record(input, "OctadInput");
  onlyKeys(input, INPUT_KEYS, "OctadInput");
  const output = {};

  if (present(input.document)) {
    const document = record(input.document, "OctadInput.document");
    onlyKeys(document, ["title", "body", "fields"], "OctadInput.document");
    if (
      typeof document.title !== "string" || typeof document.body !== "string"
    ) {
      throw new Error(
        "OctadInput.document requires string title and body fields.",
      );
    }
    if (
      document.fields !== undefined &&
      Object.keys(stringMap(document.fields, "OctadInput.document.fields"))
        .length
    ) {
      throw new Error(
        "VeriSimDB v0.2.0 OctadRequest cannot preserve document.fields.",
      );
    }
    output.title = document.title;
    output.body = document.body;
  }

  if (present(input.vector)) {
    const vector = record(input.vector, "OctadInput.vector");
    onlyKeys(vector, ["embedding", "model"], "OctadInput.vector");
    if (vector.model !== undefined) {
      throw new Error(
        "VeriSimDB v0.2.0 OctadRequest cannot preserve vector.model.",
      );
    }
    output.embedding = numbers(vector.embedding, "OctadInput.vector.embedding");
  }

  if (present(input.tensor)) {
    const tensor = record(input.tensor, "OctadInput.tensor");
    onlyKeys(tensor, ["shape", "data"], "OctadInput.tensor");
    if (
      !Array.isArray(tensor.shape) ||
      tensor.shape.some((n) => !Number.isInteger(n) || n < 0)
    ) {
      throw new Error(
        "OctadInput.tensor.shape must contain non-negative integers.",
      );
    }
    output.tensor = {
      shape: [...tensor.shape],
      data: numbers(tensor.data, "OctadInput.tensor.data"),
    };
  }

  if (present(input.semantic)) {
    const semantic = record(input.semantic, "OctadInput.semantic");
    onlyKeys(semantic, ["types", "properties"], "OctadInput.semantic");
    if (
      semantic.properties !== undefined &&
      Object.keys(
        stringMap(semantic.properties, "OctadInput.semantic.properties"),
      ).length
    ) {
      throw new Error(
        "VeriSimDB v0.2.0 OctadRequest cannot preserve semantic.properties.",
      );
    }
    output.types = semantic.types === undefined
      ? []
      : strings(semantic.types, "OctadInput.semantic.types");
  }

  if (present(input.graph)) {
    const graph = record(input.graph, "OctadInput.graph");
    onlyKeys(graph, ["relationships"], "OctadInput.graph");
    if (!Array.isArray(graph.relationships)) {
      throw new Error("OctadInput.graph.relationships must be an array.");
    }
    output.relationships = graph.relationships.map((relationship, index) => {
      const path = `OctadInput.graph.relationships[${index}]`;
      record(relationship, path);
      onlyKeys(relationship, ["predicate", "target_id"], path);
      if (
        typeof relationship.predicate !== "string" ||
        typeof relationship.target_id !== "string"
      ) {
        throw new Error(
          `${path} requires string predicate and target_id fields.`,
        );
      }
      return [relationship.predicate, relationship.target_id];
    });
  }

  if (present(input.provenance)) {
    const provenance = record(input.provenance, "OctadInput.provenance");
    onlyKeys(
      provenance,
      ["event_type", "actor", "source", "description"],
      "OctadInput.provenance",
    );
    output.provenance = { ...provenance };
  }

  if (present(input.spatial)) {
    const spatial = record(input.spatial, "OctadInput.spatial");
    onlyKeys(
      spatial,
      [
        "latitude",
        "longitude",
        "altitude",
        "geometry_type",
        "srid",
        "properties",
      ],
      "OctadInput.spatial",
    );
    output.spatial = { ...spatial };
    if (spatial.properties !== undefined) {
      output.spatial.properties = stringMap(
        spatial.properties,
        "OctadInput.spatial.properties",
      );
    }
  }

  if (input.metadata !== undefined) {
    output.metadata = stringMap(input.metadata, "OctadInput.metadata");
  }

  return output;
}

async function request(baseUrl, method, path, payload, fetchImpl) {
  const fetcher = fetchImpl ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new Error(
      "A Fetch API implementation is required for VeriSimDB requests.",
    );
  }

  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  const response = await fetcher(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new Error(`VerisimDB ${method} ${path} returned invalid JSON.`);
      }
    }
  }

  if (!response.ok) {
    const message = (data?.error ?? data?.message ?? text) ||
      response.statusText;
    throw new Error(`VerisimDB ${method} ${path} failed: ${message}`);
  }
  return data;
}

export function requestCreateOctad(baseUrl, payload, fetchImpl) {
  return request(
    baseUrl,
    "POST",
    "/api/v1/octads",
    toOctadRequest(payload),
    fetchImpl,
  );
}

export function requestUpdateOctad(baseUrl, id, payload, fetchImpl) {
  const path = `/api/v1/octads/${encodeURIComponent(id)}`;
  return request(baseUrl, "PUT", path, toOctadRequest(payload), fetchImpl);
}

export function requestTextSearch(baseUrl, query, limit = 100, fetchImpl) {
  const q = encodeURIComponent(query);
  return request(
    baseUrl,
    "GET",
    `/api/v1/search/text?q=${q}&limit=${limit}`,
    undefined,
    fetchImpl,
  );
}

export function requestVectorSearch(baseUrl, vector, k = 15, fetchImpl) {
  return request(
    baseUrl,
    "POST",
    "/api/v1/search/vector",
    { vector, k },
    fetchImpl,
  );
}
