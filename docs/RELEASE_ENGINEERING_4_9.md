# Nova_A 4.9 release engineering and 5.0 RC freeze

The 5.0 release-candidate freeze opens with 4.9.0. Project Format 2/schema 29, Rhai API v2, Plugin API 2, package manifest 1, Build CLI 1, platform tiers and the eleven-file release format are frozen. Only release-blocking corrections, documentation and evidence corrections are accepted.

The minimum observation period is 14 calendar days. Opening the clock is not approval: every accepted correction repeats affected suites and updates evidence. Severity 0 and 1 must be zero before 5.0 approval.

`pnpm release:v4.9` is the local pipeline entry. It restores pinned dependencies, runs regression/security/license/documentation/migration/package/source-control/reproducibility checks, builds web/native artifacts, records evidence, creates the exact eleven root artifacts and independently verifies hashes/contents. External signing and disposable clean-machine steps remain separate operator gates.

Required evidence includes platform and browser matrices, install/upgrade/repair/uninstall results, reproducibility comparison, package tamper/permission/rollback/offline/malicious-archive tests, source-control fixtures, documentation validation, security/license reports, pipeline dry run and RC sign-off status.

Diagnostic bundle export is local and privacy-gated. Project identifiers and absolute paths are opt-in; source, credentials, signing identities and save data are excluded. Nova_A never uploads automatically.
