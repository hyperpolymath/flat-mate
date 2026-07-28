; SPDX-License-Identifier: MPL-2.0
;; guix.scm — GNU Guix package definition for flat-mate
;; Usage: guix shell -f guix.scm

(use-modules (guix packages)
             (guix build-system gnu)
             (guix licenses))

(package
  (name "flat-mate")
  (version "0.1.0")
  (source #f)
  (build-system gnu-build-system)
  (synopsis "flat-mate")
  (description "flat-mate — part of the hyperpolymath ecosystem.")
  (home-page "https://github.com/hyperpolymath/flat-mate")
  (license ((@@ (guix licenses) license) "PMPL-1.0-or-later"
             "https://github.com/hyperpolymath/palimpsest-license")))
