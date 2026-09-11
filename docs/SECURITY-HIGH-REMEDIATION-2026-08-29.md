# Marketplace HIGH dependency remediation — 29 Aug 2026

Status: VALIDATION IN PROGRESS / EVIDENCE-FIRST

This change addresses compatible transitive dependency paths without forcing a major thirdweb migration.

- `ip-address` is overridden to `10.3.1`.
- `ws` uses the direct dependency version through the npm `$ws` override, allowing the exact lockfile to resolve the current compatible patched release.
- The regenerated lockfile resolves top-level `ws` to `8.21.3` and removes older nested `ws` copies in the affected dependency tree.
- `tar` remains pinned to the previously remediated `7.5.22` override.

Release rule: do not merge this remediation solely because the dependency tree changed. The exact lockfile must install successfully and CI/security evidence must complete. Remaining HIGH findings, if any, stay open for separate triage; this document is not a vulnerability-free declaration.
