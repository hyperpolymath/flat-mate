; SPDX-License-Identifier: PMPL-1.0-or-later
;; guix.scm — GNU Guix package definition for flat-mate-fix
;; Usage: guix shell -f guix.scm

(use-modules (guix packages)
             (guix build-system gnu)
             (guix licenses))

(package
  (name "flat-mate-fix")
  (version "0.1.0")
  (source #f)
  (build-system gnu-build-system)
  (synopsis "flat-mate-fix")
  (description "flat-mate-fix — part of the hyperpolymath ecosystem.")
  (home-page "https://github.com/hyperpolymath/flat-mate-fix")
  (license ((@@ (guix licenses) license) "PMPL-1.0-or-later"
             "https://github.com/hyperpolymath/palimpsest-license")))
