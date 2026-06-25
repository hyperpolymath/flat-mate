<!--
SPDX-License-Identifier: CC-BY-SA-4.0
SPDX-FileCopyrightText: 2025-2026 Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
-->

Squad Audit for student house-shares: bring the friend group you already
have; `flat-mate` tells you whether it survives a lease, then drafts the
house agreement and search brief to make sure it does.

This repo includes:

- `apps/api` — Deno API using `verisimdb` as the persistence/search
  layer.

- `apps/web` — React + Vite web client.

- `apps/mobile` — Expo React Native mobile client.

- `packages/shared` — Domain models, matching/scoring rules, and
  verisimdb encoding helpers.

# Why this product (v1 = Squad Audit)

UK first-years are allocated halls; by January they must form
private-market groups of 3–6 with people they met eight weeks earlier,
with no compatibility input. No incumbent serves that moment.
`flat-mate` audits an **already-formed** group — harmony + feasibility
check, auto-drafted house agreement, search brief — and sits
**upstream** of SpareRoom and its peers. Listings are explicitly **out
of scope**: flat-mate hosts none and is not a SpareRoom rival. Target
wave: Jan–May 2027, London second years.

The earlier swipe + listings flow (v0) remains in-tree as **legacy**
code until a quarantine/removal decision. It is not the product.
Authoritative spec:
[docs/design/squad-audit-v1.adoc](docs/design/squad-audit-v1.adoc).

**What we never promise:** a "stable matching" — typically nonexistent
in roommate markets; see the theory constraints in
[docs/design/squad-audit-v1.adoc](docs/design/squad-audit-v1.adoc).

# Architecture

`flat-mate` writes entities as hexads in `verisimdb` (`POST` `/hexads`,
`GET` `/search/text`, `POST` `/search/vector`). Because current
`verisimdb` API responses are compact, the app stores encoded payloads
in searchable document titles as an MVP strategy.

The in-tree profile/listing/swipe write paths are the legacy v0 flow.
The v1 target is an epistemic-typed server: per-field governance
metadata, conceal-lattice disclosure tiers, no special-category fields
by schema construction — see the design doc. Matching rules live in
`packages/shared/src/matching/`, never in UI components.

See `docs/architecture.md`, [TOPOLOGY.md](TOPOLOGY.md), and
[EXPLAINME.adoc](EXPLAINME.adoc).

# Quick Start

1.  Start verisimdb in another terminal:

    ``` bash
    cd /var/mnt/eclipse/repos/verisimdb
    cargo run -p verisim-api
    ```

<!-- -->

1.  Install web/mobile dependencies:

    ``` bash
    cd /var/mnt/eclipse/repos/flat-mate
    npm install
    ```

<!-- -->

1.  Configure the Deno API (`deno` 1.40+ needed):

    ``` bash
    cp .env.example .env
    source .env
    ```

<!-- -->

1.  Start the API:

    ``` bash
    deno run --watch=apps/api --allow-net --allow-env apps/api/main.ts
    ```

<!-- -->

1.  Start web + mobile:

    ``` bash
    npm run dev:web
    npm run dev:mobile
    ```

# Environment

`.env`:

```bash
HOST=127.0.0.1
PORT=4000
VERISIMDB_BASE_URL=http://127.0.0.1:8080
VERISIMDB_VECTOR_DIM=384
```

Optional:
`VITE_API_BASE_URL=`[`http://127.0.0.1:4000`](http://127.0.0.1:4000)
(web),
`EXPO_PUBLIC_API_BASE_URL=`[`http://127.0.0.1:4000`](http://127.0.0.1:4000)
(Expo).

Profiles require a `.ac.uk` `studentEmail` for student verification in
the first pilot.

# Product Scope (First Instance)

- Group creation and member questionnaires, eliciting both **behaviour**
  and **tolerance** per dimension.

- Pairwise harmony audit across the group, with internal dealbreaker
  detection.

- Feasibility by budget **intersection** (`[max(mins),` `min(maxes)]`,
  never by mean).

- House-agreement draft generated from the group’s actual divergence
  points.

- Search brief to take to the listings market.

# Next Product Increments

Deferred roadmap, in liquidity order (see the design doc):

1.  Solo **top-up** discovery for groups with open slots, gated by
    conceal-lattice disclosure tiers and a mutual-consent lifecycle.

2.  Deferred-acceptance rounds for solo-joins-household — the one
    genuinely bipartite, theory-clean centralized mechanism.

3.  Calibration flywheel: anonymised outcome events so scoring weights
    become fitted rather than literature-seeded.

# License

SPDX-License-Identifier: CC-BY-SA-4.0 See [LICENSE](LICENSE).
