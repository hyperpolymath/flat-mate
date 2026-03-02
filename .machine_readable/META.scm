;; SPDX-License-Identifier: PMPL-1.0-or-later
;; flat-mate project metadata
(meta
  (metadata
    (version "0.1.0")
    (last-updated "2026-03-02"))
  (project-info
    (type monorepo)
    (languages (typescript javascript jsx css html))
    (runtime (deno node expo))
    (license "PMPL-1.0-or-later")
    (author "Jonathan D.A. Jewell")
    (persistence "verisimdb"))
  (architecture-decisions
    (adr "verisimdb-hexads"
      (status accepted)
      (description "Store all entities as verisimdb hexads with base64url-encoded payloads in titles"))
    (adr "london-first"
      (status accepted)
      (description "Single-city launch hardcoded for London to reduce MVP scope"))
    (adr "client-supplied-auth"
      (status accepted)
      (description "userId is client-supplied; auth deferred to post-MVP"))))
