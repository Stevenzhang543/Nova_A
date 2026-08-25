# Nova_A 5.0.0 edit ledger

- Updated current web, Rust, Tauri, CLI/export, capture, support and project authorities to 5.0.0; Project Format 2 remains on frozen schema 29.
- Froze Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, platform tiers and the eleven-file artifact naming contract for the 5.x line.
- Removed API v1 from new-project and new-script authoring choices; retained the documented per-asset adapter and migration diagnostics for imported v1 scripts without deleting user data.
- Removed the visible global Experimental-feature toggle and incomplete Experimental targets from default release authoring; retained existing project data, optional packages and machine-readable diagnostic records.
- Migrated editor workspace persistence from document 2 to document 3, with import/fallback paths for 4.x document 2 and legacy document 1 layouts.
- Added stable offline help targets to launcher migration warnings, Project Health issues, package warnings, Script Studio Problems and every Build Settings issue.
- Added explicit platform tier, availability, host, minimum-system and evidence records.
- Added versioned export presets, content/delivery controls, manifests, provenance, SBOM, web headers, safe external hooks and rich build history/comparison.
- Added package publisher/license/provenance/certification/vulnerability review and fail-closed stable registry policy.
- Added optional local-first ownership, CODEOWNERS, tasks, change notes, shared presets, semantic comparisons and advisory binary locks.
- Redesigned Build Settings and Project Health around release evidence and direct remediation; renamed the visible plugin contract to Plugin API compatibility with API/certification detail.
- Added English/German/Chinese manual sections and synchronized both READMEs, plus platform, build, package SDK, source-control, migration, first-game, accessibility, performance, security, support, deprecation, known-issues, API and troubleshooting guides.
- Added five v5.0 reference projects, upgraded all reference metadata to engine 5.0.0/schema 29 and clean-exported every project for Windows and Web.
- Added static/runtime/layout/native/reference/evidence/reproducibility/release-pipeline qualification commands and generated honest pending records for external or wall-clock gates.
- Added bounded retry handling for transient OneDrive writes while generating public migration fixtures and for read-only reference-project archive creation; persistent failures still fail closed.
- Updated the public schema golden engine target to 5.0.0 and regenerated all supported schema 5–29 migration fixtures.
- Finalized the 5.0 frozen contracts, documented every accepted Severity 2/3 item with scope, workaround, owner and patch target, and retained every unmet external gate as pending.
