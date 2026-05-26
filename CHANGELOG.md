<!--
SPDX-License-Identifier: MPL-2.0
SPDX-FileCopyrightText: 2026 Jonathan D.A. Jewell (hyperpolymath)
-->

# Changelog

All notable changes to `flat-mate` will be documented in this file.

This file is generated from conventional commits by the
[`changelog-reusable.yml`](https://github.com/hyperpolymath/standards/blob/main/.github/workflows/changelog-reusable.yml)
workflow (`hyperpolymath/standards#206`). Adopt the workflow in this repo's CI to keep this file in sync automatically — see
[`templates/cliff.toml`](https://github.com/hyperpolymath/standards/blob/main/templates/cliff.toml)
for the canonical config.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- feat(crg): add crg-grade and crg-badge justfile recipes
- feat: add stapeln.toml container definition
- feat: add UX Justfile with doctor, tour, help-me, assail recipes
- feat: deploy UX Manifesto infrastructure
- feat: deploy UX Manifesto infrastructure
- feat: add CLADE.a2ml — clade taxonomy declaration
- feat: add mirror.yml workflow for GitLab/Bitbucket mirroring
- feat: initial commit — flat-mate student flatsharing MVP

### Fixed

- fix(ci): sync hypatia-scan.yml to canonical (kill cd-scanner build drift) (#9)
- fix(ci): adopt canonical hypatia-scan.yml (env.HOME/scanner-layout + Comment-step gate) (#8)
- fix: EXPLAINME.adoc — quote README claims, brief format, evidence table
- fix: EXPLAINME.adoc — quote README claims, brief format, evidence table
- fix(api): replace wildcard CORS with configurable origin
- fix: RSR compliance — fix SPDX, resolve 60+ template placeholders, rewrite stale SCM

### Changed

- refactor: migrate 6SCM → 6A2 (.scm → .a2ml format)

### Documentation

- docs: record tech-debt audit findings (2026-05-26) (#11)
- docs(claude): add CLAUDE.md with TypeScript Exemptions table (#7)
- docs: add TEST-NEEDS.md (CRG C)
- docs: restore README.md lost in Floor Raise campaign

### CI

- ci: deploy dogfood-gate, fix hypatia-scan, add pre-commit hooks
- ci: migrate CodeQL Action v3 → v4
- ci: update SHA pins for codeql-action and trufflehog
- ci: deploy missing standard workflows (10 added)

## Pre-history

Prior commits to this file's introduction are recorded in git history but not formally classified into Keep-a-Changelog sections. To backfill, run `git cliff -o CHANGELOG.md` locally using the canonical [`cliff.toml`](https://github.com/hyperpolymath/standards/blob/main/templates/cliff.toml) — this is one-shot mechanical work.

---

<!-- This file was seeded by the 2026-05-26 estate tech-debt audit follow-up (Row-2 Phase 3); see [`hyperpolymath/standards/docs/audits/2026-05-26-estate-documentation-debt.md`](https://github.com/hyperpolymath/standards/blob/main/docs/audits/2026-05-26-estate-documentation-debt.md). -->
