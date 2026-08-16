# Nova_A 2.9.0 release notes

Nova_A 2.9.0 makes platform shipping and team collaboration first-class editor workflows while preserving the complete 2.8 production, networking, physics, animation, scripting, presentation, world, asset and package feature set.

## Highlights

- Build Settings is reorganized into focused Overview, Platform, Delivery and Team pages. A responsive validation/report rail keeps the primary actions visible, and narrow bottom panels use a compact tool selector.
- Reproducible Windows, Linux, macOS and Web profiles now include application metadata, x86_64/aarch64 selection, icons/splash, orientation, permissions, signing/notarization guidance and debug/release validation. Optional Android export is gated by the official package and a detected SDK/JDK/template.
- Deterministic `.nova-pak` data, selectable compression, incremental native writes, cache metrics, SHA-256 content records, build reports, patch manifests and symbol-map instructions make output reviewable. `pnpm export -- …` provides a headless/CI entry point.
- Structured logging and crash capture are explicit delivery options. The telemetry adapter is disabled by default, bounded, scalar-only and HTTPS-only, with an explicit privacy-policy requirement.
- Source-control support adds saved-baseline status overlays, stable sorted JSON, generated ignore rules, bounded external diff and three-way merge hooks, UUID conflict detection, and expiring owner-labelled project locks.
- Registry Browse displays publisher verification, permissions, ratings, documentation and security links. Browsing is data-only; installation remains an explicit action. Offline cache and local mirrors are supported.
- Project Manager previews migration/schema/package impact before opening an older project, optionally downloads the complete original, validates before replacing the editor session and retains a downloadable bounded rollback copy.
- Six audited templates now cover Empty 2D, Platformer, Top-down, Physics Sandbox, UI Showcase and Networked Optional workflows.
- Project Format 2 advances to schema 22. All package, Rust, Tauri and UI version metadata advances to 2.9.0.

## Export support and limits

- Native desktop exports are host-native: build Windows on Windows, Linux on Linux and macOS on macOS.
- Android is deliberately unavailable until `top.whitelists.novaa.android`, an Android SDK, a JDK and `NOVA_A_ANDROID_TEMPLATE` are all present.
- Console vendor SDKs and signing services are not distributed by Nova_A.
- Signing and notarization fields provide validated handoff metadata and guidance; certificates, secrets and vendor authentication remain outside the project file.
- Package browsing never executes extension code. Native plugins remain user-supplied and are never fetched or executed by the registry browser.

## Upgrade advice

When opening schema 21 or earlier, review the migration preview and package audit, keep **Download a complete pre-upgrade backup** selected, then migrate. If later review finds a problem, reopen Project Manager and choose **Download rollback copy**. The original is never overwritten by the in-memory migration itself.

## Verification record

The release gate covers Rust formatting, strict Clippy, all workspace and Tauri tests, Vue/TypeScript checking, every static feature audit through v2.9, optimized Web/WASM production build, browser interaction and console smoke tests, Tauri installer construction, portable executable smoke, archive inspection and SHA-256 verification. Exact commands/results are recorded in the v2.9 edit ledger and `SHA256SUMS.txt` in the packaged release directory.

