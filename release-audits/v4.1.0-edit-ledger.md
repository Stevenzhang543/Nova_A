# Nova_A 4.1.0 edit ledger

## Moved and renamed controls

| Previous control | v4.1 location | Stable test-ID scope |
| --- | --- | --- |
| Global left Game | Debug → Game | `context-rail-*` |
| Bottom Packages | Manage → Packages | `manage-workspace-*` |
| Bottom Project | Manage → Project health | `manage-workspace-*` |
| Bottom Rendering | Manage → Rendering | `manage-workspace-*` |
| Bottom Build | Manage → Build | `manage-workspace-*` |
| Manual | Learn Nova_A; Help retains manual | `project-manager-*` |
| Complete | Automatic; Ctrl/Cmd+Space request | `script-studio-*` |
| Permanent Physics Monitor | Debug contextual toggle | `context-rail-*`, `physics-monitor-*` |

## Added

- ManageWorkspace; six workspace/profile presets; docking, split, floating, pinning, auto-hide, rearrangement, profiles and deterministic migration.
- Command/quick/global/context search, context title, history/recent assets, shortcut import/export, stable-control registry and feature lifecycle registry.
- Nunito/Noto/JetBrains packages and tokenized typography/spacing/radius/color/elevation/focus/selection/disabled/drag states.
- Task logs/resources, readiness states, copyable asset technical details, virtualized physics/project diagnostics, launcher path/details/tutorial, Per-Monitor-V2 manifest and validated first/subsequent window behavior.
- v4.1 audits, integration/browser/keyboard/DPI/parity documentation, evidence schema/hierarchy, multilingual manual sections and release automation.

## Changed

- Version authorities, reference outputs, package/build/export/replay/profiler/support labels and native bundle metadata are 4.1.0; schema remains 29.
- Left rail and bottom dock are contextual; Inspector collapses when empty; audio ranges use accent rather than danger red; script completion is automatic.
- Full technical identifiers move to an expandable copyable pane. Renderer/platform labels explain production qualification versus fallback.

## Removed

- No gameplay, renderer, physics, animation, script, asset, package, build, UI or collaboration feature. Removed only duplicate/global navigation roles, transient policy tabs, visible template prose, the manual Complete button and danger-red default audio accent. Functional template Canvas/Text remains; tutorial prose lives in Assets/Tutorials.

## Verification IDs

The runtime registry deterministically derives `data-testid` locale-independently from control scope, explicit semantic keys where available, and structural control ordinals, then inventories path, label, state, shortcut and disabled reason. The browser evidence contains the concrete release inventory.

## Release identity

- Version/release date: 4.1.0 / 20 August 2026.
- Source commit: `7f753cb065aff42cef63361765cfefedbd5f72e1`; branch: `main`; source description: `Release3.0.0(2026.08.16)-2-g7f753cb-dirty`.
- Build pipeline: check → static audits → Rust format/lint/tests → WASM/web build → browser/DPI qualification → Tauri build → isolated portable smoke → evidence → archives → independent checksum verification.
- Toolchain: v22.22.2; pnpm@10.30.0; rustc 1.92.0 (ded5c06cf 2025-12-08); cargo 1.92.0 (344c4567c 2025-10-21); wasm-pack 0.14.0; Vite ^6.4.3; Tauri CLI 2.11.4.
- Source status: working-tree release candidate; source archive contains the recorded edits. Signed source tag and publisher signing remain pending and are not claimed.

## Ownership and traceability

| Material change | Owner/subsystem | Test IDs | Evidence | Issue/PR |
| --- | --- | --- | --- | --- |
| Workspaces, docks, navigation, search, shortcuts | Editor shell | SHELL-001..006, HLT-001 | tests/integration, web/browser-layout.json | NOVA-4.1-SHELL; no external PR |
| Launcher, template selection/path/tutorial | Project launcher | LCH-001..009 | tests/integration, screenshots/launcher | NOVA-4.1-LCH; no external PR |
| Fonts, tokens, density, DPI, accessibility | Design system | SHELL-006, UI-008, UI-010 | coverage/*, visual/* | NOVA-4.1-UI; no external PR |
| Task Center and readiness states | Runtime feedback/build | BLD-001, SHELL-005 | tests/*, build/build-report.json | NOVA-4.1-TASK; no external PR |
| Project Health and Physics Monitor tables | Diagnostics/physics | HLT-001, PHY catalog | tests/integration, screenshots/* | NOVA-4.1-DIAG; no external PR |
| Native window, packaging, evidence | Release engineering | BLD-010, BLD-013 | install/*, build/*, evidence-manifest.json | NOVA-4.1-REL; no external PR |

## Contract and dependency changes

Project schema remains 29; Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 remain frozen. No new package permission or stable export target is introduced. Dependencies added are local Fontsource packages for Nunito Sans Variable, Noto Sans SC Variable, and JetBrains Mono Variable; their OFL identities and hashes are recorded in coverage/font-license-verification.md. Windows, web, Experimental Linux/macOS, and unsupported mobile/console platform policy is unchanged. Legacy workspace names migrate deterministically to UI or Manage destinations.

## Automation statement

Reference projects, browser screenshots, machine control inventory, reports, SBOM, provenance, release notes, this ledger, archives, and hashes are generated by repository automation. No external approval, long-duration run, physical monitor result, clean-machine result, signature, issue, or pull request is fabricated. This ledger was generated from and checked against `RELEASE_NOTES.md`, the v4.1 source tree, audit outputs, and the evidence manifest.
