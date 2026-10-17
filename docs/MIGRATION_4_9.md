# Migrating to Nova_A 4.9

Project Format 2/schema 29, Rhai API v2, Plugin API 2, package manifest 1 and Build CLI 1 remain unchanged. No schema migration or asset reimport is required. A metadata-only seal advances archived `<4.0.0` and `<5.0.0` engine ceilings to the frozen 5.x `<6.0.0` boundary; it is covered by the same preview, backup, validation and rollback workflow and never changes scene or asset data.

Build settings gain additive defaults for release channel, export template, provenance, SBOM, web headers, deployment mode and clean-machine evidence. Old projects normalize to safe local/development defaults. User-local output paths and signing identities remain outside shared project data.

Older package manifests without license/provenance remain readable for inspection but cannot be newly installed on the Stable channel. Update the manifest, sign the exact archive, regenerate the lock and review permissions. Rhai API v1 remains read-only migration input and is not available to new projects.

Before opening irreplaceable work, make a backup. Project Health offers validation, repair preview, deterministic re-save and rollback download.
