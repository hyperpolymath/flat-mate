<!-- SPDX-License-Identifier: PMPL-1.0-or-later -->
# flat-mate

London-first flatmate matching + room listings for students.

This repo includes:
- `apps/api`: Node API using `verisimdb` as the persistence/search layer.
- `apps/web`: React + Vite web client.
- `apps/mobile`: Expo React Native mobile client.
- `packages/shared`: Domain models, compatibility scoring, and verisimdb encoding helpers.

## Why this MVP

Student renters in London need two things at once:
- `matching`: who to live with.
- `listing`: where to live.

`flat-mate` handles both in one flow, with profile compatibility and listing discovery centered around London boroughs and universities.

## Architecture

`flat-mate` writes profiles, listings, and swipe events as hexads in `verisimdb`:
- `POST /hexads` for writes.
- `GET /search/text` to retrieve encoded entities.
- `POST /search/vector` for compatibility feed ranking.

Because current `verisimdb` API responses are compact, the app stores encoded payloads in searchable document titles as an MVP strategy.

See `docs/architecture.md`.

## Quick start

1. Start verisimdb in another terminal:

```bash
cd /var/mnt/eclipse/repos/verisimdb
cargo run -p verisim-api
```

2. Install web/mobile dependencies:

```bash
cd /var/mnt/eclipse/repos/flat-mate
npm install
```

3. Configure the Deno API (`deno` 1.40+ needed):

```bash
cp .env.example .env
source .env
```

4. Start the API:

```bash
deno run --watch=apps/api --allow-net --allow-env apps/api/main.ts
```

5. Start web + mobile:

```bash
npm run dev:web
npm run dev:mobile
```

## Environment

`.env`:

```bash
HOST=127.0.0.1
PORT=4000
VERISIMDB_BASE_URL=http://127.0.0.1:8080
VERISIMDB_VECTOR_DIM=384
```

Web can optionally use:

```bash
VITE_API_BASE_URL=http://127.0.0.1:4000
```

Expo can optionally use:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
```

Profiles require a `.ac.uk` `studentEmail` today so the API can enforce student verification for the first pilot.

## Product scope in first instance

- Student profile creation with compatibility preferences.
- Swipe-style profile matching.
- Listing creation and browsing.
- Match discovery from mutual likes.

## Next product increments

- University email verification (`.ac.uk`).
- Safety workflows (reporting, blocklist, check-in sharing).
- Built-in chat and viewing scheduler.


## Architecture

See [TOPOLOGY.md](TOPOLOGY.md) for a visual architecture map and completion dashboard.
