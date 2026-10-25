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

/** Treat null and undefined as omitted modality values. */
const present = (value) => value !== undefined && value !== null;

/** Return value unchanged; reject null, arrays and non-objects with a path-labelled Error. */
function record(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `${path} must be an object for ${VERISIMDB_CONTRACT.serverTag}.`,
    );
  }
  return value;
}

/** Throw a path-labelled Error for an enumerable own string key absent from allowed. */
function onlyKeys(value, allowed, path) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(
        `${path}.${key} is not in the pinned ${VERISIMDB_CONTRACT.serverTag} contract.`,
      );
    }
  }
}

/** Copy a string array, or throw a path-labelled Error for invalid input. */
function strings(value, path) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${path} must be an array of strings.`);
  }
  return [...value];
}

/** Copy string-valued own enumerable entries; throw a path-labelled Error for invalid input. */
function stringMap(value, path) {
  record(value, path);
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") {
      throw new Error(`${path}.${key} must be a string.`);
    }
  }
  return { ...value };
}

/** Copy a finite-number array, or throw a path-labelled Error for invalid input. */
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
 * the v0.2.0 REST handler actually deserialises. Do not post OctadInput
 * directly to that release: unknown nested fields are ignored by Serde.
 *
 * Returns a new request object, omitting null or undefined modalities. A present
 * semantic block without types emits an empty types array. This is an adapter,
 * not a complete schema validator; provenance and spatial values are otherwise
 * forwarded without validation, except for spatial.properties.
 *
 * Throws an Error for unknown keys, invalid checked fields, non-empty
 * document.fields or semantic.properties, or any defined vector.model.
 * Metadata, when supplied, must be an object of string values.
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

/**
 * Send JSON to a path relative to the server root, ignoring trailing baseUrl slashes.
 * fetchImpl overrides globalThis.fetch; an undefined payload omits the body.
 * Resolves to parsed response JSON, or null for an empty successful response.
 *
 * Rejects when Fetch is unavailable, an HTTP status is unsuccessful, or a
 * successful response contains invalid JSON. Unsuccessful responses use their
 * JSON error/message, raw text (including invalid JSON), or status text as the
 * error message. Fetch, response-reading and JSON serialisation errors propagate.
 */
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

/**
 * Create an octad from nested OctadInput at the server root baseUrl.
 * Throws synchronously if toOctadRequest rejects the payload. Returns the
 * request promise with parsed JSON (or null for an empty body); {@link request} errors
 * propagate. fetchImpl optionally replaces globalThis.fetch.
 */
export function requestCreateOctad(baseUrl, payload, fetchImpl) {
  return request(
    baseUrl,
    "POST",
    "/api/v1/octads",
    toOctadRequest(payload),
    fetchImpl,
  );
}

/**
 * Update an octad by URL-encoded id using nested OctadInput; omitted modalities
 * are absent from the request. baseUrl is the server root; fetchImpl optionally
 * replaces globalThis.fetch. Payload adaptation and id encoding errors throw
 * synchronously. Returns the request promise with parsed JSON (or null for an
 * empty body), propagating {@link request} errors.
 */
export function requestUpdateOctad(baseUrl, id, payload, fetchImpl) {
  const path = `/api/v1/octads/${encodeURIComponent(id)}`;
  return request(baseUrl, "PUT", path, toOctadRequest(payload), fetchImpl);
}

/**
 * Search text at the server root baseUrl, passing limit through without validation.
 * Resolves to the server's JSON results unchanged, or null for an empty body.
 * Query encoding errors throw synchronously; {@link request} errors propagate through
 * the returned promise. fetchImpl optionally replaces globalThis.fetch.
 */
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

/**
 * Search by vector at the server root baseUrl, requesting k neighbours without
 * validating vector or k locally. Resolves to the server's JSON results unchanged,
 * or null for an empty body. {@link request} errors propagate through the returned
 * promise. fetchImpl optionally replaces globalThis.fetch.
 */
export function requestVectorSearch(baseUrl, vector, k = 15, fetchImpl) {
  return request(
    baseUrl,
    "POST",
    "/api/v1/search/vector",
    { vector, k },
    fetchImpl,
  );
}
