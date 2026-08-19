# Nova_A 4.0.0 exhaustive edit ledger

## Additions

- Project Manager: always-on external-project compatibility summary, detailed preflight rows, 3.9 same-schema compatibility step, mandatory backup display, full validation gate, and clearer source/target engine/schema.
- Studio Status/support runtime: Stable/Beta/Development policy, versioned offline known-issues feed, release-health snapshot, opt-in local crash package and privacy notice.
- Documentation: migration, support/patch, archived-engine, build/CI, performance, security, accessibility, troubleshooting, API index, guided game/export, known issues and dependency/license review; English/German/Chinese manual 4.0 sections.
- Qualification: v4 static/integration/layout/native audit scripts, health JSON/HTML, CI/migration/platform/browser/performance/soak/security/accessibility/documentation/package/installer/provenance/SBOM/sign-off evidence.

## Changes

- package.json, Cargo.toml, Cargo locks, Tauri manifest/config, TypeScript/Rust/CLI/export authorities: 4.0.0. Project schema remains 29.
- Tauri runtime/build/CLI/API moved to the aligned 2.11 family; patched transitive locks remove all known npm/RustSec vulnerabilities; desktop MSRV and CI are Rust 1.88.
- Project manifest defaults and Rust migration: engine compatibility becomes 3.9–<5.0; 3.9 <4.0 manifests upgrade explicitly without authored-data/schema changes.
- Official package, package template, plugin and generated reference ranges include 4.0; package engine checks use the central 4.0 authority.
- Stable contract diagnostics now identify the 4.0 lock and 4.0.x-compatible CLI. README, compatibility, stable-contract and limitation documents describe the final baseline.
- Reference generator/projects: engine 4.0/schema 29, compatibility range, per-project validation instructions and required official project matrix.
- Release packager/web metadata/evidence contents: version 4.0, frozen schema 29, mandatory eleven-artifact names and post-package checksums.
- i18n: v4 version, preflight, mandatory backup, channel, crash-consent and privacy labels in English, German and Chinese.
- Retained audit scripts now separate historical feature coverage from the current 4.0 version authority; the schema-23 repair fixture remains historical while its repair test isolates the engine ceiling.
- The browser qualification includes 4.0 in deep Script, UI, Rendering and Settings traversals. Dependency and shared-chunk advisories are documented instead of suppressed.

## Removals

- Removed Experimental Networked Optional from the default template cards only. Its opt-in package, data, type, reference and runtime remain intact.
- Removed no user-authored data path or supported feature/animation/render-quality path. Deleted only stale generated NSIS cache files before verified regeneration.

## Schema and API changes

- Schema change: none; Project Format 2 remains schema 29 by freeze. Compatibility metadata is refreshed from the 3.9 release-candidate ceiling to the 4.x range.
- API change: none; Runtime 1, Plugin 2, Package Manifest 1 and Build CLI 1 remain locked.

## Migration from 3.9

- Preflight before open; complete backup before mutation; bounded local rollback; in-memory Rust migration; whole-document validation; canonical serialize/reparse; atomic session replacement; future schema read-only. Rust golden/corruption tests and v4 integration evidence cover the path.
- Preflight additionally blocks malformed or genuinely incompatible engine ranges before mutation while allowing only the registered 3.9 <4.0 boundary seal.

## Files generated mechanically

- pnpm/Cargo lockfiles synchronize version authorities. `pnpm references` regenerates all reference project JSON/readmes/controls from the authoritative template generator. Build/evidence/package scripts generate dist, native bundles, audit reports and release ZIP/checksums.
