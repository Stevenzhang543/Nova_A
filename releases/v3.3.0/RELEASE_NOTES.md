# Nova_A 3.3.0 release notes

Release date: 16 August 2026  
Publisher: Whitelist  
Project format: 2, schema 23  
Runtime API: 1 · Plugin API: 2 · Package Manifest: 1 · Build CLI: 1

## Highlights

Nova_A 3.3.0 completes the ordinary 2D authoring loop across the Design viewport, Hierarchy, Inspector, and Assets workspace.

- Searchable **Create Object** and **Add Component** palettes group compatible types, explain dependencies and experimental status, and remember favorites and recent choices.
- The core object set now includes Empty, Sprite, Animated Sprite, World Text, Polygon, Line, Path, Camera, Canvas Layer, Parallax Layer, Rectangle, Circle, Triangle, Collider Body, Script Object, Audio Emitter, Light, and Navigation Region.
- Design adds move, rotate, scale, pivot, rectangle, path-point, polygon-point, collider, and measurement tools; box/multi-selection; selection filters; grid, pixel, vertex, edge, center, object, and angle snapping; align, distribute, mirror, rotate-90, frame, isolate, group, hide, lock, and focus-camera actions.
- The Inspector adds search/category filters, mixed-value multi-editing, pinned/modified views, documented property metadata, and reset, revert, copy, paste, path-copy, and keyframe actions. Components can be enabled, reset, copied, pasted, reordered, or removed with dependency protection.
- Sprite authoring adds sheet slicing, region metadata, transparent trim, pivot presets, borders, nine-slice, filtering, compression, color space, pixel-art import, modulation, flips, and one-transaction asset drops into the viewport.
- Cameras add zoom, orthographic size, smoothing, follow target, limits, drag margins, preview, pixel-perfect output, camera frames, and common/custom aspect overlays.
- Canvas layers expose screen/world space and follow-camera behavior. Parallax layers expose independent motion scale and repeat distance. Non-sprite object origins now use local `(0, 0)` by default; sprite pivots retain normalized `(0.5, 0.5)`.
- Hierarchy rename, duplicate, reparent, reorder, group, and delete are transactional. Reparenting preserves world transforms by default and supports an alternate local-transform mode.
- Large-scene performance mode adds viewport culling while preserving authoring behavior, and selection outlines remain outside pixel-art silhouettes.

## Final layout correction

The release package includes a final multilingual formatting pass prompted by the reported Design-toolbar overlap. The toolbar no longer reserves a fixed 760 px content corridor or allows controls to shrink below their labels: it uses an intrinsic-width centered strip and only scrolls when the window is genuinely narrower than the tool set. The navigation rail was widened enough for the German Settings label, and the Chinese Project Health dependency disclosure now has an explicit readable line height. No tool, label, animation, or action was removed to obtain the fit.

## Property additions and compatibility

No existing property was renamed. New serialized `authoring` metadata stores object kind, origin, visibility, Z order, render layer, sorting mode, canvas behavior, parallax behavior, and path information. Camera serialization now retains preview, follow, smoothing, limits, and drag margins. Older schema-23 scenes without these optional fields receive safe defaults when loaded; open Line and Path vertices are preserved rather than converted into closed convex geometry.

Project Format 2 remains at schema 23. Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged. No gameplay, physics, renderer, scripting, animation, UI, audio, build, package, or prior editor capability was removed.

## Reference projects and evidence

Six v3.3 authoring references are supplied: pixel art, resolution-independent art, parallax, multiple cameras, nested prefabs, and a 5,001-entity stress project (5,000 authored objects plus one camera). Each source project validates against the production project validator and includes expected output and test controls.

The release evidence records:

- all 11 live authoring/transaction checks;
- all 15 final v3.3 structural checks, including the non-shrinking responsive-toolbar invariant;
- 69 production-browser layout states spanning English, German, Chinese, 1024–1920 px viewports, all five workspaces, all ten bottom panels, and all four primary pages, with three visual captures;
- pixel-perfect comparisons at six zoom levels;
- a deterministic 5,000-object viewport benchmark and 360-second documented platformer workflow, below the 900-second acceptance budget;
- a retained 50,000-asset data benchmark;
- 500 bounded stability cycles covering play/stop isolation, streaming, asset reimport, corrupt input, and WebAssembly plugin fault recovery;
- frontend type checking and production Web/WASM build;
- Rust formatting, strict Clippy, and 109 passing workspace tests;
- Windows Tauri portable EXE, MSI, and NSIS builds plus a native launch smoke in which the application remained alive and exposed the `Nova_A` window.

No S0 or S1 defect was found by this qualification.

## Supported platforms

Windows 11 x86-64 is the locally built and launch-smoked desktop target. The Web package is deployable from an HTTP(S) origin. Linux and macOS clean-machine builds, code signing, and mobile stores remain external release-engineering qualifications and are not claimed as passed.

## Known limitations

- The 500-cycle local stability run is a bounded smoke, not a 24-hour soak.
- Linux/macOS clean-machine installer qualification and Windows Authenticode signing were not available in this workspace.
- Production bundling reports two non-fatal code-splitting advisories and two chunks above Vite's advisory threshold. They do not fail the build; late splitting was avoided to preserve the validated runtime loading paths.
- The Node verification host cannot fetch the generated `file:` WebAssembly URL, so the engine deliberately exercises its existing TypeScript fallback there. Browser/native builds include the successfully compiled release WebAssembly module.

## Release artifacts

`releases/v3.3.0` contains exactly the mandatory edit ledger, license, reference-project ZIP, evidence ZIP, source ZIP, Web ZIP, MSI, portable EXE, setup EXE, release notes, and SHA-256 checksum file.
