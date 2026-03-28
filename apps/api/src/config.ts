// SPDX-License-Identifier: PMPL-1.0-or-later
// Copyright (c) 2026 Jonathan D.A. Jewell (hyperpolymath) <j.d.a.jewell@open.ac.uk>
// Environment configuration for the flat-mate API. Reads from .env and provides typed defaults.

import { config as loadDotenv } from "https://deno.land/std@0.220.0/dotenv/mod.ts";

await loadDotenv({ export: true, allowEmptyValues: true });

const DEFAULT_PORT = 4000;
const DEFAULT_VERISIMDB_BASE = "http://127.0.0.1:8080";

const getEnv = (key: string, fallback: string) => {
  const value = Deno.env.get(key);
  return value !== undefined ? value : fallback;
};

export const config = {
  host: getEnv("HOST", "127.0.0.1"),
  port: Number(getEnv("PORT", String(DEFAULT_PORT))),
  verisimdbBaseUrl: getEnv("VERISIMDB_BASE_URL", DEFAULT_VERISIMDB_BASE),
  vectorDimension: Number(getEnv("VERISIMDB_VECTOR_DIM", "384")),
  allowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:3000"),
};
