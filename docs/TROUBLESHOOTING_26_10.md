# Nova_A 26.10 troubleshooting and recovery

Start with the first error, preserve the last valid project and keep diagnostic evidence until the repaired project reopens, plays and exports. Do not “fix” a project by deleting an unknown field, script, package or object.

## Project will not open or migrate

Open Project Manager preflight and read the exact format/schema/engine/package failure. Future schemas remain read-only; malformed or too-old documents are blocked. Keep the original, download the complete backup, compare the semantic diff and use `MIGRATION_26_10.md`. Never change only the schema number or repeatedly overwrite the failed destination.

## A control is missing, disabled or does nothing

Confirm the active workspace/document, Edit versus Play mode, selection type/count, required component/asset, package permission, platform gate and visible disabled reason. Search the Learning Center operation and follow its owning panel. The Platform Readiness record names the implementation, validation, recovery, persistence, runtime/export, manual and test routes. A control with no exact route is a local release blocker.

If activation produces no state change, record the stable control ID, workspace/subpanel/dialog state, locale, theme, UI scale, input method and first console/fault entry. Keyboard activation and pointer activation should reach the same command unless the control is specifically a drag gesture.

## Rhai, Visual Graph or Event Sheet disagree

Save the active editor first; unsaved drafts are never silently overwritten. Check linked asset identity, parse/compile diagnostics, stable behavior/node/variable markers and synchronization status. Supported code should reconstruct structural blocks. Unsupported syntax must remain in a visible Code block rather than being deleted. Validate, compile generated Rhai, compare semantic IDs, reload and run the same deterministic trace. If conflict resolution cannot preserve both drafts, cancel and use the previous save or Undo.

Debugger stepping occurs at lifecycle/callback/safe statement boundaries, not arbitrary VM instructions. External debugging remains authenticated and localhost-scoped.

## Visual Graph cannot pan, zoom, drag or connect

Focus the graph canvas, close a modal/popover that captures input, and check whether the selected tool expects node selection or wire creation. Use wheel/pinch or the zoom control, Space/middle-button pan, Frame All, Reset Zoom and keyboard node commands. At high document size, low-detail culling may simplify previews but cannot remove nodes, hit regions or editability. If gestures lag, capture graph node/edge count and input-to-pixel timing; do not disable graph animation or validation as a workaround.

## Physics, rendering, animation or audio differs

Verify finite values, grid-to-meter scale, fixed tick/seed, collision layers and masks, body/collider type, compound children, anchors, material/resources, active camera/volume, quality/fallback path, animation/audio clocks and imported asset identity. Use Physics Monitor, collision timeline/replay, renderer diagnostics and deterministic checksums. Objects on different collision layers interact only when masks permit it. Editor performance profiles must not change authored values, fixed simulation or exported quality.

## Multiplayer differs or disconnects

Confirm the optional package and explicit permission, registered transport, protocol/API versions, authority, peer identity, authentication proof, channel, relevance/interest, scene handoff and replay window. Use bounded latency/loss simulation and synchronized packet summaries before a real network. Current rollback covers the supported replicated state; arbitrary nonlinear Rhai side effects are not promised to rewind. Multi-instance testing launches isolated player processes, and renderer-disabled headless authority is not a windowless service.

## Package, plugin or updater fails

Stay offline while inspecting the exact manifest, archive/path limits, dependency solver trace, hashes, publisher fingerprint, permissions, compatibility, revocation/vulnerability advisory and provenance. Validate without execution, quarantine on failure and use rollback. The package browser does not run arbitrary native code. The updater is disabled by default and a verified staging plan does not itself download, execute or replace the application. Never add private signing keys to the project or repository.

## Build or exported game fails

Open Project Health and Build Settings. Resolve startup scene/order, template ID and host/runtime/architecture tuple, package lock, missing references, permissions, accessibility errors, output path, free space and content validation. Verify the emitted path; if an old Windows executable is locked, a successful build may publish a deterministic build-ID-suffixed file beside it. Only launch the actual emitted path.

Windows/Web are locally qualified boundaries. Linux/macOS need matching hosts; Android needs its full optional toolchain and device gates; iOS and consoles are not locally supported. Serve Web builds over HTTP(S), not `file://`.

## UI is clipped, overlapping or unreadable

Record viewport, operating-system scale, editor scale, locale, theme/contrast, reduced motion, workspace, panel, selected object and screenshot. Check 100–200% editor scale and the minimum 1024×640 viewport. All essential controls must remain reachable through panel scrolling; the document itself should not require horizontal scrolling. Long translated text must wrap or provide accessible expansion rather than escape its control.

## Editor or player is slow

Capture Profiler evidence before changing a profile: cold start, workspace switch, Inspector open, draw/drag input-to-pixel, graph pan/zoom/drag, p95/worst frame, one-percent low, memory slope, worker state and content size. Low-end mode may reduce editor-only diagnostic sampling or idle presentation work. It must not delete controls, animations, feedback, render paths, simulation ticks or exported quality. Compare deterministic checksums and screenshots after any optimization.

## Recovery order

Use Escape/Cancel → Undo/Redo → subsystem Revert/Rollback → Recovery Browser/autosave/checkpoint/trash → migration rollback → version control/change list → original backup. Preserve fatal entries and diagnostic bundles until the recovered result is verified.

For platform and evidence limitations, read `SUPPORT_MATRIX_26_10.md` and `PLATFORM_GAP_REGISTER_26_10.md`.
