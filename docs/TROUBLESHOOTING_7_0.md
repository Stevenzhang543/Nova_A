# Nova_A 7.0 troubleshooting and recovery

## Project will not open

Read the migration preflight. Unsupported future schema opens only through compatibility inspection; malformed/too-old input is blocked. Keep the original file, download the pre-upgrade copy, and use the exact first blocking path instead of repeatedly importing.

## A control appears to do nothing

Check its disabled reason, selection, owning workspace, Edit/Play state, package permission, target-host gate, and Problems/Console output. Learning Center → Platform readiness identifies the owner, prerequisites, persistence, runtime/export route, and test family. A control without an actual route is a release blocker.

## Rhai and Visual Graph differ

Save the active editor, inspect synchronization diagnostics, and preserve unsupported text in a Code block. Validate the graph, compile the generated Rhai, compare behavior IDs, reload, and use semantic diff. Never delete arbitrary code merely to force a visual representation.

## Physics or rendering differs after reload/export

Confirm layer/mask isolation, grid-to-meter scale, finite values, fixed tick, quality profile, active camera/volume, renderer fallback, texture/material availability, and player build profile. Use Physics Monitor, collision timeline/replay, renderer diagnostics, and deterministic checksums. Editor performance profiles never alter exported gameplay quality.

## Package/plugin/update failure

Stay offline while reviewing. Inspect the solver trace, exact hash, publisher fingerprint, permissions, compatibility, revocation/vulnerability advisory, provenance, and certification. Quarantine or rollback the package. Update checks are disabled by default; a signed manifest stages a plan but does not implicitly download or replace the application.

## Build fails

Open Project Health and Build Settings. Resolve scene order/startup scene, package lock, export-template identity, target/architecture/runtime tuple, host restriction, permissions, content references, accessibility errors, and output path. Windows/Web are local Tier 1; Linux/macOS require matching hosts; Android requires its complete optional toolchain. Signing is external unless credentials and target evidence are explicitly provided.

## UI clipping, unreadable text, or motion discomfort

Reset UI scale/density, use the target theme/contrast mode, and enable reduced motion. Test EN/DE/ZH at 100–200%, minimum supported window, high DPI, keyboard focus, and long translated text. Report the workspace, panel, locale, scale, theme, viewport, selected item, and screenshot.

## Slow editor or player

Capture Profiler evidence before changing budgets. Use the Low-end profile or adaptive presentation quality; these preserve physics timestep, scripts, animations, authored values, controls, and exported quality. Inspect workers, queue, cache, allocations, worst frame, 1% low, input-to-pixel latency, streaming, virtualization, texture uploads, particles, lighting, audio voices, and networking.

## Recovery order

Use Cancel/Escape → Undo/Redo → subsystem Revert/Rollback → Recovery Browser/autosave/checkpoint/trash → migration rollback → version control/change list → original backup. Fatal errors and failed repairs must remain visible; do not clear evidence until the recovered project reopens, plays, and builds.
