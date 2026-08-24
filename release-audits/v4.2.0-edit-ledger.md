# Nova_A 4.2.0 edit ledger

Release date: 23 August 2026. Source: 7f753cb065aff42cef63361765cfefedbd5f72e1 (main, Release3.0.0(2026.08.16)-2-g7f753cb-dirty). Pipeline: compiler → v4.2 audit/verification → Rust format/lint/tests → WASM/web → layout → Tauri → isolated Windows smoke → evidence → package/hash verification.

## Every material edit

| Change | Files/subsystem | User-visible consequence | Removal | Evidence |
| --- | --- | --- | --- | --- |
| Transaction service and native atomic folder commit | projectTransactions, physics save, Tauri command | Safe classified saves and journals | Direct bypass save deprecated | fault/*, tests/* |
| Canonical data, authored/generated split, validator and semantic diff | projectData, Project Health | Stable no-op saves and reviewable changes | Unstable/path identity deprecated | determinism/* |
| Central command history and mutation router | commands, physics, UndoHistoryPanel, stable controls | Named grouped history and consistent dirty state | None | coverage/*, undo report |
| Recovery and migration | recovery, RecoveryCenter, projectUpgrade/Manager | Explicit recovery/conflict choices, dry-run/backup/rollback | Silent migration removed | recovery/*, migration/* |
| Project repair/trash/external/archive/locking | Project Health, projectTrash, external changes, projectArchive, team workflow | Repair preview, reversible delete, safe imports and conflicts | Permanent delete no longer default | external/*, tests/* |
| Template persisted metadata | templates | New template projects pass strict save validation | None | SER/TX verification |
| Localization/manual/readmes/specifications | i18n, manual, README, docs | Complete English/German/Chinese workflows | None | coverage/* |
| Version/release automation/reference fixtures | manifests, Cargo/pnpm locks, scripts, references | Exact 4.2 identity and 11 artifacts | None | build/*, evidence manifest |

No feature or animation was removed. Generated automation created the schema 5–29 fixture pairs, machine reports, evidence tree, release notes/ledger, archives, manifests, and SHA-256 files. No issue/PR, external test, signature, scan, or approval is fabricated. Project schema and public APIs did not change; dependencies and package permissions did not change in v4.2. This ledger matches the source tree and RELEASE_NOTES.md.
