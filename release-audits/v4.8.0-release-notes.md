# Nova_A 4.8.0 release notes

Nova_A 4.8 makes renderer, material, particle, audio and performance behavior explicit, actionable and reproducible while retaining Project Format 2 schema 29 and the stable 4.x contracts.

## Added and improved

- Native/Compatibility renderer policy, device/driver/API/extension/limit reporting, direct capability fixes, context recovery, texture memory, frame capture and batch-break reasons.
- Typed reusable materials, shader includes/compiler/platform checks, bounded visible fallback, reusable particle assets, collision/subemitters and profiler budgets.
- Real audio bus/effect/send/snapshot/automation routing, limiter and semantic meters; seek/fades/playlists, voice stealing/virtualization, positional output, device selection/hot plug/recovery.
- Comparable performance captures with timeline/flame data, markers, counters, annotations, remote identity, overhead mode and CI budgets. Health and Build consume the same failures.

## Renderer compatibility

Windows uses the Tauri WebView2/ANGLE WebGL2 Native path and web uses the WebGL2 Compatibility path. Canvas2D is diagnostic-only and explicitly reports unsupported shaders, normal-map lighting, GPU timing and post-processing. Representative Intel/AMD/NVIDIA, Firefox and WebKit golden runs remain external unless present in evidence.

## Audio compatibility

Web Audio routing is shared by desktop and web. Output-device selection depends on host sink support and browser autoplay policy. Doppler remains explicitly limited on the stereo path. Physical-device disconnect/sample-rate and 24-hour playback remain external qualification gates.

## Reimport requirements

No project-format migration is required. Existing texture/audio imports remain valid. Reimport only when adopting changed mipmap/compression, preload/streaming, normalization or codec settings; the Asset Database keeps GUIDs stable.

## Known external gates

Publisher signing, disposable clean-machine installer lifecycle, representative GPU/browser/audio-device matrices and 24-hour playback are not fabricated by local evidence.
