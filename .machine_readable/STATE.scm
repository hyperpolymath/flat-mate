;; SPDX-License-Identifier: PMPL-1.0-or-later
;; flat-mate project state tracking
(state
  (metadata
    (version "0.1.0")
    (last-updated "2026-03-02")
    (status active))
  (project-context
    (name "flat-mate")
    (purpose "London-first flatmate matching and room listings for students")
    (completion-percentage 80))
  (components
    (component "apps/api" (status "stable") (completion 100)
      (description "Deno API server with profiles, listings, swipes, matches"))
    (component "apps/web" (status "refining") (completion 80)
      (description "React + Vite web client with swipe UI and listing browser"))
    (component "apps/mobile" (status "active") (completion 60)
      (description "Expo React Native mobile client with tab navigation"))
    (component "packages/shared" (status "stable") (completion 100)
      (description "Domain models, validation, compatibility scoring, verisimdb encoding")))
  (current-position
    (milestone "MVP")
    (next-actions
      (action "University email verification (.ac.uk)")
      (action "Safety workflows (reporting, blocklist)")
      (action "Built-in chat and viewing scheduler"))))
