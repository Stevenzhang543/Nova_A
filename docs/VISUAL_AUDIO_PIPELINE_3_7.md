# Nova_A 3.7 visual and audio pipeline

## Renderer tiers and recovery

Nova_A queries the active browser/WebView GPU before exposing advanced controls. **WebGL2 Tier 1** supports stable batching, texture atlases, multiple cameras/viewports, render textures, typed GLSL ES materials, 2D lighting/shadows/normal responses, particles, sRGB/linear textures, GPU timers when the extension exists, and context recovery. **Canvas2D Fallback** preserves ordered sprites, shapes, text, cameras and base materials. It reports and hides custom shaders, GPU timings, post-process render targets and normal-map lighting because it cannot execute them.

The fallback chain is explicit: unavailable WebGL2 selects Canvas2D; an unsafe or failed shader selects the default base material; a missing texture selects the opaque-white texture; an unsupported post-process target draws directly to the world framebuffer. Context loss suspends WebGL submission, restoration rebuilds resources, and **Rendering → Diagnostics → Reset renderer** requests a clean renderer instance. The same capability report appears in Project Health.

## Rendering studio

- **Lighting:** enable project lighting; edit ambient intensity/color and shadow quality; inspect backend light/normal/context capability. Light2D, ShadowCaster2D, sprite light masks and render layers decide which objects interact.
- **Materials:** create/select a material, choose parent, blend, filter, color space, variant and color write, then edit generated toggle/texture/enum/color/vector/range/integer/number controls. The preview updates without entering Play.
- **Shaders:** edit the bounded GLSL ES fragment, enable shared includes, click a diagnostic to select the source line, and use Advanced only when raw uniform/texture JSON is needed. Source is limited to 32 KB, 32 reflected fields, 16 includes/variants, eight textures and compile-time loops of at most 64 iterations; discard, unbounded loops, storage/image operations, cube/3D samplers and fragment-depth writes are rejected.
- **Particles:** set the project live-particle budget and inspect emitter/update/subemitter metrics. ParticleEmitter2D owns preview, point/box/circle/edge shapes, burst/rate, motion/gravity/rotation, lifetime scale curves, color/opacity gradients, additive/alpha material and optional subemission.
- **Diagnostics:** inspect GPU time (when supported), draw calls, batches, batch breaks, triangles, overdraw, atlas pages, render targets and pass timings. Capture two frames and compare their normalized pixel difference.
- **Quality:** Performance, Balanced, High, Ultra and PixelArt change shadow quality, maximum pixel density, live-particle budget, pixel snapping and post-processing. WebGL-only post-process controls disappear under Canvas2D rather than pretending to work.

## Shapes, sprites, cameras and text

Scene sorting is stable by camera, render/sorting layer, authored order and submission order. Cameras support normalized viewports, stacking order, pixel-perfect projection, smoothing, limits, follow targets and named render textures. CanvasLayer and ParallaxLayer remain hierarchy-owned authoring objects. Polygon, line/path and primitive geometry share world transforms and render masks.

New ShapeRenderer2D components use a 0.04-world-unit outline. WebGL emits one joined bounded-miter ring, so rectangle corners do not protrude; Canvas2D uses rounded joins. Schema 27 updates only the exact legacy default 1-unit dark stroke tuple.

Texture import profiles are **General**, **Pixel Art**, **UI** and **Normal Map**. They set nearest/linear filtering, lossless/optimized storage, atlas behavior, pixels-per-unit and sRGB/linear interpretation explicitly. Batch and atlas diagnostics show when state/texture/material changes break a batch.

Font profiles choose **Scalable** or **Bitmap** cache behavior, bitmap size, fallback families, outline width and browser shaping. Imported FontFace families and ordered fallbacks reach Scene/Game world text and runtime UI. English, German and Chinese reference text is supplied in `reference-projects/projects/rendering-fonts-multilingual`.

## Audio assets, mixer and runtime

The Asset Importer previews audio and exposes Sound Effect, Music, Voice or Streaming profiles; Original, PCM, Vorbis or MP3 storage metadata; quality, streaming, normalize/gain, trim and loop points. Invalid/unknown values are bounded during load.

AudioSource supports volume/pitch/loop/autoplay, 2D spatial blend, min/max distance, linear/inverse/exponential/custom attenuation, bus, priority, component polyphony, deterministic pitch/volume variation, virtualization policy and import/stream/buffer override. AudioListener supplies the positional origin. Every live polyphonic voice follows spatial pan/attenuation, bus/effect graph changes, Pause and Stop.

The mixer supports a master graph, named buses, parent routing, sends, mute/solo, voice caps, low/high-pass, compressor, delay and generated reverb, snapshots and ducking. UI hover/press/focus/cancel and animation audio tracks use project audio routing. The Profiler exposes active/streaming/buffered/virtual voices, limited voices, bus meters, AudioContext state, base/output latency, detected underruns and output-device changes.

For timing-critical short loops prefer PCM and choose zero crossings. Compressed formats and browser streaming can carry encoder/decoder/seek delay; qualify them on the target browser/device and watch latency/underrun metrics. The release evidence budgets PCM at 8 ms, Vorbis at 35 ms and MP3 at 80 ms as target-specific qualification ceilings, not universal codec guarantees.

## Qualification

Run `pnpm verify:v3.7`, `pnpm audit:v3.7`, `pnpm qualify:v3.7:layout`, `pnpm stability:v3`, `cargo test --workspace --all-targets`, `pnpm build`, and the packaged Windows smoke. Reference projects cover pixel art, lights/shadows, particles, typed shaders, render textures, multilingual fonts, positional audio, bus effects and streaming audio. Evidence records golden/capture manifests, browser/GPU capability, shader fuzzing, material round trips, 10,000-item sprite/particle/lighting headless workloads, context recovery, audio metrics and editor/export equality. Matching-host Linux/macOS runs and a 24-hour wall-clock soak remain explicit external gates.
