# Nova_A 3.0.0 — Studio Stable

Nova_A 3.0.0 stabilizes the complete 2D editor-to-player workflow without changing the persisted project schema. Existing schemas 5–22 remain supported; new saves use Project Format 2/schema 22 with engine version 3.0.0.

## Highlights

- Frozen and documented Project Format 2/schema 22, Runtime API 1, Plugin API 2, Package Manifest 1, Build CLI 1, and the Nova_A 3.x compatibility promise. **Help → Studio Status** exposes the live values and diagnostic copy action.
- Golden migration coverage for every public schema 5–22, serialization round-trip, unknown-field preservation, and 512 deterministic corrupted-input mutations.
- Six generated editable source projects plus a minimal permission-free Plugin API 2 WASM example. The platformer now demonstrates Light2D and ShadowCaster2D as well as physics, tilemap, animation, audio, UI, script, and build settings.
- Global fault containment for Vue errors, animation-frame failures, unhandled promises, optional networking, URL opening, and atlas rebuilds. Fatal faults use a Nova_A-styled recovery dialog with bounded diagnostics, safe continuation, and plugin Safe Mode.
- Text-asset packaging is corrected in both browser and headless exporters, so inline scripts, prefabs, animations, themes, localization, shaders, and other text resources export instead of being mistaken for disk URLs.
- Friendly multilingual typography: 16 px scalable base, 11 px absolute UI floor, rounded system font stack, kerning/optical sizing/anti-aliasing, compact mode, UI scaling, contrast, and reduced motion.
- Release evidence tooling for benchmarks, bounded stability smoke, explicit 24-hour qualification, and clean Windows/Linux/macOS/web CI. Unexecuted platform or interactive measurements are reported as pending, never as passing.

## Measured local evidence

On the recorded Windows x64 / Node 22 reference session, the machine-readable benchmark measured 2,000 bodies × 240 steps with finite output, small-script analysis over 1,000 samples, a 16 MiB import-core workload over 20 samples, and a successful deterministic platformer web export. Exact values and machine metadata are in `v3.0.0-benchmarks.json`.

The local stability smoke completed 500 play/stop cycles, 1,166 scene-streaming toggles, 500 asset reimports, 500 corrupted inputs, and 500 isolated plugin traps followed by healthy plugin starts. This smoke is explicitly **not** a 24-hour qualification.

## Known/pending qualification

- Interactive native cold start, idle memory, GPU frame-time p95, and workspace-switch p95 remain pending an instrumented reference-machine capture.
- The repository defines clean Windows/Linux/macOS web/native jobs, but a workflow definition is not proof of a successful external run. Linux and macOS remain pending uploaded CI artifacts.
- Android remains an official optional package/SDK contract; no signed APK/AAB is claimed by this core Windows release.
- Automatic updater packages/signatures are not part of 3.0.0. Windows distribution uses the complete MSI/NSIS installers; Tauri's non-fatal bundle-type marker advisory is recorded in `docs/KNOWN_LIMITATIONS.md`.
- The local Windows EXE/MSI/NSIS files are checksummed but not Authenticode-signed because no Whitelist code-signing certificate was supplied. Sign the final public copies to avoid an unverified-publisher/SmartScreen prompt.
- The 24-hour stability workflow is supplied but remains pending until its report says `qualified24Hours: true`.
- Nova_A remains 2D-first. It does not provide built-in 3D, ray tracing, VR/XR, AAA terrain/foliage, cinematic virtual production, or proprietary console SDKs.

See `docs/` and the bundled trilingual manual for contracts, methods, platform status, and complete controls.
