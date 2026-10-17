# Nova_A 26.05 production rendering, animation, audio and cinematic contract

Nova_A 26.05 keeps Project Format 2/schema 29 and all seven frozen contracts. The release does not replace the existing renderer, animation editor, mixer, timeline, or export path. It joins them through one truthful production workflow and closes the missing resource and capture boundaries.

## Rendering

The retained WebGL2 path supports layered 2D materials, visual material graphs, uniforms, textures, shader includes, lights, shadows, normal maps, Canvas2D fallbacks, particles and trails, post-processing volumes, pixel snapping, high-DPI limits, batching, culling, quality volumes, render-pass diagnostics and context recovery. The canonical pass order is World, Lighting, UI, EditorOverlay, PostProcess.

Texture residency is now explicit. Each uploaded WebGL texture records its byte estimate and last-used render frame. At the end of a frame, textures outside the configured idle window are evicted first, followed by least-recently-used textures until the memory budget is met. A texture used by the current frame and the built-in white texture are never evicted. Context loss and renderer destruction delete/clear every tracked GPU handle. Canvas2D publishes the same diagnostic fields with zero GPU residency so tools do not need a backend-specific schema.

Production settings are bounded: 16–65,536 MiB residency, 2–36,000 idle frames, 1–4,096 uploads per frame, and a 1–8 preload margin. Performance/Low-end uses 96 MiB and 2,500 particles; Balanced uses 256 MiB and 10,000 particles. Both profiles retain materials, lighting, animation, audio, timelines and UI. Quality may change; authored meaning may not.

## Materials and fallback

Every material asset is normalized and parsed by the same material implementation used by rendering. Visual graph and layer capabilities are checked for the active WebGL2 or Canvas2D backend. Invalid source blocks production. A documented Canvas approximation is reviewable or blocking according to the project's unsupported-feature policy; it is never silently described as full parity.

## Animation and cinematics

The existing curves, dope sheet, sprite frames, events, markers, state machines, transitions, 1D/2D blend trees, layers, rigs, skin weights, retargeting, onion skin, root motion, runtime recording, timeline clips, nested timelines, subtitles, branches, markers and skip/resume routes remain unchanged. Their existing validators now feed the same Production report used by Build.

Deterministic capture owns a fixed frame rate and integer audio sample ranges. Frame `n` starts at `round(n × sampleRate / frameRate)` and ends at `round((n + 1) × sampleRate / frameRate)`, preventing accumulated fractional-sample drift. Capture is bounded to 1–240 fps, 8–192 kHz, 1–18,000 frames and 16–2048 MiB. Every frame records index, exact media time, audio sample start/end, dimensions, encoded bytes and PNG data. The user can include or exclude editor UI, stop, clear and download individual numbered frames. Reaching the frame or memory limit stops cleanly and states why.

## Audio

The retained mixer supports named buses, parent routing, sends, effects, limiter, ducking, snapshots and transitions, spatial emitters/listeners, attenuation and panning, voice limits/priorities/virtualization, streaming, loop regions, waveform preview, sample-rate configuration and device recovery. Production readiness blocks missing parent/send buses and a violated master voice limit; observed underruns require review. The capture clock uses the project's configured sample rate.

## Unified production gate

Rendering Studio → Production shows six live checks: materials, ordered render passes, texture streaming, animation, audio and cinematics. The report uses actual Asset Database contents, current entities, renderer statistics, audio settings and runtime diagnostics. The same report is appended to Project Health/Build validation, so an invalid material, animation, timeline, mixer route, texture budget or media clock cannot appear ready only because another panel was not open.

`exportParity` is true only when no blocking media issue remains. `semanticParity` is always the required contract across Balanced and Low-end. The editor does not claim independent device, publisher, clean-machine, matching-host, accessibility-hardware or real-duration soak evidence from local checks.

## Qualification

Automated tests cover normalization bounds, material graph compilation and fallback, pass count, WebGL residency/cleanup source paths, Canvas diagnostics, deterministic frame/audio timing at 24/30/60/120/144 Hz display rates, capture caps, cross-subsystem reporting, build binding, localization, responsive containment, historical fixtures, templates, Web/Rust/WASM/Tauri builds, Windows player smoke, security, performance, stability, evidence and exact packaging.

The user reference `production-media-v2605-polished` combines a visual material, lighting, animation/controller assets, audio routing, a skippable timeline, texture streaming and deterministic capture. Its test controls require the whole scene to run under Balanced and Low-end without semantic feature loss.
