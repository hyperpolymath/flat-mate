;; SPDX-License-Identifier: PMPL-1.0-or-later
;; flat-mate ecosystem positioning
(ecosystem
  (metadata
    (version "0.1.0")
    (last-updated "2026-03-02"))
  (project
    (name "flat-mate")
    (purpose "London-first flatmate matching and room listings for students")
    (role consumer-application))
  (related-projects
    (dependency "verisimdb"
      (type persistence-layer)
      (relationship primary-dependency)
      (description "Vector and text search database for entity storage"))
    (sibling "nextgen-databases"
      (type monorepo)
      (relationship parent-ecosystem)
      (description "Contains verisimdb and related database projects"))))
