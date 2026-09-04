# Nova_A 26.10 API and SDK guide

This document identifies the stable programming surfaces and their security/compatibility boundaries. Callable signatures and node metadata remain authoritative in their generated manifests; prose explains how the pieces fit together.

## Stable contracts

| Surface | Stable version | Authority | Compatibility rule |
| --- | ---: | --- | --- |
| Project data | Format 2 / schema 29 | `src/projects/projectFormat.ts`, Rust format crate | Supported history migrates in memory after backup; future schema is non-mutating/read-only. |
| Gameplay scripting | Rhai API 2 | `RHAI_API_V2_MANIFEST.json`, `RHAI_API_V2.md` | API 1 is import compatibility only. Rhai stays dynamic; generated validation metadata is authoritative. |
| Visual programming | Visual Graph Format 1 | graph format and production docs | Stable UUID/behavior identities; unsupported source survives in explicit Code blocks. |
| Plugins | Plugin API 2 | package/plugin SDK and runtime | Declarative contributions, capability review, bounded WASM and fault isolation. |
| Packages | Package Manifest 1 | ecosystem shipping and package runtime | SemVer, hashes, permissions, provenance, trust/advisory checks and deterministic archives. |
| Build automation | Build CLI 1 | Build/export docs and CLI | Stable commands/exit behavior/JSONL; new flags are additive and host gates remain explicit. |
| Editor layout | Workspace document 3 | workspace manager/runtime | Prior supported layouts normalize without changing project data. |

## Rhai gameplay API

Use `docs/RHAI_API_V2.md` for categories and `docs/RHAI_API_V2_MANIFEST.json` for exact names, argument types, determinism, thread, permission and graph-node metadata. `docs/NOVA_RHAI_API_V2_STUBS.rhai` supports offline completion; it is not an executable host implementation.

The runtime exposes lifecycle callbacks, object/component handles, input actions, deterministic time/randomness, movement/physics commands, animation/audio/UI, signals/tasks, scene and pooled spawning, save/checkpoint, navigation/query, network calls when the optional permissioned package is active, and test assertions. Handles are validated at command application time; scripts cannot gain filesystem, network, process, device or plugin permissions by naming a function.

Rhai is dynamically typed. Diagnostics, exported-property declarations, behavior contracts and completion catch many mistakes, but they are not a static-language proof. Per-callback command/log/time limits, transactional hot reload and fault isolation remain part of the runtime contract.

## Visual Graph and Event Sheet

Rhai and Visual Graph are synchronized views of one bounded command behavior where structural conversion is supported. Graph nodes use stable UUIDs and typed pins. Saving a linked graph generates valid Rhai and queues hot reload. Saving linked Rhai reparses supported functions, variables, branches, bounded loops, literals and API calls into blocks/nodes; source outside structural coverage remains visible in a Code block. Independent scripts are never linked or rewritten implicitly.

Event Sheet maps object events—lifecycle, input, timers, signals, collisions/triggers, UI, animation and network—to a visible Rhai or graph action asset. Event priority and seed are deterministic. Duplicate callbacks and disabled-object behavior are validated before runtime scheduling.

Round-trip qualification compares source, graph semantic identities, generated Rhai, compiled commands, event behavior and save/reload output. Text formatting alone is not semantic parity.

## Editor automation

Automation Studio runs bounded Rhai against editor-only query and mutation capabilities. The workflow is permission preview → dry-run semantic diff → explicit apply or cancel → one transaction/rollback record. Automation may inspect selection/scene metadata and perform the documented bounded edits, but it cannot secretly execute gameplay permissions, arbitrary filesystem/process/network operations or native code.

Automation scripts and package origin are project assets; execution traces and temporary selections follow their named editor persistence rules. Exported players do not include editor automation commands.

## Plugin and package SDK

Plugin API 2 contributions are declarative commands, menu/context items, panels, Inspector editors, gizmos, importers, build steps and graph nodes. Each capability is independently reviewed. WASM execution is memory/time bounded and fault isolated; unload/reload must remove subscriptions, UI and resources cleanly. Safe Mode skips third-party startup.

Package Manifest 1 records identity/version, engine/API ranges, dependency constraints and hashes, requested permissions, files and provenance. The solver emits selected/reused/blocked decisions and validates exact hashes, compatibility, trust, revocation and vulnerability policy before replacing the lock. Offline mirrors and publisher tooling never imply network access. Private keys stay outside Nova_A and the repository.

Native Extension ABI descriptors may document an adapter contract, but the package browser never downloads or executes arbitrary native libraries. A separately installed native adapter requires host-specific security and lifecycle qualification.

## Content and runtime systems

- Import/resource contracts: `CONTENT_ANIMATION_6_4.md` and the resource/import runtime modules.
- Physics: `PHYSICS_RENDERER_6_5.md`, `PHYSICS_2D.md`, exact compound/chain/CCD/joint/Rope2D rules and deterministic monitors.
- Rendering/material/particles: renderer capability, materials/effects and particles/post-process documents; fallback paths must preserve semantics or report the difference.
- Animation/audio/cinematics: production media documents, common clock boundaries, mixer/voice/device recovery and deterministic capture plans.
- World/navigation/AI: world streaming, origin shift, TileMap, navigation, behavior, perception, pooling and bounded background jobs.
- Devices/UI/accessibility: input map, pointer/touch/gamepad, virtual controls, safe areas, orientation/DPI, semantic UI snapshots and permissioned sensors.
- Multiplayer: optional registered transports, explicit permission, authority/replication, supported prediction/reconciliation, replay and diagnostics. Public relay/NAT infrastructure is not bundled.

## Build CLI 1

The non-interactive surface is `pnpm nova <validate|import|test|build|export|package|version>`. Machine consumers use JSONL and exit codes rather than scraping localized UI text. Build input is validated and canonicalized; target, architecture, runtime mode, template identity, permission and host restrictions fail before output publication. A successful result reports the actual emitted path, including a deterministic alternate name used when an earlier Windows executable is locked.

Windows/Web are the local Tier 1 boundaries described in `SUPPORT_MATRIX_26_10.md`. A selectable or planned target is not automatically qualified.

## Versioning, deprecation and security

Product calendar versions and persisted contract versions are independent. Additive calls/nodes/fields may join a frozen contract when old readers preserve or safely ignore them as documented. Removal or incompatible semantic change requires a new contract, compatibility adapter, migration, fixtures, documentation and release-note entry.

Unknown data fails closed where execution would be unsafe and round-trips where the format permits preservation. No manifest, graph, script or project may grant itself a host capability. Hash/signature validation does not replace permission review; local tests do not replace independent security evidence.

Migration and recovery are defined in `MIGRATION_26_10.md`; operational failures in `TROUBLESHOOTING_26_10.md`; unresolved and intentionally excluded capabilities in `PLATFORM_GAP_REGISTER_26_10.md`.
