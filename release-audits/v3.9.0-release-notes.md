# Nova_A 3.9.0 release notes

Nova_A 3.9.0 is the feature-complete 4.0 release candidate. Project Format 2 schema 29, Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are frozen for the 4.0 stabilization cycle. Only S0/S1 blockers, security corrections and migration-correctness repairs may change the candidate.

## Reproducible build and platform policy

- Seven headless commands cover validate, import, test, build, export, package and version with CI-safe exit codes and JSONL.
- Presets and platform profiles support clean, incremental and cache-validation builds, inclusion/exclusion, unused stripping, compression, size/dependency reports, symbols, icons, manifests and version metadata.
- Windows x64 editor/runtime and Web runtime are Tier 1. Linux and macOS are Experimental. Mobile and consoles are Unsupported/deferred and absent from Stable selectors.

## Verified packages and collaboration

- Stable installs require a trusted registry snapshot, SemVer/engine/API ranges, entry type, permissions, dependency hashes, archive SHA-256 and verified signature. Modified, malformed, missing/conflicting/circular or untrusted packages are blocked or quarantined atomically.
- Permission-changing updates require review. Deterministic locks, offline verification, verified rollback, cache recovery and Safe Mode are included.
- Team workflows expose structured project/settings/package/scene/prefab/resource diffs, external reload/compare, canonical no-op saves, local/shared settings, optional locks, Git initialization, pre-commit hooks and CI templates.

## Support and retained capability

- The offline three-language manual is searchable; Inspector, error recovery, Build and Package views expose context-help anchors. Studio Status exports a privacy-reviewed local diagnostic bundle and never uploads automatically.
- Networking contracts remain an Experimental optional-package gate and do not block core 4.0 stability.
- All v2.5-v3.8 audits reran. Rendering quality, animation, physics, scripting, audio, UI, Tilemap 2.0, navigation, streaming, saves and optional packages remain available.

## Release boundary

Automated Windows-host gates pass with S0=0 and S1=0. Signed source tag, Authenticode signing, clean-VM installer lifecycle, matching-host Experimental platform promotion and 24-hour wall-clock endurance remain explicitly external; see the known-issues and provenance reports.
