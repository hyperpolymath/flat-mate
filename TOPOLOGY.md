<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- TOPOLOGY.md — Project architecture map and completion dashboard -->
<!-- Last updated: 2026-02-19 -->

# flat-mate — Project Topology

## System Architecture

```
                        ┌─────────────────────────────────────────┐
                        │              STUDENT USERS              │
                        │        (Web App / Mobile App)           │
                        └──────────┬───────────────────┬──────────┘
                                   │                   │
                                   ▼                   ▼
                        ┌───────────────────┐  ┌───────────────────┐
                        │ REACT WEB CLIENT  │  │ EXPO MOBILE APP   │
                        │ (Vite, Tailwind)  │  │ (React Native)    │
                        └──────────┬────────┘  └──────────┬────────┘
                                   │                      │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                        ┌─────────────────────────────────────────┐
                        │           API LAYER (DENO/NODE)         │
                        │    (Entity Matching, Auth, Listings)    │
                        └──────────┬───────────────────┬──────────┘
                                   │                   │
                                   ▼                   ▼
                        ┌───────────────────────┐  ┌────────────────────────────────┐
                        │ SHARED PACKAGE        │  │ VERISIMDB INTERFACE            │
                        │ - Domain Models       │  │ - Hexad encoding               │
                        │ - Compatibility Logic │  │ - Vector/Text search           │
                        └──────────┬────────────┘  └──────────┬─────────────────────┘
                                   │                          │
                                   └────────────┬─────────────┘
                                                ▼
                        ┌─────────────────────────────────────────┐
                        │             PERSISTENCE LAYER           │
                        │      (verisimdb - Vector Search)        │
                        └─────────────────────────────────────────┘

                        ┌─────────────────────────────────────────┐
                        │          REPO INFRASTRUCTURE            │
                        │  Deno-first API     .machine_readable/  │
                        │  npm Monorepo       .ac.uk Verification │
                        └─────────────────────────────────────────┘
```

## Completion Dashboard

```
COMPONENT                          STATUS              NOTES
─────────────────────────────────  ──────────────────  ─────────────────────────────────
APPLICATIONS
  apps/api (Deno/Node)              ██████████ 100%    Matching & listing logic stable
  apps/web (React/Vite)             ████████░░  80%    UI components refining
  apps/mobile (Expo)                ██████░░░░  60%    Initial mobile views active

CORE LOGIC
  packages/shared                   ██████████ 100%    Domain models verified
  Compatibility Scoring             ████████░░  80%    Ranking algorithm refining
  verisimdb integration             ██████████ 100%    Hexad read/write verified

DATA & SEARCH
  Vector Search Feed                ████████░░  80%    Embedding ranking stable
  Text Search (Titles)              ██████████ 100%    Entity retrieval verified
  Email Verification (.ac.uk)       ██████░░░░  60%    Pilot enforcement active

REPO INFRASTRUCTURE
  npm Workspace (Monorepo)          ██████████ 100%    Inter-app dependencies stable
  .machine_readable/                ██████████ 100%    STATE tracking active
  Environment Config                ██████████ 100%    .env.example verified

─────────────────────────────────────────────────────────────────────────────
OVERALL:                            ████████░░  ~80%   MVP stable, mobile maturing
```

## Key Dependencies

```
User Profile ───► Hexad Encoding ───► verisimdb (Write)
     │                 │                   │
     ▼                 ▼                   ▼
Matching UI ◄───► API Layer ◄───────► Vector Search
```

## Update Protocol

This file is maintained by both humans and AI agents. When updating:

1. **After completing a component**: Change its bar and percentage
2. **After adding a component**: Add a new row in the appropriate section
3. **After architectural changes**: Update the ASCII diagram
4. **Date**: Update the `Last updated` comment at the top of this file

Progress bars use: `█` (filled) and `░` (empty), 10 characters wide.
Percentages: 0%, 10%, 20%, ... 100% (in 10% increments).
