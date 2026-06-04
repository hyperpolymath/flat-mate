<!--
SPDX-License-Identifier: MPL-2.0
Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->
# CLAUDE.md

Repository-specific guidance for AI agents working in this repo. See the org-wide standard guidance in standards/.

### TypeScript Exemptions (Approved)

The hyperpolymath "no new TypeScript" policy has the following approved exemptions in this repo. These are *not* policy violations — they are documented carve-outs.

| Path | Files | Rationale | Unblock condition |
|---|---|---|---|
| `apps/api/main.ts` | 1 | Express-style API service entry point; node-native HTTP framework. | AffineScript Node-target codegen (affinescript#35) + Express bindings. |
| `apps/api/src/config.ts` | 1 | API service config loader; node fs + dotenv. | AffineScript Node-target (#35) + config-load bindings. |
| `apps/api/src/repository.ts` | 1 | API service data-access layer; node DB driver. | AffineScript Node-target (#35) + DB driver bindings. |
| `apps/api/src/verisimClient.ts` | 1 | API service client for VerisimDB; node-native HTTP client. | AffineScript HTTP client + VerisimDB SDK. |

Adding to this list requires explicit user approval and an unblock condition. New TypeScript files outside this list are blocked by the RSR antipattern check.
