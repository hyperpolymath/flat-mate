<!-- SPDX-License-Identifier: PMPL-1.0-or-later -->
# Contributing to flat-mate

Thank you for your interest in contributing to flat-mate. This document explains how to get started.

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) 1.40+ (API server)
- [Node.js](https://nodejs.org/) 20+ (web and mobile workspaces)
- [verisimdb](https://github.com/hyperpolymath/verisimdb) running locally on port 8080

### Clone and Set Up

```bash
# Clone the repository
git clone https://github.com/hyperpolymath/flat-mate.git
cd flat-mate

# Install web/mobile dependencies
npm install

# Configure the API
cp .env.example .env
source .env

# Start verisimdb (in another terminal)
cd /var$REPOS_DIR/verisimdb
cargo run -p verisim-api

# Start the API
deno run --watch=apps/api --allow-net --allow-env apps/api/main.ts

# Start web client
npm run dev:web
```

### Repository Structure

```
flat-mate/
├── apps/
│   ├── api/               # Deno API server (profiles, listings, swipes, matches)
│   │   └── src/           # Config, verisimdb client, repository layer
│   ├── web/               # React + Vite web client
│   │   └── src/           # Components, API wrapper, styles
│   └── mobile/            # Expo React Native mobile client
│       └── src/           # Mobile API wrapper
├── packages/
│   └── shared/            # Domain models, validation, scoring, encoding
│       └── src/           # constants, domain, encoding, index
├── docs/                  # Architecture documentation
├── .machine_readable/     # SCM state files (STATE.scm, META.scm, ECOSYSTEM.scm)
├── .well-known/           # Protocol files (security.txt, humans.txt, ai.txt)
├── .github/               # GitHub config (CODEOWNERS)
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md         # This file
├── LICENSE                 # PMPL-1.0-or-later
├── README.md
├── SECURITY.md
└── TOPOLOGY.md            # Architecture map and completion dashboard
```

---

## How to Contribute

### Reporting Bugs

**Before reporting**:
1. Search existing issues
2. Check if it's already fixed in `main`

**When reporting**:

Use the bug report template and include:

- Clear, descriptive title
- Environment details (OS, Deno version, Node version)
- Steps to reproduce
- Expected vs actual behaviour
- Logs, screenshots, or minimal reproduction

### Suggesting Features

**Before suggesting**:
1. Search existing issues and discussions
2. Consider which app layer the feature belongs to (API, web, mobile, shared)

**When suggesting**:

- Problem statement (what pain point does this solve?)
- Proposed solution
- Alternatives considered

### Your First Contribution

Look for issues labelled:

- [`good first issue`](https://github.com/hyperpolymath/flat-mate/labels/good%20first%20issue) -- Simple tasks
- [`help wanted`](https://github.com/hyperpolymath/flat-mate/labels/help%20wanted) -- Community help needed
- [`documentation`](https://github.com/hyperpolymath/flat-mate/labels/documentation) -- Docs improvements

---

## Development Workflow

### Branch Naming

```
docs/short-description       # Documentation
test/what-added              # Test additions
feat/short-description       # New features
fix/issue-number-description # Bug fixes
refactor/what-changed        # Code improvements
security/what-fixed          # Security fixes
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`

Scopes: `api`, `web`, `mobile`, `shared`, `infra`

### Code Quality

- All source files must have SPDX license headers
- Use descriptive variable names
- Add annotations and documentation to new code

---

## License

By contributing, you agree that your contributions will be licensed under the [PMPL-1.0-or-later](LICENSE).
