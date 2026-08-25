# Nova_A 4.9.0 release notes

## 5.0 release-candidate freeze

Nova_A 4.9.0 completes the shipping, extension, local collaboration and documentation systems and opens the 5.0 RC observation on 25 August 2026. Stable features, Project Format 2 schema 29, Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, platform tiers and the eleven-file release artifact format are frozen. Only release blockers, security/migration corrections and documentation/evidence corrections are accepted. Earliest approval is 8 September 2026 after at least 14 days.

## Supported tiers

- Windows x86-64: Tier 1. Local editor/player/portable/MSI/setup production checks are included; publisher signing and disposable clean-machine lifecycle remain external gates.
- Web: Tier 1. WebAssembly/ES2022/WebGL2 Chromium path is locally qualified; Firefox, WebKit and remote HTTPS hosting remain explicit jobs.
- Linux/macOS: Experimental, matching-host CI only. They are not presented as locally available stable cross-targets.
- Android/mobile: Experimental and unavailable until its complete matrix passes.

## Compatibility baseline

Project Format 2 schema 29, Rhai API v2, Plugin API 2, Package Manifest 1 and Build CLI 1. Legacy shims remain read-only only where migration policy promises them. Packages are pinned and cannot execute before provenance, compatibility, integrity and permission review.

## Highlights

Pinned platform presets; content stripping/compression; build manifests/provenance/SBOM/web headers; rich build history and comparisons; registry/license/vulnerability/cache/rollback policy; Plugin API compatibility/certification; optional local-first ownership/tasks/CODEOWNERS/binary locks; complete offline docs; Project Health release gates; one exact-artifact pipeline; privacy-reviewed diagnostics.

## Remaining known issues and external gates

The 14-day RC window, 24-hour soak, independent-machine reproducibility, disposable clean install/upgrade/repair/uninstall, publisher signing/notarization, Firefox/WebKit and representative hardware matrices remain pending until real evidence is attached. Linux/macOS/mobile are not promoted. See `docs/KNOWN_LIMITATIONS.md` and the evidence archive. No result is fabricated from a same-machine run.
