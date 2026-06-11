// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
// HTTP client for the verisimdb API. Wraps hexad CRUD, text search, and vector search endpoints.

export class VerisimClient {
  constructor(private options: { baseUrl: string }) {}

  private baseUrl() {
    return this.options.baseUrl.replace(/\/$/, "");
  }

  async createHexad(payload: unknown) {
    return await this.request("POST", "/api/v1/hexads", payload);
  }

  async updateHexad(id: string, payload: unknown) {
    return await this.request("PUT", `/api/v1/hexads/${id}`, payload);
  }

  async textSearch(query: string, limit = 100) {
    const q = encodeURIComponent(query);
    const path = `/api/v1/search/text?q=${q}&limit=${limit}`;
    return await this.request("GET", path);
  }

  async vectorSearch(vector: number[], k = 15) {
    return await this.request("POST", "/api/v1/search/vector", { vector, k });
  }

  private async request(method: string, path: string, payload?: unknown) {
    const url = `${this.baseUrl()}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.error ?? response.statusText;
      throw new Error(`VerisimDB ${method} ${path} failed: ${message}`);
    }

    return data;
  }
}
