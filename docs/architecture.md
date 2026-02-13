# flat-mate architecture (MVP)

## Overview

`flat-mate` is a three-app monorepo:
- API (`apps/api`) provides business routes for profiles, swipes, listings, and matches.
- Web (`apps/web`) and Mobile (`apps/mobile`) consume the same API contract.
- Shared package (`packages/shared`) owns schema-like validation, compatibility scoring, and vectorization.

## Persistence model on verisimdb

Entities are stored as `hexads` using the `document` + optional `vector` modalities.

Entity kinds:
- `flatmate_profile`
- `flatmate_listing`
- `flatmate_swipe`

Payload encoding strategy:
- Add searchable tokens (`flatmate_profile`, `borough_camden`, etc.) to the hexad title.
- Append base64url payload to title for deterministic decode on read.
- Keep body as human-readable JSON for audit/debug.

This is intentionally pragmatic for current verisimdb API constraints.

## Matching flow

1. Create profile with lifestyle preferences.
2. Build deterministic 384-dim vector from profile attributes.
3. Write to verisimdb.
4. Feed endpoint uses vector search + compatibility re-score for candidate ranking.
5. Likes/dislikes are stored as `flatmate_swipe` entities.
6. Mutual likes become matches.

## Listing flow

1. User posts a listing with borough/rent details.
2. Listing is stored as `flatmate_listing` entity.
3. Listing queries use text search + API-side filters.

## Key assumptions

- Single-city launch (London) is hardcoded by design for MVP speed.
- Auth is out of scope for first instance; `userId` is client-supplied.
- verisimdb availability determines persistence.
