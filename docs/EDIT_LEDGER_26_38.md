# Nova_A 26.38 — Every edit and consequence

This ledger compares the protected starting filesystem baseline of this task with the 26.38 source that the release snapshot freezes. It does not claim earlier uncommitted work, earlier releases or user-revoked files.

The deterministic path-level manifest is the frozen release source snapshot under `.cache/release-snapshots/v26.38-*/snapshot.json`. It records the per-path SHA-256 and byte count of every packaged source file and an aggregate `sourceInputDigest`; that digest, this ledger and the packaged source archive are bound by the final immutable snapshot.

Scope note: this release is maintenance of the release pipeline plus the defects found while verifying the current tree. Editor behaviour, project format 2/schema 29, gameplay, rendering, input, audio and the exact eleven-file release contract are unchanged.

## Files changed or added — every source file

- `Cargo.lock` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `Cargo.toml` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `src-tauri/Cargo.lock` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `src-tauri/Cargo.toml` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `src-tauri/tauri.conf.json` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `src/projects/projectFormat.ts` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `crates/nova_format/src/lib.rs` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `tests/fixtures/migrations/public-schema-expected.json` — Synchronize the 26.38 / 26.38.0 version authority. Dependencies, project format 2/schema 29 and the runtime implementation are unchanged.
- `nova_core/pkg/package.json` — Generated WASM package identity follows the engine authority. This path is a build output and is excluded from the packaged source archive.
- `crates/nova_runtime/src/lib.rs` — rustfmt-only normalization of the current uncommitted runtime work. No statement, signature, literal, ordering or behaviour change.
- `crates/nova_wasm/src/lib.rs` — rustfmt-only normalization of the current uncommitted WASM boundary work. No statement, signature, literal, ordering or behaviour change.
- `crates/nova_script/src/lib.rs` — rustfmt normalization plus the closure of one clippy::possible_missing_else finding: the two epoch/revision guards in execute_instance_context moved onto separate lines inside the same block. Same guards, same order, same error strings, same borrow scope.
- `scripts/lib/browserUserAudit.mjs` — Accept the current and later calendar labels (26.38 and above) instead of refusing anything after 26.37, and expose the resolved release to the audit task so evidence filenames follow the actual run. Real pointer clicks now verify that the topmost element at the measured point is the intended control (or the canvas that renders canvas-drawn UI), escalate the scroll to the viewport centre only when the control is genuinely covered, and otherwise fail with the covering element and exact geometry instead of silently activating a different control.
- `scripts/lib/milestoneAuditContext.mjs` — Same label ceiling widening for the shared audit context; the integrated-regression error text now names the widened 26.20–26.39 range.
- `scripts/verify-v26.36-branding-assets.mjs` — Retain 26.38 in the branding retention targets. The historical negative controls now resolve from a documented candidate list and, when the packaged 26.35 executables are absent, derive an equivalent controlled corruption from the freshly parsed PE group and record the substitution instead of silently skipping the control.
- `scripts/verify-ui-rebuild-layout-user.mjs` — Lift the release label out of the evidence gallery filename and HTML title so the layout evidence follows the actual qualification run rather than a fixed 26.37 literal.
- `scripts/release-source-snapshot.mjs` — Exclude the `.dsh` agent-tooling directory from the release source inventory. It holds harness-provided skill files, is not Nova_A source, and must not enter the packaged source archive or its evidence digest.
- `scripts/check-windows-prerequisites.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Script logic is unchanged.
- `scripts/package-release.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Mirror the `.dsh` exclusion in the packaging-side path filter so the frozen snapshot and the packaged source archive agree. Reference-project authority is now read with a small top-level scalar reader instead of ConvertFrom-Json, because the pinned Windows PowerShell 5.1 aborts part-way through the largest reference projects while PowerShell 7 succeeds.
- `scripts/prepare-calendar-release.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Script logic is unchanged.
- `scripts/qualify-native-window-v3.1.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Script logic is unchanged.
- `scripts/qualify-native-window-v3.2.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Script logic is unchanged.
- `scripts/release-policy.ps1` — Add a UTF-8 byte-order mark. Windows PowerShell 5.1 decodes a BOM-less script using the ANSI code page, which corrupted this file's Chinese comments into a parse error at lines 43 and 51 and made Assert-WindowsReleaseArtifactVersions unavailable to the release gate. The mark makes the identical bytes decode as UTF-8 on PowerShell 5.1 and 7.
- `scripts/run-release-v4.9.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Script logic is unchanged.
- `scripts/run-release-v5.0.1.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Script logic is unchanged.
- `scripts/run-release-v5.0.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Script logic is unchanged.
- `scripts/verify-release-package.ps1` — Add a UTF-8 byte-order mark so Windows PowerShell 5.1, which decodes a BOM-less script with the ANSI code page, reads the same bytes as PowerShell 7. Read reference-project authority with a small top-level scalar reader, so independent package verification runs on the pinned Windows PowerShell runtime instead of requiring PowerShell 7.
- `scripts/verify-v26.34-authoring-user.mjs` — Accept 26.38 as a qualification target. The authoring gate previously refused any release after 26.37.
- `scripts/verify-v26.34-native-headless.mjs` — Accept 26.38 as a qualification target for the native physics stdio gate.
- `scripts/verify-v26.37-comfortable-user.mjs` — Derive the release and the qualified flag from the actual --qualification-release argument instead of the literal 26.37, and name the generated fixtures after the running release.
- `scripts/verify-v26.37-native-disclosures-user.mjs` — Derive the release from --qualification-release, compare the engine version against that release, and read its own report by the running release name.
- `scripts/verify-v26.37-select-tooltip-user.mjs` — Accept 26.38 alongside 26.37 instead of asserting the literal 26.37.
- `scripts/lib/worldAudit17.mjs` — Close the notification history surface before continuing when it is open, mirroring the existing bounded toast dismissal, so an overlay opened earlier in a run cannot block later Inspector interaction.
- `scripts/verify-v26.34-input-user.mjs` — Load the Editor world-gameplay composition that the real editor loads, so the input-ownership suite exercises the supported path instead of failing on the deliberate legacy-port guard. Create the profiler performance capture through real keyboard activation of the same control, because a coordinate click could be lost while the continuously updating profiler panel re-rendered between press and release.
- `scripts/network-peer-v6.6.0.mjs` — Install the explicit runtime network composition (platform ports, replay owner, session owner) before any public network call. The peer previously inherited the removed global bridge and failed with LEGACY_NETWORK_OWNER_REQUIRED, which made the exported renderer-disabled server smoke fail before any traffic.
- `scripts/qualify-v26.38-scoped.mjs` — Added: the 26.38 scoped gate runner for focus, motion-logic, browser-layout, user-interactions, performance and the product prerequisite report.
- `scripts/prepare-release-26.38.mjs` — Added: generates the fourteen-gate 26.38 qualification plan with the explicit change-risk omissions and the current reference identities.
- `package.json` — Synchronize the 26.38.0 authority and add the v26.38 version, prepare, qualify, scoped-qualify, verify, evidence and release commands. Dependencies and every historical command are unchanged.
- `src/runtime/editorAutomation.ts` — The editor-automation evidence now reports the shared NOVA_ENGINE_VERSION instead of the stale hardcoded literal '6.7.0', matching the other runtime evidence producers.
- `src-tauri/capabilities/default.json` — Add core:window:allow-close, which the standalone Player exit action already invoked and which the minimal window permission set lacked. No other window, shell or filesystem capability was added.
- `manual/MANUAL.en.md` — Identify 26.38 / 26.38.0 and add the concise English 26.38 maintenance lesson; existing tutorials, API contracts and historical chapters are preserved.
- `manual/MANUAL.de.md` — Identify 26.38 / 26.38.0 and add the concise German 26.38 maintenance lesson; existing tutorials, API contracts and historical chapters are preserved.
- `manual/MANUAL.zh-CN.md` — Identify 26.38 / 26.38.0 and add the concise Chinese 26.38 maintenance lesson; existing tutorials, API contracts and historical chapters are preserved.
- `manual/index.html` — Update the multilingual offline manual identity, title, header and footer to 26.38 / 26.38.0 and add the translated 26.38 lesson; every retained bookmark and language section is preserved.
- `docs/RELEASE_NOTES_26_38.md` — Added: the authored release notes for the public and machine versions.
- `docs/EDIT_LEDGER_26_38.md` — Added: this ledger.
- `docs/WEB_HOSTING_26_38.md` — Added: current-version Web hosting guidance, carried forward with the current identity.
- `docs/NATIVE_HEADLESS_26_38.md` — Added: current-version native physics stdio host documentation, carried forward with the current identity.
- `reference-projects/projects/creator-v2638-mixed-game/project.nova` — Added: current 26.38 identity copy of the existing reference with unchanged gameplay, entity and control semantics.
- `reference-projects/projects/creator-v2638-mixed-game/README.md` — Added: current 26.38 identity copy of the existing reference documentation.
- `reference-projects/projects/creator-v2638-mixed-game/expected-output.json` — Added: current 26.38 expected-output authority for the reference.
- `reference-projects/projects/creator-v2638-mixed-game/test-controls.json` — Added: current 26.38 behavior matrix for the reference.
- `reference-projects/projects/server-v2638-headless-authority/project.nova` — Added: current 26.38 identity copy of the existing renderer-disabled server authority reference.
- `reference-projects/projects/server-v2638-headless-authority/README.md` — Added: current 26.38 identity copy of the existing authority reference documentation.
- `reference-projects/projects/server-v2638-headless-authority/expected-output.json` — Added: current 26.38 expected-output authority for the authority reference.
- `reference-projects/projects/server-v2638-headless-authority/test-controls.json` — Added: current 26.38 behavior matrix for the authority reference.

## Not changed

No rendering math, transparency ordering, physics semantics, protocol layout, project schema, editor geometry, typography, control size, radius or core motion token was modified. No test was deleted, no tolerance was widened and no quality floor was lowered. Paths outside this list keep their protected starting bytes.

## Known limitations recorded with this release

- The packaged 26.35 executables used as historical branding negative controls are not present in this checkout; the substitution is recorded in the branding report rather than hidden.
- Linux, low-end hardware, physical GPU cost, code signing and clean-machine installation remain unqualified.
- The Editor and Player still share one Tauri configuration and identifier; separating them is required work that this maintenance release does not perform.
