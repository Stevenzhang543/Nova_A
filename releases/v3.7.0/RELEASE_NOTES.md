# Nova_A 3.7.0 release notes

Nova_A 3.7.0 delivers the typed, asset-driven visual and audio pipeline from the 3.7 roadmap while retaining every v3.6 presentation, scripting, physics, animation, UI and export workflow.

## Visual pipeline

- WebGL2 Tier 1 and Canvas2D fallback now publish an explicit capability report, unsupported list, fallback rules, reset state, and context-loss/recovery evidence.
- The Rendering dock is divided into Lighting, Materials, Shaders, Particles, Diagnostics and Quality. Raw uniform/texture JSON is opt-in under Advanced.
- Typed material controls cover scalars, integers, ranges, enums, toggles, vectors, colors and textures. Includes, variants, compile cache, source-linked errors, inheritance and live preview remain bounded by the safe 2D shader subset.
- Quality presets visibly change shadow quality, pixel ratio, particle budget, pixel snapping and post-processing cost. Saved frame captures can be compared by pixel difference.
- Texture profiles cover General, Pixel Art, UI and Normal Map. Font profiles cover scalable/bitmap cache behavior, fallback families, shaping and outlines.
- New-shape outlines use a 0.04-world-unit default and one joined bounded-miter ring, eliminating the protruding cross-shaped corners reported in v3.6.

## Audio pipeline

- Audio imports expose Sound Effect, Music, Voice and Streaming profiles; Original/PCM/Vorbis/MP3 storage metadata; quality, normalize, trim, loop and streaming controls.
- Runtime audio supports 2D listener/panning/attenuation, buses, sends, snapshots, ducking, filters/compression/delay/reverb, deterministic per-component polyphony, random pitch/volume, priority, master/bus limits and virtualization counters.
- Profiler diagnostics expose active/streaming/buffered/virtual voices, base/output latency, underruns, device changes and bus meters.
- UI/animation audio continues through the same project mixer.

## Supported and fallback behavior

WebGL2 is the Tier 1 renderer. Canvas2D is a supported fallback for ordered sprites, shapes, text, cameras and base materials; custom shaders, GPU timers, post-process targets and normal-map lighting are explicitly unavailable and hidden/reported. Shader failure falls back to the base material, missing texture falls back to opaque white, and failed post-process allocation renders directly to the world framebuffer.

For timing-critical short loops use PCM and zero-crossing loop points. Browser streaming and compressed formats may include codec/decoder delay; the Audio Profiler records device-specific latency and underruns so the project can be qualified on target hardware.

## Compatibility

Project Format 2 schema 27 reads schemas 5–27. Schema 26 projects gain explicit import/render settings; only the exact legacy default 1-unit dark outline is migrated to 0.04 units. Custom stroke colors/opacity/widths are preserved. Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are unchanged.
